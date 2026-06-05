using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services.VolunteerHub
{
    public class InterviewService : IInterviewService
    {
        private readonly MySqlDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IRegistrationService _registrationService;

        public InterviewService(MySqlDbContext context, INotificationService notificationService, IRegistrationService registrationService)
        {
            _context = context;
            _notificationService = notificationService;
            _registrationService = registrationService;
        }

        private static string FmtVn(DateTime utc) => utc.AddHours(7).ToString("HH:mm dd/MM/yyyy") + " (giờ VN)";

        private static void ValidateMeetingUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;
            if (!(url.StartsWith("http://") || url.StartsWith("https://")))
                throw new Exception("Link cuộc họp phải bắt đầu bằng http:// hoặc https://");
        }

        private async Task<Registration> LoadOwnedRegistrationAsync(int eventId, int regId, int organizerId)
        {
            var reg = await _context.Registrations
                .Include(r => r.Event)
                .Include(r => r.InterviewSlot)
                .FirstOrDefaultAsync(r => r.Id == regId)
                ?? throw new Exception("Registration not found");
            if (reg.EventId != eventId) throw new Exception("Registration not found in this event");
            if (reg.Event == null || reg.Event.OrganizerId != organizerId) throw new Exception("Not authorized");
            return reg;
        }

        public async Task<InterviewSlot> ScheduleAsync(int eventId, int regId, int organizerId, DateTime scheduledAt, int durationMinutes, string meetingUrl, string note)
        {
            var reg = await LoadOwnedRegistrationAsync(eventId, regId, organizerId);
            if (reg.Status != "Pending") throw new Exception("Chỉ hẹn phỏng vấn cho đăng ký đang chờ duyệt");
            if (reg.Event.Status == "Completed" || reg.Event.Status == "Cancelled") throw new Exception("Sự kiện không còn hoạt động");
            if (reg.InterviewSlot != null && reg.InterviewSlot.Status == "Scheduled")
                throw new Exception("Đã có lịch phỏng vấn. Hãy dùng chức năng đổi lịch.");

            ValidateMeetingUrl(meetingUrl);
            if (scheduledAt <= DateTime.UtcNow) throw new Exception("Thời gian phỏng vấn phải ở tương lai");
            if (scheduledAt > reg.Event.StartDate) throw new Exception("Thời gian phỏng vấn phải trước khi sự kiện bắt đầu");

            var duration = durationMinutes > 0 ? durationMinutes : 30;
            var note0 = note?.Trim() ?? "";
            var meetingUrl0 = meetingUrl?.Trim() ?? "";

            InterviewSlot slot;
            if (reg.InterviewSlot != null)
            {
                // tái dùng slot cũ (đã Cancelled) cho đăng ký này
                slot = reg.InterviewSlot;
                slot.ScheduledAt = scheduledAt;
                slot.DurationMinutes = duration;
                slot.MeetingUrl = meetingUrl0;
                slot.Note = note0;
                slot.Status = "Scheduled";
                slot.DecisionNote = "";
                slot.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                slot = new InterviewSlot
                {
                    RegistrationId = reg.Id,
                    EventId = eventId,
                    ScheduledAt = scheduledAt,
                    DurationMinutes = duration,
                    MeetingUrl = meetingUrl0,
                    Note = note0,
                    Status = "Scheduled",
                    CreatedBy = organizerId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.InterviewSlots.Add(slot);
            }
            reg.InterviewStatus = "Scheduled";
            await _context.SaveChangesAsync();

            await _notificationService.SendAsync(reg.UserId,
                "Lịch phỏng vấn",
                string.IsNullOrWhiteSpace(slot.MeetingUrl)
                    ? $"BTC mời bạn phỏng vấn cho sự kiện '{reg.Event.Title}' lúc {FmtVn(scheduledAt)}. Vào mục đăng ký để mở phòng phỏng vấn video nội bộ."
                    : $"BTC mời bạn phỏng vấn cho sự kiện '{reg.Event.Title}' lúc {FmtVn(scheduledAt)}. Vào phòng họp: {slot.MeetingUrl}",
                "InterviewScheduled", eventId);

            return slot;
        }

        public async Task<InterviewSlot> UpdateAsync(int eventId, int regId, int organizerId, DateTime scheduledAt, int durationMinutes, string meetingUrl, string note)
        {
            var reg = await LoadOwnedRegistrationAsync(eventId, regId, organizerId);
            var slot = reg.InterviewSlot;
            if (slot == null || slot.Status != "Scheduled") throw new Exception("Không có lịch phỏng vấn đang hoạt động để cập nhật");

            ValidateMeetingUrl(meetingUrl);
            if (scheduledAt <= DateTime.UtcNow) throw new Exception("Thời gian phỏng vấn phải ở tương lai");
            if (scheduledAt > reg.Event.StartDate) throw new Exception("Thời gian phỏng vấn phải trước khi sự kiện bắt đầu");

            slot.ScheduledAt = scheduledAt;
            slot.DurationMinutes = durationMinutes > 0 ? durationMinutes : 30;
            slot.MeetingUrl = meetingUrl?.Trim() ?? "";
            slot.Note = note?.Trim() ?? "";
            slot.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _notificationService.SendAsync(reg.UserId,
                "Lịch phỏng vấn đã thay đổi",
                string.IsNullOrWhiteSpace(slot.MeetingUrl)
                    ? $"Buổi phỏng vấn cho sự kiện '{reg.Event.Title}' đã được đổi sang {FmtVn(scheduledAt)}. Vào mục đăng ký để mở phòng phỏng vấn video nội bộ."
                    : $"Buổi phỏng vấn cho sự kiện '{reg.Event.Title}' đã được đổi sang {FmtVn(scheduledAt)}. Vào phòng họp: {slot.MeetingUrl}",
                "InterviewUpdated", eventId);

            return slot;
        }

        public async Task CancelAsync(int eventId, int regId, int organizerId)
        {
            var reg = await LoadOwnedRegistrationAsync(eventId, regId, organizerId);
            var slot = reg.InterviewSlot;
            if (slot == null || slot.Status != "Scheduled") throw new Exception("Không có lịch phỏng vấn đang hoạt động để hủy");

            slot.Status = "Cancelled";
            slot.UpdatedAt = DateTime.UtcNow;
            reg.InterviewStatus = "Cancelled";
            await _context.SaveChangesAsync();

            await _notificationService.SendAsync(reg.UserId,
                "Buổi phỏng vấn đã bị hủy",
                $"BTC đã hủy lịch phỏng vấn cho sự kiện '{reg.Event.Title}'.",
                "InterviewCancelled", eventId);
        }

        public async Task<InterviewSlot> DecideAsync(int eventId, int regId, int organizerId, string outcome, string note)
        {
            var reg = await LoadOwnedRegistrationAsync(eventId, regId, organizerId);
            var slot = reg.InterviewSlot;
            if (slot == null || slot.Status != "Scheduled") throw new Exception("Không có lịch phỏng vấn đang hoạt động để chấm kết quả");

            var decision = (outcome ?? "").Trim();
            if (decision != "Passed" && decision != "Failed" && decision != "NoShow")
                throw new Exception("Kết quả không hợp lệ");

            var note0 = note?.Trim() ?? "";

            if (decision == "Passed")
            {
                // Xác nhận đăng ký qua RegistrationService (đảm bảo kiểm tra sức chứa). Throw nếu sự kiện đầy.
                await _registrationService.ConfirmAsync(eventId, regId, organizerId, bypassInterviewGate: true);
                slot.Status = "Passed";
                slot.DecisionNote = note0;
                slot.UpdatedAt = DateTime.UtcNow;
                reg.InterviewStatus = "Passed";
                await _context.SaveChangesAsync();

                await _notificationService.SendAsync(reg.UserId,
                    "Phỏng vấn đạt",
                    $"Chúc mừng! Bạn đã vượt qua phỏng vấn và được nhận vào sự kiện '{reg.Event.Title}'.",
                    "InterviewPassed", eventId);
            }
            else
            {
                // Failed hoặc NoShow → hủy đăng ký
                reg.CancelReason = string.IsNullOrWhiteSpace(note0)
                    ? (decision == "NoShow" ? "Vắng mặt buổi phỏng vấn" : "Không đạt phỏng vấn")
                    : note0;
                await _registrationService.CancelAsync(eventId, regId, organizerId);
                slot.Status = decision;
                slot.DecisionNote = note0;
                slot.UpdatedAt = DateTime.UtcNow;
                reg.InterviewStatus = decision;
                await _context.SaveChangesAsync();

                await _notificationService.SendAsync(reg.UserId,
                    decision == "NoShow" ? "Vắng mặt phỏng vấn" : "Kết quả phỏng vấn",
                    $"Rất tiếc, đơn đăng ký của bạn cho sự kiện '{reg.Event.Title}' chưa được chấp nhận." +
                    (string.IsNullOrWhiteSpace(note0) ? "" : $" Ghi chú: {note0}"),
                    "InterviewFailed", eventId);
            }

            return slot;
        }
    }
}
