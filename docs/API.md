# LiteLLM User Connection and Access Management API Documentation

**Version:** 1.0.0  
**Base URL:** `https://api.litellm.example.com`  
**OpenAPI Specification:** 3.0.3

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Management Endpoints](#user-management-endpoints)
4. [Connection Management Endpoints](#connection-management-endpoints)
5. [Access Control Endpoints](#access-control-endpoints)
6. [Monitoring Endpoints](#monitoring-endpoints)
7. [Budget Management Endpoints](#budget-management-endpoints)
8. [Data Models](#data-models)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)
11. [WebSocket Events](#websocket-events)

---

## Overview

The LiteLLM User Connection and Access Management API provides comprehensive endpoints for managing users, connections, access control, and monitoring across LiteLLM proxy deployments. This RESTful API is designed to support enterprise-grade user management with real-time monitoring capabilities.

### Key Features

- **JWT and API Key Authentication** - Dual authentication methods for flexibility
- **Role-Based Access Control** - Hierarchical permission system
- **Real-Time Monitoring** - WebSocket-based live updates
- **Comprehensive Auditing** - Complete audit trail for all operations
- **Rate Limiting** - Configurable rate limits per user and operation
- **Multi-Tenant Support** - Organization and team-based isolation

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production  | `https://api.litellm.example.com` |
| Staging     | `https://staging-api.litellm.example.com` |
| Development | `http://localhost:8000` |

---

## Authentication

The API supports two authentication methods: JWT tokens and API keys. All endpoints require authentication unless explicitly noted.

### JWT Authentication

JWT tokens are used for web interface authentication and provide session management.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JWT Token Structure:**
```json
{
  "user_id": "user_123",
  "role": "ORG_ADMIN",
  "organization_id": "org_456",
  "connection_id": "conn_789",
  "permissions": ["read:users", "write:connections"],
  "exp": 1640995200,
  "iat": 1640991600
}
```

### API Key Authentication

API keys are used for programmatic access and service-to-service communication.

```http
Authorization: Bearer sk-litellm-abcd1234efgh5678ijkl...
```

### Authentication Endpoints

#### POST `/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "mfa_token": "123456"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "user_123",
    "email": "user@example.com",
    "role": "ORG_ADMIN",
    "organization_id": "org_456"
  }
}
```

#### POST `/auth/refresh`

Refresh JWT token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### POST `/auth/logout`

Invalidate current JWT token.

**Authentication Required:** Yes  
**Response:** `204 No Content`

---

## User Management Endpoints

### POST `/api/v1/users`

Create a new user account.

**Authentication Required:** Yes  
**Required Permissions:** `create:users`  
**Rate Limit:** 10 requests per minute

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "INTERNAL_USER",
  "organization_id": "org_123",
  "team_id": "team_456",
  "budget_limit": 1000.0,
  "metadata": {
    "department": "Engineering",
    "cost_center": "ENG-001"
  }
}
```

**Response (201 Created):**
```json
{
  "user_id": "user_789",
  "email": "newuser@example.com",
  "role": "INTERNAL_USER",
  "organization_id": "org_123",
  "team_id": "team_456",
  "budget_limit": 1000.0,
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "department": "Engineering",
    "cost_center": "ENG-001"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `409 Conflict` - User with email already exists
- `403 Forbidden` - Insufficient permissions

### GET `/api/v1/users`

List users with optional filtering and pagination.

**Authentication Required:** Yes  
**Required Permissions:** `read:users`  
**Rate Limit:** 100 requests per minute

**Query Parameters:**
- `organization_id` (string, optional) - Filter by organization
- `team_id` (string, optional) - Filter by team
- `role` (string, optional) - Filter by role
- `status` (string, optional) - Filter by status
- `limit` (integer, default: 50, max: 100) - Number of results
- `offset` (integer, default: 0) - Pagination offset
- `search` (string, optional) - Search by email or name

**Response (200 OK):**
```json
{
  "users": [
    {
      "user_id": "user_123",
      "email": "user@example.com",
      "role": "INTERNAL_USER",
      "organization_id": "org_456",
      "team_id": "team_789",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T14:22:00Z",
      "connection_count": 3,
      "monthly_spend": 45.67
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### GET `/api/v1/users/{user_id}`

Get detailed information about a specific user.

**Authentication Required:** Yes  
**Required Permissions:** `read:users` or own user data  
**Rate Limit:** 100 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "email": "user@example.com",
  "role": "INTERNAL_USER",
  "organization_id": "org_456",
  "team_id": "team_789",
  "budget_limit": 1000.0,
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:22:00Z",
  "last_login": "2024-01-20T14:22:00Z",
  "connection_preferences": {
    "default_provider": "openai",
    "auto_retry": true
  },
  "default_connection_id": "conn_abc123",
  "max_connections": 10,
  "active_connections": 3,
  "usage_stats": {
    "total_requests": 1542,
    "total_tokens": 234567,
    "total_cost": 234.56,
    "current_month_cost": 45.67
  },
  "metadata": {
    "department": "Engineering",
    "cost_center": "ENG-001"
  }
}
```

### PUT `/api/v1/users/{user_id}`

Update user information.

**Authentication Required:** Yes  
**Required Permissions:** `update:users` or own user data  
**Rate Limit:** 50 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Request Body:**
```json
{
  "role": "TEAM_ADMIN",
  "budget_limit": 1500.0,
  "team_id": "team_new_123",
  "connection_preferences": {
    "default_provider": "anthropic",
    "auto_retry": false
  },
  "metadata": {
    "department": "Engineering",
    "cost_center": "ENG-002"
  }
}
```

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "email": "user@example.com",
  "role": "TEAM_ADMIN",
  "budget_limit": 1500.0,
  "updated_at": "2024-01-21T09:15:00Z",
  "message": "User updated successfully"
}
```

### DELETE `/api/v1/users/{user_id}`

Delete a user account (soft delete).

**Authentication Required:** Yes  
**Required Permissions:** `delete:users`  
**Rate Limit:** 10 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "user_id": "user_123"
}
```

### POST `/api/v1/users/bulk`

Bulk create or update users.

**Authentication Required:** Yes  
**Required Permissions:** `create:users`, `update:users`  
**Rate Limit:** 5 requests per minute

**Request Body:**
```json
{
  "operation": "create",
  "users": [
    {
      "email": "user1@example.com",
      "role": "INTERNAL_USER",
      "organization_id": "org_123",
      "budget_limit": 500.0
    },
    {
      "email": "user2@example.com",
      "role": "INTERNAL_USER",
      "organization_id": "org_123",
      "budget_limit": 750.0
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "total_processed": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "email": "user1@example.com",
      "user_id": "user_new_1",
      "status": "created"
    },
    {
      "email": "user2@example.com",
      "user_id": "user_new_2",
      "status": "created"
    }
  ]
}
```

---

## Connection Management Endpoints

### POST `/api/v1/connections`

Create a new user connection to an LLM provider.

**Authentication Required:** Yes  
**Required Permissions:** `create:connections`  
**Rate Limit:** 30 requests per minute

**Request Body:**
```json
{
  "connection_name": "Production OpenAI",
  "provider": "openai",
  "connection_type": "api_key",
  "connection_config": {
    "api_key": "sk-proj-1234567890abcdef...",
    "organization_id": "org-OpenAIOrg123",
    "base_url": "https://api.openai.com/v1"
  },
  "metadata": {
    "description": "Production OpenAI connection for main application",
    "tags": ["production", "openai", "gpt-4"],
    "cost_center": "ENG-001"
  },
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Response (201 Created):**
```json
{
  "connection_id": "conn_abc123",
  "connection_name": "Production OpenAI",
  "provider": "openai",
  "connection_type": "api_key",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "last_used_at": null,
  "usage_count": 0,
  "expires_at": "2024-12-31T23:59:59Z",
  "metadata": {
    "description": "Production OpenAI connection for main application",
    "tags": ["production", "openai", "gpt-4"],
    "cost_center": "ENG-001"
  }
}
```

### GET `/api/v1/connections`

List user connections with optional filtering.

**Authentication Required:** Yes  
**Required Permissions:** `read:connections`  
**Rate Limit:** 100 requests per minute

**Query Parameters:**
- `provider` (string, optional) - Filter by provider (openai, anthropic, azure, etc.)
- `status` (string, optional) - Filter by status (active, inactive, suspended, error)
- `connection_type` (string, optional) - Filter by type (api_key, oauth, sso)
- `limit` (integer, default: 50, max: 100) - Number of results
- `offset` (integer, default: 0) - Pagination offset
- `search` (string, optional) - Search by connection name

**Response (200 OK):**
```json
{
  "connections": [
    {
      "connection_id": "conn_abc123",
      "connection_name": "Production OpenAI",
      "provider": "openai",
      "connection_type": "api_key",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "last_used_at": "2024-01-20T14:22:00Z",
      "usage_count": 1542,
      "expires_at": "2024-12-31T23:59:59Z"
    },
    {
      "connection_id": "conn_def456",
      "connection_name": "Development Anthropic",
      "provider": "anthropic",
      "connection_type": "api_key",
      "status": "active",
      "created_at": "2024-01-16T11:45:00Z",
      "last_used_at": "2024-01-20T13:15:00Z",
      "usage_count": 287,
      "expires_at": null
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### GET `/api/v1/connections/{connection_id}`

Get detailed information about a specific connection.

**Authentication Required:** Yes  
**Required Permissions:** `read:connections`  
**Rate Limit:** 100 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Response (200 OK):**
```json
{
  "connection_id": "conn_abc123",
  "connection_name": "Production OpenAI",
  "provider": "openai",
  "connection_type": "api_key",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:22:00Z",
  "last_used_at": "2024-01-20T14:22:00Z",
  "usage_count": 1542,
  "expires_at": "2024-12-31T23:59:59Z",
  "connection_config": {
    "api_key": "sk-proj-1234****************************5678",
    "organization_id": "org-OpenAIOrg123",
    "base_url": "https://api.openai.com/v1"
  },
  "usage_stats": {
    "total_requests": 1542,
    "total_tokens": 234567,
    "total_cost": 234.56,
    "avg_response_time_ms": 850,
    "success_rate": 0.987
  },
  "health_status": {
    "status": "healthy",
    "last_check": "2024-01-20T14:22:00Z",
    "response_time_ms": 245,
    "available_models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
  },
  "access_policies": [
    {
      "policy_id": "policy_123",
      "grantee_type": "team",
      "grantee_id": "team_456",
      "permissions": {
        "models": ["gpt-3.5-turbo", "gpt-4"],
        "rate_limits": {
          "requests_per_minute": 60,
          "tokens_per_minute": 90000
        }
      }
    }
  ],
  "metadata": {
    "description": "Production OpenAI connection for main application",
    "tags": ["production", "openai", "gpt-4"],
    "cost_center": "ENG-001"
  }
}
```

### PUT `/api/v1/connections/{connection_id}`

Update connection configuration.

**Authentication Required:** Yes  
**Required Permissions:** `update:connections`  
**Rate Limit:** 30 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Request Body:**
```json
{
  "connection_name": "Updated Production OpenAI",
  "connection_config": {
    "api_key": "sk-proj-new-key-abcdef...",
    "base_url": "https://api.openai.com/v1"
  },
  "metadata": {
    "description": "Updated production connection with new API key",
    "tags": ["production", "openai", "gpt-4", "updated"]
  }
}
```

**Response (200 OK):**
```json
{
  "connection_id": "conn_abc123",
  "connection_name": "Updated Production OpenAI",
  "updated_at": "2024-01-21T09:15:00Z",
  "message": "Connection updated successfully"
}
```

### DELETE `/api/v1/connections/{connection_id}`

Delete a connection (soft delete).

**Authentication Required:** Yes  
**Required Permissions:** `delete:connections`  
**Rate Limit:** 10 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection deleted successfully",
  "connection_id": "conn_abc123"
}
```

### POST `/api/v1/connections/{connection_id}/test`

Test connection health and validate credentials.

**Authentication Required:** Yes  
**Required Permissions:** `test:connections`  
**Rate Limit:** 20 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Request Body (Optional):**
```json
{
  "test_model": "gpt-3.5-turbo",
  "timeout_seconds": 30
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "connection_id": "conn_abc123",
  "test_timestamp": "2024-01-21T10:30:00Z",
  "response_time_ms": 245,
  "provider_status": "healthy",
  "available_models": [
    "gpt-3.5-turbo",
    "gpt-4",
    "gpt-4-turbo",
    "gpt-4o"
  ],
  "quota_info": {
    "remaining_requests": 4500,
    "quota_reset_time": "2024-01-22T00:00:00Z",
    "rate_limit_per_minute": 3500
  },
  "test_results": {
    "authentication": "success",
    "api_connectivity": "success",
    "model_access": "success"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "connection_id": "conn_abc123",
  "test_timestamp": "2024-01-21T10:30:00Z",
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API key provided",
    "details": {
      "provider_error": "Incorrect API key provided",
      "suggestion": "Please verify your API key is correct and has not expired"
    }
  }
}
```

---

## Access Control Endpoints

### POST `/api/v1/connections/{connection_id}/access`

Grant access to a connection for users, teams, or organizations.

**Authentication Required:** Yes  
**Required Permissions:** `manage:access`  
**Rate Limit:** 30 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Request Body:**
```json
{
  "grantee_type": "team",
  "grantee_id": "team_456",
  "permissions": {
    "models": ["gpt-3.5-turbo", "gpt-4"],
    "rate_limits": {
      "requests_per_minute": 60,
      "tokens_per_minute": 90000,
      "requests_per_day": 5000
    },
    "budget_limit": {
      "amount": 500.0,
      "currency": "USD",
      "period": "monthly"
    },
    "allowed_operations": ["chat", "completion", "embedding"]
  },
  "conditions": {
    "time_restrictions": {
      "allowed_hours": "09:00-17:00",
      "timezone": "UTC",
      "allowed_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    "ip_restrictions": ["192.168.1.0/24", "10.0.0.0/8"]
  },
  "expires_at": "2024-12-31T23:59:59Z",
  "metadata": {
    "reason": "Team project access",
    "approved_by": "manager@example.com"
  }
}
```

**Response (201 Created):**
```json
{
  "access_id": "access_def456",
  "connection_id": "conn_abc123",
  "grantee_type": "team",
  "grantee_id": "team_456",
  "permissions": {
    "models": ["gpt-3.5-turbo", "gpt-4"],
    "rate_limits": {
      "requests_per_minute": 60,
      "tokens_per_minute": 90000,
      "requests_per_day": 5000
    },
    "budget_limit": {
      "amount": 500.0,
      "currency": "USD",
      "period": "monthly"
    },
    "allowed_operations": ["chat", "completion", "embedding"]
  },
  "created_at": "2024-01-21T10:30:00Z",
  "expires_at": "2024-12-31T23:59:59Z",
  "is_active": true
}
```

### GET `/api/v1/connections/{connection_id}/access`

List all access grants for a connection.

**Authentication Required:** Yes  
**Required Permissions:** `read:access`  
**Rate Limit:** 100 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier

**Query Parameters:**
- `grantee_type` (string, optional) - Filter by grantee type
- `is_active` (boolean, optional) - Filter by active status
- `limit` (integer, default: 50) - Number of results
- `offset` (integer, default: 0) - Pagination offset

**Response (200 OK):**
```json
{
  "access_grants": [
    {
      "access_id": "access_def456",
      "grantee_type": "team",
      "grantee_id": "team_456",
      "grantee_name": "AI Development Team",
      "permissions": {
        "models": ["gpt-3.5-turbo", "gpt-4"],
        "rate_limits": {
          "requests_per_minute": 60
        }
      },
      "created_at": "2024-01-21T10:30:00Z",
      "expires_at": "2024-12-31T23:59:59Z",
      "is_active": true,
      "usage_stats": {
        "requests_used": 1250,
        "tokens_used": 125000,
        "cost_incurred": 125.50
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### PUT `/api/v1/connections/{connection_id}/access/{access_id}`

Update access permissions for a connection.

**Authentication Required:** Yes  
**Required Permissions:** `manage:access`  
**Rate Limit:** 30 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier
- `access_id` (string, required) - Access grant identifier

**Request Body:**
```json
{
  "permissions": {
    "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
    "rate_limits": {
      "requests_per_minute": 120,
      "tokens_per_minute": 150000
    },
    "budget_limit": {
      "amount": 750.0,
      "currency": "USD",
      "period": "monthly"
    }
  },
  "expires_at": "2025-06-30T23:59:59Z"
}
```

**Response (200 OK):**
```json
{
  "access_id": "access_def456",
  "connection_id": "conn_abc123",
  "updated_at": "2024-01-21T15:45:00Z",
  "message": "Access permissions updated successfully"
}
```

### DELETE `/api/v1/connections/{connection_id}/access/{access_id}`

Revoke access to a connection.

**Authentication Required:** Yes  
**Required Permissions:** `manage:access`  
**Rate Limit:** 20 requests per minute

**Path Parameters:**
- `connection_id` (string, required) - Connection identifier
- `access_id` (string, required) - Access grant identifier

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access revoked successfully",
  "access_id": "access_def456",
  "revoked_at": "2024-01-21T16:00:00Z"
}
```

### GET `/api/v1/users/{user_id}/access`

Get all access grants for a specific user.

**Authentication Required:** Yes  
**Required Permissions:** `read:access` or own user data  
**Rate Limit:** 100 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "direct_access": [
    {
      "connection_id": "conn_abc123",
      "connection_name": "Production OpenAI",
      "access_id": "access_direct_123",
      "permissions": {
        "models": ["gpt-3.5-turbo"],
        "rate_limits": {
          "requests_per_minute": 30
        }
      }
    }
  ],
  "team_access": [
    {
      "team_id": "team_456",
      "team_name": "AI Development Team",
      "connections": [
        {
          "connection_id": "conn_def456",
          "connection_name": "Team Anthropic",
          "permissions": {
            "models": ["claude-3-5-sonnet-20241022"],
            "rate_limits": {
              "requests_per_minute": 60
            }
          }
        }
      ]
    }
  ],
  "organization_access": [
    {
      "organization_id": "org_789",
      "organization_name": "Acme Corp",
      "connections": [
        {
          "connection_id": "conn_ghi789",
          "connection_name": "Org Azure OpenAI",
          "permissions": {
            "models": ["gpt-4"],
            "rate_limits": {
              "requests_per_minute": 100
            }
          }
        }
      ]
    }
  ]
}
```

---

## Monitoring Endpoints

### GET `/api/v1/monitoring/connections`

Get real-time connection status and health metrics.

**Authentication Required:** Yes  
**Required Permissions:** `read:monitoring`  
**Rate Limit:** 200 requests per minute

**Query Parameters:**
- `user_id` (string, optional) - Filter by user
- `organization_id` (string, optional) - Filter by organization
- `provider` (string, optional) - Filter by provider
- `status` (string, optional) - Filter by health status

**Response (200 OK):**
```json
{
  "summary": {
    "total_connections": 1250,
    "healthy": 1180,
    "degraded": 45,
    "unhealthy": 15,
    "testing": 10
  },
  "connections": [
    {
      "connection_id": "conn_abc123",
      "connection_name": "Production OpenAI",
      "provider": "openai",
      "status": "healthy",
      "health_score": 0.987,
      "response_time_ms": 245,
      "last_check": "2024-01-21T16:30:00Z",
      "uptime_percentage": 99.95,
      "error_rate": 0.013,
      "active_requests": 12,
      "queue_depth": 0
    },
    {
      "connection_id": "conn_def456",
      "connection_name": "Development Anthropic",
      "provider": "anthropic",
      "status": "degraded",
      "health_score": 0.75,
      "response_time_ms": 1250,
      "last_check": "2024-01-21T16:29:45Z",
      "uptime_percentage": 97.2,
      "error_rate": 0.05,
      "active_requests": 3,
      "queue_depth": 5,
      "alerts": [
        {
          "severity": "warning",
          "message": "High response time detected",
          "timestamp": "2024-01-21T16:25:00Z"
        }
      ]
    }
  ],
  "timestamp": "2024-01-21T16:30:00Z"
}
```

### GET `/api/v1/monitoring/usage`

Get real-time usage statistics and analytics.

**Authentication Required:** Yes  
**Required Permissions:** `read:monitoring`  
**Rate Limit:** 100 requests per minute

**Query Parameters:**
- `time_range` (string, required) - Time range (1h, 6h, 24h, 7d, 30d)
- `granularity` (string, optional) - Data granularity (minute, hour, day)
- `user_id` (string, optional) - Filter by user
- `connection_id` (string, optional) - Filter by connection
- `model` (string, optional) - Filter by model

**Response (200 OK):**
```json
{
  "time_range": {
    "start": "2024-01-20T16:30:00Z",
    "end": "2024-01-21T16:30:00Z",
    "granularity": "hour"
  },
  "summary": {
    "total_requests": 15420,
    "total_tokens": 2345678,
    "total_cost": 234.56,
    "success_rate": 0.987,
    "avg_response_time_ms": 850
  },
  "usage_by_hour": [
    {
      "timestamp": "2024-01-21T16:00:00Z",
      "requests": 450,
      "tokens": 67890,
      "cost": 6.78,
      "avg_response_time_ms": 820
    }
  ],
  "usage_by_model": [
    {
      "model": "gpt-3.5-turbo",
      "requests": 8500,
      "tokens": 1234567,
      "cost": 123.45,
      "percentage": 55.1
    },
    {
      "model": "gpt-4",
      "requests": 4200,
      "tokens": 789012,
      "cost": 89.01,
      "percentage": 27.2
    }
  ],
  "usage_by_provider": [
    {
      "provider": "openai",
      "requests": 12000,
      "cost": 180.50,
      "percentage": 77.8
    },
    {
      "provider": "anthropic",
      "requests": 3420,
      "cost": 54.06,
      "percentage": 22.2
    }
  ],
  "top_users": [
    {
      "user_id": "user_123",
      "email": "poweruser@example.com",
      "requests": 2500,
      "cost": 45.60,
      "percentage": 16.2
    }
  ]
}
```

### GET `/api/v1/monitoring/alerts`

Get active alerts and notifications.

**Authentication Required:** Yes  
**Required Permissions:** `read:monitoring`  
**Rate Limit:** 100 requests per minute

**Query Parameters:**
- `severity` (string, optional) - Filter by severity (critical, warning, info)
- `type` (string, optional) - Filter by alert type
- `is_active` (boolean, optional) - Filter by active status
- `limit` (integer, default: 50) - Number of results

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "alert_id": "alert_123",
      "type": "budget_threshold",
      "severity": "warning",
      "title": "Budget threshold exceeded",
      "message": "User user_456 has exceeded 75% of monthly budget",
      "resource_type": "user",
      "resource_id": "user_456",
      "threshold_value": 750.0,
      "current_value": 800.50,
      "created_at": "2024-01-21T15:30:00Z",
      "is_active": true,
      "is_acknowledged": false
    },
    {
      "alert_id": "alert_124",
      "type": "connection_failure",
      "severity": "critical",
      "title": "Connection health check failed",
      "message": "Connection conn_def456 failing health checks",
      "resource_type": "connection",
      "resource_id": "conn_def456",
      "error_details": {
        "error_code": "AUTHENTICATION_FAILED",
        "last_success": "2024-01-21T14:20:00Z",
        "failure_count": 5
      },
      "created_at": "2024-01-21T16:00:00Z",
      "is_active": true,
      "is_acknowledged": false
    }
  ],
  "summary": {
    "total_active": 12,
    "critical": 2,
    "warning": 7,
    "info": 3
  }
}
```

### POST `/api/v1/monitoring/alerts/{alert_id}/acknowledge`

Acknowledge an alert.

**Authentication Required:** Yes  
**Required Permissions:** `manage:alerts`  
**Rate Limit:** 50 requests per minute

**Path Parameters:**
- `alert_id` (string, required) - Alert identifier

**Request Body:**
```json
{
  "acknowledgment_note": "Investigating the budget overage issue"
}
```

**Response (200 OK):**
```json
{
  "alert_id": "alert_123",
  "acknowledged_at": "2024-01-21T16:45:00Z",
  "acknowledged_by": "user_admin_123",
  "acknowledgment_note": "Investigating the budget overage issue"
}
```

---

## Budget Management Endpoints

### GET `/api/v1/budgets/users/{user_id}`

Get budget information and spending analytics for a user.

**Authentication Required:** Yes  
**Required Permissions:** `read:budgets` or own user data  
**Rate Limit:** 100 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Query Parameters:**
- `period` (string, optional) - Budget period (current, previous, custom)
- `start_date` (string, optional) - Start date for custom period (ISO 8601)
- `end_date` (string, optional) - End date for custom period (ISO 8601)

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "budget_config": {
    "monthly_limit": 1000.0,
    "currency": "USD",
    "alert_thresholds": [500.0, 750.0, 900.0],
    "auto_cutoff_enabled": true,
    "rollover_enabled": false
  },
  "current_period": {
    "period": "2024-01",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-31T23:59:59Z",
    "total_spent": 456.78,
    "remaining_budget": 543.22,
    "percentage_used": 45.68,
    "days_remaining": 10,
    "projected_spend": 750.20,
    "projected_overage": 0.0
  },
  "spending_breakdown": {
    "by_model": [
      {
        "model": "gpt-3.5-turbo",
        "spent": 234.56,
        "percentage": 51.3
      },
      {
        "model": "gpt-4",
        "spent": 187.42,
        "percentage": 41.0
      }
    ],
    "by_connection": [
      {
        "connection_id": "conn_abc123",
        "connection_name": "Production OpenAI",
        "spent": 320.45,
        "percentage": 70.1
      }
    ],
    "by_day": [
      {
        "date": "2024-01-21",
        "spent": 23.45,
        "requests": 150
      }
    ]
  },
  "alerts": [
    {
      "threshold": 500.0,
      "triggered_at": "2024-01-18T14:30:00Z",
      "current_spend": 500.12
    }
  ]
}
```

### PUT `/api/v1/budgets/users/{user_id}`

Update budget configuration for a user.

**Authentication Required:** Yes  
**Required Permissions:** `manage:budgets`  
**Rate Limit:** 30 requests per minute

**Path Parameters:**
- `user_id` (string, required) - User identifier

**Request Body:**
```json
{
  "monthly_limit": 1500.0,
  "alert_thresholds": [750.0, 1125.0, 1350.0],
  "auto_cutoff_enabled": true,
  "rollover_enabled": true,
  "rollover_percentage": 10.0
}
```

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "budget_config": {
    "monthly_limit": 1500.0,
    "currency": "USD",
    "alert_thresholds": [750.0, 1125.0, 1350.0],
    "auto_cutoff_enabled": true,
    "rollover_enabled": true,
    "rollover_percentage": 10.0
  },
  "updated_at": "2024-01-21T17:00:00Z",
  "message": "Budget configuration updated successfully"
}
```

### GET `/api/v1/budgets/organizations/{organization_id}`

Get organization-level budget information and analytics.

**Authentication Required:** Yes  
**Required Permissions:** `read:org_budgets`  
**Rate Limit:** 50 requests per minute

**Path Parameters:**
- `organization_id` (string, required) - Organization identifier

**Response (200 OK):**
```json
{
  "organization_id": "org_123",
  "budget_config": {
    "monthly_limit": 50000.0,
    "currency": "USD",
    "allocation_method": "team_based"
  },
  "current_period": {
    "period": "2024-01",
    "total_budget": 50000.0,
    "total_spent": 23456.78,
    "remaining_budget": 26543.22,
    "percentage_used": 46.91
  },
  "team_allocations": [
    {
      "team_id": "team_456",
      "team_name": "AI Development Team",
      "allocated_budget": 15000.0,
      "spent": 8750.45,
      "remaining": 6249.55,
      "percentage_used": 58.34
    },
    {
      "team_id": "team_789",
      "team_name": "Data Science Team",
      "allocated_budget": 20000.0,
      "spent": 12456.33,
      "remaining": 7543.67,
      "percentage_used": 62.28
    }
  ],
  "top_spending_users": [
    {
      "user_id": "user_123",
      "email": "poweruser@example.com",
      "spent": 1234.56,
      "team_name": "AI Development Team"
    }
  ]
}
```

### POST `/api/v1/budgets/alerts`

Create a custom budget alert.

**Authentication Required:** Yes  
**Required Permissions:** `manage:budgets`  
**Rate Limit:** 20 requests per minute

**Request Body:**
```json
{
  "alert_type": "user_budget_threshold",
  "resource_type": "user",
  "resource_id": "user_123",
  "threshold_value": 800.0,
  "threshold_type": "absolute",
  "notification_channels": ["email", "slack"],
  "message_template": "User {{user_email}} has spent ${{current_spend}} of their ${{budget_limit}} monthly budget",
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "alert_id": "budget_alert_456",
  "alert_type": "user_budget_threshold",
  "resource_type": "user",
  "resource_id": "user_123",
  "threshold_value": 800.0,
  "created_at": "2024-01-21T17:30:00Z",
  "is_active": true
}
```

---

## Data Models

### User

```typescript
interface User {
  user_id: string;
  email: string;
  role: "PROXY_ADMIN" | "ORG_ADMIN" | "TEAM_ADMIN" | "INTERNAL_USER" | "CUSTOMER";
  organization_id: string;
  team_id?: string;
  budget_limit?: number;
  status: "active" | "inactive" | "suspended";
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_login?: string; // ISO 8601
  connection_preferences?: {
    default_provider?: string;
    auto_retry?: boolean;
    timeout_seconds?: number;
  };
  default_connection_id?: string;
  max_connections: number;
  metadata?: Record<string, any>;
}
```

### Connection

```typescript
interface Connection {
  connection_id: string;
  connection_name: string;
  provider: "openai" | "anthropic" | "azure" | "vertex_ai" | "bedrock";
  connection_type: "api_key" | "oauth" | "sso";
  status: "active" | "inactive" | "suspended" | "error";
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_used_at?: string; // ISO 8601
  usage_count: number;
  expires_at?: string; // ISO 8601
  connection_config: {
    api_key?: string; // Masked in responses
    organization_id?: string;
    base_url?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}
```

### AccessGrant

```typescript
interface AccessGrant {
  access_id: string;
  connection_id: string;
  grantee_type: "user" | "team" | "organization";
  grantee_id: string;
  permissions: {
    models?: string[];
    rate_limits?: {
      requests_per_minute?: number;
      tokens_per_minute?: number;
      requests_per_day?: number;
    };
    budget_limit?: {
      amount: number;
      currency: string;
      period: "monthly" | "daily" | "weekly";
    };
    allowed_operations?: string[];
  };
  conditions?: {
    time_restrictions?: {
      allowed_hours?: string;
      timezone?: string;
      allowed_days?: string[];
    };
    ip_restrictions?: string[];
  };
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  expires_at?: string; // ISO 8601
  is_active: boolean;
  metadata?: Record<string, any>;
}
```

### UsageStats

```typescript
interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  success_rate: number;
  avg_response_time_ms: number;
  period: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  breakdown_by_model?: Array<{
    model: string;
    requests: number;
    tokens: number;
    cost: number;
    percentage: number;
  }>;
  breakdown_by_time?: Array<{
    timestamp: string; // ISO 8601
    requests: number;
    tokens: number;
    cost: number;
  }>;
}
```

### Alert

```typescript
interface Alert {
  alert_id: string;
  type: "budget_threshold" | "connection_failure" | "rate_limit" | "security" | "custom";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  resource_type: "user" | "connection" | "team" | "organization" | "system";
  resource_id: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  is_active: boolean;
  is_acknowledged: boolean;
  acknowledged_at?: string; // ISO 8601
  acknowledged_by?: string;
  acknowledgment_note?: string;
  details?: Record<string, any>;
}
```

---

## Error Handling

### Standard HTTP Status Codes

| Status Code | Description | Usage |
|-------------|-------------|--------|
| 200 | OK | Successful GET, PUT, DELETE requests |
| 201 | Created | Successful POST requests that create resources |
| 204 | No Content | Successful requests with no response body |
| 400 | Bad Request | Invalid request data or parameters |
| 401 | Unauthorized | Authentication required or invalid |
| 403 | Forbidden | Access denied or insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or constraint violation |
| 422 | Unprocessable Entity | Valid JSON but invalid data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service unavailable |
| 503 | Service Unavailable | Temporary service unavailability |

### Error Response Format

All error responses follow this consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field_name",
      "issue": "Specific issue description"
    },
    "request_id": "req_abc123",
    "timestamp": "2024-01-21T10:30:00Z",
    "documentation_url": "https://docs.litellm.example.com/errors/ERROR_CODE"
  }
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | 403 | Access denied |
| `RESOURCE_NOT_FOUND` | 404 | Resource does not exist |
| `RESOURCE_ALREADY_EXISTS` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CONNECTION_TEST_FAILED` | 400 | Connection test failed |
| `BUDGET_EXCEEDED` | 403 | Budget limit exceeded |
| `PROVIDER_ERROR` | 502 | External provider error |

### Validation Errors

Validation errors include detailed field-level information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "code": "INVALID_FORMAT"
        },
        {
          "field": "budget_limit",
          "message": "Must be greater than 0",
          "code": "INVALID_VALUE"
        }
      ]
    },
    "request_id": "req_abc123"
  }
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

### Rate Limits by Endpoint Category

| Category | Rate Limit | Window |
|----------|------------|--------|
| Authentication | 5 requests | 1 minute |
| User Management | 100 requests | 1 minute |
| Connection Management | 50 requests | 1 minute |
| Access Control | 30 requests | 1 minute |
| Monitoring | 200 requests | 1 minute |
| Budget Management | 50 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |
| Connection Testing | 20 requests | 1 minute |

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 100,
      "window": 60,
      "retry_after": 45
    },
    "request_id": "req_rate_limit_123"
  }
}
```

### Rate Limit Bypass

Enterprise customers can request rate limit increases or bypasses for specific use cases.

---

## WebSocket Events

The API provides real-time updates through WebSocket connections for monitoring and live data.

### Connection

Connect to the WebSocket endpoint with authentication:

```javascript
const ws = new WebSocket('wss://api.litellm.example.com/ws');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: 'your_jwt_token'
}));
```

### Event Types

#### Connection Status Updates

Real-time connection health and status changes:

```json
{
  "type": "connection_status",
  "data": {
    "connection_id": "conn_abc123",
    "status": "healthy",
    "response_time_ms": 245,
    "timestamp": "2024-01-21T16:30:00Z"
  }
}
```

#### Usage Updates

Real-time usage statistics:

```json
{
  "type": "usage_update",
  "data": {
    "user_id": "user_123",
    "connection_id": "conn_abc123",
    "requests_count": 1,
    "tokens_used": 150,
    "cost_incurred": 0.0023,
    "timestamp": "2024-01-21T16:30:00Z"
  }
}
```

#### Budget Alerts

Real-time budget threshold notifications:

```json
{
  "type": "budget_alert",
  "data": {
    "alert_id": "alert_budget_123",
    "user_id": "user_456",
    "threshold_percentage": 75,
    "current_spend": 750.50,
    "budget_limit": 1000.0,
    "timestamp": "2024-01-21T16:30:00Z"
  }
}
```

#### System Alerts

Critical system notifications:

```json
{
  "type": "system_alert",
  "data": {
    "alert_id": "alert_system_456",
    "severity": "critical",
    "title": "Multiple connection failures detected",
    "message": "Several OpenAI connections are failing authentication",
    "affected_connections": ["conn_abc123", "conn_def456"],
    "timestamp": "2024-01-21T16:30:00Z"
  }
}
```

### Subscription Management

Subscribe to specific event types:

```json
{
  "type": "subscribe",
  "events": ["connection_status", "usage_update", "budget_alert"],
  "filters": {
    "user_id": "user_123",
    "organization_id": "org_456"
  }
}
```

---

**API Documentation Version:** 1.0.0  
**Last Updated:** January 21, 2024  
**Contact:** api-support@litellm.example.com  
**Documentation:** https://docs.litellm.example.com/api