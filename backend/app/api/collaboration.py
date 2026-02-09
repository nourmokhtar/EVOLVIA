from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db.supabase import get_user_by_id
from app.core.security import get_current_user
from app.services.ai_service import ai_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class SimulationAction(BaseModel):
    scenario_id: str
    action: str
    context: Optional[str] = None

@router.post("/action")
async def simulate_collaboration(
    action: SimulationAction,
    current_user: dict = Depends(get_current_user),
):
    """Submit a collaboration action in simulation"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mock response for collaboration simulation
    return {
        "response": "Teammate: 'I appreciate you understanding my situation. Let's work together to fix this.'",
        "personality_impact": {
            "collaboration": +5,
            "empathy": +3
        }
    }

@router.get("/history")
async def get_collaboration_history(
    current_user: dict = Depends(get_current_user),
):
    """Get user's collaboration simulation history"""
    # Verify user exists
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return [
        {"module": "Conflict Resolution", "score": 72, "date": "2026-01-22"}
    ]
