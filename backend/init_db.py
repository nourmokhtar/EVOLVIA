"""
Database initialization script.
Run this to manually create all database tables.

Usage:
    python init_db.py
"""

import sys
from app.db.session import engine
from sqlmodel import SQLModel

# Import all models to register them with SQLModel
from app.models import User, Lesson, Quiz, Question, UserProgress

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("✅ Database tables created successfully!")
        print("\nTables created:")
        for table_name in SQLModel.metadata.tables.keys():
            print(f"  • {table_name}")
        return True
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        return False

if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
