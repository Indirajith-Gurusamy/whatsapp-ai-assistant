"""Authentication service with business logic."""
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from fastapi import Request
from app.db.prisma import Prisma
from app.db.prisma.enums import UserRole
from app.modules.auth.utils import (
    hash_password,
    verify_password,
    generate_otp,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.modules.auth.session_utils import (
    hash_token,
    parse_user_agent,
    get_location_from_ip,
    get_client_ip,
    cleanup_expired_sessions
)
from app.modules.auth.schemas import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    TokenResponse
)
from app.modules.notifications.email import EmailService
from app.core.config import settings
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db: Prisma):
        self.db = db
        self.email_service = EmailService()
    
    async def signup(self, data: SignupRequest) -> dict:
        """
        Register a new user.
        
        Args:
            data: Signup request data
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If email already exists
        """
        # Check if email already exists
        existing_user = await self.db.user.find_unique(where={"email": data.email})
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
        
        # Create user
        user = await self.db.user.create(
            data={
                "email": data.email,
                "password": hashed_password,
                "name": data.name,
                "role": getattr(UserRole, data.role, UserRole.USER) if data.role else UserRole.USER,
                "isActive": True,
                "emailVerified": False,
                "verificationOtp": verification_otp,
                "verificationOtpExp": verification_otp_exp
            }
        )
        
        # Send verification email with OTP
        try:
            self.email_service.send_verification_otp(
                email=user.email,
                name=user.name,
                otp=verification_otp
            )
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            # Don't fail signup if email fails, user can request resend
        
        logger.info(f"User registered: {user.email}")
        return {
            "message": "Registration successful. Please check your email to verify your account.",
            "email": user.email
        }
    
    async def login(self, data: LoginRequest, request: Optional[Request] = None) -> AuthResponse:
        """
        Authenticate user and return tokens.
        
        Args:
            data: Login request data
            request: FastAPI request object for session tracking
            
        Returns:
            Auth response with user and tokens
            
        Raises:
            HTTPException: If credentials are invalid or email not verified
        """
        # Find user
        user = await self.db.user.find_unique(where={"email": data.email})
        if not user or not verify_password(data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if email is verified
        if not user.emailVerified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in"
            )
        
        # Check if user is active
        if not user.isActive:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        # Update last login
        await self.db.user.update(
            where={"id": user.id},
            data={"lastLogin": datetime.utcnow()}
        )
        
        # Create tokens
        token_data = {"sub": str(user.id), "email": user.email, "name": user.name, "role": user.role}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Create session record
        if request:
            await self._create_session(
                user_id=user.id,
                access_token=access_token,
                request=request
            )
        
        logger.info(f"User logged in: {user.email}")
        
        return AuthResponse(
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                isActive=user.isActive,
                emailVerified=user.emailVerified
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token
            )
        )
    
    async def verify_email(self, email: str, otp: str) -> dict:
        """
        Verify user email with OTP.
        
        Args:
            email: User's email address
            otp: 6-digit OTP code
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If OTP is invalid or expired
        """
        # Find user by email
        user = await self.db.user.find_unique(
            where={"email": email}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        # Check if OTP is expired
        is_expired = user.verificationOtpExp and user.verificationOtpExp.replace(tzinfo=None) < datetime.utcnow()
        logger.info(f"Checking verification code for {email}: Current={datetime.utcnow()}, Expiry={user.verificationOtpExp}, Expired={is_expired}")
        
        if is_expired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code expired"
            )

        # Check if OTP matches
        logger.info(f"Comparing verification code for {email}: Stored='{user.verificationOtp}', Provided='{otp}'")
        if not user.verificationOtp or user.verificationOtp != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid code"
            )
        
        # Update user
        await self.db.user.update(
            where={"id": user.id},
            data={
                "emailVerified": True,
                "verificationOtp": None,
                "verificationOtpExp": None
            }
        )
        
        # Send welcome email
        try:
            self.email_service.send_welcome_email(
                email=user.email,
                name=user.name
            )
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
        
        logger.info(f"Email verified: {user.email}")
        return {"message": "Email verified successfully. You can now log in."}
    
    async def resend_verification_otp(self, email: str) -> dict:
        """
        Resend verification OTP to user.
        
        Args:
            email: User's email address
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If user not found, already verified, or cooldown active
        """
        # Find user
        user = await self.db.user.find_unique(where={"email": email})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if already verified
        if user.emailVerified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified"
            )
        
        # Check cooldown (30 seconds since last OTP)
        # Simple approach: check if OTP exists and is recent
        if user.verificationOtp and user.verificationOtpExp:
            # If OTP hasn't expired yet, check if it was generated recently
            time_until_expiry = user.verificationOtpExp.replace(tzinfo=None) - datetime.utcnow()
            time_since_generation_seconds = (settings.VERIFICATION_OTP_EXPIRE_MINUTES * 60) - time_until_expiry.total_seconds()
            
            if time_since_generation_seconds < 30:
                wait_time = 30 - int(time_since_generation_seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait_time} seconds before requesting a new code"
                )
        
        # Generate new OTP (invalidates old one)
        new_otp = generate_otp()
        new_otp_exp = datetime.utcnow() + timedelta(
            minutes=settings.VERIFICATION_OTP_EXPIRE_MINUTES
        )
        
        # Update user with new OTP
        await self.db.user.update(
            where={"id": user.id},
            data={
                "verificationOtp": new_otp,
                "verificationOtpExp": new_otp_exp
            }
        )
        
        # Send new OTP email
        try:
            self.email_service.send_verification_otp(
                email=user.email,
                name=user.name,
                otp=new_otp
            )
        except Exception as e:
            logger.error(f"Failed to send OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code"
            )
        
        logger.info(f"Resent verification OTP to {email}")
        return {"message": "Verification code sent successfully"}
    
    async def check_email_availability(self, email: str) -> dict:
        """
        Check if email is available for registration.
        
        Args:
            email: Email to check
            
        Returns:
            Dictionary with 'available' and 'needs_verification' flags
        """
        user = await self.db.user.find_unique(where={"email": email})
        
        if not user:
            return {"available": True, "needs_verification": False}
        
        return {
            "available": False, 
            "needs_verification": not user.emailVerified
        }
    
    async def forgot_password(self, email: str) -> dict:
        """
        Initiate password reset by sending OTP to user's email.
        
        Args:
            email: User's email address
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If user not found, email not verified, or cooldown active
        """
        # Find user
        user = await self.db.user.find_unique(where={"email": email})
        
        if not user:
            # For security, don't reveal if email exists
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="If this email is registered, you will receive a password reset code"
            )
        
        # Check if email is verified
        if not user.emailVerified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please verify your email before resetting password"
            )
        
        # Check cooldown (30 seconds since last OTP)
        if user.resetToken and user.resetTokenExp:
            time_until_expiry = user.resetTokenExp.replace(tzinfo=None) - datetime.utcnow()
            time_since_generation_seconds = (10 * 60) - time_until_expiry.total_seconds()
            
            if time_since_generation_seconds < 30:
                wait_time = 30 - int(time_since_generation_seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait_time} seconds before requesting a new code"
                )
        
        # Generate new OTP
        reset_otp = generate_otp()
        reset_otp_exp = datetime.utcnow() + timedelta(minutes=10)
        
        # Update user with reset OTP
        await self.db.user.update(
            where={"id": user.id},
            data={
                "resetToken": reset_otp,
                "resetTokenExp": reset_otp_exp
            }
        )
        
        # Send password reset email
        try:
            self.email_service.send_password_reset_otp(
                email=user.email,
                name=user.name,
                otp=reset_otp
            )
        except Exception as e:
            logger.error(f"Failed to send password reset OTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset code"
            )
        
        logger.info(f"Password reset OTP sent to {email}")
        return {"message": "Password reset code sent to your email"}
    
    async def reset_password(self, email: str, otp: str, new_password: str) -> dict:
        """
        Reset user password using OTP verification.
        
        Args:
            email: User's email address
            otp: 6-digit OTP code
            new_password: New password
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If OTP is invalid or expired
        """
        # Find user by email
        user = await self.db.user.find_unique(where={"email": email})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset code"
            )
        
        # Check if OTP is expired
        is_expired = user.resetTokenExp and user.resetTokenExp.replace(tzinfo=None) < datetime.utcnow()
        logger.info(f"Checking reset code for {email}: Current={datetime.utcnow()}, Expiry={user.resetTokenExp}, Expired={is_expired}")
        
        if is_expired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code expired"
            )

        # Check if OTP matches
        logger.info(f"Comparing reset code for {email}: Stored='{user.resetToken}', Provided='{otp}'")
        if not user.resetToken or user.resetToken != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid code"
            )
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update user password and clear reset token
        await self.db.user.update(
            where={"id": user.id},
            data={
                "password": hashed_password,
                "resetToken": None,
                "resetTokenExp": None
            }
        )
        
        # Invalidate all sessions for security
        await self.db.session.delete_many(where={"userId": user.id})
        
        # Send confirmation email
        try:
            self.email_service.send_password_reset_confirmation(
                email=user.email,
                name=user.name
            )
        except Exception as e:
            logger.error(f"Failed to send password reset confirmation: {e}")
            # Don't fail the reset if confirmation email fails
        
        logger.info(f"Password reset successful for {email}")
        return {"message": "Password reset successful. Please log in with your new password."}

    
    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Generate new access token from refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New token response
            
        Raises:
            HTTPException: If refresh token is invalid
        """
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        # Verify user still exists and is active
        user = await self.db.user.find_unique(where={"id": int(user_id)})
        if not user or not user.isActive:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        token_data = {"sub": user_id, "email": email}
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )
    
    async def _create_session(
        self,
        user_id: int,
        access_token: str,
        request: Request
    ) -> None:
        """
        Create a session record for the user.
        
        Args:
            user_id: User ID
            access_token: JWT access token
            request: FastAPI request object
        """
        from app.core.config import settings
        
        # Hash the token for storage
        token_hash = hash_token(access_token)
        
        # Get User-Agent and parse it
        user_agent = request.headers.get("User-Agent", "")
        device_info = parse_user_agent(user_agent)
        
        # Get client IP
        ip_address = get_client_ip(request)
        
        # Get location from IP (async)
        location = None
        if ip_address:
            location = await get_location_from_ip(ip_address)
        
        # Calculate expiry (use refresh token expiry)
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Create session
        try:
            await self.db.session.create(
                data={
                    "userId": user_id,
                    "tokenHash": token_hash,
                    "deviceType": device_info.get("device_type"),
                    "browser": device_info.get("browser"),
                    "browserVersion": device_info.get("browser_version"),
                    "os": device_info.get("os"),
                    "ipAddress": ip_address,
                    "location": location,
                    "lastActivity": datetime.utcnow(),
                    "expiresAt": expires_at
                }
            )
            logger.info(f"Session created for user {user_id}")
        except Exception as e:
            # Don't fail login if session creation fails
            logger.error(f"Failed to create session: {e}")
    
    async def get_user_sessions(self, user_id: int, current_token: Optional[str] = None) -> List[dict]:
        """
        Get all active sessions for a user.
        
        Args:
            user_id: User ID
            current_token: Current access token to mark as current session
            
        Returns:
            List of session dictionaries
        """
        # Clean up expired sessions first
        await cleanup_expired_sessions(self.db)
        
        # Get all sessions for user
        sessions = await self.db.session.find_many(
            where={"userId": user_id},
            order={"lastActivity": "desc"}
        )
        
        # Mark current session
        current_token_hash = hash_token(current_token) if current_token else None
        
        result = []
        for session in sessions:
            result.append({
                "id": session.id,
                "deviceType": session.deviceType,
                "browser": session.browser,
                "browserVersion": session.browserVersion,
                "os": session.os,
                "ipAddress": session.ipAddress,
                "location": session.location,
                "lastActivity": session.lastActivity,
                "createdAt": session.createdAt,
                "isCurrent": session.tokenHash == current_token_hash
            })
        
        return result
    
    async def delete_session(self, session_id: int, user_id: int) -> dict:
        """
        Delete a specific session.
        
        Args:
            session_id: Session ID to delete
            user_id: User ID (for authorization)
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If session not found or unauthorized
        """
        # Verify session belongs to user
        session = await self.db.session.find_unique(where={"id": session_id})
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if session.userId != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to delete this session"
            )
        
        # Delete session
        await self.db.session.delete(where={"id": session_id})
        
        logger.info(f"Session {session_id} deleted for user {user_id}")
        return {"message": "Session logged out successfully"}
    
    async def delete_all_sessions(self, user_id: int, current_token: Optional[str] = None) -> dict:
        """
        Delete all sessions except the current one.
        
        Args:
            user_id: User ID
            current_token: Current access token to preserve
            
        Returns:
            Success message with count of deleted sessions
        """
        # Build where clause
        where_clause = {"userId": user_id}
        
        # Exclude current session if token provided
        if current_token:
            current_token_hash = hash_token(current_token)
            where_clause["NOT"] = {"tokenHash": current_token_hash}
        
        # Delete sessions
        result = await self.db.session.delete_many(where=where_clause)
        
        count = result if isinstance(result, int) else 0
        logger.info(f"Deleted {count} sessions for user {user_id}")
        
        return {
            "message": f"Logged out from {count} other device(s)",
            "count": count
        }
    
    async def update_session_activity(self, token: str) -> None:
        """
        Update the last activity timestamp for a session.
        
        Args:
            token: Access token
        """
        token_hash = hash_token(token)
        
        try:
            await self.db.session.update(
                where={"tokenHash": token_hash},
                data={"lastActivity": datetime.utcnow()}
            )
        except Exception as e:
            # Don't fail request if activity update fails
            logger.debug(f"Failed to update session activity: {e}")
