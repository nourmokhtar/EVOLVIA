from datetime import datetime
from typing import Optional, Dict
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, JSON
from sqlalchemy import Text

class Quiz(SQLModel, table=True):
    __tablename__ = "quizzes"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    lesson_id: str = Field(foreign_key="lessons.id")
    title: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Question(SQLModel, table=True):
    __tablename__ = "questions"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    quiz_id: str = Field(foreign_key="quizzes.id")
    text: str = Field(sa_column=Column(Text))
    options: Dict = Field(default={}, sa_column=Column(JSON)) # { "A": "...", "B": "..." }
    correct_option: str = Field(max_length=1)
    explanation: Optional[str] = None
