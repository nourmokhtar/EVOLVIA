from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text

class Lesson(SQLModel, table=True):
    __tablename__ = "lessons"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    title: str = Field(max_length=255)
    description: Optional[str] = None
    content: str = Field(sa_column=Column(Text))
    skill_type: str = Field(default="hard", max_length=50) # hard/soft
    difficulty: str = Field(default="beginner", max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)
