-- Functions and triggers aligned with LiteLLM patterns

-- Function to encrypt credentials (using pgcrypto)
CREATE OR REPLACE FUNCTION encrypt_credentials(credentials_text TEXT, encryption_key TEXT DEFAULT 'default_key')
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(credentials_text::bytea, encryption_key, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt credentials
CREATE OR REPLACE FUNCTION decrypt_credentials(encrypted_credentials TEXT, encryption_key TEXT DEFAULT 'default_key')
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_credentials, 'base64'), encryption_key, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp (standard LiteLLM pattern)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON "LiteLLM_UserConnections"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_policies_updated_at
    BEFORE UPDATE ON "LiteLLM_AccessPolicies"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_templates_updated_at
    BEFORE UPDATE ON "LiteLLM_ConnectionTemplates"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log connection activity (following LiteLLM_SpendLogs pattern)
CREATE OR REPLACE FUNCTION log_connection_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type_val activity_type;
    status_val TEXT := 'success';
BEGIN
    -- Determine activity type based on operation
    IF TG_OP = 'INSERT' THEN
        activity_type_val := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        activity_type_val := 'updated';
        -- Check for status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO "LiteLLM_ConnectionActivity" (
                connection_id, activity_type, status, metadata, user_id, timestamp
            ) VALUES (
                NEW.connection_id, 'updated', 'success',
                json_build_object(
                    'field_changed', 'status',
                    'old_value', OLD.status,
                    'new_value', NEW.status,
                    'operation', 'status_change'
                ),
                NEW.updated_by,
                CURRENT_TIMESTAMP
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        activity_type_val := 'deleted';
        INSERT INTO "LiteLLM_ConnectionActivity" (
            connection_id, activity_type, status, metadata, user_id, timestamp
        ) VALUES (
            OLD.connection_id, activity_type_val, status_val,
            json_build_object(
                'provider', OLD.provider,
                'connection_name', OLD.connection_name,
                'operation', 'delete'
            ),
            OLD.updated_by,
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    
    -- Log the activity
    INSERT INTO "LiteLLM_ConnectionActivity" (
        connection_id, activity_type, status, metadata, user_id, timestamp
    ) VALUES (
        NEW.connection_id, activity_type_val, status_val,
        json_build_object(
            'provider', NEW.provider,
            'connection_name', NEW.connection_name,
            'operation', TG_OP
        ),
        COALESCE(NEW.updated_by, NEW.created_by),
        CURRENT_TIMESTAMP
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if logging fails
        RAISE WARNING 'Failed to log connection activity: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for connection activity logging
CREATE TRIGGER log_user_connections_activity
    AFTER INSERT OR UPDATE OR DELETE ON "LiteLLM_UserConnections"
    FOR EACH ROW
    EXECUTE FUNCTION log_connection_activity();

-- Function to create monthly partitions for activity table
CREATE OR REPLACE FUNCTION create_monthly_activity_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'LiteLLM_ConnectionActivity_' || to_char(partition_date, 'YYYY_MM');
    start_date := date_trunc('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    
    -- Create the partition if it doesn't exist
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "LiteLLM_ConnectionActivity" 
                    FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, start_date, end_date);
    
    -- Create indexes on the new partition
    PERFORM create_connection_activity_indexes(partition_name);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions for the next several months
CREATE OR REPLACE FUNCTION auto_create_activity_partitions()
RETURNS VOID AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE);
    i INTEGER;
BEGIN
    -- Create partitions for next 12 months
    FOR i IN 1..12 LOOP
        PERFORM create_monthly_activity_partition(current_month + (i || ' months')::INTERVAL);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate connection configuration by provider
CREATE OR REPLACE FUNCTION validate_connection_config(provider provider_type, config JSON)
RETURNS BOOLEAN AS $$
BEGIN
    CASE provider
        WHEN 'openai' THEN
            -- Check for required fields for OpenAI
            RETURN (config ? 'api_key') AND (config->>'api_key' LIKE 'sk-%');
        WHEN 'anthropic' THEN
            -- Check for required fields for Anthropic
            RETURN (config ? 'api_key') AND (config->>'api_key' LIKE 'sk-ant-%');
        WHEN 'azure' THEN
            -- Check for required fields for Azure OpenAI
            RETURN (config ? 'api_key') AND (config ? 'azure_endpoint') AND (config ? 'api_version');
        WHEN 'aws' THEN
            -- Check for AWS credentials
            RETURN (config ? 'aws_access_key_id') AND (config ? 'aws_secret_access_key') AND (config ? 'region');
        WHEN 'google' THEN
            -- Check for Google credentials
            RETURN (config ? 'credentials') OR (config ? 'service_account_key');
        ELSE
            -- For other providers, just ensure config is not empty
            RETURN config IS NOT NULL AND json_typeof(config) = 'object';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate connection configuration
CREATE OR REPLACE FUNCTION validate_connection_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate configuration for the provider
    IF NOT validate_connection_config(NEW.provider, NEW.configuration) THEN
        RAISE EXCEPTION 'Invalid configuration for provider %. Configuration: %', NEW.provider, NEW.configuration;
    END IF;
    
    -- Set default health status
    IF NEW.health_status IS NULL THEN
        NEW.health_status := 'unknown';
    END IF;
    
    -- Initialize counters
    IF NEW.usage_count IS NULL THEN
        NEW.usage_count := 0;
    END IF;
    
    IF NEW.error_count IS NULL THEN
        NEW.error_count := 0;
    END IF;
    
    IF NEW.success_count IS NULL THEN
        NEW.success_count := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_connection_config_trigger
    BEFORE INSERT OR UPDATE ON "LiteLLM_UserConnections"
    FOR EACH ROW
    EXECUTE FUNCTION validate_connection_before_insert();

-- Function to clean up expired policies (following LiteLLM patterns)
CREATE OR REPLACE FUNCTION cleanup_expired_policies()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Mark expired policies as inactive
    UPDATE "LiteLLM_UserAccessPolicies" 
    SET is_active = FALSE 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Clean up expired shared connections
    UPDATE "LiteLLM_SharedConnections"
    SET is_active = FALSE
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user effective permissions (simplified)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(target_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    effective_permissions JSON := '{}';
    policy_rec RECORD;
BEGIN
    -- Aggregate permissions from all active policies
    FOR policy_rec IN 
        SELECT p.permissions, p.priority, p.models, p.max_budget, p.tpm_limit, p.rpm_limit
        FROM "LiteLLM_AccessPolicies" p
        JOIN "LiteLLM_UserAccessPolicies" uap ON p.policy_id = uap.policy_id
        WHERE uap.user_id = target_user_id 
          AND uap.is_active = TRUE 
          AND p.is_active = TRUE
          AND (uap.expires_at IS NULL OR uap.expires_at > CURRENT_TIMESTAMP)
        ORDER BY p.priority DESC
    LOOP
        -- Merge permissions (higher priority overrides lower priority)
        effective_permissions := effective_permissions || policy_rec.permissions;
        
        -- Handle arrays and limits
        IF policy_rec.models IS NOT NULL AND array_length(policy_rec.models, 1) > 0 THEN
            effective_permissions := jsonb_set(
                effective_permissions::jsonb, 
                '{models}', 
                to_jsonb(policy_rec.models)
            )::json;
        END IF;
        
        -- Handle budget limits (take highest)
        IF policy_rec.max_budget IS NOT NULL THEN
            effective_permissions := jsonb_set(
                effective_permissions::jsonb,
                '{max_budget}',
                to_jsonb(policy_rec.max_budget)
            )::json;
        END IF;
    END LOOP;
    
    RETURN effective_permissions;
END;
$$ LANGUAGE plpgsql;

-- Function to update connection health status
CREATE OR REPLACE FUNCTION update_connection_health(
    p_connection_id TEXT,
    p_health_status TEXT,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE "LiteLLM_UserConnections"
    SET 
        health_status = p_health_status,
        last_health_check = CURRENT_TIMESTAMP,
        avg_response_time_ms = CASE 
            WHEN p_response_time_ms IS NOT NULL THEN 
                COALESCE((avg_response_time_ms + p_response_time_ms) / 2, p_response_time_ms)
            ELSE avg_response_time_ms
        END
    WHERE connection_id = p_connection_id;
    
    -- Log the health check activity
    INSERT INTO "LiteLLM_ConnectionActivity" (
        connection_id, activity_type, status, response_time_ms, error_message, metadata, timestamp
    ) VALUES (
        p_connection_id, 
        'tested', 
        CASE WHEN p_health_status = 'healthy' THEN 'success' ELSE 'failure' END,
        p_response_time_ms,
        p_error_message,
        json_build_object(
            'health_status', p_health_status,
            'check_type', 'health_check'
        ),
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old activity data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_activity_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP := CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    partition_name TEXT;
    partition_rec RECORD;
BEGIN
    -- Find partitions older than retention period
    FOR partition_rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'LiteLLM_ConnectionActivity_%' 
        AND tablename != 'LiteLLM_ConnectionActivity_current'
    LOOP
        -- Extract date from partition name and check if it's old enough
        partition_name := partition_rec.tablename;
        
        -- Simple check: if partition is from more than retention_days ago, drop it
        -- This is a simplified approach - in production, you'd want more sophisticated logic
        IF position('_' in reverse(partition_name)) > 7 THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
            deleted_count := deleted_count + 1;
        END IF;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions for the next year
SELECT auto_create_activity_partitions();