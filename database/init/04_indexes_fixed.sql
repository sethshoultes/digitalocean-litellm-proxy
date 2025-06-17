-- Optimized indexes aligned with LiteLLM query patterns

-- User connections indexes - following LiteLLM naming conventions
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_user_id ON "LiteLLM_UserConnections" ("user_id");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_provider ON "LiteLLM_UserConnections" ("provider");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_status ON "LiteLLM_UserConnections" ("status");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_created_at ON "LiteLLM_UserConnections" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_last_used ON "LiteLLM_UserConnections" ("last_used" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_spend ON "LiteLLM_UserConnections" ("spend" DESC);

-- JSON indexes for configuration and metadata (using GIN for better JSON performance)
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_config_gin ON "LiteLLM_UserConnections" USING GIN ("configuration");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_metadata_gin ON "LiteLLM_UserConnections" USING GIN ("metadata");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_models_gin ON "LiteLLM_UserConnections" USING GIN ("models");

-- Access policies indexes
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_resource_type ON "LiteLLM_AccessPolicies" ("resource_type");
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_is_active ON "LiteLLM_AccessPolicies" ("is_active");
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_priority ON "LiteLLM_AccessPolicies" ("priority" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_created_by ON "LiteLLM_AccessPolicies" ("created_by");
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_system ON "LiteLLM_AccessPolicies" ("is_system_policy");

-- JSON indexes for policies
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_permissions_gin ON "LiteLLM_AccessPolicies" USING GIN ("permissions");
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_conditions_gin ON "LiteLLM_AccessPolicies" USING GIN ("conditions");
CREATE INDEX IF NOT EXISTS idx_litellm_access_policies_models_gin ON "LiteLLM_AccessPolicies" USING GIN ("models");

-- User-Policy associations indexes
CREATE INDEX IF NOT EXISTS idx_litellm_user_access_policies_user_id ON "LiteLLM_UserAccessPolicies" ("user_id");
CREATE INDEX IF NOT EXISTS idx_litellm_user_access_policies_policy_id ON "LiteLLM_UserAccessPolicies" ("policy_id");
CREATE INDEX IF NOT EXISTS idx_litellm_user_access_policies_is_active ON "LiteLLM_UserAccessPolicies" ("is_active");
CREATE INDEX IF NOT EXISTS idx_litellm_user_access_policies_expires_at ON "LiteLLM_UserAccessPolicies" ("expires_at");

-- Composite index for active user policies (performance optimization)
CREATE INDEX IF NOT EXISTS idx_litellm_user_access_policies_active 
ON "LiteLLM_UserAccessPolicies" ("user_id", "is_active") 
WHERE "is_active" = TRUE;

-- Connection activity indexes (will be created on each partition)
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_connection_id ON "LiteLLM_ConnectionActivity_current" ("connection_id");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_timestamp ON "LiteLLM_ConnectionActivity_current" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_type ON "LiteLLM_ConnectionActivity_current" ("activity_type");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_status ON "LiteLLM_ConnectionActivity_current" ("status");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_user_id ON "LiteLLM_ConnectionActivity_current" ("user_id");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_request_id ON "LiteLLM_ConnectionActivity_current" ("request_id");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_api_key ON "LiteLLM_ConnectionActivity_current" ("api_key");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_model ON "LiteLLM_ConnectionActivity_current" ("model");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_spend ON "LiteLLM_ConnectionActivity_current" ("spend" DESC);

-- Composite indexes for common activity queries (following LiteLLM_SpendLogs patterns)
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_conn_time ON "LiteLLM_ConnectionActivity_current" ("connection_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_user_time ON "LiteLLM_ConnectionActivity_current" ("user_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_api_time ON "LiteLLM_ConnectionActivity_current" ("api_key", "timestamp" DESC);

-- JSON indexes for activity metadata
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_metadata_gin ON "LiteLLM_ConnectionActivity_current" USING GIN ("metadata");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_tags_gin ON "LiteLLM_ConnectionActivity_current" USING GIN ("request_tags");

-- Connection templates indexes
CREATE INDEX IF NOT EXISTS idx_litellm_connection_templates_provider ON "LiteLLM_ConnectionTemplates" ("provider");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_templates_type ON "LiteLLM_ConnectionTemplates" ("connection_type");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_templates_is_active ON "LiteLLM_ConnectionTemplates" ("is_active");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_templates_system ON "LiteLLM_ConnectionTemplates" ("is_system_template");
CREATE INDEX IF NOT EXISTS idx_litellm_connection_templates_created_by ON "LiteLLM_ConnectionTemplates" ("created_by");

-- Shared connections indexes
CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_connection_id ON "LiteLLM_SharedConnections" ("connection_id");
CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_shared_with ON "LiteLLM_SharedConnections" ("shared_with_type", "shared_with_id");
CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_shared_by ON "LiteLLM_SharedConnections" ("shared_by");
CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_is_active ON "LiteLLM_SharedConnections" ("is_active");
CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_expires_at ON "LiteLLM_SharedConnections" ("expires_at");

-- Performance optimization: partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_active 
ON "LiteLLM_UserConnections" ("user_id", "created_at" DESC) 
WHERE "status" IN ('active', 'testing');

CREATE INDEX IF NOT EXISTS idx_litellm_shared_connections_active 
ON "LiteLLM_SharedConnections" ("shared_with_type", "shared_with_id") 
WHERE "is_active" = TRUE AND ("expires_at" IS NULL OR "expires_at" > CURRENT_TIMESTAMP);

-- Budget and spend tracking indexes (following LiteLLM patterns)
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_budget ON "LiteLLM_UserConnections" ("max_budget", "spend");
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_limits ON "LiteLLM_UserConnections" ("tpm_limit", "rpm_limit");

-- Index for connection health monitoring
CREATE INDEX IF NOT EXISTS idx_litellm_user_connections_health 
ON "LiteLLM_UserConnections" ("health_status", "last_health_check" DESC);

-- Composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_analytics 
ON "LiteLLM_ConnectionActivity_current" ("connection_id", "activity_type", "status", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_litellm_connection_activity_spend_analytics 
ON "LiteLLM_ConnectionActivity_current" ("user_id", "model", "timestamp" DESC) 
WHERE "spend" > 0;

-- Function to automatically create indexes on new activity partitions
CREATE OR REPLACE FUNCTION create_connection_activity_indexes(partition_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create all the necessary indexes on the new partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_connection_id ON %I (connection_id)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_timestamp ON %I (timestamp DESC)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_type ON %I (activity_type)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_status ON %I (status)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_user_id ON %I (user_id)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_api_key ON %I (api_key)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_model ON %I (model)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata_gin ON %I USING GIN (metadata)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tags_gin ON %I USING GIN (request_tags)', partition_name, partition_name);
    
    -- Composite indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_conn_time ON %I (connection_id, timestamp DESC)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_user_time ON %I (user_id, timestamp DESC)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_analytics ON %I (connection_id, activity_type, status, timestamp DESC)', partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;