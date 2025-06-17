"""Health check endpoints."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.config.database import check_database_health
from src.config.redis import check_redis_health
from src.config.settings import get_settings

router = APIRouter()


@router.get("/")
async def health_check():
    """Comprehensive health check."""
    settings = get_settings()
    
    # Check all components
    db_health = await check_database_health()
    redis_health = await check_redis_health()
    
    # Determine overall health
    is_healthy = (
        db_health["status"] == "healthy" and 
        redis_health["status"] == "healthy"
    )
    
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "unhealthy",
            "version": settings.app_version,
            "environment": settings.environment,
            "components": {
                "database": db_health,
                "redis": redis_health,
            }
        }
    )


@router.get("/database")
async def database_health():
    """Database health check."""
    health = await check_database_health()
    status_code = status.HTTP_200_OK if health["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content=health
    )


@router.get("/redis")
async def redis_health():
    """Redis health check."""
    health = await check_redis_health()
    status_code = status.HTTP_200_OK if health["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content=health
    )