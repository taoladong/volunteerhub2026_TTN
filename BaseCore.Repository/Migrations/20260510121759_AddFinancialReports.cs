using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExpenseDetails",
                table: "SupportCampaigns",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportAttachmentUrl",
                table: "SupportCampaigns",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportSummary",
                table: "SupportCampaigns",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReportedAt",
                table: "SupportCampaigns",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReportedBy",
                table: "SupportCampaigns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UsedAmount",
                table: "SupportCampaigns",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpenseDetails",
                table: "SponsorshipProposals",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportAttachmentUrl",
                table: "SponsorshipProposals",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportSummary",
                table: "SponsorshipProposals",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UsedAmount",
                table: "SponsorshipProposals",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportCampaigns_ReportedBy",
                table: "SupportCampaigns",
                column: "ReportedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_SupportCampaigns_Users_ReportedBy",
                table: "SupportCampaigns",
                column: "ReportedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SupportCampaigns_Users_ReportedBy",
                table: "SupportCampaigns");

            migrationBuilder.DropIndex(
                name: "IX_SupportCampaigns_ReportedBy",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ExpenseDetails",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ReportAttachmentUrl",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ReportSummary",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ReportedAt",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ReportedBy",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "UsedAmount",
                table: "SupportCampaigns");

            migrationBuilder.DropColumn(
                name: "ExpenseDetails",
                table: "SponsorshipProposals");

            migrationBuilder.DropColumn(
                name: "ReportAttachmentUrl",
                table: "SponsorshipProposals");

            migrationBuilder.DropColumn(
                name: "ReportSummary",
                table: "SponsorshipProposals");

            migrationBuilder.DropColumn(
                name: "UsedAmount",
                table: "SponsorshipProposals");
        }
    }
}
