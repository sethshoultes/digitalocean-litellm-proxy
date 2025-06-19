-- Migration 008: Create Advanced Features tables
-- LiteLLM_GuardrailsTable, LiteLLM_Config, LiteLLM_CronJob, LiteLLM_MCPServerTable, etc.
-- Date: 2024-12-19
-- Priority: P2 - Medium

-- Guardrails Table - Content filtering and safety guardrails
CREATE TABLE IF NOT EXISTS "LiteLLM_GuardrailsTable" (
    guardrail_id            TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    guardrail_name          TEXT UNIQUE NOT NULL,
    guardrail_type          TEXT NOT NULL,
    is_active               BOOLEAN DEFAULT TRUE,
    configuration           JSONB NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Guardrail specifics
    provider                TEXT,
    model_scope             TEXT[] DEFAULT '{}',  -- specific models this applies to
    user_scope              TEXT[] DEFAULT '{}',  -- specific users this applies to
    team_scope              TEXT[] DEFAULT '{}',  -- specific teams this applies to
    organization_scope      TEXT[] DEFAULT '{}',  -- specific organizations this applies to
    priority                INT DEFAULT 0,
    failure_action          TEXT DEFAULT 'block',  -- block, warn, log
    
    -- Filtering configuration
    input_filters           JSONB DEFAULT '{}',
    output_filters          JSONB DEFAULT '{}',
    keywords_blocked        TEXT[] DEFAULT '{}',
    keywords_flagged        TEXT[] DEFAULT '{}',
    regex_patterns          TEXT[] DEFAULT '{}',
    
    -- Monitoring and metrics
    total_requests          BIGINT DEFAULT 0,
    blocked_requests        BIGINT DEFAULT 0,
    flagged_requests        BIGINT DEFAULT 0,
    last_triggered_at       TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_guardrail_name CHECK (LENGTH(guardrail_name) >= 1),
    CONSTRAINT valid_guardrail_type CHECK (
        guardrail_type IN ('content_filter', 'pii_detection', 'toxicity_filter', 'prompt_injection', 'custom', 'rate_limit', 'budget_limit')
    ),
    CONSTRAINT valid_configuration CHECK (jsonb_typeof(configuration) = 'object'),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT valid_failure_action CHECK (failure_action IN ('block', 'warn', 'log', 'modify')),
    CONSTRAINT valid_counters CHECK (
        total_requests >= 0 AND blocked_requests >= 0 AND flagged_requests >= 0 AND
        blocked_requests <= total_requests AND flagged_requests <= total_requests
    ),
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- Configuration Table - System configuration and feature flags
CREATE TABLE IF NOT EXISTS "LiteLLM_Config" (
    config_id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key              TEXT UNIQUE NOT NULL,
    config_value            JSONB NOT NULL,
    config_type             TEXT NOT NULL,
    description             TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    is_system_config        BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Configuration metadata
    category                TEXT,
    subcategory             TEXT,
    environment             TEXT DEFAULT 'production',
    requires_restart        BOOLEAN DEFAULT FALSE,
    is_sensitive            BOOLEAN DEFAULT FALSE,
    validation_schema       JSONB,
    default_value           JSONB,
    
    -- Version control
    version                 INT DEFAULT 1,
    previous_value          JSONB,
    change_reason           TEXT,
    
    -- Constraints
    CONSTRAINT valid_config_key CHECK (LENGTH(config_key) >= 1),
    CONSTRAINT valid_config_value CHECK (jsonb_typeof(config_value) IN ('object', 'array', 'string', 'number', 'boolean')),
    CONSTRAINT valid_config_type CHECK (
        config_type IN ('string', 'number', 'boolean', 'object', 'array', 'json', 'feature_flag', 'secret')
    ),
    CONSTRAINT valid_environment CHECK (environment IN ('development', 'staging', 'production', 'test')),
    CONSTRAINT valid_version CHECK (version >= 1),
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- Cron Job Table - Scheduled tasks and maintenance jobs
CREATE TABLE IF NOT EXISTS "LiteLLM_CronJob" (
    job_id                  TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name                TEXT UNIQUE NOT NULL,
    job_type                TEXT NOT NULL,
    cron_expression         TEXT NOT NULL,
    is_active               BOOLEAN DEFAULT TRUE,
    job_config              JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Execution tracking
    last_run_at             TIMESTAMPTZ,
    next_run_at             TIMESTAMPTZ,
    last_run_status         TEXT,
    last_run_duration_ms    INT,
    last_run_output         TEXT,
    last_run_error          TEXT,
    
    -- Job statistics
    total_runs              BIGINT DEFAULT 0,
    successful_runs         BIGINT DEFAULT 0,
    failed_runs             BIGINT DEFAULT 0,
    average_duration_ms     INT,
    
    -- Job configuration
    timeout_seconds         INT DEFAULT 300,
    max_retries             INT DEFAULT 3,
    retry_delay_seconds     INT DEFAULT 60,
    notification_on_failure BOOLEAN DEFAULT TRUE,
    notification_recipients TEXT[] DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_job_name CHECK (LENGTH(job_name) >= 1),
    CONSTRAINT valid_job_type CHECK (
        job_type IN ('cleanup', 'aggregation', 'backup', 'maintenance', 'notification', 'health_check', 'report_generation', 'custom')
    ),
    CONSTRAINT valid_cron_expression CHECK (LENGTH(cron_expression) >= 9),  -- Basic cron format check
    CONSTRAINT valid_job_config CHECK (jsonb_typeof(job_config) = 'object'),
    CONSTRAINT valid_run_status CHECK (
        last_run_status IS NULL OR last_run_status IN ('success', 'failed', 'timeout', 'cancelled', 'running')
    ),
    CONSTRAINT valid_duration CHECK (last_run_duration_ms IS NULL OR last_run_duration_ms >= 0),
    CONSTRAINT valid_counters CHECK (
        total_runs >= 0 AND successful_runs >= 0 AND failed_runs >= 0 AND
        successful_runs <= total_runs AND failed_runs <= total_runs
    ),
    CONSTRAINT valid_timeout CHECK (timeout_seconds > 0),
    CONSTRAINT valid_retries CHECK (max_retries >= 0),
    CONSTRAINT valid_retry_delay CHECK (retry_delay_seconds >= 0),
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- MCP Server Table - Model Context Protocol server configurations
CREATE TABLE IF NOT EXISTS "LiteLLM_MCPServerTable" (
    server_id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_name             TEXT UNIQUE NOT NULL,
    server_url              TEXT NOT NULL,
    server_type             TEXT NOT NULL,
    is_active               BOOLEAN DEFAULT TRUE,
    configuration           JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Server connection details
    authentication_type     TEXT DEFAULT 'none',
    authentication_config   JSONB DEFAULT '{}',
    connection_timeout      INT DEFAULT 30,
    read_timeout           INT DEFAULT 60,
    max_retries            INT DEFAULT 3,
    
    -- Health monitoring
    last_health_check       TIMESTAMPTZ,
    health_status           TEXT DEFAULT 'unknown',
    health_check_interval   INT DEFAULT 300,  -- seconds
    consecutive_failures    INT DEFAULT 0,
    max_consecutive_failures INT DEFAULT 5,
    
    -- Usage statistics
    total_requests          BIGINT DEFAULT 0,
    successful_requests     BIGINT DEFAULT 0,
    failed_requests         BIGINT DEFAULT 0,
    average_response_time_ms INT,
    
    -- Capabilities
    supported_methods       TEXT[] DEFAULT '{}',
    supported_formats       TEXT[] DEFAULT '{}',
    version                 TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_server_name CHECK (LENGTH(server_name) >= 1),
    CONSTRAINT valid_server_url CHECK (server_url ~ '^https?://'),
    CONSTRAINT valid_server_type CHECK (
        server_type IN ('context_provider', 'tool_provider', 'data_source', 'search_provider', 'custom')
    ),
    CONSTRAINT valid_configuration CHECK (jsonb_typeof(configuration) = 'object'),
    CONSTRAINT valid_auth_type CHECK (
        authentication_type IN ('none', 'api_key', 'oauth', 'basic_auth', 'bearer_token', 'custom')
    ),
    CONSTRAINT valid_auth_config CHECK (jsonb_typeof(authentication_config) = 'object'),
    CONSTRAINT valid_timeouts CHECK (connection_timeout > 0 AND read_timeout > 0),
    CONSTRAINT valid_retries CHECK (max_retries >= 0),
    CONSTRAINT valid_health_status CHECK (
        health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown', 'disabled')
    ),
    CONSTRAINT valid_health_interval CHECK (health_check_interval > 0),
    CONSTRAINT valid_consecutive_failures CHECK (consecutive_failures >= 0 AND max_consecutive_failures > 0),
    CONSTRAINT valid_request_counters CHECK (
        total_requests >= 0 AND successful_requests >= 0 AND failed_requests >= 0 AND
        successful_requests <= total_requests AND failed_requests <= total_requests
    ),
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- Object Permission Table - Fine-grained permissions system
CREATE TABLE IF NOT EXISTS "LiteLLM_ObjectPermissionTable" (
    permission_id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_type             TEXT NOT NULL,
    object_id               TEXT NOT NULL,
    user_id                 TEXT,
    team_id                 TEXT,
    organization_id         TEXT,
    permission_type         TEXT NOT NULL,
    granted_by              TEXT NOT NULL,
    granted_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at              TIMESTAMPTZ,
    is_active               BOOLEAN DEFAULT TRUE,
    
    -- Permission details
    permissions             JSONB NOT NULL,
    conditions              JSONB DEFAULT '{}',
    inheritance_source      TEXT,  -- where this permission was inherited from
    is_inherited            BOOLEAN DEFAULT FALSE,
    can_delegate            BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_object_type CHECK (
        object_type IN ('model', 'key', 'user', 'team', 'organization', 'budget', 'config', 'custom')
    ),
    CONSTRAINT valid_permission_type CHECK (
        permission_type IN ('read', 'write', 'delete', 'admin', 'use', 'manage', 'custom')
    ),
    CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT valid_conditions CHECK (jsonb_typeof(conditions) = 'object'),
    CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > granted_at),
    CONSTRAINT permission_target_check CHECK (
        (user_id IS NOT NULL AND team_id IS NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND team_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND team_id IS NULL AND organization_id IS NOT NULL)
    ),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE
);

-- Add updated_at triggers
CREATE TRIGGER update_guardrails_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_GuardrailsTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at 
    BEFORE UPDATE ON "LiteLLM_Config" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cron_job_updated_at 
    BEFORE UPDATE ON "LiteLLM_CronJob" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_server_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_MCPServerTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance

-- Guardrails Table indexes
CREATE INDEX IF NOT EXISTS idx_guardrails_guardrail_name ON "LiteLLM_GuardrailsTable"(guardrail_name);
CREATE INDEX IF NOT EXISTS idx_guardrails_guardrail_type ON "LiteLLM_GuardrailsTable"(guardrail_type);
CREATE INDEX IF NOT EXISTS idx_guardrails_is_active ON "LiteLLM_GuardrailsTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_guardrails_provider ON "LiteLLM_GuardrailsTable"(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardrails_priority ON "LiteLLM_GuardrailsTable"(priority DESC);
CREATE INDEX IF NOT EXISTS idx_guardrails_model_scope ON "LiteLLM_GuardrailsTable" USING GIN(model_scope);
CREATE INDEX IF NOT EXISTS idx_guardrails_user_scope ON "LiteLLM_GuardrailsTable" USING GIN(user_scope);
CREATE INDEX IF NOT EXISTS idx_guardrails_configuration ON "LiteLLM_GuardrailsTable" USING GIN(configuration);

-- Config Table indexes
CREATE INDEX IF NOT EXISTS idx_config_config_key ON "LiteLLM_Config"(config_key);
CREATE INDEX IF NOT EXISTS idx_config_config_type ON "LiteLLM_Config"(config_type);
CREATE INDEX IF NOT EXISTS idx_config_is_active ON "LiteLLM_Config"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_config_category ON "LiteLLM_Config"(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_config_environment ON "LiteLLM_Config"(environment);
CREATE INDEX IF NOT EXISTS idx_config_is_system ON "LiteLLM_Config"(is_system_config) WHERE is_system_config = TRUE;
CREATE INDEX IF NOT EXISTS idx_config_updated_at ON "LiteLLM_Config"(updated_at);

-- Cron Job indexes
CREATE INDEX IF NOT EXISTS idx_cron_job_job_name ON "LiteLLM_CronJob"(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_job_type ON "LiteLLM_CronJob"(job_type);
CREATE INDEX IF NOT EXISTS idx_cron_job_is_active ON "LiteLLM_CronJob"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cron_job_next_run_at ON "LiteLLM_CronJob"(next_run_at) WHERE next_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cron_job_last_run_status ON "LiteLLM_CronJob"(last_run_status) WHERE last_run_status IS NOT NULL;

-- MCP Server Table indexes
CREATE INDEX IF NOT EXISTS idx_mcp_server_server_name ON "LiteLLM_MCPServerTable"(server_name);
CREATE INDEX IF NOT EXISTS idx_mcp_server_server_type ON "LiteLLM_MCPServerTable"(server_type);
CREATE INDEX IF NOT EXISTS idx_mcp_server_is_active ON "LiteLLM_MCPServerTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mcp_server_health_status ON "LiteLLM_MCPServerTable"(health_status);
CREATE INDEX IF NOT EXISTS idx_mcp_server_last_health_check ON "LiteLLM_MCPServerTable"(last_health_check);
CREATE INDEX IF NOT EXISTS idx_mcp_server_supported_methods ON "LiteLLM_MCPServerTable" USING GIN(supported_methods);

-- Object Permission Table indexes
CREATE INDEX IF NOT EXISTS idx_object_permission_object_type ON "LiteLLM_ObjectPermissionTable"(object_type);
CREATE INDEX IF NOT EXISTS idx_object_permission_object_id ON "LiteLLM_ObjectPermissionTable"(object_id);
CREATE INDEX IF NOT EXISTS idx_object_permission_user_id ON "LiteLLM_ObjectPermissionTable"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_object_permission_team_id ON "LiteLLM_ObjectPermissionTable"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_object_permission_organization_id ON "LiteLLM_ObjectPermissionTable"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_object_permission_permission_type ON "LiteLLM_ObjectPermissionTable"(permission_type);
CREATE INDEX IF NOT EXISTS idx_object_permission_is_active ON "LiteLLM_ObjectPermissionTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_object_permission_expires_at ON "LiteLLM_ObjectPermissionTable"(expires_at) WHERE expires_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_GuardrailsTable" IS 'Content filtering and safety guardrails configuration';
COMMENT ON COLUMN "LiteLLM_GuardrailsTable".guardrail_type IS 'Type of guardrail (content_filter, pii_detection, etc.)';
COMMENT ON COLUMN "LiteLLM_GuardrailsTable".failure_action IS 'Action to take when guardrail is triggered';

COMMENT ON TABLE "LiteLLM_Config" IS 'System configuration and feature flags';
COMMENT ON COLUMN "LiteLLM_Config".config_value IS 'Configuration value as JSON';
COMMENT ON COLUMN "LiteLLM_Config".is_sensitive IS 'Whether this configuration contains sensitive data';

COMMENT ON TABLE "LiteLLM_CronJob" IS 'Scheduled tasks and maintenance jobs';
COMMENT ON COLUMN "LiteLLM_CronJob".cron_expression IS 'Cron expression for job scheduling';
COMMENT ON COLUMN "LiteLLM_CronJob".job_config IS 'Job-specific configuration parameters';

COMMENT ON TABLE "LiteLLM_MCPServerTable" IS 'Model Context Protocol server configurations';
COMMENT ON COLUMN "LiteLLM_MCPServerTable".server_type IS 'Type of MCP server (context_provider, tool_provider, etc.)';
COMMENT ON COLUMN "LiteLLM_MCPServerTable".supported_methods IS 'Array of supported MCP methods';

COMMENT ON TABLE "LiteLLM_ObjectPermissionTable" IS 'Fine-grained permissions for objects and resources';
COMMENT ON COLUMN "LiteLLM_ObjectPermissionTable".permissions IS 'Detailed permissions as JSON object';
COMMENT ON COLUMN "LiteLLM_ObjectPermissionTable".can_delegate IS 'Whether this permission can be delegated to others';