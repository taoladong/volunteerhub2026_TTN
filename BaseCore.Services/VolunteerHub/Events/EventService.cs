using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using System.Text.Json;

namespace BaseCore.Services.VolunteerHub
{
    public class EventService : IEventService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;
        private readonly ICertificateService _certificateService;

        public EventService(IUnitOfWork unitOfWork, INotificationService notificationService, ICertificateService certificateService)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
            _certificateService = certificateService;
        }

        public async Task<(List<Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize, int? skillId = null, string? location = null, bool publicOnly = true)
        {
            return await _unitOfWork.Events.SearchAsync(
                keyword, categoryId, status, startDateFrom, page, pageSize, skillId, location, publicOnly);
        }

        public async Task<List<Entities.Event>> GetByOrganizerAsync(int organizerId)
        {
            return await _unitOfWork.Events.GetByOrganizerAsync(organizerId);
        }

        public async Task<List<Entities.Event>> GetRecommendedAsync(int userId)
        {
            var userSkillIds = await _unitOfWork.VolunteerSkills.GetQueryable()
                .Where(vs => vs.UserId == userId)
                .Select(vs => vs.SkillId)
                .ToListAsync();

            var events = await _unitOfWork.Events.GetQueryable()
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Where(e => e.Status == "Approved" &&
                            e.RequiredSkillIds != null && e.RequiredSkillIds != "[]" && e.RequiredSkillIds != "")
                .OrderByDescending(e => e.StartDate)
                .Take(50)
                .ToListAsync();

            // In-memory filter: match any skill
            var matched = events
                .Where(e => {
                    try {
                        var ids = System.Text.Json.JsonSerializer.Deserialize<List<int>>(e.RequiredSkillIds!);
                        return ids != null && ids.Any(id => userSkillIds.Contains(id));
                    } catch { return false; }
                })
                .Take(9)
                .ToList();

            return matched;
        }

        public async Task<Entities.Event?> GetByIdAsync(int id)
        {
            return await _unitOfWork.Events.GetWithDetailsAsync(id);
        }

        public async Task<Entities.Event> CreateAsync(Entities.Event ev)
        {
            ValidateEventData(ev, requireFutureStart: true);
            ev.Status = "Pending";
            ev.CreatedAt = DateTime.UtcNow;
            await _unitOfWork.Events.AddAsync(ev);
            await _unitOfWork.SaveChangesAsync();
            return ev;
        }

        public async Task UpdateAsync(Entities.Event ev)
        {
            ValidateEventData(ev, requireFutureStart: false);
            await _unitOfWork.Events.UpdateAsync(ev);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(id);
            if (ev != null) { await _unitOfWork.Events.DeleteAsync(ev); await _unitOfWork.SaveChangesAsync(); }
        }

        public async Task<Entities.Event> ApproveAsync(int eventId)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Pending") throw new Exception("Only pending events can be approved");
            if (ev.EndDate <= DateTime.UtcNow) throw new Exception("Cannot approve an event that has already ended");

            var organizer = await _unitOfWork.Users.GetByIdAsync(ev.OrganizerId)
                ?? throw new Exception("Organizer not found");
            if (!organizer.IsActive || organizer.UserType != 1)
                throw new Exception("Organizer account is not active");


            var verified = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .Where(v => v.OrganizerId == ev.OrganizerId)
                .Select(v => v.Status)
                .FirstOrDefaultAsync();
            if (verified != "Verified")
                throw new Exception("Organizer must be legally verified before event approval");

            ev.Status = "Approved";
            ev.QrCode = $"EVT-{eventId}-{Guid.NewGuid():N}";            

            // Auto-create channel
            var exists = await _unitOfWork.Channels.GetQueryable().AnyAsync(c => c.EventId == eventId && c.ParentChannelId == null);
            if (!exists)
            {
                await _unitOfWork.Channels.AddAsync(new Channel
                {
                    EventId = eventId,
                    Name = $"Kênh trao đổi - {ev.Title}",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _unitOfWork.SaveChangesAsync();

            // Notify organizer
            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện được duyệt", $"Sự kiện '{ev.Title}' đã được phê duyệt.",
                "EventApproved", eventId);

            return ev;
        }

        public async Task<Entities.Event> RejectAsync(int eventId, string? reason)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Pending") throw new Exception("Only pending events can be rejected");
            if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 10)
                throw new Exception("Reject reason must be at least 10 characters");

            ev.Status = "Rejected";
            ev.RejectReason = reason?.Trim() ?? "";
            await _unitOfWork.SaveChangesAsync();

            var message = string.IsNullOrWhiteSpace(reason)
                ? $"Sự kiện '{ev.Title}' đã bị từ chối."
                : $"Sự kiện '{ev.Title}' đã bị từ chối. Lý do: {reason}";
            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện bị từ chối", message, "EventRejected", eventId);
            return ev;
        }

        public async Task<Entities.Event> CompleteAsync(int eventId, int? organizerId = null)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (organizerId.HasValue && ev.OrganizerId != organizerId.Value) throw new Exception("Not authorized");
            if (ev.Status != "Approved") throw new Exception("Only approved events can be completed");
            if (ev.CurrentParticipants < ev.MinParticipants)
                throw new Exception($"Event has {ev.CurrentParticipants}/{ev.MinParticipants} confirmed participants. Adjust the minimum participant count before completing the event.");

            ev.Status = "Completed";
            await _unitOfWork.SaveChangesAsync();

            // Auto-issue certificates
            await _certificateService.IssueCertificatesForEventAsync(eventId);

            return ev;
        }

        public async Task<Entities.Event> ResubmitAsync(int eventId, int organizerId)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.OrganizerId != organizerId) throw new Exception("Not authorized");
            if (ev.Status != "Rejected") throw new Exception("Only rejected events can be resubmitted");

            ev.Status = "Pending";
            await _unitOfWork.SaveChangesAsync();
            return ev;
        }

        public async Task<Entities.Event> CancelAsync(int eventId, int? organizerId, string? reason)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (organizerId.HasValue && ev.OrganizerId != organizerId.Value) throw new Exception("Not authorized");
            if (ev.Status == "Completed") throw new Exception("Completed events cannot be cancelled");
            if (ev.Status == "Cancelled") throw new Exception("Event is already cancelled");

            ev.Status = "Cancelled";
            ev.CancelReason = reason?.Trim() ?? "";
            ev.CancelledAt = DateTime.UtcNow;

            // Close active support campaigns and cancel pending donations so money workflows do not hang.
            var activeCampaigns = await _unitOfWork.SupportCampaigns.GetQueryable()
                .Where(c => c.EventId == eventId && (c.Status == "Open" || c.Status == "Draft"))
                .ToListAsync();
            foreach (var c in activeCampaigns)
            {
                c.Status = "Closed";
                c.UpdatedAt = DateTime.UtcNow;
            }

            var pendingDonations = await _unitOfWork.IndividualDonations.GetQueryable()
                .Include(d => d.Campaign)
                .Where(d => d.Campaign.EventId == eventId && d.Status == "PendingConfirmation")
                .ToListAsync();
            foreach (var donation in pendingDonations)
            {
                donation.Status = "Cancelled";
                donation.RejectedReason = "Event cancelled";
                donation.UpdatedAt = DateTime.UtcNow;
            }

            // Auto-cancel sponsorship proposals that are still Pending or Accepted (but not Received/Reported).
            // Received/Reported stay intact — any money already received is handled out-of-band by organizer.
            var activeProposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Include(p => p.Sponsor)
                .Where(p => p.EventId == eventId && (p.Status == "Pending" || p.Status == "Accepted"))
                .ToListAsync();
            foreach (var p in activeProposals)
            {
                p.Status = "Cancelled";
                p.CancelledAt = DateTime.UtcNow;
                p.ResponseMessage = string.IsNullOrWhiteSpace(p.ResponseMessage)
                    ? $"Sự kiện đã bị hủy: {reason}"
                    : p.ResponseMessage;
            }

            // Notify confirmed volunteers (not attended yet — no notification for past attendees).
            var confirmedVolunteerIds = await _unitOfWork.Registrations.GetQueryable()
                .Where(r => r.EventId == eventId && r.Status == "Confirmed" && !r.IsAttended)
                .Select(r => r.UserId)
                .ToListAsync();

            var confirmedDonorIds = await _unitOfWork.IndividualDonations.GetQueryable()
                .Where(d => d.Campaign.EventId == eventId && d.Status == "Confirmed")
                .Select(d => d.UserId)
                .Distinct()
                .ToListAsync();

            // Collect sponsor ids that had active proposals to notify them of the cancellation too.
            var sponsorIdsToNotify = activeProposals
                .Select(p => p.SponsorId)
                .Concat(_unitOfWork.SponsorshipProposals.GetQueryable()
                    .Where(p => p.EventId == eventId && (p.Status == "Received" || p.Status == "Reported"))
                    .Select(p => p.SponsorId))
                .Distinct()
                .ToList();

            await _unitOfWork.SaveChangesAsync();

            var message = string.IsNullOrWhiteSpace(reason)
                ? $"Sự kiện '{ev.Title}' đã bị hủy."
                : $"Sự kiện '{ev.Title}' đã bị hủy. Lý do: {reason}";

            foreach (var uid in confirmedVolunteerIds)
            {
                await _notificationService.SendAsync(uid, "Sự kiện bị hủy", message, "EventCancelled", eventId);
            }
            foreach (var sid in sponsorIdsToNotify)
            {
                await _notificationService.SendAsync(sid, "Sự kiện bị hủy", message, "EventCancelled", eventId);
            }

            foreach (var donorId in confirmedDonorIds)
            {
                await _notificationService.SendAsync(
                    donorId,
                    "Sự kiện có khoản ủng hộ đã bị hủy",
                    $"{message} Bạn đã có khoản ủng hộ được xác nhận cho sự kiện này. Vui lòng theo dõi báo cáo hoặc liên hệ ban tổ chức để biết phương án xử lý.",
                    "EventCancelled",
                    eventId);
            }
            foreach (var donation in pendingDonations)
            {
                await _notificationService.SendAsync(
                    donation.UserId,
                    "Khoản ủng hộ chờ xác nhận đã bị hủy",
                    $"Sự kiện '{ev.Title}' đã bị hủy nên khoản ủng hộ chờ xác nhận cho đợt '{donation.Campaign.Title}' đã được hủy tự động. Vui lòng liên hệ ban tổ chức nếu bạn đã chuyển tiền.",
                    "DonationCancelled",
                    donation.CampaignId);
            }

            return ev;
        }

        public async Task NotifyEventChangeAsync(int eventId, string reason)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId);
            if (ev == null) return;

            var recipients = await _unitOfWork.Registrations.GetQueryable()
                .Where(r => r.EventId == eventId && r.Status == "Confirmed")
                .Select(r => r.UserId)
                .ToListAsync();

            var sponsorIds = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Where(p => p.EventId == eventId && (p.Status == "Accepted" || p.Status == "Received" || p.Status == "Reported"))
                .Select(p => p.SponsorId)
                .Distinct()
                .ToListAsync();

            var title = "Sự kiện cập nhật thông tin";
            var message = $"Sự kiện '{ev.Title}' đã được cập nhật: {reason}";
            foreach (var uid in recipients)
            {
                await _notificationService.SendAsync(uid, title, message, "EventUpdated", eventId);
            }
            foreach (var sid in sponsorIds)
            {
                await _notificationService.SendAsync(sid, title, message, "EventUpdated", eventId);
            }
        }

        public async Task<Entities.Event> UncompleteAsync(int eventId)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Completed") throw new Exception("Only completed events can be uncompleted");

            ev.Status = "Approved";
            // Revoke certificates issued for this event. Legacy data lives out-of-band (email/PDF copies already sent).
            var certs = await _unitOfWork.Certificates.GetQueryable().Where(c => c.EventId == eventId).ToListAsync();
            if (certs.Count > 0)
            {
                foreach (var cert in certs) { await _unitOfWork.Certificates.DeleteAsync(cert); }
            }
            await _unitOfWork.SaveChangesAsync();

            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện được mở lại",
                $"Admin đã rollback sự kiện '{ev.Title}' về trạng thái Approved. Các chứng chỉ trước đó đã bị thu hồi.",
                "EventUncompleted", eventId);

            return ev;
        }

        public async Task<int> AutoCompleteOverdueAsync()
        {
            var cutoff = DateTime.UtcNow.AddDays(-1); // Complete only if EndDate passed more than 1 day ago
            var candidates = await _unitOfWork.Events.GetQueryable()
                .Where(e => e.Status == "Approved" && e.EndDate <= cutoff)
                .ToListAsync();

            var completed = 0;
            foreach (var ev in candidates)
            {
                ev.Status = "Completed";
                completed++;
            }
            await _unitOfWork.SaveChangesAsync();

            // Issue certificates and notify after save to avoid holding a txn open
            foreach (var ev in candidates)
            {
                await _certificateService.IssueCertificatesForEventAsync(ev.Id);
                await _notificationService.SendAsync(ev.OrganizerId,
                    "Sự kiện tự động hoàn thành",
                    $"Sự kiện '{ev.Title}' đã tự động chuyển sang trạng thái Hoàn thành do đã qua ngày kết thúc.",
                    "EventCompleted", ev.Id);
            }

            return completed;
        }

        public async Task<Dictionary<string, object>> GetImpactAsync(int eventId)
        {
            var ev = await _unitOfWork.Events.GetQueryable()
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null) throw new Exception("Event not found");

            var registrations = await _unitOfWork.Registrations.GetQueryable()
                .Where(r => r.EventId == eventId)
                .ToListAsync();
            var sponsors = await _unitOfWork.EventSponsors.GetQueryable()
                .Where(s => s.EventId == eventId)
                .ToListAsync();
            var proposalLegacySponsorIds = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Where(p => p.EventId == eventId && p.LegacyEventSponsorId != null)
                .Select(p => p.LegacyEventSponsorId!.Value)
                .ToListAsync();
            var standaloneSponsors = sponsors
                .Where(s => !proposalLegacySponsorIds.Contains(s.Id))
                .ToList();
            var campaigns = await _unitOfWork.SupportCampaigns.GetQueryable()
                .Include(c => c.Donations)
                .Where(c => c.EventId == eventId)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Status,
                    c.TargetAmount,
                    c.UsedAmount,
                    c.ReportSummary,
                    c.ReportedAt,
                    confirmedAmount = c.Donations.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    confirmedCount = c.Donations.Count(d => d.Status == "Confirmed"),
                    publicDonors = c.Donations
                        .Where(d => d.Status == "Confirmed")
                        .OrderByDescending(d => d.ConfirmedAt ?? d.CreatedAt)
                        .Take(10)
                        .Select(d => new
                        {
                            d.Id,
                            d.Amount,
                            displayName = d.IsAnonymous ? "Ẩn danh" : d.DisplayName,
                            d.IsAnonymous,
                            d.CreatedAt,
                            d.ConfirmedAt
                        })
                })
                .ToListAsync();
            var sponsorships = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Include(p => p.Sponsor)
                .Where(p => p.EventId == eventId && (p.Status == "Received" || p.Status == "Reported"))
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Status,
                    sponsorName = p.PublicSponsorName != "" ? p.PublicSponsorName : p.Sponsor.Name,
                    amount = p.ActualReceivedAmount ?? (p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0),
                    p.UsedAmount,
                    p.ReportSummary,
                    p.ReportedAt
                })
                .ToListAsync();
            var interestedSponsorships = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Include(p => p.Sponsor)
                .Where(p => p.EventId == eventId && p.Status == "Accepted")
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    sponsorName = p.PublicSponsorName != "" ? p.PublicSponsorName : p.Sponsor.Name,
                    amount = p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0,
                    p.RespondedAt
                })
                .ToListAsync();
            var certificates = await _unitOfWork.Certificates.GetQueryable()
                .CountAsync(c => c.EventId == eventId);
            var donationConfirmedAmount = campaigns.Sum(c => c.confirmedAmount);
            var sponsorshipReceivedAmount = sponsorships.Sum(s => s.amount);

            var dict = new Dictionary<string, object>
            {
                { "eventId", eventId },
                { "title", ev.Title },
                { "status", ev.Status },
                { "organizer", ev.Organizer != null ? ev.Organizer.Name : "" },
                { "category", ev.Category != null ? ev.Category.Name : "" },
                { "totalRegistrations", registrations.Count },
                { "confirmedRegistrations", registrations.Count(r => r.Status == "Confirmed") },
                { "attendedVolunteers", registrations.Count(r => r.IsAttended) },
                { "noShowVolunteers", registrations.Count(r => r.Status == "Confirmed" && !r.IsAttended) },
                { "cancelRequestedCount", registrations.Count(r => r.CancelRequested) },
                { "totalVolunteerHours", registrations.Where(r => r.IsAttended).Sum(r => r.VolunteerHours) },
                { "certificatesIssued", certificates },
                { "sponsorCount", standaloneSponsors.Count },
                { "sponsorAmount", standaloneSponsors.Sum(s => s.Amount) },
                { "donationConfirmedAmount", donationConfirmedAmount },
                { "donationConfirmedCount", campaigns.Sum(c => c.confirmedCount) },
                { "sponsorshipReceivedAmount", sponsorshipReceivedAmount },
                { "financialConfirmedAmount", donationConfirmedAmount + sponsorshipReceivedAmount },
                { "supportCampaigns", campaigns },
                { "receivedSponsorships", sponsorships },
                { "interestedSponsorships", interestedSponsorships }
            };
            return dict;
        }

        public async Task<(List<Dictionary<string, object>> Items, int TotalCount, DateTime Cutoff)> GetOverduePreviewAsync()
        {
            var cutoff = DateTime.UtcNow.AddDays(-1);
            var query = _unitOfWork.Events.GetQueryable()
                .Include(e => e.Organizer)
                .Where(e => e.Status == "Approved" && e.EndDate <= cutoff)
                .OrderBy(e => e.EndDate);
            
            // To fetch registrations efficiently:
            var eventIds = await query.Select(e => e.Id).ToListAsync();
            var regStats = await _unitOfWork.Registrations.GetQueryable()
                .Where(r => eventIds.Contains(r.EventId))
                .GroupBy(r => r.EventId)
                .Select(g => new { 
                    EventId = g.Key, 
                    Confirmed = g.Count(r => r.Status == "Confirmed"), 
                    Attended = g.Count(r => r.IsAttended) 
                })
                .ToDictionaryAsync(x => x.EventId);

            var items = new List<Dictionary<string, object>>();
            var events = await query.ToListAsync();
            foreach (var e in events)
            {
                regStats.TryGetValue(e.Id, out var stats);
                items.Add(new Dictionary<string, object>
                {
                    { "id", e.Id },
                    { "title", e.Title },
                    { "startDate", e.StartDate },
                    { "endDate", e.EndDate },
                    { "organizerId", e.OrganizerId },
                    { "organizerName", e.Organizer != null ? e.Organizer.Name : "" },
                    { "confirmedRegistrations", stats?.Confirmed ?? 0 },
                    { "attendedRegistrations", stats?.Attended ?? 0 }
                });
            }

            return (items, items.Count, cutoff);
        }

        public async Task<Entities.Event> TransferAsync(int eventId, int newOrganizerId)
        {
            var ev = await _unitOfWork.Events.GetByIdAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status == "Completed" || ev.Status == "Cancelled")
                throw new Exception("Cannot transfer completed or cancelled events");

            var newOrganizer = await _unitOfWork.Users.GetByIdAsync(newOrganizerId)
                ?? throw new Exception("New organizer must be an active Organizer account");
            if (newOrganizer.UserType != 1 || !newOrganizer.IsActive)
                throw new Exception("New organizer must be an active Organizer account");

            var verified = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .Where(v => v.OrganizerId == newOrganizerId)
                .Select(v => v.Status)
                .FirstOrDefaultAsync();
            if (verified != "Verified")
                throw new Exception("New organizer must be verified");

            var oldOrganizerId = ev.OrganizerId;
            ev.OrganizerId = newOrganizerId;
            await _unitOfWork.Events.UpdateAsync(ev);
            await _unitOfWork.SaveChangesAsync();
            return ev;
        }

        public async Task<List<Dictionary<string, object>>> GetRegistrationsAsync(int eventId)
        {
            var regs = await _unitOfWork.Registrations.GetQueryable()
                .Include(r => r.User)
                .Include(r => r.Shift)
                .Where(r => r.EventId == eventId)
                .ToListAsync();

            var userIds = regs.Select(r => r.UserId).Distinct().ToList();
            var volunteerSkills = await _unitOfWork.VolunteerSkills.GetQueryable()
                .Include(vs => vs.Skill)
                .Where(vs => userIds.Contains(vs.UserId))
                .Select(vs => new
                {
                    vs.UserId,
                    vs.SkillId,
                    skillName = vs.Skill != null ? vs.Skill.Name : "",
                    skillCategory = vs.Skill != null ? vs.Skill.Category : "",
                    vs.Level,
                    vs.VerificationStatus
                })
                .ToListAsync();

            var result = regs.Select(r => new Dictionary<string, object>
            {
                { "id", r.Id },
                { "eventId", r.EventId },
                { "userId", r.UserId },
                { "status", r.Status },
                { "registeredAt", r.RegisteredAt },
                { "attendedAt", r.AttendedAt ?? (object)null! },
                { "checkedOutAt", r.CheckedOutAt ?? (object)null! },
                { "volunteerHours", r.VolunteerHours },
                { "isAttended", r.IsAttended },
                { "cancelRequested", r.CancelRequested },
                { "cancelRequestedAt", r.CancelRequestedAt ?? (object)null! },
                { "cancelReason", r.CancelReason ?? "" },
                { "cancelledAt", r.CancelledAt ?? (object)null! },
                { "shiftId", r.ShiftId ?? (object)null! },
                { "note", r.Note ?? "" },
                { "user", r.User },
                { "shift", r.Shift ?? (object)null! },
                { "volunteerSkills", volunteerSkills.Where(vs => vs.UserId == r.UserId).ToList() }
            }).ToList();

            return result;
        }

        public async Task<List<Dictionary<string, object>>> GetEventHistoryAsync(int eventId)
        {
            var logs = await _unitOfWork.AuditLogs.GetQueryable()
                .Include(a => a.User)
                .Where(a => a.EntityType == "Event" && a.EntityId == eventId)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(50)
                .Select(a => new Dictionary<string, object>
                {
                    { "id", a.Id },
                    { "action", a.Action },
                    { "metadata", a.Metadata ?? "" },
                    { "createdAtUtc", a.CreatedAtUtc },
                    { "actorId", a.UserId ?? (object)null! },
                    { "actorName", a.User != null ? a.User.Name : null! }
                })
                .ToListAsync();

            return logs;
        }

        private void ValidateEventData(Entities.Event ev, bool requireFutureStart)
        {
            if (string.IsNullOrWhiteSpace(ev.Title))
                throw new ArgumentException("Event title cannot be empty");
            if (!ev.Latitude.HasValue || !ev.Longitude.HasValue)
                throw new ArgumentException("Event coordinates are required. Please choose a location on the map.");
            if (ev.Latitude.Value < -90 || ev.Latitude.Value > 90)
                throw new ArgumentException("Latitude must be between -90 and 90.");
            if (ev.Longitude.Value < -180 || ev.Longitude.Value > 180)
                throw new ArgumentException("Longitude must be between -180 and 180.");

            if (ev.MinParticipants < 1)
                throw new ArgumentException("Minimum participants must be at least 1.");
            if (ev.MaxParticipants < 1)
                throw new ArgumentException("Maximum participants must be at least 1.");
            if (ev.MinParticipants > ev.MaxParticipants)
                throw new ArgumentException("Minimum participants cannot be greater than maximum participants.");
            if (ev.MaxParticipants > 10000)
                throw new ArgumentException("Maximum participants cannot exceed 10000.");

            if (ev.StartDate == default || ev.EndDate == default)
                throw new ArgumentException("Event start and end time are required.");
            if (ev.EndDate <= ev.StartDate)
                throw new ArgumentException("Event end time must be after start time.");
            if (requireFutureStart && ev.StartDate < DateTime.UtcNow.AddMinutes(-5))
                throw new ArgumentException("Event start time cannot be in the past.");

            if (ev.CheckInRadiusKm <= 0 || ev.CheckInRadiusKm > 10)
                throw new ArgumentException("Check-in radius must be greater than 0 and at most 10km.");
        }

        private static bool RequiredSkillsContain(string? requiredSkillIds, int skillId)
        {
            if (string.IsNullOrWhiteSpace(requiredSkillIds)) return false;

            try
            {
                var ids = JsonSerializer.Deserialize<List<int>>(requiredSkillIds);
                return ids?.Contains(skillId) == true;
            }
            catch
            {
                return false;
            }
        }
    }
}
