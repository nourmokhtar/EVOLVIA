from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.core.security import get_current_user
from app.services.storage import storage_service
from app.db.supabase import get_user_by_id, update_user
from typing import Dict, Any
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current authenticated user's profile information.
    """
    try:
        user_id = current_user.get("id")
        user = await get_user_by_id(user_id)
        
        if not user:
            # This shouldn't happen if get_current_user verified the user
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        logger.info(f"✅ Fetched user profile for: {user_id}")
        
        return {
            "id": str(user.get("id")),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "avatar_url": user.get("avatar_url"),
            "created_at": user.get("created_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user profile"
        )

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload and update the current user's avatar.
    
    Args:
        file: Image file to upload
        current_user: Current authenticated user
    
    Returns:
        Avatar URL
    """
    try:
        user_id = current_user.get("id")
        
        # Verify user still exists
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Read and validate file
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Upload to storage service
        file_id = str(uuid.uuid4())
        file_name = f"avatar_{file_id}.jpg"
        
        image_url = await storage_service.upload_file(content, file_name, file.content_type)
        
        if not image_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload avatar"
            )
        
        # Update user with new avatar URL
        updated_user = await update_user(user_id, {"avatar_url": image_url})
        
        logger.info(f"✅ Avatar uploaded for user: {user_id}")
        
        return {
            "avatar_url": image_url,
            "success": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading avatar"
        )

@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user profile by ID (only accessible to the user themselves or admins).
    """
    try:
        # Verify user can only access their own profile unless they're an admin
        current_user_id = current_user.get("id")
        if str(current_user_id) != user_id and not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access other user's profile"
            )
        
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"✅ Fetched user profile: {user_id}")
        
        return {
            "id": str(user.get("id")),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "avatar_url": user.get("avatar_url"),
            "created_at": user.get("created_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user"
        )

