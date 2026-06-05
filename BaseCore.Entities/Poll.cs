using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class Poll
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public string Question { get; set; } = "";
        public bool AllowMultiple { get; set; } = false;
        public DateTime? ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public int? UserVotedOptionId { get; set; }

        public Post Post { get; set; }
        public List<PollOption> Options { get; set; } = new();
        public List<PollVote> Votes { get; set; } = new();
    }

    public class PollOption
    {
        public int Id { get; set; }
        public int PollId { get; set; }
        public string Text { get; set; } = "";
        public int VoteCount { get; set; } = 0;
        public int SortOrder { get; set; } = 0;

        public Poll Poll { get; set; }
    }

    public class PollVote
    {
        public int Id { get; set; }
        public int PollId { get; set; }
        public int OptionId { get; set; }
        public int UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Poll Poll { get; set; }
        public PollOption Option { get; set; }
        public User User { get; set; }
    }
}
