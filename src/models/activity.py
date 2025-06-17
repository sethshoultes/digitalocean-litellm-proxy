"""Connection activity tracking models."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
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
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ConnectionActivity(Base):
    """Connection activity tracking model with monthly partitioning."""
    
    __tablename__ = "LiteLLM_ConnectionActivity"
    
    activity_id: Mapped[UUID] = mapped_column(
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
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    # Request details
    request_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True
    )
    request_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    
    # API details
    endpoint: Mapped[str] = mapped_column(String, nullable=False, index=True)
    method: Mapped[str] = mapped_column(String, nullable=False)
    model_name: Mapped[Optional[str]] = mapped_column(String, index=True)
    provider: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    # Token usage
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    total_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Cost tracking
    prompt_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6))
    completion_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6))
    total_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6))
    
    # Performance metrics
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    queue_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Status and error tracking
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    error_type: Mapped[Optional[str]] = mapped_column(String, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Client information
    client_ip: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    client_version: Mapped[Optional[str]] = mapped_column(String)
    
    # Additional metadata
    request_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    response_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    
    # Relationships
    connection: Mapped["UserConnection"] = relationship(
        "UserConnection",
        back_populates="activities"
    )
    
    __table_args__ = (
        CheckConstraint(
            "status_code >= 100 AND status_code < 600",
            name="valid_status_code"
        ),
        CheckConstraint(
            "prompt_tokens IS NULL OR prompt_tokens >= 0",
            name="valid_prompt_tokens"
        ),
        CheckConstraint(
            "completion_tokens IS NULL OR completion_tokens >= 0",
            name="valid_completion_tokens"
        ),
        CheckConstraint(
            "total_tokens IS NULL OR total_tokens >= 0",
            name="valid_total_tokens"
        ),
        CheckConstraint(
            "response_time_ms IS NULL OR response_time_ms >= 0",
            name="valid_response_time"
        ),
        CheckConstraint(
            "retry_count >= 0",
            name="valid_retry_count"
        ),
        # PostgreSQL table partitioning by month
        {
            "postgresql_partition_by": "RANGE (request_timestamp)",
        }
    )


class ActivitySummary(Base):
    """Aggregated activity summary for reporting and analytics."""
    
    __tablename__ = "LiteLLM_ActivitySummary"
    
    summary_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    
    # Summary period
    period_type: Mapped[str] = mapped_column(String, nullable=False)  # 'hour', 'day', 'week', 'month'
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Aggregation keys
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    connection_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), index=True)
    provider: Mapped[Optional[str]] = mapped_column(String, index=True)
    model_name: Mapped[Optional[str]] = mapped_column(String, index=True)
    
    # Aggregated metrics
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    successful_requests: Mapped[int] = mapped_column(Integer, default=0)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0)
    
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=0)
    total_prompt_cost: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=0)
    total_completion_cost: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=0)
    
    avg_response_time_ms: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    min_response_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    max_response_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Status code distribution
    status_distribution: Mapped[Dict[str, int]] = mapped_column(JSONB, default=dict)
    error_distribution: Mapped[Dict[str, int]] = mapped_column(JSONB, default=dict)
    
    # Additional metrics
    unique_users: Mapped[int] = mapped_column(Integer, default=0)
    unique_connections: Mapped[int] = mapped_column(Integer, default=0)
    peak_requests_per_minute: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    
    __table_args__ = (
        CheckConstraint(
            "period_type IN ('hour', 'day', 'week', 'month')",
            name="valid_period_type"
        ),
        CheckConstraint(
            "period_end > period_start",
            name="valid_period_range"
        ),
        CheckConstraint(
            "total_requests >= successful_requests + failed_requests",
            name="valid_request_counts"
        ),
    )