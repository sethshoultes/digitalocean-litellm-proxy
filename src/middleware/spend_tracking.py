"""Middleware for tracking API spend and usage."""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from src.config.database import get_db_session
from src.models.virtual_keys import SpendLog, VerificationToken
from sqlalchemy import select, update

logger = structlog.get_logger()


class SpendTracker:
    """Middleware for tracking spend and updating verification token spend."""
    
    @staticmethod
    async def log_request_spend(
        request: Request,
        response: Response,
        api_key: str,
        model: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        spend: float = 0.0,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        model_parameters: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request_tags: Optional[list] = None
    ):
        """
        Log API request spend to the database.
        
        Args:
            request: FastAPI request object
            response: FastAPI response object  
            api_key: API key used for the request
            model: Model used for the request
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            total_tokens: Total tokens used
            spend: Cost of the request
            start_time: Request start time
            end_time: Request end time
            model_parameters: Model parameters used
            metadata: Additional metadata
            request_tags: Request tags
        """
        try:
            # Get database session
            async with get_db_session() as db:
                # Look up API key to get user/team info
                key_stmt = select(VerificationToken).where(VerificationToken.token == api_key)
                key_result = await db.execute(key_stmt)
                key_info = key_result.scalar_one_or_none()
                
                user_id = None
                team_id = None
                if key_info:
                    user_id = key_info.user_id
                    team_id = key_info.team_id
                
                # Create spend log entry
                spend_log = SpendLog(
                    request_id=str(uuid.uuid4()),
                    api_key=api_key,
                    user_id=user_id,
                    team_id=team_id,
                    model=model,
                    api_base=getattr(request.state, 'api_base', None),
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    spend=spend,
                    startTime=start_time or datetime.now(timezone.utc),
                    endTime=end_time or datetime.now(timezone.utc),
                    model_parameters_json=model_parameters,
                    spend_logs_metadata=metadata,
                    request_tags=request_tags or []
                )
                
                db.add(spend_log)
                
                # Update verification token spend
                if key_info and spend > 0:
                    update_stmt = update(VerificationToken).where(
                        VerificationToken.token == api_key
                    ).values(
                        spend=VerificationToken.spend + spend,
                        updated_at=datetime.now(timezone.utc)
                    )
                    await db.execute(update_stmt)
                
                await db.commit()
                
                logger.info(
                    "Request spend logged",
                    request_id=spend_log.request_id,
                    api_key=api_key[:16] + "..." if api_key else None,
                    user_id=user_id,
                    model=model,
                    total_tokens=total_tokens,
                    spend=spend
                )
                
        except Exception as e:
            logger.error(
                "Failed to log request spend",
                api_key=api_key[:16] + "..." if api_key else None,
                model=model,
                error=str(e),
                exc_info=True
            )
    
    @staticmethod
    def calculate_spend(
        model: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0
    ) -> float:
        """
        Calculate spend based on model and token usage.
        
        This is a simplified pricing model. In production, you would
        integrate with actual provider pricing.
        
        Args:
            model: Model name
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            total_tokens: Total tokens (fallback if prompt/completion not available)
            
        Returns:
            Calculated spend amount
        """
        # Simplified pricing (per 1K tokens)
        pricing = {
            # OpenAI pricing (approximate)
            "gpt-3.5-turbo": {"prompt": 0.0015, "completion": 0.002},
            "gpt-4": {"prompt": 0.03, "completion": 0.06},
            "gpt-4o": {"prompt": 0.005, "completion": 0.015},
            "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
            
            # Anthropic pricing (approximate)
            "claude-3-sonnet-20240229": {"prompt": 0.003, "completion": 0.015},
            "claude-3-opus-20240229": {"prompt": 0.015, "completion": 0.075},
            "claude-3-5-sonnet-20241022": {"prompt": 0.003, "completion": 0.015},
            "claude-3-5-haiku-20241022": {"prompt": 0.00025, "completion": 0.00125},
        }
        
        model_pricing = pricing.get(model, {"prompt": 0.001, "completion": 0.002})
        
        if prompt_tokens > 0 or completion_tokens > 0:
            # Use prompt/completion token counts
            prompt_cost = (prompt_tokens / 1000) * model_pricing["prompt"]
            completion_cost = (completion_tokens / 1000) * model_pricing["completion"]
            return prompt_cost + completion_cost
        elif total_tokens > 0:
            # Use total tokens with average pricing
            avg_price = (model_pricing["prompt"] + model_pricing["completion"]) / 2
            return (total_tokens / 1000) * avg_price
        
        return 0.0
    
    @staticmethod
    async def check_budget_limits(api_key: str) -> Dict[str, Any]:
        """
        Check if API key is within budget limits.
        
        Args:
            api_key: API key to check
            
        Returns:
            Dict with budget status information
        """
        try:
            async with get_db_session() as db:
                stmt = select(VerificationToken).where(VerificationToken.token == api_key)
                result = await db.execute(stmt)
                key_info = result.scalar_one_or_none()
                
                if not key_info:
                    return {"valid": False, "reason": "Key not found"}
                
                if key_info.blocked:
                    return {"valid": False, "reason": "Key is blocked"}
                
                if key_info.expires and datetime.now(timezone.utc) > key_info.expires:
                    return {"valid": False, "reason": "Key is expired"}
                
                if key_info.max_budget and key_info.spend >= key_info.max_budget:
                    return {
                        "valid": False,
                        "reason": "Budget limit exceeded",
                        "current_spend": key_info.spend,
                        "max_budget": key_info.max_budget
                    }
                
                return {
                    "valid": True,
                    "current_spend": key_info.spend or 0,
                    "max_budget": key_info.max_budget,
                    "budget_remaining": key_info.budget_remaining
                }
                
        except Exception as e:
            logger.error("Failed to check budget limits", api_key=api_key[:16] + "...", error=str(e))
            return {"valid": False, "reason": f"Budget check failed: {str(e)}"}


