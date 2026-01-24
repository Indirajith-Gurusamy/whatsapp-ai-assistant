"""Service layer for admin operations."""
import logging
from typing import Optional, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from app.db.prisma import Prisma
from app.db.prisma.enums import UserRole

logger = logging.getLogger(__name__)


class AdminService:
    """Service for administrative operations."""
    
    def __init__(self, db: Prisma):
        self.db = db
    
    async def get_all_users(self, skip: int = 0, limit: int = 50) -> Tuple[list, int]:
        """
        Get paginated list of all users.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Tuple of (users list, total count)
        """
        # Get total count
        total = await self.db.user.count()
        
        # Get paginated users
        users = await self.db.user.find_many(
            skip=skip,
            take=limit,
            order={'createdAt': 'desc'}
        )
        
        logger.info(f"Retrieved {len(users)} users (skip={skip}, limit={limit}, total={total})")
        return users, total
    
    async def count_admins(self) -> int:
        """
        Count total number of admin users.
        
        Returns:
            Number of admin users
        """
        count = await self.db.user.count(
            where={'role': UserRole.ADMIN}
        )
        return count
    
    async def change_user_role(
        self, 
        user_id: int, 
        new_role: str, 
        admin_id: int
    ) -> dict:
        """
        Change a user's role.
        
        Args:
            user_id: ID of user to modify
            new_role: New role (USER or ADMIN)
            admin_id: ID of admin performing the action
            
        Returns:
            Updated user data
            
        Raises:
            HTTPException: If user not found or last admin demotion attempted
        """
        # Find the target user
        user = await self.db.user.find_unique(where={'id': user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-demotion
        if user_id == admin_id and new_role == 'USER':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot demote yourself"
            )
        
        # If demoting from ADMIN to USER, check if this is the last admin
        if user.role == UserRole.ADMIN and new_role == 'USER':
            admin_count = await self.count_admins()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last admin. Promote another user to admin first."
                )
        
        # Convert string role to enum
        role_enum = UserRole.ADMIN if new_role == 'ADMIN' else UserRole.USER
        
        # Update user role
        updated_user = await self.db.user.update(
            where={'id': user_id},
            data={'role': role_enum}
        )
        
        logger.info(f"Admin {admin_id} changed user {user_id} role from {user.role} to {new_role}")
        
        return updated_user
    
    async def delete_user(self, user_id: int, admin_id: int) -> dict:
        """
        Delete a user account.
        
        Args:
            user_id: ID of user to delete
            admin_id: ID of admin performing the action
            
        Returns:
            Success message with deleted user ID
            
        Raises:
            HTTPException: If user not found, self-deletion, or last admin deletion
        """
        # Find the target user
        user = await self.db.user.find_unique(where={'id': user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-deletion
        if user_id == admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account"
            )
        
        # If deleting an admin, check if this is the last admin
        if user.role == UserRole.ADMIN:
            admin_count = await self.count_admins()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last admin. Promote another user to admin first."
                )
        
        # Delete user (cascade will handle sessions and profile)
        await self.db.user.delete(where={'id': user_id})
        
        logger.info(f"Admin {admin_id} deleted user {user_id} ({user.email})")
        
        return {
            "message": f"User {user.email} deleted successfully",
            "deleted_user_id": user_id
        }
    
    async def get_admin_stats(self) -> dict:
        """
        Get statistics about users.
        
        Returns:
            Dictionary with user statistics
        """
        total_users = await self.db.user.count()
        total_admins = await self.db.user.count(where={'role': UserRole.ADMIN})
        total_active = await self.db.user.count(where={'isActive': True})
        total_verified = await self.db.user.count(where={'emailVerified': True})
        
        return {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_active_users": total_active,
            "total_verified_users": total_verified
        }
