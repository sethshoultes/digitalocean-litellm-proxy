-- Migration 001: Create LiteLLM_VerificationToken table
-- This is the CRITICAL virtual keys table for LiteLLM compatibility
-- Date: 2024-12-19
-- Priority: P0 - Critical

-- Virtual Keys Table (CRITICAL for LiteLLM authentication)
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
    updated_by             TEXT,
    
    -- Constraints
    CONSTRAINT valid_token_format CHECK (token ~ '^sk-[A-Za-z0-9_-]+$'),
    CONSTRAINT valid_spend CHECK (spend >= 0.0),
    CONSTRAINT valid_max_budget CHECK (max_budget IS NULL OR max_budget >= 0.0),
    CONSTRAINT valid_max_parallel_requests CHECK (max_parallel_requests IS NULL OR max_parallel_requests > 0),
    CONSTRAINT valid_tpm_limit CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    CONSTRAINT valid_rpm_limit CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    CONSTRAINT valid_budget_duration CHECK (budget_duration IS NULL OR budget_duration IN ('1d', '7d', '30d', '1mo', '1y')),
    CONSTRAINT valid_budget_reset CHECK (budget_reset_at IS NULL OR budget_reset_at > created_at),
    CONSTRAINT valid_expires CHECK (expires IS NULL OR expires > created_at),
    
    -- Foreign keys (will be added after ensuring referenced tables exist)
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE CASCADE
);

-- Add updated_at trigger
CREATE TRIGGER update_verification_token_updated_at 
    BEFORE UPDATE ON "LiteLLM_VerificationToken" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_token_user_id ON "LiteLLM_VerificationToken"(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_team_id ON "LiteLLM_VerificationToken"(team_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_expires ON "LiteLLM_VerificationToken"(expires) WHERE expires IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_token_blocked ON "LiteLLM_VerificationToken"(blocked) WHERE blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_verification_token_created_at ON "LiteLLM_VerificationToken"(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_token_models ON "LiteLLM_VerificationToken" USING GIN(models);
CREATE INDEX IF NOT EXISTS idx_verification_token_config ON "LiteLLM_VerificationToken" USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_verification_token_metadata ON "LiteLLM_VerificationToken" USING GIN(metadata);

-- Add comment for documentation
COMMENT ON TABLE "LiteLLM_VerificationToken" IS 'Virtual API keys for LiteLLM proxy authentication and access control';
COMMENT ON COLUMN "LiteLLM_VerificationToken".token IS 'Virtual API key token (format: sk-xxxxx)';
COMMENT ON COLUMN "LiteLLM_VerificationToken".spend IS 'Current spend amount for this key';
COMMENT ON COLUMN "LiteLLM_VerificationToken".models IS 'Array of allowed models for this key';
COMMENT ON COLUMN "LiteLLM_VerificationToken".blocked IS 'Whether this key is blocked from use';
COMMENT ON COLUMN "LiteLLM_VerificationToken".max_budget IS 'Maximum budget limit for this key';
COMMENT ON COLUMN "LiteLLM_VerificationToken".tpm_limit IS 'Tokens per minute rate limit';
COMMENT ON COLUMN "LiteLLM_VerificationToken".rpm_limit IS 'Requests per minute rate limit';