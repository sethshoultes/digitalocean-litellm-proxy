"""Policy schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PolicyBase(BaseModel):
    """Base policy schema."""

    policy_name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    resource_type: str = Field(default="connection")
    permissions: Dict[str, Any] = Field(default_factory=dict)
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    priority: int = Field(default=0, ge=0, le=100)


class PolicyCreate(PolicyBase):
    """Policy creation schema."""

    policy_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class PolicyUpdate(BaseModel):
    """Policy update schema."""

    policy_name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    resource_type: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    conditions: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    policy_metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PolicyResponse(PolicyBase):
    """Policy response schema."""

    policy_id: UUID
    policy_metadata: Dict[str, Any]
    is_system_policy: bool
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserPolicyAssignment(BaseModel):
    """User policy assignment schema."""

    user_id: str = Field(..., min_length=1)
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    assignment_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class UserPolicyResponse(BaseModel):
    """User policy assignment response schema."""

    user_id: str
    policy_id: UUID
    policy: PolicyResponse
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    conditions: Dict[str, Any]
    assignment_metadata: Dict[str, Any]

    class Config:
        from_attributes = True
