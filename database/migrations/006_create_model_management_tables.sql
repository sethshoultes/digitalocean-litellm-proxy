-- Migration 006: Create Model Management tables
-- LiteLLM_ProxyModelTable, LiteLLM_CredentialsTable, LiteLLM_ModelTable
-- Date: 2024-12-19
-- Priority: P1 - Medium

-- Proxy Model Table - Defines available models and their configurations
CREATE TABLE IF NOT EXISTS "LiteLLM_ProxyModelTable" (
    model_id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name              TEXT NOT NULL,
    litellm_params          JSONB NOT NULL,
    model_info              JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional model configuration fields
    is_active               BOOLEAN DEFAULT TRUE,
    deployment_name         TEXT,
    api_version             TEXT,
    api_base                TEXT,
    provider                TEXT,
    cost_per_input_token    DECIMAL(12, 8),
    cost_per_output_token   DECIMAL(12, 8),
    max_tokens              INT,
    supports_streaming      BOOLEAN DEFAULT TRUE,
    supports_function_calling BOOLEAN DEFAULT FALSE,
    supports_vision         BOOLEAN DEFAULT FALSE,
    context_window          INT,
    tier                    TEXT DEFAULT 'standard',  -- standard, premium, enterprise
    region                  TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_model_name CHECK (LENGTH(model_name) >= 1),
    CONSTRAINT valid_litellm_params CHECK (jsonb_typeof(litellm_params) = 'object'),
    CONSTRAINT valid_model_info CHECK (jsonb_typeof(model_info) = 'object'),
    CONSTRAINT valid_cost_per_input CHECK (cost_per_input_token IS NULL OR cost_per_input_token >= 0),
    CONSTRAINT valid_cost_per_output CHECK (cost_per_output_token IS NULL OR cost_per_output_token >= 0),
    CONSTRAINT valid_max_tokens CHECK (max_tokens IS NULL OR max_tokens > 0),
    CONSTRAINT valid_context_window CHECK (context_window IS NULL OR context_window > 0),
    CONSTRAINT valid_tier CHECK (tier IN ('standard', 'premium', 'enterprise', 'experimental')),
    CONSTRAINT unique_model_name UNIQUE (model_name)
);

-- Credentials Table - Stores encrypted provider credentials
CREATE TABLE IF NOT EXISTS "LiteLLM_CredentialsTable" (
    credential_id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_name         TEXT UNIQUE NOT NULL,
    credential_values       JSONB NOT NULL,
    credential_info         JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional credential management fields
    provider                TEXT NOT NULL,
    is_active               BOOLEAN DEFAULT TRUE,
    expires_at              TIMESTAMPTZ,
    last_used_at            TIMESTAMPTZ,
    usage_count             BIGINT DEFAULT 0,
    is_encrypted            BOOLEAN DEFAULT TRUE,
    encryption_key_id       TEXT,
    rotation_schedule       TEXT,  -- daily, weekly, monthly, manual
    last_rotated_at         TIMESTAMPTZ,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_credential_name CHECK (LENGTH(credential_name) >= 3),
    CONSTRAINT valid_credential_values CHECK (jsonb_typeof(credential_values) = 'object'),
    CONSTRAINT valid_credential_info CHECK (jsonb_typeof(credential_info) = 'object'),
    CONSTRAINT valid_provider CHECK (LENGTH(provider) >= 1),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0),
    CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT valid_rotation_schedule CHECK (
        rotation_schedule IS NULL OR 
        rotation_schedule IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'manual')
    )
);

