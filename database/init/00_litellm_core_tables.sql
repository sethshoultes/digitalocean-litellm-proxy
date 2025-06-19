-- Create basic LiteLLM core tables for standalone development
-- In production, these would already exist in the LiteLLM deployment

-- User table (core LiteLLM table)
CREATE TABLE IF NOT EXISTS "LiteLLM_UserTable" (
    "user_id" TEXT PRIMARY KEY DEFAULT ('user_' || gen_random_uuid()::text),
    "user_email" TEXT UNIQUE NOT NULL,
    "user_role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "password_hash" TEXT NOT NULL,
    "team_id" TEXT,
    "organization_id" TEXT,
    "is_active" BOOLEAN DEFAULT TRUE,
    "spend" FLOAT DEFAULT 0.0,
    "max_budget" FLOAT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (user_role IN ('PROXY_ADMIN', 'ORG_ADMIN', 'TEAM_ADMIN', 'CUSTOMER')),
    CONSTRAINT valid_spend CHECK (spend >= 0)
);

-- Team table (basic structure for demo)
CREATE TABLE IF NOT EXISTS "LiteLLM_TeamTable" (
    "team_id" TEXT PRIMARY KEY DEFAULT ('team_' || gen_random_uuid()::text),
    "team_name" TEXT NOT NULL,
    "organization_id" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization table (basic structure for demo)
CREATE TABLE IF NOT EXISTS "LiteLLM_OrganizationTable" (
    "organization_id" TEXT PRIMARY KEY DEFAULT ('org_' || gen_random_uuid()::text),
    "organization_name" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT fk_user_team 
FOREIGN KEY ("team_id") REFERENCES "LiteLLM_TeamTable"("team_id") ON DELETE SET NULL;

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT fk_user_organization 
FOREIGN KEY ("organization_id") REFERENCES "LiteLLM_OrganizationTable"("organization_id") ON DELETE SET NULL;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_litellm_user_updated_at 
    BEFORE UPDATE ON "LiteLLM_UserTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_litellm_team_updated_at 
    BEFORE UPDATE ON "LiteLLM_TeamTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_litellm_organization_updated_at 
    BEFORE UPDATE ON "LiteLLM_OrganizationTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();