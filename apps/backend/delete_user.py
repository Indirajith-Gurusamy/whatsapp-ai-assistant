import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# apps/backend/delete_user.py -> parent is backend
backend_dir = Path(__file__).parent 
sys.path.insert(0, str(backend_dir))

# Explicitly load env
env_path = backend_dir / ".env"
load_dotenv(env_path)

from app.db.prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()

    email = "jarvi.indira@gmail.com"
    
    # Check User table
    user = await db.user.find_unique(where={"email": email})
    if user:
        print(f"Found in User table: {user.name} ({user.email})")
        await db.user.delete(where={"id": user.id})
        print(f"✓ Deleted from User table: {email}")
    else:
        print(f"No user found in User table with email: {email}")

    await db.disconnect()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
