"""Authentication endpoints."""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import (create_access_token, create_refresh_token,
                      get_current_user, hash_password, verify_password,
                      verify_token)
from src.auth.models import (ChangePasswordRequest, LoginRequest,
                             LoginResponse, RefreshTokenRequest,
                             RefreshTokenResponse, User)
from src.config.database import get_db_session
from src.config.settings import get_settings

router = APIRouter()
settings = get_settings()


async def authenticate_user(
    email: str, password: str, db: AsyncSession
) -> Optional[User]:
    """Authenticate user with email and password."""
    try:
        # Query user by email from LiteLLM_UserTable
        query = text(
            """
            SELECT user_id, user_email, user_role, team_id, organization_id,
                   password_hash, created_at, updated_at
            FROM "LiteLLM_UserTable" 
            WHERE user_email = :email AND deleted_at IS NULL
        """
        )

        result = await db.execute(query, {"email": email})
        row = result.fetchone()

        if not row:
            return None

        # Verify password
        if not verify_password(password, row.password_hash):
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


@router.post("/login", response_model=LoginResponse)
async def login(
    login_request: LoginRequest, db: AsyncSession = Depends(get_db_session)
):
    """Authenticate user and return JWT tokens."""

    # Authenticate user
    user = await authenticate_user(login_request.email, login_request.password, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token data
    token_data = {
        "user_id": user.user_id,
        "user_email": user.user_email,
        "user_role": user.user_role,
        "team_id": user.team_id,
        "organization_id": user.organization_id,
        "scopes": ["read", "write"],  # Default scopes, can be customized
    }

    # Create tokens
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest, db: AsyncSession = Depends(get_db_session)
):
    """Refresh access token using refresh token."""

    try:
        # Verify refresh token
        token_data = verify_token(refresh_request.refresh_token, "refresh")

        # Verify user still exists and is active
        query = text(
            """
            SELECT user_id, user_email, user_role, team_id, organization_id
            FROM "LiteLLM_UserTable" 
            WHERE user_id = :user_id AND deleted_at IS NULL
        """
        )

        result = await db.execute(query, {"user_id": token_data.user_id})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists"
            )

        # Create new access token
        new_token_data = {
            "user_id": row.user_id,
            "user_email": row.user_email,
            "user_role": row.user_role,
            "team_id": row.team_id,
            "organization_id": row.organization_id,
            "scopes": token_data.scopes,
        }

        access_token = create_access_token(data=new_token_data)

        return RefreshTokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (invalidate tokens)."""

    # In a production system, you would:
    # 1. Add the token to a blacklist/revocation list
    # 2. Store revoked tokens in Redis with expiration
    # 3. Check blacklist in verify_token function

    # For now, return success
    # Client should delete tokens from storage

    return {"message": "Successfully logged out", "user_id": current_user.user_id}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.post("/change-password")
async def change_password(
    password_request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Change user password."""

    # Validate new password confirmation
    if password_request.new_password != password_request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match",
        )

    # Get current password hash
    query = text(
        """
        SELECT password_hash
        FROM "LiteLLM_UserTable" 
        WHERE user_id = :user_id
    """
    )

    result = await db.execute(query, {"user_id": current_user.user_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Verify current password
    if not verify_password(password_request.current_password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash new password
    new_password_hash = hash_password(password_request.new_password)

    # Update password in database
    update_query = text(
        """
        UPDATE "LiteLLM_UserTable" 
        SET password_hash = :password_hash, updated_at = NOW()
        WHERE user_id = :user_id
    """
    )

    await db.execute(
        update_query,
        {"password_hash": new_password_hash, "user_id": current_user.user_id},
    )
    await db.commit()

    return {"message": "Password changed successfully"}


@router.get("/health")
async def auth_health_check():
    """Authentication service health check."""
    return {
        "status": "healthy",
        "service": "authentication",
        "jwt_algorithm": settings.algorithm,
        "token_expire_minutes": settings.access_token_expire_minutes,
    }
