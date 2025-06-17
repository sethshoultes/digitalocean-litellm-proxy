# LiteLLM User Connection and Access Management Database Schema

**Version:** 1.0  
**Date:** June 17, 2025  
**Status:** Production Ready

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Table Definitions](#table-definitions)
3. [Relationships and Foreign Keys](#relationships-and-foreign-keys)
4. [Indexes and Performance](#indexes-and-performance)
5. [Migration Scripts](#migration-scripts)
6. [Data Models](#data-models)
7. [Sample Data](#sample-data)
8. [Security Considerations](#security-considerations)

---

## Schema Overview

### Database Design Principles

The LiteLLM User Connection and Access Management system follows these core database design principles:

- **Extensibility**: Built on existing LiteLLM schema with minimal disruption
- **Performance**: Optimized indexes and JSONB for flexible data storage
- **Security**: Encrypted credential storage and audit trails
- **Scalability**: Partitioning strategy for high-volume usage data
- **ACID Compliance**: Full transactional integrity with foreign key constraints

### Architecture Components

```mermaid
erDiagram
    LiteLLM_UserTable ||--o{ LiteLLM_UserConnections : "has many"
    LiteLLM_UserConnections ||--o{ LiteLLM_AccessPolicies : "governed by"
    LiteLLM_UserConnections ||--o{ LiteLLM_UserAccessPolicies : "permissions"
    LiteLLM_UserConnections ||--o{ LiteLLM_ConnectionActivity : "tracks"
    LiteLLM_UserConnections ||--o{ LiteLLM_VerificationTokenTable : "authenticated by"
    LiteLLM_UserConnections ||--o{ LiteLLM_SpendLogs : "spending tracked"
    
    LiteLLM_UserTable {
        string user_id PK
        string user_email
        string user_role
        jsonb connection_preferences
        string default_connection_id FK
        int max_connections
    }
    
    LiteLLM_UserConnections {
        string connection_id PK
        string user_id FK
        string connection_name
        string provider
        string status
        jsonb configuration
        text credentials_encrypted
        timestamp last_used
        timestamp created_at
        timestamp updated_at
    }
    
    LiteLLM_AccessPolicies {
        string policy_id PK
        string policy_name
        string resource_type
        jsonb permissions
        jsonb conditions
        string created_by FK
        timestamp created_at
    }
    
    LiteLLM_UserAccessPolicies {
        string user_id FK
        string policy_id FK
        timestamp granted_at
        string granted_by FK
    }
    
    LiteLLM_ConnectionActivity {
        string activity_id PK
        string connection_id FK
        string activity_type
        string status
        jsonb metadata
        timestamp timestamp
    }
```

### PostgreSQL Features Utilized

- **JSONB**: Flexible configuration and metadata storage with indexing
- **Triggers**: Automatic timestamp updates and data validation
- **Constraints**: Data integrity through check constraints and foreign keys
- **Indexes**: GIN indexes for JSONB fields, B-tree for common queries
- **Partitioning**: Date-based partitioning for activity logs
- **Encryption**: At-rest encryption for sensitive credential data

---

## Table Definitions

### Core Tables

#### 1. LiteLLM_UserConnections

Primary table for storing user connection configurations and metadata.

```sql
CREATE TABLE LiteLLM_UserConnections (
    connection_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    connection_name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'azure', 'vertex_ai', 'bedrock', 'cohere', 'huggingface')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'error')),
    connection_type TEXT NOT NULL CHECK (connection_type IN ('api_key', 'oauth', 'sso', 'service_account')),
    configuration JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT,
    metadata JSONB DEFAULT '{}',
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_user_connections_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE
);
```

**Column Descriptions:**

- `connection_id`: Unique identifier (format: `conn_[uuid]`)
- `user_id`: Reference to the connection owner
- `connection_name`: Human-readable name for the connection
- `provider`: LLM provider (OpenAI, Anthropic, etc.)
- `status`: Connection state (active/inactive/suspended/error)
- `connection_type`: Authentication method
- `configuration`: Provider-specific settings (JSONB)
- `credentials_encrypted`: Encrypted API keys and secrets
- `metadata`: Additional connection metadata (tags, descriptions)
- `last_used`: Timestamp of last successful request
- `usage_count`: Total number of requests made
- `expires_at`: Optional expiration timestamp

#### 2. LiteLLM_AccessPolicies

Template definitions for access control policies.

```sql
CREATE TABLE LiteLLM_AccessPolicies (
    policy_id TEXT PRIMARY KEY,
    policy_name TEXT NOT NULL,
    policy_description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('connection', 'model', 'organization', 'team')),
    permissions JSONB NOT NULL DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_access_policies_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL
);
```

**Sample Permissions Structure:**
```json
{
  "models": ["gpt-3.5-turbo", "gpt-4"],
  "rate_limits": {
    "requests_per_minute": 60,
    "tokens_per_minute": 90000
  },
  "budget_limits": {
    "monthly_limit": 100.00,
    "currency": "USD"
  },
  "operations": ["create", "read", "update", "delete"],
  "time_restrictions": {
    "allowed_hours": "09:00-17:00",
    "timezone": "UTC"
  }
}
```

#### 3. LiteLLM_UserAccessPolicies

Junction table linking users to access policies.

```sql
CREATE TABLE LiteLLM_UserAccessPolicies (
    user_id TEXT NOT NULL,
    policy_id TEXT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Composite primary key
    PRIMARY KEY (user_id, policy_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_user_access_policies_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_user_access_policies_policy_id 
        FOREIGN KEY (policy_id) 
        REFERENCES LiteLLM_AccessPolicies(policy_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_user_access_policies_granted_by 
        FOREIGN KEY (granted_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL
);
```

#### 4. LiteLLM_ConnectionActivity

Comprehensive activity and audit logging for connections.

```sql
CREATE TABLE LiteLLM_ConnectionActivity (
    activity_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    user_id TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('request', 'test', 'create', 'update', 'delete', 'auth_failure', 'rate_limit', 'error')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending', 'timeout')),
    request_id TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_incurred DECIMAL(10, 6) DEFAULT 0.00,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_connection_activity_connection_id 
        FOREIGN KEY (connection_id) 
        REFERENCES LiteLLM_UserConnections(connection_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_activity_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL
) PARTITION BY RANGE (timestamp);
```

### Extension Tables

#### 5. LiteLLM_ConnectionTemplates

Predefined connection templates for common providers.

```sql
CREATE TABLE LiteLLM_ConnectionTemplates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    default_configuration JSONB NOT NULL DEFAULT '{}',
    required_fields JSONB NOT NULL DEFAULT '[]',
    optional_fields JSONB DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    is_system_template BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_connection_templates_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL
);
```

#### 6. LiteLLM_ConnectionSharing

Connection sharing permissions between users.

```sql
CREATE TABLE LiteLLM_ConnectionSharing (
    sharing_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    shared_by_user_id TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_connection_sharing_connection_id 
        FOREIGN KEY (connection_id) 
        REFERENCES LiteLLM_UserConnections(connection_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_sharing_shared_with 
        FOREIGN KEY (shared_with_user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_sharing_shared_by 
        FOREIGN KEY (shared_by_user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE
);
```

### Extended Existing Tables

#### Modifications to LiteLLM_UserTable

```sql
-- Add connection-related fields to existing user table
ALTER TABLE LiteLLM_UserTable 
ADD COLUMN connection_preferences JSONB DEFAULT '{}',
ADD COLUMN default_connection_id TEXT,
ADD COLUMN max_connections INTEGER DEFAULT 10,
ADD COLUMN last_connection_activity TIMESTAMP;

-- Add foreign key constraint for default connection
ALTER TABLE LiteLLM_UserTable 
ADD CONSTRAINT fk_user_default_connection 
FOREIGN KEY (default_connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL;
```

#### Modifications to LiteLLM_VerificationTokenTable

```sql
-- Link tokens to specific connections
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD COLUMN connection_id TEXT,
ADD COLUMN connection_permissions JSONB DEFAULT '{}';

-- Add foreign key constraint
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD CONSTRAINT fk_verification_token_connection 
FOREIGN KEY (connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL;
```

#### Modifications to LiteLLM_SpendLogs

```sql
-- Track spending per connection
ALTER TABLE LiteLLM_SpendLogs 
ADD COLUMN connection_id TEXT,
ADD COLUMN connection_metadata JSONB DEFAULT '{}';

-- Add foreign key constraint
ALTER TABLE LiteLLM_SpendLogs 
ADD CONSTRAINT fk_spend_logs_connection 
FOREIGN KEY (connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL;
```

---

## Relationships and Foreign Keys

### Primary Relationships

```mermaid
graph TD
    A[LiteLLM_UserTable] -->|1:N| B[LiteLLM_UserConnections]
    B -->|1:N| C[LiteLLM_ConnectionActivity]
    B -->|N:M| D[LiteLLM_AccessPolicies]
    D -->|through| E[LiteLLM_UserAccessPolicies]
    B -->|1:N| F[LiteLLM_VerificationTokenTable]
    B -->|1:N| G[LiteLLM_SpendLogs]
    B -->|N:M| H[LiteLLM_ConnectionSharing]
```

### Referential Integrity Rules

| Table | Foreign Key | Referenced Table | On Delete | On Update |
|-------|-------------|------------------|-----------|-----------|
| LiteLLM_UserConnections | user_id | LiteLLM_UserTable | CASCADE | CASCADE |
| LiteLLM_UserAccessPolicies | user_id | LiteLLM_UserTable | CASCADE | CASCADE |
| LiteLLM_UserAccessPolicies | policy_id | LiteLLM_AccessPolicies | CASCADE | CASCADE |
| LiteLLM_ConnectionActivity | connection_id | LiteLLM_UserConnections | CASCADE | CASCADE |
| LiteLLM_VerificationTokenTable | connection_id | LiteLLM_UserConnections | SET NULL | CASCADE |
| LiteLLM_SpendLogs | connection_id | LiteLLM_UserConnections | SET NULL | CASCADE |

---

## Indexes and Performance

### Primary Indexes

```sql
-- User Connections Indexes
CREATE INDEX idx_user_connections_user_id ON LiteLLM_UserConnections(user_id);
CREATE INDEX idx_user_connections_provider ON LiteLLM_UserConnections(provider);
CREATE INDEX idx_user_connections_status ON LiteLLM_UserConnections(status);
CREATE INDEX idx_user_connections_created_at ON LiteLLM_UserConnections(created_at DESC);
CREATE INDEX idx_user_connections_last_used ON LiteLLM_UserConnections(last_used DESC);

-- Configuration and metadata search
CREATE INDEX idx_user_connections_config_gin ON LiteLLM_UserConnections USING GIN (configuration);
CREATE INDEX idx_user_connections_metadata_gin ON LiteLLM_UserConnections USING GIN (metadata);

-- Access Policies Indexes
CREATE INDEX idx_access_policies_resource_type ON LiteLLM_AccessPolicies(resource_type);
CREATE INDEX idx_access_policies_active ON LiteLLM_AccessPolicies(is_active);
CREATE INDEX idx_access_policies_created_by ON LiteLLM_AccessPolicies(created_by);
CREATE INDEX idx_access_policies_permissions_gin ON LiteLLM_AccessPolicies USING GIN (permissions);

-- User Access Policies Indexes
CREATE INDEX idx_user_access_policies_user_id ON LiteLLM_UserAccessPolicies(user_id);
CREATE INDEX idx_user_access_policies_policy_id ON LiteLLM_UserAccessPolicies(policy_id);
CREATE INDEX idx_user_access_policies_granted_at ON LiteLLM_UserAccessPolicies(granted_at DESC);
CREATE INDEX idx_user_access_policies_active ON LiteLLM_UserAccessPolicies(is_active);

-- Connection Activity Indexes (partitioned table)
CREATE INDEX idx_connection_activity_connection_id ON LiteLLM_ConnectionActivity(connection_id);
CREATE INDEX idx_connection_activity_user_id ON LiteLLM_ConnectionActivity(user_id);
CREATE INDEX idx_connection_activity_type ON LiteLLM_ConnectionActivity(activity_type);
CREATE INDEX idx_connection_activity_status ON LiteLLM_ConnectionActivity(status);
CREATE INDEX idx_connection_activity_timestamp ON LiteLLM_ConnectionActivity(timestamp DESC);
CREATE INDEX idx_connection_activity_model ON LiteLLM_ConnectionActivity(model_used);
CREATE INDEX idx_connection_activity_metadata_gin ON LiteLLM_ConnectionActivity USING GIN (metadata);

-- Composite indexes for common queries
CREATE INDEX idx_user_connections_user_provider ON LiteLLM_UserConnections(user_id, provider);
CREATE INDEX idx_user_connections_status_created ON LiteLLM_UserConnections(status, created_at DESC);
CREATE INDEX idx_connection_activity_conn_timestamp ON LiteLLM_ConnectionActivity(connection_id, timestamp DESC);
```

### Performance Optimization Strategies

#### 1. Table Partitioning

```sql
-- Partition connection activity by month
CREATE TABLE LiteLLM_ConnectionActivity_2025_01 PARTITION OF LiteLLM_ConnectionActivity
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE LiteLLM_ConnectionActivity_2025_02 PARTITION OF LiteLLM_ConnectionActivity
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create a function to automatically create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

#### 2. Query Optimization Views

```sql
-- View for active user connections with usage stats
CREATE VIEW v_active_user_connections AS
SELECT 
    uc.connection_id,
    uc.user_id,
    uc.connection_name,
    uc.provider,
    uc.status,
    uc.created_at,
    uc.last_used,
    uc.usage_count,
    COALESCE(usage_stats.total_requests, 0) as total_requests,
    COALESCE(usage_stats.total_cost, 0) as total_cost,
    COALESCE(usage_stats.avg_response_time, 0) as avg_response_time
FROM LiteLLM_UserConnections uc
LEFT JOIN (
    SELECT 
        connection_id,
        COUNT(*) as total_requests,
        SUM(cost_incurred) as total_cost,
        AVG(response_time_ms) as avg_response_time
    FROM LiteLLM_ConnectionActivity
    WHERE activity_type = 'request' 
    AND status = 'success'
    AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY connection_id
) usage_stats ON uc.connection_id = usage_stats.connection_id
WHERE uc.status = 'active';

-- View for user permissions with policy details
CREATE VIEW v_user_permissions AS
SELECT 
    uap.user_id,
    uap.policy_id,
    ap.policy_name,
    ap.resource_type,
    ap.permissions,
    ap.conditions,
    uap.granted_at,
    uap.expires_at,
    uap.is_active
FROM LiteLLM_UserAccessPolicies uap
JOIN LiteLLM_AccessPolicies ap ON uap.policy_id = ap.policy_id
WHERE uap.is_active = TRUE 
AND ap.is_active = TRUE
AND (uap.expires_at IS NULL OR uap.expires_at > CURRENT_TIMESTAMP);
```

---

## Migration Scripts

### Migration 001: Create Core Tables

```sql
-- File: migrations/001_create_core_tables.sql
-- Description: Create the core tables for user connection management

BEGIN;

-- Create connection status enum type
CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'suspended', 'error');
CREATE TYPE connection_type AS ENUM ('api_key', 'oauth', 'sso', 'service_account');
CREATE TYPE provider_type AS ENUM ('openai', 'anthropic', 'azure', 'vertex_ai', 'bedrock', 'cohere', 'huggingface');

-- Create LiteLLM_UserConnections table
CREATE TABLE LiteLLM_UserConnections (
    connection_id TEXT PRIMARY KEY DEFAULT 'conn_' || gen_random_uuid(),
    user_id TEXT NOT NULL,
    connection_name TEXT NOT NULL,
    provider provider_type NOT NULL,
    status connection_status DEFAULT 'active',
    connection_type connection_type NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT,
    metadata JSONB DEFAULT '{}',
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    CONSTRAINT fk_user_connections_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_connection_name_length 
        CHECK (char_length(connection_name) BETWEEN 1 AND 255),
    CONSTRAINT chk_usage_count_positive 
        CHECK (usage_count >= 0)
);

-- Create LiteLLM_AccessPolicies table
CREATE TABLE LiteLLM_AccessPolicies (
    policy_id TEXT PRIMARY KEY DEFAULT 'policy_' || gen_random_uuid(),
    policy_name TEXT NOT NULL,
    policy_description TEXT,
    resource_type TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_access_policies_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT chk_policy_name_length 
        CHECK (char_length(policy_name) BETWEEN 1 AND 255),
    CONSTRAINT chk_resource_type_valid 
        CHECK (resource_type IN ('connection', 'model', 'organization', 'team')),
    CONSTRAINT chk_priority_range 
        CHECK (priority BETWEEN 1 AND 1000)
);

-- Create LiteLLM_UserAccessPolicies table
CREATE TABLE LiteLLM_UserAccessPolicies (
    user_id TEXT NOT NULL,
    policy_id TEXT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (user_id, policy_id),
    
    CONSTRAINT fk_user_access_policies_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_user_access_policies_policy_id 
        FOREIGN KEY (policy_id) 
        REFERENCES LiteLLM_AccessPolicies(policy_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_user_access_policies_granted_by 
        FOREIGN KEY (granted_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT chk_expires_at_future 
        CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- Create partitioned LiteLLM_ConnectionActivity table
CREATE TABLE LiteLLM_ConnectionActivity (
    activity_id TEXT PRIMARY KEY DEFAULT 'activity_' || gen_random_uuid(),
    connection_id TEXT NOT NULL,
    user_id TEXT,
    activity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    request_id TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_incurred DECIMAL(10, 6) DEFAULT 0.00,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_connection_activity_connection_id 
        FOREIGN KEY (connection_id) 
        REFERENCES LiteLLM_UserConnections(connection_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_activity_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT chk_activity_type_valid 
        CHECK (activity_type IN ('request', 'test', 'create', 'update', 'delete', 'auth_failure', 'rate_limit', 'error')),
    CONSTRAINT chk_status_valid 
        CHECK (status IN ('success', 'failure', 'pending', 'timeout')),
    CONSTRAINT chk_tokens_used_positive 
        CHECK (tokens_used >= 0),
    CONSTRAINT chk_cost_incurred_positive 
        CHECK (cost_incurred >= 0),
    CONSTRAINT chk_response_time_positive 
        CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
) PARTITION BY RANGE (timestamp);

-- Create initial partitions for connection activity (current month and next month)
CREATE TABLE LiteLLM_ConnectionActivity_2025_06 PARTITION OF LiteLLM_ConnectionActivity
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE LiteLLM_ConnectionActivity_2025_07 PARTITION OF LiteLLM_ConnectionActivity
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

-- Create indexes
CREATE INDEX idx_user_connections_user_id ON LiteLLM_UserConnections(user_id);
CREATE INDEX idx_user_connections_provider ON LiteLLM_UserConnections(provider);
CREATE INDEX idx_user_connections_status ON LiteLLM_UserConnections(status);
CREATE INDEX idx_user_connections_created_at ON LiteLLM_UserConnections(created_at DESC);
CREATE INDEX idx_user_connections_config_gin ON LiteLLM_UserConnections USING GIN (configuration);

CREATE INDEX idx_access_policies_resource_type ON LiteLLM_AccessPolicies(resource_type);
CREATE INDEX idx_access_policies_active ON LiteLLM_AccessPolicies(is_active);
CREATE INDEX idx_access_policies_permissions_gin ON LiteLLM_AccessPolicies USING GIN (permissions);

CREATE INDEX idx_user_access_policies_user_id ON LiteLLM_UserAccessPolicies(user_id);
CREATE INDEX idx_user_access_policies_policy_id ON LiteLLM_UserAccessPolicies(policy_id);
CREATE INDEX idx_user_access_policies_active ON LiteLLM_UserAccessPolicies(is_active);

CREATE INDEX idx_connection_activity_connection_id ON LiteLLM_ConnectionActivity(connection_id);
CREATE INDEX idx_connection_activity_timestamp ON LiteLLM_ConnectionActivity(timestamp DESC);
CREATE INDEX idx_connection_activity_type ON LiteLLM_ConnectionActivity(activity_type);

COMMIT;
```

### Migration 002: Extend Existing Tables

```sql
-- File: migrations/002_extend_existing_tables.sql
-- Description: Add connection-related fields to existing LiteLLM tables

BEGIN;

-- Extend LiteLLM_UserTable
ALTER TABLE LiteLLM_UserTable 
ADD COLUMN connection_preferences JSONB DEFAULT '{}',
ADD COLUMN default_connection_id TEXT,
ADD COLUMN max_connections INTEGER DEFAULT 10,
ADD COLUMN last_connection_activity TIMESTAMP;

-- Add constraint for max_connections
ALTER TABLE LiteLLM_UserTable 
ADD CONSTRAINT chk_max_connections_positive 
CHECK (max_connections > 0);

-- Extend LiteLLM_VerificationTokenTable
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD COLUMN connection_id TEXT,
ADD COLUMN connection_permissions JSONB DEFAULT '{}';

-- Extend LiteLLM_SpendLogs
ALTER TABLE LiteLLM_SpendLogs 
ADD COLUMN connection_id TEXT,
ADD COLUMN connection_metadata JSONB DEFAULT '{}';

-- Add foreign key constraints (deferred to allow for data population)
ALTER TABLE LiteLLM_UserTable 
ADD CONSTRAINT fk_user_default_connection 
FOREIGN KEY (default_connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE LiteLLM_VerificationTokenTable 
ADD CONSTRAINT fk_verification_token_connection 
FOREIGN KEY (connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL;

ALTER TABLE LiteLLM_SpendLogs 
ADD CONSTRAINT fk_spend_logs_connection 
FOREIGN KEY (connection_id) 
REFERENCES LiteLLM_UserConnections(connection_id) 
ON DELETE SET NULL;

-- Create indexes on new columns
CREATE INDEX idx_user_table_default_connection ON LiteLLM_UserTable(default_connection_id);
CREATE INDEX idx_verification_token_connection ON LiteLLM_VerificationTokenTable(connection_id);
CREATE INDEX idx_spend_logs_connection ON LiteLLM_SpendLogs(connection_id);

COMMIT;
```

### Migration 003: Create Helper Tables and Functions

```sql
-- File: migrations/003_create_helper_tables.sql
-- Description: Create connection templates, sharing, and utility functions

BEGIN;

-- Create connection templates table
CREATE TABLE LiteLLM_ConnectionTemplates (
    template_id TEXT PRIMARY KEY DEFAULT 'template_' || gen_random_uuid(),
    template_name TEXT NOT NULL,
    provider provider_type NOT NULL,
    connection_type connection_type NOT NULL,
    default_configuration JSONB NOT NULL DEFAULT '{}',
    required_fields JSONB NOT NULL DEFAULT '[]',
    optional_fields JSONB DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    is_system_template BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_connection_templates_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT chk_template_name_length 
        CHECK (char_length(template_name) BETWEEN 1 AND 255)
);

-- Create connection sharing table
CREATE TABLE LiteLLM_ConnectionSharing (
    sharing_id TEXT PRIMARY KEY DEFAULT 'share_' || gen_random_uuid(),
    connection_id TEXT NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    shared_by_user_id TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_connection_sharing_connection_id 
        FOREIGN KEY (connection_id) 
        REFERENCES LiteLLM_UserConnections(connection_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_sharing_shared_with 
        FOREIGN KEY (shared_with_user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_connection_sharing_shared_by 
        FOREIGN KEY (shared_by_user_id) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_sharing_expires_future 
        CHECK (expires_at IS NULL OR expires_at > granted_at),
    CONSTRAINT chk_sharing_not_self 
        CHECK (shared_with_user_id != shared_by_user_id)
);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_connections_updated_at 
    BEFORE UPDATE ON LiteLLM_UserConnections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_policies_updated_at 
    BEFORE UPDATE ON LiteLLM_AccessPolicies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_templates_updated_at 
    BEFORE UPDATE ON LiteLLM_ConnectionTemplates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for automatic partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Create indexes on the new partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (connection_id)',
                   'idx_' || partition_name || '_connection_id', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (timestamp DESC)',
                   'idx_' || partition_name || '_timestamp', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for new tables
CREATE INDEX idx_connection_templates_provider ON LiteLLM_ConnectionTemplates(provider);
CREATE INDEX idx_connection_templates_system ON LiteLLM_ConnectionTemplates(is_system_template);

CREATE INDEX idx_connection_sharing_connection ON LiteLLM_ConnectionSharing(connection_id);
CREATE INDEX idx_connection_sharing_shared_with ON LiteLLM_ConnectionSharing(shared_with_user_id);
CREATE INDEX idx_connection_sharing_active ON LiteLLM_ConnectionSharing(is_active);

COMMIT;
```

### Migration 004: Create Views and Analytics

```sql
-- File: migrations/004_create_views_analytics.sql
-- Description: Create views and functions for analytics and reporting

BEGIN;

-- View for active connections with usage statistics
CREATE VIEW v_active_user_connections AS
SELECT 
    uc.connection_id,
    uc.user_id,
    u.user_email,
    uc.connection_name,
    uc.provider,
    uc.status,
    uc.created_at,
    uc.last_used,
    uc.usage_count,
    uc.metadata,
    COALESCE(recent_stats.requests_7d, 0) as requests_last_7_days,
    COALESCE(recent_stats.cost_7d, 0) as cost_last_7_days,
    COALESCE(recent_stats.avg_response_time, 0) as avg_response_time_ms,
    COALESCE(recent_stats.error_rate, 0) as error_rate_7d
FROM LiteLLM_UserConnections uc
JOIN LiteLLM_UserTable u ON uc.user_id = u.user_id
LEFT JOIN (
    SELECT 
        connection_id,
        COUNT(*) FILTER (WHERE activity_type = 'request') as requests_7d,
        SUM(cost_incurred) as cost_7d,
        AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
        (COUNT(*) FILTER (WHERE status = 'failure')::float / 
         NULLIF(COUNT(*), 0) * 100) as error_rate
    FROM LiteLLM_ConnectionActivity
    WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY connection_id
) recent_stats ON uc.connection_id = recent_stats.connection_id
WHERE uc.status = 'active';

-- View for user permissions summary
CREATE VIEW v_user_permissions_summary AS
SELECT 
    u.user_id,
    u.user_email,
    u.user_role,
    COUNT(DISTINCT uc.connection_id) as total_connections,
    COUNT(DISTINCT uap.policy_id) as active_policies,
    u.max_connections,
    u.default_connection_id,
    u.last_connection_activity
FROM LiteLLM_UserTable u
LEFT JOIN LiteLLM_UserConnections uc ON u.user_id = uc.user_id AND uc.status = 'active'
LEFT JOIN LiteLLM_UserAccessPolicies uap ON u.user_id = uap.user_id AND uap.is_active = TRUE
GROUP BY u.user_id, u.user_email, u.user_role, u.max_connections, u.default_connection_id, u.last_connection_activity;

-- View for connection activity analytics
CREATE VIEW v_connection_activity_summary AS
SELECT 
    ca.connection_id,
    uc.connection_name,
    uc.provider,
    uc.user_id,
    DATE_TRUNC('day', ca.timestamp) as activity_date,
    COUNT(*) as total_activities,
    COUNT(*) FILTER (WHERE ca.activity_type = 'request') as requests,
    COUNT(*) FILTER (WHERE ca.status = 'success') as successful_requests,
    COUNT(*) FILTER (WHERE ca.status = 'failure') as failed_requests,
    SUM(ca.tokens_used) as total_tokens,
    SUM(ca.cost_incurred) as total_cost,
    AVG(ca.response_time_ms) FILTER (WHERE ca.response_time_ms IS NOT NULL) as avg_response_time,
    ARRAY_AGG(DISTINCT ca.model_used) FILTER (WHERE ca.model_used IS NOT NULL) as models_used
FROM LiteLLM_ConnectionActivity ca
JOIN LiteLLM_UserConnections uc ON ca.connection_id = uc.connection_id
GROUP BY ca.connection_id, uc.connection_name, uc.provider, uc.user_id, DATE_TRUNC('day', ca.timestamp);

-- Function to get user connection statistics
CREATE OR REPLACE FUNCTION get_user_connection_stats(
    p_user_id TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    connection_id TEXT,
    connection_name TEXT,
    provider TEXT,
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    total_cost DECIMAL,
    avg_response_time DOUBLE PRECISION,
    last_activity TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.connection_id,
        uc.connection_name,
        uc.provider::TEXT,
        COALESCE(stats.total_requests, 0) as total_requests,
        COALESCE(stats.successful_requests, 0) as successful_requests,
        COALESCE(stats.failed_requests, 0) as failed_requests,
        COALESCE(stats.total_cost, 0::DECIMAL) as total_cost,
        COALESCE(stats.avg_response_time, 0::DOUBLE PRECISION) as avg_response_time,
        stats.last_activity
    FROM LiteLLM_UserConnections uc
    LEFT JOIN (
        SELECT 
            ca.connection_id,
            COUNT(*) FILTER (WHERE ca.activity_type = 'request') as total_requests,
            COUNT(*) FILTER (WHERE ca.activity_type = 'request' AND ca.status = 'success') as successful_requests,
            COUNT(*) FILTER (WHERE ca.activity_type = 'request' AND ca.status = 'failure') as failed_requests,
            SUM(ca.cost_incurred) as total_cost,
            AVG(ca.response_time_ms) FILTER (WHERE ca.response_time_ms IS NOT NULL) as avg_response_time,
            MAX(ca.timestamp) as last_activity
        FROM LiteLLM_ConnectionActivity ca
        WHERE ca.timestamp >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        GROUP BY ca.connection_id
    ) stats ON uc.connection_id = stats.connection_id
    WHERE uc.user_id = p_user_id
    AND uc.status = 'active'
    ORDER BY uc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old activity data
CREATE OR REPLACE FUNCTION cleanup_old_activity_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_days || ' days')::INTERVAL;
    
    -- Delete old activity records
    DELETE FROM LiteLLM_ConnectionActivity 
    WHERE timestamp < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## Data Models

### SQLAlchemy Models

```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, DECIMAL, JSON, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, INET, UUID
from datetime import datetime
from enum import Enum as PyEnum
import uuid

Base = declarative_base()

class ConnectionStatus(PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ERROR = "error"

class ConnectionType(PyEnum):
    API_KEY = "api_key"
    OAUTH = "oauth"
    SSO = "sso"
    SERVICE_ACCOUNT = "service_account"

class ProviderType(PyEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    VERTEX_AI = "vertex_ai"
    BEDROCK = "bedrock"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"

class ActivityType(PyEnum):
    REQUEST = "request"
    TEST = "test"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    AUTH_FAILURE = "auth_failure"
    RATE_LIMIT = "rate_limit"
    ERROR = "error"

class ActivityStatus(PyEnum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"
    TIMEOUT = "timeout"

class UserConnection(Base):
    __tablename__ = 'LiteLLM_UserConnections'
    
    connection_id = Column(String, primary_key=True, default=lambda: f"conn_{uuid.uuid4()}")
    user_id = Column(String, ForeignKey('LiteLLM_UserTable.user_id'), nullable=False)
    connection_name = Column(String(255), nullable=False)
    provider = Column(Enum(ProviderType), nullable=False)
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.ACTIVE)
    connection_type = Column(Enum(ConnectionType), nullable=False)
    configuration = Column(JSONB, nullable=False, default={})
    credentials_encrypted = Column(Text)
    metadata = Column(JSONB, default={})
    last_used = Column(DateTime)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="connections")
    activities = relationship("ConnectionActivity", back_populates="connection", cascade="all, delete-orphan")
    access_grants = relationship("ConnectionSharing", foreign_keys="ConnectionSharing.connection_id", 
                               back_populates="connection", cascade="all, delete-orphan")

class AccessPolicy(Base):
    __tablename__ = 'LiteLLM_AccessPolicies'
    
    policy_id = Column(String, primary_key=True, default=lambda: f"policy_{uuid.uuid4()}")
    policy_name = Column(String(255), nullable=False)
    policy_description = Column(Text)
    resource_type = Column(String(50), nullable=False)
    permissions = Column(JSONB, nullable=False, default={})
    conditions = Column(JSONB, default={})
    priority = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey('LiteLLM_UserTable.user_id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    user_assignments = relationship("UserAccessPolicy", back_populates="policy", cascade="all, delete-orphan")

class UserAccessPolicy(Base):
    __tablename__ = 'LiteLLM_UserAccessPolicies'
    
    user_id = Column(String, ForeignKey('LiteLLM_UserTable.user_id'), primary_key=True)
    policy_id = Column(String, ForeignKey('LiteLLM_AccessPolicies.policy_id'), primary_key=True)
    granted_at = Column(DateTime, default=datetime.utcnow)
    granted_by = Column(String, ForeignKey('LiteLLM_UserTable.user_id'))
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="access_policies")
    policy = relationship("AccessPolicy", back_populates="user_assignments")
    granter = relationship("User", foreign_keys=[granted_by])

class ConnectionActivity(Base):
    __tablename__ = 'LiteLLM_ConnectionActivity'
    
    activity_id = Column(String, primary_key=True, default=lambda: f"activity_{uuid.uuid4()}")
    connection_id = Column(String, ForeignKey('LiteLLM_UserConnections.connection_id'), nullable=False)
    user_id = Column(String, ForeignKey('LiteLLM_UserTable.user_id'))
    activity_type = Column(Enum(ActivityType), nullable=False)
    status = Column(Enum(ActivityStatus), nullable=False)
    request_id = Column(String)
    model_used = Column(String)
    tokens_used = Column(Integer, default=0)
    cost_incurred = Column(DECIMAL(10, 6), default=0.00)
    response_time_ms = Column(Integer)
    status_code = Column(Integer)
    error_message = Column(Text)
    metadata = Column(JSONB, default={})
    ip_address = Column(INET)
    user_agent = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    connection = relationship("UserConnection", back_populates="activities")
    user = relationship("User")

class ConnectionTemplate(Base):
    __tablename__ = 'LiteLLM_ConnectionTemplates'
    
    template_id = Column(String, primary_key=True, default=lambda: f"template_{uuid.uuid4()}")
    template_name = Column(String(255), nullable=False)
    provider = Column(Enum(ProviderType), nullable=False)
    connection_type = Column(Enum(ConnectionType), nullable=False)
    default_configuration = Column(JSONB, nullable=False, default={})
    required_fields = Column(JSONB, nullable=False, default=[])
    optional_fields = Column(JSONB, default=[])
    validation_rules = Column(JSONB, default={})
    is_system_template = Column(Boolean, default=False)
    created_by = Column(String, ForeignKey('LiteLLM_UserTable.user_id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")

class ConnectionSharing(Base):
    __tablename__ = 'LiteLLM_ConnectionSharing'
    
    sharing_id = Column(String, primary_key=True, default=lambda: f"share_{uuid.uuid4()}")
    connection_id = Column(String, ForeignKey('LiteLLM_UserConnections.connection_id'), nullable=False)
    shared_with_user_id = Column(String, ForeignKey('LiteLLM_UserTable.user_id'), nullable=False)
    shared_by_user_id = Column(String, ForeignKey('LiteLLM_UserTable.user_id'), nullable=False)
    permissions = Column(JSONB, nullable=False, default={})
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    connection = relationship("UserConnection", foreign_keys=[connection_id], back_populates="access_grants")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    shared_by_user = relationship("User", foreign_keys=[shared_by_user_id])
```

### Pydantic Models

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class ConnectionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ERROR = "error"

class ConnectionType(str, Enum):
    API_KEY = "api_key"
    OAUTH = "oauth"
    SSO = "sso"
    SERVICE_ACCOUNT = "service_account"

class ProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    VERTEX_AI = "vertex_ai"
    BEDROCK = "bedrock"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"

# Request Models
class ConnectionCreateRequest(BaseModel):
    connection_name: str = Field(..., min_length=1, max_length=255)
    provider: ProviderType
    connection_type: ConnectionType
    configuration: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = {}
    expires_at: Optional[datetime] = None
    
    @validator('configuration')
    def validate_configuration(cls, v, values):
        provider = values.get('provider')
        if provider == ProviderType.OPENAI:
            if 'api_key' not in v:
                raise ValueError('OpenAI connections require api_key')
            if not v['api_key'].startswith('sk-'):
                raise ValueError('Invalid OpenAI API key format')
        elif provider == ProviderType.ANTHROPIC:
            if 'api_key' not in v:
                raise ValueError('Anthropic connections require api_key')
            if not v['api_key'].startswith('sk-ant-'):
                raise ValueError('Invalid Anthropic API key format')
        return v

class ConnectionUpdateRequest(BaseModel):
    connection_name: Optional[str] = Field(None, min_length=1, max_length=255)
    configuration: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[ConnectionStatus] = None
    expires_at: Optional[datetime] = None

class AccessPolicyCreateRequest(BaseModel):
    policy_name: str = Field(..., min_length=1, max_length=255)
    policy_description: Optional[str] = None
    resource_type: str = Field(..., regex=r'^(connection|model|organization|team)$')
    permissions: Dict[str, Any]
    conditions: Optional[Dict[str, Any]] = {}
    priority: int = Field(100, ge=1, le=1000)

class UserAccessPolicyGrantRequest(BaseModel):
    policy_id: str
    expires_at: Optional[datetime] = None

# Response Models
class ConnectionResponse(BaseModel):
    connection_id: str
    connection_name: str
    provider: ProviderType
    connection_type: ConnectionType
    status: ConnectionStatus
    created_at: datetime
    updated_at: datetime
    last_used: Optional[datetime]
    usage_count: int
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ConnectionDetailResponse(ConnectionResponse):
    configuration: Dict[str, Any]
    metadata: Dict[str, Any]
    usage_stats: Optional[Dict[str, Any]] = None
    permissions: Optional[Dict[str, Any]] = None

class AccessPolicyResponse(BaseModel):
    policy_id: str
    policy_name: str
    policy_description: Optional[str]
    resource_type: str
    permissions: Dict[str, Any]
    conditions: Dict[str, Any]
    priority: int
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ConnectionActivityResponse(BaseModel):
    activity_id: str
    connection_id: str
    user_id: Optional[str]
    activity_type: str
    status: str
    model_used: Optional[str]
    tokens_used: int
    cost_incurred: float
    response_time_ms: Optional[int]
    timestamp: datetime
    error_message: Optional[str]
    
    class Config:
        from_attributes = True

class ConnectionTestResponse(BaseModel):
    success: bool
    response_time_ms: int
    provider_status: str
    available_models: Optional[List[str]] = None
    quota_info: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class UsageAnalyticsResponse(BaseModel):
    connection_id: str
    period: Dict[str, datetime]
    total_usage: Dict[str, Any]
    usage_by_model: Dict[str, Dict[str, Any]]
    daily_breakdown: List[Dict[str, Any]]
```

---

## Sample Data

### System Connection Templates

```sql
-- Insert system connection templates
INSERT INTO LiteLLM_ConnectionTemplates (
    template_id, template_name, provider, connection_type, 
    default_configuration, required_fields, optional_fields, 
    validation_rules, is_system_template
) VALUES 
(
    'template_openai_api_key',
    'OpenAI API Key Connection',
    'openai',
    'api_key',
    '{"base_url": "https://api.openai.com/v1", "timeout": 30}',
    '["api_key"]',
    '["organization_id", "timeout", "max_retries"]',
    '{"api_key": {"pattern": "^sk-[A-Za-z0-9]{32,}$", "description": "Must start with sk- and be at least 32 characters"}}',
    true
),
(
    'template_anthropic_api_key',
    'Anthropic API Key Connection',
    'anthropic',
    'api_key',
    '{"base_url": "https://api.anthropic.com", "timeout": 30}',
    '["api_key"]',
    '["timeout", "max_retries"]',
    '{"api_key": {"pattern": "^sk-ant-[A-Za-z0-9-_]{32,}$", "description": "Must start with sk-ant- and be at least 32 characters"}}',
    true
),
(
    'template_azure_openai',
    'Azure OpenAI Connection',
    'azure',
    'api_key',
    '{"api_version": "2023-12-01-preview", "timeout": 30}',
    '["api_key", "azure_endpoint", "api_version"]',
    '["timeout", "max_retries", "deployment_name"]',
    '{"azure_endpoint": {"pattern": "^https://[a-zA-Z0-9-]+\\.openai\\.azure\\.com/?$"}}',
    true
);
```

### Default Access Policies

```sql
-- Insert default access policies
INSERT INTO LiteLLM_AccessPolicies (
    policy_id, policy_name, policy_description, resource_type, permissions, conditions, priority, created_by
) VALUES 
(
    'policy_basic_user',
    'Basic User Access',
    'Standard access policy for regular users',
    'connection',
    '{
        "models": ["gpt-3.5-turbo", "gpt-3.5-turbo-16k"],
        "rate_limits": {
            "requests_per_minute": 60,
            "tokens_per_minute": 90000
        },
        "budget_limits": {
            "monthly_limit": 50.00,
            "currency": "USD"
        },
        "operations": ["create", "read", "update"]
    }',
    '{
        "time_restrictions": {
            "allowed_hours": "06:00-22:00",
            "timezone": "UTC"
        }
    }',
    100,
    'admin_user'
),
(
    'policy_premium_user',
    'Premium User Access',
    'Enhanced access policy for premium users',
    'connection',
    '{
        "models": ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"],
        "rate_limits": {
            "requests_per_minute": 200,
            "tokens_per_minute": 300000
        },
        "budget_limits": {
            "monthly_limit": 200.00,
            "currency": "USD"
        },
        "operations": ["create", "read", "update", "share"]
    }',
    '{}',
    90,
    'admin_user'
),
(
    'policy_admin_access',
    'Administrator Full Access',
    'Full access policy for administrators',
    'connection',
    '{
        "models": ["*"],
        "rate_limits": {
            "requests_per_minute": 1000,
            "tokens_per_minute": 2000000
        },
        "operations": ["create", "read", "update", "delete", "share", "admin"]
    }',
    '{}',
    10,
    'admin_user'
);
```

### Sample User Connections

```sql
-- Insert sample user connections (after users exist)
INSERT INTO LiteLLM_UserConnections (
    connection_id, user_id, connection_name, provider, connection_type,
    configuration, metadata, status
) VALUES 
(
    'conn_sample_openai_001',
    'user_demo_001',
    'My OpenAI GPT Connection',
    'openai',
    'api_key',
    '{
        "api_key": "sk-encrypted_key_placeholder",
        "base_url": "https://api.openai.com/v1",
        "timeout": 30,
        "max_retries": 3
    }',
    '{
        "description": "Primary OpenAI connection for GPT models",
        "tags": ["production", "gpt", "primary"],
        "created_via": "web_ui"
    }',
    'active'
),
(
    'conn_sample_anthropic_001',
    'user_demo_001',
    'Claude Connection',
    'anthropic',
    'api_key',
    '{
        "api_key": "sk-ant-encrypted_key_placeholder",
        "base_url": "https://api.anthropic.com",
        "timeout": 30
    }',
    '{
        "description": "Anthropic Claude connection for advanced reasoning",
        "tags": ["production", "claude", "reasoning"],
        "created_via": "api"
    }',
    'active'
),
(
    'conn_sample_azure_001',
    'user_demo_002',
    'Azure OpenAI Enterprise',
    'azure',
    'api_key',
    '{
        "api_key": "encrypted_azure_key_placeholder",
        "azure_endpoint": "https://my-resource.openai.azure.com/",
        "api_version": "2023-12-01-preview",
        "deployment_name": "gpt-4-deployment"
    }',
    '{
        "description": "Enterprise Azure OpenAI connection",
        "tags": ["enterprise", "azure", "gpt-4"],
        "environment": "production"
    }',
    'active'
);
```

### Sample Connection Activity

```sql
-- Insert sample connection activity
INSERT INTO LiteLLM_ConnectionActivity (
    activity_id, connection_id, user_id, activity_type, status,
    request_id, model_used, tokens_used, cost_incurred,
    response_time_ms, status_code, metadata, timestamp
) VALUES 
(
    'activity_001',
    'conn_sample_openai_001',
    'user_demo_001',
    'request',
    'success',
    'req_12345',
    'gpt-3.5-turbo',
    150,
    0.0003,
    245,
    200,
    '{"prompt_type": "chat", "temperature": 0.7}',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    'activity_002',
    'conn_sample_openai_001',
    'user_demo_001',
    'request',
    'success',
    'req_12346',
    'gpt-4',
    89,
    0.0027,
    567,
    200,
    '{"prompt_type": "completion", "max_tokens": 100}',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),
(
    'activity_003',
    'conn_sample_anthropic_001',
    'user_demo_001',
    'test',
    'success',
    NULL,
    NULL,
    0,
    0,
    123,
    200,
    '{"test_type": "connection_health"}',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes'
);
```

### Sample User Access Policy Assignments

```sql
-- Assign policies to sample users
INSERT INTO LiteLLM_UserAccessPolicies (
    user_id, policy_id, granted_by, granted_at
) VALUES 
(
    'user_demo_001',
    'policy_premium_user',
    'admin_user',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
),
(
    'user_demo_002',
    'policy_basic_user',
    'admin_user',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);
```

---

## Security Considerations

### Credential Encryption

```sql
-- Create function for credential encryption/decryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_credential(credential TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(credential, encryption_key), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_credential TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_credential, 'base64'), encryption_key);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Audit Logging

```sql
-- Create audit log table for sensitive operations
CREATE TABLE LiteLLM_AuditLog (
    audit_id TEXT PRIMARY KEY DEFAULT 'audit_' || gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    CONSTRAINT fk_audit_log_changed_by 
        FOREIGN KEY (changed_by) 
        REFERENCES LiteLLM_UserTable(user_id) 
        ON DELETE SET NULL
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO LiteLLM_AuditLog (
            table_name, operation, record_id, old_values, changed_by
        ) VALUES (
            TG_TABLE_NAME, TG_OP, OLD.connection_id, row_to_json(OLD), 
            COALESCE(current_setting('app.current_user_id', true), 'system')
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO LiteLLM_AuditLog (
            table_name, operation, record_id, old_values, new_values, changed_by
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.connection_id, row_to_json(OLD), row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true), 'system')
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO LiteLLM_AuditLog (
            table_name, operation, record_id, new_values, changed_by
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.connection_id, row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true), 'system')
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_user_connections
    AFTER INSERT OR UPDATE OR DELETE ON LiteLLM_UserConnections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_access_policies
    AFTER INSERT OR UPDATE OR DELETE ON LiteLLM_AccessPolicies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Row Level Security (RLS)

```sql
-- Enable row level security on sensitive tables
ALTER TABLE LiteLLM_UserConnections ENABLE ROW LEVEL SECURITY;
ALTER TABLE LiteLLM_ConnectionActivity ENABLE ROW LEVEL SECURITY;

-- Create policies for user data isolation
CREATE POLICY user_connections_policy ON LiteLLM_UserConnections
    FOR ALL TO authenticated_users
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY connection_activity_policy ON LiteLLM_ConnectionActivity
    FOR ALL TO authenticated_users
    USING (
        user_id = current_setting('app.current_user_id', true) OR
        connection_id IN (
            SELECT connection_id FROM LiteLLM_UserConnections 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create admin bypass policy
CREATE POLICY admin_bypass_policy ON LiteLLM_UserConnections
    FOR ALL TO admin_users
    USING (true)
    WITH CHECK (true);
```

---

This comprehensive database schema documentation provides a complete foundation for implementing the LiteLLM User Connection and Access Management system. The schema is designed for scalability, security, and maintainability while leveraging PostgreSQL's advanced features for optimal performance.

Key highlights include:
- **Comprehensive table structure** with proper constraints and relationships
- **PostgreSQL-specific optimizations** including JSONB, partitioning, and GIN indexes  
- **Complete migration scripts** for safe deployment
- **Detailed data models** for both SQLAlchemy and Pydantic
- **Sample data** for testing and development
- **Security features** including encryption, audit logging, and row-level security

The schema supports all requirements from the PRD while maintaining compatibility with existing LiteLLM infrastructure.