-- IM Database Initialization Script
-- This script runs automatically when the PostgreSQL container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON DATABASE im_db TO im_user;

-- Note: The actual tables will be created by Entity Framework Core migrations
-- Run the following command after starting the containers:
-- dotnet ef database update --project IM.Infrastructure --startup-project IM.API

-- Optional: Create some sample nominal roll entries for testing
-- INSERT INTO "NominalRolls" ("Id", "ServiceNumber", "FullName", "PhoneNumber", "Department", "RankPosition", "Status", "CreatedAt", "UpdatedAt")
-- VALUES
--   (uuid_generate_v4(), 'SN001', 'John Doe', '+1234567890', 'IT', 'Senior Developer', 0, NOW(), NOW()),
--   (uuid_generate_v4(), 'SN002', 'Jane Smith', '+1234567891', 'HR', 'Manager', 0, NOW(), NOW()),
--   (uuid_generate_v4(), 'SN003', 'Bob Johnson', '+1234567892', 'Operations', 'Team Lead', 0, NOW(), NOW());
