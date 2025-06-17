"""Connection schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.base import ConnectionStatus, ProviderType


class ConnectionBase(BaseModel):
    """Base connection schema."""
    connection_name: str = Field(..., min_length=3, max_length=255)
    provider: ProviderType
    configuration: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class ConnectionCreate(ConnectionBase):
    """Connection creation schema."""
    user_id: str = Field(..., min_length=1)
    credentials: Optional[Dict[str, str]] = None


class ConnectionUpdate(BaseModel):
    """Connection update schema."""
    connection_name: Optional[str] = Field(None, min_length=3, max_length=255)
    configuration: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[ConnectionStatus] = None


class ConnectionResponse(ConnectionBase):
    """Connection response schema."""
    connection_id: UUID
    user_id: str
    status: ConnectionStatus
    last_used: Optional[datetime] = None
    last_health_check: Optional[datetime] = None
    health_status: Optional[str] = None
    error_count: int
    success_count: int
    avg_response_time: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class ConnectionSummary(BaseModel):
    """Connection summary schema."""
    connection_id: UUID
    connection_name: str
    provider: ProviderType
    status: ConnectionStatus
    health_status: Optional[str] = None
    last_used: Optional[datetime] = None