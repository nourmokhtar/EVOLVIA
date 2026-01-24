from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

import os
from dotenv import load_dotenv
load_dotenv()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

ALGORITHM = os.getenv("ALGORITHM")

MAX_PASSWORD_LENGTH = os.getenv("MAX_PASSWORD_LENGTH")

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _truncate_password(password: str, max_bytes: int = MAX_PASSWORD_LENGTH) -> str:
    """
    Truncate password to max_bytes in UTF-8 encoding.
    Handles multi-byte UTF-8 characters safely.
    """
    encoded = password.encode('utf-8')[:max_bytes]
    
    # Handle incomplete multi-byte UTF-8 sequences
    while encoded:
        try:
            return encoded.decode('utf-8')
        except UnicodeDecodeError:
            # Remove last byte if it forms an incomplete sequence
            encoded = encoded[:-1]
    
    return ""

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password to MAX_PASSWORD_LENGTH bytes in UTF-8 encoding before verification
    truncated_password = _truncate_password(plain_password)
    return pwd_context.verify(truncated_password, hashed_password)

def get_password_hash(password: str) -> str:
    # Truncate password to MAX_PASSWORD_LENGTH bytes in UTF-8 encoding before hashing
    # This is necessary because bcrypt has a 72-byte limit
    truncated_password = _truncate_password(password)
    return pwd_context.hash(truncated_password)

def get_current_user(
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get the current authenticated user from JWT token"""
    from app.models import User
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
