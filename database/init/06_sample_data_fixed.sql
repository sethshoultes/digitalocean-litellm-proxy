-- Sample data aligned with LiteLLM patterns and real-world usage

-- Insert system connection templates following LiteLLM provider patterns
INSERT INTO "LiteLLM_ConnectionTemplates" (
    template_id, template_name, provider, connection_type, 
    configuration_template, required_fields, optional_fields, default_models, description, is_system_template
) VALUES 
(
    'template_openai_api_key',
    'OpenAI API Key',
    'openai',
    'api_key',
    '{"api_key": "", "base_url": "https://api.openai.com/v1", "timeout": 30, "max_retries": 3}',
    ARRAY['api_key'],
    ARRAY['organization', 'timeout', 'max_retries', 'base_url'],
    ARRAY['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    'Standard OpenAI API connection using API key authentication',
    TRUE
),
(
    'template_anthropic_api_key',
    'Anthropic Claude API',
    'anthropic',
    'api_key',
    '{"api_key": "", "base_url": "https://api.anthropic.com", "timeout": 30, "max_retries": 3}',
    ARRAY['api_key'],
    ARRAY['timeout', 'max_retries', 'base_url'],
    ARRAY['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    'Anthropic Claude API connection using API key authentication',
    TRUE
),
(
    'template_azure_openai',
    'Azure OpenAI Service',
    'azure',
    'api_key',
    '{"api_key": "", "azure_endpoint": "", "api_version": "2024-02-15-preview", "timeout": 30}',
    ARRAY['api_key', 'azure_endpoint', 'api_version'],
    ARRAY['timeout', 'max_retries', 'deployment_name'],
    ARRAY['gpt-35-turbo', 'gpt-4', 'gpt-4-32k'],
    'Azure OpenAI Service connection for enterprise deployments',
    TRUE
),
(
    'template_aws_bedrock',
    'AWS Bedrock',
    'aws',
    'service_account',
    '{"aws_access_key_id": "", "aws_secret_access_key": "", "region": "us-east-1", "timeout": 30}',
    ARRAY['aws_access_key_id', 'aws_secret_access_key', 'region'],
    ARRAY['timeout', 'max_retries', 'aws_session_token'],
    ARRAY['anthropic.claude-v2', 'anthropic.claude-instant-v1', 'ai21.j2-ultra-v1'],
    'AWS Bedrock connection for managed foundation models',
    TRUE
),
(
    'template_google_palm',
    'Google PaLM API',
    'google',
    'api_key',
    '{"api_key": "", "timeout": 30}',
    ARRAY['api_key'],
    ARRAY['timeout', 'max_retries'],
    ARRAY['chat-bison', 'text-bison'],
    'Google PaLM API connection',
    TRUE
);

-- Insert default access policies following LiteLLM permission patterns
INSERT INTO "LiteLLM_AccessPolicies" (
    policy_id, policy_name, description, resource_type, permissions, conditions, 
    models, max_budget, tpm_limit, rpm_limit, priority, is_system_policy, created_by
) VALUES 
(
    'policy_basic_user',
    'Basic User Access',
    'Standard access policy for regular users with limited models and budget',
    'connection',
    '{"operations": ["read", "use"], "admin": false}',
    '{"time_restrictions": {"allowed_hours": "06:00-22:00", "timezone": "UTC"}}',
    ARRAY['gpt-3.5-turbo', 'claude-3-haiku-20240307'],
    50.0,  -- $50 monthly budget
    10000, -- 10K tokens per minute
    60,    -- 60 requests per minute
    100,
    TRUE,
    'system'
),
(
    'policy_premium_user',
    'Premium User Access',
    'Enhanced access policy for premium users with more models and higher limits',
    'connection',
    '{"operations": ["read", "use", "create", "update"], "admin": false}',
    '{}',
    ARRAY['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    200.0, -- $200 monthly budget
    50000, -- 50K tokens per minute
    300,   -- 300 requests per minute
    80,
    TRUE,
    'system'
),
(
    'policy_developer_access',
    'Developer Access',
    'Access policy for developers with testing and development capabilities',
    'connection',
    '{"operations": ["read", "use", "create", "update", "test"], "admin": false}',
    '{"allowed_providers": ["openai", "anthropic", "azure"]}',
    ARRAY['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    500.0,  -- $500 monthly budget
    100000, -- 100K tokens per minute
    600,    -- 600 requests per minute
    60,
    TRUE,
    'system'
),
(
    'policy_team_lead',
    'Team Lead Access',
    'Team lead policy with user management and sharing capabilities',
    'connection',
    '{"operations": ["read", "use", "create", "update", "share", "manage_team"], "admin": false}',
    '{"can_manage_team_users": true, "can_share_connections": true}',
    ARRAY['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    1000.0, -- $1000 monthly budget
    200000, -- 200K tokens per minute
    1200,   -- 1200 requests per minute
    40,
    TRUE,
    'system'
),
(
    'policy_admin_access',
    'Administrator Access',
    'Full administrative access policy',
    'connection',
    '{"operations": ["read", "use", "create", "update", "delete", "share", "admin"], "admin": true}',
    '{}',
    ARRAY['*'], -- All models
    NULL,   -- No budget limit
    NULL,   -- No TPM limit
    NULL,   -- No RPM limit
    10,
    TRUE,
    'system'
),
(
    'policy_read_only',
    'Read Only Access',
    'Read-only access for monitoring and analytics',
    'connection',
    '{"operations": ["read"], "admin": false}',
    '{}',
    ARRAY[]::TEXT[], -- No model access
    0.0,    -- No budget
    0,      -- No tokens
    10,     -- Limited requests for monitoring
    200,
    TRUE,
    'system'
);

-- Function to create sample connections (commented out by default for security)
CREATE OR REPLACE FUNCTION create_sample_connections()
RETURNS VOID AS $$
BEGIN
    -- Note: In production, these would be created through the API with real user IDs
    -- This is just for demonstration and testing with encrypted dummy credentials
    
    -- Sample OpenAI connection
    INSERT INTO "LiteLLM_UserConnections" (
        connection_id, user_id, connection_name, provider, connection_type, status,
        configuration, models, metadata, max_budget, tpm_limit, rpm_limit, created_by
    ) VALUES (
        'conn_demo_openai_001',
        'demo_user_1',
        'OpenAI GPT Production',
        'openai',
        'api_key',
        'active',
        '{"api_key": "encrypted_dummy_key_openai", "organization": "org-demo", "timeout": 30}',
        ARRAY['gpt-3.5-turbo', 'gpt-4'],
        '{"environment": "production", "department": "engineering", "cost_center": "AI-001"}',
        100.0,
        20000,
        120,
        'demo_user_1'
    );
    
    -- Sample Anthropic connection
    INSERT INTO "LiteLLM_UserConnections" (
        connection_id, user_id, connection_name, provider, connection_type, status,
        configuration, models, metadata, max_budget, tpm_limit, rpm_limit, created_by
    ) VALUES (
        'conn_demo_anthropic_001',
        'demo_user_1',
        'Claude for Analysis',
        'anthropic',
        'api_key',
        'active',
        '{"api_key": "encrypted_dummy_key_anthropic", "timeout": 30}',
        ARRAY['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        '{"environment": "production", "use_case": "data_analysis", "cost_center": "AI-002"}',
        200.0,
        40000,
        240,
        'demo_user_1'
    );
    
    -- Sample Azure OpenAI connection
    INSERT INTO "LiteLLM_UserConnections" (
        connection_id, user_id, connection_name, provider, connection_type, status,
        configuration, models, metadata, max_budget, tpm_limit, rpm_limit, created_by
    ) VALUES (
        'conn_demo_azure_001',
        'demo_user_2',
        'Azure Enterprise GPT',
        'azure',
        'api_key',
        'active',
        '{"api_key": "encrypted_dummy_key_azure", "azure_endpoint": "https://demo.openai.azure.com/", "api_version": "2024-02-15-preview"}',
        ARRAY['gpt-35-turbo', 'gpt-4'],
        '{"environment": "staging", "team": "product", "region": "east-us"}',
        150.0,
        30000,
        180,
        'demo_user_2'
    );
    
    -- Sample AWS Bedrock connection
    INSERT INTO "LiteLLM_UserConnections" (
        connection_id, user_id, connection_name, provider, connection_type, status,
        configuration, models, metadata, max_budget, tpm_limit, rpm_limit, created_by
    ) VALUES (
        'conn_demo_aws_001',
        'demo_user_3',
        'AWS Bedrock Enterprise',
        'aws',
        'service_account',
        'active',
        '{"aws_access_key_id": "encrypted_dummy_access_key", "aws_secret_access_key": "encrypted_dummy_secret", "region": "us-east-1"}',
        ARRAY['anthropic.claude-v2', 'ai21.j2-ultra-v1'],
        '{"environment": "production", "compliance": "SOC2", "team": "enterprise"}',
        300.0,
        60000,
        360,
        'demo_user_3'
    );
    
    -- Sample policy assignments
    INSERT INTO "LiteLLM_UserAccessPolicies" (user_id, policy_id, granted_by) VALUES
    ('demo_user_1', 'policy_premium_user', 'system'),
    ('demo_user_2', 'policy_developer_access', 'system'),
    ('demo_user_3', 'policy_team_lead', 'system');
    
    -- Sample shared connection
    INSERT INTO "LiteLLM_SharedConnections" (
        connection_id, shared_with_type, shared_with_id, permissions, models, shared_by, metadata
    ) VALUES (
        'conn_demo_openai_001',
        'team',
        'engineering_team',
        '{"operations": ["read", "use"], "restrictions": ["no_delete"]}',
        ARRAY['gpt-3.5-turbo'],
        'demo_user_1',
        '{"shared_reason": "team_collaboration", "approval_required": false}'
    );
    
    -- Sample activity records
    INSERT INTO "LiteLLM_ConnectionActivity" (
        connection_id, user_id, activity_type, status, model, total_tokens, spend, response_time_ms, metadata, timestamp
    ) VALUES 
    (
        'conn_demo_openai_001',
        'demo_user_1',
        'api_call',
        'success',
        'gpt-3.5-turbo',
        150,
        0.0003,
        245,
        '{"prompt_type": "chat", "temperature": 0.7, "max_tokens": 100}',
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    ),
    (
        'conn_demo_anthropic_001',
        'demo_user_1',
        'api_call',
        'success',
        'claude-3-sonnet-20240229',
        89,
        0.0027,
        567,
        '{"prompt_type": "completion", "max_tokens": 150}',
        CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ),
    (
        'conn_demo_azure_001',
        'demo_user_2',
        'tested',
        'success',
        NULL,
        0,
        0,
        123,
        '{"test_type": "connection_health", "endpoint_verified": true}',
        CURRENT_TIMESTAMP - INTERVAL '15 minutes'
    );
    
END;
$$ LANGUAGE plpgsql;

-- Budget monitoring templates
INSERT INTO "LiteLLM_AccessPolicies" (
    policy_id, policy_name, description, resource_type, permissions, conditions,
    max_budget, tpm_limit, rpm_limit, priority, is_system_policy, created_by
) VALUES 
(
    'policy_budget_monitoring_basic',
    'Basic Budget Monitoring',
    'Basic budget monitoring with standard alerts',
    'connection',
    '{"view_spend": true, "set_alerts": true, "export_reports": false}',
    '{"alert_thresholds": [50, 80, 95], "alert_frequency": "daily"}',
    100.0,
    NULL,
    NULL,
    150,
    TRUE,
    'system'
),
(
    'policy_budget_monitoring_advanced',
    'Advanced Budget Management',
    'Advanced budget management with full reporting capabilities',
    'connection',
    '{"view_spend": true, "set_alerts": true, "export_reports": true, "manage_budgets": true}',
    '{"alert_thresholds": [60, 80, 90, 95], "alert_frequency": "real_time", "cost_optimization": true}',
    10000.0,
    NULL,
    NULL,
    120,
    TRUE,
    'system'
);

-- Create sample data (commented out by default for security)
-- Uncomment the line below to create sample data for testing
-- SELECT create_sample_connections();