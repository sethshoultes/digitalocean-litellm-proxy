-- Updated core tables to align with LiteLLM architecture

-- User connections table - integrates with existing LiteLLM_UserTable
CREATE TABLE IF NOT EXISTS "LiteLLM_UserConnections" (
    "connection_id" TEXT PRIMARY KEY DEFAULT ('conn_' || gen_random_uuid()::text),
    "user_id" TEXT NOT NULL, -- References LiteLLM_UserTable.user_id
    "connection_name" TEXT NOT NULL,
    "provider" provider_type NOT NULL,
    "connection_type" connection_type NOT NULL DEFAULT 'api_key',
    "status" connection_status DEFAULT 'active',
    "configuration" JSON NOT NULL DEFAULT '{}',
    "credentials_encrypted" TEXT,
    "models" TEXT[] DEFAULT '{}', -- Follows LiteLLM pattern
    "metadata" JSON DEFAULT '{}', -- Follows LiteLLM pattern
    "spend" FLOAT DEFAULT 0.0, -- Follows LiteLLM pattern
    "max_budget" FLOAT,
    "max_parallel_requests" INTEGER,
    "tpm_limit" BIGINT,
    "rpm_limit" BIGINT,
    "budget_duration" TEXT,
    "budget_reset_at" TIMESTAMP WITH TIME ZONE,
    "last_used" TIMESTAMP WITH TIME ZONE,
    "last_health_check" TIMESTAMP WITH TIME ZONE,
    "health_status" TEXT DEFAULT 'unknown',
    "usage_count" INTEGER DEFAULT 0,
    "error_count" INTEGER DEFAULT 0,
    "success_count" INTEGER DEFAULT 0,
    "avg_response_time_ms" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    
    -- Constraints
    CONSTRAINT valid_connection_name CHECK (LENGTH(connection_name) >= 1 AND LENGTH(connection_name) <= 255),
    CONSTRAINT valid_configuration CHECK (json_typeof(configuration) = 'object'),
    CONSTRAINT valid_budget CHECK (max_budget IS NULL OR max_budget >= 0),
    CONSTRAINT valid_spend CHECK (spend >= 0)
);

-- Access policies table - simplified to match LiteLLM patterns
CREATE TABLE IF NOT EXISTS "LiteLLM_AccessPolicies" (
    "policy_id" TEXT PRIMARY KEY DEFAULT ('policy_' || gen_random_uuid()::text),
    "policy_name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "resource_type" TEXT NOT NULL DEFAULT 'connection',
    "permissions" JSON NOT NULL DEFAULT '{}',
    "conditions" JSON DEFAULT '{}',
    "models" TEXT[] DEFAULT '{}', -- Follows LiteLLM pattern
    "max_budget" FLOAT,
    "tpm_limit" BIGINT,
    "rpm_limit" BIGINT,
    "budget_duration" TEXT,
    "is_system_policy" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "priority" INTEGER DEFAULT 100,
    "metadata" JSON DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_policy_name CHECK (LENGTH(policy_name) >= 1 AND LENGTH(policy_name) <= 255),
    CONSTRAINT valid_permissions CHECK (json_typeof(permissions) = 'object'),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1000),
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('connection', 'model', 'organization', 'team'))
);

