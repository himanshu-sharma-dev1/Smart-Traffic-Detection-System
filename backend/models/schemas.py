"""
Pydantic Models/Schemas for API validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId


# Custom ObjectId handling for Pydantic
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")


# ============================================
# USER SCHEMAS
# ============================================
class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (no password)"""
    id: str
    username: str
    email: str
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


class UserInDB(BaseModel):
    """Schema for user in database"""
    username: str
    email: str
    hashed_password: str
    created_at: datetime
    is_active: bool = True


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)


class PasswordChange(BaseModel):
    """Schema for password change"""
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for password reset"""
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


class ResendVerificationRequest(BaseModel):
    """Schema for resend verification email"""
    email: EmailStr


# ============================================
# AUTH SCHEMAS
# ============================================
class Token(BaseModel):
    """JWT Token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Data extracted from JWT token"""
    user_id: Optional[str] = None
    email: Optional[str] = None


# ============================================
# DETECTION SCHEMAS
# ============================================
class DetectionBox(BaseModel):
    """Bounding box for detected object"""
    x_min: int
    y_min: int
    x_max: int
    y_max: int


class DetectedObject(BaseModel):
    """Single detected object"""
    label: str
    confidence: float
    box: List[int]  # [x_min, y_min, x_max, y_max]


class DetectionCreate(BaseModel):
    """Schema for creating a detection record"""
    image_base64: Optional[str] = None
    detections: List[DetectedObject]
    source: str = "upload"  # upload, live, batch


class DetectionResponse(BaseModel):
    """Schema for detection response"""
    id: str
    user_id: str
    detections: List[DetectedObject]
    object_count: int
    avg_confidence: float
    source: str
    created_at: datetime
    thumbnail: Optional[str] = None

    class Config:
        from_attributes = True


class DetectionListResponse(BaseModel):
    """Schema for list of detections"""
    detections: List[DetectionResponse]
    total: int
    page: int
    limit: int


# ============================================
# STATS SCHEMAS
# ============================================
class UserStats(BaseModel):
    """User statistics"""
    total_detections: int
    total_objects: int
    avg_confidence: float
    top_object: str
    last_detection: Optional[datetime] = None


# ============================================
# GENERAL SCHEMAS
# ============================================
class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response schema"""
    detail: str
    error_code: Optional[str] = None
