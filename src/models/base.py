"""Base model classes and database configuration."""

import enum
from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


class ConnectionStatus(str, enum.Enum):
    """Connection status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class UserRole(str, enum.Enum):
    """User role enumeration."""

    PROXY_ADMIN = "PROXY_ADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    INTERNAL_USER = "INTERNAL_USER"
    CUSTOMER = "CUSTOMER"
    TEAM_ADMIN = "TEAM_ADMIN"


class ActivityType(str, enum.Enum):
    """Activity type enumeration."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    TESTED = "tested"
    USED = "used"
    FAILED = "failed"


class ProviderType(str, enum.Enum):
    """Provider type enumeration."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    AWS = "aws"
    GOOGLE = "google"
    HUGGINGFACE = "huggingface"
    COHERE = "cohere"
    REPLICATE = "replicate"
    CUSTOM = "custom"


# PostgreSQL ENUM types that match the database schema
ConnectionStatusType = ENUM(
    "active", "inactive", "error", "testing", name="connection_status"
)

ProviderTypeEnum = ENUM(
    "openai",
    "anthropic",
    "azure",
    "aws",
    "google",
    "huggingface",
    "cohere",
    "replicate",
    "custom",
    name="provider_type",
)

ActivityTypeEnum = ENUM(
    "created", "updated", "deleted", "tested", "used", "failed", name="activity_type"
)

UserRoleEnum = ENUM(
    "PROXY_ADMIN",
    "ORG_ADMIN",
    "INTERNAL_USER",
    "CUSTOMER",
    "TEAM_ADMIN",
    name="user_role",
)


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    """Mixin for UUID primary key."""

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4, nullable=False
    )
