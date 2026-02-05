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
from sqlmodel import SQLModel


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
        language: str = "en",
    ):
        self.session_id = session_id
        self.lesson_id = lesson_id
        self.user_id = user_id
        self.language = language
        
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

    @property
    def title(self) -> str:
        """Generate a display title for the session"""
        if self.checkpoint_summary:
            return self.checkpoint_summary
        
        # Try to find first user message to use as title
        for msg in self.history:
            if msg.get("role") == "user":
                content = msg.get("content", "").strip()
                if content:
                    return (content[:40] + "...") if len(content) > 40 else content
        
        return f"Session {self.session_id[:8]}"

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
        if len(self.history) > 100: # Increase history limit if we store in DB
             self.history.pop(0)
        # We need a way to notify manager to save. 
        # Ideally LearnSession shouldn't know about manager.
        # But for now, let's assume the caller (API) will handle saving, OR we inject a callback.
        # Actually, simpler: The API endpoint calls "add_history", so the API endpoint should trigger save.

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
        # Ensure tables exist (dev mode convenience)
        from app.db.session import engine
        from app.models.learning_session import LearningSessionModel
        SQLModel.metadata.create_all(engine)
        
        # Load active sessions from DB? Or just lazy load?
        # Let's lazy load in get_session
        pass

    def create_session(
        self,
        session_id: str,
        lesson_id: str,
        user_id: Optional[str] = None,
        initial_difficulty: int = 1,
        language: str = "en",
    ) -> LearnSession:
        """Create a new session and persist it"""
        if session_id in self.sessions:
            raise ValueError(f"Session {session_id} already exists")
            
        session = LearnSession(session_id, lesson_id, user_id, initial_difficulty, language)
        session.start()
        self.sessions[session_id] = session
        
        self._save_session(session)
        return session

    def get_session(self, session_id: str) -> Optional[LearnSession]:
        """Retrieve active session, restoring from DB if needed"""
        if session_id in self.sessions:
            return self.sessions[session_id]
        
        # Try to load from DB
        from app.db.session import SessionLocal
        from app.models.learning_session import LearningSessionModel
        
        with SessionLocal() as db:
            logger.info(f"Looking up session {session_id} in database...")
            db_model = db.get(LearningSessionModel, session_id)
            if db_model:
                logger.info(f"Found session {session_id} in DB. Restoring...")
                # Reconstruct LearnSession from DB model
                session = LearnSession(
                    session_id=db_model.session_id,
                    lesson_id=db_model.lesson_id,
                    user_id=db_model.user_id,
                    initial_difficulty=db_model.difficulty_level,
                    language=db_model.language or "en"
                )
                # Restore state
                session.status = SessionStatus(db_model.status) if db_model.status in SessionStatus._value2member_map_ else SessionStatus.IDLE
                session.history = db_model.history
                session.checkpoints = db_model.checkpoints # Note: this needs proper casting if checkpoints are complex objects
                session.checkpoint_summary = db_model.checkpoint_summary
                
                # Cache in memory
                self.sessions[session_id] = session
                return session
                
        return None

    def _save_session(self, session: LearnSession):
        """Persist session state to DB"""
        from app.db.session import SessionLocal
        from app.models.learning_session import LearningSessionModel
        
        with SessionLocal() as db:
            db_model = db.get(LearningSessionModel, session.session_id)
            if not db_model:
                db_model = LearningSessionModel(
                    session_id=session.session_id,
                    lesson_id=session.lesson_id,
                    user_id=session.user_id
                )
            
            # Update fields
            db_model.status = session.status.value
            db_model.difficulty_level = session.difficulty_level
            db_model.language = session.language
            db_model.history = session.history
            # db_model.checkpoints = session.checkpoints # serialization might be tricky if not plain dicts
            db_model.checkpoint_summary = session.checkpoint_summary
            db_model.last_activity = datetime.utcnow()
            
            db.add(db_model)
            db.commit()

    def update_session(self, session: LearnSession):
        """Detailed save wrapper to be called after mutations"""
        self._save_session(session)

    def list_sessions(self) -> List[LearnSession]:
        """List all sessions from DB"""
        # First ensure in-memory ones are saved (optional, usually they are saved on change)
        
        from app.db.session import SessionLocal
        from app.models.learning_session import LearningSessionModel
        
        sessions_list = []
        with SessionLocal() as db:
            models = db.query(LearningSessionModel).order_by(LearningSessionModel.last_activity.desc()).all()
            for m in models:
                # We return lightweight objects or just the properties needed?
                # The API expects LearnSession objects or dicts. 
                # Let's reconstruct minimal LearnSession objects
                s = LearnSession(m.session_id, m.lesson_id, m.user_id, m.difficulty_level, m.language)
                s.history = m.history
                s.checkpoint_summary = m.checkpoint_summary
                s.created_at = m.created_at
                sessions_list.append(s)
        
        return sessions_list

    def close_session(self, session_id: str) -> None:
        """Close and remove session from memory (persists in DB)"""
        if session_id in self.sessions:
            # self._save_session(self.sessions[session_id]) # Save one last time
            del self.sessions[session_id]

    def delete_session(self, session_id: str) -> bool:
        """Delete session from DB and memory"""
        # Remove from memory first
        if session_id in self.sessions:
            del self.sessions[session_id]
            
        # Delete from DB
        from app.db.session import SessionLocal
        from app.models.learning_session import LearningSessionModel
        
        with SessionLocal() as db:
            db_model = db.get(LearningSessionModel, session_id)
            if db_model:
                db.delete(db_model)
                db.commit()
                return True
        return False

    def session_exists(self, session_id: str) -> bool:
        """Check if session is active or in DB"""
        if session_id in self.sessions:
            return True
        exists = self.get_session(session_id) is not None
        if not exists:
            logger.warning(f"Session check: {session_id} DOES NOT EXIST in memory or DB")
        return exists
