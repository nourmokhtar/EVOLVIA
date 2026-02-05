from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.pitch_service import pitch_service
from app.services.deck_service import deck_service
import os
import shutil
from fastapi import File, UploadFile
import base64
import traceback

from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class PitchAnalysisRequest(BaseModel):
    video_base64: Optional[str] = None # Legacy
    video_frames: Optional[List[str]] = None # New: List of base64 frames
    audio_base64: Optional[str] = None
    transcript: Optional[str] = ""

@router.post("/analyze")
async def analyze_pitch(request: PitchAnalysisRequest):
    print("--- INCOMING ANALYZE REQUEST ---")
    try:
        # 1. Decode Video Frames
        decoded_frames = []
        if request.video_frames:
            print(f"Decoding {len(request.video_frames)} video frames...")
            for frame in request.video_frames:
                decoded_frames.append(base64.b64decode(frame))
        elif request.video_base64:
            print("Decoding single video frame (legacy)...")
            decoded_frames.append(base64.b64decode(request.video_base64))
        
        # 2. Decode Audio
        print(f"Decoding audio ({len(request.audio_base64 or '')} chars)...")
        audio_bytes = base64.b64decode(request.audio_base64) if request.audio_base64 else None
        
        # 3. Call Service
        print("Calling PitchService.analyze_presentation_segment...")
        analysis = await pitch_service.analyze_presentation_segment(
            video_frames=decoded_frames if decoded_frames else None,
            audio_bytes=audio_bytes,
            transcript_provided=request.transcript
        )
        print("Analysis finished successfully!")
        return analysis
    except Exception as e:
        print("!!! ROUTER ERROR !!!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deck/analyze")
async def analyze_pitch_deck(file: UploadFile = File(...)):
    print(f"--- INCOMING DECK ANALYZE REQUEST: {file.filename} ---")
    
    # 1. Save file temporarily
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Call Service
        analysis = await deck_service.analyze_deck(file_path, file.filename)
        
        # 3. Cleanup
        os.remove(file_path)
        
        return analysis
    except Exception as e:
        print("!!! DECK ROUTER ERROR !!!")
        traceback.print_exc()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deck/extract")
async def extract_deck(file: UploadFile = File(...)):
    """Extracts slide images for presentation mode."""
    print(f"--- EXTRACTING SLIDES: {file.filename} ---")
    temp_dir = "temp_present"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        result = await deck_service.extract_slides_only(file_path, file.filename)
        os.remove(file_path)
        return result
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_pitch_history():
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
