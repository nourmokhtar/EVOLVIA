from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase import get_user_by_id
from app.core.security import get_current_user
from app.services.ai_service import ai_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze")
async def analyze_pitch(
    audio_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Analyze pitch from audio data"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # This will eventually call the AI service
    analysis = await ai_service.analyze_performance(audio_data)
    return analysis

@router.get("/history")
async def get_pitch_history(
    current_user: dict = Depends(get_current_user),
):
    """Get user's pitch analysis history"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
