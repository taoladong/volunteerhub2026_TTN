using Microsoft.AspNetCore.SignalR;
using BaseCore.Entities;
using BaseCore.Services.VolunteerHub;

namespace BaseCore.EventService.Hubs
{
    public class SignalRChannelRealtimeNotifier : IChannelRealtimeNotifier
    {
        private readonly IHubContext<ChannelHub> _hubContext;

        public SignalRChannelRealtimeNotifier(IHubContext<ChannelHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public Task PostCreatedAsync(int channelId, Post post)
        {
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("PostCreated", post);
        }

        public Task CommentAddedAsync(int channelId, int postId, Comment comment)
        {
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("CommentAdded", new { postId, comment });
        }

        public Task PollUpdatedAsync(int channelId, Poll poll)
        {
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("PollUpdated", poll);
        }
    }
}
