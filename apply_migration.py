"""Apply database migration for profile fields."""
import asyncio
import sys
import os
from pathlib import Path

# Set environment variable
backend_dir = Path(__file__).parent / "apps" / "backend"
os.chdir(backend_dir)
sys.path.insert(0, str(backend_dir))

from app.db.prisma import Prisma

async def apply_migration():
    """Add new columns to user_profiles table."""
    db = Prisma()
    try:
        await db.connect()
        
        # Add new columns to user_profiles table
        await db.execute_raw("""
            ALTER TABLE user_profiles 
            ADD COLUMN IF NOT EXISTS location JSONB,
            ADD COLUMN IF NOT EXISTS date_of_birth DATE,
            ADD COLUMN IF NOT EXISTS social_links JSONB;
        """)
        
        print("✓ Migration applied successfully!")
        print("  - Added 'location' column (JSONB)")
        print("  - Added 'date_of_birth' column (DATE)")
        print("  - Added 'social_links' column (JSONB)")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(apply_migration())
