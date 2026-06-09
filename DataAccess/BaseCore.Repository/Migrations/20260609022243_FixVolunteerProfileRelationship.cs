using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class FixVolunteerProfileRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VolunteerProfiles_Users_UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.DropIndex(
                name: "IX_VolunteerProfiles_UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "VolunteerProfiles");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "PBKDF2$100000$8hP2RzUyDTMYGn2FmkWeIA==$ycAiMjTAGJhWAONR9arGMBXWq7tMCB8+Snzl9EJ6qFg=", null });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "PBKDF2$100000$rg4u+pTW60P+UVFy/ytv0Q==$o5lLZgxJL8tdgoiB+XNAMmDhrcxtUz1K1AkeNIb6/yg=", null });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "PBKDF2$100000$dgAuZflTIBU/Z4RMdIZoZw==$fzIpC39ToJFo5Nqs4RWeiiEnDl+hd2z1u86SCJg7oP4=", null });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "PBKDF2$100000$ctfTkMGGrWOS/DImNjzzBA==$J43F5C0unDIbHdxyzWFENQGeb1XdwLNSgfSbagBlCGA=", null });

            migrationBuilder.UpdateData(
                table: "VolunteerProfiles",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 6, 9, 2, 22, 41, 789, DateTimeKind.Utc).AddTicks(5948));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId1",
                table: "VolunteerProfiles",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "OFrMzZA23/L+t9awaL27ipv1+5s6PGPIS5EV7/aJO2E=", new byte[] { 120, 8, 176, 127, 89, 181, 227, 27, 90, 188, 243, 26, 125, 173, 154, 156 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "lF5perLzkWzxV9EMfJSHtRNcwxMXabNtUJgZm2M6lnQ=", new byte[] { 58, 34, 153, 111, 0, 143, 116, 1, 232, 193, 45, 121, 201, 7, 162, 24 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "sHZuTXhqDKnIQEPxOA7P7dKH+4MzFUN/d1Vu9WphRZk=", new byte[] { 88, 137, 43, 39, 44, 169, 150, 8, 184, 242, 30, 239, 47, 220, 116, 11 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "5QlPWdlYiXJY7DyVkXMYW3r4rzAGOGP+LljErQueGcY=", new byte[] { 244, 33, 47, 59, 159, 253, 173, 49, 188, 35, 70, 197, 60, 118, 28, 219 } });

            migrationBuilder.UpdateData(
                table: "VolunteerProfiles",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UserId1" },
                values: new object[] { new DateTime(2026, 6, 6, 17, 48, 44, 646, DateTimeKind.Utc).AddTicks(2473), null });

            migrationBuilder.CreateIndex(
                name: "IX_VolunteerProfiles_UserId1",
                table: "VolunteerProfiles",
                column: "UserId1",
                unique: true,
                filter: "[UserId1] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_VolunteerProfiles_Users_UserId1",
                table: "VolunteerProfiles",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
