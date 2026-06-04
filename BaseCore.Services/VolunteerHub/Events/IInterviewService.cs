using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface IInterviewService
    {
        Task<InterviewSlot> ScheduleAsync(int eventId, int regId, int organizerId, DateTime scheduledAt, int durationMinutes, string meetingUrl, string note);
        Task<InterviewSlot> UpdateAsync(int eventId, int regId, int organizerId, DateTime scheduledAt, int durationMinutes, string meetingUrl, string note);
        Task CancelAsync(int eventId, int regId, int organizerId);
        Task<InterviewSlot> DecideAsync(int eventId, int regId, int organizerId, string outcome, string note);
    }
}
