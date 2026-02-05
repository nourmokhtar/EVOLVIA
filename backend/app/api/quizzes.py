from fastapi import APIRouter, Depends
from typing import List
from app.models import Quiz, Question, User
from app.core.security import get_current_user

router = APIRouter()

@router.get("/{lesson_id}", response_model=Quiz)
async def get_quiz(lesson_id: str, current_user: User = Depends(get_current_user)):
    """Get quiz for a specific lesson"""
    return Quiz(
        id="q1",
        lesson_id=lesson_id,
        title="Check your understanding"
    )

@router.get("/{quiz_id}/questions", response_model=List[Question])
async def get_questions(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Get questions for a specific quiz"""
    return [
        Question(
            id="1",
            quiz_id=quiz_id,
            text="What is the key to effective communication?",
            options={"A": "Speaking fast", "B": "Active listening", "C": "Using big words"},
            correct_option="B"
        )
    ]
