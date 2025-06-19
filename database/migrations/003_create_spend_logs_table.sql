-- Migration 003: Create LiteLLM_SpendLogs table with partitioning
-- This is the CRITICAL spend tracking table for LiteLLM compatibility
-- Date: 2024-12-19
-- Priority: P0 - Critical

-- Spend Logs Table (CRITICAL for spend tracking and analytics)
-- Partitioned by startTime for optimal performance with large datasets
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
    model_parameters_json   JSONB DEFAULT '{}',
    spend_logs_metadata     JSONB DEFAULT '{}',
    request_tags            JSONB DEFAULT '[]',
    
    -- Additional fields for enhanced tracking
    response_time_ms        INT,
    status_code             INT,
    error_message           TEXT,
    cache_hit               BOOLEAN DEFAULT FALSE,
    stream                  BOOLEAN DEFAULT FALSE,
    user_agent              TEXT,
    ip_address              INET,
    request_method          TEXT DEFAULT 'POST',
    endpoint                TEXT,
    
    -- Cost calculation fields
    input_cost_per_token    DECIMAL(12,8),
    output_cost_per_token   DECIMAL(12,8),
    input_cost              DECIMAL(12,8),
    output_cost             DECIMAL(12,8),
    
    -- Constraints
    CONSTRAINT valid_tokens CHECK (
        prompt_tokens >= 0 AND 
        completion_tokens >= 0 AND 
        total_tokens >= 0 AND
        total_tokens >= (prompt_tokens + completion_tokens)
    ),
    CONSTRAINT valid_spend CHECK (spend >= 0.0),
    CONSTRAINT valid_time_order CHECK (endTime >= startTime),
    CONSTRAINT valid_completion_time CHECK (
        completionStartTime IS NULL OR 
        (completionStartTime >= startTime AND completionStartTime <= endTime)
    ),
    CONSTRAINT valid_response_time CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    CONSTRAINT valid_status_code CHECK (status_code IS NULL OR (status_code >= 100 AND status_code <= 599)),
    CONSTRAINT valid_model_parameters CHECK (jsonb_typeof(model_parameters_json) = 'object'),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(spend_logs_metadata) = 'object'),
    CONSTRAINT valid_request_tags CHECK (jsonb_typeof(request_tags) = 'array'),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE SET NULL
    
) PARTITION BY RANGE (startTime);

-- Create monthly partitions for the current year and next year
-- Current month partition
CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2024m12" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- Next few months to avoid partition pruning issues
CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m01" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m02" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m03" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m04" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m05" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs_y2025m06" 
PARTITION OF "LiteLLM_SpendLogs" 
FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

-- Function to automatically create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_month TEXT;
    end_date DATE;
BEGIN
    start_month := to_char(start_date, 'YYYY-MM-DD');
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_month, end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions for future months
CREATE OR REPLACE FUNCTION ensure_spend_logs_partitions()
RETURNS VOID AS $$
DECLARE
    current_month DATE;
    i INT;
BEGIN
    current_month := date_trunc('month', CURRENT_DATE);
    
    -- Create partitions for next 6 months
    FOR i IN 0..5 LOOP
        PERFORM create_monthly_partition('LiteLLM_SpendLogs', current_month + (i || ' months')::INTERVAL);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance (on parent table, will be inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_spend_logs_api_key ON "LiteLLM_SpendLogs"(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_user_id ON "LiteLLM_SpendLogs"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_team_id ON "LiteLLM_SpendLogs"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_organization_id ON "LiteLLM_SpendLogs"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_model ON "LiteLLM_SpendLogs"(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_starttime ON "LiteLLM_SpendLogs"(startTime);
CREATE INDEX IF NOT EXISTS idx_spend_logs_spend ON "LiteLLM_SpendLogs"(spend) WHERE spend > 0;
CREATE INDEX IF NOT EXISTS idx_spend_logs_status_code ON "LiteLLM_SpendLogs"(status_code) WHERE status_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_request_tags ON "LiteLLM_SpendLogs" USING GIN(request_tags);
CREATE INDEX IF NOT EXISTS idx_spend_logs_model_parameters ON "LiteLLM_SpendLogs" USING GIN(model_parameters_json);
CREATE INDEX IF NOT EXISTS idx_spend_logs_metadata ON "LiteLLM_SpendLogs" USING GIN(spend_logs_metadata);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_spend_logs_user_model_time ON "LiteLLM_SpendLogs"(user_id, model, startTime) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_team_model_time ON "LiteLLM_SpendLogs"(team_id, model, startTime) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_api_key_time ON "LiteLLM_SpendLogs"(api_key, startTime) WHERE api_key IS NOT NULL;

-- Daily spend aggregation table for faster analytics
CREATE TABLE IF NOT EXISTS "LiteLLM_DailyTagSpend" (
    date                    DATE NOT NULL,
    user_id                 TEXT,
    team_id                 TEXT,
    organization_id         TEXT,
    model                   TEXT,
    api_key                 TEXT,
    request_tags            JSONB DEFAULT '[]',
    total_spend             FLOAT DEFAULT 0.0,
    total_requests          INT DEFAULT 0,
    total_tokens            BIGINT DEFAULT 0,
    prompt_tokens           BIGINT DEFAULT 0,
    completion_tokens       BIGINT DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (date, COALESCE(user_id, ''), COALESCE(team_id, ''), COALESCE(organization_id, ''), COALESCE(model, ''), COALESCE(api_key, '')),
    
    CONSTRAINT valid_daily_spend CHECK (total_spend >= 0.0),
    CONSTRAINT valid_daily_requests CHECK (total_requests >= 0),
    CONSTRAINT valid_daily_tokens CHECK (total_tokens >= 0 AND prompt_tokens >= 0 AND completion_tokens >= 0),
    
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE CASCADE
);

-- Add updated_at trigger for daily spend
CREATE TRIGGER update_daily_tag_spend_updated_at 
    BEFORE UPDATE ON "LiteLLM_DailyTagSpend" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for daily spend table
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_date ON "LiteLLM_DailyTagSpend"(date);
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_user_id ON "LiteLLM_DailyTagSpend"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_team_id ON "LiteLLM_DailyTagSpend"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_organization_id ON "LiteLLM_DailyTagSpend"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_model ON "LiteLLM_DailyTagSpend"(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_tag_spend_tags ON "LiteLLM_DailyTagSpend" USING GIN(request_tags);

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_SpendLogs" IS 'Detailed spend and usage logs for all LiteLLM proxy requests, partitioned by month';
COMMENT ON COLUMN "LiteLLM_SpendLogs".request_id IS 'Unique identifier for each request';
COMMENT ON COLUMN "LiteLLM_SpendLogs".spend IS 'Total cost of the request in USD';
COMMENT ON COLUMN "LiteLLM_SpendLogs".total_tokens IS 'Total tokens used (prompt + completion)';
COMMENT ON COLUMN "LiteLLM_SpendLogs".model_parameters_json IS 'Request parameters like temperature, max_tokens, etc.';
COMMENT ON COLUMN "LiteLLM_SpendLogs".request_tags IS 'Custom tags for request categorization';

COMMENT ON TABLE "LiteLLM_DailyTagSpend" IS 'Daily aggregated spend data for analytics and reporting';