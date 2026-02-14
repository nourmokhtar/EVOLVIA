from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.db.supabase import get_all_lessons, get_lesson_by_id
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_lessons(
    skill_type: str = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all lessons, optionally filtered by skill type.
    Requires authentication.
    
    Args:
        skill_type: Optional filter by skill type (e.g., 'soft', 'hard')
        current_user: Current authenticated user
    
    Returns:
        List of lesson objects
    """
    try:
        lessons = await get_all_lessons(skill_type=skill_type)
        logger.info(f"✅ Fetched {len(lessons)} lessons for user {current_user.get('id')}")
        return lessons
    except Exception as e:
        logger.error(f"❌ Error fetching lessons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching lessons"
        )

@router.get("/{lesson_id}", response_model=Dict[str, Any])
async def get_lesson(
    lesson_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific lesson by ID.
    Requires authentication.
    
    Args:
        lesson_id: ID of the lesson to fetch
        current_user: Current authenticated user
    
    Returns:
        Lesson object
    """
    try:
        lesson = await get_lesson_by_id(lesson_id)
        
        if not lesson:
            logger.warning(f"Lesson not found for ID: {lesson_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found"
            )
        
        logger.info(f"✅ Fetched lesson {lesson_id} for user {current_user.get('id')}")
        return lesson
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching lesson {lesson_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching lesson"
        )
