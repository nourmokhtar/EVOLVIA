"""
Learn domain schemas - event contract for session management.

This defines the canonical shapes for all frontend/backend events in a learning session.
Events flow bidirectionally: frontend sends commands, backend streams responses.
"""

from __future__ import annotations

from typing import Optional, List, Literal, Any, Union
from pydantic import BaseModel, Field
from enum import Enum
from uuid import UUID


# ============================================================================
# Enums for event types and status
# ============================================================================

class InboundEventType(str, Enum):
    """Frontend → Backend event types"""
    START_LESSON = "START_LESSON"
    USER_MESSAGE = "USER_MESSAGE"
    INTERRUPT = "INTERRUPT"
    RESUME = "RESUME"
    CHANGE_DIFFICULTY = "CHANGE_DIFFICULTY"


class OutboundEventType(str, Enum):
    """Backend → Frontend event types"""
    STATUS = "STATUS"
    TEACHER_TEXT_DELTA = "TEACHER_TEXT_DELTA"
    TEACHER_TEXT_FINAL = "TEACHER_TEXT_FINAL"
    BOARD_ACTION = "BOARD_ACTION"
    CHECKPOINT = "CHECKPOINT"
    ERROR = "ERROR"


class SessionStatus(str, Enum):
    """Session state machine"""
    TEACHING = "TEACHING"        # Teacher is generating response
    PAUSED = "PAUSED"           # Session paused (user interrupted)
    ANSWERING = "ANSWERING"     # Waiting for user input
    RESUMING = "RESUMING"       # Resuming from checkpoint
    IDLE = "IDLE"               # No active session


class InterruptReason(str, Enum):
    """Reasons for interrupting teacher"""
    MA_FHEMTCH = "MA_FHEMTCH"   # I don't understand (Hebrew: "I don't get it")
    QUESTION = "QUESTION"        # Student has a question


class BoardActionKind(str, Enum):
    """Types of board actions the teacher can perform"""
    WRITE_BULLET = "WRITE_BULLET"
    WRITE_TITLE = "WRITE_TITLE"
    WRITE_STEP = "WRITE_STEP"
    CLEAR = "CLEAR"
    HIGHLIGHT = "HIGHLIGHT"
    DRAW_DIAGRAM = "DRAW_DIAGRAM"
    SHOW_IMAGE = "SHOW_IMAGE"
    SHOW_QUIZ = "SHOW_QUIZ"
    SHOW_REWARD = "SHOW_REWARD"


# ============================================================================
# Frontend → Backend Inbound Events
# ============================================================================

class InboundEventBase(BaseModel):
    """Base schema for all inbound events"""
    type: InboundEventType


class StartLessonEvent(InboundEventBase):
    """Start a new learning session"""
    type: Literal[InboundEventType.START_LESSON] = InboundEventType.START_LESSON
    lesson_id: str
    user_id: Optional[str] = None
    initial_difficulty: Optional[int] = Field(default=1, ge=1, le=5, description="Starting difficulty level (1-5)")


class UserMessageEvent(InboundEventBase):
    """Student asks a question or responds"""
    type: Literal[InboundEventType.USER_MESSAGE] = InboundEventType.USER_MESSAGE
    session_id: str
    text: str
    step_id: Optional[int] = None


class InterruptEvent(InboundEventBase):
    """Student interrupts teacher (e.g., "I don't understand" or "I have a question")"""
    type: Literal[InboundEventType.INTERRUPT] = InboundEventType.INTERRUPT
    session_id: str
    reason: Optional[InterruptReason] = None  # Optional, defaults to None for manual pauses
    text: Optional[str] = None          # Student explanation (optional)
    step_id: Optional[int] = None



class ChangeDifficultyEvent(InboundEventBase):
    """Manually change the difficulty level"""
    type: Literal[InboundEventType.CHANGE_DIFFICULTY] = InboundEventType.CHANGE_DIFFICULTY
    session_id: str
    level: int  # 1-5


