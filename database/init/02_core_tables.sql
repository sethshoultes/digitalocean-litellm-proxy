-- Core connection management tables

-- User connections table
CREATE TABLE IF NOT EXISTS "LiteLLM_UserConnections" (
    "connection_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "connection_name" TEXT NOT NULL,
    "provider" provider_type NOT NULL,
    "status" connection_status DEFAULT 'active',
    "configuration" JSONB NOT NULL,
    "credentials_encrypted" TEXT,
    "last_used" TIMESTAMP WITH TIME ZONE,
    "last_health_check" TIMESTAMP WITH TIME ZONE,
    "health_status" TEXT DEFAULT 'unknown',
    "error_count" INTEGER DEFAULT 0,
    "success_count" INTEGER DEFAULT 0,
    "avg_response_time" DECIMAL(10,3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,
    CONSTRAINT valid_connection_name CHECK (LENGTH(connection_name) >= 3),
    CONSTRAINT valid_configuration CHECK (jsonb_typeof(configuration) = 'object')
);

-- Access policies table
CREATE TABLE IF NOT EXISTS "LiteLLM_AccessPolicies" (
    "policy_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "policy_name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "resource_type" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "conditions" JSONB DEFAULT '{}',
    "is_system_policy" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "priority" INTEGER DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_policy_name CHECK (LENGTH(policy_name) >= 3),
    CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100)
);

-- User-Policy associations
CREATE TABLE IF NOT EXISTS "LiteLLM_UserAccessPolicies" (
    "user_id" TEXT NOT NULL,
    "policy_id" UUID NOT NULL,
    "granted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "conditions" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    PRIMARY KEY ("user_id", "policy_id"),
    FOREIGN KEY ("policy_id") REFERENCES "LiteLLM_AccessPolicies" ("policy_id") ON DELETE CASCADE,
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Connection activity tracking (partitioned by month)
CREATE TABLE IF NOT EXISTS "LiteLLM_ConnectionActivity" (
    "activity_id" UUID DEFAULT uuid_generate_v4(),
    "connection_id" UUID NOT NULL,
    "activity_type" activity_type NOT NULL,
    "status" TEXT NOT NULL,
    "response_time_ms" INTEGER,
    "error_message" TEXT,
    "request_size" INTEGER,
    "response_size" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    PRIMARY KEY ("activity_id", "timestamp"),
    FOREIGN KEY ("connection_id") REFERENCES "LiteLLM_UserConnections" ("connection_id") ON DELETE CASCADE
) PARTITION BY RANGE (timestamp);

-- Create initial partition for current month
CREATE TABLE "LiteLLM_ConnectionActivity_current" 
PARTITION OF "LiteLLM_ConnectionActivity" 
FOR VALUES FROM (date_trunc('month', CURRENT_DATE)) 
TO (date_trunc('month', CURRENT_DATE + INTERVAL '1 month'));

-- Connection templates for common providers
CREATE TABLE IF NOT EXISTS "LiteLLM_ConnectionTemplates" (
    "template_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "template_name" TEXT NOT NULL UNIQUE,
    "provider" provider_type NOT NULL,
    "configuration_template" JSONB NOT NULL,
    "required_fields" TEXT[] NOT NULL,
    "optional_fields" TEXT[] DEFAULT '{}',
    "description" TEXT,
    "is_system_template" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shared connections for team/organization level
CREATE TABLE IF NOT EXISTS "LiteLLM_SharedConnections" (
    "share_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "connection_id" UUID NOT NULL,
    "shared_with_type" TEXT NOT NULL, -- 'user', 'team', 'organization'
    "shared_with_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{"read": true, "use": true}',
    "shared_by" TEXT NOT NULL,
    "shared_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "is_active" BOOLEAN DEFAULT TRUE,
    FOREIGN KEY ("connection_id") REFERENCES "LiteLLM_UserConnections" ("connection_id") ON DELETE CASCADE,
    CONSTRAINT valid_share_type CHECK (shared_with_type IN ('user', 'team', 'organization')),
    CONSTRAINT valid_share_expiry CHECK (expires_at IS NULL OR expires_at > shared_at)
);