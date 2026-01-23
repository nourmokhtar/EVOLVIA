from datetime import datetime
from typing import Optional, Dict, List
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, JSON

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    personality_profile: Dict = Field(default={}, sa_column=Column(JSON))
    learning_goals: List[str] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
