"""JWT authentication utilities."""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Union

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db_session
from src.config.settings import get_settings

from .models import TokenData, User

settings = get_settings()
security = HTTPBearer()


class AuthenticationError(Exception):
    """Custom authentication error."""

    pass


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    # Add standard JWT claims
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4()),  # JWT ID for token tracking
            "type": "access",
        }
    )

    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )

    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT refresh token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    # Add standard JWT claims
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4()),
            "type": "refresh",
        }
    )

    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )

    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )

        # Verify token type
        if payload.get("type") != token_type:
            raise AuthenticationError(f"Invalid token type, expected {token_type}")

        # Extract user data
        user_id = payload.get("user_id")
        if not user_id:
            raise AuthenticationError("Token missing user_id")

        # Create token data
        token_data = TokenData(
            user_id=user_id,
            user_email=payload.get("user_email"),
            user_role=payload.get("user_role", "CUSTOMER"),
            team_id=payload.get("team_id"),
            organization_id=payload.get("organization_id"),
            scopes=payload.get("scopes", []),
            exp=payload.get("exp"),
            iat=payload.get("iat"),
            jti=payload.get("jti"),
        )

        return token_data

    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTError:
        raise AuthenticationError("Invalid token")


async def get_user_from_db(user_id: str, db: AsyncSession) -> Optional[User]:
    """Get user from database by ID."""
    try:
        # Query the LiteLLM_UserTable (assuming it exists based on project docs)
        # This is a placeholder - adjust based on actual LiteLLM schema
        from sqlalchemy import text

        query = text(
            """
            SELECT user_id, user_email, user_role, team_id, organization_id,
                   created_at, updated_at
            FROM "LiteLLM_UserTable" 
            WHERE user_id = :user_id
        """
        )

        result = await db.execute(query, {"user_id": user_id})
        row = result.fetchone()

        if not row:
            return None

        return User(
            user_id=row.user_id,
            user_email=row.user_email,
            user_role=row.user_role,
            team_id=row.team_id,
            organization_id=row.organization_id,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    except Exception:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Get current authenticated user."""
    try:
        token = credentials.credentials
        token_data = verify_token(token, "access")

        # Get user from database
        user = await get_user_from_db(token_data.user_id, db)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_auth(current_user: User = Depends(get_current_user)) -> User:
    """Require authentication (alias for get_current_user)."""
    return current_user


def require_roles(*allowed_roles: str):
    """Require specific user roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {allowed_roles}",
            )
        return current_user

    return role_checker


# Convenience role checkers
def require_admin(current_user: User = Depends(require_roles("PROXY_ADMIN"))) -> User:
    """Require PROXY_ADMIN role."""
    return current_user


def require_org_admin(
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN"))
) -> User:
    """Require PROXY_ADMIN or ORG_ADMIN role."""
    return current_user


def require_team_admin(
    current_user: User = Depends(
        require_roles("PROXY_ADMIN", "ORG_ADMIN", "TEAM_ADMIN")
    )
) -> User:
    """Require admin roles."""
    return current_user
