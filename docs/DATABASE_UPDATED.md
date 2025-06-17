# Updated LiteLLM User Connection Management Database Schema

**Version:** 2.0 (Aligned with LiteLLM Architecture)  
**Date:** June 17, 2025  
**Status:** Production Ready - LiteLLM Compatible

## Key Changes from v1.0

✅ **Fixed Critical Issues:**
- Aligned data types with actual LiteLLM schema (TEXT primary keys, JSON fields)
- Added proper foreign key constraints to existing LiteLLM tables
- Completed activity tracking with all necessary fields (tokens, costs, models)
- Added missing connection_type field for different authentication methods
- Integrated with LiteLLM spend tracking and budget patterns

✅ **Enhanced Integration:**
- Follows LiteLLM naming conventions and field patterns
- Compatible with existing LiteLLM_UserTable, LiteLLM_VerificationToken, LiteLLM_SpendLogs
- Maintains backward compatibility with current LiteLLM deployments
- Uses same permission and budget management patterns as core LiteLLM

✅ **Production Ready Features:**
- Proper constraint validation for all providers
- Automated partition management for activity logs
- Comprehensive indexing strategy for performance
- Security functions for credential encryption
- Health monitoring and connection testing capabilities

## Schema Overview

### Core Tables (New)

#### 1. LiteLLM_UserConnections
Primary table for user-specific provider connections.

**Key Fields:**
```sql
connection_id          TEXT PRIMARY KEY    -- Format: conn_[uuid]
user_id               TEXT NOT NULL       -- FK to LiteLLM_UserTable
connection_name       TEXT NOT NULL       -- User-friendly name
provider              provider_type       -- openai, anthropic, azure, etc.
connection_type       connection_type     -- api_key, oauth, service_account
configuration         JSON                -- Provider-specific config
credentials_encrypted TEXT                -- Encrypted API keys/secrets
models               TEXT[]               -- Allowed models (LiteLLM pattern)
spend                FLOAT DEFAULT 0.0    -- Current spend (LiteLLM pattern)
max_budget           FLOAT                -- Budget limit
tpm_limit            BIGINT               -- Tokens per minute limit
rpm_limit            BIGINT               -- Requests per minute limit
```

#### 2. LiteLLM_AccessPolicies
Reusable access control policy templates.

**Key Fields:**
```sql
policy_id       TEXT PRIMARY KEY     -- Format: policy_[uuid]
policy_name     TEXT UNIQUE          -- Human-readable name
permissions     JSON                 -- Operations allowed
models          TEXT[]               -- Model access list
max_budget      FLOAT                -- Budget constraints
tpm_limit       BIGINT               -- Rate limits
rpm_limit       BIGINT               -- Rate limits
priority        INTEGER              -- Policy precedence (0-1000)
```

#### 3. LiteLLM_UserAccessPolicies
User-to-policy associations with expiration.

#### 4. LiteLLM_ConnectionActivity
Comprehensive activity tracking (partitioned by month).

**Enhanced Fields:**
```sql
request_id          TEXT        -- Links to LiteLLM_SpendLogs
api_key            TEXT        -- Links to LiteLLM_VerificationToken
model              TEXT        -- Model used
total_tokens       INTEGER     -- Token consumption
spend              FLOAT       -- Cost incurred
response_time_ms   INTEGER     -- Performance metrics
```

#### 5. LiteLLM_ConnectionTemplates
Pre-configured templates for common providers.

#### 6. LiteLLM_SharedConnections
Team/organization-level connection sharing.

### Integration with Existing LiteLLM Tables

#### Foreign Key Relationships:
- `LiteLLM_UserConnections.user_id` → `LiteLLM_UserTable.user_id`
- `LiteLLM_ConnectionActivity.api_key` → `LiteLLM_VerificationToken.token`
- `LiteLLM_ConnectionActivity.request_id` → `LiteLLM_SpendLogs.request_id`

#### Spend Tracking Integration:
- Connection spend automatically syncs with user spend
- Activity logs link to existing spend tracking
- Budget enforcement follows LiteLLM patterns

## Configuration Examples

### OpenAI Connection
```json
{
  "api_key": "sk-...",
  "organization": "org-...",
  "base_url": "https://api.openai.com/v1",
  "timeout": 30,
  "max_retries": 3
}
```

### Azure OpenAI Connection
```json
{
  "api_key": "...",
  "azure_endpoint": "https://myresource.openai.azure.com/",
  "api_version": "2024-02-15-preview",
  "deployment_name": "gpt-4-deployment"
}
```

