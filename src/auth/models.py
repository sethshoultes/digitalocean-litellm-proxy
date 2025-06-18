"""Authentication models and schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class User(BaseModel):
    """User model for authentication."""

    user_id: str
    user_email: Optional[EmailStr] = None
    user_role: str
    team_id: Optional[str] = None
    organization_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    """JWT token payload data."""

    user_id: str
    user_email: Optional[str] = None
    user_role: str
    team_id: Optional[str] = None
    organization_id: Optional[str] = None
    scopes: List[str] = []
    exp: Optional[int] = None
    iat: Optional[int] = None
    jti: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Refresh token response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""

    current_password: str
    new_password: str
    confirm_password: str
