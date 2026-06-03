"""Admin router with API endpoints for user management."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, HTTPException, status, UploadFile, File
from app.db.prisma import Prisma
from app.modules.auth.dependencies import get_db, require_role, get_current_user
from app.modules.admin.service import AdminService
from app.modules.admin.schemas import (
    UserListResponse,
    UserListItem,
    RoleChangeRequest,
    RoleChangeResponse,
    UserDeleteResponse,
    AdminSignupRequest,
    AdminStatsResponse,
    ToggleStatusRequest,
    ToggleStatusResponse,
    VerifyUserResponse,
    ResetPasswordResponse
)
from app.modules.auth.schemas import AuthResponse, LoginRequest, MessageResponse
from app.modules.auth.profile_schemas import UpdateProfileRequest
from app.modules.auth.service import AuthService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/signup", response_model=MessageResponse, status_code=201)
async def admin_signup(
    data: AdminSignupRequest,
    db: Prisma = Depends(get_db)
):
    """
    Register a new admin user.
    
    Requires a valid admin signup code from environment configuration.
    
    - **name**: Admin's full name
    - **email**: Valid email address
    - **password**: Strong password
    - **admin_code**: Secret admin registration code
    
    Returns a success message. Admin must verify email before logging in.
    """
    try:
        # Validate admin code
        expected_code = settings.ADMIN_SIGNUP_CODE if hasattr(settings, 'ADMIN_SIGNUP_CODE') else None
        
        if not expected_code:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Admin signup is not configured"
            )
        
        if data.admin_code != expected_code:
            logger.warning(f"Failed admin signup attempt for {data.email} - invalid code")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid admin signup code"
            )
        
        # Use auth service to create admin user
        from app.modules.auth.schemas import SignupRequest
        signup_data = SignupRequest(
            name=data.name,
            email=data.email,
            password=data.password
        )
        
        auth_service = AuthService(db)
        
        # Create user with admin role
        from app.db.prisma.enums import UserRole
        from app.modules.auth.utils import hash_password, generate_otp
        from datetime import datetime, timedelta
        
        # Check if email already exists
        existing_user = await db.user.find_unique(where={"email": data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(data.password)
        
        # Generate verification OTP
        verification_otp = generate_otp()
        verification_otp_exp = datetime.utcnow() + timedelta(
            minutes=settings.VERIFICATION_OTP_EXPIRE_MINUTES
        )
        
        # Create admin user
        user = await db.user.create(
            data={
                "email": data.email,
                "password": hashed_password,
                "name": data.name,
                "role": UserRole.ADMIN,  # Set as ADMIN
                "isActive": True,
                "emailVerified": False,
                "verificationOtp": verification_otp,
                "verificationOtpExp": verification_otp_exp
            }
        )
        
        # Send verification email
        try:
            from app.core.email import EmailService
            email_service = EmailService()
            email_service.send_verification_otp(
                email=user.email,
                name=user.name,
                otp=verification_otp
            )
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
        
        logger.info(f"Admin user registered: {user.email}")
        return MessageResponse(
            message="Admin registration successful. Please check your email to verify your account."
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin signup error for {data.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def admin_login(
    data: LoginRequest,
    request: Request,
    db: Prisma = Depends(get_db)
):
    """
    Authenticate admin user and return JWT tokens.
    
    - **email**: Admin's email address
    - **password**: Admin's password
    
    Returns user data and access/refresh tokens.
    Only users with ADMIN role can login through this endpoint.
    """
    try:
        # Use regular login
        auth_service = AuthService(db)
        auth_response = await auth_service.login(data, request)
        
        # Verify user is admin
        if auth_response.user.role != "ADMIN":
            logger.warning(f"Non-admin user {data.email} attempted admin login")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required. This account is not an admin account. Please use the regular login."
            )
        
        logger.info(f"Admin logged in: {data.email}")
        return auth_response
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the full error for debugging
        logger.error(f"Admin login error for {data.email}: {str(e)}", exc_info=True)
        # Return detailed error message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/users", response_model=UserListResponse)
async def get_all_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    search: Optional[str] = Query(None, description="Filter by name or email"),
    role: Optional[str] = Query(None, description="Filter by role (USER or ADMIN)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Get paginated list of all users.
    
    **Admin only endpoint.**
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (1-100)
    - **search**: Optional case-insensitive filter on name or email
    - **role**: Optional filter by USER or ADMIN
    - **is_active**: Optional filter by active/disabled status
    
    Returns list of users with their details and total count.
    """
    try:
        service = AdminService(db)
        users, total = await service.get_all_users(
            skip, limit, search, role=role, is_active=is_active
        )
        
        # Convert to response model
        user_items = [
            UserListItem(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                is_active=user.isActive,
                email_verified=user.emailVerified,
                last_login=user.lastLogin,
                created_at=user.createdAt
            )
            for user in users
        ]
        
        return UserListResponse(
            users=user_items,
            total=total,
            skip=skip,
            limit=limit
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get users error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.put("/users/{user_id}/role", response_model=RoleChangeResponse)
async def change_user_role(
    user_id: int,
    data: RoleChangeRequest,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Change a user's role.
    
    **Admin only endpoint.**
    
    - **user_id**: ID of the user to modify
    - **role**: New role (USER or ADMIN)
    
    Prevents demoting the last admin.
    Returns updated user information.
    """
    try:
        service = AdminService(db)
        updated_user = await service.change_user_role(
            user_id=user_id,
            new_role=data.role,
            admin_id=current_user.id
        )
        
        return RoleChangeResponse(
            message=f"User role updated to {data.role}",
            user=UserListItem(
                id=updated_user.id,
                email=updated_user.email,
                name=updated_user.name,
                role=updated_user.role,
                is_active=updated_user.isActive,
                email_verified=updated_user.emailVerified,
                last_login=updated_user.lastLogin,
                created_at=updated_user.createdAt
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change role error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change user role: {str(e)}"
        )


@router.delete("/users/{user_id}", response_model=UserDeleteResponse)
async def delete_user(
    user_id: int,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Delete a user account.
    
    **Admin only endpoint.**
    
    - **user_id**: ID of the user to delete
    
    Prevents deleting the last admin or self-deletion.
    Cascades to delete user's sessions and profile.
    Returns confirmation message.
    """
    try:
        service = AdminService(db)
        result = await service.delete_user(
            user_id=user_id,
            admin_id=current_user.id
        )
        
        return UserDeleteResponse(
            message=result["message"],
            deleted_user_id=result["deleted_user_id"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Get statistics about users.
    
    **Admin only endpoint.**
    
    Returns counts of total users, admins, active users, and verified users.
    """
    try:
        service = AdminService(db)
        stats = await service.get_admin_stats()
        
        return AdminStatsResponse(**stats)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get stats error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


@router.put("/users/{user_id}/status", response_model=ToggleStatusResponse)
async def toggle_user_status(
    user_id: int,
    data: ToggleStatusRequest,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Enable or disable a user account.
    
    **Admin only endpoint.**
    
    - **user_id**: ID of the user to modify
    - **is_active**: True to enable, False to disable
    """
    try:
        service = AdminService(db)
        updated_user = await service.toggle_user_status(
            user_id=user_id,
            is_active=data.is_active,
            admin_id=current_user.id
        )
        
        action = "enabled" if data.is_active else "disabled"
        return ToggleStatusResponse(
            message=f"User {action} successfully",
            user=UserListItem(
                id=updated_user.id,
                email=updated_user.email,
                name=updated_user.name,
                role=updated_user.role,
                is_active=updated_user.isActive,
                email_verified=updated_user.emailVerified,
                must_change_password=updated_user.mustChangePassword,
                last_login=updated_user.lastLogin,
                created_at=updated_user.createdAt
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle status error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle user status: {str(e)}"
        )


@router.put("/users/{user_id}/verify", response_model=VerifyUserResponse)
async def verify_user_manually(
    user_id: int,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Manually verify a user's email.
    
    **Admin only endpoint.**
    
    - **user_id**: ID of the user to verify
    """
    try:
        service = AdminService(db)
        updated_user = await service.verify_user_manually(
            user_id=user_id,
            admin_id=current_user.id
        )
        
        return VerifyUserResponse(
            message="User verified successfully",
            user=UserListItem(
                id=updated_user.id,
                email=updated_user.email,
                name=updated_user.name,
                role=updated_user.role,
                is_active=updated_user.isActive,
                email_verified=updated_user.emailVerified,
                must_change_password=updated_user.mustChangePassword,
                last_login=updated_user.lastLogin,
                created_at=updated_user.createdAt
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify user error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify user: {str(e)}"
        )


@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_user_password(
    user_id: int,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """
    Reset user password and send temporary password via email.
    
    **Admin only endpoint.**
    
    - **user_id**: ID of the user whose password to reset
    
    A random password is generated, emailed to the user, and they must change it on first login.
    """
    try:
        service = AdminService(db)
        message = await service.reset_user_password(
            user_id=user_id,
            admin_id=current_user.id
        )
        
        return ResetPasswordResponse(message=message)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )


@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: int,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """Get a user's complete profile. Admin only."""
    try:
        from app.modules.auth.profile_service import ProfileService
        service = ProfileService(db)
        return await service.get_user_profile(user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user profile error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user profile: {str(e)}"
        )


@router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: int,
    data: UpdateProfileRequest,
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """Update a user's profile. Admin only."""
    try:
        from app.modules.auth.profile_service import ProfileService
        service = ProfileService(db)
        return await service.update_user_profile(user_id, data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user profile error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user profile: {str(e)}"
        )


@router.patch("/users/{user_id}/avatar")
async def update_user_avatar(
    user_id: int,
    file: UploadFile = File(..., description="Avatar image file"),
    current_user = Depends(require_role(['ADMIN'])),
    db: Prisma = Depends(get_db)
):
    """Upload and update a user's avatar. Admin only."""
    try:
        from app.modules.auth.profile_service import ProfileService
        from app.modules.auth.profile_schemas import UpdateAvatarResponse
        service = ProfileService(db)
        result = await service.update_avatar(user_id, file)
        return UpdateAvatarResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user avatar error for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user avatar: {str(e)}"
        )
