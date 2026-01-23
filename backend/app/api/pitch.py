from fastapi import APIRouter
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/analyze")
async def analyze_pitch(audio_data: dict):
    # This will eventually call the AI service
    analysis = await ai_service.analyze_performance(audio_data)
    return analysis

@router.get("/history")
async def get_pitch_history():
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
