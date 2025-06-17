"""Access policy models."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, 
    CheckConstraint, 
    DateTime, 
    ForeignKey, 
    Integer, 
    String, 
    Text,
    func
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class AccessPolicy(Base, TimestampMixin):
    """Access policy model for connection permissions."""
    
    __tablename__ = "LiteLLM_AccessPolicies"
    
    policy_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    policy_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Permission settings
    can_create_connections: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete_connections: Mapped[bool] = mapped_column(Boolean, default=False)
    can_modify_connections: Mapped[bool] = mapped_column(Boolean, default=False)
    can_use_connections: Mapped[bool] = mapped_column(Boolean, default=True)
    can_share_connections: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_all_connections: Mapped[bool] = mapped_column(Boolean, default=False)
    can_manage_users: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Rate limiting and quotas
    max_connections_per_user: Mapped[Optional[int]] = mapped_column(Integer)
    max_requests_per_minute: Mapped[Optional[int]] = mapped_column(Integer)
    max_requests_per_day: Mapped[Optional[int]] = mapped_column(Integer)
    max_tokens_per_request: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Allowed/restricted providers
    allowed_providers: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    restricted_providers: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    
    # Additional restrictions
    allowed_ip_ranges: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    restricted_models: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    allowed_models: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    
    # Time-based restrictions
    allowed_hours_start: Mapped[Optional[int]] = mapped_column(Integer)  # 0-23
    allowed_hours_end: Mapped[Optional[int]] = mapped_column(Integer)    # 0-23
    allowed_days: Mapped[Optional[List[int]]] = mapped_column(ARRAY(Integer))  # 0-6 (Mon-Sun)
    
    # Custom permissions and metadata
    custom_permissions: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    
    is_system_policy: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(String)
    updated_by: Mapped[Optional[str]] = mapped_column(String)
    
    # Relationships
    user_policies: Mapped[List["UserAccessPolicy"]] = relationship(
        "UserAccessPolicy",
        back_populates="policy",
        cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        CheckConstraint(
            "char_length(policy_name) >= 3",
            name="valid_policy_name"
        ),
        CheckConstraint(
            "max_connections_per_user IS NULL OR max_connections_per_user > 0",
            name="valid_max_connections"
        ),
        CheckConstraint(
            "max_requests_per_minute IS NULL OR max_requests_per_minute > 0",
            name="valid_rate_limit_minute"
        ),
        CheckConstraint(
            "max_requests_per_day IS NULL OR max_requests_per_day > 0",
            name="valid_rate_limit_day"
        ),
        CheckConstraint(
            "allowed_hours_start IS NULL OR (allowed_hours_start >= 0 AND allowed_hours_start <= 23)",
            name="valid_hours_start"
        ),
        CheckConstraint(
            "allowed_hours_end IS NULL OR (allowed_hours_end >= 0 AND allowed_hours_end <= 23)",
            name="valid_hours_end"
        ),
    )


class UserAccessPolicy(Base):
    """User access policy assignment model."""
    
    __tablename__ = "LiteLLM_UserAccessPolicies"
    
    assignment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    policy_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("LiteLLM_AccessPolicies.policy_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Assignment details
    assigned_by: Mapped[str] = mapped_column(String, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    # Override settings (can override specific policy settings for this user)
    overrides: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    policy: Mapped["AccessPolicy"] = relationship(
        "AccessPolicy",
        back_populates="user_policies"
    )
    
    __table_args__ = (
        CheckConstraint(
            "expires_at IS NULL OR expires_at > assigned_at",
            name="valid_policy_expiry"
        ),
    )