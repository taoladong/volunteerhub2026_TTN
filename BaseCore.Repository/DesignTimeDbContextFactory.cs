using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BaseCore.Repository
{
    // Cho phép EF Core tạo MySqlDbContext lúc design-time (migrations) mà không cần
    // chạy một host nào. Connection string chỉ dùng để xác định provider; lệnh
    // "migrations add" không mở kết nối thật.
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MySqlDbContext>
    {
        public MySqlDbContext CreateDbContext(string[] args)
        {
            var options = new DbContextOptionsBuilder<MySqlDbContext>()
                .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=VolunteerHub;Trusted_Connection=True;TrustServerCertificate=True")
                .Options;
            return new MySqlDbContext(options);
        }
    }
}
