"""
Authentication Routes - Register, Login, User Profile
With Rate Limiting
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from datetime import datetime
from bson import ObjectId
from slowapi import Limiter
from slowapi.util import get_remote_address

from config.database import get_database
from models.schemas import (
    UserCreate, UserLogin, UserResponse, UserUpdate, 
    PasswordChange, Token, MessageResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest
)
from utils.auth import (
    get_password_hash, verify_password, 
    create_access_token, get_current_user
)
from utils.exceptions import DuplicateError, AuthenticationError

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Rate limiter (uses app.state.limiter)
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    """
    Register a new user account
    
    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address
    - **password**: Password (min 6 characters)
    """
    db = get_database()
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise DuplicateError("Email")
    
    # Check if username already exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise DuplicateError("Username")
    
    # Create user document with email verification token
    import secrets
    verification_token = secrets.token_urlsafe(32)
    
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "created_at": datetime.utcnow(),
        "is_active": True,
        "email_verified": False,
        "verification_token": verification_token
    }
    
    # Insert into database
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Send verification email (don't block on failure)
    try:
        from utils.email import send_verification_email
        await send_verification_email(user_data.email, verification_token, user_data.username)
    except Exception as e:
        logger.warning(f"Failed to send verification email: {e}")
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_id, "email": user_data.email}
    )
    
    # Return token and user info
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            created_at=user_doc["created_at"],
            is_active=True
        )
    )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin):
    """
    Login with email and password
    
    Returns JWT access token and user info
    """
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    
    if not user:
        raise AuthenticationError("Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise AuthenticationError("Invalid email or password")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise AuthenticationError("Account is deactivated")
    
    user_id = str(user["_id"])
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_id, "email": user["email"]}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            username=user["username"],
            email=user["email"],
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user's profile
    
    Requires valid JWT token in Authorization header
    """
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        created_at=current_user["created_at"],
        is_active=current_user.get("is_active", True)
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile (username)
    """
    db = get_database()
    
    update_fields = {}
    
    if update_data.username:
        # Check if username is taken
        existing = await db.users.find_one({
            "username": update_data.username,
            "_id": {"$ne": ObjectId(current_user["id"])}
        })
        if existing:
            raise DuplicateError("Username")
        update_fields["username"] = update_data.username
    
    if update_fields:
        await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_fields}
        )
    
    # Get updated user
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        created_at=user["created_at"],
        is_active=user.get("is_active", True)
    )


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """
    Change current user's password
    
    Requires current password for verification
    """
    db = get_database()
    
    # Get user with hashed password
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    # Verify current password
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise AuthenticationError("Current password is incorrect")
    
    # Check if new password is different
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )
    
    # Update password
    new_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"hashed_password": new_hash}}
    )
    
    return MessageResponse(message="Password changed successfully")


@router.delete("/me", response_model=MessageResponse)
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Permanently delete current user's account and all their data
    """
    db = get_database()
    user_id = ObjectId(current_user["id"])
    
    # Delete all user's detections
    await db.detections.delete_many({"user_id": user_id})
    
    # Delete the user account permanently
    await db.users.delete_one({"_id": user_id})
    
    return MessageResponse(message="Account permanently deleted")


# ============================================
# EMAIL VERIFICATION & PASSWORD RESET
# ============================================

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """
    Request password reset email
    
    Sends a password reset link to the user's email (valid for 1 hour)
    """
    from utils.email import send_password_reset_email
    from datetime import timedelta
    
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": data.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return MessageResponse(message="If the email exists, a reset link has been sent")
    
    # Generate reset token (1 hour expiry)
    reset_token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"], "type": "reset"},
        expires_delta=timedelta(hours=1)
    )
    
    # Send email
    await send_password_reset_email(
        email=user["email"],
        token=reset_token,
        username=user["username"]
    )
    
    return MessageResponse(message="If the email exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest):
    """
    Reset password with token from email
    """
    from jose import jwt, JWTError
    from config.settings import get_settings
    
    settings = get_settings()
    db = get_database()
    
    try:
        # Decode token
        payload = jwt.decode(
            data.token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "reset" or not user_id:
            raise HTTPException(status_code=400, detail="Invalid reset token")
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    new_hash = get_password_hash(data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": new_hash}}
    )
    
    return MessageResponse(message="Password reset successfully! You can now login.")


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("2/minute")
async def resend_verification(request: Request, data: ResendVerificationRequest):
    """
    Resend email verification link
    """
    from utils.email import send_verification_email
    from datetime import timedelta
    
    db = get_database()
    
    user = await db.users.find_one({"email": data.email})
    
    if not user:
        return MessageResponse(message="If the email exists, a verification link has been sent")
    
    if user.get("email_verified", False):
        return MessageResponse(message="Email is already verified")
    
    # Generate verification token (24 hour expiry)
    verify_token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"], "type": "verify"},
        expires_delta=timedelta(hours=24)
    )
    
    await send_verification_email(
        email=user["email"],
        token=verify_token,
        username=user["username"]
    )
    
    return MessageResponse(message="Verification email sent!")


@router.get("/verify-email/{token}", response_model=MessageResponse)
async def verify_email(token: str):
    """
    Verify email address with token from email link
    """
    from jose import jwt, JWTError
    from config.settings import get_settings
    
    settings = get_settings()
    db = get_database()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "verify" or not user_id:
            raise HTTPException(status_code=400, detail="Invalid verification token")
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Mark email as verified
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"email_verified": True, "verified_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Email already verified or user not found")
    
    return MessageResponse(message="Email verified successfully! You can now login.")

