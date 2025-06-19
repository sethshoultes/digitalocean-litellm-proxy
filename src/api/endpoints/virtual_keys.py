"""LiteLLM Virtual Keys API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_, or_, desc
from sqlalchemy.orm import selectinload

import structlog

from src.auth.virtual_keys_auth import verify_master_key, generate_api_key
from src.config.database import get_db_session
from src.models.virtual_keys import VerificationToken, SpendLog
from src.schemas.virtual_keys import (
    KeyGenerateRequest,
    KeyResponse,
    KeyDeleteRequest,
    KeyUpdateRequest, 
    KeyInfoResponse,
    SpendLogsRequest,
    SpendLogsResponse,
    SpendLogResponse,
    StandardResponse,
    ErrorResponse
)

logger = structlog.get_logger()

router = APIRouter()


@router.post("/generate", response_model=KeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_key(
    request: KeyGenerateRequest,
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> KeyResponse:
    """
    Generate a new virtual key.
    
    This is the core LiteLLM endpoint for creating API keys that can be used
    to authenticate requests to the LiteLLM proxy.
    
    **Requires master key authentication.**
    """
    try:
        # Generate secure API key
        api_key = generate_api_key()
        
        # Create verification token record
        verification_token = VerificationToken(
            token=api_key,
            key_name=request.key_name,
            key_alias=request.key_alias,
            spend=request.spend,
            expires=request.expires,
            models=request.models or [],
            aliases=request.aliases or {},
            config=request.config or {},
            user_id=request.user_id,
            team_id=request.team_id,
            permissions={},  # Default empty permissions
            max_parallel_requests=request.max_parallel_requests,
            token_metadata=request.metadata or {},
            blocked=False,
            tpm_limit=request.tpm_limit,
            rpm_limit=request.rpm_limit,
            max_budget=request.max_budget,
            budget_duration=request.budget_duration,
            budget_reset_at=request.expires,
            created_by=current_user.get("user_id", "master"),
            updated_by=current_user.get("user_id", "master")
        )
        
        db.add(verification_token)
        await db.commit()
        await db.refresh(verification_token)
        
        logger.info(
            "Virtual key generated",
            key_id=api_key[:16] + "...",
            user_id=request.user_id,
            team_id=request.team_id,
            max_budget=request.max_budget,
            created_by=current_user.get("user_id")
        )
        
        return KeyResponse(
            key=api_key,
            expires=verification_token.expires,
            user_id=verification_token.user_id,
            team_id=verification_token.team_id,
            max_budget=verification_token.max_budget,
            key_alias=verification_token.key_alias,
            key_name=verification_token.key_name
        )
        
    except Exception as e:
        await db.rollback()
        logger.error("Failed to generate virtual key", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate key: {str(e)}"
        )


@router.post("/delete", response_model=StandardResponse)
async def delete_keys(
    request: KeyDeleteRequest,
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> StandardResponse:
    """
    Delete virtual keys.
    
    **Requires master key authentication.**
    """
    try:
        # Delete the specified keys
        stmt = delete(VerificationToken).where(
            VerificationToken.token.in_(request.keys)
        )
        result = await db.execute(stmt)
        deleted_count = result.rowcount
        
        await db.commit()
        
        logger.info(
            "Virtual keys deleted",
            requested_keys=len(request.keys),
            deleted_keys=deleted_count,
            deleted_by=current_user.get("user_id")
        )
        
        return StandardResponse(
            status="success",
            message=f"Deleted {deleted_count} keys",
            data={
                "deleted_keys": deleted_count,
                "requested_keys": len(request.keys)
            }
        )
        
    except Exception as e:
        await db.rollback()
        logger.error("Failed to delete virtual keys", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete keys: {str(e)}"
        )


@router.get("/info", response_model=KeyInfoResponse)
async def get_key_info(
    key: str = Query(..., description="API key to get information for"),
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> KeyInfoResponse:
    """
    Get information about a virtual key.
    
    **Requires master key authentication.**
    """
    try:
        # Look up the key
        stmt = select(VerificationToken).where(VerificationToken.token == key)
        result = await db.execute(stmt)
        key_info = result.scalar_one_or_none()
        
        if not key_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Key not found"
            )
        
        # Calculate computed fields
        is_expired = bool(key_info.expires and datetime.now(timezone.utc) > key_info.expires)
        is_valid = not is_expired and not bool(key_info.blocked)
        budget_remaining = None
        if key_info.max_budget is not None:
            budget_remaining = max(0, key_info.max_budget - (key_info.spend or 0))
        budget_exceeded = bool(key_info.max_budget is not None and (key_info.spend or 0) >= key_info.max_budget)
        
        response_data = KeyInfoResponse(
            token=key_info.token,
            key_name=key_info.key_name,
            key_alias=key_info.key_alias,
            spend=key_info.spend or 0,
            expires=key_info.expires,
            models=key_info.models or [],
            aliases=key_info.aliases or {},
            config=key_info.config or {},
            user_id=key_info.user_id,
            team_id=key_info.team_id,
            permissions=key_info.permissions or {},
            max_parallel_requests=key_info.max_parallel_requests,
            metadata=key_info.token_metadata or {},
            blocked=key_info.blocked or False,
            tpm_limit=key_info.tpm_limit,
            rpm_limit=key_info.rpm_limit,
            max_budget=key_info.max_budget,
            budget_duration=key_info.budget_duration,
            budget_reset_at=key_info.budget_reset_at,
            created_at=key_info.created_at,
            updated_at=key_info.updated_at,
            is_expired=is_expired,
            is_valid=is_valid,
            budget_remaining=budget_remaining,
            budget_exceeded=budget_exceeded
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get key info", key_prefix=key[:16], error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get key info: {str(e)}"
        )


@router.post("/update", response_model=StandardResponse)
async def update_key(
    request: KeyUpdateRequest,
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> StandardResponse:
    """
    Update a virtual key's settings.
    
    **Requires master key authentication.**
    """
    try:
        # Look up the key
        stmt = select(VerificationToken).where(VerificationToken.token == request.key)
        result = await db.execute(stmt)
        key_info = result.scalar_one_or_none()
        
        if not key_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Key not found"
            )
        
        # Update fields that were provided
        update_fields = []
        if request.models is not None:
            key_info.models = request.models
            update_fields.append("models")
        if request.aliases is not None:
            key_info.aliases = request.aliases
            update_fields.append("aliases")
        if request.config is not None:
            key_info.config = request.config
            update_fields.append("config")
        if request.max_budget is not None:
            key_info.max_budget = request.max_budget
            update_fields.append("max_budget")
        if request.user_id is not None:
            key_info.user_id = request.user_id
            update_fields.append("user_id")
        if request.team_id is not None:
            key_info.team_id = request.team_id
            update_fields.append("team_id")
        if request.max_parallel_requests is not None:
            key_info.max_parallel_requests = request.max_parallel_requests
            update_fields.append("max_parallel_requests")
        if request.metadata is not None:
            key_info.token_metadata = request.metadata
            update_fields.append("metadata")
        if request.tpm_limit is not None:
            key_info.tpm_limit = request.tpm_limit
            update_fields.append("tpm_limit")
        if request.rpm_limit is not None:
            key_info.rpm_limit = request.rpm_limit
            update_fields.append("rpm_limit")
        if request.budget_duration is not None:
            key_info.budget_duration = request.budget_duration
            update_fields.append("budget_duration")
        if request.expires is not None:
            key_info.expires = request.expires
            update_fields.append("expires")
        if request.key_alias is not None:
            key_info.key_alias = request.key_alias
            update_fields.append("key_alias")
        if request.key_name is not None:
            key_info.key_name = request.key_name
            update_fields.append("key_name")
        if request.blocked is not None:
            key_info.blocked = request.blocked
            update_fields.append("blocked")
        
        # Update metadata
        key_info.updated_by = current_user.get("user_id", "master")
        key_info.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        logger.info(
            "Virtual key updated",
            key_id=request.key[:16] + "...",
            updated_fields=update_fields,
            updated_by=current_user.get("user_id")
        )
        
        return StandardResponse(
            status="success",
            message="Key updated successfully",
            data={"updated_fields": update_fields}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Failed to update virtual key", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update key: {str(e)}"
        )


@router.get("/list", response_model=List[KeyInfoResponse])
async def list_keys(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    blocked: Optional[bool] = Query(None, description="Filter by blocked status"),
    expired: Optional[bool] = Query(None, description="Filter by expiration status"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of keys to return"),
    offset: int = Query(default=0, ge=0, description="Number of keys to skip"),
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> List[KeyInfoResponse]:
    """
    List virtual keys with optional filtering.
    
    **Requires master key authentication.**
    """
    try:
        # Build query with filters
        stmt = select(VerificationToken)
        
        conditions = []
        if user_id:
            conditions.append(VerificationToken.user_id == user_id)
        if team_id:
            conditions.append(VerificationToken.team_id == team_id)
        if blocked is not None:
            conditions.append(VerificationToken.blocked == blocked)
        if expired is not None:
            if expired:
                conditions.append(
                    and_(
                        VerificationToken.expires.is_not(None),
                        VerificationToken.expires < datetime.now(timezone.utc)
                    )
                )
            else:
                conditions.append(
                    or_(
                        VerificationToken.expires.is_(None),
                        VerificationToken.expires >= datetime.now(timezone.utc)
                    )
                )
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(desc(VerificationToken.created_at)).offset(offset).limit(limit)
        
        result = await db.execute(stmt)
        keys = result.scalars().all()
        
        # Convert to response format
        response_keys = []
        for key_info in keys:
            is_expired = bool(key_info.expires and datetime.now(timezone.utc) > key_info.expires)
            is_valid = not is_expired and not bool(key_info.blocked)
            budget_remaining = None
            if key_info.max_budget is not None:
                budget_remaining = max(0, key_info.max_budget - (key_info.spend or 0))
            budget_exceeded = bool(key_info.max_budget is not None and (key_info.spend or 0) >= key_info.max_budget)
            
            response_keys.append(KeyInfoResponse(
                token=key_info.token,
                key_name=key_info.key_name,
                key_alias=key_info.key_alias,
                spend=key_info.spend or 0,
                expires=key_info.expires,
                models=key_info.models or [],
                aliases=key_info.aliases or {},
                config=key_info.config or {},
                user_id=key_info.user_id,
                team_id=key_info.team_id,
                permissions=key_info.permissions or {},
                max_parallel_requests=key_info.max_parallel_requests,
                metadata=key_info.token_metadata or {},
                blocked=key_info.blocked or False,
                tpm_limit=key_info.tpm_limit,
                rpm_limit=key_info.rpm_limit,
                max_budget=key_info.max_budget,
                budget_duration=key_info.budget_duration,
                budget_reset_at=key_info.budget_reset_at,
                created_at=key_info.created_at,
                updated_at=key_info.updated_at,
                is_expired=is_expired,
                is_valid=is_valid,
                budget_remaining=budget_remaining,
                budget_exceeded=budget_exceeded
            ))
        
        return response_keys
        
    except Exception as e:
        logger.error("Failed to list virtual keys", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list keys: {str(e)}"
        )


@router.get("/spend/logs", response_model=SpendLogsResponse)
async def get_spend_logs(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    user_id: Optional[str] = Query(None, description="User ID filter"),
    team_id: Optional[str] = Query(None, description="Team ID filter"),
    api_key: Optional[str] = Query(None, description="API key filter"),
    model: Optional[str] = Query(None, description="Model filter"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(default=0, ge=0, description="Number of records to skip"),
    current_user: Dict[str, Any] = Depends(verify_master_key),
    db: AsyncSession = Depends(get_db_session)
) -> SpendLogsResponse:
    """
    Get spend logs with filtering options.
    
    **Requires master key authentication.**
    """
    try:
        # Build query with filters
        stmt = select(SpendLog)
        count_stmt = select(func.count(SpendLog.request_id))
        sum_stmt = select(func.sum(SpendLog.spend))
        
        conditions = []
        if start_date:
            conditions.append(SpendLog.startTime >= start_date)
        if end_date:
            conditions.append(SpendLog.startTime <= end_date)
        if user_id:
            conditions.append(SpendLog.user_id == user_id)
        if team_id:
            conditions.append(SpendLog.team_id == team_id)
        if api_key:
            conditions.append(SpendLog.api_key == api_key)
        if model:
            conditions.append(SpendLog.model == model)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
            sum_stmt = sum_stmt.where(and_(*conditions))
        
        # Get total count and spend
        count_result = await db.execute(count_stmt)
        total_count = count_result.scalar() or 0
        
        sum_result = await db.execute(sum_stmt)
        total_spend = sum_result.scalar() or 0.0
        
        # Get paginated records
        stmt = stmt.order_by(desc(SpendLog.startTime)).offset(offset).limit(limit)
        result = await db.execute(stmt)
        logs = result.scalars().all()
        
        # Convert to response format
        response_logs = [
            SpendLogResponse(
                request_id=log.request_id,
                api_key=log.api_key,
                user_id=log.user_id,
                team_id=log.team_id,
                organization_id=log.organization_id,
                model=log.model,
                model_group=log.model_group,
                api_base=log.api_base,
                prompt_tokens=log.prompt_tokens,
                completion_tokens=log.completion_tokens,
                total_tokens=log.total_tokens,
                spend=log.spend,
                startTime=log.startTime,
                endTime=log.endTime,
                completionStartTime=log.completionStartTime,
                model_parameters_json=log.model_parameters_json,
                spend_logs_metadata=log.spend_logs_metadata,
                request_tags=log.request_tags or [],
                duration_seconds=log.duration_seconds,
                tokens_per_second=log.tokens_per_second
            )
            for log in logs
        ]
        
        return SpendLogsResponse(
            data=response_logs,
            total_count=total_count,
            total_spend=total_spend,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Failed to get spend logs", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get spend logs: {str(e)}"
        )