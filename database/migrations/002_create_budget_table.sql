-- Migration 002: Create LiteLLM_BudgetTable
-- This is the CRITICAL budget management table for LiteLLM compatibility
-- Date: 2024-12-19
-- Priority: P0 - Critical

-- Budget Table (CRITICAL for budget management and rate limiting)
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
    updated_by              TEXT,
    
    -- Additional fields for enhanced budget management
    soft_budget_alert_sent  BOOLEAN DEFAULT FALSE,
    budget_name             TEXT,
    budget_description      TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    notification_settings   JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_max_budget CHECK (max_budget IS NULL OR max_budget >= 0.0),
    CONSTRAINT valid_soft_budget CHECK (soft_budget IS NULL OR soft_budget >= 0.0),
    CONSTRAINT valid_budget_relationship CHECK (
        max_budget IS NULL OR soft_budget IS NULL OR soft_budget <= max_budget
    ),
    CONSTRAINT valid_max_parallel_requests CHECK (max_parallel_requests IS NULL OR max_parallel_requests > 0),
    CONSTRAINT valid_tpm_limit CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    CONSTRAINT valid_rpm_limit CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    CONSTRAINT valid_budget_duration CHECK (
        budget_duration IS NULL OR 
        budget_duration IN ('1h', '1d', '7d', '30d', '1mo', '3mo', '6mo', '1y', 'unlimited')
    ),
    CONSTRAINT valid_budget_reset CHECK (budget_reset_at IS NULL OR budget_reset_at > created_at),
    CONSTRAINT valid_model_max_budget CHECK (jsonb_typeof(model_max_budget) = 'object')
);

-- Add updated_at trigger
CREATE TRIGGER update_budget_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_BudgetTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_table_created_by ON "LiteLLM_BudgetTable"(created_by);
CREATE INDEX IF NOT EXISTS idx_budget_table_created_at ON "LiteLLM_BudgetTable"(created_at);
CREATE INDEX IF NOT EXISTS idx_budget_table_is_active ON "LiteLLM_BudgetTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_budget_table_budget_reset_at ON "LiteLLM_BudgetTable"(budget_reset_at) WHERE budget_reset_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_table_max_budget ON "LiteLLM_BudgetTable"(max_budget) WHERE max_budget IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_table_model_max_budget ON "LiteLLM_BudgetTable" USING GIN(model_max_budget);

-- Add relationship tables for budget assignments

-- Budget assignments to verification tokens
CREATE TABLE IF NOT EXISTS "LiteLLM_TokenBudgets" (
    token                   TEXT NOT NULL,
    budget_id               TEXT NOT NULL,
    assigned_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_by             TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (token, budget_id),
    FOREIGN KEY (token) REFERENCES "LiteLLM_VerificationToken"(token) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id) ON DELETE CASCADE
);

-- Budget assignments to users (direct budget assignments)
CREATE TABLE IF NOT EXISTS "LiteLLM_UserBudgets" (
    user_id                 TEXT NOT NULL,
    budget_id               TEXT NOT NULL,
    assigned_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_by             TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (user_id, budget_id),
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id) ON DELETE CASCADE
);

-- Add indexes for budget assignment tables
CREATE INDEX IF NOT EXISTS idx_token_budgets_token ON "LiteLLM_TokenBudgets"(token);
CREATE INDEX IF NOT EXISTS idx_token_budgets_budget_id ON "LiteLLM_TokenBudgets"(budget_id);
CREATE INDEX IF NOT EXISTS idx_token_budgets_is_active ON "LiteLLM_TokenBudgets"(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON "LiteLLM_UserBudgets"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_budget_id ON "LiteLLM_UserBudgets"(budget_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_is_active ON "LiteLLM_UserBudgets"(is_active) WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_BudgetTable" IS 'Budget and rate limiting configuration for LiteLLM proxy';
COMMENT ON COLUMN "LiteLLM_BudgetTable".max_budget IS 'Maximum budget limit (hard limit)';
COMMENT ON COLUMN "LiteLLM_BudgetTable".soft_budget IS 'Soft budget limit for notifications';
COMMENT ON COLUMN "LiteLLM_BudgetTable".model_max_budget IS 'Per-model budget limits as JSON object';
COMMENT ON COLUMN "LiteLLM_BudgetTable".tpm_limit IS 'Tokens per minute rate limit';
COMMENT ON COLUMN "LiteLLM_BudgetTable".rpm_limit IS 'Requests per minute rate limit';
COMMENT ON COLUMN "LiteLLM_BudgetTable".budget_duration IS 'Budget reset duration (1d, 7d, 30d, etc.)';

COMMENT ON TABLE "LiteLLM_TokenBudgets" IS 'Associates verification tokens with budget configurations';
COMMENT ON TABLE "LiteLLM_UserBudgets" IS 'Associates users with budget configurations';