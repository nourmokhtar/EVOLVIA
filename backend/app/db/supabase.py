"""
Supabase database client and helper functions.
This module provides all database operations using Supabase's Python client.
"""

from supabase import create_client, Client
from supabase.client import ClientOptions
from app.core.config import settings
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Optional[Client] = None

def get_supabase() -> Client:
    """Get or initialize Supabase client"""
    global supabase
    
    if supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        try:
            supabase = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY,
                options=ClientOptions(
                    postgrest_client_timeout=10,
                    storage_client_timeout=10,
                    schema="public",
                    auto_refresh_token=True,
                    persist_session=True,
                )
            )
            logger.info("✅ Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            raise
    
    return supabase

0


# ============================================
# USER OPERATIONS
# ============================================

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a user by ID"""
    try:
        response = get_supabase().table("users").select("*").eq("id", user_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return None


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetch a user by email"""
    try:
        response = get_supabase().table("users").select("*").eq("email", email).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching user by email: {e}")
        return None


async def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new user"""
    try:
        from datetime import datetime
        
        # Ensure timestamps are included
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.utcnow().isoformat()
        if "updated_at" not in user_data:
            user_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = get_supabase().table("users").insert(user_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return None


async def update_user(user_id: str, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a user"""
    try:
        response = get_supabase().table("users").update(user_data).eq("id", user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return None


# ============================================
# LESSON OPERATIONS
# ============================================

async def get_all_lessons(skill_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all lessons, optionally filtered by skill type"""
    try:
        query = get_supabase().table("lessons").select("*")
        if skill_type:
            query = query.eq("skill_type", skill_type)
        response = query.execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching lessons: {e}")
        return []


async def get_lesson_by_id(lesson_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a lesson by ID"""
    try:
        response = get_supabase().table("lessons").select("*").eq("id", lesson_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching lesson: {e}")
        return None


async def create_lesson(lesson_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new lesson"""
    try:
        from datetime import datetime
        
        if "created_at" not in lesson_data:
            lesson_data["created_at"] = datetime.utcnow().isoformat()
        if "updated_at" not in lesson_data:
            lesson_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = get_supabase().table("lessons").insert(lesson_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating lesson: {e}")
        return None


# ============================================
# QUIZ OPERATIONS
# ============================================

async def get_quiz_by_lesson(lesson_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a quiz for a specific lesson"""
    try:
        response = get_supabase().table("quizzes").select("*").eq("lesson_id", lesson_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching quiz: {e}")
        return None


async def get_quiz_by_id(quiz_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a quiz by ID"""
    try:
        response = get_supabase().table("quizzes").select("*").eq("id", quiz_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching quiz: {e}")
        return None


async def get_questions_by_quiz(quiz_id: str) -> List[Dict[str, Any]]:
    """Fetch all questions for a quiz"""
    try:
        response = get_supabase().table("questions").select("*").eq("quiz_id", quiz_id).execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        return []


async def create_quiz(quiz_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new quiz"""
    try:
        from datetime import datetime
        
        if "created_at" not in quiz_data:
            quiz_data["created_at"] = datetime.utcnow().isoformat()
        if "updated_at" not in quiz_data:
            quiz_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = get_supabase().table("quizzes").insert(quiz_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating quiz: {e}")
        return None


# ============================================
# USER PROGRESS OPERATIONS
# ============================================

async def get_user_progress(user_id: str) -> List[Dict[str, Any]]:
    """Fetch all progress records for a user"""
    try:
        response = get_supabase().table("user_progress").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching user progress: {e}")
        return []


async def create_progress(progress_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new progress record"""
    try:
        from datetime import datetime
        
        if "created_at" not in progress_data:
            progress_data["created_at"] = datetime.utcnow().isoformat()
        if "updated_at" not in progress_data:
            progress_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = get_supabase().table("user_progress").insert(progress_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating progress: {e}")
        return None


async def update_progress(progress_id: str, progress_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a progress record"""
    try:
        response = get_supabase().table("user_progress").update(progress_data).eq("id", progress_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        return None


# ============================================
# GENERIC OPERATIONS
# ============================================

async def query_table(table_name: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Generic query for any table"""
    try:
        query = get_supabase().table(table_name).select("*")
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        response = query.execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error querying {table_name}: {e}")
        return []


async def insert_table(table_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generic insert for any table"""
    try:
        response = get_supabase().table(table_name).insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting into {table_name}: {e}")
        return None


async def update_table(table_name: str, filters: Dict[str, Any], data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generic update for any table"""
    try:
        query = get_supabase().table(table_name).update(data)
        for key, value in filters.items():
            query = query.eq(key, value)
        response = query.execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating {table_name}: {e}")
        return None


async def delete_record(table_name: str, id_value: str, id_field: str = "id") -> bool:
    """Delete a record from any table"""
    try:
        get_supabase().table(table_name).delete().eq(id_field, id_value).execute()
        return True
    except Exception as e:
        logger.error(f"Error deleting from {table_name}: {e}")
        return False




# Add these functions (copy from database_video_functions.py)
"""
ADD THESE VIDEO STORAGE FUNCTIONS TO YOUR EXISTING app/database/database.py
"""

# Add these imports at the top with your existing imports
from pathlib import Path
import os
from typing import BinaryIO

# ============================================
# VIDEO STORAGE OPERATIONS
# ============================================

async def upload_video(
    bucket_name: str,
    file_path: str,
    file_object: BinaryIO,
    content_type: str = "video/mp4",
    user_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Upload a video file to Supabase Storage
    
    Args:
        bucket_name: Name of the storage bucket (e.g., "videos")
        file_path: Destination path in bucket (e.g., "user123/video.mp4")
        file_object: File object opened in binary mode
        content_type: MIME type of the video
        user_id: Optional user ID for organizing files
    
    Returns:
        Dict with upload metadata or None on error
    """
    try:
        # Generate path with user_id if provided
        if user_id and not file_path.startswith(f"{user_id}/"):
            file_path = f"{user_id}/{file_path}"
        
        response = get_supabase().storage.from_(bucket_name).upload(
            path=file_path,
            file=file_object,
            file_options={
                "content-type": content_type,
                "cache-control": "3600",
                "upsert": "false"  # Change to "true" to allow overwrites
            }
        )
        
        logger.info(f"✅ Video uploaded: {file_path}")
        
        # Return metadata
        return {
            "path": file_path,
            "bucket": bucket_name,
            "uploaded": True
        }
    except Exception as e:
        logger.error(f"❌ Error uploading video: {e}")
        return None


async def download_video(bucket_name: str, file_path: str) -> Optional[bytes]:
    """
    Download a video file from Supabase Storage
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path to file in bucket
    
    Returns:
        File bytes or None on error
    """
    try:
        response = get_supabase().storage.from_(bucket_name).download(file_path)
        logger.info(f"✅ Video downloaded: {file_path}")
        return response
    except Exception as e:
        logger.error(f"❌ Error downloading video: {e}")
        return None


async def get_video_url(
    bucket_name: str,
    file_path: str,
    expires_in: int = 3600
) -> Optional[str]:
    """
    Get a signed URL for a video file
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path to file in bucket
        expires_in: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Signed URL string or None on error
    """
    try:
        response = get_supabase().storage.from_(bucket_name).create_signed_url(
            path=file_path,
            expires_in=expires_in
        )
        
        signed_url = response.get('signedURL')
        logger.info(f"✅ Generated signed URL for: {file_path}")
        return signed_url
    except Exception as e:
        logger.error(f"❌ Error creating signed URL: {e}")
        return None


async def get_public_video_url(bucket_name: str, file_path: str) -> Optional[str]:
    """
    Get public URL for a video (bucket must be public)
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path to file in bucket
    
    Returns:
        Public URL string or None on error
    """
    try:
        url = get_supabase().storage.from_(bucket_name).get_public_url(file_path)
        logger.info(f"✅ Generated public URL for: {file_path}")
        return url
    except Exception as e:
        logger.error(f"❌ Error creating public URL: {e}")
        return None


async def list_user_videos(bucket_name: str, user_id: str) -> List[Dict[str, Any]]:
    """
    List all videos for a user
    
    Args:
        bucket_name: Name of the storage bucket
        user_id: User ID
    
    Returns:
        List of file metadata dictionaries
    """
    try:
        response = get_supabase().storage.from_(bucket_name).list(user_id)
        logger.info(f"✅ Listed videos for user: {user_id}")
        return response if response else []
    except Exception as e:
        logger.error(f"❌ Error listing videos: {e}")
        return []


async def delete_video(bucket_name: str, file_path: str) -> bool:
    """
    Delete a video file from storage
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path to file in bucket
    
    Returns:
        True if successful, False otherwise
    """
    try:
        get_supabase().storage.from_(bucket_name).remove([file_path])
        logger.info(f"✅ Video deleted: {file_path}")
        return True
    except Exception as e:
        logger.error(f"❌ Error deleting video: {e}")
        return False


async def move_video(
    bucket_name: str,
    from_path: str,
    to_path: str
) -> bool:
    """
    Move a video file within the same bucket
    
    Args:
        bucket_name: Name of the storage bucket
        from_path: Current file path
        to_path: New file path
    
    Returns:
        True if successful, False otherwise
    """
    try:
        get_supabase().storage.from_(bucket_name).move(from_path, to_path)
        logger.info(f"✅ Video moved: {from_path} -> {to_path}")
        return True
    except Exception as e:
        logger.error(f"❌ Error moving video: {e}")
        return False


# Update the __all__ list at the bottom to include these new functions:
__all__ = [
    # ... existing exports ...
    "upload_video",
    "download_video",
    "get_video_url",
    "get_public_video_url",
    "list_user_videos",
    "delete_video",
    "move_video",
# ]



# __all__ = [
    "get_supabase",
    "get_user_by_id",
    "get_user_by_email", 
    "create_user",
    "update_user",
    "get_all_lessons",
    "get_lesson_by_id",
    "create_lesson",
    "get_quiz_by_lesson",
    "get_quiz_by_id",
    "get_questions_by_quiz",
    "create_quiz",
    "get_user_progress",
    "create_progress",
    "update_progress",
    "query_table",
    "insert_table",
    "update_table",
    "delete_record",
    "upload_video",
    "download_video", 
    "get_video_url",
    "list_user_videos",
    "delete_video",
]
