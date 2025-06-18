# LiteLLM Connection Management Migration Guide

**Migration Version:** v1.0 → v2.0 (LiteLLM Compatible)  
**Target Audience:** DevOps, Database Administrators, LiteLLM Deployment Managers  
**Migration Type:** Schema Extension (Zero Downtime)  
**Complexity Level:** Low to Medium

## Migration Overview

This guide provides step-by-step instructions for migrating from the original LiteLLM User Connection Management schema (v1.0) to the fully LiteLLM-compatible schema (v2.0). The migration is designed to be non-disruptive and can be performed on live LiteLLM deployments.

### Migration Types Supported

1. **New Installation:** Fresh deployment on existing LiteLLM database
2. **Schema Update:** Upgrade from v1.0 to v2.0 with data preservation
3. **Parallel Deployment:** Run both versions during transition period

## Pre-Migration Requirements

### System Requirements

- **PostgreSQL:** Version 12 or higher
- **Extensions Required:**
  - `uuid-ossp` (for UUID generation)
  - `pgcrypto` (for credential encryption)
  - `pg_partman` (optional, for automated partition management)
- **Disk Space:** Minimum 10GB free space for migration operations
- **Memory:** 4GB RAM recommended for large datasets

### LiteLLM Compatibility Check

```sql
-- Verify existing LiteLLM installation
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'LiteLLM_%'
ORDER BY table_name;

-- Expected core tables:
-- LiteLLM_UserTable
-- LiteLLM_TeamTable  
-- LiteLLM_OrganizationTable
-- LiteLLM_VerificationToken
-- LiteLLM_SpendLogs
-- LiteLLM_ProxyModelTable
```

### Database Backup

```bash
# Create full database backup before migration
pg_dump -h localhost -U your_user -d litellm_db > litellm_backup_$(date +%Y%m%d_%H%M%S).sql

# Create schema-only backup for quick restore
pg_dump -h localhost -U your_user -d litellm_db --schema-only > litellm_schema_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list litellm_backup_*.sql | head -20
```

## Migration Scenarios

### Scenario 1: New Installation (Recommended)

For fresh deployments or when adding connection management to an existing LiteLLM installation.

#### Step 1: Prepare Environment

```bash
# Navigate to the project directory
cd /root

# Verify database connection
psql -h localhost -U litellm_user -d litellm_connection_management -c "SELECT version();"

# Check existing LiteLLM tables
psql -h localhost -U litellm_user -d litellm_connection_management -c "\\dt LiteLLM_*"
```

#### Step 2: Install Schema Extensions

```bash
# Install required extensions
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/01_extensions_fixed.sql

# Expected output:
# CREATE EXTENSION
# CREATE TYPE
# CREATE TYPE
# CREATE TYPE
```

#### Step 3: Create Core Tables

```bash
# Install core connection management tables
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/02_core_tables_fixed.sql

# Verify table creation
psql -h localhost -U litellm_user -d litellm_connection_management -c "\\dt LiteLLM_*Connection*"
```

#### Step 4: Establish LiteLLM Integration

```bash
# Create foreign key relationships to existing LiteLLM tables
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/03_litellm_integration.sql

# Verify foreign key constraints
psql -h localhost -U litellm_user -d litellm_connection_management -c "
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name LIKE 'LiteLLM_%Connection%';"
```

#### Step 5: Create Indexes and Optimization

```bash
# Install performance indexes
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/04_indexes_fixed.sql

# Install functions and triggers
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/05_functions_triggers_fixed.sql

# Install sample data (optional)
psql -h localhost -U litellm_user -d litellm_connection_management -f database/init/06_sample_data_fixed.sql
```

#### Step 6: Validation

```bash
# Run validation script
psql -h localhost -U litellm_user -d litellm_connection_management -c "
-- Verify all tables exist
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_name LIKE 'LiteLLM_%Connection%' 
   OR table_name LIKE 'LiteLLM_%Access%';"

# Expected output: 6 tables

# Test basic functionality
psql -h localhost -U litellm_user -d litellm_connection_management -c "
INSERT INTO LiteLLM_UserConnections 
(user_id, connection_name, provider, configuration)
VALUES 
('test_user', 'Test Connection', 'openai', '{\"api_key\": \"test\"}');

SELECT connection_id, connection_name, provider 
FROM LiteLLM_UserConnections 
WHERE user_id = 'test_user';"
```

