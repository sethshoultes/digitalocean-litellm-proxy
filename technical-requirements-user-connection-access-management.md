# Technical Requirements: User Connection and Access Management Interface for LiteLLM

## 1. System Architecture Requirements

### 1.1 Integration Points with Existing LiteLLM Components

#### Core Proxy Integration
The User Connection and Access Management Interface must integrate seamlessly with the existing LiteLLM proxy architecture:

```python
# Integration with existing proxy_server.py
class UserConnectionManager:
    def __init__(self, proxy_server_instance):
        self.proxy_server = proxy_server_instance
        self.db_client = proxy_server_instance.master_key_db
        self.router = proxy_server_instance.router
        
    async def validate_user_connection(self, user_id: str, connection_id: str) -> bool:
        # Integrate with existing virtual key validation
        return await self.proxy_server.auth_handler.validate_token(connection_id)
```

#### Authentication Layer Integration
Leverage existing authentication mechanisms:

- **Virtual Key System**: Extend current `LiteLLM_VerificationToken` table
- **JWT Authentication**: Integrate with existing JWT validation flow
- **Master Key Authorization**: Use existing master key for admin operations

#### Router Integration
```python
# Extend existing router configuration
class ConnectionAwareRouter(LiteLLMRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.connection_manager = UserConnectionManager()
    
    async def aroute_request(self, request_data, user_connection_metadata=None):
        # Route considering user connection context
        if user_connection_metadata:
            request_data["connection_metadata"] = user_connection_metadata
        return await super().aroute_request(request_data)
```

### 1.2 Database Schema Extensions

#### New Tables Required

```sql
-- User Connections Table
CREATE TABLE LiteLLM_UserConnectionTable (
    connection_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    connection_name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(50) NOT NULL, -- 'api_key', 'oauth', 'sso'
    provider VARCHAR(100) NOT NULL,
    connection_config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB,
    FOREIGN KEY (user_id) REFERENCES LiteLLM_UserTable(user_id) ON DELETE CASCADE
);

-- Connection Access Control Table
CREATE TABLE LiteLLM_ConnectionAccessTable (
    access_id VARCHAR(255) PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255),
    organization_id VARCHAR(255),
    model_access JSONB, -- Array of allowed models
    rate_limits JSONB, -- Per-connection rate limits
    budget_limits JSONB, -- Spending limits specific to connection
    permissions JSONB, -- Granular permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES LiteLLM_TeamTable(team_id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES LiteLLM_OrganizationTable(organization_id) ON DELETE SET NULL
);

-- Connection Usage Logs
CREATE TABLE LiteLLM_ConnectionUsageTable (
    usage_id VARCHAR(255) PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255),
    model_used VARCHAR(255),
    tokens_used INTEGER,
    cost_incurred DECIMAL(10, 6),
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB,
    FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE CASCADE
);

-- Connection Templates
CREATE TABLE LiteLLM_ConnectionTemplateTable (
    template_id VARCHAR(255) PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    connection_type VARCHAR(50) NOT NULL,
    default_config JSONB NOT NULL,
    required_fields JSONB NOT NULL,
    optional_fields JSONB,
    validation_rules JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Extensions to Existing Tables

```sql
-- Extend LiteLLM_UserTable
ALTER TABLE LiteLLM_UserTable 
ADD COLUMN connection_preferences JSONB,
ADD COLUMN default_connection_id VARCHAR(255),
ADD COLUMN max_connections INTEGER DEFAULT 10;

-- Extend LiteLLM_VerificationTokenTable
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD COLUMN connection_id VARCHAR(255),
ADD FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE SET NULL;

-- Extend LiteLLM_SpendLogs
ALTER TABLE LiteLLM_SpendLogs 
ADD COLUMN connection_id VARCHAR(255),
ADD FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE SET NULL;
```

### 1.3 API Design Patterns

Following LiteLLM's existing patterns:

```python
# FastAPI router pattern
from fastapi import APIRouter, Depends, HTTPException
from litellm.proxy.auth import user_api_key_auth

connection_router = APIRouter(
    prefix="/user/connections",
    tags=["User Connections"],
    dependencies=[Depends(user_api_key_auth)]
)

# Consistent response models
class ConnectionResponse(BaseModel):
    connection_id: str
    connection_name: str
    provider: str
    status: str
    created_at: datetime
    last_used_at: Optional[datetime]
    usage_count: int

# Error handling pattern matching LiteLLM
class ConnectionError(Exception):
    def __init__(self, message: str, error_code: str):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)
