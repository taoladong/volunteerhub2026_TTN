using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddSponsorProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SponsorProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    RepresentativeName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Website = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SponsorProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SponsorProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SponsorProfiles_UserId",
                table: "SponsorProfiles",
                column: "UserId",
                unique: true);

            // Seed sponsor profile for demo sponsor user (userId=3)
            migrationBuilder.InsertData(
                table: "SponsorProfiles",
                columns: new[] { "Id", "UserId", "OrganizationName", "RepresentativeName", "ContactEmail", "Phone", "Website", "LogoUrl", "Description", "IsVerified", "CreatedAt", "UpdatedAt" },
                values: new object[] { 1, 3, "Công ty TNHH Tài trợ Demo", "Nguyễn Văn Sponsor", "sponsor@demo.vn", "0901234567", "https://sponsor-demo.vn", "", "Nhà tài trợ demo cho hệ thống VolunteerHub", true, new DateTime(2025, 5, 1), new DateTime(2025, 5, 1) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "SponsorProfiles");
        }
    }
}
