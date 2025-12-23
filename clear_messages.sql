-- Clear all messages and start fresh
-- This will remove all encrypted messages from the database

BEGIN TRANSACTION;

-- Delete all message statuses first (foreign key constraint)
DELETE FROM "MessageStatuses";

-- Delete all messages
DELETE FROM "Messages";

-- Reset conversation last message times
UPDATE "Conversations" SET "LastMessageAt" = NULL;

COMMIT;

-- Verify the cleanup
SELECT COUNT(*) as "RemainingMessages" FROM "Messages";
SELECT COUNT(*) as "RemainingStatuses" FROM "MessageStatuses";
