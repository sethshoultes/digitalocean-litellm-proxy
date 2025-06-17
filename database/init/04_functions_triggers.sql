-- Functions and triggers for connection management

-- Function to encrypt credentials
CREATE OR REPLACE FUNCTION encrypt_credentials(credentials_text TEXT, encryption_key TEXT DEFAULT 'default_key')
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(credentials_text::bytea, encryption_key, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt credentials
CREATE OR REPLACE FUNCTION decrypt_credentials(encrypted_credentials TEXT, encryption_key TEXT DEFAULT 'default_key')
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_credentials, 'base64'), encryption_key, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user connections updated_at
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON "LiteLLM_UserConnections"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for access policies updated_at
CREATE TRIGGER update_access_policies_updated_at
    BEFORE UPDATE ON "LiteLLM_AccessPolicies"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log connection activity
CREATE OR REPLACE FUNCTION log_connection_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log connection changes to activity table
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "LiteLLM_ConnectionActivity" (
            connection_id, activity_type, status, metadata, user_id
        ) VALUES (
            NEW.connection_id, 'created', 'success', 
            jsonb_build_object('provider', NEW.provider, 'name', NEW.connection_name),
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log significant changes
        IF OLD.status != NEW.status THEN
            INSERT INTO "LiteLLM_ConnectionActivity" (
                connection_id, activity_type, status, metadata, user_id
            ) VALUES (
                NEW.connection_id, 'updated', 'success',
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
                NEW.updated_by
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "LiteLLM_ConnectionActivity" (
            connection_id, activity_type, status, metadata, user_id
        ) VALUES (
            OLD.connection_id, 'deleted', 'success',
            jsonb_build_object('provider', OLD.provider, 'name', OLD.connection_name),
            OLD.updated_by
        );
    END IF;
    
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
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "LiteLLM_ConnectionActivity" 
                    FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, start_date, end_date);
    
    -- Create indexes on the new partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (connection_id)', 
                   'idx_' || partition_name || '_connection_id', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (timestamp DESC)', 
                   'idx_' || partition_name || '_timestamp', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (activity_type)', 
                   'idx_' || partition_name || '_type', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I USING GIN (metadata)', 
                   'idx_' || partition_name || '_metadata_gin', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions
CREATE OR REPLACE FUNCTION auto_create_activity_partitions()
RETURNS VOID AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE);
    i INTEGER;
BEGIN
    -- Create partitions for next 6 months
    FOR i IN 1..6 LOOP
        PERFORM create_monthly_activity_partition(current_month + (i || ' months')::INTERVAL);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate connection configuration
CREATE OR REPLACE FUNCTION validate_connection_config(provider provider_type, config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    CASE provider
        WHEN 'openai' THEN
            RETURN config ? 'api_key' AND config ? 'model';
        WHEN 'anthropic' THEN
            RETURN config ? 'api_key' AND config ? 'model';
        WHEN 'azure' THEN
            RETURN config ? 'api_key' AND config ? 'api_base' AND config ? 'api_version';
        WHEN 'aws' THEN
            RETURN config ? 'aws_access_key_id' AND config ? 'aws_secret_access_key' AND config ? 'region';
        ELSE
            RETURN config IS NOT NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate connection configuration
CREATE OR REPLACE FUNCTION validate_connection_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_connection_config(NEW.provider, NEW.configuration) THEN
        RAISE EXCEPTION 'Invalid configuration for provider %', NEW.provider;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_connection_config_trigger
    BEFORE INSERT OR UPDATE ON "LiteLLM_UserConnections"
    FOR EACH ROW
    EXECUTE FUNCTION validate_connection_before_insert();

-- Function to clean up expired policies
CREATE OR REPLACE FUNCTION cleanup_expired_policies()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE "LiteLLM_UserAccessPolicies" 
    SET is_active = FALSE 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user effective permissions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(target_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    effective_permissions JSONB := '{}';
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT p.permissions, p.priority 
        FROM "LiteLLM_AccessPolicies" p
        JOIN "LiteLLM_UserAccessPolicies" uap ON p.policy_id = uap.policy_id
        WHERE uap.user_id = target_user_id 
          AND uap.is_active = TRUE 
          AND p.is_active = TRUE
          AND (uap.expires_at IS NULL OR uap.expires_at > CURRENT_TIMESTAMP)
        ORDER BY p.priority DESC
    LOOP
        effective_permissions := effective_permissions || policy_rec.permissions;
    END LOOP;
    
    RETURN effective_permissions;
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions
SELECT auto_create_activity_partitions();