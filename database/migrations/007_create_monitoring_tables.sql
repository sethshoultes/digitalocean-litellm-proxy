-- Migration 007: Create Monitoring and Logging tables
-- LiteLLM_AuditLog, LiteLLM_ErrorLogs, LiteLLM_HealthCheckTable
-- Date: 2024-12-19
-- Priority: P1 - Medium

-- Audit Log Table - Comprehensive audit trail for all administrative actions
CREATE TABLE IF NOT EXISTS "LiteLLM_AuditLog" (
    audit_id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 TEXT,
    action                  TEXT NOT NULL,
    resource_type           TEXT NOT NULL,
    resource_id             TEXT,
    details                 JSONB DEFAULT '{}',
    ip_address              INET,
    user_agent              TEXT,
    timestamp               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional audit fields
    session_id              TEXT,
    request_id              TEXT,
    api_key                 TEXT,
    organization_id         TEXT,
    team_id                 TEXT,
    endpoint                TEXT,
    http_method             TEXT,
    status_code             INT,
    processing_time_ms      INT,
    before_state            JSONB,
    after_state             JSONB,
    failure_reason          TEXT,
    severity                TEXT DEFAULT 'INFO',
    
    -- Constraints
    CONSTRAINT valid_action CHECK (LENGTH(action) >= 1),
    CONSTRAINT valid_resource_type CHECK (LENGTH(resource_type) >= 1),
    CONSTRAINT valid_details CHECK (jsonb_typeof(details) = 'object'),
    CONSTRAINT valid_status_code CHECK (status_code IS NULL OR (status_code >= 100 AND status_code <= 599)),
    CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),
    CONSTRAINT valid_severity CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE SET NULL
    
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for audit logs
CREATE TABLE IF NOT EXISTS "LiteLLM_AuditLog_y2024m12" 
PARTITION OF "LiteLLM_AuditLog" 
FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_AuditLog_y2025m01" 
PARTITION OF "LiteLLM_AuditLog" 
FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_AuditLog_y2025m02" 
PARTITION OF "LiteLLM_AuditLog" 
FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

