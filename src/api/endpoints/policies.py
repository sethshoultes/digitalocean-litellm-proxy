"""Access policy management endpoints."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth import get_current_user, User, require_roles
from src.config.database import get_db_session
from src.models.policies import AccessPolicy, UserAccessPolicy
from src.schemas.policies import (
    PolicyCreate,
    PolicyResponse,
    PolicyUpdate,
    UserPolicyAssignment,
    UserPolicyResponse
)

router = APIRouter()


@router.get("/", response_model=List[PolicyResponse])
async def list_policies(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in policy names"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """List access policies with filtering and pagination."""
    try:
        # Build query with filters
        query = select(AccessPolicy)
        filters = []
        
        # Apply filters
        if resource_type:
            filters.append(AccessPolicy.resource_type == resource_type)
        if is_active is not None:
            filters.append(AccessPolicy.is_active == is_active)
        if search:
            filters.append(AccessPolicy.policy_name.ilike(f"%{search}%"))
        
        # Non-admin users can only see non-system policies
        if current_user.user_role not in ["PROXY_ADMIN", "ORG_ADMIN"]:
            filters.append(AccessPolicy.is_system_policy == False)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Apply pagination and ordering
        query = query.order_by(AccessPolicy.priority.desc(), AccessPolicy.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        policies = result.scalars().all()
        
        return policies
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve policies: {str(e)}"
        )


@router.post("/", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    policy: PolicyCreate,
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN")),
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new access policy (admin only)."""
    try:
        # Check if policy name already exists
        existing_query = select(AccessPolicy).where(AccessPolicy.policy_name == policy.policy_name)
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Policy with name '{policy.policy_name}' already exists"
            )
        
        # Create new policy
        db_policy = AccessPolicy(
            policy_name=policy.policy_name,
            description=policy.description,
            resource_type=policy.resource_type,
            permissions=policy.permissions,
            conditions=policy.conditions or {},
            policy_metadata=policy.policy_metadata or {},
            priority=policy.priority,
            created_by=current_user.user_id
        )
        
        # Add to database
        db.add(db_policy)
        await db.commit()
        await db.refresh(db_policy)
        
        return db_policy
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create policy: {str(e)}"
        )


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Get policy by ID."""
    try:
        # Get policy
        query = select(AccessPolicy).where(AccessPolicy.policy_id == policy_id)
        result = await db.execute(query)
        policy = result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy with ID {policy_id} not found"
            )
        
        # Security: Non-admin users cannot view system policies
        if (current_user.user_role not in ["PROXY_ADMIN", "ORG_ADMIN"] and 
            policy.is_system_policy):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view system policies"
            )
        
        return policy
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve policy: {str(e)}"
        )


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: UUID,
    policy_update: PolicyUpdate,
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN")),
    db: AsyncSession = Depends(get_db_session)
):
    """Update policy (admin only)."""
    try:
        # Get existing policy
        query = select(AccessPolicy).where(AccessPolicy.policy_id == policy_id)
        result = await db.execute(query)
        policy = result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy with ID {policy_id} not found"
            )
        
        # Security: Cannot modify system policies unless you're PROXY_ADMIN
        if policy.is_system_policy and current_user.user_role != "PROXY_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only proxy admins can modify system policies"
            )
        
        # Check for name conflicts if name is being changed
        if (policy_update.policy_name and 
            policy_update.policy_name != policy.policy_name):
            existing_query = select(AccessPolicy).where(
                AccessPolicy.policy_name == policy_update.policy_name
            )
            existing_result = await db.execute(existing_query)
            if existing_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Policy with name '{policy_update.policy_name}' already exists"
                )
        
        # Update only provided fields
        update_data = policy_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(policy, field):
                setattr(policy, field, value)
        
        # Commit changes
        await db.commit()
        await db.refresh(policy)
        
        return policy
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update policy: {str(e)}"
        )


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: UUID,
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN")),
    db: AsyncSession = Depends(get_db_session)
):
    """Delete policy (admin only)."""
    try:
        # Get existing policy
        query = select(AccessPolicy).where(AccessPolicy.policy_id == policy_id)
        result = await db.execute(query)
        policy = result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy with ID {policy_id} not found"
            )
        
        # Security: Cannot delete system policies unless you're PROXY_ADMIN
        if policy.is_system_policy and current_user.user_role != "PROXY_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only proxy admins can delete system policies"
            )
        
        # Check if policy is assigned to any users
        assignment_query = select(UserAccessPolicy).where(
            UserAccessPolicy.policy_id == policy_id
        )
        assignment_result = await db.execute(assignment_query)
        if assignment_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete policy that is assigned to users. Remove assignments first."
            )
        
        # Delete policy (cascade will handle related records)
        await db.delete(policy)
        await db.commit()
        
        # Return 204 No Content
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete policy: {str(e)}"
        )


@router.post("/{policy_id}/assign", response_model=UserPolicyResponse)
async def assign_policy_to_user(
    policy_id: UUID,
    assignment: UserPolicyAssignment,
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN")),
    db: AsyncSession = Depends(get_db_session)
):
    """Assign policy to user (admin only)."""
    try:
        # Verify policy exists
        policy_query = select(AccessPolicy).where(AccessPolicy.policy_id == policy_id)
        policy_result = await db.execute(policy_query)
        policy = policy_result.scalar_one_or_none()
        
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy with ID {policy_id} not found"
            )
        
        # Check if assignment already exists
        existing_query = select(UserAccessPolicy).where(
            and_(
                UserAccessPolicy.user_id == assignment.user_id,
                UserAccessPolicy.policy_id == policy_id
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Policy already assigned to user {assignment.user_id}"
            )
        
        # Create new assignment
        db_assignment = UserAccessPolicy(
            user_id=assignment.user_id,
            policy_id=policy_id,
            granted_by=current_user.user_id,
            expires_at=assignment.expires_at,
            conditions=assignment.conditions or {},
            assignment_metadata=assignment.assignment_metadata or {}
        )
        
        # Add to database
        db.add(db_assignment)
        await db.commit()
        await db.refresh(db_assignment)
        
        # Load policy relationship for response
        assignment_query = select(UserAccessPolicy).options(
            selectinload(UserAccessPolicy.policy)
        ).where(
            and_(
                UserAccessPolicy.user_id == assignment.user_id,
                UserAccessPolicy.policy_id == policy_id
            )
        )
        assignment_result = await db.execute(assignment_query)
        assignment_with_policy = assignment_result.scalar_one()
        
        return assignment_with_policy
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign policy: {str(e)}"
        )


@router.delete("/{policy_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_policy_from_user(
    policy_id: UUID,
    user_id: str,
    current_user: User = Depends(require_roles("PROXY_ADMIN", "ORG_ADMIN")),
    db: AsyncSession = Depends(get_db_session)
):
    """Remove policy assignment from user (admin only)."""
    try:
        # Find assignment
        query = select(UserAccessPolicy).where(
            and_(
                UserAccessPolicy.user_id == user_id,
                UserAccessPolicy.policy_id == policy_id
            )
        )
        result = await db.execute(query)
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Policy assignment not found for user {user_id}"
            )
        
        # Delete assignment
        await db.delete(assignment)
        await db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove policy assignment: {str(e)}"
        )


@router.get("/users/{user_id}/policies", response_model=List[UserPolicyResponse])
async def list_user_policies(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """List policies assigned to a user."""
    try:
        # Security: Users can only see their own policies, admins can see all
        if (current_user.user_role not in ["PROXY_ADMIN", "ORG_ADMIN"] and 
            current_user.user_id != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view other users' policies"
            )
        
        # Get user's policy assignments
        query = select(UserAccessPolicy).options(
            selectinload(UserAccessPolicy.policy)
        ).where(
            and_(
                UserAccessPolicy.user_id == user_id,
                UserAccessPolicy.is_active == True
            )
        ).order_by(UserAccessPolicy.granted_at.desc())
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        return assignments
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user policies: {str(e)}"
        )