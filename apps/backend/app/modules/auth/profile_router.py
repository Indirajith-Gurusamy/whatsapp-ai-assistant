"""Profile router with API endpoints for user profile management."""
from fastapi import APIRouter, Depends, UploadFile, File
from app.db.prisma import Prisma
from app.modules.auth.profile_service import ProfileService
from app.modules.auth.profile_schemas import (
    ProfileResponse,
    UpdateProfileRequest,
    UpdateAvatarResponse
)
from app.modules.auth.schemas import MessageResponse
from app.modules.auth.dependencies import get_db, get_current_user

router = APIRouter(prefix="/users", tags=["User Profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_current_user_profile(
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Get current user's complete profile.
    
    Returns user data including:
    - Basic info (name, email, role)
    - Profile data (avatar, bio, phone)
    - Location (city, country)
    - Date of birth
    - Social media links
    
    Requires authentication.
    """
    service = ProfileService(db)
    return await service.get_user_profile(current_user.id)


@router.put("/me", response_model=ProfileResponse)
async def update_current_user_profile(
    data: UpdateProfileRequest,
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Update current user's profile.
    
    Updateable fields:
    - **name**: User's full name (2-255 characters)
    - **bio**: User biography (max 500 characters)
    - **phone**: Phone number (10-15 digits)
    - **location**: City and country
    - **dateOfBirth**: Date of birth (must be 13+ years old)
    - **socialLinks**: Array of social media links (max 10)
    
    All fields are optional. Only provided fields will be updated.
    
    Requires authentication.
    """
    service = ProfileService(db)
    return await service.update_user_profile(current_user.id, data)


@router.patch("/me/avatar", response_model=UpdateAvatarResponse)
async def update_current_user_avatar(
    file: UploadFile = File(..., description="Avatar image file"),
    current_user = Depends(get_current_user),
    db: Prisma = Depends(get_db)
):
    """
    Upload and update user avatar image.
    
    Requirements:
    - **File types**: JPG, JPEG, PNG, GIF, WEBP
    - **Max size**: 5MB
    
    The old avatar will be automatically deleted.
    
    Requires authentication.
    """
    service = ProfileService(db)
    result = await service.update_avatar(current_user.id, file)
    return UpdateAvatarResponse(**result)
