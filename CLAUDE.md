# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is the **LiteLLM User Connection and Access Management Interface** - a comprehensive web-based dashboard that extends LiteLLM proxy deployments with centralized user authentication, connection management, and access control across multiple LLM providers.

The project addresses the operational complexity of managing users, API keys, teams, and organizations in LiteLLM by providing enterprise-grade management interfaces with real-time monitoring, budget control, and security features.

## Common Development Commands

### Database Operations

```bash
# Start database services
docker-compose up -d postgres redis

# Initialize database with schema
docker-compose exec postgres psql -U litellm_user -d litellm_connection_management -f /docker-entrypoint-initdb.d/01_extensions.sql

# Run all initialization scripts in order
for script in database/init/*.sql; do
    docker-compose exec postgres psql -U litellm_user -d litellm_connection_management -f "/docker-entrypoint-initdb.d/$(basename $script)"
done

# Connect to database for debugging
docker-compose exec postgres psql -U litellm_user -d litellm_connection_management
```

### Backend Development Environment

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn src.main:app --reload --port 8001

# Run database migrations (when Alembic is configured)
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

### Frontend Development Environment

```bash
# Navigate to frontend directory
cd frontend/

# Install Node.js dependencies
npm install

# Start React development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Lint and format code
npm run lint
npm run format

# Run frontend tests
npm run test
npm run test:coverage
```

### Full Stack Development

```bash
# Start all services for development (RECOMMENDED)
/root/process-manager.sh start

# Individual service management
/root/process-manager.sh backend   # Start backend API
/root/process-manager.sh frontend  # Start frontend dev server
/root/process-manager.sh litellm   # Start LiteLLM proxy

# Service monitoring
/root/process-manager.sh status    # Check all service status
/root/process-manager.sh stop      # Stop all services

# Legacy manual startup (NOT RECOMMENDED)
docker-compose up -d postgres redis  # Database services
uvicorn src.main:app --reload --port 8001 &  # Backend API
cd frontend && npm run dev --port 3005 &  # Frontend dev server

# Access points:
# - Admin Interface: https://64.23.251.16.nip.io/admin/
# - LiteLLM Proxy: https://64.23.251.16.nip.io/
# - Backend API: https://64.23.251.16.nip.io/admin-api/
# - Local Backend: http://localhost:8001
# - Local Frontend: http://localhost:3005
# - Database: localhost:5432
# - Redis: localhost:6379
```

### LiteLLM Model Management

```bash
# Check available models
curl -H "Authorization: Bearer 3d82afe47512fcb1faba41cc1c9c796d3dbe8624b0a5c62fa68e6d38f0bf6d72" \
  http://localhost:4000/v1/models

# Test model functionality
curl -X POST "http://localhost:4000/v1/chat/completions" \
  -H "Authorization: Bearer 3d82afe47512fcb1faba41cc1c9c796d3dbe8624b0a5c62fa68e6d38f0bf6d72" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-opus-20240229", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 10}'

# Available models (7 total):
# - gpt-3.5-turbo, gpt-4o, gpt-4o-mini (OpenAI)
# - claude-3-sonnet-20240229, claude-3-opus-20240229, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022 (Anthropic)

# Environment variable management
source /root/.env                    # Load environment variables
echo $OPENAI_API_KEY | cut -c1-20   # Check OpenAI key (first 20 chars)
echo $ANTHROPIC_API_KEY | cut -c1-20 # Check Anthropic key (first 20 chars)
```

### Testing Commands

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=src --cov-report=html --cov-report=xml

# Run specific test modules
pytest tests/unit/test_connections.py
pytest tests/unit/test_auth.py

# Run integration tests
pytest tests/integration/

# Run tests with async support
pytest --asyncio-mode=auto

# Run tests matching specific patterns
pytest -k "test_connection" -v

# Test authentication endpoints manually
curl -X POST "http://localhost:8001/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email": "test@example.com", "password": "testpassword"}'
curl -X GET "http://localhost:8001/api/v1/auth/me" -H "Authorization: Bearer YOUR_TOKEN"

# Test connection endpoints manually (requires auth token)
curl -X GET "http://localhost:8001/api/v1/connections/" -H "Authorization: Bearer YOUR_TOKEN"
curl -X POST "http://localhost:8001/api/v1/connections/" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"connection_name": "Test Connection", "provider": "openai", "configuration": {"api_key": "sk-test", "model": "gpt-3.5-turbo"}}'
```

### Code Quality

```bash
# Format code
black src/ tests/
isort src/ tests/