class ResumeEvent(InboundEventBase):
    """Resume teaching after interrupt/pause"""
    type: Literal[InboundEventType.RESUME] = InboundEventType.RESUME
    session_id: str
    step_id: int


# Union type for all inbound events
InboundEvent = Union[StartLessonEvent, UserMessageEvent, InterruptEvent, ResumeEvent, ChangeDifficultyEvent]


# ============================================================================
# Backend → Frontend Outbound Events
# ============================================================================

class OutboundEventBase(BaseModel):
    """Base schema for all outbound events"""
    type: OutboundEventType
    session_id: str


class StatusEvent(OutboundEventBase):
    """Notify frontend of session state change"""
    type: Literal[OutboundEventType.STATUS] = OutboundEventType.STATUS
    status: SessionStatus
    difficulty_level: Optional[int] = 1
    difficulty_title: Optional[str] = "Beginner"
    progress: float = 0.0 # 0.0 to 1.0


class TeacherTextDeltaEvent(OutboundEventBase):
    """Streaming chunk of teacher speech (for live display)"""
    type: Literal[OutboundEventType.TEACHER_TEXT_DELTA] = OutboundEventType.TEACHER_TEXT_DELTA
    delta: str


class TeacherTextFinalEvent(OutboundEventBase):
    """Complete teacher response (for TTS or replay)"""
    type: Literal[OutboundEventType.TEACHER_TEXT_FINAL] = OutboundEventType.TEACHER_TEXT_FINAL
    text: str
    board_actions: List["BoardAction"] = Field(default_factory=list)


class BoardAction(BaseModel):
    """A single action the teacher performs on the board"""
    kind: BoardActionKind
    payload: dict = Field(
        default_factory=dict,
        description="Action-specific data (e.g., {text: '...', position: 1})"
    )


class BoardActionEvent(OutboundEventBase):
    """Teacher writes on board (live during response)"""
    type: Literal[OutboundEventType.BOARD_ACTION] = OutboundEventType.BOARD_ACTION
    action: BoardAction


class CheckpointEvent(OutboundEventBase):
    """Checkpoint: summary of what was covered (for resume later)"""
    type: Literal[OutboundEventType.CHECKPOINT] = OutboundEventType.CHECKPOINT
    step_id: int
    short_summary: str


class ErrorEvent(OutboundEventBase):
    """Error occurred during session"""
    type: Literal[OutboundEventType.ERROR] = OutboundEventType.ERROR
    error_code: str
    message: str


# Union type for all outbound events
OutboundEvent = Union[
    StatusEvent,
    TeacherTextDeltaEvent,
    TeacherTextFinalEvent,
    BoardActionEvent,
    CheckpointEvent,
    ErrorEvent
]


# ============================================================================
# Session Context & Metadata (for internal tracking)
# ============================================================================

class SessionMetadata(BaseModel):
    """Metadata about a learn session - used by observability layer"""
    session_id: str
    step_id: int
    interruption_count: int = 0
    difficulty_level: int = 1  # 1-5 scale, drops on repeated "ma fhemtch"
    user_id: Optional[str] = None
    lesson_id: Optional[str] = None
    checkpoint_summary: Optional[str] = None


class TeacherTurn(BaseModel):
    """Represents one turn: student input → teacher response (for tracing)"""
    session_id: str
    step_id: int
    # Input
    prompt_input: str  # The prompt sent to LLM
    lesson_context: str  # Lesson material
    student_input: str  # What student said/asked
    last_checkpoint: Optional[str] = None
    # Output
    speech_text: str  # Teacher response (for TTS)
    board_actions: List[BoardAction] = Field(default_factory=list)
    # Metadata
    model_name: str = "llama-2"
    llm_config: dict = Field(default_factory=dict)
    interruption_count: int = 0
    difficulty_level: int = 1
