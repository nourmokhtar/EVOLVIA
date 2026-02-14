from datetime import datetime, timedelta
from typing import Any, Union, Optional, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Request
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode JWT token and return payload"""
    try:
        if not token:
            logger.error("Token is empty or None")
            return None
            
        token = token.strip()
        
        # Remove "Bearer " prefix if present
        if token.startswith("Bearer "):
            token = token[7:]
        
        # Check segments
        segments = token.split('.')
        if len(segments) != 3:
            logger.error(f"Invalid JWT format: expected 3 segments, got {len(segments)}")
            return None
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"✅ Token successfully decoded for user: {payload.get('sub')}")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.error("❌ Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"❌ Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Token decode error: {e}")
        return None
# def decode_token(token: str) -> Optional[Dict[str, Any]]:
#     """Decode JWT token and return payload"""
#     try:
#         payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
#         return payload
#     except JWTError as e:
#         logger.error(f"Token decode error: {e}")
#         return None
async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Extract and validate the current user from JWT token in Authorization header.
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Parse "Bearer <token>"
    try:
        parts = auth_header.strip().split()
        
        if len(parts) != 2:
            logger.error(f"❌ Expected 2 parts (Bearer + token), got {len(parts)}")
            raise ValueError(f"Expected 2 parts, got {len(parts)}")
        
        scheme, token = parts
        
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
            
    except (ValueError, IndexError) as e:
        logger.error(f"❌ Header parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization header format: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode token
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    from app.db.supabase import get_user_by_id
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user["id"] = user_id
    logger.info(f"✅ User authenticated: {user_id}")
    return user