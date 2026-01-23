from fastapi import APIRouter
from typing import List
from app.models import Quiz, Question

router = APIRouter()

@router.get("/{lesson_id}", response_model=Quiz)
async def get_quiz(lesson_id: str):
    return Quiz(
        id="q1",
        lesson_id=lesson_id,
        title="Check your understanding"
    )

@router.get("/{quiz_id}/questions", response_model=List[Question])
async def get_questions(quiz_id: str):
    return [
        Question(
            id="1",
            quiz_id=quiz_id,
            text="What is the key to effective communication?",
            options={"A": "Speaking fast", "B": "Active listening", "C": "Using big words"},
            correct_option="B"
        )
    ]
