"""Authentication router with API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.db.prisma import Prisma
from app.modules.auth.service import AuthService
from app.modules.auth.schemas import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    EmailCheckResponse,
    MessageResponse,
    RefreshTokenRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ForceChangePasswordRequest
)
from app.modules.auth.session_schemas import SessionListResponse, SessionResponse
from app.modules.auth.dependencies import get_db, get_current_user
from app.modules.auth.profile_router import router as profile_router

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Include profile router
router.include_router(profile_router)


@router.post("/signup", response_model=MessageResponse, status_code=201)
async def signup(
    data: SignupRequest,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Register a new user.
    
    - **name**: User's full name (min 2 characters)
    - **email**: Valid email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, number, special char)
    - **role**: Role of the user (USER or ADMIN)
    
    Returns a success message. User must verify email before logging in.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only admins can create new users"
        )
    try:
        service = AuthService(db)
        result = await service.signup(data)
        return MessageResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Signup error for {data.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: Prisma = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens.
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns user data and access/refresh tokens.
    Email must be verified to log in.
    """
    try:
        service = AuthService(db)
        return await service.login(data, request)
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Login error for {data.email}: {str(e)}", exc_info=True)
        error_msg = str(e).lower()
        if "connection" in error_msg or "connect" in error_msg or "refused" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Unable to connect to the database. Please try again later."
            )
        raise HTTPException(
            status_code=500,
            detail="Login failed. Please try again later."
        )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    email: str = Query(..., description="User's email address"),
    otp: str = Query(..., description="6-digit OTP code"),
    db: Prisma = Depends(get_db)
):
    """
    Verify user email with OTP code.
    
    - **email**: User's email address
    - **otp**: 6-digit OTP code from email
    
    Returns success message on verification.
    """
    try:
        service = AuthService(db)
        result = await service.verify_email(email, otp)
        return MessageResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Verify email error for {email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Email verification failed: {str(e)}"
        )


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(
    email: str = Query(..., description="User's email address"),
    db: Prisma = Depends(get_db)
):
    """
    Resend verification OTP code.
    
    - **email**: User's email address
    
    Returns success message. Has 30-second cooldown between requests.
    """
    try:
        service = AuthService(db)
        result = await service.resend_verification_otp(email)
        return MessageResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Resend OTP error for {email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resend OTP: {str(e)}"
        )


@router.get("/check-email", response_model=EmailCheckResponse)
async def check_email(
    email: str = Query(..., description="Email to check"),
    db: Prisma = Depends(get_db)
):
    """
    Check if email is available for registration.
    
    - **email**: Email address to check
    
    Returns whether the email is available.
    """
    try:
        service = AuthService(db)
        result = await service.check_email_availability(email)
        return EmailCheckResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Check email error for {email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check email: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: Prisma = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    Returns new access and refresh tokens.
    """
    try:
        service = AuthService(db)
        return await service.refresh_access_token(data.refresh_token)
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Refresh token error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh token: {str(e)}"
        )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Prisma = Depends(get_db)
):
    """
    Request password reset OTP.
    
    - **email**: User's email address
    
    Returns success message. OTP will be sent to email if it exists and is verified.
    Has 30-second cooldown between requests.
    """
    try:
        service = AuthService(db)
        result = await service.forgot_password(data.email)
        return MessageResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Forgot password error for {data.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process forgot password request: {str(e)}"
        )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: Prisma = Depends(get_db)
):
    """
    Reset password using OTP.
    
    - **email**: User's email address
    - **otp**: 6-digit OTP code from email
    - **new_password**: New password (min 8 chars, uppercase, lowercase, number, special char)
    
    Returns success message. All sessions will be invalidated for security.
    """
    try:
        service = AuthService(db)
        result = await service.reset_password(data.email, data.otp, data.new_password)
        return MessageResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Reset password error for {data.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset password: {str(e)}"
        )
    return MessageResponse(message=result["message"])



@router.get("/sessions", response_model=SessionListResponse)
async def get_sessions(
    request: Request,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Get all active sessions for the current user.
    
    Returns list of sessions with device, browser, location info.
    Current session is marked with isCurrent flag.
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    
    service = AuthService(db)
    sessions = await service.get_user_sessions(current_user.id, token)
    
    return SessionListResponse(
        sessions=[SessionResponse(**s) for s in sessions],
        total=len(sessions)
    )


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def delete_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Logout a specific session by ID.
    
    - **session_id**: ID of the session to logout
    
    Returns success message.
    """
    service = AuthService(db)
    result = await service.delete_session(session_id, current_user.id)
    return MessageResponse(message=result["message"])


@router.delete("/sessions/all", response_model=MessageResponse)
async def delete_all_sessions(
    request: Request,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Logout all sessions except the current one.
    
    Returns success message with count of logged out sessions.
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    
    service = AuthService(db)
    result = await service.delete_all_sessions(current_user.id, token)
    return MessageResponse(message=result["message"])


@router.post("/force-change-password", response_model=MessageResponse)
async def force_change_password(
    data: ForceChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Change password when mustChangePassword flag is set.
    
    - **current_password**: Current temporary password
    - **new_password**: New password (min 8 chars, uppercase, lowercase, number, special char)
    
    Clears the mustChangePassword flag after successful change.
    """
    service = AuthService(db)
    result = await service.force_change_password(
        user_id=current_user.id,
        current_password=data.current_password,
        new_password=data.new_password
    )
    return MessageResponse(message=result["message"])

