using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsVoipTokenToUserDevice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVoipToken",
                table: "UserDevices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ForwardCount",
                table: "Messages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MediaOriginatorServiceNumber",
                table: "Messages",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OriginalCreatedAt",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OriginalMessageId",
                table: "Messages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OriginalSenderServiceNumber",
                table: "Messages",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderServiceNumber",
                table: "Messages",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeletedMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalMessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderServiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OriginalContent = table.Column<string>(type: "text", nullable: true),
                    OriginalMediaUrl = table.Column<string>(type: "text", nullable: true),
                    OriginalMediaThumbnailUrl = table.Column<string>(type: "text", nullable: true),
                    OriginalMediaMimeType = table.Column<string>(type: "text", nullable: true),
                    OriginalMediaSize = table.Column<long>(type: "bigint", nullable: true),
                    OriginalMediaDuration = table.Column<int>(type: "integer", nullable: true),
                    OriginalType = table.Column<int>(type: "integer", nullable: false),
                    WasForwarded = table.Column<bool>(type: "boolean", nullable: false),
                    OriginalSenderServiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    MediaOriginatorServiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DeletedById = table.Column<Guid>(type: "uuid", nullable: false),
                    DeletedByServiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeleteType = table.Column<int>(type: "integer", nullable: false),
                    DeletionReason = table.Column<string>(type: "text", nullable: true),
                    OriginalCreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OriginalEditedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OriginalReplyToMessageId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeletedMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeletedMessages_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeletedMessages_Users_DeletedById",
                        column: x => x.DeletedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeletedMessages_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MessageForwardChains",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalMessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForwarderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForwarderServiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FromConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForwardedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ForwardOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageForwardChains", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageForwardChains_Conversations_FromConversationId",
                        column: x => x.FromConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MessageForwardChains_Conversations_ToConversationId",
                        column: x => x.ToConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MessageForwardChains_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageForwardChains_Messages_OriginalMessageId",
                        column: x => x.OriginalMessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MessageForwardChains_Users_ForwarderId",
                        column: x => x.ForwarderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MessageReactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Emoji = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageReactions_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageReactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PinnedMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    PinnedById = table.Column<Guid>(type: "uuid", nullable: false),
                    PinnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PinnedMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PinnedMessages_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PinnedMessages_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PinnedMessages_Users_PinnedById",
                        column: x => x.PinnedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StarredMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    StarredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StarredMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StarredMessages_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StarredMessages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_OriginalMessageId",
                table: "Messages",
                column: "OriginalMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_DeletedMessages_ConversationId",
                table: "DeletedMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_DeletedMessages_DeletedAt",
                table: "DeletedMessages",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeletedMessages_DeletedById",
                table: "DeletedMessages",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_DeletedMessages_OriginalMessageId",
                table: "DeletedMessages",
                column: "OriginalMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_DeletedMessages_SenderId",
                table: "DeletedMessages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageForwardChains_ForwarderId",
                table: "MessageForwardChains",
                column: "ForwarderId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageForwardChains_FromConversationId",
                table: "MessageForwardChains",
                column: "FromConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageForwardChains_MessageId",
                table: "MessageForwardChains",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageForwardChains_OriginalMessageId",
                table: "MessageForwardChains",
                column: "OriginalMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageForwardChains_ToConversationId",
                table: "MessageForwardChains",
                column: "ToConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId_UserId_Emoji",
                table: "MessageReactions",
                columns: new[] { "MessageId", "UserId", "Emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_UserId",
                table: "MessageReactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PinnedMessages_ConversationId",
                table: "PinnedMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_PinnedMessages_ConversationId_MessageId",
                table: "PinnedMessages",
                columns: new[] { "ConversationId", "MessageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PinnedMessages_MessageId",
                table: "PinnedMessages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_PinnedMessages_PinnedById",
                table: "PinnedMessages",
                column: "PinnedById");

            migrationBuilder.CreateIndex(
                name: "IX_StarredMessages_MessageId",
                table: "StarredMessages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_StarredMessages_UserId",
                table: "StarredMessages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StarredMessages_UserId_MessageId",
                table: "StarredMessages",
                columns: new[] { "UserId", "MessageId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Messages_OriginalMessageId",
                table: "Messages",
                column: "OriginalMessageId",
                principalTable: "Messages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Messages_OriginalMessageId",
                table: "Messages");

            migrationBuilder.DropTable(
                name: "DeletedMessages");

            migrationBuilder.DropTable(
                name: "MessageForwardChains");

            migrationBuilder.DropTable(
                name: "MessageReactions");

            migrationBuilder.DropTable(
                name: "PinnedMessages");

            migrationBuilder.DropTable(
                name: "StarredMessages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_OriginalMessageId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "IsVoipToken",
                table: "UserDevices");

            migrationBuilder.DropColumn(
                name: "ForwardCount",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "MediaOriginatorServiceNumber",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "OriginalCreatedAt",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "OriginalMessageId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "OriginalSenderServiceNumber",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "SenderServiceNumber",
                table: "Messages");
        }
    }
}
