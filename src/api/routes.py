"""API routes configuration."""

from fastapi import APIRouter

from .endpoints import auth, connections, health, policies, virtual_keys, user_management

# Create main API router
api_router = APIRouter()

# Include route modules
api_router.include_router(health.router, prefix="/health", tags=["health"])

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

api_router.include_router(
    connections.router, prefix="/connections", tags=["connections"]
)

api_router.include_router(policies.router, prefix="/policies", tags=["policies"])

# LiteLLM Virtual Keys API (core compatibility endpoints)
api_router.include_router(virtual_keys.router, prefix="/key", tags=["virtual-keys"])

# LiteLLM User Management API (core compatibility endpoints)
api_router.include_router(user_management.router, prefix="/user", tags=["user-management"])