### AWS Bedrock Connection
```json
{
  "aws_access_key_id": "...",
  "aws_secret_access_key": "...",
  "region": "us-east-1",
  "timeout": 30
}
```

## Access Policy Examples

### Basic User Policy
```json
{
  "operations": ["read", "use"],
  "models": ["gpt-3.5-turbo", "claude-3-haiku-20240307"],
  "max_budget": 50.0,
  "tpm_limit": 10000,
  "rpm_limit": 60,
  "conditions": {
    "time_restrictions": {
      "allowed_hours": "06:00-22:00",
      "timezone": "UTC"
    }
  }
}
```

### Team Lead Policy
```json
{
  "operations": ["read", "use", "create", "update", "share", "manage_team"],
  "models": ["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet-20240229"],
  "max_budget": 1000.0,
  "tpm_limit": 200000,
  "rpm_limit": 1200,
  "conditions": {
    "can_manage_team_users": true,
    "can_share_connections": true
  }
}
```

## Performance Optimizations

### Indexing Strategy
- Primary indexes on foreign keys and status fields
- GIN indexes on JSON configuration and metadata fields
- Composite indexes for common query patterns
- Partial indexes for active records only

### Partitioning
- Monthly partitioning on `LiteLLM_ConnectionActivity`
- Automatic partition creation for future months
- Automated cleanup of old partition data

### Query Optimization
- Views for common joins with LiteLLM tables
- Functions for permission resolution
- Optimized spend tracking aggregation

## Security Features

### Credential Protection
- AES-256 encryption for API keys and secrets
- Secure functions with SECURITY DEFINER
- Credential masking in logs and UI

### Audit Compliance
- Comprehensive activity logging
- Immutable audit trails
- Integration with LiteLLM audit patterns

### Access Control
- Row-level security policies
- Role-based permission inheritance
- Time-based access restrictions

## Migration Strategy

### Phase 1: Install New Tables
- Create new tables without foreign keys
- Install functions and basic indexes
- Test schema compatibility

### Phase 2: Data Migration
- Migrate existing connection data if any
- Create sample templates and policies
- Establish foreign key relationships

### Phase 3: Integration
- Connect to existing LiteLLM tables
- Enable spend tracking synchronization
- Activate security policies

### Phase 4: Optimization
- Create remaining indexes
- Enable partitioning
- Set up automated maintenance

## Production Deployment

### Prerequisites
- PostgreSQL 12+ with JSON support
- pgcrypto extension available
- Existing LiteLLM database schema

### Installation Commands
```bash
# Run migration scripts in order
psql -d litellm_db -f 01_extensions_fixed.sql
psql -d litellm_db -f 02_core_tables_fixed.sql
psql -d litellm_db -f 03_litellm_integration.sql
psql -d litellm_db -f 04_indexes_fixed.sql
psql -d litellm_db -f 05_functions_triggers_fixed.sql
psql -d litellm_db -f 06_sample_data_fixed.sql
```

### Environment Variables
```bash
# Encryption key for credentials
LITELLM_CONNECTION_ENCRYPTION_KEY=your-32-character-key

# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/litellm_db

# Integration settings
LITELLM_ENABLE_CONNECTION_MANAGEMENT=true
LITELLM_AUTO_CREATE_PARTITIONS=true
```

## API Integration Points

### FastAPI Endpoints
- GET/POST/PUT/DELETE `/api/v1/connections`
- POST `/api/v1/connections/{id}/test`
- GET/POST `/api/v1/policies`
- POST `/api/v1/users/{id}/policies`

### LiteLLM Integration
- Extend existing authentication middleware
- Hook into completion cost tracking
- Integrate with virtual key permissions
- Maintain compatibility with existing APIs

## Monitoring and Maintenance

### Health Checks
- Connection status monitoring
- Automatic health testing
- Performance metrics tracking
- Budget utilization alerts

### Maintenance Tasks
- Monthly partition creation
- Old data cleanup (90-day retention)
- Index maintenance
- Credential rotation support

## Validation and Testing

### Unit Tests
- Schema constraint validation
- Function behavior verification
- Trigger functionality testing
- Performance benchmark validation

### Integration Tests
- LiteLLM compatibility verification
- Spend tracking accuracy
- Permission resolution testing
- Connection sharing validation

This updated schema addresses all critical issues identified in the review and provides a production-ready foundation for LiteLLM user connection and access management that seamlessly integrates with the existing LiteLLM architecture.