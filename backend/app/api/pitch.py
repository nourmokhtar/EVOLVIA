from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.core.security import get_current_user
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/analyze")
async def analyze_pitch(
    audio_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Analyze pitch from audio data"""
    # This will eventually call the AI service
    analysis = await ai_service.analyze_performance(audio_data)
    return analysis

@router.get("/history")
async def get_pitch_history(current_user: User = Depends(get_current_user)):
    """Get user's pitch analysis history"""
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
