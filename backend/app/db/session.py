# from sqlalchemy import create_engine, event
# from sqlalchemy.orm import sessionmaker
# from app.core.config import settings
# from app.db.supabase import get_supabase, get_user_by_id, get_user_by_email

# # SQLite needs special handling for foreign keys
# # connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# # engine = create_engine(
# #     settings.DATABASE_URL,
# #     connect_args=connect_args
# # )

# # # Enable foreign keys for SQLite
# # if settings.DATABASE_URL.startswith("sqlite"):
# #     @event.listens_for(engine, "connect")
# #     def set_sqlite_pragma(dbapi_connection, connection_record):
# #         cursor = dbapi_connection.cursor()
# #         cursor.execute("PRAGMA foreign_keys=ON")
# #         cursor.close()

# # SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# def get_db():
#     db = get_supabase()
#     try:
#         yield db
#     finally:
#         db.close()
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

    