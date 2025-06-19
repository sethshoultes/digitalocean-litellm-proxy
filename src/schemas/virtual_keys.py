"""Pydantic schemas for LiteLLM virtual keys API."""

from datetime import datetime
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field, validator


class KeyGenerateRequest(BaseModel):
    """Request schema for generating virtual keys."""
    
    models: List[str] = Field(default_factory=list, description="List of allowed models")
    aliases: Dict[str, Any] = Field(default_factory=dict, description="Model aliases")
    config: Dict[str, Any] = Field(default_factory=dict, description="Key configuration")
    spend: float = Field(default=0.0, description="Initial spend amount")
    max_budget: Optional[float] = Field(None, description="Maximum budget limit")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    team_id: Optional[str] = Field(None, description="Associated team ID")
    max_parallel_requests: Optional[int] = Field(None, description="Max parallel requests")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tpm_limit: Optional[int] = Field(None, description="Tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Requests per minute limit")
    budget_duration: Optional[str] = Field(None, description="Budget duration (e.g., '1d', '1w', '1m')")
    expires: Optional[datetime] = Field(None, description="Token expiration date")
    key_alias: Optional[str] = Field(None, description="Human-readable key alias")
    key_name: Optional[str] = Field(None, description="Key name for identification")
    
    @validator('models')
    def validate_models(cls, v):
        """Validate models list."""
        if not isinstance(v, list):
            raise ValueError("Models must be a list")
        return v
    
    @validator('max_budget')
    def validate_max_budget(cls, v):
        """Validate max budget is positive."""
        if v is not None and v < 0:
            raise ValueError("Max budget must be positive")
        return v
    
    @validator('spend')
    def validate_spend(cls, v):
        """Validate spend is non-negative."""
        if v < 0:
            raise ValueError("Spend must be non-negative")
        return v


class KeyResponse(BaseModel):
    """Response schema for key generation."""
    
    key: str = Field(..., description="Generated API key")
    expires: Optional[datetime] = Field(None, description="Token expiration date")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    team_id: Optional[str] = Field(None, description="Associated team ID")
    max_budget: Optional[float] = Field(None, description="Maximum budget limit")
    key_alias: Optional[str] = Field(None, description="Key alias")
    key_name: Optional[str] = Field(None, description="Key name")


class KeyDeleteRequest(BaseModel):
    """Request schema for deleting keys."""
    
    keys: List[str] = Field(..., description="List of keys to delete")
    
    @validator('keys')
    def validate_keys(cls, v):
        """Validate keys list is not empty."""
        if not v:
            raise ValueError("Keys list cannot be empty")
        return v


class KeyUpdateRequest(BaseModel):
    """Request schema for updating keys."""
    
    key: str = Field(..., description="Key to update")
    models: Optional[List[str]] = Field(None, description="Update allowed models")
    aliases: Optional[Dict[str, Any]] = Field(None, description="Update model aliases")
    config: Optional[Dict[str, Any]] = Field(None, description="Update key configuration")
    max_budget: Optional[float] = Field(None, description="Update maximum budget limit")
    user_id: Optional[str] = Field(None, description="Update associated user ID")
    team_id: Optional[str] = Field(None, description="Update associated team ID")
    max_parallel_requests: Optional[int] = Field(None, description="Update max parallel requests")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Update metadata")
    tpm_limit: Optional[int] = Field(None, description="Update tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Update requests per minute limit")
    budget_duration: Optional[str] = Field(None, description="Update budget duration")
    expires: Optional[datetime] = Field(None, description="Update token expiration date")
    key_alias: Optional[str] = Field(None, description="Update key alias")
    key_name: Optional[str] = Field(None, description="Update key name")
    blocked: Optional[bool] = Field(None, description="Block/unblock key")


