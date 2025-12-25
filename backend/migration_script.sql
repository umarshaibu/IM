CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "NominalRolls" (
        "Id" uuid NOT NULL,
        "ServiceNumber" character varying(50) NOT NULL,
        "FullName" character varying(255) NOT NULL,
        "PhoneNumber" character varying(20),
        "Department" character varying(100),
        "RankPosition" character varying(100),
        "Status" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_NominalRolls" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "NominalRollId" uuid NOT NULL,
        "PhoneNumber" character varying(20) NOT NULL,
        "DisplayName" character varying(100),
        "ProfilePictureUrl" text,
        "About" character varying(500),
        "LastSeen" timestamp with time zone,
        "IsOnline" boolean NOT NULL,
        "PublicKey" text,
        "PasswordHash" text NOT NULL,
        "RefreshToken" text,
        "RefreshTokenExpiryTime" timestamp with time zone,
        "ShowLastSeen" boolean NOT NULL,
        "ShowProfilePhoto" boolean NOT NULL,
        "ShowAbout" boolean NOT NULL,
        "ReadReceipts" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Users_NominalRolls_NominalRollId" FOREIGN KEY ("NominalRollId") REFERENCES "NominalRolls" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "BlockedUsers" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "BlockedUserId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_BlockedUsers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_BlockedUsers_Users_BlockedUserId" FOREIGN KEY ("BlockedUserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_BlockedUsers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Contacts" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "ContactUserId" uuid NOT NULL,
        "Nickname" text,
        "IsFavorite" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Contacts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Contacts_Users_ContactUserId" FOREIGN KEY ("ContactUserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Contacts_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Conversations" (
        "Id" uuid NOT NULL,
        "Type" integer NOT NULL,
        "Name" character varying(100),
        "Description" character varying(500),
        "IconUrl" text,
        "CreatedById" uuid,
        "DefaultMessageExpiry" integer NOT NULL,
        "IsArchived" boolean NOT NULL,
        "IsMuted" boolean NOT NULL,
        "MutedUntil" timestamp with time zone,
        "LastMessageAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Conversations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Conversations_Users_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Statuses" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "TextContent" text,
        "MediaUrl" text,
        "MediaType" text,
        "BackgroundColor" text,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "IsViewedByAll" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Statuses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Statuses_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "UserDevices" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "DeviceToken" text NOT NULL,
        "Platform" integer NOT NULL,
        "DeviceId" text,
        "DeviceName" text,
        "IsActive" boolean NOT NULL,
        "LastActiveAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_UserDevices" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UserDevices_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Calls" (
        "Id" uuid NOT NULL,
        "ConversationId" uuid NOT NULL,
        "InitiatorId" uuid NOT NULL,
        "Type" integer NOT NULL,
        "Status" integer NOT NULL,
        "StartedAt" timestamp with time zone NOT NULL,
        "EndedAt" timestamp with time zone,
        "Duration" integer,
        "RoomId" text,
        "RoomToken" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Calls" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Calls_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Calls_Users_InitiatorId" FOREIGN KEY ("InitiatorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "ConversationParticipants" (
        "Id" uuid NOT NULL,
        "ConversationId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Role" integer NOT NULL,
        "JoinedAt" timestamp with time zone NOT NULL,
        "LeftAt" timestamp with time zone,
        "IsActive" boolean NOT NULL,
        "LastReadAt" timestamp with time zone,
        "LastReadMessageId" uuid,
        "IsMuted" boolean NOT NULL,
        "MutedUntil" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_ConversationParticipants" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ConversationParticipants_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ConversationParticipants_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "Messages" (
        "Id" uuid NOT NULL,
        "ConversationId" uuid NOT NULL,
        "SenderId" uuid NOT NULL,
        "Type" integer NOT NULL,
        "Content" text,
        "MediaUrl" text,
        "MediaThumbnailUrl" text,
        "MediaMimeType" text,
        "MediaSize" bigint,
        "MediaDuration" integer,
        "ReplyToMessageId" uuid,
        "ForwardedFromMessageId" uuid,
        "IsForwarded" boolean NOT NULL,
        "IsEdited" boolean NOT NULL,
        "EditedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "ExpiryDuration" integer NOT NULL,
        "ExpiresAt" timestamp with time zone,
        "IsSystemMessage" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Messages" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Messages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Messages_Messages_ForwardedFromMessageId" FOREIGN KEY ("ForwardedFromMessageId") REFERENCES "Messages" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Messages_Messages_ReplyToMessageId" FOREIGN KEY ("ReplyToMessageId") REFERENCES "Messages" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Messages_Users_SenderId" FOREIGN KEY ("SenderId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "StatusViews" (
        "Id" uuid NOT NULL,
        "StatusId" uuid NOT NULL,
        "ViewerId" uuid NOT NULL,
        "ViewedAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_StatusViews" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StatusViews_Statuses_StatusId" FOREIGN KEY ("StatusId") REFERENCES "Statuses" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_StatusViews_Users_ViewerId" FOREIGN KEY ("ViewerId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "CallParticipants" (
        "Id" uuid NOT NULL,
        "CallId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "JoinedAt" timestamp with time zone,
        "LeftAt" timestamp with time zone,
        "Status" integer NOT NULL,
        "IsMuted" boolean NOT NULL,
        "IsVideoEnabled" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_CallParticipants" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CallParticipants_Calls_CallId" FOREIGN KEY ("CallId") REFERENCES "Calls" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_CallParticipants_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "MediaFiles" (
        "Id" uuid NOT NULL,
        "MessageId" uuid,
        "UploadedById" uuid NOT NULL,
        "FileName" text NOT NULL,
        "FileUrl" text NOT NULL,
        "ThumbnailUrl" text,
        "MimeType" text NOT NULL,
        "FileSize" bigint NOT NULL,
        "Width" integer,
        "Height" integer,
        "Duration" integer,
        "EncryptionKey" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_MediaFiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MediaFiles_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_MediaFiles_Users_UploadedById" FOREIGN KEY ("UploadedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE TABLE "MessageStatuses" (
        "Id" uuid NOT NULL,
        "MessageId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Status" integer NOT NULL,
        "DeliveredAt" timestamp with time zone,
        "ReadAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_MessageStatuses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MessageStatuses_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_MessageStatuses_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_BlockedUsers_BlockedUserId" ON "BlockedUsers" ("BlockedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_BlockedUsers_UserId_BlockedUserId" ON "BlockedUsers" ("UserId", "BlockedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_CallParticipants_CallId_UserId" ON "CallParticipants" ("CallId", "UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_CallParticipants_UserId" ON "CallParticipants" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Calls_ConversationId" ON "Calls" ("ConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Calls_InitiatorId" ON "Calls" ("InitiatorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Calls_RoomId" ON "Calls" ("RoomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Contacts_ContactUserId" ON "Contacts" ("ContactUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Contacts_UserId_ContactUserId" ON "Contacts" ("UserId", "ContactUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_ConversationParticipants_ConversationId_UserId" ON "ConversationParticipants" ("ConversationId", "UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_ConversationParticipants_UserId" ON "ConversationParticipants" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Conversations_CreatedById" ON "Conversations" ("CreatedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_MediaFiles_MessageId" ON "MediaFiles" ("MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_MediaFiles_UploadedById" ON "MediaFiles" ("UploadedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_ConversationId" ON "Messages" ("ConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_CreatedAt" ON "Messages" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_ExpiresAt" ON "Messages" ("ExpiresAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_ForwardedFromMessageId" ON "Messages" ("ForwardedFromMessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_ReplyToMessageId" ON "Messages" ("ReplyToMessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Messages_SenderId" ON "Messages" ("SenderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_MessageStatuses_MessageId_UserId" ON "MessageStatuses" ("MessageId", "UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_MessageStatuses_UserId" ON "MessageStatuses" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_NominalRolls_ServiceNumber" ON "NominalRolls" ("ServiceNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Statuses_ExpiresAt" ON "Statuses" ("ExpiresAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_Statuses_UserId" ON "Statuses" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_StatusViews_StatusId_ViewerId" ON "StatusViews" ("StatusId", "ViewerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_StatusViews_ViewerId" ON "StatusViews" ("ViewerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_UserDevices_DeviceToken" ON "UserDevices" ("DeviceToken");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE INDEX "IX_UserDevices_UserId" ON "UserDevices" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_NominalRollId" ON "Users" ("NominalRollId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_PhoneNumber" ON "Users" ("PhoneNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220102010_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251220102010_InitialCreate', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220163811_AddLoginToken') THEN
    CREATE TABLE "LoginTokens" (
        "Id" uuid NOT NULL,
        "NominalRollId" uuid NOT NULL,
        "Token" character varying(10) NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "IsUsed" boolean NOT NULL,
        "AttemptCount" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_LoginTokens" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LoginTokens_NominalRolls_NominalRollId" FOREIGN KEY ("NominalRollId") REFERENCES "NominalRolls" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220163811_AddLoginToken') THEN
    CREATE INDEX "IX_LoginTokens_NominalRollId" ON "LoginTokens" ("NominalRollId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220163811_AddLoginToken') THEN
    CREATE INDEX "IX_LoginTokens_Token" ON "LoginTokens" ("Token");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251220163811_AddLoginToken') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251220163811_AddLoginToken', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "UserDevices" ADD "IsVoipToken" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "ForwardCount" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "MediaOriginatorServiceNumber" character varying(50);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "OriginalCreatedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "OriginalMessageId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "OriginalSenderServiceNumber" character varying(50);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD "SenderServiceNumber" character varying(50);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE TABLE "DeletedMessages" (
        "Id" uuid NOT NULL,
        "OriginalMessageId" uuid NOT NULL,
        "ConversationId" uuid NOT NULL,
        "SenderId" uuid NOT NULL,
        "SenderServiceNumber" character varying(50) NOT NULL,
        "OriginalContent" text,
        "OriginalMediaUrl" text,
        "OriginalMediaThumbnailUrl" text,
        "OriginalMediaMimeType" text,
        "OriginalMediaSize" bigint,
        "OriginalMediaDuration" integer,
        "OriginalType" integer NOT NULL,
        "WasForwarded" boolean NOT NULL,
        "OriginalSenderServiceNumber" character varying(50),
        "MediaOriginatorServiceNumber" character varying(50),
        "DeletedById" uuid NOT NULL,
        "DeletedByServiceNumber" character varying(50) NOT NULL,
        "DeletedAt" timestamp with time zone NOT NULL,
        "DeleteType" integer NOT NULL,
        "DeletionReason" text,
        "OriginalCreatedAt" timestamp with time zone NOT NULL,
        "OriginalEditedAt" timestamp with time zone,
        "OriginalReplyToMessageId" uuid,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_DeletedMessages" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DeletedMessages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_DeletedMessages_Users_DeletedById" FOREIGN KEY ("DeletedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_DeletedMessages_Users_SenderId" FOREIGN KEY ("SenderId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE TABLE "MessageForwardChains" (
        "Id" uuid NOT NULL,
        "MessageId" uuid NOT NULL,
        "OriginalMessageId" uuid NOT NULL,
        "ForwarderId" uuid NOT NULL,
        "ForwarderServiceNumber" character varying(50) NOT NULL,
        "FromConversationId" uuid NOT NULL,
        "ToConversationId" uuid NOT NULL,
        "ForwardedAt" timestamp with time zone NOT NULL,
        "ForwardOrder" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_MessageForwardChains" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MessageForwardChains_Conversations_FromConversationId" FOREIGN KEY ("FromConversationId") REFERENCES "Conversations" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_MessageForwardChains_Conversations_ToConversationId" FOREIGN KEY ("ToConversationId") REFERENCES "Conversations" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_MessageForwardChains_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_MessageForwardChains_Messages_OriginalMessageId" FOREIGN KEY ("OriginalMessageId") REFERENCES "Messages" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_MessageForwardChains_Users_ForwarderId" FOREIGN KEY ("ForwarderId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE TABLE "MessageReactions" (
        "Id" uuid NOT NULL,
        "MessageId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Emoji" character varying(20) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_MessageReactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MessageReactions_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_MessageReactions_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE TABLE "PinnedMessages" (
        "Id" uuid NOT NULL,
        "ConversationId" uuid NOT NULL,
        "MessageId" uuid NOT NULL,
        "PinnedById" uuid NOT NULL,
        "PinnedAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PinnedMessages" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PinnedMessages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PinnedMessages_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PinnedMessages_Users_PinnedById" FOREIGN KEY ("PinnedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE TABLE "StarredMessages" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "MessageId" uuid NOT NULL,
        "StarredAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_StarredMessages" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StarredMessages_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_StarredMessages_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_Messages_OriginalMessageId" ON "Messages" ("OriginalMessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_DeletedMessages_ConversationId" ON "DeletedMessages" ("ConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_DeletedMessages_DeletedAt" ON "DeletedMessages" ("DeletedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_DeletedMessages_DeletedById" ON "DeletedMessages" ("DeletedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_DeletedMessages_OriginalMessageId" ON "DeletedMessages" ("OriginalMessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_DeletedMessages_SenderId" ON "DeletedMessages" ("SenderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageForwardChains_ForwarderId" ON "MessageForwardChains" ("ForwarderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageForwardChains_FromConversationId" ON "MessageForwardChains" ("FromConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageForwardChains_MessageId" ON "MessageForwardChains" ("MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageForwardChains_OriginalMessageId" ON "MessageForwardChains" ("OriginalMessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageForwardChains_ToConversationId" ON "MessageForwardChains" ("ToConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE UNIQUE INDEX "IX_MessageReactions_MessageId_UserId_Emoji" ON "MessageReactions" ("MessageId", "UserId", "Emoji");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_MessageReactions_UserId" ON "MessageReactions" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_PinnedMessages_ConversationId" ON "PinnedMessages" ("ConversationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE UNIQUE INDEX "IX_PinnedMessages_ConversationId_MessageId" ON "PinnedMessages" ("ConversationId", "MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_PinnedMessages_MessageId" ON "PinnedMessages" ("MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_PinnedMessages_PinnedById" ON "PinnedMessages" ("PinnedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_StarredMessages_MessageId" ON "StarredMessages" ("MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE INDEX "IX_StarredMessages_UserId" ON "StarredMessages" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    CREATE UNIQUE INDEX "IX_StarredMessages_UserId_MessageId" ON "StarredMessages" ("UserId", "MessageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    ALTER TABLE "Messages" ADD CONSTRAINT "FK_Messages_Messages_OriginalMessageId" FOREIGN KEY ("OriginalMessageId") REFERENCES "Messages" ("Id") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251224234906_AddIsVoipTokenToUserDevice') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251224234906_AddIsVoipTokenToUserDevice', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE TABLE "Channels" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Description" character varying(500),
        "IconUrl" text,
        "OwnerId" uuid NOT NULL,
        "IsPublic" boolean NOT NULL,
        "IsVerified" boolean NOT NULL,
        "FollowerCount" integer NOT NULL,
        "LastPostAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Channels" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Channels_Users_OwnerId" FOREIGN KEY ("OwnerId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE TABLE "ChannelFollowers" (
        "Id" uuid NOT NULL,
        "ChannelId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "IsMuted" boolean NOT NULL,
        "FollowedAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_ChannelFollowers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ChannelFollowers_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChannelFollowers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE TABLE "ChannelPosts" (
        "Id" uuid NOT NULL,
        "ChannelId" uuid NOT NULL,
        "AuthorId" uuid NOT NULL,
        "Content" text,
        "Type" integer NOT NULL,
        "MediaUrl" text,
        "MediaMimeType" text,
        "MediaSize" bigint,
        "MediaDuration" integer,
        "ThumbnailUrl" text,
        "ViewCount" integer NOT NULL,
        "ReactionCount" integer NOT NULL,
        "IsPinned" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_ChannelPosts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ChannelPosts_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChannelPosts_Users_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE TABLE "ChannelPostReactions" (
        "Id" uuid NOT NULL,
        "PostId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Emoji" character varying(20) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_ChannelPostReactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ChannelPostReactions_ChannelPosts_PostId" FOREIGN KEY ("PostId") REFERENCES "ChannelPosts" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChannelPostReactions_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE UNIQUE INDEX "IX_ChannelFollowers_ChannelId_UserId" ON "ChannelFollowers" ("ChannelId", "UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_ChannelFollowers_UserId" ON "ChannelFollowers" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE UNIQUE INDEX "IX_ChannelPostReactions_PostId_UserId_Emoji" ON "ChannelPostReactions" ("PostId", "UserId", "Emoji");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_ChannelPostReactions_UserId" ON "ChannelPostReactions" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_ChannelPosts_AuthorId" ON "ChannelPosts" ("AuthorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_ChannelPosts_ChannelId" ON "ChannelPosts" ("ChannelId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_ChannelPosts_CreatedAt" ON "ChannelPosts" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_Channels_Name" ON "Channels" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    CREATE INDEX "IX_Channels_OwnerId" ON "Channels" ("OwnerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251225001833_AddChannelsFeature') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251225001833_AddChannelsFeature', '8.0.0');
    END IF;
END $EF$;
COMMIT;

