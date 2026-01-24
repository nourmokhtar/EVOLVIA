from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.core.security import get_current_user
from app.services.ai_service import ai_service

router = APIRouter()

class ChatMessage(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_teacher(
    msg: ChatMessage,
    current_user: User = Depends(get_current_user)
):
    """Chat with AI teacher"""
    response = await ai_service.get_teacher_response(msg.message)
    return {"response": response}

@router.post("/feedback")
async def get_feedback(
    performance_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Get AI feedback on performance"""
    analysis = await ai_service.analyze_performance(performance_data)
    return analysis
