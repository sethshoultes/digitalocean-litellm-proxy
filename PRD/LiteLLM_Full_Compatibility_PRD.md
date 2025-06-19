# Product Requirements Document
## LiteLLM Full Compatibility Implementation

**Document Version:** 2.0  
**Date:** December 19, 2024  
**Status:** Complete Compatibility Implementation Required  
**Priority:** P0 - Critical for Production Deployment

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Compatibility Analysis](#compatibility-analysis) 
3. [Implementation Strategy](#implementation-strategy)
4. [Database Schema Migration](#database-schema-migration)
5. [API Compatibility Requirements](#api-compatibility-requirements)
6. [UI Integration Requirements](#ui-integration-requirements)
7. [Implementation Timeline](#implementation-timeline)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Current State Assessment

Our existing implementation is a **custom standalone system** that does NOT provide compatibility with standard LiteLLM deployments. We have:

- **Custom database schema** (9 tables) vs **Official LiteLLM schema** (28+ tables)
- **Incompatible user authentication system** 
- **Missing critical LiteLLM features** (virtual keys, spend tracking, etc.)
- **Non-standard API endpoints**

### Target State Requirements

To achieve **full LiteLLM compatibility**, we need to implement:

1. **Complete LiteLLM Database Schema** - All 28+ official tables
2. **Virtual Keys System** - Core LiteLLM authentication mechanism
3. **Official API Endpoints** - `/key/generate`, `/user/new`, etc.
4. **LiteLLM UI Integration** - Admin dashboard compatibility
5. **Spend Tracking & Budget Management** - Core LiteLLM features
6. **Team & Organization Management** - Standard LiteLLM hierarchy

### Business Impact

**Critical for Production Deployment:**
- Current system cannot integrate with existing LiteLLM installations
- Missing features required for enterprise customers
- Incompatible with LiteLLM documentation and community
- Cannot leverage existing LiteLLM ecosystem

---

## Compatibility Analysis

### Current Implementation vs Official LiteLLM

#### Database Schema Gaps

**Missing Core Tables (19 critical tables):**

```sql
-- Authentication & Keys
❌ LiteLLM_VerificationToken     -- Virtual keys (CRITICAL)
❌ LiteLLM_BudgetTable           -- Budget management
❌ LiteLLM_SpendLogs             -- Spend tracking (CRITICAL)

-- User & Organization Management  
❌ LiteLLM_EndUserTable          -- End user tracking
❌ LiteLLM_OrganizationMembership -- Org membership
❌ LiteLLM_TeamMembership        -- Team membership
❌ LiteLLM_InvitationLink        -- User invitations
❌ LiteLLM_ObjectPermissionTable -- Permissions system

-- Model & Provider Management
❌ LiteLLM_ProxyModelTable       -- Model configuration
❌ LiteLLM_CredentialsTable      -- Provider credentials
❌ LiteLLM_ModelTable            -- Model aliases

-- Monitoring & Operations
❌ LiteLLM_AuditLog             -- Audit trail
❌ LiteLLM_ErrorLogs            -- Error logging
❌ LiteLLM_HealthCheckTable     -- Health monitoring
❌ LiteLLM_UserNotifications    -- User notifications

-- Advanced Features
❌ LiteLLM_GuardrailsTable      -- Safety guardrails
❌ LiteLLM_Config               -- Configuration management
❌ LiteLLM_CronJob              -- Scheduled jobs
❌ LiteLLM_DailyTagSpend        -- Daily spend tracking
❌ LiteLLM_MCPServerTable       -- MCP server config
```

**Incompatible User Table Structure:**

| Field | Official LiteLLM | Our Implementation | Status |
|-------|-----------------|-------------------|--------|
| `user_id` | String @id | ✅ Matches | ✅ Compatible |
| `user_email` | String? | ✅ Matches | ✅ Compatible |
| `user_role` | String? | ❌ Limited roles | ⚠️ Needs expansion |
| `password` | String? | ❌ `password_hash` | ❌ Incompatible |
| `models` | String[] | ❌ Missing | ❌ Missing |
| `metadata` | Json | ❌ Missing | ❌ Missing |
| `max_parallel_requests` | Int? | ❌ Missing | ❌ Missing |
| `tpm_limit` | BigInt? | ❌ Missing | ❌ Missing |
| `rpm_limit` | BigInt? | ❌ Missing | ❌ Missing |
| `budget_duration` | String? | ❌ Missing | ❌ Missing |
| `budget_reset_at` | DateTime? | ❌ Missing | ❌ Missing |
| `model_spend` | Json | ❌ Missing | ❌ Missing |
| `model_max_budget` | Json | ❌ Missing | ❌ Missing |
| `user_alias` | String? | ❌ Missing | ❌ Missing |
| `sso_user_id` | String? | ❌ Missing | ❌ Missing |
| `teams` | String[] | ❌ Missing | ❌ Missing |
| `allowed_cache_controls` | String[] | ❌ Missing | ❌ Missing |

#### API Compatibility Gaps

**Missing Core Endpoints:**

```python
# Virtual Keys (CRITICAL - Core LiteLLM Feature)
❌ POST /key/generate              # Generate API keys
❌ POST /key/update               # Update key settings  
❌ POST /key/delete               # Delete keys
❌ GET /key/info                  # Key information

# User Management (Required for LiteLLM Integration)
❌ POST /user/new                 # Create users
❌ POST /user/update              # Update users
❌ POST /user/delete              # Delete users
❌ GET /user/info                 # User information

# Team & Organization Management
❌ POST /team/new                 # Create teams
❌ POST /team/update              # Update teams
❌ POST /organization/new         # Create organizations
❌ GET /spend/logs                # Spend tracking

# Model & Configuration Management
❌ POST /model/new                # Add models
❌ GET /model/info                # Model information
❌ POST /config/update            # Update configuration
```

**Our Custom Endpoints (Not in LiteLLM):**
```python
✅ /api/v1/connections/*          # Our custom connection management
✅ /api/v1/policies/*             # Our custom policy management
```

#### Authentication System Incompatibility

**LiteLLM Authentication Flow:**
1. **Master Key** → System admin access
2. **Virtual Keys** → User access with spend tracking
3. **JWT/OIDC** → Optional SSO integration

**Our Current Flow:**
1. **Email/Password** → JWT tokens
2. **Role-based access** → Custom roles
3. **No virtual keys** → Missing core LiteLLM feature

---

## Implementation Strategy

### Phase 1: Database Schema Compliance (Weeks 1-2)

#### 1.1 Official LiteLLM Schema Implementation

**Priority 1: Core Tables (Week 1)**

```sql
-- Virtual Keys Table (CRITICAL)
CREATE TABLE "LiteLLM_VerificationToken" (
    token          TEXT PRIMARY KEY,
    key_name       TEXT,
    key_alias      TEXT,
    spend          FLOAT DEFAULT 0.0,
    expires        TIMESTAMPTZ,
    models         TEXT[],
    aliases        JSONB DEFAULT '{}',
    config         JSONB DEFAULT '{}',
    user_id        TEXT,
    team_id        TEXT,
    permissions    JSONB DEFAULT '{}',
    max_parallel_requests INT,
    metadata       JSONB DEFAULT '{}',
    blocked        BOOLEAN,
    tpm_limit      BIGINT,
    rpm_limit      BIGINT,
    max_budget     FLOAT,
    budget_duration TEXT,
    budget_reset_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id),
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id)
);

-- Budget Table (CRITICAL)
CREATE TABLE "LiteLLM_BudgetTable" (
    budget_id      TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_budget     FLOAT,
    soft_budget    FLOAT,
    max_parallel_requests INT,
    tpm_limit      BIGINT,
    rpm_limit      BIGINT,
    model_max_budget JSONB,
    budget_duration TEXT,
    budget_reset_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by     TEXT
);

-- Spend Logs Table (CRITICAL)
CREATE TABLE "LiteLLM_SpendLogs" (
    request_id     TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key        TEXT,
    user_id        TEXT,
    team_id        TEXT,
    organization_id TEXT,
    model          TEXT,
    model_group    TEXT,
    api_base       TEXT,
    prompt_tokens  INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens   INT DEFAULT 0,
    spend          FLOAT DEFAULT 0.0,
    startTime      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    endTime        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completionStartTime TIMESTAMPTZ,
    model_parameters_json JSONB,
    spend_logs_metadata JSONB,
    request_tags   JSONB DEFAULT '[]',
    
    -- Partitioning by month for performance
    PARTITION BY RANGE (startTime)
);
```

**Priority 2: User & Organization Tables (Week 1)**

```sql
-- Update User Table to match official schema
ALTER TABLE "LiteLLM_UserTable" 
ADD COLUMN user_alias TEXT,
ADD COLUMN sso_user_id TEXT UNIQUE,
ADD COLUMN object_permission_id TEXT,
ADD COLUMN password TEXT, -- Keep our password_hash for compatibility
ADD COLUMN teams TEXT[] DEFAULT '{}',
ADD COLUMN models TEXT[] DEFAULT '{}',
ADD COLUMN metadata JSONB DEFAULT '{}',
ADD COLUMN max_parallel_requests INT,
ADD COLUMN tpm_limit BIGINT,
ADD COLUMN rpm_limit BIGINT,
ADD COLUMN budget_duration TEXT,
ADD COLUMN budget_reset_at TIMESTAMPTZ,
ADD COLUMN allowed_cache_controls TEXT[] DEFAULT '{}',
ADD COLUMN model_spend JSONB DEFAULT '{}',
ADD COLUMN model_max_budget JSONB DEFAULT '{}';

-- Organization Membership Table
CREATE TABLE "LiteLLM_OrganizationMembership" (
    membership_id  TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    user_role      TEXT,
    spend          FLOAT DEFAULT 0.0,
    budget_id      TEXT,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id),
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id),
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id)
);

-- Team Membership Table  
CREATE TABLE "LiteLLM_TeamMembership" (
    membership_id  TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        TEXT NOT NULL,
    team_id        TEXT NOT NULL,
    user_role      TEXT,
    spend          FLOAT DEFAULT 0.0,
    budget_id      TEXT,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id),
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id),
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id)
);
```

**Priority 3: Model & Configuration Tables (Week 2)**

```sql
-- Proxy Model Table
CREATE TABLE "LiteLLM_ProxyModelTable" (
    model_id       TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name     TEXT NOT NULL,
    litellm_params JSONB NOT NULL,
    model_info     JSONB,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by     TEXT
);

-- Credentials Table
CREATE TABLE "LiteLLM_CredentialsTable" (
    credential_id   TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_name TEXT UNIQUE NOT NULL,
    credential_values JSONB NOT NULL,
    credential_info JSONB,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by      TEXT
);

-- Model Table (for aliases)
CREATE TABLE "LiteLLM_ModelTable" (
    id             SERIAL PRIMARY KEY,
    aliases        JSONB,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT,
    updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by     TEXT
);
```

#### 1.2 Data Migration Strategy

**Preserve Existing Data:**
```sql
-- Migrate existing users to new schema
UPDATE "LiteLLM_UserTable" SET
    user_alias = user_email,
    models = ARRAY['gpt-3.5-turbo', 'gpt-4'], -- Default models
    metadata = '{"migrated_from": "custom_system"}'::jsonb
WHERE user_alias IS NULL;

-- Create default budgets for existing users
INSERT INTO "LiteLLM_BudgetTable" (budget_id, max_budget, created_by)
SELECT 
    'budget_' || user_id,
    COALESCE(max_budget, 100.0),
    'system_migration'
FROM "LiteLLM_UserTable"
WHERE user_id NOT IN (SELECT DISTINCT created_by FROM "LiteLLM_BudgetTable");
```

### Phase 2: API Compatibility Implementation (Weeks 3-4)

#### 2.1 Virtual Keys System (Week 3)

**Core Virtual Keys API:**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import secrets

router = APIRouter(prefix="/key")

class KeyGenerateRequest(BaseModel):
    models: List[str] = []
    aliases: dict = {}
    config: dict = {}
    spend: float = 0.0
    max_budget: Optional[float] = None
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    max_parallel_requests: Optional[int] = None
    metadata: dict = {}
    tpm_limit: Optional[int] = None
    rpm_limit: Optional[int] = None
    budget_duration: Optional[str] = None
    expires: Optional[datetime] = None
    key_alias: Optional[str] = None

class KeyResponse(BaseModel):
    key: str
    expires: Optional[datetime]
    user_id: Optional[str]
    max_budget: Optional[float]

@router.post("/generate")
async def generate_key(
    request: KeyGenerateRequest,
    current_user = Depends(verify_master_key)  # Master key required
) -> KeyResponse:
    """Generate virtual key - Core LiteLLM endpoint"""
    
    # Generate secure token
    token = f"sk-{secrets.token_urlsafe(32)}"
    
    # Store in verification token table
    verification_token = await create_verification_token(
        token=token,
        models=request.models,
        config=request.config,
        user_id=request.user_id,
        team_id=request.team_id,
        max_budget=request.max_budget,
        metadata=request.metadata,
        tpm_limit=request.tpm_limit,
        rpm_limit=request.rpm_limit,
        expires=request.expires
    )
    
    return KeyResponse(
        key=token,
        expires=verification_token.expires,
        user_id=verification_token.user_id,
        max_budget=verification_token.max_budget
    )

@router.post("/delete")
async def delete_key(
    keys: List[str],
    current_user = Depends(verify_master_key)
):
    """Delete virtual keys"""
    await delete_verification_tokens(keys)
    return {"status": "success", "deleted_keys": keys}

@router.get("/info")
async def get_key_info(
    key: str,
    current_user = Depends(verify_master_key)
):
    """Get key information"""
    token_info = await get_verification_token(key)
    if not token_info:
        raise HTTPException(404, "Key not found")
    return token_info
```

#### 2.2 User Management API (Week 3)

```python
@router.post("/user/new")
async def create_user(
    request: UserCreateRequest,
    current_user = Depends(verify_master_key)
) -> UserResponse:
    """Create user - Official LiteLLM endpoint"""
    
    user = await create_litellm_user(
        user_id=request.user_id or generate_user_id(),
        user_email=request.user_email,
        user_role=request.user_role or "CUSTOMER",
        team_id=request.team_id,
        organization_id=request.organization_id,
        models=request.models or [],
        max_budget=request.max_budget,
        metadata=request.metadata or {}
    )
    
    return UserResponse(**user.dict())

@router.post("/user/update")
async def update_user(
    request: UserUpdateRequest,
    current_user = Depends(verify_master_key)
):
    """Update user - Official LiteLLM endpoint"""
    await update_litellm_user(request.user_id, request.dict(exclude_unset=True))
    return {"status": "success"}

@router.post("/user/delete") 
async def delete_user(
    user_ids: List[str],
    current_user = Depends(verify_master_key)
):
    """Delete users - Official LiteLLM endpoint"""
    await delete_litellm_users(user_ids)
    return {"status": "success", "deleted_users": user_ids}
```

#### 2.3 Spend Tracking Integration (Week 4)

```python
@router.get("/spend/logs")
async def get_spend_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None,
    team_id: Optional[str] = None,
    api_key: Optional[str] = None,
    current_user = Depends(verify_master_key)
):
    """Get spend logs - Core LiteLLM feature"""
    
    logs = await query_spend_logs(
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        team_id=team_id,
        api_key=api_key
    )
    
    return {"data": logs, "total_spend": sum(log.spend for log in logs)}

# Middleware for spend logging
async def log_api_request(request, response, processing_time: float):
    """Log API usage to spend logs"""
    
    if hasattr(request.state, "user_api_key_dict"):
        key_dict = request.state.user_api_key_dict
        
        spend_log = SpendLog(
            request_id=str(uuid.uuid4()),
            api_key=key_dict.get("token"),
            user_id=key_dict.get("user_id"),
            team_id=key_dict.get("team_id"),
            model=request.state.model,
            total_tokens=getattr(request.state, "total_tokens", 0),
            spend=calculate_spend(request.state),
            startTime=request.state.start_time,
            endTime=datetime.now(timezone.utc)
        )
        
        await create_spend_log(spend_log)

### Phase 2.5: Environment Variables & Configuration (Week 4)

#### 2.5.1 Critical Environment Variables Setup

```bash
# Core LiteLLM Configuration
LITELLM_MASTER_KEY="3d82afe47512fcb1faba41cc1c9c796d3dbe8624b0a5c62fa68e6d38f0bf6d72"
LITELLM_MODE="PRODUCTION"
LITELLM_SALT_KEY="your-encryption-salt-key-32-chars-long"

# Admin UI Access (REQUIRED for /ui/ interface)
UI_USERNAME="admin"
UI_PASSWORD="secure_admin_password_123"

# Database Configuration
DATABASE_URL="postgresql://litellm_user:litellm_password@postgres:5432/litellm_connection_management"

# Optional Production Settings
LITELLM_LOG="ERROR"  # Reduce logging in production
DISABLE_SCHEMA_UPDATE="false"  # Allow schema updates during migration
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."  # For alerting

# Redis Configuration (Minimum v7.0+)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Provider API Keys (existing)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

#### 2.5.2 Updated LiteLLM Configuration File

```yaml
# /root/litellm-working.yaml - Updated for full compatibility
model_list:
  - model_name: gpt-3.5-turbo
    litellm_params:
      model: openai/gpt-3.5-turbo
      api_key: os.environ/OPENAI_API_KEY
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-3-sonnet-20240229
    litellm_params:
      model: anthropic/claude-3-sonnet-20240229
      api_key: os.environ/ANTHROPIC_API_KEY
  # ... other models

general_settings:
  master_key: "3d82afe47512fcb1faba41cc1c9c796d3dbe8624b0a5c62fa68e6d38f0bf6d72"
  database_url: "postgresql://litellm_user:litellm_password@postgres:5432/litellm_connection_management"
  
  # Enable Admin UI (CRITICAL for /ui/ access)
  ui_username: "admin"
  ui_password: "secure_admin_password_123"
  
  # Production Settings
  store_model_in_db: true
  drop_params: true
  add_function_to_prompt: true
  
  # Alerting
  alerting:
    - slack:
        webhook_url: os.environ/SLACK_WEBHOOK_URL
        default_webhook_url: os.environ/SLACK_WEBHOOK_URL
```

#### 2.5.3 Complete Prisma Schema (Official LiteLLM Schema)

```prisma
// schema.prisma - Complete LiteLLM compatibility schema
datasource client {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-py"
}

// Budget / Rate Limits for an org
model LiteLLM_BudgetTable {
  budget_id String @id @default(uuid())
  max_budget Float?
  soft_budget Float?
  max_parallel_requests Int?
  tpm_limit     BigInt?
  rpm_limit     BigInt?
  model_max_budget Json?
  budget_duration String?
  budget_reset_at DateTime?
  created_at    DateTime               @default(now()) @map("created_at")
  created_by String
  updated_at    DateTime               @default(now()) @updatedAt @map("updated_at")
  updated_by String
  organization LiteLLM_OrganizationTable[] 
  keys LiteLLM_VerificationToken[] 
  end_users LiteLLM_EndUserTable[] 
  team_membership LiteLLM_TeamMembership[] 
  organization_membership LiteLLM_OrganizationMembership[] 
}

// Generate Tokens for Proxy
model LiteLLM_VerificationToken {
    token      String   @id
    key_name   String?
    key_alias   String?
    spend      Float    @default(0.0)
    expires    DateTime?
    models     String[]
    aliases    Json  @default("{}")
    config     Json  @default("{}")
    user_id    String?
    team_id    String?
    permissions Json @default("{}")
    max_parallel_requests Int?
    metadata   Json  @default("{}")
    blocked Boolean?
    tpm_limit     BigInt?
    rpm_limit     BigInt?
    max_budget Float?
    budget_duration String?
    budget_reset_at DateTime?
    created_at    DateTime               @default(now()) @map("created_at")
    created_by String?
    updated_at    DateTime               @default(now()) @updatedAt @map("updated_at")
    updated_by String?
}

// Track spend, rate limit, budget Users
model LiteLLM_UserTable {
    user_id    String @id
    user_alias String?
    team_id    String?
    sso_user_id String? @unique
    organization_id String?
    password  String?
    teams    String[] @default([])
    user_role  String?
    max_budget Float?
    spend      Float    @default(0.0)
    user_email    String?
    models     String[]
    metadata  Json  @default("{}")
    max_parallel_requests Int?
    tpm_limit     BigInt?
    rpm_limit     BigInt?
    budget_duration String?
    budget_reset_at DateTime?
    allowed_cache_controls String[] @default([])
    model_spend      Json @default("{}")
    model_max_budget Json @default("{}")
    created_at      DateTime?               @default(now()) @map("created_at")
    updated_at      DateTime?               @default(now()) @updatedAt @map("updated_at")

    litellm_organization_table LiteLLM_OrganizationTable?                   @relation(fields: [organization_id], references: [organization_id])
    organization_memberships LiteLLM_OrganizationMembership[]
}

// Spend Logs table
model LiteLLM_SpendLogs {
    request_id      String   @id @default(uuid())
    api_key         String?
    user_id         String?
    team_id         String?
    organization_id String?
    model           String?
    api_base        String?
    prompt_tokens   Int      @default(0)
    completion_tokens Int    @default(0)
    total_tokens    Int      @default(0)
    spend           Float    @default(0.0)
    startTime       DateTime @default(now())
    endTime         DateTime @default(now())
    model_parameters_json Json?
    spend_logs_metadata Json?
    request_tags    Json     @default("[]")
}

// Add all other LiteLLM tables as needed...
```

### Phase 3: LiteLLM UI Integration (Week 5)

#### 3.1 Admin Dashboard Compatibility

**LiteLLM Admin UI Structure:**
```
/admin/
├── /                    # Dashboard overview
├── /keys               # Virtual keys management  
├── /users              # User management
├── /teams              # Team management
├── /models             # Model configuration
├── /spend              # Spend analytics
├── /settings           # System settings
└── /logs               # Audit logs
```

**Integration Requirements:**
1. **Mount at `/admin`** - Standard LiteLLM path
2. **Master key authentication** - LiteLLM auth method
3. **Real-time spend data** - From `LiteLLM_SpendLogs`
4. **Virtual keys management** - Core LiteLLM feature
5. **Model configuration** - Provider setup

#### 3.2 Frontend Architecture Update

```typescript
// LiteLLM-compatible admin interface
interface LiteLLMAdminProps {
  masterKey: string;
  apiBaseUrl: string;
}

interface VirtualKey {
  token: string;
  key_name?: string;
  key_alias?: string;
  user_id?: string;
  team_id?: string;
  models: string[];
  spend: number;
  max_budget?: number;
  expires?: Date;
  created_at: Date;
}

interface SpendLog {
  request_id: string;
  api_key: string;
  user_id?: string;
  model: string;
  total_tokens: number;
  spend: number;
  startTime: Date;
  endTime: Date;
}

// Virtual Keys Management Component
const VirtualKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<VirtualKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  const generateKey = async (params: KeyGenerateRequest) => {
    const response = await fetch('/key/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${masterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const newKey = await response.json();
    setKeys(prev => [...prev, newKey]);
  };
  
  return (
    <AdminLayout>
      <KeyGenerationForm onGenerate={generateKey} />
      <KeysTable keys={keys} onDelete={deleteKeys} />
    </AdminLayout>
  );
};
```

---

## Database Schema Migration

### Migration Strategy

#### Phase 1: Non-Breaking Additions (Week 1-2)

**Step 1: Add new official tables**
```sql
-- Add all missing LiteLLM tables
-- Keep existing custom tables for backward compatibility
-- Run migrations in transaction blocks
```

**Step 2: Update existing tables**
```sql
-- Add missing columns to LiteLLM_UserTable
-- Add missing columns to LiteLLM_TeamTable  
-- Add missing columns to LiteLLM_OrganizationTable
-- Maintain existing data integrity
```

#### Phase 2: Data Harmonization (Week 3)

**Step 3: Migrate custom data to official schema**
```sql
-- Migrate connection data to VerificationToken table
-- Create spend logs from connection activity
-- Map custom policies to official permission system
```

#### Phase 3: Cleanup (Week 4)

**Step 4: Remove custom tables (optional)**
```sql
-- Can keep custom tables for extended features
-- Or migrate data and remove for full compatibility
-- Decision based on feature requirements
```

### Migration Scripts

```sql
-- migration_001_add_official_tables.sql
CREATE TABLE IF NOT EXISTS "LiteLLM_VerificationToken" (...);
CREATE TABLE IF NOT EXISTS "LiteLLM_BudgetTable" (...);
CREATE TABLE IF NOT EXISTS "LiteLLM_SpendLogs" (...);
-- ... all other tables

-- migration_002_update_user_table.sql  
ALTER TABLE "LiteLLM_UserTable" ADD COLUMN IF NOT EXISTS user_alias TEXT;
ALTER TABLE "LiteLLM_UserTable" ADD COLUMN IF NOT EXISTS models TEXT[] DEFAULT '{}';
-- ... all missing columns

-- migration_003_create_default_data.sql
INSERT INTO "LiteLLM_BudgetTable" (budget_id, max_budget, created_by)
SELECT 'budget_' || user_id, COALESCE(max_budget, 100.0), 'migration'
FROM "LiteLLM_UserTable";

-- migration_004_create_verification_tokens.sql
-- Convert existing users to virtual keys
INSERT INTO "LiteLLM_VerificationToken" (token, user_id, models, spend)
SELECT 
    'sk-' || encode(gen_random_bytes(32), 'base64'),
    user_id,
    ARRAY['gpt-3.5-turbo', 'gpt-4'],
    spend
FROM "LiteLLM_UserTable";
```

---

## API Compatibility Requirements

### Master Key Authentication

```python
async def verify_master_key(
    authorization: str = Header(None)
) -> dict:
    """Verify master key for admin access"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Master key required")
        
    token = authorization.split(" ")[1]
    if token != settings.LITELLM_MASTER_KEY:
        raise HTTPException(401, "Invalid master key")
        
    return {"role": "admin", "user_id": "master"}

async def verify_virtual_key(
    authorization: str = Header(None)
) -> dict:
    """Verify virtual key for user access"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "API key required")
        
    token = authorization.split(" ")[1]
    key_info = await get_verification_token(token)
    
    if not key_info or key_info.blocked:
        raise HTTPException(401, "Invalid or blocked API key")
        
    # Check budget limits
    if key_info.max_budget and key_info.spend >= key_info.max_budget:
        raise HTTPException(429, "Budget limit exceeded")
        
    return key_info.dict()
```

### Complete API Endpoint Mapping

| LiteLLM Endpoint | Status | Implementation Priority |
|------------------|--------|----------------------|
| `POST /key/generate` | ❌ Missing | P0 - Critical |
| `POST /key/update` | ❌ Missing | P0 - Critical |  
| `POST /key/delete` | ❌ Missing | P0 - Critical |
| `GET /key/info` | ❌ Missing | P1 - High |
| `POST /user/new` | ❌ Missing | P0 - Critical |
| `POST /user/update` | ❌ Missing | P1 - High |
| `POST /user/delete` | ❌ Missing | P1 - High |
| `GET /user/info` | ❌ Missing | P1 - High |
| `POST /team/new` | ❌ Missing | P1 - High |
| `POST /team/update` | ❌ Missing | P2 - Medium |
| `POST /organization/new` | ❌ Missing | P2 - Medium |
| `GET /spend/logs` | ❌ Missing | P0 - Critical |
| `POST /model/new` | ❌ Missing | P1 - High |
| `GET /model/info` | ❌ Missing | P2 - Medium |
| `POST /config/update` | ❌ Missing | P2 - Medium |
| `GET /health` | ✅ Exists | P0 - Done |
| `GET /swagger` | ✅ Exists | P1 - Done |

---

## Implementation Timeline

### Week 1-2: Critical Database Schema Migration
- **Day 1**: Create Prisma schema file matching official LiteLLM
- **Day 2-3**: Create all 28+ missing LiteLLM tables
- **Day 4-5**: Update existing tables with missing columns
- **Day 6-7**: Data migration scripts for existing users/connections
- **Day 8-10**: Database testing and validation
- **Day 11-14**: Performance optimization and indexing

### Week 3-4: Core LiteLLM API Implementation  
- **Day 15-16**: Virtual keys system (`/key/generate`, `/key/delete`)
- **Day 17-18**: User management API (`/user/new`, `/user/update`)
- **Day 19-20**: Team/Organization APIs (`/team/new`, `/organization/new`)
- **Day 21-22**: Spend tracking and logging integration
- **Day 23-24**: Budget management APIs
- **Day 25-28**: Authentication middleware and testing

### Week 5: Official LiteLLM Admin UI Integration
- **Day 29-30**: Environment variables and LiteLLM config update
  - Add `UI_USERNAME`, `UI_PASSWORD`, `LITELLM_SALT_KEY`
  - Set `LITELLM_MODE=PRODUCTION`
  - Update `litellm-working.yaml` with UI settings
- **Day 31-32**: Enable official `/ui/` admin interface
  - Test `/ui/` endpoint accessibility
  - Verify master key authentication
  - Test virtual keys management interface
- **Day 33-34**: Nginx routing configuration for `/ui/` endpoint
  - Configure reverse proxy for `/ui/` path
  - SSL/HTTPS support for admin interface
  - Test production deployment
- **Day 35**: Test official LiteLLM admin UI functionality
  - User management through official UI
  - Virtual keys generation and management
  - Spend tracking and budget monitoring

### Week 6: Advanced Features & Production Readiness
- **Day 36-37**: Model configuration and credentials management
- **Day 38-39**: Audit logging and error tracking
- **Day 40-41**: Performance optimization and security hardening
- **Day 42**: Final testing and production deployment

### Week 7: Documentation & Migration Support
- **Day 43-45**: Migration documentation and rollback procedures
- **Day 46-49**: User training and transition support

---

## Risk Assessment

### High-Risk Items

1. **Data Migration Complexity** (Risk: High)
   - **Impact**: Data loss or corruption
   - **Mitigation**: Comprehensive backup and rollback procedures
   - **Testing**: Full migration testing on copy of production data

2. **Authentication System Overhaul** (Risk: High)  
   - **Impact**: Breaking existing user access
   - **Mitigation**: Gradual migration with backward compatibility
   - **Testing**: Parallel authentication testing

3. **API Breaking Changes** (Risk: Medium)
   - **Impact**: Frontend integration issues  
   - **Mitigation**: Versioned API with deprecation notices
   - **Testing**: API contract testing

### Success Criteria

1. **Full LiteLLM Compatibility**: All official endpoints working
2. **Data Integrity**: No data loss during migration  
3. **Performance**: No degradation from current system
4. **Backward Compatibility**: Existing features continue working

---

## Conclusion

This implementation will transform our custom system into a **fully LiteLLM-compatible deployment** that can:

1. **Integrate with existing LiteLLM installations**
2. **Leverage the full LiteLLM ecosystem** 
3. **Support all standard LiteLLM features**
4. **Maintain our custom enhancements** as extensions

**Timeline**: 6 weeks for complete compatibility  
**Effort**: High - Major architectural changes required  
**Business Value**: Critical for production deployment and enterprise adoption