-- Migration 001: Add LiteLLM Virtual Keys and Spend Tracking Tables
-- This migration adds the core tables needed for LiteLLM compatibility
-- Date: 2024-12-19
-- Description: Phase 2 implementation of LiteLLM Full Compatibility

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LiteLLM_VerificationToken table (CRITICAL for Virtual Keys)
CREATE TABLE IF NOT EXISTS "LiteLLM_VerificationToken" (
    token                   TEXT PRIMARY KEY,
    key_name               TEXT,
    key_alias              TEXT,
    spend                  FLOAT DEFAULT 0.0,
    expires                TIMESTAMPTZ,
    models                 TEXT[] DEFAULT '{}',
    aliases                JSONB DEFAULT '{}',
    config                 JSONB DEFAULT '{}',
    user_id                TEXT,
    team_id                TEXT,
    permissions            JSONB DEFAULT '{}',
    max_parallel_requests  INT,
    metadata               JSONB DEFAULT '{}',
    blocked                BOOLEAN DEFAULT FALSE,
    tpm_limit              BIGINT,
    rpm_limit              BIGINT,
    max_budget             FLOAT,
    budget_duration        TEXT,
    budget_reset_at        TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by             TEXT,
    updated_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by             TEXT
);

-- 2. LiteLLM_SpendLogs table (CRITICAL for spend tracking)
CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs" (
    request_id              TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key                 TEXT,
    user_id                 TEXT,
    team_id                 TEXT,
    organization_id         TEXT,
    model                   TEXT,
    model_group             TEXT,
    api_base                TEXT,
    prompt_tokens           INT DEFAULT 0,
    completion_tokens       INT DEFAULT 0,
    total_tokens            INT DEFAULT 0,
    spend                   FLOAT DEFAULT 0.0,
    startTime               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    endTime                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completionStartTime     TIMESTAMPTZ,
    model_parameters_json   JSONB,
    spend_logs_metadata     JSONB,
    request_tags            JSONB DEFAULT '[]'
);

-- 3. LiteLLM_BudgetTable table (for budget management)
CREATE TABLE IF NOT EXISTS "LiteLLM_BudgetTable" (
    budget_id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_budget              FLOAT,
    soft_budget             FLOAT,
    max_parallel_requests   INT,
    tpm_limit               BIGINT,
    rpm_limit               BIGINT,
    model_max_budget        JSONB DEFAULT '{}',
    budget_duration         TEXT,
    budget_reset_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT
);

-- 4. Update LiteLLM_UserTable to add missing LiteLLM-compatible fields
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS user_alias TEXT,
ADD COLUMN IF NOT EXISTS sso_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS models TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_parallel_requests INT,
ADD COLUMN IF NOT EXISTS tpm_limit BIGINT,
ADD COLUMN IF NOT EXISTS rpm_limit BIGINT,
ADD COLUMN IF NOT EXISTS budget_duration TEXT,
ADD COLUMN IF NOT EXISTS budget_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS allowed_cache_controls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS model_spend JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS model_max_budget JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS teams TEXT[] DEFAULT '{}';

-- 5. Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_verification_token_updated_at 
    BEFORE UPDATE ON "LiteLLM_VerificationToken" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_BudgetTable" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_token_user_id ON "LiteLLM_VerificationToken"(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_team_id ON "LiteLLM_VerificationToken"(team_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_expires ON "LiteLLM_VerificationToken"(expires);
CREATE INDEX IF NOT EXISTS idx_verification_token_blocked ON "LiteLLM_VerificationToken"(blocked);

-- Create indexes for LiteLLM_SpendLogs
CREATE INDEX IF NOT EXISTS idx_spend_logs_api_key ON "LiteLLM_SpendLogs"(api_key);
CREATE INDEX IF NOT EXISTS idx_spend_logs_user_id ON "LiteLLM_SpendLogs"(user_id);
CREATE INDEX IF NOT EXISTS idx_spend_logs_start_time ON "LiteLLM_SpendLogs"(startTime);
CREATE INDEX IF NOT EXISTS idx_spend_logs_model ON "LiteLLM_SpendLogs"(model);

-- 7. Add a function to generate secure API keys
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
    RETURN 'sk-' || encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- 8. Create a view for active verification tokens (not expired, not blocked)
CREATE OR REPLACE VIEW active_verification_tokens AS
SELECT *
FROM "LiteLLM_VerificationToken"
WHERE (expires IS NULL OR expires > CURRENT_TIMESTAMP)
  AND (blocked IS FALSE OR blocked IS NULL);

-- Migration completed successfully
-- LiteLLM Virtual Keys schema has been created