from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.services.personality_service import personality_service

router = APIRouter()

@router.get("/radar")
async def get_personality_radar(db: Session = Depends(get_db)):
    # Mock user for now
    user = db.query(User).first()
    if not user:
        # Return fallback data if no user exists
        return [
            {"subject": "Communication", "A": 85, "fullMark": 100},
            {"subject": "Empathy", "A": 70, "fullMark": 100},
            {"subject": "Conflict Res", "A": 60, "fullMark": 100},
            {"subject": "Collaboration", "A": 90, "fullMark": 100},
            {"subject": "Confidence", "A": 75, "fullMark": 100},
            {"subject": "Adaptability", "A": 80, "fullMark": 100},
        ]
    
    return personality_service.get_radar_data(user)

@router.get("/insights")
async def get_personality_insights():
    return {
        "strengths": [
            "Natural Collaborator",
            "Active Communicator"
        ],
        "growth_areas": [
            "Conflict Resolution"
        ]
    }
