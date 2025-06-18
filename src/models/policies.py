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
    resource_type: Mapped[str] = mapped_column(String, nullable=False, default="connection")
    
    # JSONB fields to match actual database schema
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    conditions: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    policy_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    
    # System flags
    is_system_policy: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(String, nullable=False)
    
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
            "priority >= 0 AND priority <= 100",
            name="valid_priority"
        ),
        CheckConstraint(
            "jsonb_typeof(permissions) = 'object'",
            name="valid_permissions"
        ),
    )


class UserAccessPolicy(Base):
    """User access policy assignment model."""
    
    __tablename__ = "LiteLLM_UserAccessPolicies"
    
    # Composite primary key to match database schema
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    policy_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("LiteLLM_AccessPolicies.policy_id", ondelete="CASCADE"),
        primary_key=True
    )
    
    # Assignment details
    granted_by: Mapped[str] = mapped_column(String, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        "granted_at",
        DateTime(timezone=True),
        server_default=func.now()
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    # JSONB fields to match database schema
    conditions: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    assignment_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    
    # Relationships
    policy: Mapped["AccessPolicy"] = relationship(
        "AccessPolicy",
        back_populates="user_policies"
    )
    
    __table_args__ = (
        CheckConstraint(
            "expires_at IS NULL OR expires_at > granted_at",
            name="valid_expiry"
        ),
    )