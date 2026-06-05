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
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("PostCreated", MapPost(post));
        }

        public Task CommentAddedAsync(int channelId, int postId, Comment comment)
        {
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("CommentAdded", new { postId, comment = MapComment(comment) });
        }

        public Task PollUpdatedAsync(int channelId, Poll poll)
        {
            return _hubContext.Clients.Group($"channel-{channelId}").SendAsync("PollUpdated", MapPoll(poll));
        }

        private static object MapPost(Post post) => new
        {
            post.Id,
            post.ChannelId,
            post.AuthorId,
            authorName = post.Author?.Name ?? post.Author?.UserName ?? "",
            post.Content,
            post.ImageUrl,
            post.LikeCount,
            post.IsPinned,
            post.PinnedAt,
            post.PostType,
            post.AttachmentUrl,
            post.AttachmentName,
            post.AttachmentType,
            post.AttachmentSize,
            post.CreatedAt,
            post.UpdatedAt,
            post.CommentCount,
            post.IsLikedByMe,
            poll = post.Poll == null ? null : MapPoll(post.Poll)
        };

        private static object MapComment(Comment comment) => new
        {
            comment.Id,
            comment.PostId,
            comment.AuthorId,
            authorName = comment.Author?.Name ?? comment.Author?.UserName ?? "",
            comment.Content,
            comment.ParentCommentId,
            comment.CreatedAt
        };

        private static object MapPoll(Poll poll) => new
        {
            poll.Id,
            poll.PostId,
            poll.Question,
            poll.AllowMultiple,
            poll.ExpiresAt,
            poll.CreatedAt,
            poll.UserVotedOptionId,
            options = poll.Options
                .OrderBy(o => o.SortOrder)
                .Select(o => new
                {
                    o.Id,
                    o.PollId,
                    o.Text,
                    o.VoteCount,
                    o.SortOrder
                })
                .ToList()
        };
    }
}
