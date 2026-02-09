from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.db.supabase import get_user_by_id
from app.core.security import get_current_user
from app.services.ai_service import ai_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_teacher(
    msg: ChatMessage,
    current_user: dict = Depends(get_current_user),
):
    """Chat with AI teacher"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    response = await ai_service.get_teacher_response(msg.message)
    return {"response": response}

@router.post("/feedback")
async def get_feedback(
    performance_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Get AI feedback on performance"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    analysis = await ai_service.analyze_performance(performance_data)
    return analysis
