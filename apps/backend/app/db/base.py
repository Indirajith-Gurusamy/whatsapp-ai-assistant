"""Base repository class for database operations."""
from app.db.client import get_db


class BaseRepository:
    """Base repository with common database operations."""
    
    def __init__(self, entity_name: str):
        """Initialize repository with entity name."""
        self.entity_name = entity_name
    
    async def get_db(self):
        """Get database client instance."""
        return await get_db()
