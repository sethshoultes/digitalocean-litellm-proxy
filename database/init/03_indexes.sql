-- Performance indexes for connection management

-- User connections indexes
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON "LiteLLM_UserConnections" ("user_id");
CREATE INDEX IF NOT EXISTS idx_user_connections_provider ON "LiteLLM_UserConnections" ("provider");
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON "LiteLLM_UserConnections" ("status");
CREATE INDEX IF NOT EXISTS idx_user_connections_last_used ON "LiteLLM_UserConnections" ("last_used" DESC);
CREATE INDEX IF NOT EXISTS idx_user_connections_created_at ON "LiteLLM_UserConnections" ("created_at" DESC);

-- JSONB indexes for configuration and metadata
CREATE INDEX IF NOT EXISTS idx_user_connections_config_gin ON "LiteLLM_UserConnections" USING GIN ("configuration");
CREATE INDEX IF NOT EXISTS idx_user_connections_metadata_gin ON "LiteLLM_UserConnections" USING GIN ("metadata");

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_user_connections_user_status ON "LiteLLM_UserConnections" ("user_id", "status");
CREATE INDEX IF NOT EXISTS idx_user_connections_provider_status ON "LiteLLM_UserConnections" ("provider", "status");

-- Access policies indexes
CREATE INDEX IF NOT EXISTS idx_access_policies_resource_type ON "LiteLLM_AccessPolicies" ("resource_type");
CREATE INDEX IF NOT EXISTS idx_access_policies_is_active ON "LiteLLM_AccessPolicies" ("is_active");
CREATE INDEX IF NOT EXISTS idx_access_policies_priority ON "LiteLLM_AccessPolicies" ("priority" DESC);
CREATE INDEX IF NOT EXISTS idx_access_policies_created_by ON "LiteLLM_AccessPolicies" ("created_by");

-- JSONB indexes for permissions and conditions
CREATE INDEX IF NOT EXISTS idx_access_policies_permissions_gin ON "LiteLLM_AccessPolicies" USING GIN ("permissions");
CREATE INDEX IF NOT EXISTS idx_access_policies_conditions_gin ON "LiteLLM_AccessPolicies" USING GIN ("conditions");

-- User-Policy associations indexes
CREATE INDEX IF NOT EXISTS idx_user_access_policies_user_id ON "LiteLLM_UserAccessPolicies" ("user_id");
CREATE INDEX IF NOT EXISTS idx_user_access_policies_policy_id ON "LiteLLM_UserAccessPolicies" ("policy_id");
CREATE INDEX IF NOT EXISTS idx_user_access_policies_is_active ON "LiteLLM_UserAccessPolicies" ("is_active");
CREATE INDEX IF NOT EXISTS idx_user_access_policies_expires_at ON "LiteLLM_UserAccessPolicies" ("expires_at");

-- Composite index for active user policies
CREATE INDEX IF NOT EXISTS idx_user_access_policies_active ON "LiteLLM_UserAccessPolicies" ("user_id", "is_active") 
WHERE "is_active" = TRUE;

-- Connection activity indexes (will be created on each partition)
CREATE INDEX IF NOT EXISTS idx_connection_activity_connection_id ON "LiteLLM_ConnectionActivity_current" ("connection_id");
CREATE INDEX IF NOT EXISTS idx_connection_activity_timestamp ON "LiteLLM_ConnectionActivity_current" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_connection_activity_type ON "LiteLLM_ConnectionActivity_current" ("activity_type");
CREATE INDEX IF NOT EXISTS idx_connection_activity_status ON "LiteLLM_ConnectionActivity_current" ("status");
CREATE INDEX IF NOT EXISTS idx_connection_activity_user_id ON "LiteLLM_ConnectionActivity_current" ("user_id");

-- Composite indexes for common activity queries
CREATE INDEX IF NOT EXISTS idx_connection_activity_conn_time ON "LiteLLM_ConnectionActivity_current" ("connection_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_connection_activity_user_time ON "LiteLLM_ConnectionActivity_current" ("user_id", "timestamp" DESC);

-- JSONB index for activity metadata
CREATE INDEX IF NOT EXISTS idx_connection_activity_metadata_gin ON "LiteLLM_ConnectionActivity_current" USING GIN ("metadata");

-- Connection templates indexes
CREATE INDEX IF NOT EXISTS idx_connection_templates_provider ON "LiteLLM_ConnectionTemplates" ("provider");
CREATE INDEX IF NOT EXISTS idx_connection_templates_is_active ON "LiteLLM_ConnectionTemplates" ("is_active");
CREATE INDEX IF NOT EXISTS idx_connection_templates_system ON "LiteLLM_ConnectionTemplates" ("is_system_template");

-- Shared connections indexes
CREATE INDEX IF NOT EXISTS idx_shared_connections_connection_id ON "LiteLLM_SharedConnections" ("connection_id");
CREATE INDEX IF NOT EXISTS idx_shared_connections_shared_with ON "LiteLLM_SharedConnections" ("shared_with_type", "shared_with_id");
CREATE INDEX IF NOT EXISTS idx_shared_connections_is_active ON "LiteLLM_SharedConnections" ("is_active");
CREATE INDEX IF NOT EXISTS idx_shared_connections_expires_at ON "LiteLLM_SharedConnections" ("expires_at");

-- Performance optimization: partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON "LiteLLM_UserConnections" ("user_id", "created_at" DESC) 
WHERE "status" IN ('active', 'testing');

CREATE INDEX IF NOT EXISTS idx_shared_connections_active ON "LiteLLM_SharedConnections" ("shared_with_type", "shared_with_id") 
WHERE "is_active" = TRUE AND ("expires_at" IS NULL OR "expires_at" > CURRENT_TIMESTAMP);