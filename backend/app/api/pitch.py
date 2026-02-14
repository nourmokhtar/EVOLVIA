from fastapi import APIRouter, HTTPException, File, UploadFile, Depends, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.pitch_service import pitch_service
from app.services.deck_service import deck_service
from app.core.security import get_current_user
import os
import shutil
import base64
import traceback
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class PitchAnalysisRequest(BaseModel):
    video_base64: Optional[str] = None  # Legacy
    video_frames: Optional[List[str]] = None  # New: List of base64 frames
    audio_base64: Optional[str] = None
    transcript: Optional[str] = ""

@router.post("/analyze")
async def analyze_pitch(
    request: PitchAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze a pitch presentation.
    Requires authentication.
    
    Args:
        request: PitchAnalysisRequest with video frames, audio, and transcript
        current_user: Current authenticated user
    
    Returns:
        Analysis results
    """
    logger.info(f"User {current_user.get('id')} analyzing pitch")
    try:
        # 1. Decode Video Frames
        decoded_frames = []
        if request.video_frames:
            logger.info(f"Decoding {len(request.video_frames)} video frames...")
            for frame in request.video_frames:
                decoded_frames.append(base64.b64decode(frame))
        elif request.video_base64:
            logger.info("Decoding single video frame (legacy)...")
            decoded_frames.append(base64.b64decode(request.video_base64))
        
        # 2. Decode Audio
        logger.info(f"Decoding audio ({len(request.audio_base64 or '')} chars)...")
        audio_bytes = base64.b64decode(request.audio_base64) if request.audio_base64 else None
        
        # 3. Call Service
        logger.info("Calling PitchService.analyze_presentation_segment...")
        analysis = await pitch_service.analyze_presentation_segment(
            video_frames=decoded_frames if decoded_frames else None,
            audio_bytes=audio_bytes,
            transcript_provided=request.transcript
        )
        logger.info(f"✅ Pitch analysis complete for user {current_user.get('id')}")
        return analysis
    except Exception as e:
        logger.error(f"❌ Pitch analysis error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/deck/analyze")
async def analyze_pitch_deck(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze a pitch deck (PowerPoint/PDF).
    Requires authentication.
    
    Args:
        file: Deck file to analyze
        current_user: Current authenticated user
    
    Returns:
        Deck analysis results
    """
    logger.info(f"User {current_user.get('id')} analyzing deck: {file.filename}")
    
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
        
        logger.info(f"✅ Deck analysis complete for user {current_user.get('id')}")
        return analysis
    except Exception as e:
        logger.error(f"❌ Deck analysis error: {e}")
        logger.error(traceback.format_exc())
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/deck/extract")
async def extract_deck(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Extract slides from a pitch deck for presentation mode.
    Requires authentication.
    
    Args:
        file: Deck file to extract slides from
        current_user: Current authenticated user
    
    Returns:
        Slide images
    """
    logger.info(f"User {current_user.get('id')} extracting slides: {file.filename}")
    temp_dir = "temp_present"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        result = await deck_service.extract_slides_only(file_path, file.filename)
        os.remove(file_path)
        
        logger.info(f"✅ Slide extraction complete for user {current_user.get('id')}")
        return result
    except Exception as e:
        logger.error(f"❌ Slide extraction error: {e}")
        logger.error(traceback.format_exc())
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history")
async def get_pitch_history():
    return [
        {"module": "Pitch Simulator", "score": 85, "date": "2026-01-20"}
    ]
