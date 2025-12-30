using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShortNameToChannel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShortName",
                table: "Channels",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShortName",
                table: "Channels");
        }
    }
}
