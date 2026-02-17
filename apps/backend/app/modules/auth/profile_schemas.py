"""Pydantic schemas for user profile operations."""
from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional, List
from datetime import date, datetime


class LocationData(BaseModel):
    """User location data."""
    city: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None


class SocialLink(BaseModel):
    """Social media link."""
    platform: str  # e.g., "twitter", "linkedin", "github"
    url: HttpUrl
    
    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        allowed_platforms = ['twitter', 'linkedin', 'github', 'facebook', 'instagram', 'website']
        if v.lower() not in allowed_platforms:
            raise ValueError(f'Platform must be one of: {", ".join(allowed_platforms)}')
        return v.lower()


class ProfileResponse(BaseModel):
    """Complete user profile response."""
    id: int
    email: str
    name: str
    role: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[LocationData] = None
    dateOfBirth: Optional[date] = None
    socialLinks: Optional[List[SocialLink]] = None
    emailVerified: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """Request to update user profile."""
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[LocationData] = None
    dateOfBirth: Optional[date] = None
    socialLinks: Optional[List[SocialLink]] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) < 2:
                raise ValueError('Name must be at least 2 characters')
            if len(v) > 255:
                raise ValueError('Name must not exceed 255 characters')
        return v
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError('Bio must not exceed 500 characters')
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            # Remove common formatting characters
            cleaned = ''.join(c for c in v if c.isdigit() or c == '+')
            if len(cleaned) < 10 or len(cleaned) > 15:
                raise ValueError('Phone number must be between 10 and 15 digits')
        return v
    
    @field_validator('dateOfBirth')
    @classmethod
    def validate_date_of_birth(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            # Calculate age
            today = date.today()
            age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
            
            if age < 13:
                raise ValueError('You must be at least 13 years old')
            if age > 120:
                raise ValueError('Invalid date of birth')
        return v
    
    @field_validator('socialLinks')
    @classmethod
    def validate_social_links(cls, v: Optional[List[SocialLink]]) -> Optional[List[SocialLink]]:
        if v is not None and len(v) > 10:
            raise ValueError('Maximum 10 social links allowed')
        return v


class UpdateAvatarResponse(BaseModel):
    """Response after avatar upload."""
    message: str
    avatar_url: str
