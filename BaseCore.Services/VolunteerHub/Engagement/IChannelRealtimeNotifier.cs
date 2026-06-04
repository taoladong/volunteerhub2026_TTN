using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface IChannelRealtimeNotifier
    {
        Task PostCreatedAsync(int channelId, Post post);
        Task CommentAddedAsync(int channelId, int postId, Comment comment);
        Task PollUpdatedAsync(int channelId, Poll poll);
    }

    public class NullChannelRealtimeNotifier : IChannelRealtimeNotifier
    {
        public Task PostCreatedAsync(int channelId, Post post) => Task.CompletedTask;
        public Task CommentAddedAsync(int channelId, int postId, Comment comment) => Task.CompletedTask;
        public Task PollUpdatedAsync(int channelId, Poll poll) => Task.CompletedTask;
    }
}
