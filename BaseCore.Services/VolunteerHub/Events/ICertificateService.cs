using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface ICertificateService
    {
        Task IssueCertificatesForEventAsync(int eventId);
        Task<List<Certificate>> GetByUserAsync(int userId);
        Task<Certificate?> GetByCodeAsync(string code);
        byte[] BuildCertificatePdf(Certificate cert, string verifyUrl);
    }
}
