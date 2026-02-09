from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.db.supabase import get_user_by_id, update_user, query_table
from app.services.storage import storage_service
from app.core.security import get_current_user
import uuid
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info"""
    return {
        "id": str(current_user.get("id")),
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name"),
        "avatar_url": current_user.get("avatar_url"),
        "streak": current_user.get("streak", 0),
        "last_active": current_user.get("last_active"),
    }

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile information"""
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user.get("id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "avatar_url": user.get("avatar_url"),
        "personality_profile": user.get("personality_profile", {}),
        "created_at": user.get("created_at"),
        "streak": user.get("streak", 0),
        "last_active": user.get("last_active"),
    }

@router.get("/{user_id}/progress")
async def get_user_progress(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user learning progress"""
    # Verify user can only see their own progress
    if str(current_user.get("id")) != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's progress")
    
    progress_records = await query_table("user_progress", {"user_id": user_id})
    
    return {
        "user_id": user_id,
        "progress": [
            {
                "lesson_id": p.get("lesson_id"),
                "completed": p.get("completed"),
                "score": p.get("score"),
                "last_accessed": p.get("last_accessed"),
            }
            for p in progress_records
        ]
    }

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Uploads the user's avatar."""
    content = await file.read()
    
    user = await get_user_by_id(current_user.get("id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1]
    file_name = f"avatar_{current_user.get('id')}_{uuid.uuid4()}.{file_ext}"
    
    # Upload to storage
    avatar_url = await storage_service.upload_file(content, file_name, file.content_type)
    
    # Update user with avatar URL
    updated_user = await update_user(current_user.get("id"), {"avatar_url": avatar_url})
    
    return {
        "avatar_url": avatar_url,
        "message": "Avatar uploaded successfully"
    }

        
    file_id = str(uuid.uuid4())
    file_name = f"avatar_{file_id}.jpg"
    
    image_url = await storage_service.upload_file(content, file_name, file.content_type)
    
    user.avatar_url = image_url
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"avatar_url": image_url}
