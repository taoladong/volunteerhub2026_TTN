using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Text.Json;

namespace BaseCore.Services.VolunteerHub
{
    public class EventService : IEventService
    {
        private readonly MySqlDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ICertificateService _certificateService;

        public EventService(MySqlDbContext context, INotificationService notificationService, ICertificateService certificateService)
        {
            _context = context;
            _notificationService = notificationService;
            _certificateService = certificateService;
        }

        public async Task<(List<Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize, int? skillId = null, string? location = null, bool publicOnly = true)
        {
            var query = _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.ToLower();
                query = query.Where(e =>
                    e.Title.ToLower().Contains(kw) ||
                    (e.Description != null && e.Description.ToLower().Contains(kw)) ||
                    (e.Location != null && e.Location.ToLower().Contains(kw)));
            }
            if (categoryId.HasValue) query = query.Where(e => e.CategoryId == categoryId.Value);
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(e => e.Status == status);
                // Chỉ public listing mới ẩn sự kiện Approved đã quá hạn; admin (publicOnly=false) phải thấy
                // để còn xử lý (hoàn thành/hủy/auto-complete).
                if (status == "Approved" && publicOnly)
                {
                    query = query.Where(e => e.EndDate > DateTime.UtcNow);
                }
            }
            else if (publicOnly)
            {
                // Mặc định public listing: chỉ Approved (chưa hết hạn) hoặc Completed.
                // Pending/Rejected/Cancelled bị ẩn để tránh leak event chưa duyệt.
                query = query.Where(e =>
                    (e.Status == "Approved" && e.EndDate > DateTime.UtcNow) ||
                    e.Status == "Completed");
            }
            if (startDateFrom.HasValue) query = query.Where(e => e.StartDate >= startDateFrom.Value);

            if (skillId.HasValue && skillId.Value == 0)
            {
                // skillId=0 means "no skill required" — filter events with empty/null RequiredSkillIds
                query = query.Where(e => e.RequiredSkillIds == null || e.RequiredSkillIds == "" || e.RequiredSkillIds == "[]");
            }
            else if (skillId.HasValue)
            {
                query = query.Where(e => e.RequiredSkillIds != null && e.RequiredSkillIds != "" && e.RequiredSkillIds != "[]");
            }

            // Filter by location text
            if (!string.IsNullOrEmpty(location))
            {
                var loc = location.ToLower();
                query = query.Where(e => e.Location != null && e.Location.ToLower().Contains(loc));
            }

            if (skillId.HasValue && skillId.Value != 0)
            {
                var candidates = await query.OrderByDescending(e => e.CreatedAt).ToListAsync();
                var filtered = candidates
                    .Where(e => RequiredSkillsContain(e.RequiredSkillIds, skillId.Value))
                    .ToList();
                var total = filtered.Count;
                var pageItems = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
                await ApplyConfirmedParticipantCountsAsync(pageItems);
                return (pageItems, total);
            }

