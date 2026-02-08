from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models import Lesson
from app.models import User
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Lesson])
async def get_lessons(current_user: User = Depends(get_current_user)):
    """Get all available lessons"""
    # Placeholder: In a real app, fetch from DB
    return [
        Lesson(
            id="1",
            title="Introduction to Soft Skills",
            description="Learn the basics of communication and empathy.",
            content="Lesson content goes here...",
            skill_type="soft",
            difficulty="beginner"
        ),
        Lesson(
            id="2",
            title="Python Fundamentals",
            description="Master the core concepts of Python programming.",
            content="Python is a powerful language...",
            skill_type="hard",
            difficulty="beginner"
        )
    ]

@router.get("/{lesson_id}", response_model=Lesson)
async def get_lesson(lesson_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific lesson by ID"""
    return Lesson(
        id=lesson_id,
        title="Sample Lesson",
        content="Detailed content for lesson " + lesson_id,
        skill_type="hard"
    )
