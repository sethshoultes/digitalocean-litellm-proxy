"""Redis configuration and connection management."""

import json
from typing import Any, Optional

import structlog
from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import RedisError

from .settings import Settings

logger = structlog.get_logger()


class RedisManager:
    """Redis connection manager."""

    def __init__(self, settings: Settings):
        """Initialize Redis manager."""
        self.settings = settings
        self._pool: ConnectionPool | None = None
        self._redis: Redis | None = None

    def create_pool(self) -> ConnectionPool:
        """Create Redis connection pool."""
        if self._pool is not None:
            return self._pool

        self._pool = ConnectionPool.from_url(
            str(self.settings.redis_url),
            max_connections=self.settings.redis_max_connections,
            socket_timeout=self.settings.redis_socket_timeout,
            socket_connect_timeout=self.settings.redis_socket_connect_timeout,
            retry_on_timeout=self.settings.redis_retry_on_timeout,
        )

        logger.info(
            "Redis connection pool created",
            max_connections=self.settings.redis_max_connections,
            socket_timeout=self.settings.redis_socket_timeout,
        )

        return self._pool

    def get_redis(self) -> Redis:
        """Get Redis client."""
        if self._redis is not None:
            return self._redis

        pool = self.create_pool()
        self._redis = Redis(connection_pool=pool, decode_responses=True)

        logger.info("Redis client created")
        return self._redis

    async def close(self):
        """Close Redis connections."""
        if self._redis:
            await self._redis.close()
            logger.info("Redis connections closed")

    # Cache operations
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}{key}"
            return await redis.get(prefixed_key)
        except RedisError as e:
            logger.error("Redis get operation failed", key=key, error=str(e))
            return None

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}{key}"
            ttl = ttl or self.settings.cache_ttl_seconds

            result = await redis.setex(prefixed_key, ttl, value)
            return bool(result)
        except RedisError as e:
            logger.error("Redis set operation failed", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}{key}"
            result = await redis.delete(prefixed_key)
            return bool(result)
        except RedisError as e:
            logger.error("Redis delete operation failed", key=key, error=str(e))
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}{key}"
            result = await redis.exists(prefixed_key)
            return bool(result)
        except RedisError as e:
            logger.error("Redis exists operation failed", key=key, error=str(e))
            return False

    # JSON operations
    async def get_json(self, key: str) -> Optional[Any]:
        """Get JSON value from cache."""
        value = await self.get(key)
        if value is None:
            return None

        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError) as e:
            logger.error("Failed to decode JSON from cache", key=key, error=str(e))
            return None

    async def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set JSON value in cache."""
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, ttl)
        except (TypeError, ValueError) as e:
            logger.error("Failed to encode JSON for cache", key=key, error=str(e))
            return False

    # Rate limiting operations
    async def increment_rate_limit(
        self, key: str, window: int, limit: int
    ) -> tuple[int, bool]:
        """Increment rate limit counter and check if limit exceeded."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}rate_limit:{key}"

            # Use pipeline for atomic operations
            pipe = redis.pipeline()
            pipe.incr(prefixed_key)
            pipe.expire(prefixed_key, window)
            results = await pipe.execute()

            current_count = results[0]
            is_allowed = current_count <= limit

            return current_count, is_allowed
        except RedisError as e:
            logger.error("Rate limit operation failed", key=key, error=str(e))
            # Allow request if Redis fails
            return 1, True

    async def get_rate_limit_status(self, key: str) -> dict:
        """Get current rate limit status."""
        try:
            redis = self.get_redis()
            prefixed_key = f"{self.settings.cache_prefix}rate_limit:{key}"

            pipe = redis.pipeline()
            pipe.get(prefixed_key)
            pipe.ttl(prefixed_key)
            results = await pipe.execute()

            current_count = int(results[0]) if results[0] else 0
            ttl = results[1] if results[1] > 0 else 0

            return {"current_count": current_count, "ttl": ttl, "reset_time": ttl}
        except RedisError as e:
            logger.error("Get rate limit status failed", key=key, error=str(e))
            return {"current_count": 0, "ttl": 0, "reset_time": 0}


# Global Redis manager instance
_redis_manager: RedisManager | None = None


def get_redis_manager(settings: Settings | None = None) -> RedisManager:
    """Get or create Redis manager instance."""
    global _redis_manager

    if _redis_manager is None:
        if settings is None:
            from .settings import get_settings

            settings = get_settings()
        _redis_manager = RedisManager(settings)

    return _redis_manager


async def get_redis() -> Redis:
    """Dependency for getting Redis client."""
    redis_manager = get_redis_manager()
    return redis_manager.get_redis()


# Health check functions
async def check_redis_health() -> dict:
    """Check Redis connection health."""
    try:
        redis_manager = get_redis_manager()
        redis = redis_manager.get_redis()

        # Simple ping to check connection
        result = await redis.ping()

        if result:
            return {"status": "healthy", "message": "Redis connection successful"}
        else:
            return {"status": "unhealthy", "message": "Redis ping failed"}

    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        return {"status": "unhealthy", "message": f"Redis connection failed: {str(e)}"}


async def initialize_redis(settings: Settings | None = None) -> None:
    """Initialize Redis connections and verify setup."""
    if settings is None:
        from .settings import get_settings

        settings = get_settings()

    logger.info("Initializing Redis...")

    # Create Redis manager and test connection
    redis_manager = get_redis_manager(settings)

    # Test Redis connection
    health = await check_redis_health()
    if health["status"] != "healthy":
        raise RuntimeError(f"Redis initialization failed: {health['message']}")

    logger.info("Redis initialized successfully")


async def shutdown_redis() -> None:
    """Shutdown Redis connections."""
    global _redis_manager

    if _redis_manager:
        await _redis_manager.close()
        _redis_manager = None
        logger.info("Redis shutdown complete")