### Scenario 2: Upgrade from v1.0 to v2.0

For existing deployments with v1.0 schema that need to upgrade to v2.0.

#### Step 1: Analyze Existing Schema

```sql
-- Check current schema version
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'LiteLLM_UserConnections'
ORDER BY ordinal_position;

-- Check for UUID vs TEXT primary keys
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name LIKE 'LiteLLM_%Connection%';
```

#### Step 2: Create Migration Script

```sql
-- Create v1 to v2 migration script
-- File: database/migrations/v1_to_v2_migration.sql

BEGIN;

-- Step 1: Rename existing tables for backup
ALTER TABLE LiteLLM_UserConnections RENAME TO LiteLLM_UserConnections_v1_backup;
ALTER TABLE LiteLLM_AccessPolicies RENAME TO LiteLLM_AccessPolicies_v1_backup;
ALTER TABLE LiteLLM_UserAccessPolicies RENAME TO LiteLLM_UserAccessPolicies_v1_backup;
ALTER TABLE LiteLLM_ConnectionActivity RENAME TO LiteLLM_ConnectionActivity_v1_backup;

-- Step 2: Create new v2 tables
\\i database/init/02_core_tables_fixed.sql

-- Step 3: Migrate data with type conversion
INSERT INTO LiteLLM_UserConnections (
    connection_id,
    user_id,
    connection_name,
    provider,
    connection_type,
    status,
    configuration,
    credentials_encrypted,
    models,
    metadata,
    spend,
    max_budget,
    created_at,
    updated_at
)
SELECT 
    'conn_' || connection_id::text,  -- Convert UUID to TEXT with prefix
    user_id,
    connection_name,
    provider,
    COALESCE(connection_type, 'api_key'),
    status,
    configuration::json,  -- Convert JSONB to JSON
    credentials_encrypted,
    COALESCE(models, '{}'),
    COALESCE(metadata::json, '{}'),
    COALESCE(spend, 0.0),
    max_budget,
    created_at,
    updated_at
FROM LiteLLM_UserConnections_v1_backup;

-- Step 4: Migrate policies
INSERT INTO LiteLLM_AccessPolicies (
    policy_id,
    policy_name,
    description,
    resource_type,
    permissions,
    conditions,
    models,
    max_budget,
    is_system_policy,
    is_active,
    priority,
    metadata,
    created_by,
    created_at,
    updated_at
)
SELECT 
    'policy_' || policy_id::text,  -- Convert UUID to TEXT with prefix
    policy_name,
    description,
    COALESCE(resource_type, 'connection'),
    permissions::json,  -- Convert JSONB to JSON
    COALESCE(conditions::json, '{}'),
    COALESCE(models, '{}'),
    max_budget,
    COALESCE(is_system_policy, false),
    COALESCE(is_active, true),
    COALESCE(priority, 100),
    COALESCE(metadata::json, '{}'),
    created_by,
    created_at,
    updated_at
FROM LiteLLM_AccessPolicies_v1_backup;

-- Step 5: Migrate user-policy associations
INSERT INTO LiteLLM_UserAccessPolicies (
    user_id,
    policy_id,
    granted_at,
    granted_by,
    expires_at,
    is_active,
    conditions,
    metadata
)
SELECT 
    user_id,
    'policy_' || policy_id::text,  -- Convert UUID to TEXT with prefix
    granted_at,
    granted_by,
    expires_at,
    COALESCE(is_active, true),
    COALESCE(conditions::json, '{}'),
    COALESCE(metadata::json, '{}')
FROM LiteLLM_UserAccessPolicies_v1_backup;

-- Step 6: Migrate activity data (if table exists and has data)
INSERT INTO LiteLLM_ConnectionActivity (
    activity_id,
    connection_id,
    user_id,
    activity_type,
    status,
    model,
    total_tokens,
    prompt_tokens,
    completion_tokens,
    spend,
    response_time_ms,
    metadata,
    timestamp
)
SELECT 
    'activity_' || activity_id::text,  -- Convert UUID to TEXT with prefix
    'conn_' || connection_id::text,    -- Convert connection reference
    user_id,
    activity_type,
    COALESCE(status, 'success'),
    model,
    COALESCE(total_tokens, 0),
    COALESCE(prompt_tokens, 0),
    COALESCE(completion_tokens, 0),
    COALESCE(spend, 0.0),
    response_time_ms,
    COALESCE(metadata::json, '{}'),
    timestamp
FROM LiteLLM_ConnectionActivity_v1_backup;

COMMIT;
```

