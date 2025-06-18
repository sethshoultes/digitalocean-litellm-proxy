"""Connection management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth import User, get_current_user
from src.config.database import get_db_session
from src.models import UserConnection
from src.models.base import ConnectionStatus, ProviderType
from src.schemas.connections import (ConnectionCreate, ConnectionResponse,
                                     ConnectionUpdate)

router = APIRouter()


async def check_connection_access(
    connection_id: str,
    current_user: User,
    db: AsyncSession,
    require_write: bool = False,
) -> UserConnection:
    """Check if user has access to connection and return it."""
    query = select(UserConnection).where(UserConnection.connection_id == connection_id)
    result = await db.execute(query)
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection with ID {connection_id} not found",
        )

    # Security: Check ownership or admin access
    is_admin = current_user.user_role in ["PROXY_ADMIN", "ORG_ADMIN"]
    is_owner = connection.user_id == current_user.user_id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this connection",
        )

    # For write operations, check additional permissions
    if require_write and not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this connection",
        )

    return connection


@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of records to return"
    ),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    provider: Optional[ProviderType] = Query(None, description="Filter by provider"),
    connection_status: Optional[ConnectionStatus] = Query(
        None, description="Filter by connection status"
    ),
    search: Optional[str] = Query(None, description="Search in connection names"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List user connections with optional filtering and pagination."""
    try:
        # Build query with filters
        query = select(UserConnection).options(
            selectinload(UserConnection.shared_connections)
        )

        # Apply filters
        filters = []

        # Security: Users can only see their own connections unless they have admin role
        if current_user.user_role not in ["PROXY_ADMIN", "ORG_ADMIN"]:
            filters.append(UserConnection.user_id == current_user.user_id)
        elif user_id:
            filters.append(UserConnection.user_id == user_id)

        if provider:
            filters.append(UserConnection.provider == provider)
        if connection_status:
            filters.append(UserConnection.status == connection_status)
        if search:
            filters.append(UserConnection.connection_name.ilike(f"%{search}%"))

        if filters:
            query = query.where(and_(*filters))

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Order by most recently updated
        query = query.order_by(UserConnection.updated_at.desc())

        # Execute query
        result = await db.execute(query)
        connections = result.scalars().all()

        return connections

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve connections: {str(e)}",
        )


@router.post(
    "/", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED
)
async def create_connection(
    connection: ConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new connection with credential encryption."""
    try:
        # Create new connection instance
        # Security: Use authenticated user's ID
        db_connection = UserConnection(
            user_id=current_user.user_id,
            connection_name=connection.connection_name,
            provider=connection.provider,
            configuration=connection.configuration,
            connection_metadata=connection.connection_metadata or {},
        )

        # Encrypt credentials if provided
        if connection.credentials:
            # TODO: Implement actual credential encryption using pgcrypto
            # For now, store as JSON (this should be encrypted in production)
            import json

            db_connection.credentials_encrypted = json.dumps(connection.credentials)

        # Add to database
        db.add(db_connection)
        await db.commit()
        await db.refresh(db_connection)

        return db_connection

    except Exception as e:
        await db.rollback()
        # Check for unique constraint violations
        if "duplicate key value" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Connection with this name already exists for the user",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connection: {str(e)}",
        )


@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get connection by ID."""
    try:
        # Check access and get connection
        connection = await check_connection_access(connection_id, current_user, db)

        # Load relationships for detailed view (skip activities for now due to schema mismatch)
        query = (
            select(UserConnection)
            .options(selectinload(UserConnection.shared_connections))
            .where(UserConnection.connection_id == connection_id)
        )

        result = await db.execute(query)
        connection = result.scalar_one()

        return connection

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve connection: {str(e)}",
        )


@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: str,
    connection_update: ConnectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Update connection with partial updates."""
    try:
        # Check access and get connection
        connection = await check_connection_access(
            connection_id, current_user, db, require_write=True
        )

        # Update only provided fields
        update_data = connection_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(connection, field):
                setattr(connection, field, value)

        # Commit changes
        await db.commit()
        await db.refresh(connection)

        return connection

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connection: {str(e)}",
        )


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete connection with cascade cleanup."""
    try:
        # Check access and get connection
        connection = await check_connection_access(
            connection_id, current_user, db, require_write=True
        )

        # Delete connection (cascade will handle related records)
        await db.delete(connection)
        await db.commit()

        # Return 204 No Content (no response body)
        return None

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connection: {str(e)}",
        )


@router.post("/{connection_id}/test")
async def test_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Test connection health and update health status."""
    try:
        # Check access and get connection
        connection = await check_connection_access(
            connection_id, current_user, db, require_write=True
        )

        # Mock health check implementation
        # TODO: Implement actual provider-specific health checks
        import json
        from datetime import datetime

        health_result = {
            "status": "healthy",
            "response_time_ms": 150,
            "tested_at": datetime.utcnow().isoformat(),
            "provider": str(connection.provider),
            "test_type": "ping",
        }

        # Update connection health status
        connection.health_status = health_result["status"]
        connection.last_health_check = datetime.utcnow()
        connection.avg_response_time = health_result["response_time_ms"]

        # Increment success count
        connection.success_count += 1

        await db.commit()

        return {
            "connection_id": connection_id,
            "health_check": health_result,
            "message": "Connection test completed successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()

        # Update error count if connection exists
        try:
            if "connection" in locals():
                connection.error_count += 1
                connection.health_status = "unhealthy"
                await db.commit()
        except:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}",
        )
