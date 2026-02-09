"""
Database session module - provides Supabase client for dependency injection
"""

from app.db.supabase import get_supabase
from supabase import Client
import logging

logger = logging.getLogger(__name__)


def get_db() -> Client:
    """
    Dependency function to provide Supabase client to FastAPI routes.
    
    Usage:
        @router.get("/endpoint")
        async def my_endpoint(db: Client = Depends(get_db)):
            # db is now the Supabase client
            data = db.table("users").select("*").execute()
    """
    return get_supabase()


__all__ = ["get_db"]

    