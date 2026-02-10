"""Authentication repository for database operations."""
from typing import List, Optional
from app.db.base import BaseRepository


class AuthRepository(BaseRepository):
    """Repository for auth-related database operations."""
    
    def __init__(self):
        super().__init__("user")
    
    async def get_user_by_email(self, email: str):
        """Get a user by email address."""
        db = await self.get_db()
        return await db.user.find_unique(where={"email": email})
    
    async def get_users_by_role(self, role: str):
        """Get all users with a specific role."""
        db = await self.get_db()
        users = await db.user.find_many(
            where={"role": role, "isActive": True}
        )
        return users
