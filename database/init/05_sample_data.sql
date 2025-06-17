-- Sample data for connection management system

-- Insert system connection templates
INSERT INTO "LiteLLM_ConnectionTemplates" (
    template_name, provider, configuration_template, required_fields, optional_fields, description, is_system_template
) VALUES 
(
    'OpenAI GPT Standard',
    'openai',
    '{"model": "gpt-3.5-turbo", "temperature": 0.7, "max_tokens": 1000}',
    ARRAY['api_key', 'model'],
    ARRAY['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty'],
    'Standard OpenAI GPT configuration with customizable parameters',
    TRUE
),
(
    'OpenAI GPT-4 Advanced',
    'openai',
    '{"model": "gpt-4", "temperature": 0.3, "max_tokens": 2000}',
    ARRAY['api_key', 'model'],
    ARRAY['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty'],
    'Advanced OpenAI GPT-4 configuration for complex tasks',
    TRUE
),
(
    'Anthropic Claude Standard',
    'anthropic',
    '{"model": "claude-3-sonnet-20240229", "max_tokens": 1000}',
    ARRAY['api_key', 'model'],
    ARRAY['max_tokens', 'temperature', 'top_p', 'top_k'],
    'Standard Anthropic Claude configuration',
    TRUE
),
(
    'Azure OpenAI Enterprise',
    'azure',
    '{"api_version": "2023-12-01-preview", "engine": "gpt-35-turbo"}',
    ARRAY['api_key', 'api_base', 'api_version', 'engine'],
    ARRAY['temperature', 'max_tokens', 'top_p'],
    'Azure OpenAI Service configuration for enterprise deployments',
    TRUE
),
(
    'AWS Bedrock Claude',
    'aws',
    '{"model": "anthropic.claude-v2", "region": "us-east-1"}',
    ARRAY['aws_access_key_id', 'aws_secret_access_key', 'region', 'model'],
    ARRAY['temperature', 'max_tokens'],
    'AWS Bedrock configuration for Claude models',
    TRUE
);

-- Insert default access policies
INSERT INTO "LiteLLM_AccessPolicies" (
    policy_name, description, resource_type, permissions, conditions, is_system_policy, priority, created_by
) VALUES 
(
    'Basic User Access',
    'Basic permissions for regular users',
    'connection',
    '{"create": true, "read": true, "update": true, "delete": false, "max_connections": 5}',
    '{"max_daily_requests": 1000, "allowed_providers": ["openai", "anthropic"]}',
    TRUE,
    10,
    'system'
),
(
    'Premium User Access',
    'Enhanced permissions for premium users',
    'connection',
    '{"create": true, "read": true, "update": true, "delete": true, "max_connections": 20, "share": true}',
    '{"max_daily_requests": 10000, "allowed_providers": ["openai", "anthropic", "azure", "aws"]}',
    TRUE,
    20,
    'system'
),
(
    'Admin Full Access',
    'Full administrative permissions',
    'connection',
    '{"create": true, "read": true, "update": true, "delete": true, "max_connections": -1, "share": true, "admin": true}',
    '{"max_daily_requests": -1, "allowed_providers": ["*"]}',
    TRUE,
    90,
    'system'
),
(
    'Team Lead Access',
    'Permissions for team leads to manage team connections',
    'connection',
    '{"create": true, "read": true, "update": true, "delete": true, "max_connections": 50, "share": true, "manage_team": true}',
    '{"max_daily_requests": 50000, "allowed_providers": ["openai", "anthropic", "azure"], "can_manage_team_users": true}',
    TRUE,
    50,
    'system'
),
(
    'Read Only Access',
    'Read-only access for monitoring and analytics',
    'connection',
    '{"create": false, "read": true, "update": false, "delete": false, "max_connections": 0}',
    '{"max_daily_requests": 100, "allowed_providers": []}',
    TRUE,
    5,
    'system'
);

-- Insert budget and monitoring policies
INSERT INTO "LiteLLM_AccessPolicies" (
    policy_name, description, resource_type, permissions, conditions, is_system_policy, priority, created_by
) VALUES 
(
    'Budget Monitoring Basic',
    'Basic budget monitoring and alerts',
    'budget',
    '{"view_spend": true, "set_alerts": true, "export_reports": false}',
    '{"max_monthly_budget": 100, "alert_thresholds": [50, 80, 95]}',
    TRUE,
    10,
    'system'
),
(
    'Budget Management Advanced',
    'Advanced budget management capabilities',
    'budget',
    '{"view_spend": true, "set_alerts": true, "export_reports": true, "manage_budgets": true}',
    '{"max_monthly_budget": 10000, "alert_thresholds": [60, 80, 90, 95]}',
    TRUE,
    30,
    'system'
);

-- Function to create sample user connections (for demo purposes)
CREATE OR REPLACE FUNCTION create_sample_connections()
RETURNS VOID AS $$
BEGIN
    -- Note: In production, these would be created through the API with real user IDs
    -- This is just for demonstration and testing
    
    INSERT INTO "LiteLLM_UserConnections" (
        user_id, connection_name, provider, configuration, status, created_by, metadata
    ) VALUES 
    (
        'demo_user_1',
        'OpenAI Production',
        'openai',
        '{"model": "gpt-3.5-turbo", "temperature": 0.7, "max_tokens": 1000}',
        'active',
        'demo_user_1',
        '{"environment": "production", "department": "engineering"}'
    ),
    (
        'demo_user_1',
        'Claude for Analysis',
        'anthropic',
        '{"model": "claude-3-sonnet-20240229", "max_tokens": 2000}',
        'active',
        'demo_user_1',
        '{"environment": "production", "use_case": "data_analysis"}'
    ),
    (
        'demo_user_2',
        'Azure Enterprise GPT',
        'azure',
        '{"api_version": "2023-12-01-preview", "engine": "gpt-35-turbo", "api_base": "https://demo.openai.azure.com/"}',
        'active',
        'demo_user_2',
        '{"environment": "staging", "team": "product"}'
    );
    
    -- Sample policy assignments
    INSERT INTO "LiteLLM_UserAccessPolicies" (user_id, policy_id, granted_by) 
    SELECT 'demo_user_1', policy_id, 'system' 
    FROM "LiteLLM_AccessPolicies" 
    WHERE policy_name = 'Premium User Access';
    
    INSERT INTO "LiteLLM_UserAccessPolicies" (user_id, policy_id, granted_by)
    SELECT 'demo_user_2', policy_id, 'system'
    FROM "LiteLLM_AccessPolicies" 
    WHERE policy_name = 'Basic User Access';
    
    -- Sample shared connection
    INSERT INTO "LiteLLM_SharedConnections" (
        connection_id, shared_with_type, shared_with_id, permissions, shared_by
    )
    SELECT connection_id, 'team', 'engineering_team', 
           '{"read": true, "use": true, "monitor": true}', 'demo_user_1'
    FROM "LiteLLM_UserConnections" 
    WHERE connection_name = 'OpenAI Production' AND user_id = 'demo_user_1';
    
END;
$$ LANGUAGE plpgsql;

-- Create sample data (commented out by default for security)
-- Uncomment the line below to create sample data for testing
-- SELECT create_sample_connections();