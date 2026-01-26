from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import ai_service

router = APIRouter()

class SimulationAction(BaseModel):
    scenario_id: str
    action: str
    context: Optional[str] = None

@router.post("/action")
async def simulate_collaboration(action: SimulationAction):
    # Mock response for collaboration simulation
    return {
        "response": "Teammate: 'I appreciate you understanding my situation. Let's work together to fix this.'",
        "personality_impact": {
            "collaboration": +5,
            "empathy": +3
        }
    }

@router.get("/history")
async def get_collaboration_history():
    return [
        {"module": "Conflict Resolution", "score": 72, "date": "2026-01-22"}
    ]
