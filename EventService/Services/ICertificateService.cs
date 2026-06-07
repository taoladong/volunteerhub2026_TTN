using BaseCore.Entities;

namespace EventService.Services
{
    public interface ICertificateService
    {
        Task IssueCertificatesForEventAsync(int eventId);
        Task<List<Certificate>> GetByUserAsync(int userId);
        Task<Certificate?> GetByCodeAsync(string code);
        byte[] BuildCertificatePdf(Certificate cert, string verifyUrl);
    }
}
