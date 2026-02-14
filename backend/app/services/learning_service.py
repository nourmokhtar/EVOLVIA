from typing import List, Optional
# from app.models import Lesson, Quiz, Question, UserProgress
from sqlalchemy.orm import Session

from app.db.supabase import get_supabase, query_table, insert_table, update_table, delete_record
import logging
from datetime import datetime
from uuid import uuid4

class LearningService:
    """
    Central service for handling educational content and progress tracking.
    Uses Supabase for all database operations.
    Teammates: Use this to interact with Lessons and Quizzes rather than querying the DB directly.
    """
    async def get_lessons(self, skill_type: Optional[str] = None) -> List[dict]:
        """Fetch lessons, optionally filtered by skill type (hard/soft)."""
        query = {"skill_type": skill_type} if skill_type else {}
        return await query_table("lessons", query)

    async def get_user_progress(self, user_id: str) -> List[dict]:
        """Retrieve all completed modules for a specific user."""
        return await query_table("user_progress", {"user_id": user_id})

    async def track_progress(self, user_id: str, content_id: str, content_type: str, score: Optional[float] = None) -> dict:
        """Mark a lesson or quiz as completed and store the performance score."""
        progress_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "content_id": content_id,
            "content_type": content_type,
            "score": score,
            "created_at": datetime.utcnow().isoformat(),
        }
        return await insert_table("user_progress", progress_data)


# class LearningService:
#     """
#     Central service for handling educational content and progress tracking.
#     Teammates: Use this to interact with Lessons and Quizzes rather than querying the DB directly.
#     """
#     async def get_lessons(self, db: Session, skill_type: Optional[str] = None) -> List[Lesson]:
#         """Fetch lessons, optionally filtered by skill type (hard/soft)."""
#         query = db.query(Lesson)
#         if skill_type:
#             query = query.filter(Lesson.skill_type == skill_type)
#         return query.all()

#     async def get_user_progress(self, db: Session, user_id: str) -> List[UserProgress]:
#         """Retrieve all completed modules for a specific user."""
#         return db.query(UserProgress).filter(UserProgress.user_id == user_id).all()

#     async def track_progress(self, db: Session, user_id: str, content_id: str, content_type: str, score: Optional[float] = None):
#         """Mark a lesson or quiz as completed and store the performance score."""
#         progress = UserProgress(
#             user_id=user_id,
#             content_id=content_id,
#             content_type=content_type,
#             score=score,
#             status="completed"
#         )
#         db.add(progress)
#         db.commit()
#         db.refresh(progress)
#         return progress

learning_service = LearningService()
