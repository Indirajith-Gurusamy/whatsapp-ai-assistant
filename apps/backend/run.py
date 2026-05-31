"""
Startup script for the backend.
This sets up the Python path correctly and starts the server.
"""
import sys
import os
from pathlib import Path

# Fix Prisma version mismatch error
os.environ["PRISMA_PY_DEBUG_GENERATOR"] = "1"

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load apps/env/local.env (or production via APP_ENV) before app imports
from app.core.env_loader import load_env

env_file = load_env()

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("Starting WhatsApp AI Assistant Backend")
    print("=" * 60)
    print(f"Backend directory: {backend_dir}")
    print(f"Environment file: {env_file}")
    print(f"APP_ENV: {os.getenv('APP_ENV', 'local')}")
    print(f"Python path: {sys.path[0]}")
    print("=" * 60)
    
    # Start uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
