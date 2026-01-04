using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailToUserAndNominalRoll : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "NominalRolls",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "NominalRolls");
        }
    }
}
