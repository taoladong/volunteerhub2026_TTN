using System;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string UserName { get; set; }
        [JsonIgnore]
        public string Password { get; set; }
        [JsonIgnore]
        public byte[] Salt { get; set; }
        public string Contact { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Position { get; set; }
        public string Image { get; set; }
        public bool IsActive { get; set; }
        public int UserType { get; set; }
        public DateTime Created { get; set; } = DateTime.Now;
    }
}