#### Step 3: Execute Migration

```bash
# Execute migration script
psql -h localhost -U litellm_user -d litellm_connection_management -f database/migrations/v1_to_v2_migration.sql

# Verify migration success
psql -h localhost -U litellm_user -d litellm_connection_management -c "
SELECT 
    'LiteLLM_UserConnections' as table_name,
    COUNT(*) as record_count
FROM LiteLLM_UserConnections
UNION ALL
SELECT 
    'LiteLLM_AccessPolicies' as table_name,
    COUNT(*) as record_count
FROM LiteLLM_AccessPolicies
UNION ALL
SELECT 
    'LiteLLM_UserAccessPolicies' as table_name,
    COUNT(*) as record_count
FROM LiteLLM_UserAccessPolicies;"
```

#### Step 4: Validation and Testing

```bash
# Run comprehensive validation
psql -h localhost -U litellm_user -d litellm_connection_management -c "
-- Test 1: Primary key format validation
SELECT 
    connection_id,
    CASE 
        WHEN connection_id ~ '^conn_[a-f0-9-]+$' THEN 'VALID'
        ELSE 'INVALID'
    END as key_format_status
FROM LiteLLM_UserConnections
LIMIT 5;

-- Test 2: JSON field validation
SELECT 
    connection_id,
    json_typeof(configuration) as config_type,
    json_typeof(metadata) as metadata_type
FROM LiteLLM_UserConnections
LIMIT 5;

-- Test 3: Foreign key validation
SELECT COUNT(*) as orphaned_connections
FROM LiteLLM_UserConnections uc
LEFT JOIN LiteLLM_UserTable ut ON uc.user_id = ut.user_id
WHERE ut.user_id IS NULL;"
```

### Scenario 3: Parallel Deployment

For high-availability environments where both versions need to run simultaneously.

#### Step 1: Create Parallel Schema

```sql
-- Create separate schema for v2
CREATE SCHEMA litellm_connections_v2;

-- Install v2 tables in separate schema
SET search_path TO litellm_connections_v2;
\\i database/init/01_extensions_fixed.sql
\\i database/init/02_core_tables_fixed.sql
\\i database/init/03_litellm_integration.sql
\\i database/init/04_indexes_fixed.sql
\\i database/init/05_functions_triggers_fixed.sql
```

#### Step 2: Create Data Sync Functions

```sql
-- Create sync function for real-time data sync
CREATE OR REPLACE FUNCTION sync_connections_v1_to_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync INSERT/UPDATE/DELETE between v1 and v2
    IF TG_OP = 'INSERT' THEN
        INSERT INTO litellm_connections_v2.LiteLLM_UserConnections (
            connection_id,
            user_id,
            connection_name,
            provider,
            configuration,
            created_at
        ) VALUES (
            'conn_' || NEW.connection_id::text,
            NEW.user_id,
            NEW.connection_name,
            NEW.provider,
            NEW.configuration::json,
            NEW.created_at
        );
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE and DELETE operations
    -- ... additional sync logic ...
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sync
CREATE TRIGGER sync_connections_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.LiteLLM_UserConnections
    FOR EACH ROW EXECUTE FUNCTION sync_connections_v1_to_v2();
```

## Post-Migration Tasks

### 1. Application Configuration Update

