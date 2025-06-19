-- Migration 004: Update LiteLLM_UserTable for full LiteLLM compatibility
-- Add all missing columns to match official LiteLLM schema
-- Date: 2024-12-19
-- Priority: P0 - Critical

-- Add missing columns to LiteLLM_UserTable for full compatibility
-- These columns are required by the official LiteLLM schema

-- Add user_alias column
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS user_alias TEXT;

-- Add sso_user_id for SSO integration
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS sso_user_id TEXT UNIQUE;

-- Add object_permission_id for advanced permissions
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS object_permission_id TEXT;

-- Add password column (keep our password_hash for backward compatibility)
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add teams array for team memberships
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS teams TEXT[] DEFAULT '{}';

-- Add models array for allowed models
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS models TEXT[] DEFAULT '{}';

-- Add metadata JSON field
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add rate limiting fields
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS max_parallel_requests INT;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS tpm_limit BIGINT;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS rpm_limit BIGINT;

-- Add budget management fields
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS budget_duration TEXT;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS budget_reset_at TIMESTAMPTZ;

-- Add cache control settings
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS allowed_cache_controls TEXT[] DEFAULT '{}';

-- Add per-model spend tracking
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS model_spend JSONB DEFAULT '{}';

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS model_max_budget JSONB DEFAULT '{}';

-- Add additional compatibility fields
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS default_model TEXT;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS default_max_tokens INT;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS ui_access BOOLEAN DEFAULT FALSE;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Add audit fields
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;

ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Add new constraints for the added columns
ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_max_parallel_requests 
CHECK (max_parallel_requests IS NULL OR max_parallel_requests > 0);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_tpm_limit 
CHECK (tpm_limit IS NULL OR tpm_limit > 0);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_rpm_limit 
CHECK (rpm_limit IS NULL OR rpm_limit > 0);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_budget_duration 
CHECK (budget_duration IS NULL OR budget_duration IN ('1h', '1d', '7d', '30d', '1mo', '3mo', '6mo', '1y', 'unlimited'));

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_budget_reset 
CHECK (budget_reset_at IS NULL OR budget_reset_at > created_at);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_metadata 
CHECK (jsonb_typeof(metadata) = 'object');

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_model_spend 
CHECK (jsonb_typeof(model_spend) = 'object');

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_model_max_budget 
CHECK (jsonb_typeof(model_max_budget) = 'object');

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_config 
CHECK (jsonb_typeof(config) = 'object');

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_default_max_tokens 
CHECK (default_max_tokens IS NULL OR default_max_tokens > 0);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_login_count 
CHECK (login_count >= 0);

ALTER TABLE "LiteLLM_UserTable" 
ADD CONSTRAINT IF NOT EXISTS valid_failed_login_attempts 
CHECK (failed_login_attempts >= 0);

-- Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_table_user_alias ON "LiteLLM_UserTable"(user_alias) WHERE user_alias IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_sso_user_id ON "LiteLLM_UserTable"(sso_user_id) WHERE sso_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_models ON "LiteLLM_UserTable" USING GIN(models);
CREATE INDEX IF NOT EXISTS idx_user_table_teams ON "LiteLLM_UserTable" USING GIN(teams);
CREATE INDEX IF NOT EXISTS idx_user_table_metadata ON "LiteLLM_UserTable" USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_user_table_model_spend ON "LiteLLM_UserTable" USING GIN(model_spend);
CREATE INDEX IF NOT EXISTS idx_user_table_config ON "LiteLLM_UserTable" USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_user_table_budget_reset_at ON "LiteLLM_UserTable"(budget_reset_at) WHERE budget_reset_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_last_login_at ON "LiteLLM_UserTable"(last_login_at) WHERE last_login_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_ui_access ON "LiteLLM_UserTable"(ui_access) WHERE ui_access = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_table_locked_until ON "LiteLLM_UserTable"(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_default_model ON "LiteLLM_UserTable"(default_model) WHERE default_model IS NOT NULL;

-- Migration data for existing users
-- Set default values for existing users to ensure compatibility

-- Set user_alias to email for existing users
UPDATE "LiteLLM_UserTable" 
SET user_alias = user_email 
WHERE user_alias IS NULL AND user_email IS NOT NULL;

-- Set default models for existing users
UPDATE "LiteLLM_UserTable" 
SET models = ARRAY['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet-20240229'] 
WHERE models = '{}' OR models IS NULL;

-- Set default metadata with migration info
UPDATE "LiteLLM_UserTable" 
SET metadata = jsonb_build_object(
    'migrated_from', 'custom_system',
    'migration_date', CURRENT_TIMESTAMP,
    'original_role', user_role
)
WHERE metadata = '{}' OR metadata IS NULL;

-- Set default budget duration
UPDATE "LiteLLM_UserTable" 
SET budget_duration = '30d' 
WHERE budget_duration IS NULL AND max_budget IS NOT NULL;

-- Set budget reset date for users with budgets
UPDATE "LiteLLM_UserTable" 
SET budget_reset_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE budget_reset_at IS NULL AND max_budget IS NOT NULL AND budget_duration = '30d';

-- Add comments for new columns
COMMENT ON COLUMN "LiteLLM_UserTable".user_alias IS 'User alias/display name';
COMMENT ON COLUMN "LiteLLM_UserTable".sso_user_id IS 'SSO provider user identifier';
COMMENT ON COLUMN "LiteLLM_UserTable".models IS 'Array of allowed models for this user';
COMMENT ON COLUMN "LiteLLM_UserTable".teams IS 'Array of team IDs this user belongs to';
COMMENT ON COLUMN "LiteLLM_UserTable".metadata IS 'Additional user metadata as JSON';
COMMENT ON COLUMN "LiteLLM_UserTable".tpm_limit IS 'Tokens per minute rate limit';
COMMENT ON COLUMN "LiteLLM_UserTable".rpm_limit IS 'Requests per minute rate limit';
COMMENT ON COLUMN "LiteLLM_UserTable".budget_duration IS 'Budget reset duration';
COMMENT ON COLUMN "LiteLLM_UserTable".model_spend IS 'Per-model spend tracking';
COMMENT ON COLUMN "LiteLLM_UserTable".model_max_budget IS 'Per-model budget limits';
COMMENT ON COLUMN "LiteLLM_UserTable".ui_access IS 'Whether user can access admin UI';