from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.db.supabase import get_quiz_by_lesson, get_questions_by_quiz, get_quiz_by_id
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{lesson_id}", response_model=Dict[str, Any])
async def get_quiz(
    lesson_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get quiz for a specific lesson.
    Requires authentication.
    
    Args:
        lesson_id: ID of the lesson to get quiz for
        current_user: Current authenticated user
    
    Returns:
        Quiz object for the lesson
    """
    try:
        quiz = await get_quiz_by_lesson(lesson_id)
        
        if not quiz:
            logger.warning(f"Quiz not found for lesson ID: {lesson_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found for this lesson"
            )
        
        logger.info(f"✅ Fetched quiz for lesson {lesson_id}")
        return quiz
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching quiz for lesson {lesson_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching quiz"
        )

@router.get("/{quiz_id}/questions", response_model=List[Dict[str, Any]])
async def get_questions(
    quiz_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all questions for a specific quiz.
    Requires authentication.
    
    Args:
        quiz_id: ID of the quiz to get questions for
        current_user: Current authenticated user
    
    Returns:
        List of question objects
    """
    try:
        questions = await get_questions_by_quiz(quiz_id)
        
        if not questions:
            logger.warning(f"No questions found for quiz ID: {quiz_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions found for this quiz"
            )
        
        logger.info(f"✅ Fetched {len(questions)} questions for quiz {quiz_id}")
        return questions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching questions for quiz {quiz_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching questions"
        )

@router.get("/{quiz_id}", response_model=Dict[str, Any])
async def get_quiz_by_id_endpoint(
    quiz_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get quiz details by ID.
    Requires authentication.
    
    Args:
        quiz_id: ID of the quiz to fetch
        current_user: Current authenticated user
    
    Returns:
        Quiz object
    """
    try:
        quiz = await get_quiz_by_id(quiz_id)
        
        if not quiz:
            logger.warning(f"Quiz not found for ID: {quiz_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        logger.info(f"✅ Fetched quiz {quiz_id}")
        return quiz
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching quiz {quiz_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching quiz"
        )

