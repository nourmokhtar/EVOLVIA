from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.services.ai_service import ai_service

router = APIRouter()

class ChatMessage(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_teacher(msg: ChatMessage):
    response = await ai_service.get_teacher_response(msg.message)
    return {"response": response}

@router.post("/feedback")
async def get_feedback(performance_data: dict):
    analysis = await ai_service.analyze_performance(performance_data)
    return analysis
