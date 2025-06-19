"""SQLAlchemy models for LiteLLM virtual keys and spend tracking."""

from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    ARRAY,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base


class VerificationToken(Base):
    """LiteLLM Virtual Keys table - Core authentication mechanism."""
    
    __tablename__ = "LiteLLM_VerificationToken"
    
    token = Column(Text, primary_key=True)
    key_name = Column(Text, nullable=True)
    key_alias = Column(Text, nullable=True)
    spend = Column(Float, default=0.0)
    expires = Column(DateTime(timezone=True), nullable=True)
    models = Column(ARRAY(Text), default=list)
    aliases = Column(JSONB, default=dict)
    config = Column(JSONB, default=dict)
    user_id = Column(Text, nullable=True)
    team_id = Column(Text, nullable=True)
    permissions = Column(JSONB, default=dict)
    max_parallel_requests = Column(Integer, nullable=True)
    token_metadata = Column("metadata", JSONB, default=dict)
    blocked = Column(Boolean, default=False)
    tpm_limit = Column(BigInteger, nullable=True)
    rpm_limit = Column(BigInteger, nullable=True)
    max_budget = Column(Float, nullable=True)
    budget_duration = Column(Text, nullable=True)
    budget_reset_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Text, nullable=True)

    def __repr__(self):
        return f"<VerificationToken(token={self.token[:16]}..., user_id={self.user_id})>"

    @property
    def is_expired(self) -> bool:
        """Check if the token is expired."""
        if self.expires is None:
            return False
        return datetime.utcnow() > self.expires

    @property
    def is_blocked(self) -> bool:
        """Check if the token is blocked."""
        return self.blocked is True

    @property
    def is_valid(self) -> bool:
        """Check if the token is valid (not expired, not blocked)."""
        return not self.is_expired and not self.is_blocked

    @property
    def budget_remaining(self) -> Optional[float]:
        """Calculate remaining budget."""
        if self.max_budget is None:
            return None
        return max(0, self.max_budget - (self.spend or 0))

    @property
    def budget_exceeded(self) -> bool:
        """Check if budget is exceeded."""
        if self.max_budget is None:
            return False
        return (self.spend or 0) >= self.max_budget


class SpendLog(Base):
    """LiteLLM Spend Logs table - Track API usage and costs."""
    
    __tablename__ = "LiteLLM_SpendLogs"
    
    request_id = Column(Text, primary_key=True, server_default=func.uuid_generate_v4())
    api_key = Column(Text, nullable=True, index=True)
    user_id = Column(Text, nullable=True, index=True)
    team_id = Column(Text, nullable=True)
    organization_id = Column(Text, nullable=True)
    model = Column(Text, nullable=True, index=True)
    model_group = Column(Text, nullable=True)
    api_base = Column(Text, nullable=True)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    startTime = Column("starttime", DateTime(timezone=True), server_default=func.now(), index=True)
    endTime = Column("endtime", DateTime(timezone=True), server_default=func.now())
    completionStartTime = Column("completionstarttime", DateTime(timezone=True), nullable=True)
    model_parameters_json = Column(JSONB, nullable=True)
    spend_logs_metadata = Column(JSONB, nullable=True)
    request_tags = Column(JSONB, default=list)

    def __repr__(self):
        return f"<SpendLog(request_id={self.request_id}, model={self.model}, spend={self.spend})>"

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate request duration in seconds."""
        if self.startTime and self.endTime:
            return (self.endTime - self.startTime).total_seconds()
        return None

    @property
    def tokens_per_second(self) -> Optional[float]:
        """Calculate tokens per second."""
        duration = self.duration_seconds
        if duration and duration > 0 and self.total_tokens:
            return self.total_tokens / duration
        return None


class BudgetTable(Base):
    """LiteLLM Budget table - Manage spending limits."""
    
    __tablename__ = "LiteLLM_BudgetTable"
    
    budget_id = Column(Text, primary_key=True, server_default=func.uuid_generate_v4())
    max_budget = Column(Float, nullable=True)
    soft_budget = Column(Float, nullable=True)
    max_parallel_requests = Column(Integer, nullable=True)
    tpm_limit = Column(BigInteger, nullable=True)
    rpm_limit = Column(BigInteger, nullable=True)
    model_max_budget = Column(JSONB, default=dict)
    budget_duration = Column(Text, nullable=True)
    budget_reset_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Text, nullable=True)

    def __repr__(self):
        return f"<BudgetTable(budget_id={self.budget_id}, max_budget={self.max_budget})>"

    @property
    def is_soft_limit_exceeded(self, current_spend: float) -> bool:
        """Check if soft budget limit is exceeded."""
        if self.soft_budget is None:
            return False
        return current_spend >= self.soft_budget

    @property
    def is_hard_limit_exceeded(self, current_spend: float) -> bool:
        """Check if hard budget limit is exceeded."""
        if self.max_budget is None:
            return False
        return current_spend >= self.max_budget

    def get_model_budget_remaining(self, model: str, current_spend: float) -> Optional[float]:
        """Get remaining budget for a specific model."""
        if not self.model_max_budget or model not in self.model_max_budget:
            return None
        
        model_budget = self.model_max_budget[model]
        if isinstance(model_budget, (int, float)):
            return max(0, model_budget - current_spend)
        return None