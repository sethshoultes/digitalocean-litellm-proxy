"""Connection management models."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean, 
    CheckConstraint, 
    DateTime, 
    ForeignKey, 
    Integer, 
    Numeric, 
    String, 
    Text,
    func
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, ConnectionStatus, ProviderType, TimestampMixin, ConnectionStatusType, ProviderTypeEnum


class UserConnection(Base, TimestampMixin):
    """User connection model."""
    
    __tablename__ = "LiteLLM_UserConnections"
    
    connection_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    connection_name: Mapped[str] = mapped_column(String, nullable=False)
    provider: Mapped[str] = mapped_column(ProviderTypeEnum, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        ConnectionStatusType,
        default="active", 
        index=True
    )
    configuration: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    credentials_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_health_check: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    health_status: Mapped[Optional[str]] = mapped_column(String, default="unknown")
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_response_time: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3))
    connection_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    created_by: Mapped[Optional[str]] = mapped_column(String)
    updated_by: Mapped[Optional[str]] = mapped_column(String)
    
    # Relationships
    shared_connections: Mapped[List["SharedConnection"]] = relationship(
        "SharedConnection", 
        back_populates="connection",
        cascade="all, delete-orphan"
    )
    activities: Mapped[List["ConnectionActivity"]] = relationship(
        "ConnectionActivity",
        back_populates="connection",
        cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        CheckConstraint(
            "char_length(connection_name) >= 3",
            name="valid_connection_name"
        ),
    )


class ConnectionTemplate(Base, TimestampMixin):
    """Connection template model for common provider configurations."""
    
    __tablename__ = "LiteLLM_ConnectionTemplates"
    
    template_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    template_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(ProviderTypeEnum, nullable=False, index=True)
    configuration_template: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    required_fields: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    optional_fields: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_system_template: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class SharedConnection(Base):
    """Shared connection model for team/organization level sharing."""
    
    __tablename__ = "LiteLLM_SharedConnections"
    
    share_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    connection_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("LiteLLM_UserConnections.connection_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    shared_with_type: Mapped[str] = mapped_column(String, nullable=False)  # 'user', 'team', 'organization'
    shared_with_id: Mapped[str] = mapped_column(String, nullable=False)
    permissions: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, 
        nullable=False,
        default=lambda: {"read": True, "use": True}
    )
    shared_by: Mapped[str] = mapped_column(String, nullable=False)
    shared_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    # Relationships
    connection: Mapped["UserConnection"] = relationship(
        "UserConnection",
        back_populates="shared_connections"
    )
    
    __table_args__ = (
        CheckConstraint(
            "shared_with_type IN ('user', 'team', 'organization')",
            name="valid_share_type"
        ),
        CheckConstraint(
            "expires_at IS NULL OR expires_at > shared_at",
            name="valid_share_expiry"
        ),
    )