namespace AuthService.Entities;

public class VolunteerProfile 
{
	public int Id { get; set; }
	public int UserId { get; set; }
	public string? PhoneNumber { get; set;}
	public DateTime? DateOfBirth { get; set; }
	public string? Gender {get; set;}
	public string? Address { get; set; }
	public string? Bio { get; set; }
	public string? AvatarUrl { get; set; }

	public bool IsKycVerified {get; set;} = false;
	public DateTime CreatedAt { get; set;} = DateTime.UtcNow;
	public DateTime? UpdatedAt { get; set;}

	public User User { get; set; }= null!;
}
