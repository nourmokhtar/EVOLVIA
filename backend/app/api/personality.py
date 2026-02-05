from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models import User
from app.core.security import get_current_user
from app.services.personality_service import personality_service

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class UserPromptRequest(BaseModel):
    prompt: str

class PersonalityAnalysisResponse(BaseModel):
    success: bool
    user_prompt: str
    traits_delta: dict
    updated_profile: dict
    analysis: str

@router.get("/radar")
async def get_personality_radar(
    user_id: str = Query(..., description="User ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personality radar data for a specific user.
    
    Args:
        user_id: The ID of the user to fetch personality data for
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of personality traits with their current scores
    """
    # Verify user can only see their own data
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's personality data")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User not found for user_id: {user_id}")
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    logger.info(f"Fetching radar data for user ID: {user.id}")
    logger.debug(f"User personality profile: {user.personality_profile}")
    
    return personality_service.get_radar_data(user)

@router.get("/insights")
async def get_personality_insights(
    user_id: str = Query(..., description="User ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personality insights and growth recommendations for a specific user.
    
    Args:
        user_id: The ID of the user to fetch insights for
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Insights including strengths and growth areas based on user's current profile
    """
    # Verify user can only see their own data
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's insights")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User not found for user_id: {user_id}")
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    logger.info(f"Fetching insights for user ID: {user.id}")
    
    profile = user.personality_profile or {}
    strengths = sorted(profile.items(), key=lambda x: x[1], reverse=True)[:3]
    growth_areas = sorted(profile.items(), key=lambda x: x[1])[:2]
    
    return {
        "user_id": user.id,
        "strengths": [trait[0] for trait in strengths],
        "growth_areas": [trait[0] for trait in growth_areas],
        "current_profile": profile
    }

@router.post("/analyze-with-ollama")
async def analyze_with_ollama(
    request: UserPromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Analyze user prompt using Ollama model and update personality traits.
    
    This endpoint:
    1. Takes user input/prompt
    2. Sends it to locally hosted Ollama model for analysis
    3. Extracts personality trait point changes
    4. Updates the user's personality profile
    5. Returns the analysis and updated traits
    
    Traits evaluated: Communication, Empathy, Conflict Resolution, Collaboration, Confidence, Adaptability
    """
    if not request.prompt or request.prompt.strip() == "":
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    logger.info(f"Analyzing personality for user ID: {current_user.id}")
    logger.debug(f"Current user personality profile: {current_user.personality_profile}")
    logger.info(f"User prompt: {request.prompt}")
    
    result = await personality_service.analyze_and_update_personality(
        db=db,
        user=current_user,
        user_prompt=request.prompt
    )
    
    logger.info(f"Personality analysis complete for user {current_user.id}. Result: {result}")
    return result