-- Model Table - Model aliases and configuration mappings
CREATE TABLE IF NOT EXISTS "LiteLLM_ModelTable" (
    id                      SERIAL PRIMARY KEY,
    model_name              TEXT NOT NULL,
    aliases                 JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional alias management fields
    is_active               BOOLEAN DEFAULT TRUE,
    priority                INT DEFAULT 0,
    fallback_models         TEXT[] DEFAULT '{}',
    load_balancing_strategy TEXT DEFAULT 'round_robin',
    health_check_endpoint   TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_model_table_name CHECK (LENGTH(model_name) >= 1),
    CONSTRAINT valid_aliases CHECK (jsonb_typeof(aliases) = 'object'),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT valid_load_balancing CHECK (
        load_balancing_strategy IN ('round_robin', 'random', 'least_busy', 'cost_optimized', 'latency_optimized')
    ),
    CONSTRAINT unique_model_table_name UNIQUE (model_name)
);

-- Model Group Table - For grouping models by functionality
CREATE TABLE IF NOT EXISTS "LiteLLM_ModelGroupTable" (
    group_id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_name              TEXT UNIQUE NOT NULL,
    description             TEXT,
    models                  TEXT[] DEFAULT '{}',
    routing_strategy        TEXT DEFAULT 'round_robin',
    fallback_group          TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_group_name CHECK (LENGTH(group_name) >= 1),
    CONSTRAINT valid_routing_strategy CHECK (
        routing_strategy IN ('round_robin', 'random', 'least_busy', 'cost_optimized', 'performance_optimized')
    ),
    
    -- Foreign keys
    FOREIGN KEY (fallback_group) REFERENCES "LiteLLM_ModelGroupTable"(group_id) ON DELETE SET NULL
);

-- Model Cost Table - For tracking and updating model costs
CREATE TABLE IF NOT EXISTS "LiteLLM_ModelCostTable" (
    cost_id                 TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name              TEXT NOT NULL,
    cost_per_input_token    DECIMAL(12, 8) NOT NULL,
    cost_per_output_token   DECIMAL(12, 8) NOT NULL,
    cost_per_image          DECIMAL(12, 8),
    cost_per_audio_second   DECIMAL(12, 8),
    effective_date          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_date                TIMESTAMPTZ,
    currency                TEXT DEFAULT 'USD',
    provider                TEXT,
    region                  TEXT,
    tier                    TEXT,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_cost_per_input_token CHECK (cost_per_input_token >= 0),
    CONSTRAINT valid_cost_per_output_token CHECK (cost_per_output_token >= 0),
    CONSTRAINT valid_cost_per_image CHECK (cost_per_image IS NULL OR cost_per_image >= 0),
    CONSTRAINT valid_cost_per_audio CHECK (cost_per_audio_second IS NULL OR cost_per_audio_second >= 0),
    CONSTRAINT valid_effective_date CHECK (end_date IS NULL OR end_date > effective_date),
    CONSTRAINT valid_currency CHECK (LENGTH(currency) = 3),
    CONSTRAINT unique_model_cost_effective UNIQUE (model_name, effective_date, provider, region, tier)
);

-- Add updated_at triggers
CREATE TRIGGER update_proxy_model_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_ProxyModelTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_CredentialsTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_ModelTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_group_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_ModelGroupTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance

