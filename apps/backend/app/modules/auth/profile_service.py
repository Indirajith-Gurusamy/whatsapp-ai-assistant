"""Profile service with business logic for user profile operations."""
from fastapi import HTTPException, UploadFile
from app.db.prisma import Prisma
from app.modules.auth.profile_schemas import (
    ProfileResponse,
    UpdateProfileRequest,
    LocationData,
    SocialLink
)
from typing import Optional
import os
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Allowed image extensions and max file size
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class ProfileService:
    """Service for user profile operations."""
    
    def __init__(self, db: Prisma):
        """Initialize profile service with database connection."""
        self.db = db
    
    async def get_user_profile(self, user_id: int) -> ProfileResponse:
        """
        Get complete user profile.
        
        Args:
            user_id: ID of the user
            
        Returns:
            ProfileResponse with all profile data
            
        Raises:
            HTTPException: If user not found
        """
        user = await self.db.user.find_unique(
            where={'id': user_id},
            include={'profile': True}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build profile response
        profile_data = {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'emailVerified': user.emailVerified,
            'createdAt': user.createdAt,
        }
        
        # Add profile fields if profile exists
        if user.profile:
            profile_data['avatar'] = user.profile.avatar
            profile_data['bio'] = user.profile.bio
            profile_data['phone'] = user.profile.phone
            
            # Parse JSON fields
            if user.profile.location:
                profile_data['location'] = LocationData(**user.profile.location)
            
            if user.profile.dateOfBirth:
                profile_data['dateOfBirth'] = user.profile.dateOfBirth
            
            if user.profile.socialLinks:
                profile_data['socialLinks'] = [
                    SocialLink(**link) for link in user.profile.socialLinks
                ]
        
        return ProfileResponse(**profile_data)
    
    async def update_user_profile(
        self,
        user_id: int,
        data: UpdateProfileRequest
    ) -> ProfileResponse:
        """
        Update user profile.
        
        Args:
            user_id: ID of the user
            data: Profile update data
            
        Returns:
            Updated ProfileResponse
            
        Raises:
            HTTPException: If user not found or validation fails
        """
        # Check if user exists
        user = await self.db.user.find_unique(
            where={'id': user_id},
            include={'profile': True}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user name if provided
        if data.name is not None:
            await self.db.user.update(
                where={'id': user_id},
                data={'name': data.name}
            )
        
        # Update user email if provided
        if data.email is not None:
            # Check if email is already in use by another user
            existing = await self.db.user.find_first(
                where={
                    'email': data.email,
                    'NOT': {'id': user_id}
                }
            )
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use by another account")
            await self.db.user.update(
                where={'id': user_id},
                data={'email': data.email, 'emailVerified': False}
            )
        
        # Prepare profile data
        profile_data = {}
        
        if data.bio is not None:
            profile_data['bio'] = data.bio
        
        if data.phone is not None:
            profile_data['phone'] = data.phone
        
        if data.location is not None:
            profile_data['location'] = data.location.model_dump()
        
        if data.dateOfBirth is not None:
            profile_data['dateOfBirth'] = data.dateOfBirth
        
        if data.socialLinks is not None:
            profile_data['socialLinks'] = [
                link.model_dump(mode='json') for link in data.socialLinks
            ]
        
        # Update or create profile
        if user.profile:
            await self.db.userprofile.update(
                where={'userId': user_id},
                data=profile_data
            )
        else:
            await self.db.userprofile.create(
                data={
                    'userId': user_id,
                    **profile_data
                }
            )
        
        # Return updated profile
        return await self.get_user_profile(user_id)
    
    async def update_avatar(
        self,
        user_id: int,
        file: UploadFile
    ) -> dict:
        """
        Upload and update user avatar.
        
        Args:
            user_id: ID of the user
            file: Uploaded image file
            
        Returns:
            Dict with message and avatar URL
            
        Raises:
            HTTPException: If validation fails or upload error
        """
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Encode to Base64
        import base64
        encoded_string = base64.b64encode(content).decode('utf-8')
        mime_type = file.content_type or f"image/{file_ext.lstrip('.')}"
        avatar_data_url = f"data:{mime_type};base64,{encoded_string}"
        
        # Update database
        user = await self.db.user.find_unique(
            where={'id': user_id},
            include={'profile': True}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update or create profile with new avatar
        if user.profile:
            await self.db.userprofile.update(
                where={'userId': user_id},
                data={'avatar': avatar_data_url}
            )
        else:
            await self.db.userprofile.create(
                data={
                    'userId': user_id,
                    'avatar': avatar_data_url
                }
            )
        
        return {
            'message': 'Avatar updated successfully',
            'avatar_url': avatar_data_url
        }
