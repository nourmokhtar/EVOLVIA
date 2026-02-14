"""
Video upload and management routes

FastAPI routes for video upload, download, and management using Supabase Storage
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import io
from datetime import datetime
import logging

from app.db.supabase import (
    upload_video,
    download_video,
    get_video_url,
    list_user_videos,
    delete_video,
)
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["videos"])

# Constants
BUCKET_NAME = "vid"  # Your Supabase bucket name
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit
ALLOWED_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/avi"]


# ============================================
# UPLOAD VIDEO
# ============================================

@router.post("/upload")
async def upload_video_file(
    file: UploadFile = File(...),
    lesson_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a video file to Supabase Storage.
    Requires authentication - uses current user's ID for organization.
    
    Args:
        file: Video file to upload
        lesson_id: Optional lesson ID to associate with the video
        current_user: Current authenticated user
    
    Returns:
        Video upload metadata with signed URL
    """
    user_id = str(current_user.get("id"))
    
    try:
        # Validate content type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}"
            )
        
        # Read file and check size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024):.0f}MB"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = f"{user_id}/{timestamp}_{file.filename}"
        
        # If lesson_id provided, organize by lesson
        if lesson_id:
            file_path = f"{user_id}/lessons/{lesson_id}/{timestamp}_{file.filename}"
        
        # Upload to Supabase
        file_object = io.BytesIO(file_content)
        result = await upload_video(
            bucket_name=BUCKET_NAME,
            file_path=file_path,
            file_object=file_object,
            content_type=file.content_type,
            user_id=user_id
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload video"
            )
        
        # Get signed URL for the uploaded video
        signed_url = await get_video_url(BUCKET_NAME, file_path, expires_in=86400)  # 24 hours
        
        logger.info(f"✅ Video uploaded by user {user_id}: {file.filename}")
        
        return {
            "success": True,
            "message": "Video uploaded successfully",
            "path": file_path,
            "url": signed_url,
            "size": len(file_content),
            "content_type": file.content_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading video for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading video"
        )


# ============================================
# GET VIDEO URL
# ============================================

@router.get("/url/{file_name}")
async def get_video_signed_url(
    file_name: str,
    expires_in: int = 3600,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a signed URL for a video file.
    Requires authentication - can only access videos in your own folder.
    
    Args:
        file_name: Name of the video file
        expires_in: URL expiration time in seconds (default: 1 hour)
        current_user: Current authenticated user
    
    Returns:
        Signed URL for the video
    """
    user_id = str(current_user.get("id"))
    file_path = f"{user_id}/{file_name}"
    
    try:
        signed_url = await get_video_url(BUCKET_NAME, file_path, expires_in)
        
        if not signed_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        logger.info(f"✅ Generated URL for video {file_name}")
        
        return {
            "url": signed_url,
            "expires_in": expires_in
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating URL for video {file_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating video URL"
        )


# ============================================
# LIST USER VIDEOS
# ============================================

@router.get("/list")
async def list_videos(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    List all videos for the current user.
    Requires authentication.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        List of user's videos with metadata and signed URLs
    """
    user_id = str(current_user.get("id"))
    
    try:
        videos = await list_user_videos(BUCKET_NAME, user_id)
        
        # Add signed URLs to each video
        videos_with_urls = []
        for video in videos:
            try:
                file_path = f"{user_id}/{video['name']}"
                signed_url = await get_video_url(BUCKET_NAME, file_path, expires_in=3600)
                
                videos_with_urls.append({
                    "name": video["name"],
                    "size": video.get("metadata", {}).get("size", 0),
                    "created_at": video.get("created_at"),
                    "url": signed_url
                })
            except Exception as e:
                logger.warning(f"Error generating URL for video {video['name']}: {e}")
        
        logger.info(f"✅ Listed {len(videos_with_urls)} videos for user {user_id}")
        
        return {
            "videos": videos_with_urls,
            "count": len(videos_with_urls)
        }
    except Exception as e:
        logger.error(f"❌ Error listing videos for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing videos"
        )


# ============================================
# DELETE VIDEO
# ============================================

@router.delete("/delete/{file_name}")
async def delete_video_file(
    file_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a video file.
    Requires authentication - can only delete videos in your own folder.
    
    Args:
        file_name: Name of the video file to delete
        current_user: Current authenticated user
    
    Returns:
        Success confirmation
    """
    user_id = str(current_user.get("id"))
    file_path = f"{user_id}/{file_name}"
    
    try:
        success = await delete_video(BUCKET_NAME, file_path)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        logger.info(f"✅ Video deleted {file_name} by user {user_id}")
        
        return {
            "success": True,
            "message": "Video deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting video {file_name} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting video"
        )


# ============================================
# DOWNLOAD VIDEO (streaming)
# ============================================

@router.get("/download/{file_name}")
async def download_video_file(
    file_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Download a video file.
    Requires authentication - can only download videos in your own folder.
    
    Args:
        file_name: Name of the video file to download
        current_user: Current authenticated user
    
    Returns:
        Video file stream
    """
    user_id = str(current_user.get("id"))
    file_path = f"{user_id}/{file_name}"
    
    try:
        video_data = await download_video(BUCKET_NAME, file_path)
        
        if not video_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        logger.info(f"✅ Video downloaded {file_name} by user {user_id}")
        
        return StreamingResponse(
            io.BytesIO(video_data),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename={file_name}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error downloading video {file_name} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error downloading video"
        )