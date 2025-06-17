-- Integration with existing LiteLLM tables
-- This file contains the necessary extensions to existing LiteLLM tables

-- Note: These are the actual LiteLLM table names and structures
-- We extend them minimally to support connection management

-- Extend LiteLLM_UserTable with connection preferences
-- (This would be done via Prisma migration in actual LiteLLM)
/*
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS "connection_preferences" JSON DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "default_connection_id" TEXT,
ADD COLUMN IF NOT EXISTS "last_connection_activity" TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for default connection (deferred)
ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS fk_user_default_connection 
FOREIGN KEY ("default_connection_id") 
REFERENCES "LiteLLM_UserConnections"("connection_id") 
ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
*/

-- Extend LiteLLM_VerificationToken with connection-specific permissions
-- (This would be done via Prisma migration in actual LiteLLM)
/*
ALTER TABLE "LiteLLM_VerificationToken" 
ADD COLUMN IF NOT EXISTS "connection_id" TEXT,
ADD COLUMN IF NOT EXISTS "connection_permissions" JSON DEFAULT '{}';

-- Add foreign key constraint
ALTER TABLE "LiteLLM_VerificationToken" 
ADD CONSTRAINT IF NOT EXISTS fk_verification_token_connection 
FOREIGN KEY ("connection_id") 
REFERENCES "LiteLLM_UserConnections"("connection_id") 
ON DELETE SET NULL;
*/

-- Extend LiteLLM_SpendLogs with connection tracking
-- (This would be done via Prisma migration in actual LiteLLM)
/*
ALTER TABLE "LiteLLM_SpendLogs" 
ADD COLUMN IF NOT EXISTS "connection_id" TEXT,
ADD COLUMN IF NOT EXISTS "connection_metadata" JSON DEFAULT '{}';

-- Add foreign key constraint
ALTER TABLE "LiteLLM_SpendLogs" 
ADD CONSTRAINT IF NOT EXISTS fk_spend_logs_connection 
FOREIGN KEY ("connection_id") 
REFERENCES "LiteLLM_UserConnections"("connection_id") 
ON DELETE SET NULL;
*/

-- Add foreign key constraints for our new tables to existing LiteLLM tables
-- These reference the actual LiteLLM table structure

-- UserConnections references LiteLLM_UserTable
DO $$
BEGIN
    -- Check if LiteLLM_UserTable exists before adding foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        -- Add foreign key constraint
        ALTER TABLE "LiteLLM_UserConnections" 
        ADD CONSTRAINT fk_user_connections_user_id 
        FOREIGN KEY ("user_id") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE CASCADE;
        
        -- Add constraints for created_by and updated_by
        ALTER TABLE "LiteLLM_UserConnections" 
        ADD CONSTRAINT fk_user_connections_created_by 
        FOREIGN KEY ("created_by") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE SET NULL;
        
        ALTER TABLE "LiteLLM_UserConnections" 
        ADD CONSTRAINT fk_user_connections_updated_by 
        FOREIGN KEY ("updated_by") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- AccessPolicies references LiteLLM_UserTable for created_by
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        ALTER TABLE "LiteLLM_AccessPolicies" 
        ADD CONSTRAINT fk_access_policies_created_by 
        FOREIGN KEY ("created_by") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- UserAccessPolicies references LiteLLM_UserTable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        ALTER TABLE "LiteLLM_UserAccessPolicies" 
        ADD CONSTRAINT fk_user_access_policies_user_id 
        FOREIGN KEY ("user_id") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE CASCADE;
        
        ALTER TABLE "LiteLLM_UserAccessPolicies" 
        ADD CONSTRAINT fk_user_access_policies_granted_by 
        FOREIGN KEY ("granted_by") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ConnectionActivity references LiteLLM_UserTable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        ALTER TABLE "LiteLLM_ConnectionActivity" 
        ADD CONSTRAINT fk_connection_activity_user_id 
        FOREIGN KEY ("user_id") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ConnectionActivity can optionally reference LiteLLM_VerificationToken
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_VerificationToken') THEN
        ALTER TABLE "LiteLLM_ConnectionActivity" 
        ADD CONSTRAINT fk_connection_activity_api_key 
        FOREIGN KEY ("api_key") 
        REFERENCES "LiteLLM_VerificationToken"("token") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- SharedConnections references LiteLLM_UserTable for shared_by
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        ALTER TABLE "LiteLLM_SharedConnections" 
        ADD CONSTRAINT fk_shared_connections_shared_by 
        FOREIGN KEY ("shared_by") 
        REFERENCES "LiteLLM_UserTable"("user_id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- SharedConnections can reference teams and organizations if those tables exist
DO $$
BEGIN
    -- Add constraint for team sharing if team table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_TeamTable') THEN
        ALTER TABLE "LiteLLM_SharedConnections" 
        ADD CONSTRAINT fk_shared_connections_team 
        FOREIGN KEY ("shared_with_id") 
        REFERENCES "LiteLLM_TeamTable"("team_id") 
        ON DELETE CASCADE
        NOT VALID; -- Don't validate existing data
    END IF;
    
    -- Add constraint for organization sharing if organization table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_OrganizationTable') THEN
        ALTER TABLE "LiteLLM_SharedConnections" 
        ADD CONSTRAINT fk_shared_connections_organization 
        FOREIGN KEY ("shared_with_id") 
        REFERENCES "LiteLLM_OrganizationTable"("organization_id") 
        ON DELETE CASCADE
        NOT VALID; -- Don't validate existing data
    END IF;
END $$;

-- Create views that join with existing LiteLLM data
CREATE OR REPLACE VIEW v_user_connections_with_details AS
SELECT 
    uc.*,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') 
        THEN (SELECT u.user_email FROM "LiteLLM_UserTable" u WHERE u.user_id = uc.user_id)
        ELSE NULL
    END as user_email,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') 
        THEN (SELECT u.user_role FROM "LiteLLM_UserTable" u WHERE u.user_id = uc.user_id)
        ELSE NULL
    END as user_role
FROM "LiteLLM_UserConnections" uc;

-- Create function to sync connection spend with user spend
CREATE OR REPLACE FUNCTION sync_connection_spend()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user spend when connection spend changes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_UserTable') THEN
        UPDATE "LiteLLM_UserTable" 
        SET spend = spend + (NEW.spend - COALESCE(OLD.spend, 0))
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for spend synchronization
CREATE TRIGGER trigger_sync_connection_spend
    AFTER UPDATE OF spend ON "LiteLLM_UserConnections"
    FOR EACH ROW
    WHEN (NEW.spend IS DISTINCT FROM OLD.spend)
    EXECUTE FUNCTION sync_connection_spend();