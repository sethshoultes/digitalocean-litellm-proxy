# LiteLLM User Connection Management Database Schema v2.0

**Version:** 2.0 (LiteLLM Compatible Architecture)  
**Date:** June 18, 2025  
**Status:** Production Ready - Fully Compatible with Official LiteLLM Schema  
**Migration Status:** Ready for existing LiteLLM deployments

## Major Compatibility Update: v1.0 → v2.0

### Critical Architecture Alignment

✅ **PRIMARY KEY COMPATIBILITY:**
- **Before:** UUID primary keys (uuid_generate_v4())
- **After:** TEXT primary keys with prefixes (conn_[uuid], policy_[uuid])
- **Rationale:** Matches LiteLLM's key format pattern used in existing tables
- **Impact:** Seamless integration with LiteLLM's virtual key system

✅ **DATA TYPE ALIGNMENT:**
- **Before:** JSONB fields for configuration and metadata
- **After:** JSON fields to match LiteLLM standard
- **Rationale:** Consistency with LiteLLM_UserTable and LiteLLM_TeamTable patterns
- **Impact:** Direct compatibility with existing LiteLLM queries and indexes

✅ **ENHANCED LITELLM INTEGRATION:**
- **Foreign Key Relationships:** Direct links to LiteLLM_UserTable, LiteLLM_SpendLogs, LiteLLM_VerificationToken
- **Field Mapping:** Follows exact LiteLLM patterns for spend, models, metadata
- **Budget Management:** Integrated with LiteLLM's existing budget tracking system
- **Activity Tracking:** Links to existing LiteLLM_SpendLogs for unified reporting

✅ **PRODUCTION DEPLOYMENT READY:**
- **Zero Breaking Changes:** Existing LiteLLM deployments unaffected
- **Drop-in Installation:** Can be added to any existing LiteLLM database
- **Migration Support:** Automated migration from v1.0 if needed
- **Performance Optimized:** Partitioning, indexing, and query optimization

### Schema Compatibility Benefits

1. **Unified User Management:** Leverages existing LiteLLM user/team/org structure
2. **Spend Tracking Integration:** Connection usage automatically flows to LiteLLM spend reports
3. **Virtual Key Compatibility:** Works with LiteLLM's existing API key management
4. **Admin Interface Ready:** Compatible with LiteLLM admin UI extensions
5. **Monitoring Integration:** Plugs into existing LiteLLM monitoring and alerting

## Complete Schema Compatibility Overview

### Schema Version Comparison

| Component | v1.0 (Original) | v2.0 (LiteLLM Compatible) | Compatibility Impact |
|-----------|-----------------|---------------------------|---------------------|
| Primary Keys | UUID (uuid_generate_v4()) | TEXT with prefixes (conn_[uuid]) | ✅ Matches LiteLLM pattern |
| JSON Fields | JSONB | JSON | ✅ Standard LiteLLM format |
| Foreign Keys | Basic user_id | Full LiteLLM integration | ✅ Direct table relationships |
| Spend Tracking | Isolated | Integrated with LiteLLM_SpendLogs | ✅ Unified reporting |
| Activity Logging | Basic logging | LiteLLM-compatible fields | ✅ Standard monitoring |
| Model Management | Simple array | LiteLLM models pattern | ✅ Virtual key compatibility |

### Core Tables (LiteLLM Extension)

#### 1. LiteLLM_UserConnections
Primary table for user-specific provider connections.

**LiteLLM-Compatible Fields:**
```sql
-- Primary Key: LiteLLM prefix pattern
connection_id          TEXT PRIMARY KEY DEFAULT ('conn_' || gen_random_uuid()::text)

-- Integration Fields: Direct LiteLLM compatibility
user_id               TEXT NOT NULL       -- References LiteLLM_UserTable.user_id
models               TEXT[] DEFAULT '{}'  -- Follows LiteLLM_UserTable.models pattern
spend                FLOAT DEFAULT 0.0    -- Syncs with LiteLLM_SpendLogs
metadata             JSON DEFAULT '{}'    -- Matches LiteLLM_UserTable.metadata

-- Enhanced Connection Fields
connection_name       TEXT NOT NULL       -- User-friendly identifier
provider              provider_type       -- openai, anthropic, azure, aws, google
connection_type       connection_type     -- api_key, oauth, service_account
configuration         JSON NOT NULL       -- Provider-specific configuration
credentials_encrypted TEXT                -- Encrypted credentials storage

-- Budget Management: LiteLLM pattern
max_budget           FLOAT                -- Budget limit (LiteLLM compatible)
budget_duration      TEXT                 -- daily, weekly, monthly
budget_reset_at      TIMESTAMP WITH TIME ZONE

-- Rate Limiting: LiteLLM pattern
tpm_limit            BIGINT               -- Tokens per minute
rpm_limit            BIGINT               -- Requests per minute
max_parallel_requests INTEGER             -- Concurrent request limit

-- Health & Performance Tracking
last_used            TIMESTAMP WITH TIME ZONE
last_health_check    TIMESTAMP WITH TIME ZONE
health_status        TEXT DEFAULT 'unknown'
usage_count          INTEGER DEFAULT 0
error_count          INTEGER DEFAULT 0
success_count        INTEGER DEFAULT 0
avg_response_time_ms INTEGER
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