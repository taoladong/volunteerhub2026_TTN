using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Data;

namespace BaseCore.Services.VolunteerHub
{
    public class RegistrationService : IRegistrationService
    {
        private readonly MySqlDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IBadgeService _badgeService;

        public RegistrationService(MySqlDbContext context, INotificationService notificationService, IBadgeService badgeService)
        {
            _context = context;
            _notificationService = notificationService;
            _badgeService = badgeService;
        }

        public async Task<Registration> RegisterAsync(int eventId, int userId, int? shiftId, string? note)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var ev = await _context.Events
                .FromSqlInterpolated($"SELECT * FROM [Events] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {eventId}")
                .FirstOrDefaultAsync()
                ?? throw new Exception("Không tìm thấy sự kiện");
            if (ev.Status != "Approved") throw new Exception("Sự kiện chưa mở đăng ký");
            var now = DateTime.UtcNow;
            if (now >= ev.StartDate) throw new Exception("Đã đóng đăng ký vì sự kiện đã bắt đầu");
            if (now >= ev.EndDate) throw new Exception("Đã đóng đăng ký vì sự kiện đã kết thúc");
            var confirmedCount = await _context.Registrations.CountAsync(r => r.EventId == eventId && r.Status == "Confirmed");
            if (confirmedCount >= ev.MaxParticipants) throw new Exception("Sự kiện đã đủ người");
            if (ev.RequiresKyc)
            {
                var kycStatus = await _context.VolunteerProfiles
                    .Where(p => p.UserId == userId)
                    .Select(p => p.KycStatus)
                    .FirstOrDefaultAsync();
                if (kycStatus != "Verified")
                    throw new Exception("Sự kiện này yêu cầu xác minh danh tính (KYC). Vui lòng hoàn tất xác minh hồ sơ trước khi đăng ký.");
            }

            var hasShifts = await _context.WorkShifts.AnyAsync(s => s.EventId == eventId);
            if (hasShifts && !shiftId.HasValue)
                throw new Exception("Vui lòng chọn ca làm việc cho sự kiện này.");

            if (shiftId.HasValue)
            {
                var shift = await _context.WorkShifts
                    .FromSqlInterpolated($"SELECT * FROM [WorkShifts] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {shiftId.Value}")
                    .FirstOrDefaultAsync()
                    ?? throw new Exception("Không tìm thấy ca làm việc");
                if (shift.EventId != eventId) throw new Exception("Ca làm việc không thuộc sự kiện này");

                var shiftRegistrations = await _context.Registrations.CountAsync(r =>
                    r.ShiftId == shiftId.Value && (r.Status == "Pending" || r.Status == "Confirmed"));
                if (shiftRegistrations >= shift.MaxVolunteers) throw new Exception("Ca làm việc đã đủ người");

                if (shift.RequiredSkillId.HasValue)
                {
                    var hasSkill = await _context.VolunteerSkills.AnyAsync(vs =>
                        vs.UserId == userId && vs.SkillId == shift.RequiredSkillId.Value);
                    if (!hasSkill) throw new Exception("Ca này yêu cầu kỹ năng cụ thể mà hồ sơ của bạn chưa có. Vui lòng cập nhật kỹ năng trong hồ sơ trước khi đăng ký.");
                }
            }

            var existing = await _context.Registrations
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);
            if (existing != null)
            {
                if (existing.Status != "Cancelled") throw new Exception("Bạn đã đăng ký sự kiện này");

                existing.ShiftId = shiftId;
                existing.Status = "Pending";
                existing.Note = note ?? "";
                existing.RegisteredAt = DateTime.UtcNow;
                existing.ConfirmedAt = null;
                existing.CancelledAt = null;
                existing.IsAttended = false;
                existing.AttendedAt = null;
                existing.CheckedOutAt = null;
                existing.VolunteerHours = 0;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var existingVolunteer = await _context.Users.FindAsync(userId);
                await _notificationService.SendAsync(ev.OrganizerId,
                    "Đăng ký mới", $"{existingVolunteer?.Name} đã đăng ký sự kiện '{ev.Title}'.",
                    "RegistrationConfirmed", eventId);

                return existing;
            }

