using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteForConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Conversations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedById",
                table: "Conversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedByUserAt",
                table: "ConversationParticipants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeletedByUser",
                table: "ConversationParticipants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_DeletedById",
                table: "Conversations",
                column: "DeletedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Users_DeletedById",
                table: "Conversations",
                column: "DeletedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Users_DeletedById",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_DeletedById",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "DeletedByUserAt",
                table: "ConversationParticipants");

            migrationBuilder.DropColumn(
                name: "IsDeletedByUser",
                table: "ConversationParticipants");
        }
    }
}
