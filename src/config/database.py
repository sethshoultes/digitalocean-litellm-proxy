"""Database configuration and connection management."""

import contextlib
from typing import AsyncIterator

import structlog
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)
from sqlalchemy.pool import NullPool, QueuePool

from .settings import Settings

logger = structlog.get_logger()


class DatabaseManager:
    """Database connection manager."""

    def __init__(self, settings: Settings):
        """Initialize database manager."""
        self.settings = settings
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def create_engine(self) -> AsyncEngine:
        """Create database engine."""
        if self._engine is not None:
            return self._engine

        # Configure connection pool based on environment
        if self.settings.is_testing:
            # Use NullPool for testing to avoid connection issues
            poolclass = NullPool
            pool_kwargs = {}
        else:
            # Use QueuePool for production/development
            poolclass = QueuePool
            pool_kwargs = {
                "pool_size": self.settings.database_pool_size,
                "max_overflow": self.settings.database_max_overflow,
                "pool_timeout": self.settings.database_pool_timeout,
                "pool_recycle": self.settings.database_pool_recycle,
                "pool_pre_ping": True,  # Validate connections before use
            }

        # Create engine
        self._engine = create_async_engine(
            str(self.settings.database_url),
            echo=self.settings.database_echo,
            poolclass=poolclass,
            **pool_kwargs,
        )

        logger.info(
            "Database engine created",
            pool_class=poolclass.__name__,
            echo=self.settings.database_echo,
            **pool_kwargs,
        )

        return self._engine

    def create_session_factory(self) -> async_sessionmaker[AsyncSession]:
        """Create session factory."""
        if self._session_factory is not None:
            return self._session_factory

        engine = self.create_engine()
        self._session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        logger.info("Database session factory created")
        return self._session_factory

    @contextlib.asynccontextmanager
    async def get_session(self) -> AsyncIterator[AsyncSession]:
        """Get database session context manager."""
        session_factory = self.create_session_factory()
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def close(self):
        """Close database connections."""
        if self._engine:
            await self._engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
_db_manager: DatabaseManager | None = None


def get_database_manager(settings: Settings | None = None) -> DatabaseManager:
    """Get or create database manager instance."""
    global _db_manager

    if _db_manager is None:
        if settings is None:
            from .settings import get_settings

            settings = get_settings()
        _db_manager = DatabaseManager(settings)

    return _db_manager


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Dependency for getting database session."""
    db_manager = get_database_manager()
    async with db_manager.get_session() as session:
        yield session


# Alias for FastAPI dependency injection compatibility
get_db = get_db_session


# Health check functions
async def check_database_health() -> dict:
    """Check database connection health."""
    try:
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            # Simple query to check connection
            from sqlalchemy import text

            result = await session.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()

            if row and row[0] == 1:
                return {
                    "status": "healthy",
                    "message": "Database connection successful",
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": "Database query returned unexpected result",
                }

    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
        }


async def initialize_database(settings: Settings | None = None) -> None:
    """Initialize database connections and verify setup."""
    if settings is None:
        from .settings import get_settings

        settings = get_settings()

    logger.info("Initializing database...")

    # Create database manager and test connection
    db_manager = get_database_manager(settings)

    # Test database connection
    health = await check_database_health()
    if health["status"] != "healthy":
        raise RuntimeError(f"Database initialization failed: {health['message']}")

    logger.info("Database initialized successfully")


async def shutdown_database() -> None:
    """Shutdown database connections."""
    global _db_manager

    if _db_manager:
        await _db_manager.close()
        _db_manager = None
        logger.info("Database shutdown complete")
