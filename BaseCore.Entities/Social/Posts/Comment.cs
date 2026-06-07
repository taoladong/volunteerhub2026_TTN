using System;

namespace BaseCore.Entities
{
    public class Comment
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public int AuthorId { get; set; }
        public string Content { get; set; }
        public int? ParentCommentId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Post Post { get; set; }
        public User Author { get; set; }
        public Comment ParentComment { get; set; }
    }
}