-- Proxy Model Table indexes
CREATE INDEX IF NOT EXISTS idx_proxy_model_model_name ON "LiteLLM_ProxyModelTable"(model_name);
CREATE INDEX IF NOT EXISTS idx_proxy_model_is_active ON "LiteLLM_ProxyModelTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxy_model_provider ON "LiteLLM_ProxyModelTable"(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_model_tier ON "LiteLLM_ProxyModelTable"(tier);
CREATE INDEX IF NOT EXISTS idx_proxy_model_region ON "LiteLLM_ProxyModelTable"(region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_model_created_at ON "LiteLLM_ProxyModelTable"(created_at);
CREATE INDEX IF NOT EXISTS idx_proxy_model_litellm_params ON "LiteLLM_ProxyModelTable" USING GIN(litellm_params);
CREATE INDEX IF NOT EXISTS idx_proxy_model_metadata ON "LiteLLM_ProxyModelTable" USING GIN(metadata);

-- Credentials Table indexes
CREATE INDEX IF NOT EXISTS idx_credentials_credential_name ON "LiteLLM_CredentialsTable"(credential_name);
CREATE INDEX IF NOT EXISTS idx_credentials_provider ON "LiteLLM_CredentialsTable"(provider);
CREATE INDEX IF NOT EXISTS idx_credentials_is_active ON "LiteLLM_CredentialsTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_credentials_expires_at ON "LiteLLM_CredentialsTable"(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_last_used_at ON "LiteLLM_CredentialsTable"(last_used_at) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON "LiteLLM_CredentialsTable"(created_at);

-- Model Table indexes
CREATE INDEX IF NOT EXISTS idx_model_table_model_name ON "LiteLLM_ModelTable"(model_name);
CREATE INDEX IF NOT EXISTS idx_model_table_is_active ON "LiteLLM_ModelTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_model_table_priority ON "LiteLLM_ModelTable"(priority DESC);
CREATE INDEX IF NOT EXISTS idx_model_table_aliases ON "LiteLLM_ModelTable" USING GIN(aliases);
CREATE INDEX IF NOT EXISTS idx_model_table_fallback_models ON "LiteLLM_ModelTable" USING GIN(fallback_models);

-- Model Group Table indexes
CREATE INDEX IF NOT EXISTS idx_model_group_group_name ON "LiteLLM_ModelGroupTable"(group_name);
CREATE INDEX IF NOT EXISTS idx_model_group_is_active ON "LiteLLM_ModelGroupTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_model_group_models ON "LiteLLM_ModelGroupTable" USING GIN(models);
CREATE INDEX IF NOT EXISTS idx_model_group_fallback ON "LiteLLM_ModelGroupTable"(fallback_group) WHERE fallback_group IS NOT NULL;

-- Model Cost Table indexes
CREATE INDEX IF NOT EXISTS idx_model_cost_model_name ON "LiteLLM_ModelCostTable"(model_name);
CREATE INDEX IF NOT EXISTS idx_model_cost_effective_date ON "LiteLLM_ModelCostTable"(effective_date);
CREATE INDEX IF NOT EXISTS idx_model_cost_end_date ON "LiteLLM_ModelCostTable"(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_model_cost_provider ON "LiteLLM_ModelCostTable"(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_model_cost_region ON "LiteLLM_ModelCostTable"(region) WHERE region IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_ProxyModelTable" IS 'Configuration for available models in the LiteLLM proxy';
COMMENT ON COLUMN "LiteLLM_ProxyModelTable".litellm_params IS 'LiteLLM-specific parameters for model configuration';
COMMENT ON COLUMN "LiteLLM_ProxyModelTable".cost_per_input_token IS 'Cost per input token in USD';
COMMENT ON COLUMN "LiteLLM_ProxyModelTable".cost_per_output_token IS 'Cost per output token in USD';

COMMENT ON TABLE "LiteLLM_CredentialsTable" IS 'Encrypted storage for provider API credentials';
COMMENT ON COLUMN "LiteLLM_CredentialsTable".credential_values IS 'Encrypted credential values (API keys, etc.)';
COMMENT ON COLUMN "LiteLLM_CredentialsTable".is_encrypted IS 'Whether credential values are encrypted';

COMMENT ON TABLE "LiteLLM_ModelTable" IS 'Model aliases and routing configuration';
COMMENT ON COLUMN "LiteLLM_ModelTable".aliases IS 'Model name aliases and mappings';
COMMENT ON COLUMN "LiteLLM_ModelTable".fallback_models IS 'Fallback models if primary fails';

COMMENT ON TABLE "LiteLLM_ModelGroupTable" IS 'Logical grouping of models for routing and management';
COMMENT ON COLUMN "LiteLLM_ModelGroupTable".routing_strategy IS 'Strategy for routing requests within the group';

COMMENT ON TABLE "LiteLLM_ModelCostTable" IS 'Historical and current pricing for models by provider and region';
COMMENT ON COLUMN "LiteLLM_ModelCostTable".effective_date IS 'Date when this pricing becomes effective';