class KeyInfoResponse(BaseModel):
    """Response schema for key information."""
    
    token: str = Field(..., description="API key token")
    key_name: Optional[str] = Field(None, description="Key name")
    key_alias: Optional[str] = Field(None, description="Key alias")
    spend: float = Field(..., description="Current spend amount")
    expires: Optional[datetime] = Field(None, description="Token expiration date")
    models: List[str] = Field(..., description="Allowed models")
    aliases: Dict[str, Any] = Field(..., description="Model aliases")
    config: Dict[str, Any] = Field(..., description="Key configuration")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    team_id: Optional[str] = Field(None, description="Associated team ID")
    permissions: Dict[str, Any] = Field(..., description="Key permissions")
    max_parallel_requests: Optional[int] = Field(None, description="Max parallel requests")
    metadata: Dict[str, Any] = Field(..., description="Additional metadata")
    blocked: bool = Field(..., description="Whether key is blocked")
    tpm_limit: Optional[int] = Field(None, description="Tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Requests per minute limit")
    max_budget: Optional[float] = Field(None, description="Maximum budget limit")
    budget_duration: Optional[str] = Field(None, description="Budget duration")
    budget_reset_at: Optional[datetime] = Field(None, description="Budget reset date")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Computed fields
    is_expired: bool = Field(..., description="Whether key is expired")
    is_valid: bool = Field(..., description="Whether key is valid")
    budget_remaining: Optional[float] = Field(None, description="Remaining budget")
    budget_exceeded: bool = Field(..., description="Whether budget is exceeded")

    class Config:
        from_attributes = True
        protected_namespaces = ()


class SpendLogResponse(BaseModel):
    """Response schema for spend logs."""
    
    request_id: str = Field(..., description="Request ID")
    api_key: Optional[str] = Field(None, description="API key used")
    user_id: Optional[str] = Field(None, description="User ID")
    team_id: Optional[str] = Field(None, description="Team ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    model: Optional[str] = Field(None, description="Model used")
    model_group: Optional[str] = Field(None, description="Model group")
    api_base: Optional[str] = Field(None, description="API base URL")
    prompt_tokens: int = Field(..., description="Prompt tokens")
    completion_tokens: int = Field(..., description="Completion tokens")
    total_tokens: int = Field(..., description="Total tokens")
    spend: float = Field(..., description="Cost of request")
    startTime: datetime = Field(..., description="Request start time")
    endTime: datetime = Field(..., description="Request end time")
    completionStartTime: Optional[datetime] = Field(None, description="Completion start time")
    model_parameters_json: Optional[Dict[str, Any]] = Field(None, description="Model parameters")
    spend_logs_metadata: Optional[Dict[str, Any]] = Field(None, description="Spend log metadata")
    request_tags: List[str] = Field(default_factory=list, description="Request tags")
    
    # Computed fields
    duration_seconds: Optional[float] = Field(None, description="Request duration in seconds")
    tokens_per_second: Optional[float] = Field(None, description="Tokens per second")

    class Config:
        from_attributes = True
        protected_namespaces = ()


class SpendLogsRequest(BaseModel):
    """Request schema for querying spend logs."""
    
    start_date: Optional[datetime] = Field(None, description="Start date filter")
    end_date: Optional[datetime] = Field(None, description="End date filter")
    user_id: Optional[str] = Field(None, description="User ID filter")
    team_id: Optional[str] = Field(None, description="Team ID filter")
    api_key: Optional[str] = Field(None, description="API key filter")
    model: Optional[str] = Field(None, description="Model filter")
    limit: int = Field(default=100, ge=1, le=1000, description="Number of records to return")
    offset: int = Field(default=0, ge=0, description="Number of records to skip")


class SpendLogsResponse(BaseModel):
    """Response schema for spend logs query."""
    
    data: List[SpendLogResponse] = Field(..., description="Spend log records")
    total_count: int = Field(..., description="Total number of records")
    total_spend: float = Field(..., description="Total spend amount")
    limit: int = Field(..., description="Limit used")
    offset: int = Field(..., description="Offset used")


class StandardResponse(BaseModel):
    """Standard response schema."""
    
    status: str = Field(..., description="Response status")
    message: Optional[str] = Field(None, description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


class ErrorResponse(BaseModel):
    """Error response schema."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Error details")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")