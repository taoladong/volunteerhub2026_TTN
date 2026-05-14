namespace AuthService.Entities;

public enum VerificationStatus
{
    NotSubmitted = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    ChangesRequested = 4
}
