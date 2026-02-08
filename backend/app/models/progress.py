from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel

class UserProgress(SQLModel, table=True):
    __tablename__ = "user_progress"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    content_id: str = Field(index=True) # lesson or quiz id
    content_type: str = Field(max_length=20) # 'lesson', 'quiz'
    status: str = Field(default="completed", max_length=20)
    score: Optional[float] = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)
