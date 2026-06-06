using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class ExpandAuthEventEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "VolunteerSkills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VolunteerProfileId",
                table: "VolunteerSkills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "YearsOfExperience",
                table: "VolunteerSkills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "VolunteerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "VolunteerProfiles",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                table: "VolunteerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "VolunteerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "VolunteerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "VolunteerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId1",
                table: "VolunteerProfiles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Skills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "KycSubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VolunteerProfileId = table.Column<int>(type: "int", nullable: false),
                    LegalFullName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IdentityNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentFrontUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentBackUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KycSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KycSubmissions_VolunteerProfiles_VolunteerProfileId",
                        column: x => x.VolunteerProfileId,
                        principalTable: "VolunteerProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 1,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 2,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 3,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 4,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 5,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 6,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "Skills",
                keyColumn: "Id",
                keyValue: 7,
                column: "Description",
                value: null);

            migrationBuilder.UpdateData(
                table: "VolunteerProfiles",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Address", "CreatedAt", "DateOfBirth", "Gender", "PhoneNumber", "UpdatedAt", "UserId1" },
                values: new object[] { null, new DateTime(2026, 6, 6, 17, 48, 44, 646, DateTimeKind.Utc).AddTicks(2473), null, null, null, null, null });

            migrationBuilder.CreateIndex(
                name: "IX_VolunteerSkills_VolunteerProfileId",
                table: "VolunteerSkills",
                column: "VolunteerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_VolunteerProfiles_UserId1",
                table: "VolunteerProfiles",
                column: "UserId1",
                unique: true,
                filter: "[UserId1] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_KycSubmissions_VolunteerProfileId",
                table: "KycSubmissions",
                column: "VolunteerProfileId");

            migrationBuilder.AddForeignKey(
                name: "FK_VolunteerProfiles_Users_UserId1",
                table: "VolunteerProfiles",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VolunteerSkills_VolunteerProfiles_VolunteerProfileId",
                table: "VolunteerSkills",
                column: "VolunteerProfileId",
                principalTable: "VolunteerProfiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VolunteerProfiles_Users_UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_VolunteerSkills_VolunteerProfiles_VolunteerProfileId",
                table: "VolunteerSkills");

            migrationBuilder.DropTable(
                name: "KycSubmissions");

            migrationBuilder.DropIndex(
                name: "IX_VolunteerSkills_VolunteerProfileId",
                table: "VolunteerSkills");

            migrationBuilder.DropIndex(
                name: "IX_VolunteerProfiles_UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VolunteerProfileId",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "YearsOfExperience",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Skills");
        }
    }
}
