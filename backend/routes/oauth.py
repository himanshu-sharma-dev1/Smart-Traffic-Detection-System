"""
Google OAuth2 Routes for Social Login
Allows users to sign in with their Google account
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from starlette.config import Config
from datetime import datetime
import os

from config.database import get_database
from utils.auth import create_access_token
from models.schemas import Token, UserResponse

router = APIRouter(prefix="/auth", tags=["OAuth2"])

# OAuth configuration
config = Config('.env')
oauth = OAuth(config)

# Register Google OAuth provider
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    client_kwargs={
        'scope': 'openid email profile'
    }
)


@router.get("/google")
async def google_login(request: Request):
    """
    Initiate Google OAuth2 login flow
    
    Redirects user to Google's login page
    """
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback')
    
    # Check if OAuth is configured
    if not os.getenv('GOOGLE_CLIENT_ID') or os.getenv('GOOGLE_CLIENT_ID') == 'your-google-client-id.apps.googleusercontent.com':
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
        )
    
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request):
    """
    Handle Google OAuth2 callback
    
    - Receives authorization code from Google
    - Exchanges for access token
    - Gets user info
    - Creates or finds user in database
    - Returns JWT token
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error.error}")
    
    # Get user info from Google
    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")
    
    google_id = user_info.get('sub')
    email = user_info.get('email')
    name = user_info.get('name', email.split('@')[0])
    picture = user_info.get('picture')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    db = get_database()
    
    # Check if user exists by Google ID or email
    existing_user = await db.users.find_one({
        "$or": [
            {"google_id": google_id},
            {"email": email}
        ]
    })
    
    if existing_user:
        # Update Google ID if logging in with email for first time
        if not existing_user.get("google_id"):
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "google_id": google_id,
                        "profile_picture": picture
                    }
                }
            )
        
        user_id = str(existing_user["_id"])
        username = existing_user["username"]
    else:
        # Create new user
        user_doc = {
            "username": name,
            "email": email,
            "google_id": google_id,
            "profile_picture": picture,
            "hashed_password": None,  # No password for OAuth users
            "created_at": datetime.utcnow(),
            "is_active": True,
            "email_verified": True,  # Google emails are verified
            "auth_provider": "google"
        }
        
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        username = name
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": user_id, "email": email}
    )
    
    # Redirect to frontend with token
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    redirect_url = f"{frontend_url}/oauth/callback?token={access_token}&user={username}"
    
    return RedirectResponse(url=redirect_url)


@router.get("/google/status")
async def google_oauth_status():
    """
    Check if Google OAuth is configured
    """
    client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    is_configured = bool(client_id and client_id != 'your-google-client-id.apps.googleusercontent.com')
    
    return {
        "provider": "google",
        "configured": is_configured,
        "login_url": "/api/auth/google" if is_configured else None
    }
