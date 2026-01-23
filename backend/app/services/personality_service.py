from typing import Dict, Any
from app.models import User
from sqlalchemy.orm import Session

class PersonalityService:
    """
    Manages psychological traits and radar map data generation.
    """
    def get_radar_data(self, user: User) -> Dict[str, Any]:
        """
        Calculates and formats user traits for Recharts.
        Returns a list of objects ready for the Frontend radar chart.
        """
        default_profile = {
            "Communication": 50,
            "Empathy": 50,
            "Conflict Res": 50,
            "Collaboration": 50,
            "Confidence": 50,
            "Adaptability": 50
        }
        profile = user.personality_profile or default_profile
        
        return [
            {"subject": k, "A": v, "fullMark": 100} 
            for k, v in profile.items()
        ]

    async def update_score(self, db: Session, user: User, trait: str, delta: int):
        """
        Updates a specific trait score (e.g., Confidence +5).
        Clamps values between 0 and 100.
        """
        profile = user.personality_profile or {}
        current = profile.get(trait, 50)
        profile[trait] = max(0, min(100, current + delta))
        
        user.personality_profile = profile
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

personality_service = PersonalityService()
