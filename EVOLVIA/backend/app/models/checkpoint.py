from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text, ForeignKey


class Checkpoint(SQLModel, table=True):
    """
    Lesson checkpoint - key learning milestone that student should master.
    
    A lesson can have multiple checkpoints. Checkpoints are validated via quizzes.
    Tracks student's understanding progression through the lesson.
    """
    __tablename__ = "checkpoints"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    lesson_id: str = Field(foreign_key="lessons.id", index=True)
    title: str = Field(max_length=255)
    description: Optional[str] = None
    content: str = Field(sa_column=Column(Text))
    order: int = Field(default=0)  # Position within lesson
    difficulty_level: int = Field(default=1, ge=1, le=5)  # 1-5
    
    # Learning requirements
    key_concepts: str = Field(default="", sa_column=Column(Text))  # JSON list of concepts
    estimated_time_mins: int = Field(default=15)
    
    # Validation via quiz
    quiz_id: Optional[str] = Field(foreign_key="quizzes.id", default=None)
    mastery_threshold: float = Field(default=0.8, ge=0.0, le=1.0)  # 80% required
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SessionCheckpoint(SQLModel, table=True):
    """
    Session-checkpoint mapping - tracks student's progress through lesson checkpoints.
    
    Records when student reaches, completes, or validates each checkpoint.
    Enables resuming interrupted lessons from last checkpoint.
    """
    __tablename__ = "session_checkpoints"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    session_id: str = Field(index=True)  # Links to LearnSession (no FK - session is ephemeral)
    checkpoint_id: str = Field(foreign_key="checkpoints.id", index=True)
    
    # Tracking
    status: str = Field(default="in_progress")  # in_progress, completed, validated, skipped
    
    # Metrics
    attempts: int = Field(default=0)
    successes: int = Field(default=0)
    failures: int = Field(default=0)
    interruption_count: int = Field(default=0)
    
    # Performance
    accuracy_score: Optional[float] = Field(default=None)  # 0.0-1.0
    time_spent_seconds: int = Field(default=0)
    
    # AI Teaching Context
    teacher_prompts_count: int = Field(default=0)
    last_teacher_response: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)
    validated_at: Optional[datetime] = Field(default=None)
    
    # Resumption support
    checkpoint_metadata: str = Field(default="{}", sa_column=Column(Text))  # JSON context for resuming
