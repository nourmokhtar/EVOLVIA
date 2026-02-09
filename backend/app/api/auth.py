from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import timedelta
from app.core import security
from app.core.config import settings
from app.db.supabase import get_user_by_email, create_user, get_supabase
from app.schemas.user import UserCreate, UserOut, Token
import logging
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup", response_model=UserOut)
async def signup(user_in: UserCreate):
    """Register a new user"""
    logger.info(f"Signup attempt for email: {user_in.email}")
    
    # Check if user already exists
    existing_user = await get_user_by_email(user_in.email)
    if existing_user:
        logger.warning(f"User already exists for email: {user_in.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )
    
    # Create new user
    from datetime import datetime
    user_data = {
        "id": str(uuid4()),
        "email": user_in.email,
        "hashed_password": security.get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "personality_profile": {},
        "learning_goals": [],
        "streak": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    db_user = await create_user(user_data)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )
    
    logger.info(f"User created successfully for email: {user_in.email}, ID: {db_user['id']}")
    return db_user

@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest):
    """Login with email and password"""
    logger.info(f"Login attempt for email: {credentials.email}")
    
    user = await get_user_by_email(credentials.email)
    if not user:
        logger.warning(f"User not found for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not security.verify_password(credentials.password, user.get("hashed_password", "")):
        logger.warning(f"Invalid password for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Successful login for email: {credentials.email}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user["id"], expires_delta=access_token_expires
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
    }

@router.get("/debug/users")
async def debug_list_users():
    """Debug endpoint to list all users (remove in production)"""
    try:
        response = get_supabase().table("users").select("*").execute()
        users = response.data if response.data else []
        return {
            "count": len(users),
            "users": users
        }
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return {"count": 0, "users": []}
