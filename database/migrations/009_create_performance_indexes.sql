-- Migration 009: Create Performance Indexes
-- Additional performance indexes for optimal query performance
-- Date: 2024-12-19
-- Priority: P1 - Medium

-- Additional indexes for existing tables that weren't covered in previous migrations

-- Enhanced indexes for LiteLLM_UserTable
CREATE INDEX IF NOT EXISTS idx_user_table_spend ON "LiteLLM_UserTable"(spend) WHERE spend > 0;
CREATE INDEX IF NOT EXISTS idx_user_table_max_budget ON "LiteLLM_UserTable"(max_budget) WHERE max_budget IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_organization_id ON "LiteLLM_UserTable"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_team_id ON "LiteLLM_UserTable"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_table_is_active ON "LiteLLM_UserTable"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_table_created_at ON "LiteLLM_UserTable"(created_at);
CREATE INDEX IF NOT EXISTS idx_user_table_user_role ON "LiteLLM_UserTable"(user_role);

-- Enhanced indexes for LiteLLM_TeamTable
CREATE INDEX IF NOT EXISTS idx_team_table_organization_id ON "LiteLLM_TeamTable"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_table_team_name ON "LiteLLM_TeamTable"(team_name);
CREATE INDEX IF NOT EXISTS idx_team_table_created_at ON "LiteLLM_TeamTable"(created_at);

-- Enhanced indexes for LiteLLM_OrganizationTable
CREATE INDEX IF NOT EXISTS idx_organization_table_organization_name ON "LiteLLM_OrganizationTable"(organization_name);
CREATE INDEX IF NOT EXISTS idx_organization_table_created_at ON "LiteLLM_OrganizationTable"(created_at);

-- Composite indexes for common query patterns on VerificationToken
CREATE INDEX IF NOT EXISTS idx_verification_token_user_spend ON "LiteLLM_VerificationToken"(user_id, spend) WHERE user_id IS NOT NULL AND spend > 0;
CREATE INDEX IF NOT EXISTS idx_verification_token_team_spend ON "LiteLLM_VerificationToken"(team_id, spend) WHERE team_id IS NOT NULL AND spend > 0;
CREATE INDEX IF NOT EXISTS idx_verification_token_active_keys ON "LiteLLM_VerificationToken"(blocked, expires) WHERE blocked = FALSE;
CREATE INDEX IF NOT EXISTS idx_verification_token_budget_check ON "LiteLLM_VerificationToken"(max_budget, spend) WHERE max_budget IS NOT NULL;

-- Composite indexes for SpendLogs analytics queries
CREATE INDEX IF NOT EXISTS idx_spend_logs_daily_user_spend ON "LiteLLM_SpendLogs"(user_id, date_trunc('day', startTime), spend) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_daily_team_spend ON "LiteLLM_SpendLogs"(team_id, date_trunc('day', startTime), spend) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_monthly_org_spend ON "LiteLLM_SpendLogs"(organization_id, date_trunc('month', startTime), spend) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_logs_model_costs ON "LiteLLM_SpendLogs"(model, startTime, spend) WHERE model IS NOT NULL AND spend > 0;
CREATE INDEX IF NOT EXISTS idx_spend_logs_api_key_usage ON "LiteLLM_SpendLogs"(api_key, startTime) WHERE api_key IS NOT NULL;

