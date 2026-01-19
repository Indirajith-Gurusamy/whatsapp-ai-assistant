"""Prisma client singleton for database connections."""
from prisma import Prisma
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Global Prisma client instance (singleton pattern for connection pooling)
_prisma_client: Optional[Prisma] = None


async def get_db() -> Prisma:
    """
    Get or create Prisma client instance with connection pooling.
    
    This uses a singleton pattern to ensure only one Prisma client
    is created per application instance, which provides connection pooling.
    
    Returns:
        Prisma: Connected Prisma client instance
        
    Raises:
        Exception: If database connection fails
    """
    global _prisma_client
    
    if _prisma_client is None:
        logger.info("Initializing Prisma client...")
        _prisma_client = Prisma()
        await _prisma_client.connect()
        logger.info("✓ Connected to PostgreSQL via Prisma")
    
    return _prisma_client


async def disconnect_db():
    """
    Disconnect Prisma client and cleanup resources.
    
    This should be called during application shutdown to gracefully
    close database connections.
    """
    global _prisma_client
    
    if _prisma_client is not None:
        await _prisma_client.disconnect()
        _prisma_client = None
        logger.info("✓ Disconnected from PostgreSQL")