```

## 2. Functional Requirements

### 2.1 Core Features and Capabilities

#### Connection Management
```python
class ConnectionManager:
    async def create_connection(
        self,
        user_id: str,
        connection_data: ConnectionCreateRequest
    ) -> ConnectionResponse:
        """
        Create new user connection with provider-specific validation
        """
        # 1. Validate connection configuration
        # 2. Test connection to external provider
        # 3. Store encrypted credentials
        # 4. Generate connection_id
        # 5. Create audit trail
        pass
    
    async def update_connection(
        self,
        connection_id: str,
        update_data: ConnectionUpdateRequest
    ) -> ConnectionResponse:
        """
        Update existing connection with validation
        """
        pass
    
    async def delete_connection(
        self,
        connection_id: str,
        user_id: str
    ) -> bool:
        """
        Soft delete connection and revoke associated tokens
        """
        pass
    
    async def test_connection(
        self,
        connection_id: str
    ) -> ConnectionTestResult:
        """
        Test connection health and return status
        """
        pass
```

#### Access Control Features
```python
class AccessControlManager:
    async def grant_connection_access(
        self,
        connection_id: str,
        grantee_id: str,
        permissions: Dict[str, Any]
    ) -> AccessGrantResponse:
        """
        Grant access to connection with specific permissions
        """
        pass
    
    async def revoke_connection_access(
        self,
        connection_id: str,
        grantee_id: str
    ) -> bool:
        """
        Revoke access to connection
        """
        pass
    
    async def list_connection_permissions(
        self,
        connection_id: str
    ) -> List[ConnectionPermission]:
        """
        List all permissions for a connection
        """
        pass
```

### 2.2 User Interface Components

#### React Components Structure
```typescript
// Connection management components
interface ConnectionListProps {
  userId: string;
  onConnectionSelect: (connection: Connection) => void;
}

interface ConnectionFormProps {
  connection?: Connection;
  providers: Provider[];
  onSubmit: (connectionData: ConnectionData) => Promise<void>;
  onCancel: () => void;
}

interface ConnectionTestProps {
  connectionId: string;
  onTestComplete: (result: TestResult) => void;
}

// Access management components
interface AccessControlPanelProps {
  connectionId: string;
  currentPermissions: Permission[];
  onPermissionChange: (permissions: Permission[]) => void;
}
```

#### UI Integration Points
```typescript
// Integration with existing LiteLLM UI patterns
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { ApiClient } from '@/services/api';

