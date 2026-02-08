from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.core.security import get_current_user
from app.services.ai_service import ai_service

router = APIRouter()

class SimulationAction(BaseModel):
    scenario_id: str
    action: str
    context: Optional[str] = None

@router.post("/action")
async def simulate_collaboration(
    action: SimulationAction,
    current_user: User = Depends(get_current_user)
):
    """Submit a collaboration action in simulation"""
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
    current_user: User = Depends(get_current_user)
):
    """Get user's collaboration simulation history"""
    return [
        {"module": "Conflict Resolution", "score": 72, "date": "2026-01-22"}
    ]
