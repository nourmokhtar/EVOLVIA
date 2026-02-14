from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from app.services.puzzle_service import analyze_qcm, draw_real_puzzle, get_questions, generate_global_report, reassess_dimension_score
from app.core.security import get_current_user
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/questions")
async def get_puzzle_questions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get QCM puzzle questions for current user.
    Requires authentication.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        List of puzzle questions
    """
    try:
        logger.info(f"User {current_user.get('id')} requesting puzzle questions")
        return get_questions()
    except Exception as e:
        logger.error(f"❌ Error getting puzzle questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving puzzle questions"
        )

@router.post("/analyze")
async def analyze_personality(
    responses: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze QCM responses and generate personality puzzle.
    Requires authentication.
    
    Args:
        responses: Dictionary of question IDs to responses
        current_user: Current authenticated user
    
    Returns:
        Analysis, puzzle image, and report
    """
    try:
        user_id = current_user.get("id")
        logger.info(f"User {user_id} analyzing personality responses")
        logger.debug(f"Received responses: {responses}")
        
        # Analyze with LLM
        analysis = analyze_qcm(responses)
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LLM analysis failed"
            )
        
        logger.debug(f"Analysis result: {json.dumps(analysis, indent=2)}")
        
        # Generate puzzle image
        puzzle_image, highlight_info = draw_real_puzzle(analysis)
        logger.debug("Puzzle image generated successfully")

        # Generate global report
        report = generate_global_report(responses)
        logger.debug("Report generated successfully")
        
        logger.info(f"✅ Personality analysis complete for user {user_id}")
        
        return {
            "analysis": analysis,
            "puzzle_image": puzzle_image,
            "highlight": highlight_info,
            "report": report
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error analyzing personality: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during analysis: {str(e)}"
        )

@router.post("/reassess")
async def reassess_dimension(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Re-assess a dimension based on journal entries.
    Requires authentication.
    
    Args:
        data: Dictionary with "dimension", "entries", and "current_score"
        current_user: Current authenticated user
    
    Returns:
        Re-assessment results
    """
    try:
        user_id = current_user.get("id")
        logger.info(f"User {user_id} reassessing dimension")
        
        dimension = data.get("dimension")
        entries = data.get("entries", [])
        current_score = data.get("current_score", 50)
        
        if not dimension:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required field: dimension"
            )
        
        result = reassess_dimension_score(dimension, entries, current_score)
        
        logger.info(f"✅ Reassessment complete for user {user_id}, dimension {dimension}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error reassessing dimension: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during reassessment"
        )