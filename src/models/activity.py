"""Connection activity tracking models."""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (CheckConstraint, DateTime, ForeignKey,
                        Integer, Text, func)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, ActivityTypeEnum


class ConnectionActivity(Base):
    """Connection activity tracking model with monthly partitioning."""

    __tablename__ = "LiteLLM_ConnectionActivity"

    activity_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.uuid_generate_v4()
    )
    connection_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("LiteLLM_UserConnections.connection_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(ActivityTypeEnum, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    request_size: Mapped[Optional[int]] = mapped_column(Integer)
    response_size: Mapped[Optional[int]] = mapped_column(Integer)
    activity_metadata: Mapped[Dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.CURRENT_TIMESTAMP()
    )
    user_id: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    connection: Mapped["UserConnection"] = relationship(
        "UserConnection", back_populates="activities"
    )

    __table_args__ = (
        # PostgreSQL table partitioning by month
        {
            "postgresql_partition_by": "RANGE (timestamp)",
        },
    )