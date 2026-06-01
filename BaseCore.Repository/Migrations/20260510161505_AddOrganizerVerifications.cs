using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizerVerifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizerVerifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizerId = table.Column<int>(type: "int", nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RepresentativeName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    DocumentUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VerificationNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CommitmentAccepted = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AdminNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RejectReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VerifiedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizerVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizerVerifications_Users_OrganizerId",
                        column: x => x.OrganizerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizerVerifications_Users_VerifiedBy",
                        column: x => x.VerifiedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "OrganizerVerifications",
                columns: new[] { "Id", "Address", "AdminNote", "CommitmentAccepted", "ContactEmail", "CreatedAt", "Description", "DocumentUrl", "OrganizationName", "OrganizerId", "Phone", "RejectReason", "RepresentativeName", "Status", "SubmittedAt", "UpdatedAt", "VerificationNote", "VerifiedAt", "VerifiedBy", "WebsiteUrl" },
                values: new object[] { 1, "Ha Noi", "Seed verified.", true, "organizer@volunteerhub.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Demo organizer account used for VolunteerHub review flows.", "", "Volunteer Hub Demo Club", 2, "", "", "Nguyen Van Minh", "Verified", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Seeded verified organizer for demo data.", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 1, "" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerVerifications_OrganizerId",
                table: "OrganizerVerifications",
                column: "OrganizerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerVerifications_Status_SubmittedAt",
                table: "OrganizerVerifications",
                columns: new[] { "Status", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerVerifications_VerifiedBy",
                table: "OrganizerVerifications",
                column: "VerifiedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizerVerifications");
        }
    }
}
