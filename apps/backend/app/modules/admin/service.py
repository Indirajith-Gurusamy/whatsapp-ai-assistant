"""Service layer for admin operations."""
import logging
import secrets
import string
from typing import Optional, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from app.db.prisma import Prisma
from app.db.prisma.enums import UserRole
from app.modules.auth.utils import hash_password

logger = logging.getLogger(__name__)


def generate_random_password(length: int = 12) -> str:
    """Generate a random password with letters, digits, and special characters."""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class AdminService:
    """Service for administrative operations."""
    
    def __init__(self, db: Prisma):
        self.db = db
    
    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[list, int]:
        """
        Get paginated list of all users.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional filter on name or email (case-insensitive)
            role: Optional filter by role (USER or ADMIN)
            is_active: Optional filter by active status

        Returns:
            Tuple of (users list, total count)
        """
        conditions = []
        if search and search.strip():
            q = search.strip()
            conditions.append({
                'OR': [
                    {'name': {'contains': q, 'mode': 'insensitive'}},
                    {'email': {'contains': q, 'mode': 'insensitive'}},
                ]
            })
        if role:
            role_upper = role.strip().upper()
            if role_upper in ('USER', 'ADMIN'):
                conditions.append({'role': role_upper})
        if is_active is not None:
            conditions.append({'isActive': is_active})

        where = {'AND': conditions} if conditions else None

        total = await self.db.user.count(where=where)

        users = await self.db.user.find_many(
            where=where,
            skip=skip,
            take=limit,
            order={'createdAt': 'desc'},
        )

        logger.info(
            "Retrieved %s users (skip=%s, limit=%s, total=%s, search=%r, role=%r, is_active=%r)",
            len(users),
            skip,
            limit,
            total,
            search,
            role,
            is_active,
        )
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
    
    async def toggle_user_status(self, user_id: int, is_active: bool, admin_id: int) -> dict:
        """
        Enable or disable a user account.
        
        Args:
            user_id: ID of user to modify
            is_active: New active status
            admin_id: ID of admin performing the action
            
        Returns:
            Updated user data
        """
        user = await self.db.user.find_unique(where={'id': user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user_id == admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own status"
            )
        
        updated_user = await self.db.user.update(
            where={'id': user_id},
            data={'isActive': is_active}
        )
        
        action = "enabled" if is_active else "disabled"
        logger.info(f"Admin {admin_id} {action} user {user_id}")
        
        return updated_user
    
    async def verify_user_manually(self, user_id: int, admin_id: int) -> dict:
        """
        Manually verify a user's email.
        
        Args:
            user_id: ID of user to verify
            admin_id: ID of admin performing the action
            
        Returns:
            Updated user data
        """
        user = await self.db.user.find_unique(where={'id': user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.emailVerified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already verified"
            )
        
        updated_user = await self.db.user.update(
            where={'id': user_id},
            data={
                'emailVerified': True,
                'verificationOtp': None,
                'verificationOtpExp': None
            }
        )
        
        logger.info(f"Admin {admin_id} manually verified user {user_id}")
        
        return updated_user
    
    async def reset_user_password(self, user_id: int, admin_id: int) -> str:
        """
        Reset user password and send temporary password via email.
        
        Args:
            user_id: ID of user to reset
            admin_id: ID of admin performing the action
            
        Returns:
            Success message
        """
        user = await self.db.user.find_unique(where={'id': user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user_id == admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot reset your own password through admin panel"
            )
        
        temp_password = generate_random_password()
        hashed = hash_password(temp_password)
        
        await self.db.user.update(
            where={'id': user_id},
            data={
                'password': hashed,
                'mustChangePassword': True
            }
        )
        
        await self.db.session.delete_many(where={'userId': user_id})
        
        logger.warning(
            f"Admin {admin_id} reset password for user {user_id}. "
            f"Email unavailable — temp password returned to admin."
        )

        return temp_password

    async def bulk_delete_users(self, user_ids: list, admin_id: int) -> dict:
        """Delete multiple users; collects per-id errors."""
        deleted = []
        errors = []
        for uid in user_ids:
            try:
                result = await self.delete_user(int(uid), admin_id)
                deleted.append(result.get("deleted_user_id", uid))
            except HTTPException as exc:
                errors.append({"user_id": uid, "error": exc.detail})
        return {"deleted": deleted, "errors": errors}

