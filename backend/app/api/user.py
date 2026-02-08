from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.storage import storage_service
from app.models import User, UserProgress
from app.core.security import get_current_user
import uuid
from typing import List

router = APIRouter()

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user info"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": getattr(current_user, 'avatar_url', None)
    }

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user profile information"""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": getattr(user, 'avatar_url', None),
        "personality_profile": user.personality_profile or {},
        "created_at": user.created_at
    }

@router.get("/{user_id}/progress")
def get_user_progress(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user learning progress"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify user can only see their own progress or is an admin
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's progress")
    
    progress_records = db.query(UserProgress).filter(UserProgress.user_id == user_id).all()
    
    return {
        "user_id": user_id,
        "progress": [
            {
                "lesson_id": p.lesson_id,
                "completed": p.completed,
                "score": p.score,
                "last_accessed": p.last_accessed
            }
            for p in progress_records
        ]
    }


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads the user's avatar."""
    content = await file.read()
    
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    file_id = str(uuid.uuid4())
    file_name = f"avatar_{file_id}.jpg"
    
    image_url = await storage_service.upload_file(content, file_name, file.content_type)
    
    user.avatar_url = image_url
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"avatar_url": image_url}
