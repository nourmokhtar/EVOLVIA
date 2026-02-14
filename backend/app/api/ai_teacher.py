from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.services.ai_service import ai_service
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    message: str

class PerformanceData(BaseModel):
    data: Dict[str, Any]

@router.post("/chat")
async def chat_with_teacher(
    msg: ChatMessage,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Chat with the AI teacher.
    Requires authentication.
    
    Args:
        msg: Message from user
        current_user: Current authenticated user
    
    Returns:
        Response from AI teacher
    """
    try:
        logger.info(f"User {current_user.get('id')} chatting with teacher")
        response = await ai_service.get_teacher_response(msg.message)
        return {"response": response}
    except Exception as e:
        logger.error(f"❌ Error getting teacher response: {e}")
        raise

@router.post("/feedback")
async def get_feedback(
    performance_data: PerformanceData,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get feedback based on user performance.
    Requires authentication.
    
    Args:
        performance_data: Performance metrics to analyze
        current_user: Current authenticated user
    
    Returns:
        Feedback and analysis
    """
    try:
        logger.info(f"User {current_user.get('id')} requesting feedback")
        analysis = await ai_service.analyze_performance(performance_data.data)
        return analysis
    except Exception as e:
        logger.error(f"❌ Error analyzing performance: {e}")
        raise