-- User-Policy associations
CREATE TABLE IF NOT EXISTS "LiteLLM_UserAccessPolicies" (
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "conditions" JSON DEFAULT '{}',
    "metadata" JSON DEFAULT '{}',
    
    PRIMARY KEY ("user_id", "policy_id"),
    FOREIGN KEY ("policy_id") REFERENCES "LiteLLM_AccessPolicies" ("policy_id") ON DELETE CASCADE,
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Connection activity tracking - aligned with LiteLLM_SpendLogs pattern
CREATE TABLE IF NOT EXISTS "LiteLLM_ConnectionActivity" (
    "activity_id" TEXT PRIMARY KEY DEFAULT ('activity_' || gen_random_uuid()::text),
    "connection_id" TEXT NOT NULL,
    "user_id" TEXT,
    "activity_type" activity_type NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "request_id" TEXT, -- Links to LiteLLM_SpendLogs if applicable
    "api_key" TEXT, -- Links to LiteLLM_VerificationToken
    "model" TEXT,
    "model_group" TEXT,
    "custom_llm_provider" TEXT,
    "api_base" TEXT,
    "total_tokens" INTEGER DEFAULT 0,
    "prompt_tokens" INTEGER DEFAULT 0,
    "completion_tokens" INTEGER DEFAULT 0,
    "spend" FLOAT DEFAULT 0.0,
    "response_time_ms" INTEGER,
    "status_code" INTEGER,
    "error_message" TEXT,
    "metadata" JSON DEFAULT '{}',
    "request_tags" JSON DEFAULT '[]',
    "ip_address" INET,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("connection_id") REFERENCES "LiteLLM_UserConnections" ("connection_id") ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'pending', 'timeout', 'error')),
    CONSTRAINT valid_tokens CHECK (total_tokens >= 0 AND prompt_tokens >= 0 AND completion_tokens >= 0),
    CONSTRAINT valid_spend CHECK (spend >= 0)
) PARTITION BY RANGE (timestamp);

-- Create initial partition for current month
CREATE TABLE "LiteLLM_ConnectionActivity_current" 
PARTITION OF "LiteLLM_ConnectionActivity" 
FOR VALUES FROM (date_trunc('month', CURRENT_DATE)) 
TO (date_trunc('month', CURRENT_DATE + INTERVAL '1 month'));

-- Connection templates for common providers
CREATE TABLE IF NOT EXISTS "LiteLLM_ConnectionTemplates" (
    "template_id" TEXT PRIMARY KEY DEFAULT ('template_' || gen_random_uuid()::text),
    "template_name" TEXT NOT NULL UNIQUE,
    "provider" provider_type NOT NULL,
    "connection_type" connection_type NOT NULL DEFAULT 'api_key',
    "configuration_template" JSON NOT NULL DEFAULT '{}',
    "required_fields" TEXT[] NOT NULL DEFAULT '{}',
    "optional_fields" TEXT[] DEFAULT '{}',
    "default_models" TEXT[] DEFAULT '{}',
    "validation_rules" JSON DEFAULT '{}',
    "description" TEXT,
    "is_system_template" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "metadata" JSON DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    
    CONSTRAINT valid_template_name CHECK (LENGTH(template_name) >= 1 AND LENGTH(template_name) <= 255),
    CONSTRAINT valid_config_template CHECK (json_typeof(configuration_template) = 'object')
);

-- Shared connections for team/organization level access
CREATE TABLE IF NOT EXISTS "LiteLLM_SharedConnections" (
    "sharing_id" TEXT PRIMARY KEY DEFAULT ('share_' || gen_random_uuid()::text),
    "connection_id" TEXT NOT NULL,
    "shared_with_type" TEXT NOT NULL, -- 'user', 'team', 'organization'
    "shared_with_id" TEXT NOT NULL,
    "permissions" JSON NOT NULL DEFAULT '{"read": true, "use": true}',
    "models" TEXT[] DEFAULT '{}', -- Override models for sharing
    "max_budget" FLOAT,
    "tpm_limit" BIGINT,
    "rpm_limit" BIGINT,
    "shared_by" TEXT NOT NULL,
    "shared_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "metadata" JSON DEFAULT '{}',
    
    FOREIGN KEY ("connection_id") REFERENCES "LiteLLM_UserConnections" ("connection_id") ON DELETE CASCADE,
    CONSTRAINT valid_share_type CHECK (shared_with_type IN ('user', 'team', 'organization')),
    CONSTRAINT valid_share_expiry CHECK (expires_at IS NULL OR expires_at > shared_at),
    CONSTRAINT valid_permissions CHECK (json_typeof(permissions) = 'object'),
    CONSTRAINT no_self_share CHECK (shared_with_type != 'user' OR shared_with_id != shared_by)
);