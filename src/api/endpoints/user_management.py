"""LiteLLM User Management API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

import structlog

from src.auth.virtual_keys_auth import verify_master_key
from src.config.database import get_db_session
from src.schemas.virtual_keys import StandardResponse

logger = structlog.get_logger()

router = APIRouter()


class UserCreateRequest(BaseModel):
    """Request schema for creating users."""
    
    user_id: Optional[str] = Field(None, description="User ID (auto-generated if not provided)")
    user_email: str = Field(..., description="User email address")
    user_role: str = Field(default="CUSTOMER", description="User role")
    team_id: Optional[str] = Field(None, description="Team ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    models: List[str] = Field(default_factory=list, description="Allowed models")
    max_budget: Optional[float] = Field(None, description="Maximum budget")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    max_parallel_requests: Optional[int] = Field(None, description="Max parallel requests")
    tpm_limit: Optional[int] = Field(None, description="Tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Requests per minute limit")
    budget_duration: Optional[str] = Field(None, description="Budget duration")


class UserUpdateRequest(BaseModel):
    """Request schema for updating users."""
    
    user_id: str = Field(..., description="User ID to update")
    user_email: Optional[str] = Field(None, description="User email address")
    user_role: Optional[str] = Field(None, description="User role")
    team_id: Optional[str] = Field(None, description="Team ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    models: Optional[List[str]] = Field(None, description="Allowed models")
    max_budget: Optional[float] = Field(None, description="Maximum budget")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    max_parallel_requests: Optional[int] = Field(None, description="Max parallel requests")
    tpm_limit: Optional[int] = Field(None, description="Tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Requests per minute limit")
    budget_duration: Optional[str] = Field(None, description="Budget duration")


class UserResponse(BaseModel):
    """Response schema for user operations."""
    
    user_id: str = Field(..., description="User ID")
    user_email: Optional[str] = Field(None, description="User email address")
    user_role: Optional[str] = Field(None, description="User role")
    team_id: Optional[str] = Field(None, description="Team ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    models: List[str] = Field(default_factory=list, description="Allowed models")
    max_budget: Optional[float] = Field(None, description="Maximum budget")
    spend: float = Field(default=0.0, description="Current spend")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    max_parallel_requests: Optional[int] = Field(None, description="Max parallel requests")
    tpm_limit: Optional[int] = Field(None, description="Tokens per minute limit")
    rpm_limit: Optional[int] = Field(None, description="Requests per minute limit")
    budget_duration: Optional[str] = Field(None, description="Budget duration")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        from_attributes = True
        protected_namespaces = ()


@router.post("/new", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> UserResponse:
    """
    Create a new user.
    
    This is an official LiteLLM endpoint for user management.
    
    **Requires master key authentication.**
    """
    try:
        from src.models.user import LiteLLMUser  # Import the LiteLLM user model
        
        # Generate user ID if not provided
        user_id = request.user_id or str(uuid.uuid4())
        
        # Check if user already exists
        existing_stmt = select(LiteLLMUser).where(LiteLLMUser.user_id == user_id)
        existing_result = await db.execute(existing_stmt)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with ID {user_id} already exists"
            )
        
        # Create new user
        new_user = LiteLLMUser(
            user_id=user_id,
            user_email=request.user_email,
            user_role=request.user_role,
            team_id=request.team_id,
            organization_id=request.organization_id,
            models=request.models,
            max_budget=request.max_budget,
            spend=0.0,
            user_metadata=request.metadata,
            max_parallel_requests=request.max_parallel_requests,
            tpm_limit=request.tpm_limit,
            rpm_limit=request.rpm_limit,
            budget_duration=request.budget_duration,
            user_alias=request.user_email,  # Set alias to email by default
            teams=[],  # Initialize empty teams list
            password_hash="temp_hash"  # Required field - set temporary value
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(
            "User created",
            user_id=user_id,
            user_email=request.user_email,
            user_role=request.user_role,
            created_by=current_user.get("user_id")
        )
        
        return UserResponse(
            user_id=new_user.user_id,
            user_email=new_user.user_email,
            user_role=new_user.user_role,
            team_id=new_user.team_id,
            organization_id=new_user.organization_id,
            models=new_user.models or [],
            max_budget=new_user.max_budget,
            spend=new_user.spend or 0.0,
            metadata=new_user.user_metadata or {},
            max_parallel_requests=new_user.max_parallel_requests,
            tpm_limit=new_user.tpm_limit,
            rpm_limit=new_user.rpm_limit,
            budget_duration=new_user.budget_duration,
            created_at=new_user.created_at,
            updated_at=new_user.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Failed to create user", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.post("/update", response_model=StandardResponse)
async def update_user(
    request: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> StandardResponse:
    """
    Update an existing user.
    
    **Requires master key authentication.**
    """
    try:
        from src.models.user import LiteLLMUser
        
        # Look up the user
        stmt = select(LiteLLMUser).where(LiteLLMUser.user_id == request.user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {request.user_id} not found"
            )
        
        # Update fields that were provided
        update_fields = []
        if request.user_email is not None:
            user.user_email = request.user_email
            update_fields.append("user_email")
        if request.user_role is not None:
            user.user_role = request.user_role
            update_fields.append("user_role")
        if request.team_id is not None:
            user.team_id = request.team_id
            update_fields.append("team_id")
        if request.organization_id is not None:
            user.organization_id = request.organization_id
            update_fields.append("organization_id")
        if request.models is not None:
            user.models = request.models
            update_fields.append("models")
        if request.max_budget is not None:
            user.max_budget = request.max_budget
            update_fields.append("max_budget")
        if request.metadata is not None:
            user.user_metadata = request.metadata
            update_fields.append("metadata")
        if request.max_parallel_requests is not None:
            user.max_parallel_requests = request.max_parallel_requests
            update_fields.append("max_parallel_requests")
        if request.tpm_limit is not None:
            user.tpm_limit = request.tpm_limit
            update_fields.append("tpm_limit")
        if request.rpm_limit is not None:
            user.rpm_limit = request.rpm_limit
            update_fields.append("rpm_limit")
        if request.budget_duration is not None:
            user.budget_duration = request.budget_duration
            update_fields.append("budget_duration")
        
        # Update timestamp
        user.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        logger.info(
            "User updated",
            user_id=request.user_id,
            updated_fields=update_fields,
            updated_by=current_user.get("user_id")
        )
        
        return StandardResponse(
            status="success",
            message="User updated successfully",
            data={"updated_fields": update_fields}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Failed to update user", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.post("/delete", response_model=StandardResponse)
async def delete_users(
    user_ids: List[str],
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> StandardResponse:
    """
    Delete users.
    
    **Requires master key authentication.**
    """
    try:
        from src.models.user import LiteLLMUser
        
        # Delete the specified users
        stmt = delete(LiteLLMUser).where(LiteLLMUser.user_id.in_(user_ids))
        result = await db.execute(stmt)
        deleted_count = result.rowcount
        
        await db.commit()
        
        logger.info(
            "Users deleted",
            requested_users=len(user_ids),
            deleted_users=deleted_count,
            deleted_by=current_user.get("user_id")
        )
        
        return StandardResponse(
            status="success",
            message=f"Deleted {deleted_count} users",
            data={
                "deleted_users": deleted_count,
                "requested_users": len(user_ids)
            }
        )
        
    except Exception as e:
        await db.rollback()
        logger.error("Failed to delete users", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete users: {str(e)}"
        )


@router.get("/info", response_model=UserResponse)
async def get_user_info(
    user_id: str = Query(..., description="User ID to get information for"),
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> UserResponse:
    """
    Get information about a user.
    
    **Requires master key authentication.**
    """
    try:
        from src.models.user import LiteLLMUser
        
        # Look up the user
        stmt = select(LiteLLMUser).where(LiteLLMUser.user_id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        return UserResponse(
            user_id=user.user_id,
            user_email=user.user_email,
            user_role=user.user_role,
            team_id=user.team_id,
            organization_id=user.organization_id,
            models=user.models or [],
            max_budget=user.max_budget,
            spend=user.spend or 0.0,
            metadata=user.user_metadata or {},
            max_parallel_requests=user.max_parallel_requests,
            tpm_limit=user.tpm_limit,
            rpm_limit=user.rpm_limit,
            budget_duration=user.budget_duration,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get user info", user_id=user_id, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )


@router.get("/list", response_model=List[UserResponse])
async def list_users(
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    user_role: Optional[str] = Query(None, description="Filter by user role"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of users to return"),
    offset: int = Query(default=0, ge=0, description="Number of users to skip"),
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> List[UserResponse]:
    """
    List users with optional filtering.
    
    **Requires master key authentication.**
    """
    try:
        from src.models.user import LiteLLMUser
        
        # Build query with filters
        stmt = select(LiteLLMUser)
        
        conditions = []
        if team_id:
            conditions.append(LiteLLMUser.team_id == team_id)
        if organization_id:
            conditions.append(LiteLLMUser.organization_id == organization_id)
        if user_role:
            conditions.append(LiteLLMUser.user_role == user_role)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(desc(LiteLLMUser.created_at)).offset(offset).limit(limit)
        
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        # Convert to response format
        return [
            UserResponse(
                user_id=user.user_id,
                user_email=user.user_email,
                user_role=user.user_role,
                team_id=user.team_id,
                organization_id=user.organization_id,
                models=user.models or [],
                max_budget=user.max_budget,
                spend=user.spend or 0.0,
                metadata=user.user_metadata or {},
                max_parallel_requests=user.max_parallel_requests,
                tpm_limit=user.tpm_limit,
                rpm_limit=user.rpm_limit,
                budget_duration=user.budget_duration,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            for user in users
        ]
        
    except Exception as e:
        logger.error("Failed to list users", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )