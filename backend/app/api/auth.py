from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.core import security
from app.core.config import settings
from app.schemas.user import UserCreate, UserOut, Token
from app.db.supabase import get_supabase, get_user_by_email, create_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/signup", response_model=UserOut)
async def signup(user_in: UserCreate):
    """
    Register a new user.
    
    Args:
        user_in: User registration data (email, password, full_name)
    
    Returns:
        Created user object
    """
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists in the system",
            )
        
        # Hash password
        hashed_password = security.get_password_hash(user_in.password)
        
        # Create new user in database
        new_user = await create_user({
            "email": user_in.email,
            "hashed_password": hashed_password,
            "full_name": user_in.full_name,
        })
        
        if not new_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user",
            )
        
        logger.info(f"✅ User registered successfully: {user_in.email}")
        
        return UserOut(
            id=str(new_user.get("id")),
            email=new_user.get("email"),
            full_name=new_user.get("full_name"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration",
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login user and return JWT access token.
    
    Args:
        form_data: OAuth2 form data (username=email, password)
    
    Returns:
        Token object with access_token and token_type
    """
    try:
        # Fetch user by email (username field contains email)
        user = await get_user_by_email(form_data.username)
        
        # Validate user exists and password is correct
        if not user or not security.verify_password(form_data.password, user.get("hashed_password", "")):
            logger.warning(f"⚠️ Failed login attempt for email: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            subject=str(user.get("id")), 
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ User logged in successfully: {form_data.username}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login",
        )