# Lint code
flake8 src/ tests/
mypy src/

# Run all quality checks
black --check src/ && isort --check-only src/ && flake8 src/ && mypy src/

# CI/CD quality checks (matches GitHub Actions)
black --check src/ tests/ && isort --check-only src/ tests/ && flake8 src/ tests/ && mypy src/
```

### GitHub Actions and CI/CD

```bash
# Local development to match CI pipeline
pip install pytest pytest-cov pytest-asyncio black isort flake8 mypy

# Run the same checks as CI locally
pytest --cov=src --cov-report=xml --cov-report=html
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/
mypy src/

# Security scanning (requires Docker)
docker run --rm -v $(pwd):/scan aquasec/trivy fs --format table /scan

# GitHub CLI commands for repository management
gh secret set SECRET_NAME --body "secret_value"
gh pr create --title "Title" --body "Description"
gh workflow run ci.yml
```

## Architecture Overview

### Database Architecture

The system extends LiteLLM's existing PostgreSQL schema with 6 new tables:

- **LiteLLM_UserConnections**: Core connection definitions with encrypted credentials
- **LiteLLM_AccessPolicies**: Reusable permission policy templates  
- **LiteLLM_UserAccessPolicies**: User-to-policy associations with expiration
- **LiteLLM_ConnectionActivity**: Partitioned activity tracking by month
- **LiteLLM_ConnectionTemplates**: Provider-specific configuration templates
- **LiteLLM_SharedConnections**: Team/organization-level connection sharing

**Key Database Features:**
- Monthly partitioning on `ConnectionActivity` for performance at scale
- JSONB columns with GIN indexes for flexible configuration storage
- Credential encryption using PostgreSQL's `pgcrypto` extension
- Automated triggers for audit logging and updated_at timestamps
- Validation functions for provider-specific configurations

### Application Architecture

**Backend Stack:**
- FastAPI with async/await for high-performance API endpoints
- SQLAlchemy 2.0 with AsyncPG for database operations
- Redis for session storage and caching
- JWT tokens for authentication with refresh token rotation
- Prometheus metrics for monitoring and alerting

**Key Architectural Patterns:**
- Repository pattern for database access layer
- Service layer for business logic isolation
- Dependency injection for testing and configurability
- Event-driven architecture for real-time updates
- Circuit breaker pattern for external LLM provider calls

### Integration Points

**LiteLLM Proxy Integration:**
- Extends existing authentication middleware
- Hooks into spend tracking via `LiteLLM_SpendLogs`
- Integrates with existing user/team/organization tables
- Maintains compatibility with LiteLLM's virtual key system

**External Dependencies:**
- **Provider APIs**: OpenAI, Anthropic, Azure OpenAI, AWS Bedrock, etc.
- **Authentication**: Optional SSO integration (SAML, OAuth2)
- **Monitoring**: Prometheus, Grafana for observability
- **Storage**: PostgreSQL for persistence, Redis for caching

## Development Patterns

### Model Relationships

The SQLAlchemy models follow a specific relationship pattern:

```python
# Core entities use UUID primary keys
class UserConnection(Base):
    connection_id: UUID (primary key)
    user_id: str (foreign key to LiteLLM_UserTable)
    
# Many-to-many relationships use association tables
class UserAccessPolicy(Base):
    user_id: str (composite primary key)
    policy_id: UUID (composite primary key)
    
# Activity tables are partitioned by timestamp
class ConnectionActivity(Base):
    activity_id: UUID (primary key with timestamp)
    timestamp: datetime (partition key)
```

### Configuration Management

Configuration is layered across multiple sources:

1. **Database**: Connection-specific configurations in JSONB columns
2. **Environment Variables**: Secrets and deployment-specific settings
3. **Config Files**: LiteLLM integration and feature flags
4. **Runtime**: Dynamic settings managed through the API

### Error Handling Strategy

The application uses structured error handling:

```python
# Custom exceptions inherit from base classes
class ConnectionError(BaseException):
    def __init__(self, connection_id: str, provider: str, details: str)

