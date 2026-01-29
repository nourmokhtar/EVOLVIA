"""
Learn session service - state machine for managing learning sessions.

States: IDLE → TEACHING → PAUSED → ANSWERING → RESUMING
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime
from app.schemas.learn import (
    SessionStatus,
    BoardAction,
    SessionMetadata,
    CheckpointEvent,
)


class LearnSession:
    """
    Manages the state of a single learning session.
    
    State transitions:
    - IDLE → TEACHING (start lesson)
    - TEACHING → PAUSED (interrupt)
    - PAUSED → RESUMING (resume)
    - RESUMING → TEACHING (continue teaching)
    - TEACHING/PAUSED → ANSWERING (waiting for student input)
    - ANSWERING → TEACHING (student responds)
    """


    def __init__(
        self,
        session_id: str,
        lesson_id: str,
        user_id: Optional[str] = None,
        initial_difficulty: int = 1,
    ):
        self.session_id = session_id
        self.lesson_id = lesson_id
        self.user_id = user_id
        
        # State tracking
        self.status: SessionStatus = SessionStatus.IDLE
        self.step_id: int = 0
        
        # Learning context
        self.interruption_count: int = 0
        self.difficulty_level: int = initial_difficulty  # 1-5
        


        self.checkpoint_summary: Optional[str] = None
        self.checkpoints: List[CheckpointEvent] = []
        
        # Progression & Exam logic
        self.progress: float = 0.0  # 0.0 to 1.0 (100%)
        self.is_exam_mode: bool = False
        self.exam_question_count: int = 0
        self.exam_results: List[bool] = []
        
        # Conversation History (Last 10 turns)
        self.history: List[dict] = []  # [{"role": "user"|"assistant", "content": "..."}]
        
        # Uploaded course file content
        self.uploaded_file_content: Optional[str] = None
        self.uploaded_file_name: Optional[str] = None
        
        # Metadata for observability
        self.created_at: datetime = datetime.utcnow()
        self.last_activity: datetime = datetime.utcnow()

    @property
    def difficulty_title(self) -> str:
        titles = {
            1: "Beginner",
            2: "Elementary",
            3: "Intermediate",
            4: "Advanced",
            5: "Expert"
        }
        return titles.get(self.difficulty_level, "Unknown")

    def start(self) -> None:
        """Begin teaching session"""
        if self.status not in [SessionStatus.IDLE, SessionStatus.ANSWERING]:
            raise ValueError(f"Cannot start from state {self.status}")
        self.status = SessionStatus.TEACHING
        self.step_id = 0
        self.interruption_count = 0

    def pause(self, reason: str) -> None:
        """Pause session (student interrupted) - can interrupt from any state"""
        # Allow interruption from TEACHING, ANSWERING, or even RESUMING
        # This allows user to interrupt at any time
        if self.status == SessionStatus.PAUSED:
            # Already paused, just update interruption count
            self.interruption_count += 1
        else:
            self.status = SessionStatus.PAUSED
            self.interruption_count += 1
            # Decrease difficulty if repeated interruptions
            if self.interruption_count > 1 and self.difficulty_level > 1:
                self.difficulty_level -= 1

    def handle_quiz_result(self, correct: bool) -> None:
        """
        Handle quiz result.
        Note: specific difficulty adjustment logic has been disabled as per requirements.
        """
        pass

    def set_difficulty(self, level: int) -> None:
        """Manually set difficulty level"""
        if 1 <= level <= 5:
            self.difficulty_level = level



    def resume(self) -> None:
        """Resume teaching after pause"""
        if self.status != SessionStatus.PAUSED:
            raise ValueError(f"Cannot resume from state {self.status}")
        self.status = SessionStatus.RESUMING

    def continue_teaching(self) -> None:
        """Continue teaching after resuming"""
        if self.status not in [SessionStatus.RESUMING, SessionStatus.ANSWERING]:
            raise ValueError(f"Cannot continue from state {self.status}")
        self.status = SessionStatus.TEACHING

    def wait_for_answer(self) -> None:
        """Transition to waiting for student input"""
        # Allow waiting for answer from any state - user can always send a message
        # This allows interrupting and sending new questions at any time
        self.status = SessionStatus.ANSWERING

    def next_step(self) -> None:
        """Advance to next teaching step"""
        self.step_id += 1

    def set_checkpoint(self, summary: str) -> CheckpointEvent:
        """Record a checkpoint for resuming later"""
        self.checkpoint_summary = summary
        event = CheckpointEvent(
            session_id=self.session_id,
            step_id=self.step_id,
            short_summary=summary,
        )
        self.checkpoints.append(event)
        return event

    def get_metadata(self) -> SessionMetadata:
        """Get current session metadata (for tracing/eval)"""
        return SessionMetadata(
            session_id=self.session_id,
            step_id=self.step_id,
            interruption_count=self.interruption_count,
            difficulty_level=self.difficulty_level,
            user_id=self.user_id,
            lesson_id=self.lesson_id,
            checkpoint_summary=self.checkpoint_summary,
        )

    def add_history(self, role: str, content: str) -> None:
        """Add a message to history, keeping only last 10 items"""
        self.history.append({"role": role, "content": content})
        if len(self.history) > 10:
            self.history.pop(0)

    def update_activity(self) -> None:
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()


class LearnSessionManager:
    """
    Manages all active sessions.
    
    In production, sessions would be backed by Redis or a DB.
    For now, in-memory for development.
    """

    def __init__(self):
        self.sessions: dict[str, LearnSession] = {}

    def create_session(
        self,
        session_id: str,
        lesson_id: str,
        user_id: Optional[str] = None,
    ) -> LearnSession:
        """Create a new session"""
        if session_id in self.sessions:
            raise ValueError(f"Session {session_id} already exists")
        session = LearnSession(session_id, lesson_id, user_id)
        session.start()
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[LearnSession]:
        """Retrieve active session"""
        return self.sessions.get(session_id)

    def close_session(self, session_id: str) -> None:
        """Close and remove session"""
        if session_id in self.sessions:
            del self.sessions[session_id]

    def session_exists(self, session_id: str) -> bool:
        """Check if session is active"""
        return session_id in self.sessions
