# GitHub Configuration and CI/CD Setup

## Overview
This document describes the GitHub configuration for the LiteLLM User Connection Access Management project, including CI/CD workflows and required secrets.

## CI/CD Pipeline
The project uses GitHub Actions for continuous integration and deployment with three main jobs:

### 1. Test Job
- Runs on Ubuntu with PostgreSQL 15 and Redis 7 services
- Tests against Python 3.9, 3.10, and 3.11
- Executes database initialization scripts
- Runs pytest with coverage reporting
- Uploads coverage results to Codecov

### 2. Lint Job
- Code quality checks using:
  - `black` for code formatting
  - `isort` for import sorting
  - `flake8` for linting
  - `mypy` for type checking

### 3. Security Job
- Vulnerability scanning with Trivy
- Uploads results to GitHub Security tab

## Required GitHub Secrets

### Optional Secrets (for enhanced features)
The following secrets can be configured for additional functionality:

#### Code Coverage
- `CODECOV_TOKEN`: Token for uploading coverage reports to Codecov
  - Obtain from: https://codecov.io/
  - Required only if you want coverage reporting

#### Container Registry (for deployment)
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token
- `GHCR_TOKEN`: GitHub Container Registry token (can use GITHUB_TOKEN)

#### Database Encryption
- `DB_ENCRYPTION_KEY`: 32-byte hex key for database credential encryption
  - Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`
  - Used in production for encrypting stored API keys

#### LiteLLM Integration
- `LITELLM_MASTER_KEY`: Master key for LiteLLM proxy integration
- `LITELLM_DATABASE_URL`: Production database URL for LiteLLM

## Environment Variables for CI
The CI pipeline uses these environment variables automatically:

```yaml
DATABASE_URL: postgresql://litellm_user:test_password@localhost:5432/litellm_connection_management
REDIS_URL: redis://localhost:6379
ENVIRONMENT: test
POSTGRES_HOST: localhost
POSTGRES_PORT: 5432
POSTGRES_USER: litellm_user
POSTGRES_PASSWORD: test_password
POSTGRES_DB: litellm_connection_management
```

## Setting Up Secrets

### Via GitHub Web Interface
1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the secret name and value
5. Click **Add secret**

### Via GitHub CLI
```bash
# Set a secret using GitHub CLI
gh secret set SECRET_NAME --body "secret_value"

# Set from file
gh secret set SECRET_NAME < secret_file.txt
```

## Branch Protection Rules
Recommended branch protection settings for `main` branch:

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Required status checks:
     - `test`
     - `lint`
     - `security`

3. **Require conversation resolution before merging**

4. **Include administrators** (optional)

## Workflow Triggers
The CI/CD pipeline runs on:

- **Push to `main` or `develop` branches**
- **Pull requests targeting `main` branch**

## Local Development
To run the same checks locally:

```bash
# Install development dependencies
pip install black isort flake8 mypy pytest pytest-cov pytest-asyncio

# Run code quality checks
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/
mypy src/

# Run tests with coverage
pytest --cov=src --cov-report=html

# Security scan (requires Docker)
docker run --rm -v $(pwd):/scan aquasec/trivy fs --format table /scan
```

## Deployment Considerations
For production deployment:

1. Set up environment-specific secrets
2. Configure database credentials securely
3. Use proper SSL certificates
4. Set up monitoring and alerting
5. Configure backup strategies

## Troubleshooting

### Common CI Issues
1. **Database connection failures**: Check PostgreSQL service configuration
2. **Test timeouts**: Verify database initialization scripts
3. **Import errors**: Ensure all dependencies are in requirements.txt
4. **Type checking failures**: Add type annotations or mypy ignore comments

### Secret Management
- Never commit secrets to the repository
- Use environment-specific secret management
- Rotate secrets regularly
- Use least-privilege access principles