# Consistent error response format
{
    "error": {
        "code": "CONNECTION_FAILED",
        "message": "Connection test failed",
        "details": {"provider": "openai", "status_code": 401},
        "request_id": "req_abc123"
    }
}
```

### Testing Strategy

**Test Organization:**
- `tests/unit/`: Fast unit tests for individual functions
- `tests/integration/`: Database and API integration tests  
- `tests/e2e/`: End-to-end workflow tests
- `tests/fixtures/`: Shared test data and helper functions

**Database Testing:**
- Use pytest fixtures for database setup/teardown
- Transaction rollback after each test for isolation
- Separate test database to avoid conflicts
- Mock external API calls to LLM providers

## Security Considerations

### Credential Management

- API keys encrypted with AES-256 before database storage
- Encryption keys managed via environment variables
- Credential masking in logs and UI responses
- Automatic rotation capabilities for supported providers

### Access Control Implementation

- Role-based permissions with hierarchical inheritance
- Policy-based access control for fine-grained permissions
- Session management with configurable timeouts
- Multi-factor authentication for administrative functions

### Audit and Compliance

- Comprehensive audit logging for all administrative actions
- Immutable audit trail with tamper detection
- GDPR compliance features (data export, deletion)
- SOC 2 Type II compliance monitoring

## Performance Considerations

### Database Optimization

- Partitioned tables for time-series data (activity logs)
- Selective indexes on frequently queried columns
- JSONB GIN indexes for configuration searches
- Connection pooling for high-concurrency access

### Caching Strategy

- Redis caching for frequently accessed data
- Connection configuration caching with TTL
- User session caching for authentication
- Provider health status caching to reduce external calls

### Monitoring and Alerting

- Prometheus metrics for key performance indicators
- Real-time health checks for all connections
- Automated alerting for connection failures
- Performance tracking for response times and throughput

## Common Debugging Scenarios

### Connection Issues

1. Check provider-specific configuration validation
2. Verify credential encryption/decryption
3. Test network connectivity to provider endpoints
4. Review rate limiting and quota status

### Database Performance

1. Analyze slow query logs in PostgreSQL
2. Check partition pruning for activity queries
3. Monitor connection pool utilization
4. Verify index usage with EXPLAIN ANALYZE

### Authentication Problems

1. Validate JWT token expiration and signatures
2. Check Redis session storage connectivity
3. Verify role-based permission assignments
4. Test MFA configuration and backup codes

This architecture enables scalable, secure, and maintainable user connection management while maintaining full compatibility with existing LiteLLM deployments.

## Current Implementation Status

### ✅ Production-Ready Full Stack Application

**Backend Platform (100% Complete):**
- JWT access and refresh token implementation with role-based access control
- Complete CRUD operations for connections and policies
- Provider support for OpenAI, Anthropic, Azure, AWS, Google, etc.
- PostgreSQL with all 6 tables implemented + Redis caching
- Enterprise-grade security with input validation and error handling
- 20 API endpoints fully operational and production-ready

**Frontend Application (100% Complete):**
- React 18 + TypeScript + Material-UI professional interface
- Complete authentication system with JWT integration
- Real-time dashboard with metrics, charts, and activity feeds
- Role-based UI with admin vs user interface differentiation
- Responsive design optimized for mobile, tablet, and desktop
- Connection and policy management interfaces with full CRUD operations

**LiteLLM Integration (100% Complete):**
- 7 LLM models: OpenAI (gpt-3.5-turbo, gpt-4o, gpt-4o-mini) + Anthropic (Claude 3 Sonnet, Claude 3 Opus, Claude 3.5 Sonnet, Claude 3.5 Haiku)
- Full OpenAI-compatible API with master key authentication
- Environment variable management with persistent .env configuration
- Docker-based deployment with automated process management

**Infrastructure & DevOps (100% Complete):**
- Production deployment on DigitalOcean with SSL/HTTPS
- Docker Compose setup with memory limits and resource optimization
- Process management tools for development workflow
- 1GB swap space for memory overflow protection
- Automated service monitoring and health checks

### 🚀 Production URLs

**Live Services:**
- **Admin Interface:** https://64.23.251.16.nip.io/admin/
- **LiteLLM Proxy:** https://64.23.251.16.nip.io/
- **Backend API:** https://64.23.251.16.nip.io/admin-api/

**Development Tools:**
- **Process Manager:** `/root/process-manager.sh` for service lifecycle management
- **Environment Config:** `/root/.env` with persistent API key storage
- **Documentation:** Complete API specs and integration guides

### 🔧 Development Status

**Backend API:** ✅ Production-ready (20 endpoints operational)
**Frontend:** ✅ Professional dashboard with real-time features
**LiteLLM:** ✅ 7 models operational with proper authentication
**Database:** ✅ PostgreSQL + Redis fully configured
**Security:** ✅ Enterprise-grade with JWT + role-based access
**Infrastructure:** ✅ Optimized deployment with monitoring
**Documentation:** ✅ Comprehensive guides and API documentation

**Current Phase:** Production-Ready - Maintenance and optimization