async def spend_tracking_middleware(request: Request, call_next):
    """
    Middleware to track API spend for virtual keys.
    
    This middleware should be applied to LiteLLM proxy requests to track
    usage and update spend amounts.
    """
    # Store request start time
    start_time = datetime.now(timezone.utc)
    request.state.start_time = start_time
    
    # Initialize tracking variables
    request.state.api_key = None
    request.state.model = None
    request.state.prompt_tokens = 0
    request.state.completion_tokens = 0
    request.state.total_tokens = 0
    request.state.spend = 0.0
    
    # Check if this is an API request with authorization
    authorization = request.headers.get("authorization")
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ")[1]
        request.state.api_key = api_key
        
        # Check budget limits before processing
        budget_status = await SpendTracker.check_budget_limits(api_key)
        if not budget_status["valid"]:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=budget_status["reason"]
            )
    
    # Process the request
    response = await call_next(request)
    
    # Log spend after request completion (if tracking is enabled)
    if hasattr(request.state, 'api_key') and request.state.api_key:
        end_time = datetime.now(timezone.utc)
        
        # Calculate spend if we have token information
        if hasattr(request.state, 'model') and request.state.model:
            spend = SpendTracker.calculate_spend(
                model=request.state.model,
                prompt_tokens=getattr(request.state, 'prompt_tokens', 0),
                completion_tokens=getattr(request.state, 'completion_tokens', 0),
                total_tokens=getattr(request.state, 'total_tokens', 0)
            )
            request.state.spend = spend
        
        # Log the request
        await SpendTracker.log_request_spend(
            request=request,
            response=response,
            api_key=request.state.api_key,
            model=getattr(request.state, 'model', 'unknown'),
            prompt_tokens=getattr(request.state, 'prompt_tokens', 0),
            completion_tokens=getattr(request.state, 'completion_tokens', 0),
            total_tokens=getattr(request.state, 'total_tokens', 0),
            spend=getattr(request.state, 'spend', 0.0),
            start_time=start_time,
            end_time=end_time
        )
    
    return response