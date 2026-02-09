from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.supabase import get_quiz_by_lesson, get_questions_by_quiz
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{lesson_id}")
async def get_quiz(
    lesson_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get quiz for a specific lesson"""
    quiz = await get_quiz_by_lesson(lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found for this lesson")
    return quiz

@router.get("/{quiz_id}/questions")
async def get_questions(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get questions for a specific quiz"""
    questions = await get_questions_by_quiz(quiz_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this quiz")
    return questions
