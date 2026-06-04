using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface IChannelService
    {
        Task<List<Channel>> GetAllAsync();
        Task<Channel?> GetByIdAsync(int channelId, int? viewerId = null);
        Task<(List<Post> Items, int TotalCount)> GetPostsAsync(int channelId, int page, int pageSize, int userId, string? postType = null);
        Task<Post> CreatePostAsync(int channelId, int authorId, string content, string? imageUrl, string postType, AttachmentDto? attachment);
        Task UpdatePostAsync(int channelId, int postId, int authorId, string content, string? imageUrl);
        Task DeletePostAsync(int channelId, int postId, int userId, bool isAdmin);
        Task<Post> TogglePinAsync(int channelId, int postId, int organizerId, bool isAdmin);
        Task<bool> ToggleLikeAsync(int channelId, int postId, int userId);
        Task<List<Comment>> GetCommentsAsync(int postId);
        Task<Comment> AddCommentAsync(int channelId, int postId, int authorId, string content, int? parentCommentId);
        Task DeleteCommentAsync(int channelId, int postId, int commentId, int userId, bool isAdmin);
        Task<bool> CanAccessChannelAsync(int channelId, int userId);
        Task<List<object>> GetChannelMembersAsync(int channelId, string? query);
        Task<Channel> CreateShiftChannelAsync(int shiftId, int organizerId);
        Task<Poll> CreatePollAsync(int channelId, int postId, int organizerId, bool isAdmin, PollCreateDto dto);
        Task<Poll> VoteAsync(int channelId, int pollId, int optionId, int userId);
        Task<object> GetPollResultsAsync(int channelId, int pollId, int userId);
    }
}
