from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.pitch_service import pitch_service
import base64
import traceback

router = APIRouter()

class PitchAnalysisRequest(BaseModel):
    video_base64: Optional[str] = None
    audio_base64: Optional[str] = None
    transcript: Optional[str] = ""

@router.post("/analyze")
async def analyze_pitch(request: PitchAnalysisRequest):
    print("--- INCOMING ANALYZE REQUEST ---")
    try:
        # 1. Decode Video
        print(f"Decoding video ({len(request.video_base64 or '')} chars)...")
        video_bytes = base64.b64decode(request.video_base64) if request.video_base64 else None
        
        # 2. Decode Audio
        print(f"Decoding audio ({len(request.audio_base64 or '')} chars)...")
        audio_bytes = base64.b64decode(request.audio_base64) if request.audio_base64 else None
        
        # 3. Call Service
        print("Calling PitchService.analyze_presentation_segment...")
        analysis = await pitch_service.analyze_presentation_segment(
            video_bytes=video_bytes,
            audio_bytes=audio_bytes,
            transcript_provided=request.transcript
        )
        print("Analysis finished successfully!")
        return analysis
    except Exception as e:
        print("!!! ROUTER ERROR !!!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_pitch_history():
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
