"""Authentication middleware for LiteLLM virtual keys."""

import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import HTTPException, status, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db_session
from src.config.settings import get_settings
from src.models.virtual_keys import VerificationToken
from sqlalchemy import select


async def verify_master_key(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Verify master key for admin access to virtual keys API.
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        Dict with admin user info
        
    Raises:
        HTTPException: If master key is invalid or missing
    """
    settings = get_settings()
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Master key required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use 'Bearer <key>'",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ")[1]
    
    if not settings.litellm_master_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Master key not configured"
        )
    
    # Use constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(token, settings.litellm_master_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid master key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return {
        "role": "admin",
        "user_id": "master",
        "permissions": ["all"]
    }


async def verify_virtual_key(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db_session)
) -> Dict[str, Any]:
    """
    Verify virtual key for user access.
    
    Args:
        authorization: Authorization header with Bearer token
        db: Database session
        
    Returns:
        Dict with key information
        
    Raises:
        HTTPException: If virtual key is invalid, expired, or blocked
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use 'Bearer <key>'",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ")[1]
    
    # Check if it's the master key (admin access)
    settings = get_settings()
    if settings.litellm_master_key and secrets.compare_digest(token, settings.litellm_master_key):
        return {
            "role": "admin",
            "user_id": "master",
            "permissions": ["all"],
            "token": token
        }
    
    # Look up virtual key in database
    stmt = select(VerificationToken).where(VerificationToken.token == token)
    result = await db.execute(stmt)
    key_info = result.scalar_one_or_none()
    
    if not key_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if key is blocked
    if key_info.blocked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is blocked",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if key is expired
    if key_info.expires and datetime.now(timezone.utc) > key_info.expires:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    # Check budget limits
    if key_info.max_budget and key_info.spend >= key_info.max_budget:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Budget limit exceeded"
        )
    
    return {
        "role": "user",
        "user_id": key_info.user_id,
        "team_id": key_info.team_id,
        "token": token,
        "key_info": key_info,
        "models": key_info.models,
        "max_budget": key_info.max_budget,
        "spend": key_info.spend,
        "permissions": key_info.permissions or {}
    }


def generate_api_key() -> str:
    """
    Generate a secure API key with the LiteLLM format.
    
    Returns:
        Secure API key with 'sk-' prefix
    """
    # Generate 32 random bytes and encode as URL-safe base64
    random_bytes = secrets.token_bytes(32)
    key_suffix = secrets.token_urlsafe(32)
    
    return f"sk-{key_suffix}"


async def check_key_permissions(
    key_info: Dict[str, Any],
    required_permission: str
) -> bool:
    """
    Check if a key has the required permission.
    
    Args:
        key_info: Key information from verification
        required_permission: Permission to check
        
    Returns:
        True if permission is granted
    """
    # Admin keys have all permissions
    if key_info.get("role") == "admin":
        return True
    
    permissions = key_info.get("permissions", {})
    
    # Check specific permission
    if required_permission in permissions:
        return permissions[required_permission] is True
    
    # Check wildcard permissions
    if "all" in permissions:
        return permissions["all"] is True
    
    return False


async def validate_model_access(
    key_info: Dict[str, Any],
    model: str
) -> bool:
    """
    Validate if a key has access to a specific model.
    
    Args:
        key_info: Key information from verification
        model: Model to check access for
        
    Returns:
        True if model access is granted
    """
    # Admin keys have access to all models
    if key_info.get("role") == "admin":
        return True
    
    allowed_models = key_info.get("models", [])
    
    # Empty models list means all models allowed
    if not allowed_models:
        return True
    
    # Check direct model access
    if model in allowed_models:
        return True
    
    # Check wildcard patterns
    for allowed_model in allowed_models:
        if allowed_model == "*" or allowed_model == "all":
            return True
        
        # Simple prefix matching (e.g., "gpt-*" matches "gpt-3.5-turbo")
        if allowed_model.endswith("*") and model.startswith(allowed_model[:-1]):
            return True
    
    return False