using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddEventCheckInRadius : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CheckInRadiusKm",
                table: "Events",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 1,
                column: "CheckInRadiusKm",
                value: 0.5m);

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CheckInRadiusKm", "QrCode" },
                values: new object[] { 0.5m, "EVT-SEED-2-9f4c1b7d2e6a4c8ba5d0f3e1a2b7c6d5" });

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CheckInRadiusKm", "QrCode" },
                values: new object[] { 0.5m, "EVT-SEED-3-6a1e5c9b0d4f43e8a7c2b5d9f1e0a3c4" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckInRadiusKm",
                table: "Events");

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 2,
                column: "QrCode",
                value: "EVT-2025-0002");

            migrationBuilder.UpdateData(
                table: "Events",
                keyColumn: "Id",
                keyValue: 3,
                column: "QrCode",
                value: "EVT-2025-0003");
        }
    }
}
