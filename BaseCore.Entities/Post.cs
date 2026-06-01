using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class Post
    {
        public int Id { get; set; }
        public int ChannelId { get; set; }
        public int AuthorId { get; set; }
        public string Content { get; set; }
        public string ImageUrl { get; set; }
        public int LikeCount { get; set; } = 0;
        public bool IsPinned { get; set; } = false;
        public DateTime? PinnedAt { get; set; }
        public string PostType { get; set; } = "discussion";
        public string AttachmentUrl { get; set; } = "";
        public string AttachmentName { get; set; } = "";
        public string AttachmentType { get; set; } = "";
        public long AttachmentSize { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public int CommentCount { get; set; }
        [NotMapped]
        public bool IsLikedByMe { get; set; }

        // Navigation
        public Channel Channel { get; set; }
        public User Author { get; set; }
        public List<Comment> Comments { get; set; }
        public List<Like> Likes { get; set; }
        public Poll Poll { get; set; }
    }
}
