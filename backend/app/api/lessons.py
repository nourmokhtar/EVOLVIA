from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.supabase import get_all_lessons, get_lesson_by_id
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_lessons(current_user: dict = Depends(get_current_user)):
    """Get all available lessons"""
    lessons = await get_all_lessons()
    return lessons if lessons else []

@router.get("/{lesson_id}")
async def get_lesson(lesson_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific lesson by ID"""
    lesson = await get_lesson_by_id(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson
