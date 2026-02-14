"""
Pydantic schemas for checkpoint requests/responses
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class CheckpointCreate(BaseModel):
    """Create a checkpoint within a lesson"""
    lesson_id: str
    title: str
    description: Optional[str] = None
    content: str
    order: int = 0
    difficulty_level: int = Field(default=1, ge=1, le=5)
    key_concepts: str = ""
    estimated_time_mins: int = 15
    quiz_id: Optional[str] = None
    mastery_threshold: float = 0.8


class CheckpointUpdate(BaseModel):
    """Update checkpoint details"""
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    estimated_time_mins: Optional[int] = None
    mastery_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class CheckpointResponse(BaseModel):
    """Checkpoint response model"""
    id: str
    lesson_id: str
    title: str
    description: Optional[str]
    content: str
    order: int
    difficulty_level: int
    key_concepts: str
    estimated_time_mins: int
    quiz_id: Optional[str]
    mastery_threshold: float
    created_at: datetime
    updated_at: datetime


class SessionCheckpointUpdate(BaseModel):
    """Update session checkpoint progress"""
    status: Optional[str] = None  # in_progress, completed, validated, skipped
    accuracy_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    teacher_response: Optional[str] = None
    checkpoint_metadata: Optional[str] = None


class SessionCheckpointResponse(BaseModel):
    """Session checkpoint response"""
    id: str
    session_id: str
    checkpoint_id: str
    status: str
    attempts: int
    successes: int
    failures: int
    interruption_count: int
    accuracy_score: Optional[float]
    time_spent_seconds: int
    teacher_prompts_count: int
    started_at: datetime
    completed_at: Optional[datetime]
    validated_at: Optional[datetime]


class LessonWithCheckpoints(BaseModel):
    """Lesson with all its checkpoints"""
    id: str
    title: str
    description: Optional[str]
    skill_type: str
    difficulty: str
    created_at: datetime
    checkpoints: List[CheckpointResponse] = []