const ConnectionManager: React.FC = () => {
  const { user, token } = useAuth();
  const { showNotification } = useNotification();
  const apiClient = new ApiClient(token);
  
  // Component logic following existing patterns
};
```

### 2.3 Integration with Existing Auth System

#### Virtual Key Integration
```python
class ConnectionAwareVirtualKey(VirtualKey):
    def __init__(self, *args, connection_id: str = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.connection_id = connection_id
    
    async def validate_request(self, request_data: Dict) -> bool:
        # Validate using connection-specific rules
        if self.connection_id:
            connection = await get_connection(self.connection_id)
            if not connection or connection.status != 'active':
                return False
            
            # Apply connection-specific rate limits
            if await self.check_connection_rate_limits(connection):
                return False
        
        return await super().validate_request(request_data)
```

#### JWT Token Enhancement
```python
# Extend JWT payload with connection information
def generate_connection_aware_jwt(user_id: str, connection_id: str) -> str:
    payload = {
        "user_id": user_id,
        "connection_id": connection_id,
        "connection_permissions": get_connection_permissions(connection_id),
        "exp": datetime.utcnow() + timedelta(hours=24),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
```

## 3. Non-Functional Requirements

### 3.1 Performance Requirements

#### Response Time Targets
- Connection validation: < 100ms (95th percentile)
- Connection creation: < 2 seconds (95th percentile)
- Connection listing: < 500ms (95th percentile)
- Access control checks: < 50ms (95th percentile)

#### Throughput Requirements
- Support 10,000 concurrent connection validations
- Handle 1,000 connection management operations per minute
- Process 100,000 access control checks per minute

#### Caching Strategy
```python
# Redis caching for frequently accessed data
class ConnectionCache:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.connection_cache_ttl = 300  # 5 minutes
        self.access_cache_ttl = 60       # 1 minute
    
    async def get_connection(self, connection_id: str) -> Optional[Connection]:
        cached = await self.redis.get(f"connection:{connection_id}")
        if cached:
            return Connection.parse_raw(cached)
        
        # Fetch from database and cache
        connection = await db.get_connection(connection_id)
        if connection:
            await self.redis.setex(
                f"connection:{connection_id}",
                self.connection_cache_ttl,
                connection.json()
            )
        return connection
```

### 3.2 Security Requirements

#### Data Encryption
```python
# Encrypt sensitive connection data
from cryptography.fernet import Fernet

class ConnectionSecurityManager:
    def __init__(self, encryption_key: bytes):
        self.cipher_suite = Fernet(encryption_key)
    
    def encrypt_connection_config(self, config: Dict) -> str:
        """Encrypt sensitive configuration data"""
        config_json = json.dumps(config)
        return self.cipher_suite.encrypt(config_json.encode()).decode()
    
    def decrypt_connection_config(self, encrypted_config: str) -> Dict:
        """Decrypt configuration data"""
        decrypted_bytes = self.cipher_suite.decrypt(encrypted_config.encode())
        return json.loads(decrypted_bytes.decode())
```

#### Access Control Security
- Implement principle of least privilege
- Audit all connection access changes
- Rate limiting per user/connection
- Secure credential storage with encryption at rest

#### Authentication Requirements
```python
# Multi-factor authentication for sensitive operations
class MFAConnectionManager:
    async def require_mfa_for_operation(
        self,
        user_id: str,
        operation: str,
        connection_id: str
    ) -> bool:
        """
        Require MFA for sensitive connection operations
        """
        sensitive_operations = [
            'delete_connection',
            'share_connection',
            'modify_permissions'
        ]
        
        if operation in sensitive_operations:
            return await self.verify_mfa_token(user_id)
        return True
```

### 3.3 Scalability Considerations

#### Database Scaling
```python
# Database partitioning strategy
class PartitionedConnectionManager:
    def get_partition_key(self, user_id: str) -> str:
        """Determine partition based on user_id hash"""
        return f"connections_{hash(user_id) % 16:02d}"
    
    async def create_connection_with_partition(
        self,
        user_id: str,
        connection_data: Dict
    ) -> str:
        partition_key = self.get_partition_key(user_id)
        table_name = f"LiteLLM_UserConnectionTable_{partition_key}"
        # Create connection in appropriate partition
```

#### Horizontal Scaling
- Support for read replicas for connection queries
- Connection-aware load balancing
- Asynchronous background processing for analytics

#### Connection Pooling
```python
# Efficient connection pooling for external providers
class ProviderConnectionPool:
    def __init__(self):
        self.pools = {}
        self.max_pool_size = 100
    
    async def get_provider_client(self, connection_id: str):
        """Get or create pooled connection to external provider"""
        if connection_id not in self.pools:
            connection_config = await get_connection_config(connection_id)
            self.pools[connection_id] = await create_provider_pool(
                connection_config,
                max_size=self.max_pool_size
            )
        return self.pools[connection_id]
```

## 4. API Specifications

### 4.1 Key Endpoints

#### Connection Management Endpoints

```python
# POST /user/connections
@connection_router.post("/", response_model=ConnectionResponse)
async def create_connection(
    connection_data: ConnectionCreateRequest,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Create a new user connection
    
    Request Body:
    {
        "connection_name": "My OpenAI Connection",
        "provider": "openai",
        "connection_type": "api_key",
        "connection_config": {
            "api_key": "sk-...",
            "organization_id": "org-...",
            "base_url": "https://api.openai.com/v1"
        },
        "metadata": {
            "description": "Production OpenAI connection",
            "tags": ["production", "openai"]
        }
    }
    
    Response:
    {
        "connection_id": "conn_abc123",
        "connection_name": "My OpenAI Connection",
        "provider": "openai",
        "status": "active",
        "created_at": "2024-01-15T10:30:00Z",
        "last_used_at": null,
        "usage_count": 0
    }
    """
    pass

# GET /user/connections
@connection_router.get("/", response_model=List[ConnectionResponse])
async def list_connections(
    user_data: UserData = Depends(user_api_key_auth),
    provider: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    List user connections with optional filtering
    
    Query Parameters:
    - provider: Filter by provider (openai, anthropic, etc.)
    - status: Filter by status (active, inactive, suspended)
    - limit: Number of results to return (max 100)
    - offset: Pagination offset
    
    Response:
    [
        {
            "connection_id": "conn_abc123",
            "connection_name": "My OpenAI Connection",
            "provider": "openai",
            "status": "active",
            "created_at": "2024-01-15T10:30:00Z",
            "last_used_at": "2024-01-15T14:20:00Z",
            "usage_count": 42
        }
    ]
    """
    pass

# GET /user/connections/{connection_id}
@connection_router.get("/{connection_id}", response_model=ConnectionDetailResponse)
async def get_connection(
    connection_id: str,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Get detailed connection information
    
    Response:
    {
        "connection_id": "conn_abc123",
        "connection_name": "My OpenAI Connection",
        "provider": "openai",
        "connection_type": "api_key",
        "status": "active",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "last_used_at": "2024-01-15T14:20:00Z",
        "usage_count": 42,
        "usage_stats": {
            "total_requests": 42,
            "total_tokens": 15420,
            "total_cost": 0.0234
        },
        "permissions": {
            "models": ["gpt-3.5-turbo", "gpt-4"],
            "rate_limits": {
                "requests_per_minute": 60,
                "tokens_per_minute": 90000
            }
        }
    }
    """
    pass

# PUT /user/connections/{connection_id}
@connection_router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: str,
    update_data: ConnectionUpdateRequest,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Update connection configuration
    
    Request Body:
    {
        "connection_name": "Updated Connection Name",
        "connection_config": {
            "api_key": "sk-new-key...",
            "base_url": "https://api.openai.com/v1"
        },
        "metadata": {
            "description": "Updated description"
        }
    }
    """
    pass

# DELETE /user/connections/{connection_id}
@connection_router.delete("/{connection_id}")
async def delete_connection(
    connection_id: str,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Delete a connection (soft delete)
    
    Response:
    {
        "success": true,
        "message": "Connection deleted successfully"
    }
    """
    pass

# POST /user/connections/{connection_id}/test
@connection_router.post("/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_connection(
    connection_id: str,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Test connection to external provider
    
    Response:
    {
        "success": true,
        "response_time_ms": 245,
        "provider_status": "healthy",
        "available_models": ["gpt-3.5-turbo", "gpt-4"],
        "quota_info": {
            "remaining_requests": 4500,
            "quota_reset_time": "2024-01-16T00:00:00Z"
        }
    }
    """
    pass
```

#### Access Control Endpoints

```python
# POST /user/connections/{connection_id}/access
@connection_router.post("/{connection_id}/access", response_model=AccessGrantResponse)
async def grant_access(
    connection_id: str,
    access_data: AccessGrantRequest,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Grant access to connection
    
    Request Body:
    {
        "grantee_type": "user", // "user", "team", "organization"
        "grantee_id": "user_xyz789",
        "permissions": {
            "models": ["gpt-3.5-turbo"],
            "rate_limits": {
                "requests_per_minute": 30
            },
            "budget_limit": {
                "amount": 10.00,
                "currency": "USD",
                "period": "monthly"
            }
        },
        "expires_at": "2024-12-31T23:59:59Z"
    }
    
    Response:
    {
        "access_id": "access_def456",
        "connection_id": "conn_abc123",
        "grantee_id": "user_xyz789",
        "permissions": {...},
        "created_at": "2024-01-15T10:30:00Z",
        "expires_at": "2024-12-31T23:59:59Z"
    }
    """
    pass

# GET /user/connections/{connection_id}/access
@connection_router.get("/{connection_id}/access", response_model=List[AccessResponse])
async def list_access(
    connection_id: str,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    List all access grants for a connection
    """
    pass

# DELETE /user/connections/{connection_id}/access/{access_id}
@connection_router.delete("/{connection_id}/access/{access_id}")
async def revoke_access(
    connection_id: str,
    access_id: str,
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Revoke access to connection
    """
    pass
```

#### Analytics and Usage Endpoints

```python
# GET /user/connections/{connection_id}/usage
@connection_router.get("/{connection_id}/usage", response_model=UsageAnalyticsResponse)
async def get_usage_analytics(
    connection_id: str,
    start_date: datetime,
    end_date: datetime,
    granularity: str = "daily",  # hourly, daily, weekly, monthly
    user_data: UserData = Depends(user_api_key_auth)
):
    """
    Get usage analytics for a connection
    
    Response:
    {
        "connection_id": "conn_abc123",
        "period": {
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-31T23:59:59Z"
        },
        "total_usage": {
            "requests": 1250,
            "tokens": 456789,
            "cost": 12.34
        },
        "usage_by_model": {
            "gpt-3.5-turbo": {
                "requests": 1000,
                "tokens": 350000,
                "cost": 8.50
            },
            "gpt-4": {
                "requests": 250,
                "tokens": 106789,
                "cost": 3.84
            }
        },
        "daily_breakdown": [
            {
                "date": "2024-01-01",
                "requests": 45,
                "tokens": 15234,
                "cost": 0.42
            }
        ]
    }
    """
    pass
```

### 4.2 Request/Response Formats

#### Base Models
```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class ConnectionType(str, Enum):
    API_KEY = "api_key"
    OAUTH = "oauth"
    SSO = "sso"

class ConnectionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ERROR = "error"

class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    VERTEX_AI = "vertex_ai"
    BEDROCK = "bedrock"

class ConnectionCreateRequest(BaseModel):
    connection_name: str = Field(..., min_length=1, max_length=255)
    provider: Provider
    connection_type: ConnectionType
    connection_config: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None

class ConnectionUpdateRequest(BaseModel):
    connection_name: Optional[str] = Field(None, min_length=1, max_length=255)
    connection_config: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[ConnectionStatus] = None

class ConnectionResponse(BaseModel):
    connection_id: str
    connection_name: str
    provider: Provider
    connection_type: ConnectionType
    status: ConnectionStatus
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]
    usage_count: int
    expires_at: Optional[datetime]

class ConnectionDetailResponse(ConnectionResponse):
    usage_stats: Dict[str, Any]
    permissions: Dict[str, Any]
    shared_with: List[Dict[str, Any]]
```

### 4.3 Authentication and Authorization

#### API Key Authentication
```python
# Follow existing LiteLLM pattern
async def connection_api_key_auth(
    authorization: str = Header(...),
    x_connection_id: Optional[str] = Header(None)
) -> UserConnectionData:
    """
    Authenticate requests with connection-aware validation
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    # Validate against existing virtual key system
    user_data = await validate_virtual_key(token)
    
    # Additional connection validation if connection_id provided
    if x_connection_id:
        connection = await validate_connection_access(user_data.user_id, x_connection_id)
        if not connection:
            raise HTTPException(status_code=403, detail="Connection access denied")
        
        user_data.connection_id = x_connection_id
        user_data.connection_permissions = connection.permissions
    
    return user_data
```

#### JWT Authentication
```python
# Connection-aware JWT validation
async def validate_connection_jwt(token: str) -> UserConnectionData:
    """
    Validate JWT with connection information
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        connection_id = payload.get("connection_id")
        
        if connection_id:
            # Validate connection still exists and is active
            connection = await get_connection(connection_id)
            if not connection or connection.status != "active":
                raise HTTPException(status_code=403, detail="Connection no longer valid")
        
        return UserConnectionData(
            user_id=user_id,
            connection_id=connection_id,
            permissions=payload.get("connection_permissions", {})
        )
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### Rate Limiting
```python
# Connection-aware rate limiting
class ConnectionRateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def check_rate_limit(
        self,
        user_id: str,
        connection_id: Optional[str] = None,
        operation: str = "request"
    ) -> bool:
        """
        Check rate limits at user and connection level
        """
        # User-level rate limiting
        user_key = f"rate_limit:user:{user_id}:{operation}"
        user_count = await self.redis.incr(user_key)
        if user_count == 1:
            await self.redis.expire(user_key, 60)  # 1 minute window
        
        user_limit = await get_user_rate_limit(user_id, operation)
        if user_count > user_limit:
            return False
        
        # Connection-level rate limiting
        if connection_id:
            conn_key = f"rate_limit:connection:{connection_id}:{operation}"
            conn_count = await self.redis.incr(conn_key)
            if conn_count == 1:
                await self.redis.expire(conn_key, 60)
            
            conn_limit = await get_connection_rate_limit(connection_id, operation)
            if conn_count > conn_limit:
                return False
        
        return True
```

## 5. Data Model Extensions

### 5.1 Database Changes Required

#### Migration Scripts
```sql
-- Migration 001: Create user connection tables
-- File: migrations/001_create_user_connections.sql

BEGIN;

-- Create connection table
CREATE TABLE IF NOT EXISTS LiteLLM_UserConnectionTable (
    connection_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    connection_name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('api_key', 'oauth', 'sso')),
    provider VARCHAR(100) NOT NULL,
    connection_config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_user_connection_user 
        FOREIGN KEY (user_id) REFERENCES LiteLLM_UserTable(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_connections_user_id ON LiteLLM_UserConnectionTable(user_id);
CREATE INDEX idx_user_connections_provider ON LiteLLM_UserConnectionTable(provider);
CREATE INDEX idx_user_connections_status ON LiteLLM_UserConnectionTable(status);
CREATE INDEX idx_user_connections_created_at ON LiteLLM_UserConnectionTable(created_at);

-- Create access control table
CREATE TABLE IF NOT EXISTS LiteLLM_ConnectionAccessTable (
    access_id VARCHAR(255) PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    grantee_type VARCHAR(20) NOT NULL CHECK (grantee_type IN ('user', 'team', 'organization')),
    grantee_id VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_connection_access_connection 
        FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE CASCADE
);

-- Create indexes for access control
CREATE INDEX idx_connection_access_connection_id ON LiteLLM_ConnectionAccessTable(connection_id);
CREATE INDEX idx_connection_access_grantee ON LiteLLM_ConnectionAccessTable(grantee_type, grantee_id);
CREATE INDEX idx_connection_access_active ON LiteLLM_ConnectionAccessTable(is_active);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS LiteLLM_ConnectionUsageTable (
    usage_id VARCHAR(255) PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255),
    user_id VARCHAR(255),
    model_used VARCHAR(255),
    tokens_used INTEGER DEFAULT 0,
    cost_incurred DECIMAL(10, 6) DEFAULT 0,
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_connection_usage_connection 
        FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_usage_user 
        FOREIGN KEY (user_id) REFERENCES LiteLLM_UserTable(user_id) ON DELETE SET NULL
);

-- Create indexes for usage tracking
CREATE INDEX idx_connection_usage_connection_id ON LiteLLM_ConnectionUsageTable(connection_id);
CREATE INDEX idx_connection_usage_user_id ON LiteLLM_ConnectionUsageTable(user_id);
CREATE INDEX idx_connection_usage_timestamp ON LiteLLM_ConnectionUsageTable(request_timestamp);
CREATE INDEX idx_connection_usage_model ON LiteLLM_ConnectionUsageTable(model_used);

-- Create connection templates table
CREATE TABLE IF NOT EXISTS LiteLLM_ConnectionTemplateTable (
    template_id VARCHAR(255) PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    connection_type VARCHAR(50) NOT NULL,
    default_config JSONB NOT NULL DEFAULT '{}',
    required_fields JSONB NOT NULL DEFAULT '[]',
    optional_fields JSONB DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_connection_template_creator 
        FOREIGN KEY (created_by) REFERENCES LiteLLM_UserTable(user_id) ON DELETE SET NULL
);

-- Create indexes for templates
CREATE INDEX idx_connection_template_provider ON LiteLLM_ConnectionTemplateTable(provider);
CREATE INDEX idx_connection_template_active ON LiteLLM_ConnectionTemplateTable(is_active);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_connection_updated_at 
    BEFORE UPDATE ON LiteLLM_UserConnectionTable 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_access_updated_at 
    BEFORE UPDATE ON LiteLLM_ConnectionAccessTable 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_template_updated_at 
    BEFORE UPDATE ON LiteLLM_ConnectionTemplateTable 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

```sql
-- Migration 002: Extend existing tables
-- File: migrations/002_extend_existing_tables.sql

BEGIN;

-- Extend LiteLLM_UserTable
ALTER TABLE LiteLLM_UserTable 
ADD COLUMN IF NOT EXISTS connection_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_connection_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS max_connections INTEGER DEFAULT 10;

-- Add foreign key constraint for default_connection_id
ALTER TABLE LiteLLM_UserTable 
ADD CONSTRAINT fk_user_default_connection 
FOREIGN KEY (default_connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE SET NULL;

-- Extend LiteLLM_VerificationTokenTable
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD COLUMN IF NOT EXISTS connection_id VARCHAR(255);

-- Add foreign key constraint
ALTER TABLE LiteLLM_VerificationTokenTable 
ADD CONSTRAINT fk_verification_token_connection 
FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE SET NULL;

-- Extend LiteLLM_SpendLogs
ALTER TABLE LiteLLM_SpendLogs 
ADD COLUMN IF NOT EXISTS connection_id VARCHAR(255);

-- Add foreign key constraint
ALTER TABLE LiteLLM_SpendLogs 
ADD CONSTRAINT fk_spend_logs_connection 
FOREIGN KEY (connection_id) REFERENCES LiteLLM_UserConnectionTable(connection_id) ON DELETE SET NULL;

-- Create index on new columns
CREATE INDEX IF NOT EXISTS idx_verification_token_connection_id 
ON LiteLLM_VerificationTokenTable(connection_id);

CREATE INDEX IF NOT EXISTS idx_spend_logs_connection_id 
ON LiteLLM_SpendLogs(connection_id);

COMMIT;
```

### 5.2 Data Access Layer

#### Connection Repository
```python
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg
from pydantic import BaseModel

class ConnectionRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def create_connection(
        self,
        connection_data: Dict[str, Any]
    ) -> str:
        """Create a new connection and return connection_id"""
        query = """
        INSERT INTO LiteLLM_UserConnectionTable 
        (connection_id, user_id, connection_name, connection_type, provider, 
         connection_config, metadata, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING connection_id
        """
        
        async with self.db_pool.acquire() as conn:
            connection_id = await conn.fetchval(
                query,
                connection_data['connection_id'],
                connection_data['user_id'],
                connection_data['connection_name'],
                connection_data['connection_type'],
                connection_data['provider'],
                connection_data['connection_config'],
                connection_data.get('metadata', {}),
                connection_data.get('expires_at')
            )
            return connection_id
    
    async def get_connection(
        self,
        connection_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get connection by ID with optional user validation"""
        query = """
        SELECT * FROM LiteLLM_UserConnectionTable 
        WHERE connection_id = $1
        """ + ("AND user_id = $2" if user_id else "")
        
        async with self.db_pool.acquire() as conn:
            params = [connection_id]
            if user_id:
                params.append(user_id)
            
            row = await conn.fetchrow(query, *params)
            return dict(row) if row else None
    
    async def list_user_connections(
        self,
        user_id: str,
        provider: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List connections for a user with filtering"""
        base_query = """
        SELECT connection_id, connection_name, provider, status, 
               created_at, updated_at, last_used_at, usage_count
        FROM LiteLLM_UserConnectionTable 
        WHERE user_id = $1
        """
        
        params = [user_id]
        param_count = 1
        
        if provider:
            param_count += 1
            base_query += f" AND provider = ${param_count}"
            params.append(provider)
        
        if status:
            param_count += 1
            base_query += f" AND status = ${param_count}"
            params.append(status)
        
        base_query += f" ORDER BY created_at DESC LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
        params.extend([limit, offset])
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(base_query, *params)
            return [dict(row) for row in rows]
    
    async def update_connection(
        self,
        connection_id: str,
        user_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """Update connection data"""
        set_clauses = []
        params = []
        param_count = 0
        
        for field, value in update_data.items():
            if field in ['connection_name', 'connection_config', 'metadata', 'status']:
                param_count += 1
                set_clauses.append(f"{field} = ${param_count}")
                params.append(value)
        
        if not set_clauses:
            return False
        
        query = f"""
        UPDATE LiteLLM_UserConnectionTable 
        SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
        WHERE connection_id = ${param_count + 1} AND user_id = ${param_count + 2}
        """
        params.extend([connection_id, user_id])
        
        async with self.db_pool.acquire() as conn:
            result = await conn.execute(query, *params)
            return result.endswith("1")  # Check if one row was updated
    
    async def delete_connection(
        self,
        connection_id: str,
        user_id: str
    ) -> bool:
        """Soft delete connection by setting status to inactive"""
        query = """
        UPDATE LiteLLM_UserConnectionTable 
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE connection_id = $1 AND user_id = $2
        """
        
        async with self.db_pool.acquire() as conn:
            result = await conn.execute(query, connection_id, user_id)
            return result.endswith("1")
    
    async def record_connection_usage(
        self,
        usage_data: Dict[str, Any]
    ) -> str:
        """Record connection usage"""
        query = """
        INSERT INTO LiteLLM_ConnectionUsageTable 
        (usage_id, connection_id, request_id, user_id, model_used, 
         tokens_used, cost_incurred, response_time_ms, status_code, 
         error_message, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING usage_id
        """
        
        async with self.db_pool.acquire() as conn:
            usage_id = await conn.fetchval(
                query,
                usage_data['usage_id'],
                usage_data['connection_id'],
                usage_data.get('request_id'),
                usage_data.get('user_id'),
                usage_data.get('model_used'),
                usage_data.get('tokens_used', 0),
                usage_data.get('cost_incurred', 0),
                usage_data.get('response_time_ms'),
                usage_data.get('status_code'),
                usage_data.get('error_message'),
                usage_data.get('metadata', {})
            )
            
        # Update connection usage count
        await self.increment_usage_count(usage_data['connection_id'])
        
        return usage_id
    
    async def increment_usage_count(self, connection_id: str):
        """Increment connection usage count and update last_used_at"""
        query = """
        UPDATE LiteLLM_UserConnectionTable 
        SET usage_count = usage_count + 1, 
            last_used_at = CURRENT_TIMESTAMP
        WHERE connection_id = $1
        """
        
        async with self.db_pool.acquire() as conn:
            await conn.execute(query, connection_id)
```

### 5.3 Migration Considerations

#### Migration Strategy
```python
class ConnectionMigrationManager:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def check_migration_status(self) -> Dict[str, bool]:
        """Check which migrations have been applied"""
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'LiteLLM_%Connection%'
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query)
            existing_tables = [row['table_name'] for row in rows]
            
            return {
                'user_connection_table': 'LiteLLM_UserConnectionTable' in existing_tables,
                'connection_access_table': 'LiteLLM_ConnectionAccessTable' in existing_tables,
                'connection_usage_table': 'LiteLLM_ConnectionUsageTable' in existing_tables,
                'connection_template_table': 'LiteLLM_ConnectionTemplateTable' in existing_tables
            }
    
    async def migrate_existing_keys_to_connections(self):
        """Migrate existing virtual keys to connection system"""
        query = """
        SELECT token, user_id, aliases, config, spend, max_budget, 
               created_at, expires, metadata
        FROM LiteLLM_VerificationTokenTable
        WHERE connection_id IS NULL
        """
        
        async with self.db_pool.acquire() as conn:
            existing_keys = await conn.fetch(query)
            
            for key_row in existing_keys:
                # Create default connection for each existing key
                connection_id = f"conn_{key_row['token'][:8]}"
                
                # Determine provider from aliases or config
                provider = self.determine_provider_from_config(key_row['config'])
                
                # Create connection record
                await self.create_migration_connection(
                    connection_id=connection_id,
                    user_id=key_row['user_id'],
                    provider=provider,
                    original_token=key_row['token'],
                    metadata=key_row['metadata']
                )
                
                # Update verification token with connection_id
                await conn.execute(
                    "UPDATE LiteLLM_VerificationTokenTable SET connection_id = $1 WHERE token = $2",
                    connection_id, key_row['token']
                )
    
    def determine_provider_from_config(self, config: Dict) -> str:
        """Determine provider from existing configuration"""
        if not config:
            return "openai"  # Default
        
        # Logic to determine provider based on config structure
        if "anthropic" in str(config).lower():
            return "anthropic"
        elif "azure" in str(config).lower():
            return "azure"
        elif "vertex" in str(config).lower():
            return "vertex_ai"
        else:
            return "openai"
    
    async def rollback_migration(self):
        """Rollback connection migration if needed"""
        async with self.db_pool.acquire() as conn:
            # Remove connection references from existing tables
            await conn.execute(
                "UPDATE LiteLLM_VerificationTokenTable SET connection_id = NULL"
            )
            await conn.execute(
                "UPDATE LiteLLM_SpendLogs SET connection_id = NULL"
            )
            
            # Drop new tables
            await conn.execute("DROP TABLE IF EXISTS LiteLLM_ConnectionUsageTable CASCADE")
            await conn.execute("DROP TABLE IF EXISTS LiteLLM_ConnectionAccessTable CASCADE")
            await conn.execute("DROP TABLE IF EXISTS LiteLLM_ConnectionTemplateTable CASCADE")
            await conn.execute("DROP TABLE IF EXISTS LiteLLM_UserConnectionTable CASCADE")
```

#### Data Validation and Integrity
```python
class ConnectionDataValidator:
    @staticmethod
    def validate_connection_config(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate connection configuration based on provider"""
        validators = {
            "openai": ConnectionDataValidator.validate_openai_config,
            "anthropic": ConnectionDataValidator.validate_anthropic_config,
            "azure": ConnectionDataValidator.validate_azure_config,
            "vertex_ai": ConnectionDataValidator.validate_vertex_config
        }
        
        validator = validators.get(provider)
        if not validator:
            raise ValueError(f"Unsupported provider: {provider}")
        
        return validator(config)
    
    @staticmethod
    def validate_openai_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate OpenAI connection configuration"""
        required_fields = ["api_key"]
        optional_fields = ["organization_id", "base_url"]
        
        # Check required fields
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate API key format
        if not config["api_key"].startswith("sk-"):
            raise ValueError("Invalid OpenAI API key format")
        
        # Set defaults for optional fields
        validated_config = config.copy()
        if "base_url" not in validated_config:
            validated_config["base_url"] = "https://api.openai.com/v1"
        
        return validated_config
    
    @staticmethod
    def validate_anthropic_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Anthropic connection configuration"""
        required_fields = ["api_key"]
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
        
        if not config["api_key"].startswith("sk-ant-"):
            raise ValueError("Invalid Anthropic API key format")
        
        validated_config = config.copy()
        if "base_url" not in validated_config:
            validated_config["base_url"] = "https://api.anthropic.com"
        
        return validated_config
```

This comprehensive technical requirements document provides a detailed foundation for implementing the User Connection and Access Management Interface for LiteLLM. The specifications include:

1. **System Architecture**: Integration patterns with existing LiteLLM components
2. **Database Schema**: Complete table structures and migration scripts
3. **API Specifications**: Detailed endpoint definitions with request/response formats
4. **Security**: Authentication, authorization, and data protection measures
5. **Performance**: Caching strategies, rate limiting, and scalability considerations
6. **Data Models**: Repository patterns and data validation logic

The design follows LiteLLM's existing architectural patterns while extending functionality to support comprehensive user connection management and access control.