-- Error Logs Table - Comprehensive error tracking and debugging
CREATE TABLE IF NOT EXISTS "LiteLLM_ErrorLogs" (
    error_id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    error_type              TEXT NOT NULL,
    error_message           TEXT NOT NULL,
    error_code              TEXT,
    stack_trace             TEXT,
    request_id              TEXT,
    user_id                 TEXT,
    api_key                 TEXT,
    model                   TEXT,
    provider                TEXT,
    endpoint                TEXT,
    http_method             TEXT,
    status_code             INT,
    request_data            JSONB,
    response_data           JSONB,
    
    -- Additional error context
    session_id              TEXT,
    ip_address              INET,
    user_agent              TEXT,
    organization_id         TEXT,
    team_id                 TEXT,
    processing_time_ms      INT,
    retry_count             INT DEFAULT 0,
    is_resolved             BOOLEAN DEFAULT FALSE,
    resolved_at             TIMESTAMPTZ,
    resolved_by             TEXT,
    resolution_notes        TEXT,
    severity                TEXT DEFAULT 'ERROR',
    category                TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_error_type CHECK (LENGTH(error_type) >= 1),
    CONSTRAINT valid_error_message CHECK (LENGTH(error_message) >= 1),
    CONSTRAINT valid_status_code CHECK (status_code IS NULL OR (status_code >= 100 AND status_code <= 599)),
    CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
    CONSTRAINT valid_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT valid_request_data CHECK (request_data IS NULL OR jsonb_typeof(request_data) = 'object'),
    CONSTRAINT valid_response_data CHECK (response_data IS NULL OR jsonb_typeof(response_data) = 'object'),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE SET NULL
    
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for error logs
CREATE TABLE IF NOT EXISTS "LiteLLM_ErrorLogs_y2024m12" 
PARTITION OF "LiteLLM_ErrorLogs" 
FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_ErrorLogs_y2025m01" 
PARTITION OF "LiteLLM_ErrorLogs" 
FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS "LiteLLM_ErrorLogs_y2025m02" 
PARTITION OF "LiteLLM_ErrorLogs" 
FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

-- Health Check Table - System and service health monitoring
CREATE TABLE IF NOT EXISTS "LiteLLM_HealthCheckTable" (
    check_id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_name              TEXT NOT NULL,
    service_type            TEXT NOT NULL,
    service_identifier      TEXT NOT NULL,
    status                  TEXT NOT NULL,
    response_time_ms        INT,
    timestamp               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Health check details
    endpoint_url            TEXT,
    http_status_code        INT,
    response_body           TEXT,
    error_message           TEXT,
    metadata                JSONB DEFAULT '{}',
    
    -- Service information
    provider                TEXT,
    model                   TEXT,
    region                  TEXT,
    version                 TEXT,
    
    -- Monitoring context
    check_type              TEXT DEFAULT 'automated',
    scheduled_by            TEXT,
    triggered_by            TEXT,
    alert_sent              BOOLEAN DEFAULT FALSE,
    alert_level             TEXT,
    
    -- Constraints
    CONSTRAINT valid_check_name CHECK (LENGTH(check_name) >= 1),
    CONSTRAINT valid_service_type CHECK (service_type IN ('model', 'provider', 'database', 'cache', 'external_api', 'system')),
    CONSTRAINT valid_status CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown', 'maintenance')),
    CONSTRAINT valid_response_time CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    CONSTRAINT valid_http_status CHECK (http_status_code IS NULL OR (http_status_code >= 100 AND http_status_code <= 599)),
    CONSTRAINT valid_check_type CHECK (check_type IN ('automated', 'manual', 'triggered')),
    CONSTRAINT valid_alert_level CHECK (alert_level IS NULL OR alert_level IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT unique_service_check UNIQUE (service_type, service_identifier, timestamp)
);

-- User Notifications Table - System notifications and alerts
CREATE TABLE IF NOT EXISTS "LiteLLM_UserNotifications" (
    notification_id         TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 TEXT NOT NULL,
    title                   TEXT NOT NULL,
    message                 TEXT NOT NULL,
    notification_type       TEXT NOT NULL,
    priority                TEXT DEFAULT 'medium',
    is_read                 BOOLEAN DEFAULT FALSE,
    is_dismissed            BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    read_at                 TIMESTAMPTZ,
    dismissed_at            TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    
    -- Notification context
    source                  TEXT,
    source_id               TEXT,
    action_url              TEXT,
    action_text             TEXT,
    category                TEXT,
    tags                    TEXT[] DEFAULT '{}',
    metadata                JSONB DEFAULT '{}',
    
    -- Delivery tracking
    delivery_method         TEXT[] DEFAULT ARRAY['in_app'],
    email_sent              BOOLEAN DEFAULT FALSE,
    email_sent_at           TIMESTAMPTZ,
    slack_sent              BOOLEAN DEFAULT FALSE,
    slack_sent_at           TIMESTAMPTZ,
    webhook_sent            BOOLEAN DEFAULT FALSE,
    webhook_sent_at         TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_title CHECK (LENGTH(title) >= 1),
    CONSTRAINT valid_message CHECK (LENGTH(message) >= 1),
    CONSTRAINT valid_notification_type CHECK (
        notification_type IN ('info', 'warning', 'error', 'success', 'budget_alert', 'system_alert', 'security_alert')
    ),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_delivery_method CHECK (
        delivery_method <@ ARRAY['in_app', 'email', 'slack', 'webhook', 'sms']
    ),
    CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE
);

-- Add indexes for performance

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "LiteLLM_AuditLog"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "LiteLLM_AuditLog"(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON "LiteLLM_AuditLog"(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON "LiteLLM_AuditLog"(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON "LiteLLM_AuditLog"(severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id ON "LiteLLM_AuditLog"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_team_id ON "LiteLLM_AuditLog"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_details ON "LiteLLM_AuditLog" USING GIN(details);

-- Error Logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON "LiteLLM_ErrorLogs"(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON "LiteLLM_ErrorLogs"(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON "LiteLLM_ErrorLogs"(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON "LiteLLM_ErrorLogs"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_model ON "LiteLLM_ErrorLogs"(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_provider ON "LiteLLM_ErrorLogs"(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON "LiteLLM_ErrorLogs"(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_logs_status_code ON "LiteLLM_ErrorLogs"(status_code) WHERE status_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON "LiteLLM_ErrorLogs"(category) WHERE category IS NOT NULL;

-- Health Check indexes
CREATE INDEX IF NOT EXISTS idx_health_check_service_type ON "LiteLLM_HealthCheckTable"(service_type);
CREATE INDEX IF NOT EXISTS idx_health_check_service_identifier ON "LiteLLM_HealthCheckTable"(service_identifier);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON "LiteLLM_HealthCheckTable"(status);
CREATE INDEX IF NOT EXISTS idx_health_check_timestamp ON "LiteLLM_HealthCheckTable"(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_check_provider ON "LiteLLM_HealthCheckTable"(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_check_model ON "LiteLLM_HealthCheckTable"(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_check_alert_sent ON "LiteLLM_HealthCheckTable"(alert_sent) WHERE alert_sent = TRUE;

-- User Notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON "LiteLLM_UserNotifications"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON "LiteLLM_UserNotifications"(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON "LiteLLM_UserNotifications"(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_type ON "LiteLLM_UserNotifications"(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON "LiteLLM_UserNotifications"(priority);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires_at ON "LiteLLM_UserNotifications"(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_category ON "LiteLLM_UserNotifications"(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_tags ON "LiteLLM_UserNotifications" USING GIN(tags);

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_AuditLog" IS 'Comprehensive audit trail for all administrative actions and API calls';
COMMENT ON COLUMN "LiteLLM_AuditLog".action IS 'The action performed (create, update, delete, etc.)';
COMMENT ON COLUMN "LiteLLM_AuditLog".resource_type IS 'Type of resource affected (user, key, model, etc.)';
COMMENT ON COLUMN "LiteLLM_AuditLog".before_state IS 'Resource state before the action';
COMMENT ON COLUMN "LiteLLM_AuditLog".after_state IS 'Resource state after the action';

COMMENT ON TABLE "LiteLLM_ErrorLogs" IS 'Detailed error tracking and debugging information';
COMMENT ON COLUMN "LiteLLM_ErrorLogs".error_type IS 'Category of error (authentication, rate_limit, provider_error, etc.)';
COMMENT ON COLUMN "LiteLLM_ErrorLogs".stack_trace IS 'Full stack trace for debugging';
COMMENT ON COLUMN "LiteLLM_ErrorLogs".retry_count IS 'Number of retry attempts made';

COMMENT ON TABLE "LiteLLM_HealthCheckTable" IS 'System and service health monitoring data';
COMMENT ON COLUMN "LiteLLM_HealthCheckTable".service_type IS 'Type of service being monitored';
COMMENT ON COLUMN "LiteLLM_HealthCheckTable".response_time_ms IS 'Response time in milliseconds';

COMMENT ON TABLE "LiteLLM_UserNotifications" IS 'User notifications and system alerts';
COMMENT ON COLUMN "LiteLLM_UserNotifications".notification_type IS 'Type of notification (info, warning, error, etc.)';
COMMENT ON COLUMN "LiteLLM_UserNotifications".delivery_method IS 'Methods used to deliver notification';