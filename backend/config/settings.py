"""
Application Settings using Pydantic Settings
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    
    # JWT
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440  # 24 hours
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://smart-traffic-det-git-9c6463-himanshu-sharmas-projects-2d8b9786.vercel.app,https://*.vercel.app"
    
    # Gemini API (optional)
    gemini_api_key: str = ""
    
    # SMTP Email Settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    
    # SendGrid API (for production - bypasses blocked SMTP)
    sendgrid_api_key: str = ""
    
    # Frontend URL
    frontend_url: str = "http://localhost:3000"
    
    # Redis (optional)
    redis_url: str = ""
    
    # Google OAuth2
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
