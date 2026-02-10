"""FastAPI dependencies for authentication."""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.prisma import Prisma
from app.modules.auth.utils import decode_token

security = HTTPBearer()


async def get_db() -> Prisma:
    """Get database instance."""
    from app.db.client import get_db as get_prisma_client
    try:
        return await get_prisma_client()
    except Exception as e:
        error_msg = str(e).lower()
        if "connection" in error_msg or "connect" in error_msg or "refused" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to the database. Please try again later."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A server error occurred. Please try again later."
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Prisma = Depends(get_db)
):
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP authorization credentials
        db: Database instance
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await db.user.find_unique(where={"id": int(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Update session activity (async, don't wait for it)
    try:
        from app.modules.auth.service import AuthService
        service = AuthService(db)
        await service.update_session_activity(token)
    except Exception:
        # Don't fail request if session update fails
        pass
    
    return user


async def get_current_admin_user(
    current_user = Depends(get_current_user)
):
    """
    Get current authenticated admin user.
    
    Args:
        current_user: Current user from get_current_user dependency
        
    Returns:
        Current admin user
        
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


def require_role(allowed_roles: List[str]):
    """
    Create a dependency that requires the user to have one of the specified roles.
    
    Args:
        allowed_roles: List of role names that are allowed (e.g., ['ADMIN', 'MODERATOR'])
        
    Returns:
        FastAPI dependency function
        
    Example:
        @router.get("/admin/users", dependencies=[Depends(require_role(['ADMIN']))])
        async def get_users():
            ...
    """
    async def role_checker(current_user = Depends(get_current_user)):
        """Check if current user has one of the required roles."""
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {' or '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker
