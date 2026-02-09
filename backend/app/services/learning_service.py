from typing import List, Optional
from app.db.supabase import (
    get_all_lessons,
    query_table,
    create_progress,
    update_progress
)
import logging

logger = logging.getLogger(__name__)

class LearningService:
    """
    Central service for handling educational content and progress tracking.
    Uses Supabase for all database operations.
    """
    async def get_lessons(self, skill_type: Optional[str] = None) -> List[dict]:
        """Fetch lessons, optionally filtered by skill type (hard/soft)."""
        return await get_all_lessons(skill_type)

    async def get_user_progress(self, user_id: str) -> List[dict]:
        """Retrieve all completed modules for a specific user."""
        return await query_table("user_progress", {"user_id": user_id})

    async def track_progress(self, user_id: str, content_id: str, content_type: str, score: Optional[float] = None):
        """Mark a lesson or quiz as completed and store the performance score."""
        from uuid import uuid4
        from datetime import datetime
        
        progress_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "content_id": content_id,
            "content_type": content_type,
            "score": score,
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
        }
        return await create_progress(progress_data)

learning_service = LearningService()

