"""Policy schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PolicyBase(BaseModel):
    """Base policy schema."""
    policy_name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    can_create_connections: bool = False
    can_delete_connections: bool = False
    can_modify_connections: bool = False
    can_use_connections: bool = True
    can_share_connections: bool = False
    can_view_all_connections: bool = False
    can_manage_users: bool = False
    can_view_analytics: bool = False


class PolicyCreate(PolicyBase):
    """Policy creation schema."""
    max_connections_per_user: Optional[int] = Field(None, gt=0)
    max_requests_per_minute: Optional[int] = Field(None, gt=0)
    max_requests_per_day: Optional[int] = Field(None, gt=0)
    max_tokens_per_request: Optional[int] = Field(None, gt=0)
    allowed_providers: Optional[List[str]] = None
    restricted_providers: Optional[List[str]] = None
    allowed_ip_ranges: Optional[List[str]] = None
    restricted_models: Optional[List[str]] = None
    allowed_models: Optional[List[str]] = None
    allowed_hours_start: Optional[int] = Field(None, ge=0, le=23)
    allowed_hours_end: Optional[int] = Field(None, ge=0, le=23)
    allowed_days: Optional[List[int]] = Field(None, min_items=1, max_items=7)
    custom_permissions: Optional[Dict[str, Any]] = None
    policy_metadata: Optional[Dict[str, Any]] = None


class PolicyUpdate(BaseModel):
    """Policy update schema."""
    policy_name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    can_create_connections: Optional[bool] = None
    can_delete_connections: Optional[bool] = None
    can_modify_connections: Optional[bool] = None
    can_use_connections: Optional[bool] = None
    can_share_connections: Optional[bool] = None
    can_view_all_connections: Optional[bool] = None
    can_manage_users: Optional[bool] = None
    can_view_analytics: Optional[bool] = None
    max_connections_per_user: Optional[int] = Field(None, gt=0)
    max_requests_per_minute: Optional[int] = Field(None, gt=0)
    max_requests_per_day: Optional[int] = Field(None, gt=0)
    max_tokens_per_request: Optional[int] = Field(None, gt=0)
    allowed_providers: Optional[List[str]] = None
    restricted_providers: Optional[List[str]] = None
    allowed_ip_ranges: Optional[List[str]] = None
    restricted_models: Optional[List[str]] = None
    allowed_models: Optional[List[str]] = None
    allowed_hours_start: Optional[int] = Field(None, ge=0, le=23)
    allowed_hours_end: Optional[int] = Field(None, ge=0, le=23)
    allowed_days: Optional[List[int]] = Field(None, min_items=1, max_items=7)
    custom_permissions: Optional[Dict[str, Any]] = None
    policy_metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PolicyResponse(PolicyCreate):
    """Policy response schema."""
    policy_id: UUID
    is_system_policy: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class UserPolicyAssignment(BaseModel):
    """User policy assignment schema."""
    user_id: str = Field(..., min_length=1)
    expires_at: Optional[datetime] = None
    overrides: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class UserPolicyResponse(BaseModel):
    """User policy assignment response schema."""
    assignment_id: UUID
    user_id: str
    policy_id: UUID
    policy: PolicyResponse
    assigned_by: str
    assigned_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    overrides: Dict[str, Any]
    notes: Optional[str] = None

    class Config:
        from_attributes = True