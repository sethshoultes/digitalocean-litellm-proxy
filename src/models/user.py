"""LiteLLM User table model."""

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
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base


class LiteLLMUser(Base):
    """LiteLLM User table - Compatible with official LiteLLM schema."""
    
    __tablename__ = "LiteLLM_UserTable"
    
    user_id = Column(Text, primary_key=True, server_default=func.concat('user_', func.gen_random_uuid()))
    user_email = Column(Text, nullable=False, unique=True)
    user_role = Column(Text, nullable=False, default="CUSTOMER")
    password_hash = Column(Text, nullable=False)
    team_id = Column(Text, nullable=True)
    organization_id = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    spend = Column(Float, default=0.0)
    max_budget = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.CURRENT_TIMESTAMP())
    updated_at = Column(DateTime(timezone=True), server_default=func.CURRENT_TIMESTAMP())
    
    # LiteLLM compatibility fields (added by migration)
    user_alias = Column(Text, nullable=True)
    sso_user_id = Column(Text, unique=True, nullable=True)
    models = Column(ARRAY(Text), default=list)
    user_metadata = Column("metadata", JSONB, default=dict)
    max_parallel_requests = Column(Integer, nullable=True)
    tpm_limit = Column(BigInteger, nullable=True)
    rpm_limit = Column(BigInteger, nullable=True)
    budget_duration = Column(Text, nullable=True)
    budget_reset_at = Column(DateTime(timezone=True), nullable=True)
    allowed_cache_controls = Column(ARRAY(Text), default=list)
    model_spend = Column(JSONB, default=dict)
    model_max_budget = Column(JSONB, default=dict)
    teams = Column(ARRAY(Text), default=list)

    def __repr__(self):
        return f"<LiteLLMUser(user_id={self.user_id}, email={self.user_email}, role={self.user_role})>"

    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges."""
        return self.user_role in ["PROXY_ADMIN", "ORG_ADMIN"]

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

    def get_model_budget_remaining(self, model: str) -> Optional[float]:
        """Get remaining budget for a specific model."""
        if not self.model_max_budget or model not in self.model_max_budget:
            return None
        
        model_budget = self.model_max_budget[model]
        model_spend = self.model_spend.get(model, 0) if self.model_spend else 0
        
        if isinstance(model_budget, (int, float)):
            return max(0, model_budget - model_spend)
        return None

    def has_model_access(self, model: str) -> bool:
        """Check if user has access to a specific model."""
        # Empty models list means all models allowed
        if not self.models:
            return True
        
        # Check direct model access
        if model in self.models:
            return True
        
        # Check wildcard patterns
        for allowed_model in self.models:
            if allowed_model == "*" or allowed_model == "all":
                return True
            
            # Simple prefix matching (e.g., "gpt-*" matches "gpt-3.5-turbo")
            if allowed_model.endswith("*") and model.startswith(allowed_model[:-1]):
                return True
        
        return False

    __table_args__ = (
        CheckConstraint(
            "user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
            name="valid_email"
        ),
        CheckConstraint(
            "user_role IN ('PROXY_ADMIN', 'ORG_ADMIN', 'TEAM_ADMIN', 'CUSTOMER')",
            name="valid_role"
        ),
        CheckConstraint(
            "spend >= 0",
            name="valid_spend"
        ),
    )