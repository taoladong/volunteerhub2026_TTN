using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuthRefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthRefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuthRefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_AuthRefreshTokens_TokenHash",
                table: "AuthRefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthRefreshTokens_UserId",
                table: "AuthRefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuthRefreshTokens");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "fwI4kYqIJ4/AFtsKdWuZMybtCNVVYxDSRTDEikYI2v0=", new byte[] { 211, 155, 230, 54, 35, 69, 84, 5, 90, 230, 135, 11, 209, 99, 0, 113 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "hKpGyjRmqvK378XuaGT+90KZzmcHS5w4PUsXM6/9qKk=", new byte[] { 204, 9, 135, 210, 19, 44, 13, 82, 128, 241, 50, 20, 5, 253, 219, 94 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "Ro4ekhCkSNPlmfL/xnKpsmU6ZucbKSeqhlk6B6h/pOI=", new byte[] { 128, 125, 136, 67, 82, 251, 134, 134, 48, 29, 61, 154, 174, 194, 22, 136 } });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Password", "Salt" },
                values: new object[] { "62AJw2pJ6oV+STZ4mOpSJmI7u4XqAhXx+35AGFT+RD8=", new byte[] { 199, 166, 221, 53, 221, 73, 232, 178, 183, 247, 182, 120, 222, 131, 174, 87 } });
        }
    }
}