            var reg = new Registration
            {
                EventId = eventId,
                UserId = userId,
                ShiftId = shiftId,
                Status = "Pending",
                Note = note ?? "",
                RegisteredAt = DateTime.UtcNow
            };
            _context.Registrations.Add(reg);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Notify organizer
            var volunteer = await _context.Users.FindAsync(userId);
            await _notificationService.SendAsync(ev.OrganizerId,
                "Đăng ký mới", $"{volunteer?.Name} đã đăng ký sự kiện '{ev.Title}'.",
                "RegistrationConfirmed", eventId);

            return reg;
        }

        public async Task WithdrawAsync(int eventId, int userId)
        {
            var reg = await _context.Registrations
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.Status == "Confirmed") throw new Exception("Không thể rút khỏi sự kiện sau khi đã được xác nhận");
            if (reg.Status == "Cancelled") return;

            var ev = reg.Event ?? await _context.Events.FindAsync(eventId);
            if (ev != null && ev.CurrentParticipants > 0) ev.CurrentParticipants--;

            reg.Status = "Cancelled";
            reg.CancelledAt = DateTime.UtcNow;
            reg.CancelReason = "Withdrawn by volunteer";
            reg.CancelRequested = false;
            reg.CancelRequestedAt = null;
            await _context.SaveChangesAsync();

            if (ev != null)
            {
                var volunteer = await _context.Users.FindAsync(userId);
                await _notificationService.SendAsync(ev.OrganizerId,
                    "Volunteer rút đăng ký",
                    $"{volunteer?.Name ?? volunteer?.UserName ?? "Volunteer"} đã rút đăng ký khỏi sự kiện '{ev.Title}'.",
                    "RegistrationWithdrawn", eventId);
            }
        }

        public async Task<Registration> RequestCancelAsync(int eventId, int userId, string? reason)
        {
            var reg = await _context.Registrations
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.Status != "Confirmed") throw new Exception("Chỉ đăng ký đã xác nhận mới có thể xin hủy");
            if (reg.IsAttended) throw new Exception("Không thể xin hủy sau khi đã điểm danh");
            if (reg.Event.Status == "Completed" || reg.Event.Status == "Cancelled") throw new Exception("Sự kiện không còn hoạt động");
            if (reg.CancelRequested) throw new Exception("Đã có yêu cầu hủy đang chờ xử lý");

            reg.CancelRequested = true;
            reg.CancelRequestedAt = DateTime.UtcNow;
            reg.CancelReason = reason?.Trim() ?? "";
            await _context.SaveChangesAsync();

            var volunteer = await _context.Users.FindAsync(userId);
            await _notificationService.SendAsync(reg.Event.OrganizerId,
                "Yêu cầu hủy đăng ký",
                $"{volunteer?.Name} xin hủy tham gia '{reg.Event.Title}'.",
                "RegistrationCancelRequested", eventId);

            return reg;
        }

        public async Task<Registration> ConfirmAsync(int eventId, int registrationId, int organizerId, bool bypassInterviewGate = false)
        {
            var reg = await _context.Registrations.Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (reg.Status != "Pending") throw new Exception("Chỉ có thể xác nhận đăng ký đang chờ duyệt");
            if (!bypassInterviewGate && reg.Event.RequiresInterview && reg.InterviewStatus != "Passed")
                throw new Exception("Sự kiện này yêu cầu phỏng vấn. Hãy hẹn phỏng vấn và chấm 'Đạt' trước khi xác nhận.");
            var confirmedCount = await _context.Registrations.CountAsync(r => r.EventId == eventId && r.Status == "Confirmed");
            if (confirmedCount >= reg.Event.MaxParticipants) throw new Exception("Sự kiện đã đủ người");

            reg.Status = "Confirmed";
            reg.ConfirmedAt = DateTime.UtcNow;
            reg.Event.CurrentParticipants = confirmedCount + 1;
            await _context.SaveChangesAsync();

            await _notificationService.SendAsync(reg.UserId,
                "Đăng ký được xác nhận",
                $"Đơn đăng ký của bạn cho sự kiện '{reg.Event.Title}' đã được xác nhận.",
                "RegistrationConfirmed", reg.EventId);

            return reg;
        }

        public async Task<Registration> CancelAsync(int eventId, int registrationId, int organizerId)
        {
            var reg = await _context.Registrations.Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");

            var wasConfirmed = reg.Status == "Confirmed";
            var wasCancelRequest = reg.CancelRequested;
            reg.Status = "Cancelled";
            reg.CancelledAt = DateTime.UtcNow;
            reg.CancelRequested = false;
            var ev = await _context.Events.FindAsync(reg.EventId);
            if (wasConfirmed && ev != null && ev.CurrentParticipants > 0) ev.CurrentParticipants--;
            await _context.SaveChangesAsync();

            if (wasCancelRequest)
            {
                await _notificationService.SendAsync(reg.UserId,
                    "Đăng ký đã được hủy",
                    $"Ban tổ chức đã xác nhận hủy đăng ký của bạn cho sự kiện '{reg.Event.Title}'.",
                    "RegistrationCancelled", reg.EventId);
            }

            return reg;
        }

        public async Task<Registration> CheckInAsync(int eventId, int registrationId, int organizerId, string? qrCode, decimal? latitude = null, decimal? longitude = null)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (reg.Event.Status != "Approved") throw new Exception("Sự kiện chưa mở điểm danh");
            if (reg.Status != "Confirmed") throw new Exception("Đăng ký chưa được xác nhận");
            if (reg.IsAttended) throw new Exception("Đã điểm danh rồi");

            ValidateCheckInWindow(reg);
            ValidateCheckInProof(reg.Event, qrCode, latitude, longitude);

            reg.IsAttended = true;
            reg.AttendedAt = DateTime.UtcNow;
            reg.CheckedOutAt = null;
            reg.VolunteerHours = 0;
            reg.CancelRequested = false;
            reg.CancelRequestedAt = null;
            reg.CancelReason = "";

            await _context.SaveChangesAsync();
            await RefreshVolunteerProgressAsync(reg.UserId, evaluateBadges: false);
            await _notificationService.SendAsync(reg.UserId,
                "Đã ghi nhận check-in",
                $"Ban tổ chức đã ghi nhận bạn check-in cho sự kiện '{reg.Event.Title}'.",
                "RegistrationCheckIn", reg.Id);
            return reg;
        }

        public async Task<Registration> SelfCheckInAsync(int eventId, int userId, string? qrCode, decimal? latitude = null, decimal? longitude = null)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId)
                ?? throw new Exception("Không tìm thấy đăng ký");

            if (reg.Event.Status != "Approved") throw new Exception("Sự kiện chưa mở điểm danh");
            if (reg.Status != "Confirmed") throw new Exception("Đăng ký chưa được xác nhận");
            if (reg.IsAttended) throw new Exception("Đã điểm danh rồi");

            ValidateCheckInWindow(reg);
            ValidateCheckInProof(reg.Event, qrCode, latitude, longitude);

            reg.IsAttended = true;
            reg.AttendedAt = DateTime.UtcNow;
            reg.CheckedOutAt = null;
            reg.VolunteerHours = 0;
            reg.CancelRequested = false;
            reg.CancelRequestedAt = null;
            reg.CancelReason = "";

            await _context.SaveChangesAsync();
            await RefreshVolunteerProgressAsync(reg.UserId, evaluateBadges: false);
            return reg;
        }

        private static decimal CalculateVolunteerHours(Registration reg, DateTime? attendedAt = null)
        {
            var start = reg.Shift?.StartTime ?? reg.Event?.StartDate;
            var end = reg.Shift?.EndTime ?? reg.Event?.EndDate;
            if (!start.HasValue || !end.HasValue || end <= start) return 0m;
            if (!attendedAt.HasValue)
                return (decimal)(end.Value - start.Value).TotalHours;

            var effectiveStart = attendedAt.Value > start.Value ? attendedAt.Value : start.Value;
            if (effectiveStart >= end.Value) return 0m;
            return (decimal)(end.Value - effectiveStart).TotalHours;
        }

        private static decimal CalculateActualVolunteerHours(Registration reg, DateTime checkedOutAt)
        {
            if (!reg.AttendedAt.HasValue) return 0m;
            var start = reg.Shift?.StartTime ?? reg.Event?.StartDate;
            var end = reg.Shift?.EndTime ?? reg.Event?.EndDate;
            if (!start.HasValue || !end.HasValue || end <= start) return 0m;

            var effectiveStart = reg.AttendedAt.Value > start.Value ? reg.AttendedAt.Value : start.Value;
            var effectiveEnd = checkedOutAt < end.Value ? checkedOutAt : end.Value;
            if (effectiveEnd <= effectiveStart) return 0m;
            return (decimal)(effectiveEnd - effectiveStart).TotalHours;
        }

        // Format thời gian UTC sang giờ Việt Nam (UTC+7) cho thông báo người dùng
        private static string FmtCheckInTime(DateTime utc) => utc.AddHours(7).ToString("HH:mm dd/MM/yyyy");

        private static void ValidateCheckInWindow(Registration reg)
        {
            var now = DateTime.UtcNow;
            if (reg.Shift != null)
            {
                var open = reg.Shift.StartTime.AddMinutes(-15);
                var close = reg.Shift.EndTime.AddMinutes(30);
                if (now < open)
                    throw new Exception($"Còn quá sớm. Ca '{reg.Shift.Name}' bắt đầu lúc {FmtCheckInTime(reg.Shift.StartTime)} — điểm danh mở từ {FmtCheckInTime(open)} (15 phút trước ca).");
                if (now > close)
                    throw new Exception($"Đã quá hạn điểm danh. Ca '{reg.Shift.Name}' kết thúc lúc {FmtCheckInTime(reg.Shift.EndTime)} — cửa sổ điểm danh đóng lúc {FmtCheckInTime(close)} (30 phút sau ca).");
                return;
            }

            if (reg.Event == null) throw new Exception("Không tìm thấy sự kiện");
            var evOpen = reg.Event.StartDate.AddMinutes(-30);
            var evClose = reg.Event.EndDate.AddHours(2);
            if (now < evOpen)
                throw new Exception($"Còn quá sớm. Sự kiện bắt đầu lúc {FmtCheckInTime(reg.Event.StartDate)} — điểm danh mở từ {FmtCheckInTime(evOpen)} (30 phút trước sự kiện).");
            if (now > evClose)
                throw new Exception($"Đã quá hạn điểm danh. Sự kiện kết thúc lúc {FmtCheckInTime(reg.Event.EndDate)} — cửa sổ điểm danh đóng lúc {FmtCheckInTime(evClose)} (2 giờ sau sự kiện).");
        }

        private static void ValidateCheckInProof(Entities.Event ev, string? qrCode, decimal? latitude, decimal? longitude)
        {
            if (!string.IsNullOrWhiteSpace(ev.QrCode))
            {
                var qrValid = !string.IsNullOrWhiteSpace(qrCode) && string.Equals(ev.QrCode, qrCode.Trim(), StringComparison.Ordinal);
                if (!qrValid) throw new Exception("Mã QR không đúng");
                return;
            }

            if (!IsWithinEventRadius(ev, latitude, longitude))
                throw new Exception("Vị trí GPS không hợp lệ (bạn đang ở quá xa địa điểm sự kiện hoặc chưa bật định vị)");
        }

        private static decimal MaxAllowedVolunteerHours(Registration reg)
        {
            var scheduled = CalculateVolunteerHours(reg);
            return Math.Max(1m, Math.Round(scheduled * 1.5m, 2));
        }

        private static void ValidateVolunteerHours(Registration reg, decimal hours)
        {
            var max = MaxAllowedVolunteerHours(reg);
            if (hours < 0 || hours > max)
                throw new Exception($"Số giờ phải trong khoảng 0 đến {max:0.##} cho sự kiện/ca này");
        }

        private async Task RefreshVolunteerProgressAsync(int userId, bool evaluateBadges = true)
        {
            var profile = await _context.VolunteerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return;

            profile.TotalVolunteerHours = await _context.Registrations
                .Where(r => r.UserId == userId && r.IsAttended)
                .SumAsync(r => (decimal?)r.VolunteerHours) ?? 0m;
            await _context.SaveChangesAsync();

            if (evaluateBadges)
                await _badgeService.CheckAndAwardAsync(userId);
        }

        private async Task SyncCertificateHoursAsync(Registration reg)
        {
            var certificate = await _context.Certificates
                .FirstOrDefaultAsync(c => c.UserId == reg.UserId && c.EventId == reg.EventId);
            if (certificate == null) return;

            certificate.VolunteerHours = reg.VolunteerHours;
            await _context.SaveChangesAsync();
        }

        private static bool IsWithinEventRadius(Entities.Event ev, decimal? latitude, decimal? longitude)
        {
            if (!latitude.HasValue || !longitude.HasValue || !ev.Latitude.HasValue || !ev.Longitude.HasValue)
                return false;
            if (latitude.Value < -90 || latitude.Value > 90 || ev.Latitude.Value < -90 || ev.Latitude.Value > 90)
                return false;
            if (longitude.Value < -180 || longitude.Value > 180 || ev.Longitude.Value < -180 || ev.Longitude.Value > 180)
                return false;

            var distanceKm = HaversineKm(
                (double)latitude.Value,
                (double)longitude.Value,
                (double)ev.Latitude.Value,
                (double)ev.Longitude.Value);

            return !double.IsNaN(distanceKm) && distanceKm <= (double)ev.CheckInRadiusKm;
        }

        private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double radiusKm = 6371;
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return radiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180;

        public async Task<Registration> CheckOutAsync(int eventId, int registrationId, int organizerId)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (reg.Event.Status != "Approved" && reg.Event.Status != "Completed")
                throw new Exception("Sự kiện phải ở trạng thái đã duyệt hoặc hoàn thành để check-out");
            if (reg.Status != "Confirmed") throw new Exception("Đăng ký chưa được xác nhận");
            if (!reg.IsAttended || !reg.AttendedAt.HasValue) throw new Exception("Tình nguyện viên chưa điểm danh");
            if (reg.CheckedOutAt.HasValue) throw new Exception("Tình nguyện viên đã check-out");

            var checkedOutAt = DateTime.UtcNow;
            if (checkedOutAt < reg.AttendedAt.Value)
                throw new Exception("Không thể check-out trước thời điểm check-in");

            reg.CheckedOutAt = checkedOutAt;
            reg.VolunteerHours = CalculateActualVolunteerHours(reg, checkedOutAt);

            await _context.SaveChangesAsync();
            await SyncCertificateHoursAsync(reg);
            await RefreshVolunteerProgressAsync(reg.UserId);
            await _notificationService.SendAsync(reg.UserId,
                "Đã ghi nhận check-out",
                $"Ban tổ chức đã ghi nhận check-out cho sự kiện '{reg.Event.Title}' với {reg.VolunteerHours:0.##} giờ tình nguyện.",
                "RegistrationCheckOut", reg.Id);
            return reg;
        }

        public async Task<Registration> WalkInAsync(int eventId, int volunteerUserId, int organizerId, int? shiftId, string? note)
        {
            var ev = await _context.Events.Include(e => e.WorkShifts).FirstOrDefaultAsync(e => e.Id == eventId)
                ?? throw new Exception("Không tìm thấy sự kiện");
            if (ev.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (ev.Status != "Approved") throw new Exception("Sự kiện không mở đăng ký tại chỗ");

            var volunteer = await _context.Users.FindAsync(volunteerUserId)
                ?? throw new Exception("Không tìm thấy tài khoản tình nguyện viên");
            if (!volunteer.IsActive) throw new Exception("Tài khoản tình nguyện viên đang bị khóa");
            if (volunteer.UserType != 0) throw new Exception("Tài khoản này không phải tình nguyện viên");

            WorkShift? shift = null;
            if (shiftId.HasValue)
            {
                shift = ev.WorkShifts.FirstOrDefault(s => s.Id == shiftId.Value)
                    ?? throw new Exception("Không tìm thấy ca làm việc");
            }
            else if (ev.WorkShifts.Count > 0)
            {
                throw new Exception("Đăng ký tại chỗ phải chọn ca cụ thể với sự kiện có chia ca");
            }

            var existing = await _context.Registrations
                .Include(r => r.Event)
                .Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == volunteerUserId);
            var attendedAt = DateTime.UtcNow;
            var windowReg = new Registration { Event = ev, Shift = shift };
            ValidateCheckInWindow(windowReg);

            if (existing != null)
            {
                if (existing.IsAttended) return existing;
                if (existing.Status == "Cancelled")
                {
                    ev.CurrentParticipants++;
                }
                existing.ShiftId = shiftId;
                existing.Shift = shift;
                existing.Status = "Confirmed";
                existing.ConfirmedAt = existing.ConfirmedAt ?? attendedAt;
                existing.IsAttended = true;
                existing.AttendedAt = attendedAt;
                existing.CheckedOutAt = null;
                existing.VolunteerHours = 0;
                existing.CancelRequested = false;
                existing.CancelRequestedAt = null;
                existing.CancelReason = "";
                existing.Note = string.IsNullOrWhiteSpace(note) ? existing.Note : note.Trim();
                await _context.SaveChangesAsync();
                await RefreshVolunteerProgressAsync(existing.UserId, evaluateBadges: false);
                await _notificationService.SendAsync(existing.UserId,
                    "Đăng ký tại chỗ đã được ghi nhận",
                    $"Ban tổ chức đã ghi nhận bạn tham gia tại chỗ cho sự kiện '{ev.Title}'.",
                    "RegistrationWalkIn", existing.Id);
                return existing;
            }

            var reg = new Registration
            {
                EventId = eventId,
                UserId = volunteerUserId,
                ShiftId = shiftId,
                Event = ev,
                Shift = shift,
                Status = "Confirmed",
                Note = note?.Trim() ?? "Walk-in",
                RegisteredAt = attendedAt,
                ConfirmedAt = attendedAt,
                IsAttended = true,
                AttendedAt = attendedAt,
                CheckedOutAt = null,
                VolunteerHours = 0
            };
            _context.Registrations.Add(reg);
            // Walk-in bypasses capacity check to support on-site reality
            ev.CurrentParticipants++;
            await _context.SaveChangesAsync();
            await RefreshVolunteerProgressAsync(reg.UserId, evaluateBadges: false);
            await _notificationService.SendAsync(reg.UserId,
                "Đăng ký tại chỗ đã được ghi nhận",
                $"Ban tổ chức đã tạo đăng ký tại chỗ cho bạn ở sự kiện '{ev.Title}'.",
                "RegistrationWalkIn", reg.Id);
            return reg;
        }

        public async Task<Registration> ManualAttendAsync(int eventId, int registrationId, int organizerId, decimal? hoursOverride)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (reg.Status != "Confirmed") throw new Exception("Đăng ký chưa được xác nhận");
            if (reg.Event.Status != "Approved" && reg.Event.Status != "Completed")
                throw new Exception("Sự kiện phải ở trạng thái đã duyệt hoặc hoàn thành để ghi nhận tham gia");

            // Grace window: allow manual attend up to 7 days after EndDate
            if (DateTime.UtcNow < reg.Event.EndDate)
                throw new Exception("Chỉ có thể ghi nhận tham gia thủ công sau khi sự kiện kết thúc");
            if (DateTime.UtcNow > reg.Event.EndDate.AddDays(7))
                throw new Exception("Đã quá hạn ghi nhận tham gia thủ công (7 ngày sau sự kiện)");

            if (reg.IsAttended && !hoursOverride.HasValue) return reg;
            if (hoursOverride.HasValue) ValidateVolunteerHours(reg, hoursOverride.Value);

            reg.IsAttended = true;
            reg.AttendedAt = reg.AttendedAt ?? DateTime.UtcNow;
            reg.CheckedOutAt = reg.CheckedOutAt ?? (reg.Shift?.EndTime ?? reg.Event.EndDate);
            var defaultHours = CalculateVolunteerHours(reg);
            reg.VolunteerHours = hoursOverride.HasValue && hoursOverride.Value >= 0
                ? hoursOverride.Value
                : (reg.VolunteerHours > 0 ? reg.VolunteerHours : defaultHours);

            await _context.SaveChangesAsync();
            await SyncCertificateHoursAsync(reg);
            await RefreshVolunteerProgressAsync(reg.UserId);
            await _notificationService.SendAsync(reg.UserId,
                "Đã bổ sung điểm danh",
                $"Ban tổ chức đã bổ sung điểm danh cho sự kiện '{reg.Event.Title}' với {reg.VolunteerHours:0.##} giờ tình nguyện.",
                "RegistrationManualAttend", reg.Id);
            return reg;
        }

        public async Task<Registration> AdjustHoursAsync(int eventId, int registrationId, int organizerId, decimal hours)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (!reg.IsAttended) throw new Exception("Không thể điều chỉnh giờ cho tình nguyện viên chưa điểm danh");
            ValidateVolunteerHours(reg, hours);

            reg.VolunteerHours = hours;
            await _context.SaveChangesAsync();
            await SyncCertificateHoursAsync(reg);
            await RefreshVolunteerProgressAsync(reg.UserId);
            await _notificationService.SendAsync(reg.UserId,
                "Giờ tình nguyện đã được cập nhật",
                $"Ban tổ chức đã cập nhật giờ tình nguyện của bạn ở sự kiện '{reg.Event.Title}' thành {reg.VolunteerHours:0.##} giờ.",
                "RegistrationHoursAdjusted", reg.Id);
            return reg;
        }

        public async Task<Registration> ChangeShiftAsync(int eventId, int registrationId, int organizerId, int? newShiftId)
        {
            var reg = await _context.Registrations.Include(r => r.Event).Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.Id == registrationId)
                ?? throw new Exception("Không tìm thấy đăng ký");
            if (reg.EventId != eventId) throw new Exception("Đăng ký không thuộc sự kiện này");
            if (reg.Event.OrganizerId != organizerId) throw new Exception("Bạn không có quyền thực hiện thao tác này");
            if (reg.Status == "Cancelled") throw new Exception("Không thể chuyển ca cho đăng ký đã hủy");
            if (reg.IsAttended) throw new Exception("Không thể chuyển ca sau khi đã điểm danh");

            if (newShiftId.HasValue)
            {
                var shift = await _context.WorkShifts
                    .FirstOrDefaultAsync(s => s.Id == newShiftId.Value)
                    ?? throw new Exception("Không tìm thấy ca làm việc");
                if (shift.EventId != eventId) throw new Exception("Ca làm việc không thuộc sự kiện này");

                var occupiedCount = await _context.Registrations.CountAsync(r =>
                    r.ShiftId == newShiftId.Value && (r.Status == "Pending" || r.Status == "Confirmed") && r.Id != registrationId);
                if (occupiedCount >= shift.MaxVolunteers) throw new Exception("Ca đã đầy, không thể chuyển sang ca này");
            }

            reg.ShiftId = newShiftId;
            await _context.SaveChangesAsync();
            return reg;
        }

        public async Task<List<Registration>> GetByEventAsync(int eventId)
        {
            var registrations = await _context.Registrations
                .Include(r => r.User)
                .Include(r => r.Shift)
                .Include(r => r.InterviewSlot)
                .Where(r => r.EventId == eventId)
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();

            // Lấy organizerId để biết "rater" khi organizer chấm điểm TNV.
            var organizerId = await _context.Events
                .Where(e => e.Id == eventId)
                .Select(e => (int?)e.OrganizerId)
                .FirstOrDefaultAsync();
            if (organizerId.HasValue && registrations.Count > 0)
            {
                var rateeIds = registrations.Select(r => r.UserId).Distinct().ToList();
                var ratings = await _context.Ratings
                    .Where(r => r.EventId == eventId && r.RaterId == organizerId.Value && rateeIds.Contains(r.RateeId))
                    .Select(r => new { r.Id, r.RateeId, r.Score, r.Comment })
                    .ToListAsync();
                foreach (var reg in registrations)
                {
                    var rating = ratings.FirstOrDefault(r => r.RateeId == reg.UserId);
                    reg.HasRated = rating != null;
                    reg.RatingId = rating?.Id;
                    reg.RatingScore = rating?.Score;
                    reg.RatingComment = rating?.Comment ?? "";
                }
            }
            return registrations;
        }

        public async Task<List<Registration>> GetByUserAsync(int userId)
        {
            var registrations = await _context.Registrations
                .Include(r => r.Event).ThenInclude(e => e.Category)
                .Include(r => r.Event).ThenInclude(e => e.Organizer)
                .Include(r => r.Shift)
                .Include(r => r.InterviewSlot)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();

            var eventIds = registrations.Select(r => r.EventId).Distinct().ToList();
            if (eventIds.Count == 0) return registrations;

            var ratings = await _context.Ratings
                .Where(r => r.RaterId == userId && eventIds.Contains(r.EventId))
                .Select(r => new { r.Id, r.EventId, r.RateeId, r.Score, r.Comment })
                .ToListAsync();
            foreach (var registration in registrations)
            {
                var rating = ratings.FirstOrDefault(r =>
                    r.EventId == registration.EventId &&
                    registration.Event != null &&
                    r.RateeId == registration.Event.OrganizerId);
                registration.HasRated = rating != null;
                registration.RatingId = rating?.Id;
                registration.RatingScore = rating?.Score;
                registration.RatingComment = rating?.Comment ?? "";
            }

            return registrations;
        }

        public async Task<Registration?> GetByEventAndUserAsync(int eventId, int userId)
        {
            var reg = await _context.Registrations
                .Include(r => r.Event)
                .Include(r => r.Shift)
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);
            if (reg == null || reg.Event == null) return reg;

            // Đánh giá TNV → BTC (volunteer rates organizer)
            var rating = await _context.Ratings
                .Where(r => r.EventId == eventId && r.RaterId == userId && r.RateeId == reg.Event.OrganizerId)
                .Select(r => new { r.Id, r.Score, r.Comment })
                .FirstOrDefaultAsync();
            reg.HasRated = rating != null;
            reg.RatingId = rating?.Id;
            reg.RatingScore = rating?.Score;
            reg.RatingComment = rating?.Comment ?? "";
            return reg;
        }
    }
}
