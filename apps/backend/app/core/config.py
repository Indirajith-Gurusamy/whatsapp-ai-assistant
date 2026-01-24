"""Configuration management using Pydantic Settings."""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/whatsapp_ai"
    
    # Twilio WhatsApp Configuration
    VERIFY_TOKEN: str = "VERIFY_TOKEN"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""  # Format: whatsapp:+14155238886
    RESPONSE_PHONE_NUMBER: Optional[str] = None  # If None, replies go to original sender
    
    # Groq API Configuration
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # Gemini API (Optional)
    GEMINI_API_KEY: Optional[str] = None
    
    # SMTP Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SENDER_EMAIL: str = ""
    SENDER_PASSWORD: str = ""
    RECIPIENT_EMAIL: str = ""
    
    # JWT Configuration
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Frontend URL for email links
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Email verification
    VERIFICATION_OTP_EXPIRE_MINUTES: int = 5
    
    # Admin Configuration
    ADMIN_SIGNUP_CODE: str = "CHANGE_THIS_ADMIN_CODE_IN_PRODUCTION"
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
