-- Check current migration status
\echo 'Checking existing LiteLLM tables...'

-- Check which critical tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'LiteLLM_VerificationToken' THEN '✅ Virtual Keys (CRITICAL)'
        WHEN table_name = 'LiteLLM_BudgetTable' THEN '✅ Budget Management (CRITICAL)'
        WHEN table_name = 'LiteLLM_SpendLogs' THEN '✅ Spend Tracking (CRITICAL)'
        WHEN table_name = 'LiteLLM_UserTable' THEN '✅ User Management'
        WHEN table_name = 'LiteLLM_TeamTable' THEN '✅ Team Management'
        WHEN table_name = 'LiteLLM_OrganizationTable' THEN '✅ Organization Management'
        ELSE '✅ ' || table_name
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'LiteLLM_%'
ORDER BY table_name;

-- Check for missing critical tables
\echo 'Checking for missing critical tables...'

SELECT 
    missing_table,
    priority
FROM (
    VALUES 
        ('LiteLLM_OrganizationMembership', 'HIGH'),
        ('LiteLLM_TeamMembership', 'HIGH'),
        ('LiteLLM_InvitationLink', 'HIGH'),
        ('LiteLLM_EndUserTable', 'HIGH'),
        ('LiteLLM_ProxyModelTable', 'MEDIUM'),
        ('LiteLLM_CredentialsTable', 'MEDIUM'),
        ('LiteLLM_ModelTable', 'MEDIUM'),
        ('LiteLLM_AuditLog', 'MEDIUM'),
        ('LiteLLM_ErrorLogs', 'MEDIUM'),
        ('LiteLLM_HealthCheckTable', 'MEDIUM'),
        ('LiteLLM_UserNotifications', 'MEDIUM'),
        ('LiteLLM_GuardrailsTable', 'LOW'),
        ('LiteLLM_Config', 'LOW'),
        ('LiteLLM_CronJob', 'LOW'),
        ('LiteLLM_MCPServerTable', 'LOW'),
        ('LiteLLM_ObjectPermissionTable', 'LOW')
) AS expected(missing_table, priority)
WHERE missing_table NOT IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
ORDER BY 
    CASE priority 
        WHEN 'HIGH' THEN 1 
        WHEN 'MEDIUM' THEN 2 
        WHEN 'LOW' THEN 3 
    END,
    missing_table;

-- Check LiteLLM_UserTable columns for compatibility
\echo 'Checking LiteLLM_UserTable compatibility...'

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'LiteLLM_UserTable' 
AND column_name IN ('models', 'metadata', 'tpm_limit', 'rpm_limit', 'user_alias', 'sso_user_id')
ORDER BY column_name;

\echo 'Migration status check complete.'