            var totalCount = await query.CountAsync();
            var items = await query.OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            await ApplyConfirmedParticipantCountsAsync(items);
            return (items, totalCount);
        }

        public async Task<List<Entities.Event>> GetByOrganizerAsync(int organizerId)
        {
            var items = await _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Where(e => e.OrganizerId == organizerId)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();
            await ApplyConfirmedParticipantCountsAsync(items);
            return items;
        }

        public async Task<List<Entities.Event>> GetRecommendedAsync(int userId)
        {
            var userSkillIds = await _context.VolunteerSkills
                .Where(vs => vs.UserId == userId)
                .Select(vs => vs.SkillId)
                .ToListAsync();

            var events = await _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Where(e => e.Status == "Approved" && e.EndDate > DateTime.UtcNow &&
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

            await ApplyConfirmedParticipantCountsAsync(matched);
            return matched;
        }

        public async Task<Entities.Event?> GetByIdAsync(int id)
        {
            var ev = await _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Include(e => e.WorkShifts)
                .Include(e => e.Channels)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (ev != null)
            {
                ev.Channel = ev.Channels?.FirstOrDefault(c => c.ParentChannelId == null);
                await ApplyConfirmedParticipantCountsAsync(new[] { ev });
            }
            return ev;
        }

        private async Task ApplyConfirmedParticipantCountsAsync(IEnumerable<Entities.Event> events)
        {
            var eventList = events.ToList();
            var eventIds = eventList.Select(e => e.Id).ToList();
            if (eventIds.Count == 0) return;

            var confirmedCounts = await _context.Registrations
                .Where(r => eventIds.Contains(r.EventId) && r.Status == "Confirmed")
                .GroupBy(r => r.EventId)
                .Select(g => new { EventId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EventId, x => x.Count);

            foreach (var ev in eventList)
                ev.CurrentParticipants = confirmedCounts.TryGetValue(ev.Id, out var count) ? count : 0;
        }

        public async Task<Entities.Event> CreateAsync(Entities.Event ev)
        {
            ev.Status = "Pending";
            ev.CreatedAt = DateTime.UtcNow;
            _context.Events.Add(ev);
            await _context.SaveChangesAsync();
            return ev;
        }

        public async Task UpdateAsync(Entities.Event ev)
        {
            _context.Events.Update(ev);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null) return;

            var hasRelatedBusinessData =
                await _context.Registrations.AnyAsync(r => r.EventId == id) ||
                await _context.WorkShifts.AnyAsync(s => s.EventId == id) ||
                await _context.Channels.AnyAsync(c => c.EventId == id) ||
                await _context.SupportCampaigns.AnyAsync(c => c.EventId == id) ||
                await _context.EventSponsors.AnyAsync(s => s.EventId == id) ||
                await _context.SponsorshipProposals.AnyAsync(p => p.EventId == id) ||
                await _context.Certificates.AnyAsync(c => c.EventId == id) ||
                await _context.Ratings.AnyAsync(r => r.EventId == id);

            if (hasRelatedBusinessData)
                throw new Exception("Event already has related business data. Cancel it instead of deleting.");

            _context.Events.Remove(ev);
            await _context.SaveChangesAsync();
        }

        public async Task<Entities.Event> ApproveAsync(int eventId)
        {
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Pending") throw new Exception("Only pending events can be approved");
            if (ev.EndDate <= DateTime.UtcNow) throw new Exception("Cannot approve an event that has already ended");

            var organizer = await _context.Users.FindAsync(ev.OrganizerId)
                ?? throw new Exception("Organizer not found");
            if (!organizer.IsActive || organizer.UserType != 1)
                throw new Exception("Organizer account is not active");

            var verified = await _context.OrganizerVerifications
                .Where(v => v.OrganizerId == ev.OrganizerId)
                .Select(v => v.Status)
                .FirstOrDefaultAsync();
            if (verified != "Verified")
                throw new Exception("Organizer must be legally verified before event approval");

            ev.Status = "Approved";
            ev.QrCode = $"EVT-{eventId}-{Guid.NewGuid():N}";

            // Auto-create channel
            var exists = await _context.Channels.AnyAsync(c => c.EventId == eventId && c.ParentChannelId == null);
            if (!exists)
            {
                _context.Channels.Add(new Channel
                {
                    EventId = eventId,
                    Name = $"Kênh trao đổi - {ev.Title}",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _context.SaveChangesAsync();

            // Notify organizer
            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện được duyệt", $"Sự kiện '{ev.Title}' đã được phê duyệt.",
                "EventApproved", eventId);

            return ev;
        }

        public async Task<Entities.Event> RejectAsync(int eventId, string? reason)
        {
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Pending") throw new Exception("Only pending events can be rejected");
            if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 10)
                throw new Exception("Reject reason must be at least 10 characters");

            ev.Status = "Rejected";
            ev.RejectReason = reason?.Trim() ?? "";
            await _context.SaveChangesAsync();

            var message = string.IsNullOrWhiteSpace(reason)
                ? $"Sự kiện '{ev.Title}' đã bị từ chối."
                : $"Sự kiện '{ev.Title}' đã bị từ chối. Lý do: {reason}";
            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện bị từ chối", message, "EventRejected", eventId);
            return ev;
        }

        public async Task<Entities.Event> CompleteAsync(int eventId, int? organizerId = null, IReadOnlyCollection<ManualCompletionAttendance>? manualAttendances = null)
        {
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (organizerId.HasValue && ev.OrganizerId != organizerId.Value) throw new Exception("Not authorized");
            if (ev.Status != "Approved") throw new Exception("Chỉ có thể hoàn thành sự kiện đang ở trạng thái đã duyệt.");

            var now = DateTime.UtcNow;
            // Organizer chỉ được hoàn thành sau khi sự kiện đã kết thúc (admin có thể chủ động xử lý sớm).
            if (organizerId.HasValue && ev.EndDate > now)
                throw new Exception("Chỉ có thể hoàn thành sự kiện sau khi đã kết thúc.");
            await ApplyManualCompletionAttendancesAsync(eventId, manualAttendances, now);

            var registrationsToClose = await _context.Registrations
                .Where(r => r.EventId == eventId && (r.Status == "Pending" || r.CancelRequested))
                .ToListAsync();

            foreach (var reg in registrationsToClose)
            {
                var wasConfirmed = reg.Status == "Confirmed";
                reg.Status = "Cancelled";
                reg.CancelledAt = now;
                reg.CancelRequested = false;
                reg.CancelRequestedAt = null;
                reg.CancelReason = wasConfirmed
                    ? "Sự kiện đã hoàn thành khi yêu cầu hủy đăng ký đang chờ xử lý."
                    : "Sự kiện đã hoàn thành trước khi đăng ký được xác nhận.";
                reg.IsAttended = false;
                reg.AttendedAt = null;
                reg.CheckedOutAt = null;
                reg.VolunteerHours = 0;

                if (wasConfirmed && ev.CurrentParticipants > 0)
                    ev.CurrentParticipants--;
            }

            ev.Status = "Completed";
            await _context.SaveChangesAsync();

            foreach (var reg in registrationsToClose)
            {
                await _notificationService.SendAsync(reg.UserId,
                    "Đăng ký không được tính tham gia",
                    $"Sự kiện '{ev.Title}' đã hoàn thành trước khi đăng ký của bạn được xử lý/ghi nhận tham gia.",
                    "RegistrationClosedOnEventComplete", eventId);
            }

            // Auto-issue certificates
            await _certificateService.IssueCertificatesForEventAsync(eventId);

            return ev;
        }

        private async Task ApplyManualCompletionAttendancesAsync(
            int eventId,
            IReadOnlyCollection<ManualCompletionAttendance>? manualAttendances,
            DateTime completedAt)
        {
            if (manualAttendances == null || manualAttendances.Count == 0) return;

            var requested = manualAttendances
                .Where(x => x.RegistrationId > 0)
                .GroupBy(x => x.RegistrationId)
                .Select(g => g.Last())
                .ToList();
            if (requested.Count == 0) return;

            var registrationIds = requested.Select(x => x.RegistrationId).ToList();
            var registrations = await _context.Registrations
                .Include(r => r.Event)
                .Include(r => r.Shift)
                .Where(r => registrationIds.Contains(r.Id))
                .ToListAsync();

            if (registrations.Count != requested.Count)
                throw new Exception("Some selected registrations were not found");

            foreach (var item in requested)
            {
                var reg = registrations.First(r => r.Id == item.RegistrationId);
                if (reg.EventId != eventId)
                    throw new Exception("Selected registration does not belong to this event");
                if (reg.Status != "Confirmed")
                    throw new Exception("Only confirmed registrations can be marked as completed");
                if (reg.CancelRequested)
                    throw new Exception("Cannot mark a registration with pending cancellation as completed");

                var hours = item.Hours ?? CalculateScheduledVolunteerHours(reg);
                var maxHours = Math.Max(1m, Math.Round(CalculateScheduledVolunteerHours(reg) * 1.5m, 2));
                if (hours < 0 || hours > maxHours)
                    throw new Exception($"Hours must be between 0 and {maxHours:0.##} for selected volunteers");

                reg.IsAttended = true;
                reg.AttendedAt ??= completedAt;
                reg.CheckedOutAt ??= reg.Shift?.EndTime ?? reg.Event.EndDate;
                reg.VolunteerHours = hours;
                reg.CancelRequested = false;
                reg.CancelRequestedAt = null;
                reg.CancelReason = "";
            }
        }

        private static decimal CalculateScheduledVolunteerHours(Registration reg)
        {
            var start = reg.Shift?.StartTime ?? reg.Event?.StartDate;
            var end = reg.Shift?.EndTime ?? reg.Event?.EndDate;
            if (!start.HasValue || !end.HasValue || end <= start) return 0m;
            return Math.Round((decimal)(end.Value - start.Value).TotalHours, 2);
        }

        public async Task<Entities.Event> ResubmitAsync(int eventId, int organizerId)
        {
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.OrganizerId != organizerId) throw new Exception("Not authorized");
            if (ev.Status != "Rejected") throw new Exception("Only rejected events can be resubmitted");

            ev.Status = "Pending";
            await _context.SaveChangesAsync();
            return ev;
        }

        public async Task<Entities.Event> CancelAsync(int eventId, int? organizerId, string? reason)
        {
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (organizerId.HasValue && ev.OrganizerId != organizerId.Value) throw new Exception("Not authorized");
            if (ev.Status == "Completed") throw new Exception("Completed events cannot be cancelled");
            if (ev.Status == "Cancelled") throw new Exception("Event is already cancelled");

            ev.Status = "Cancelled";
            ev.CancelReason = reason?.Trim() ?? "";
            ev.CancelledAt = DateTime.UtcNow;

            // Close active support campaigns and cancel pending donations so money workflows do not hang.
            var activeCampaigns = await _context.SupportCampaigns
                .Where(c => c.EventId == eventId && (c.Status == "Open" || c.Status == "Draft"))
                .ToListAsync();
            foreach (var c in activeCampaigns)
            {
                c.Status = "Closed";
                c.UpdatedAt = DateTime.UtcNow;
            }

            var pendingDonations = await _context.IndividualDonations
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
            var activeProposals = await _context.SponsorshipProposals
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
            var confirmedVolunteerIds = await _context.Registrations
                .Where(r => r.EventId == eventId && r.Status == "Confirmed" && !r.IsAttended)
                .Select(r => r.UserId)
                .ToListAsync();

            var confirmedDonorIds = await _context.IndividualDonations
                .Where(d => d.Campaign.EventId == eventId && d.Status == "Confirmed")
                .Select(d => d.UserId)
                .Distinct()
                .ToListAsync();

            // Collect sponsor ids that had active proposals to notify them of the cancellation too.
            var sponsorIdsToNotify = activeProposals
                .Select(p => p.SponsorId)
                .Concat(_context.SponsorshipProposals
                    .Where(p => p.EventId == eventId && (p.Status == "Received" || p.Status == "Reported"))
                    .Select(p => p.SponsorId))
                .Distinct()
                .ToList();

            await _context.SaveChangesAsync();

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
            var ev = await _context.Events.FindAsync(eventId);
            if (ev == null) return;

            var recipients = await _context.Registrations
                .Where(r => r.EventId == eventId && r.Status == "Confirmed")
                .Select(r => r.UserId)
                .ToListAsync();

            var sponsorIds = await _context.SponsorshipProposals
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
            var ev = await _context.Events.FindAsync(eventId)
                ?? throw new Exception("Event not found");
            if (ev.Status != "Completed") throw new Exception("Only completed events can be uncompleted");

            ev.Status = "Approved";
            // Revoke certificates issued for this event. Legacy data lives out-of-band (email/PDF copies already sent).
            var certs = await _context.Certificates.Where(c => c.EventId == eventId).ToListAsync();
            if (certs.Count > 0)
            {
                _context.Certificates.RemoveRange(certs);
            }
            await _context.SaveChangesAsync();

            await _notificationService.SendAsync(ev.OrganizerId,
                "Sự kiện được mở lại",
                $"Admin đã rollback sự kiện '{ev.Title}' về trạng thái Approved. Các chứng chỉ trước đó đã bị thu hồi.",
                "EventUncompleted", eventId);

            return ev;
        }

        public async Task<int> AutoCompleteOverdueAsync()
        {
            var cutoff = DateTime.UtcNow.AddDays(-1); // Complete only if EndDate passed more than 1 day ago
            var candidates = await _context.Events
                .Where(e => e.Status == "Approved" && e.EndDate <= cutoff)
                .ToListAsync();

            var completed = 0;
            foreach (var ev in candidates)
            {
                ev.Status = "Completed";
                completed++;
            }
            await _context.SaveChangesAsync();

            // Issue certificates and notify after save to avoid holding a txn open
            foreach (var ev in candidates)
            {
                try { await _certificateService.IssueCertificatesForEventAsync(ev.Id); } catch { }
                try
                {
                    await _notificationService.SendAsync(ev.OrganizerId,
                        "Sự kiện đã tự động hoàn thành",
                        $"Sự kiện '{ev.Title}' đã được hệ thống đánh dấu hoàn thành do đã quá hạn EndDate hơn 24 giờ.",
                        "EventAutoCompleted", ev.Id);
                }
                catch { }
            }

            return completed;
        }

        public async Task<int> AutoCloseOverdueCampaignsAsync()
        {
            var now = DateTime.UtcNow;
            var open = await _context.SupportCampaigns
                .Where(c => c.Status == "Open" && c.EndDate <= now)
                .ToListAsync();
            foreach (var c in open)
            {
                c.Status = "Closed";
                c.UpdatedAt = now;
            }
            await _context.SaveChangesAsync();

            foreach (var c in open)
            {
                try
                {
                    await _notificationService.SendAsync(c.CreatedBy,
                        "Đợt kêu gọi đã đóng",
                        $"Đợt '{c.Title}' đã hết hạn và được hệ thống đóng. Hãy báo cáo sử dụng để minh bạch với người ủng hộ.",
                        "CampaignAutoClosed", c.EventId);
                }
                catch { }
            }
            return open.Count;
        }

        public async Task<int> SendCampaignRemindersAsync()
        {
            var now = DateTime.UtcNow;
            var reminders = 0;

            // 1) Đợt đã đóng nhưng chưa báo cáo sử dụng
            var unreported = await _context.SupportCampaigns
                .Where(c => c.Status == "Closed")
                .ToListAsync();
            foreach (var c in unreported)
            {
                try
                {
                    await _notificationService.SendAsync(c.CreatedBy,
                        "Nhắc báo cáo sử dụng",
                        $"Đợt '{c.Title}' đã đóng nhưng chưa có báo cáo sử dụng. Hãy báo cáo để minh bạch.",
                        "CampaignReminder", c.EventId);
                    reminders++;
                }
                catch { }
            }

            // 2) Donation chờ xác nhận quá 3 ngày → nhắc người tạo đợt
            var staleCutoff = now.AddDays(-3);
            var stalePending = await _context.IndividualDonations
                .Include(d => d.Campaign)
                .Where(d => d.Status == "PendingConfirmation" && d.CreatedAt <= staleCutoff)
                .ToListAsync();
            foreach (var g in stalePending.Where(d => d.Campaign != null).GroupBy(d => d.CampaignId))
            {
                var camp = g.First().Campaign!;
                try
                {
                    await _notificationService.SendAsync(camp.CreatedBy,
                        "Có khoản ủng hộ chờ xác nhận",
                        $"Đợt '{camp.Title}' có {g.Count()} khoản ủng hộ chờ xác nhận quá 3 ngày. Hãy đối chiếu sao kê và xử lý.",
                        "CampaignReminder", camp.EventId);
                    reminders++;
                }
                catch { }
            }

            return reminders;
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