```bash
# Update application configuration
# File: src/config/settings.py

# Update database connection settings
DATABASE_SCHEMA_VERSION = "2.0"
ENABLE_LEGACY_COMPATIBILITY = False  # Set to True if running parallel

# Update API endpoint configurations
API_VERSION = "v2"
CONNECTION_ID_FORMAT = "conn_*"  # New format
```

### 2. Monitoring and Alerting

```sql
-- Create monitoring views for operations team
CREATE VIEW connection_health_summary AS
SELECT 
    provider,
    COUNT(*) as total_connections,
    COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy_connections,
    COUNT(CASE WHEN health_status = 'unhealthy' THEN 1 END) as unhealthy_connections,
    AVG(avg_response_time_ms) as avg_response_time
FROM LiteLLM_UserConnections
GROUP BY provider;

-- Create alerting function
CREATE OR REPLACE FUNCTION check_connection_health()
RETURNS TABLE(alert_type text, message text) AS $$
BEGIN
    -- Check for unhealthy connections
    RETURN QUERY
    SELECT 
        'CONNECTION_HEALTH'::text,
        'Connection ' || connection_name || ' is unhealthy'::text
    FROM LiteLLM_UserConnections
    WHERE health_status = 'unhealthy'
    AND last_health_check > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

### 3. Performance Optimization

```sql
-- Create additional indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_connections_user_provider 
ON LiteLLM_UserConnections(user_id, provider);

CREATE INDEX CONCURRENTLY idx_connections_health_status 
ON LiteLLM_UserConnections(health_status, last_health_check);

CREATE INDEX CONCURRENTLY idx_activity_timestamp_connection 
ON LiteLLM_ConnectionActivity(timestamp, connection_id);

-- Update table statistics
ANALYZE LiteLLM_UserConnections;
ANALYZE LiteLLM_AccessPolicies;
ANALYZE LiteLLM_ConnectionActivity;
```

## Rollback Procedures

### Emergency Rollback (if needed)

```sql
-- Emergency rollback to v1 (if migration fails)
BEGIN;

-- Restore from backup tables
DROP TABLE IF EXISTS LiteLLM_UserConnections;
DROP TABLE IF EXISTS LiteLLM_AccessPolicies;
DROP TABLE IF EXISTS LiteLLM_UserAccessPolicies;
DROP TABLE IF EXISTS LiteLLM_ConnectionActivity;

-- Rename backup tables back
ALTER TABLE LiteLLM_UserConnections_v1_backup RENAME TO LiteLLM_UserConnections;
ALTER TABLE LiteLLM_AccessPolicies_v1_backup RENAME TO LiteLLM_AccessPolicies;
ALTER TABLE LiteLLM_UserAccessPolicies_v1_backup RENAME TO LiteLLM_UserAccessPolicies;
ALTER TABLE LiteLLM_ConnectionActivity_v1_backup RENAME TO LiteLLM_ConnectionActivity;

COMMIT;
```

### Planned Rollback (after validation)

```bash
# If rollback is needed after successful migration
# Create rollback script
cat > rollback_to_v1.sql << 'EOF'
-- Rollback script - use only if v2 migration needs to be undone
-- This script converts v2 back to v1 format

BEGIN;

-- Convert v2 data back to v1 format
INSERT INTO LiteLLM_UserConnections_v1_backup
SELECT 
    uuid(substr(connection_id, 6)),  -- Remove 'conn_' prefix, convert to UUID
    user_id,
    connection_name,
    provider,
    status,
    configuration::jsonb,  -- Convert JSON to JSONB
    credentials_encrypted,
    created_at,
    updated_at
FROM LiteLLM_UserConnections;

-- Repeat for other tables...

COMMIT;
EOF
```

## Troubleshooting Common Issues

### Issue 1: Foreign Key Constraint Violations

```sql
-- Diagnose foreign key issues
SELECT 
    uc.user_id,
    uc.connection_name,
    ut.user_id as valid_user_id
FROM LiteLLM_UserConnections uc
LEFT JOIN LiteLLM_UserTable ut ON uc.user_id = ut.user_id
WHERE ut.user_id IS NULL;

