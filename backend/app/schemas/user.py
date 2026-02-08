from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password length. Bcrypt has a 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            # Truncate to 72 bytes and warn user
            return v[:72]
        if len(v) < 4:
            raise ValueError('Password must be at least 4 characters long')
        return v

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
