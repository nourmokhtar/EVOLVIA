from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.personality_service import personality_service
from app.db.supabase import get_user_by_id, update_user
from typing import Dict, Any
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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get personality radar data for a specific user.
    
    Args:
        user_id: The ID of the user to fetch personality data for
        current_user: Current authenticated user
    
    Returns:
        List of personality traits with their current scores
    """
    try:
        # Verify user can only see their own data (unless admin)
        current_user_id = str(current_user.get("id"))
        if current_user_id != user_id and not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access other user's personality data"
            )
        
        user = await get_user_by_id(user_id)
        if not user:
            logger.warning(f"User not found for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        logger.info(f"✅ Fetching radar data for user ID: {user_id}")
        
        personality_profile = user.get('personality_profile', {})
        return personality_service.get_radar_data(personality_profile)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching personality radar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching personality data"
        )

@router.get("/insights")
async def get_personality_insights(
    user_id: str = Query(..., description="User ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get personality insights and growth recommendations for a specific user.
    
    Args:
        user_id: The ID of the user to fetch insights for
        current_user: Current authenticated user
    
    Returns:
        Insights including strengths and growth areas based on user's current profile
    """
    try:
        # Verify user can only see their own data (unless admin)
        current_user_id = str(current_user.get("id"))
        if current_user_id != user_id and not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access other user's insights"
            )
        
        user = await get_user_by_id(user_id)
        if not user:
            logger.warning(f"User not found for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        logger.info(f"✅ Fetching insights for user ID: {user_id}")
        
        profile = user.get('personality_profile') or {}
        strengths = sorted(profile.items(), key=lambda x: x[1], reverse=True)[:3]
        growth_areas = sorted(profile.items(), key=lambda x: x[1])[:2]
        
        return {
            "user_id": user_id,
            "strengths": [trait[0] for trait in strengths],
            "growth_areas": [trait[0] for trait in growth_areas],
            "current_profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching personality insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching insights"
        )

@router.post("/analyze-with-ollama")
async def analyze_with_ollama(
    request: UserPromptRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
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
    try:
        if not request.prompt or request.prompt.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prompt cannot be empty"
            )
        
        user_id = current_user.get("id")
        logger.info(f"Analyzing personality for user ID: {user_id}")
        logger.debug(f"User prompt: {request.prompt}")
        
        # Run personality analysis
        result = await personality_service.analyze_and_update_personality(
            user=current_user,
            user_prompt=request.prompt
        )
        
        logger.info(f"✅ Personality analysis complete for user {user_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error analyzing personality: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error analyzing personality"
        )

