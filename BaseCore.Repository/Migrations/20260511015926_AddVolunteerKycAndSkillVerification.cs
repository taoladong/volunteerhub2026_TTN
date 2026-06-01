using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddVolunteerKycAndSkillVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNote",
                table: "VolunteerSkills",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceUrl",
                table: "VolunteerSkills",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationNote",
                table: "VolunteerSkills",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationReviewedAt",
                table: "VolunteerSkills",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerificationReviewedBy",
                table: "VolunteerSkills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationStatus",
                table: "VolunteerSkills",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationSubmittedAt",
                table: "VolunteerSkills",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdentityBackImageUrl",
                table: "VolunteerProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdentityFrontImageUrl",
                table: "VolunteerProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KycAdminNote",
                table: "VolunteerProfiles",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "KycReviewedAt",
                table: "VolunteerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "KycReviewedBy",
                table: "VolunteerProfiles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KycStatus",
                table: "VolunteerProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "KycSubmittedAt",
                table: "VolunteerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PortraitImageUrl",
                table: "VolunteerProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresKyc",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 1,
                column: "RequiresKyc",
                value: false);

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 2,
                column: "RequiresKyc",
                value: false);

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 3,
                column: "RequiresKyc",
                value: false);

            migrationBuilder.UpdateData(
                table: "VolunteerProfiles",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "IdentityBackImageUrl", "IdentityFrontImageUrl", "KycAdminNote", "KycReviewedAt", "KycReviewedBy", "KycStatus", "KycSubmittedAt", "PortraitImageUrl" },
                values: new object[] { "", "", "Seed verified.", null, null, "Verified", null, "" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNote",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "EvidenceUrl",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VerificationNote",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VerificationReviewedAt",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VerificationReviewedBy",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "VerificationSubmittedAt",
                table: "VolunteerSkills");

            migrationBuilder.DropColumn(
                name: "IdentityBackImageUrl",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "IdentityFrontImageUrl",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "KycAdminNote",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "KycReviewedAt",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "KycReviewedBy",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "KycStatus",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "KycSubmittedAt",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "PortraitImageUrl",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "RequiresKyc",
                table: "Events");
        }
    }
}
