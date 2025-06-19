-- Master Migration Script - LiteLLM Full Compatibility
-- Runs all migration scripts in order for complete LiteLLM compatibility
-- Date: 2024-12-19
-- Priority: P0 - Critical

-- This script implements Phase 1 of the LiteLLM Full Compatibility project
-- It creates all 19+ missing LiteLLM tables for full compatibility

BEGIN;

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_history (
    migration_id TEXT PRIMARY KEY,
    migration_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    status TEXT DEFAULT 'success',
    error_message TEXT
);

-- Function to log migration execution
CREATE OR REPLACE FUNCTION log_migration(
    migration_id TEXT,
    migration_name TEXT,
    start_time TIMESTAMPTZ,
    status TEXT DEFAULT 'success',
    error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    execution_time_ms INT;
BEGIN
    execution_time_ms := EXTRACT(epoch FROM (CURRENT_TIMESTAMP - start_time)) * 1000;
    
    INSERT INTO migration_history (migration_id, migration_name, execution_time_ms, status, error_message)
    VALUES (migration_id, migration_name, execution_time_ms, status, error_message)
    ON CONFLICT (migration_id) DO UPDATE SET
        executed_at = CURRENT_TIMESTAMP,
        execution_time_ms = EXCLUDED.execution_time_ms,
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message;
END;
$$ LANGUAGE plpgsql;

-- Check if migration was already executed
CREATE OR REPLACE FUNCTION migration_executed(migration_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM migration_history 
        WHERE migration_history.migration_id = migration_executed.migration_id 
        AND status = 'success'
    );
END;
$$ LANGUAGE plpgsql;

-- Variables for timing
DO $$
DECLARE
    start_time TIMESTAMPTZ;
    total_start_time TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
    RAISE NOTICE 'Starting LiteLLM Full Compatibility Migration...';
    RAISE NOTICE 'Timestamp: %', total_start_time;
    
    -- Migration 001: LiteLLM_VerificationToken (CRITICAL - Virtual Keys)
    IF NOT migration_executed('001') THEN
        RAISE NOTICE 'Executing Migration 001: LiteLLM_VerificationToken table...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            -- Execute migration 001 content here
            \i /root/database/migrations/001_create_verification_token_table.sql
            
            PERFORM log_migration('001', 'Create LiteLLM_VerificationToken table', start_time);
            RAISE NOTICE 'Migration 001 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('001', 'Create LiteLLM_VerificationToken table', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 001 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 001 already executed, skipping...';
    END IF;
    
    -- Migration 002: LiteLLM_BudgetTable (CRITICAL - Budget Management)
    IF NOT migration_executed('002') THEN
        RAISE NOTICE 'Executing Migration 002: LiteLLM_BudgetTable...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/002_create_budget_table.sql
            
            PERFORM log_migration('002', 'Create LiteLLM_BudgetTable', start_time);
            RAISE NOTICE 'Migration 002 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('002', 'Create LiteLLM_BudgetTable', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 002 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 002 already executed, skipping...';
    END IF;
    
    -- Migration 003: LiteLLM_SpendLogs (CRITICAL - Spend Tracking)
    IF NOT migration_executed('003') THEN
        RAISE NOTICE 'Executing Migration 003: LiteLLM_SpendLogs with partitioning...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/003_create_spend_logs_table.sql
            
            PERFORM log_migration('003', 'Create LiteLLM_SpendLogs with partitioning', start_time);
            RAISE NOTICE 'Migration 003 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('003', 'Create LiteLLM_SpendLogs with partitioning', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 003 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 003 already executed, skipping...';
    END IF;
    
    -- Migration 004: Update LiteLLM_UserTable for compatibility
    IF NOT migration_executed('004') THEN
        RAISE NOTICE 'Executing Migration 004: Update LiteLLM_UserTable compatibility...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/004_update_user_table_compatibility.sql
            
            PERFORM log_migration('004', 'Update LiteLLM_UserTable compatibility', start_time);
            RAISE NOTICE 'Migration 004 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('004', 'Update LiteLLM_UserTable compatibility', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 004 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 004 already executed, skipping...';
    END IF;
    
    -- Migration 005: Membership tables
    IF NOT migration_executed('005') THEN
        RAISE NOTICE 'Executing Migration 005: Organization and Team Membership tables...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/005_create_membership_tables.sql
            
            PERFORM log_migration('005', 'Create membership tables', start_time);
            RAISE NOTICE 'Migration 005 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('005', 'Create membership tables', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 005 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 005 already executed, skipping...';
    END IF;
    
    -- Migration 006: Model management tables
    IF NOT migration_executed('006') THEN
        RAISE NOTICE 'Executing Migration 006: Model management tables...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/006_create_model_management_tables.sql
            
            PERFORM log_migration('006', 'Create model management tables', start_time);
            RAISE NOTICE 'Migration 006 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('006', 'Create model management tables', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 006 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 006 already executed, skipping...';
    END IF;
    
    -- Migration 007: Monitoring and logging tables
    IF NOT migration_executed('007') THEN
        RAISE NOTICE 'Executing Migration 007: Monitoring and logging tables...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/007_create_monitoring_tables.sql
            
            PERFORM log_migration('007', 'Create monitoring and logging tables', start_time);
            RAISE NOTICE 'Migration 007 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('007', 'Create monitoring and logging tables', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 007 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 007 already executed, skipping...';
    END IF;
    
    -- Migration 008: Advanced features tables
    IF NOT migration_executed('008') THEN
        RAISE NOTICE 'Executing Migration 008: Advanced features tables...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/008_create_advanced_features_tables.sql
            
            PERFORM log_migration('008', 'Create advanced features tables', start_time);
            RAISE NOTICE 'Migration 008 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('008', 'Create advanced features tables', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 008 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 008 already executed, skipping...';
    END IF;
    
    -- Migration 009: Performance indexes
    IF NOT migration_executed('009') THEN
        RAISE NOTICE 'Executing Migration 009: Performance indexes...';
        start_time := CURRENT_TIMESTAMP;
        
        BEGIN
            \i /root/database/migrations/009_create_performance_indexes.sql
            
            PERFORM log_migration('009', 'Create performance indexes', start_time);
            RAISE NOTICE 'Migration 009 completed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                PERFORM log_migration('009', 'Create performance indexes', start_time, 'failed', SQLERRM);
                RAISE NOTICE 'Migration 009 failed: %', SQLERRM;
                RAISE;
        END;
    ELSE
        RAISE NOTICE 'Migration 009 already executed, skipping...';
    END IF;
    
    RAISE NOTICE 'All migrations completed successfully!';
    RAISE NOTICE 'Total execution time: % ms', EXTRACT(epoch FROM (CURRENT_TIMESTAMP - total_start_time)) * 1000;
    
END;
$$;

-- Create summary view of migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
    migration_id,
    migration_name,
    executed_at,
    execution_time_ms,
    status,
    CASE 
        WHEN status = 'success' THEN '✅'
        WHEN status = 'failed' THEN '❌'
        ELSE '⚠️'
    END as status_icon
FROM migration_history
ORDER BY migration_id;

-- Display migration status
SELECT 
    'LiteLLM Full Compatibility Migration Status' as title,
    COUNT(*) as total_migrations,
    COUNT(*) FILTER (WHERE status = 'success') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(AVG(execution_time_ms), 2) as avg_execution_time_ms
FROM migration_history;

-- Show detailed migration status
SELECT * FROM migration_status;

COMMIT;

-- Final verification queries
DO $$
BEGIN
    RAISE NOTICE '=== LiteLLM Compatibility Verification ===';
    
    -- Check critical tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_VerificationToken') THEN
        RAISE NOTICE '✅ LiteLLM_VerificationToken - Virtual Keys System';
    ELSE
        RAISE NOTICE '❌ LiteLLM_VerificationToken - MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_BudgetTable') THEN
        RAISE NOTICE '✅ LiteLLM_BudgetTable - Budget Management';
    ELSE
        RAISE NOTICE '❌ LiteLLM_BudgetTable - MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiteLLM_SpendLogs') THEN
        RAISE NOTICE '✅ LiteLLM_SpendLogs - Spend Tracking';
    ELSE
        RAISE NOTICE '❌ LiteLLM_SpendLogs - MISSING';
    END IF;
    
    -- Check user table has new columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiteLLM_UserTable' AND column_name = 'models') THEN
        RAISE NOTICE '✅ LiteLLM_UserTable - Enhanced with compatibility columns';
    ELSE
        RAISE NOTICE '❌ LiteLLM_UserTable - Missing compatibility columns';
    END IF;
    
    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'LiteLLM Full Compatibility Implementation Phase 1 completed successfully!';
    
END;
$$;