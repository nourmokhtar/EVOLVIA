from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models import User
from app.schemas.user import UserCreate, UserOut, Token
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Signup attempt for email: {user_in.email}")
    
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        logger.warning(f"User already exists for email: {user_in.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )
    
    db_user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"User created successfully for email: {user_in.email}, ID: {db_user.id}")
    return db_user

@router.post("/login", response_model=Token)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Login attempt for email: {credentials.email}")
    
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        logger.warning(f"User not found for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not security.verify_password(credentials.password, user.hashed_password):
        logger.warning(f"Invalid password for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Successful login for email: {credentials.email}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/debug/users")
def debug_list_users(db: Session = Depends(get_db)):
    """Debug endpoint to list all users (remove in production)"""
    users = db.query(User).all()
    return {
        "count": len(users),
        "users": users
    }
