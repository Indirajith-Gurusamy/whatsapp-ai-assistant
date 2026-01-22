"""Check if there are users in the database."""
import asyncio
from app.db.prisma import Prisma

async def check_users():
    """Check users in database."""
    db = Prisma()
    try:
        await db.connect()
        
        users = await db.user.find_many(
            include={'profile': True}
        )
        
        print(f"\n{'='*60}")
        print(f"Total users in database: {len(users)}")
        print(f"{'='*60}\n")
        
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Name: {user.name}")
            print(f"Role: {user.role}")
            print(f"Email Verified: {user.emailVerified}")
            print(f"Is Active: {user.isActive}")
            if user.profile:
                print(f"Has Profile: Yes")
            else:
                print(f"Has Profile: No")
            print("-" * 60)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_users())