-- Indexes for budget management and alerts
CREATE INDEX IF NOT EXISTS idx_budget_table_active_budgets ON "LiteLLM_BudgetTable"(is_active, budget_reset_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_budget_table_reset_due ON "LiteLLM_BudgetTable"(budget_reset_at) WHERE budget_reset_at <= CURRENT_TIMESTAMP + INTERVAL '1 day';

-- Indexes for user session and authentication patterns
CREATE INDEX IF NOT EXISTS idx_user_table_auth_lookup ON "LiteLLM_UserTable"(user_email, is_active, password_hash) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_table_sso_lookup ON "LiteLLM_UserTable"(sso_user_id, is_active) WHERE sso_user_id IS NOT NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_verification_token_auth ON "LiteLLM_VerificationToken"(token, blocked, expires) WHERE blocked = FALSE;

-- Indexes for API rate limiting and monitoring
CREATE INDEX IF NOT EXISTS idx_user_table_rate_limits ON "LiteLLM_UserTable"(tpm_limit, rpm_limit) WHERE tpm_limit IS NOT NULL OR rpm_limit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_token_rate_limits ON "LiteLLM_VerificationToken"(tpm_limit, rpm_limit) WHERE tpm_limit IS NOT NULL OR rpm_limit IS NOT NULL;

-- Indexes for membership management
CREATE INDEX IF NOT EXISTS idx_org_membership_active_members ON "LiteLLM_OrganizationMembership"(organization_id, is_active, user_role) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_membership_active_members ON "LiteLLM_TeamMembership"(team_id, is_active, user_role) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_membership_user_orgs ON "LiteLLM_OrganizationMembership"(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_membership_user_teams ON "LiteLLM_TeamMembership"(user_id, is_active) WHERE is_active = TRUE;

-- Indexes for invitation management
CREATE INDEX IF NOT EXISTS idx_invitation_link_active ON "LiteLLM_InvitationLink"(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invitation_link_pending ON "LiteLLM_InvitationLink"(email, is_active, used_at) WHERE is_active = TRUE AND used_at IS NULL;

-- Indexes for model and provider management
CREATE INDEX IF NOT EXISTS idx_proxy_model_active_models ON "LiteLLM_ProxyModelTable"(is_active, provider, tier) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_credentials_active_providers ON "LiteLLM_CredentialsTable"(provider, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_model_cost_current_pricing ON "LiteLLM_ModelCostTable"(model_name, effective_date) WHERE end_date IS NULL;

-- Indexes for health monitoring and alerting
CREATE INDEX IF NOT EXISTS idx_health_check_recent_status ON "LiteLLM_HealthCheckTable"(service_type, timestamp, status) WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour';
CREATE INDEX IF NOT EXISTS idx_error_logs_recent_errors ON "LiteLLM_ErrorLogs"(timestamp, severity, is_resolved) WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
CREATE INDEX IF NOT EXISTS idx_audit_log_recent_actions ON "LiteLLM_AuditLog"(timestamp, action, severity) WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Indexes for guardrails and security
CREATE INDEX IF NOT EXISTS idx_guardrails_active_rules ON "LiteLLM_GuardrailsTable"(is_active, guardrail_type, priority) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_object_permission_active_perms ON "LiteLLM_ObjectPermissionTable"(object_type, object_id, is_active) WHERE is_active = TRUE;

-- Indexes for configuration management
CREATE INDEX IF NOT EXISTS idx_config_active_settings ON "LiteLLM_Config"(is_active, environment, category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_config_feature_flags ON "LiteLLM_Config"(config_type, is_active) WHERE config_type = 'feature_flag' AND is_active = TRUE;

-- Indexes for scheduled jobs
CREATE INDEX IF NOT EXISTS idx_cron_job_pending_jobs ON "LiteLLM_CronJob"(is_active, next_run_at) WHERE is_active = TRUE AND next_run_at <= CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_cron_job_failed_jobs ON "LiteLLM_CronJob"(last_run_status, last_run_at) WHERE last_run_status = 'failed';

-- Indexes for MCP server management
CREATE INDEX IF NOT EXISTS idx_mcp_server_active_servers ON "LiteLLM_MCPServerTable"(is_active, health_status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mcp_server_health_check_due ON "LiteLLM_MCPServerTable"(is_active, last_health_check) WHERE is_active = TRUE;

-- Indexes for end user management
CREATE INDEX IF NOT EXISTS idx_end_user_active_users ON "LiteLLM_EndUserTable"(blocked, last_active_at) WHERE blocked = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_user_spend_tracking ON "LiteLLM_EndUserTable"(spend, litellm_budget_table) WHERE spend > 0;

-- Indexes for user notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON "LiteLLM_UserNotifications"(user_id, is_read, created_at) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_high_priority ON "LiteLLM_UserNotifications"(priority, is_read, created_at) WHERE priority IN ('high', 'urgent') AND is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_expiring ON "LiteLLM_UserNotifications"(expires_at, is_dismissed) WHERE expires_at IS NOT NULL AND is_dismissed = FALSE;

-- Indexes for connection management (custom tables)
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON "LiteLLM_UserConnections"(user_id, status, provider) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_connections_health ON "LiteLLM_UserConnections"(health_status, last_health_check) WHERE health_status != 'healthy';
CREATE INDEX IF NOT EXISTS idx_connection_activity_recent ON "LiteLLM_ConnectionActivity"(connection_id, timestamp, activity_type) WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Indexes for policy management (custom tables)
CREATE INDEX IF NOT EXISTS idx_access_policies_active ON "LiteLLM_AccessPolicies"(is_active, resource_type, priority) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_access_policies_active ON "LiteLLM_UserAccessPolicies"(user_id, is_active, expires_at) WHERE is_active = TRUE;

-- Indexes for shared connections
CREATE INDEX IF NOT EXISTS idx_shared_connections_active ON "LiteLLM_SharedConnections"(shared_with_type, shared_with_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shared_connections_expiring ON "LiteLLM_SharedConnections"(expires_at, is_active) WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- Partial indexes for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_spend_logs_errors ON "LiteLLM_SpendLogs"(startTime, status_code, error_message) WHERE status_code >= 400;
CREATE INDEX IF NOT EXISTS idx_spend_logs_high_cost ON "LiteLLM_SpendLogs"(startTime, spend, model) WHERE spend > 1.0;
CREATE INDEX IF NOT EXISTS idx_verification_token_expiring ON "LiteLLM_VerificationToken"(expires, token) WHERE expires <= CURRENT_TIMESTAMP + INTERVAL '7 days';

-- Covering indexes for frequently accessed columns together
CREATE INDEX IF NOT EXISTS idx_user_table_dashboard_data ON "LiteLLM_UserTable"(user_id, user_email, user_role, spend, max_budget, is_active, created_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_spend_logs_summary_data ON "LiteLLM_SpendLogs"(user_id, model, spend, total_tokens, startTime) WHERE user_id IS NOT NULL;

-- Function-based indexes for common calculations
CREATE INDEX IF NOT EXISTS idx_spend_logs_cost_per_token ON "LiteLLM_SpendLogs"((spend / NULLIF(total_tokens, 0))) WHERE total_tokens > 0 AND spend > 0;
CREATE INDEX IF NOT EXISTS idx_verification_token_budget_utilization ON "LiteLLM_VerificationToken"((spend / NULLIF(max_budget, 0))) WHERE max_budget IS NOT NULL AND max_budget > 0;

-- Indexes for time-based partitioning management
CREATE INDEX IF NOT EXISTS idx_spend_logs_partition_key ON "LiteLLM_SpendLogs"(date_trunc('month', startTime));
CREATE INDEX IF NOT EXISTS idx_audit_log_partition_key ON "LiteLLM_AuditLog"(date_trunc('month', timestamp));
CREATE INDEX IF NOT EXISTS idx_error_logs_partition_key ON "LiteLLM_ErrorLogs"(date_trunc('month', timestamp));

-- Statistics update for better query planning
ANALYZE "LiteLLM_UserTable";
ANALYZE "LiteLLM_VerificationToken";
ANALYZE "LiteLLM_SpendLogs";
ANALYZE "LiteLLM_BudgetTable";
ANALYZE "LiteLLM_OrganizationMembership";
ANALYZE "LiteLLM_TeamMembership";

-- Add comments for index documentation
COMMENT ON INDEX idx_spend_logs_daily_user_spend IS 'Optimizes daily spend queries by user';
COMMENT ON INDEX idx_verification_token_auth IS 'Optimizes token authentication lookups';
COMMENT ON INDEX idx_user_table_dashboard_data IS 'Covering index for user dashboard queries';
COMMENT ON INDEX idx_spend_logs_cost_per_token IS 'Function-based index for cost efficiency analysis';
COMMENT ON INDEX idx_user_notifications_unread IS 'Optimizes unread notification queries';