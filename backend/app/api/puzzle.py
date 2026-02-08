from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.services.puzzle_service import analyze_qcm, draw_real_puzzle, get_questions, generate_global_report
from app.core.security import get_current_user_optional
from app.models.user import User
import json

router = APIRouter()

@router.get("/questions")
def get_puzzle_questions():
    """Retourne les questions QCM pour le puzzle"""
    return get_questions()

@router.post("/analyze")
def analyze_personality(responses: Dict[str, str]):
    """Analyse les réponses QCM et génère le puzzle"""
    try:
        print(f"DEBUG: Received responses: {responses}")
        
        # Analyser avec LLM
        analysis = analyze_qcm(responses)
        print(f"DEBUG: Analysis result: {json.dumps(analysis, indent=2)}")
        
        if not analysis:
            raise HTTPException(status_code=500, detail="LLM analysis failed or returned empty result")
        
        # Générer l'image du puzzle
        puzzle_image, highlight_info = draw_real_puzzle(analysis)
        print(f"DEBUG: Puzzle image generated successfully")

        # Générer le rapport global
        report = generate_global_report(responses)
        print(f"DEBUG: Report generated successfully")
        
        return {
            "analysis": analysis,
            "puzzle_image": puzzle_image,
            "highlight": highlight_info,
            "report": report
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_msg = f"Erreur lors de l'analyse: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/reassess")
def reassess_dimension(data: Dict[str, Any]):
    """
    Re-assess a dimension based on journal entries.
    Expects: { "dimension": str, "entries": List[str], "current_score": int }
    """
    from app.services.puzzle_service import reassess_dimension_score
    try:
        dimension = data.get("dimension")
        entries = data.get("entries", [])
        current_score = data.get("current_score", 50)
        
        result = reassess_dimension_score(dimension, entries, current_score)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))