-- Resolution: Create missing users or remove orphaned connections
-- Option 1: Remove orphaned connections
DELETE FROM LiteLLM_UserConnections 
WHERE user_id NOT IN (SELECT user_id FROM LiteLLM_UserTable);

-- Option 2: Create placeholder users
INSERT INTO LiteLLM_UserTable (user_id, user_email, user_role)
SELECT DISTINCT user_id, user_id || '@placeholder.com', 'User'
FROM LiteLLM_UserConnections 
WHERE user_id NOT IN (SELECT user_id FROM LiteLLM_UserTable);
```

### Issue 2: JSON Type Conversion Errors

```sql
-- Diagnose JSON conversion issues
SELECT 
    connection_id,
    configuration,
    CASE 
        WHEN configuration::text = 'null' THEN 'NULL_VALUE'
        WHEN json_typeof(configuration::json) = 'object' THEN 'VALID_JSON'
        ELSE 'INVALID_JSON'
    END as json_status
FROM LiteLLM_UserConnections
WHERE json_typeof(configuration::json) != 'object';

-- Resolution: Fix invalid JSON
UPDATE LiteLLM_UserConnections 
SET configuration = '{}'::json 
WHERE configuration IS NULL OR configuration::text = 'null';
```

### Issue 3: Partition Creation Issues

```sql
-- Check partition status
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE 'LiteLLM_ConnectionActivity%'
ORDER BY tablename;

-- Create missing partitions
CREATE TABLE LiteLLM_ConnectionActivity_202406 
PARTITION OF LiteLLM_ConnectionActivity 
FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- Verify partition constraints
SELECT 
    schemaname,
    tablename,
    pg_get_expr(pg_class.relpartbound, pg_class.oid) as partition_bounds
FROM pg_tables
JOIN pg_class ON pg_class.relname = tablename
WHERE tablename LIKE 'LiteLLM_ConnectionActivity_%';
```

## Validation Checklist

### Pre-Migration Validation

- [ ] Database backup completed and verified
- [ ] LiteLLM core tables present and accessible
- [ ] Required PostgreSQL extensions available
- [ ] Sufficient disk space for migration
- [ ] Application downtime window scheduled (if required)
- [ ] Rollback procedures tested

### Migration Validation

- [ ] All new tables created successfully
- [ ] Foreign key constraints established
- [ ] Data migration completed without errors
- [ ] Primary key format validation passed
- [ ] JSON field conversion successful
- [ ] Index creation completed
- [ ] Trigger functions installed

### Post-Migration Validation

- [ ] Application connects to new schema successfully
- [ ] API endpoints respond correctly
- [ ] Sample operations complete successfully
- [ ] Performance metrics within acceptable range
- [ ] Monitoring and alerting configured
- [ ] Documentation updated

### Production Readiness

- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup procedures updated
- [ ] Monitoring dashboards updated
- [ ] Team training completed
- [ ] Incident response procedures updated

## Support and Maintenance

### Ongoing Monitoring

```sql
-- Daily health check query
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_connections,
    COUNT(DISTINCT user_id) as active_users,
    AVG(avg_response_time_ms) as avg_response_time
FROM LiteLLM_UserConnections
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Weekly partition maintenance
SELECT 
    'CREATE TABLE LiteLLM_ConnectionActivity_' || to_char(CURRENT_DATE + INTERVAL '1 month', 'YYYYMM') ||
    ' PARTITION OF LiteLLM_ConnectionActivity FOR VALUES FROM (''' ||
    to_char(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'), 'YYYY-MM-DD') ||
    ''') TO (''' ||
    to_char(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months'), 'YYYY-MM-DD') ||
    ''');' as create_partition_sql;
```

### Contact Information

- **Technical Support:** Available through GitHub Issues
- **Emergency Contact:** Database team escalation procedures
- **Documentation:** `/root/docs/` directory
- **Migration Scripts:** `/root/database/migrations/` directory

---

**Migration Guide Version:** 1.0  
**Last Updated:** June 18, 2025  
**Next Review:** Monthly or after major LiteLLM updates