import sys
import os
import asyncio
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from app.db.session import engine
from sqlmodel import Session, select, SQLModel
from app.models.learning_session import LearningSessionModel

def init_db():
    SQLModel.metadata.create_all(engine)

def verify_persistence():
    print("🔄 Verifying Persistence...")
    
    # Create a dummy session ID
    session_id = "test-persistence-" + datetime.now().strftime("%H%M%S")
    
    with Session(engine) as db:
        # 1. Create
        print(f"Creating session {session_id}...")
        session = LearningSessionModel(
            session_id=session_id,
            lesson_id="test-lesson",
            status="active",
            quizzes=[{"id": 1, "score": 10}],  # Dummy quiz data
            flashcards=[{"front": "A", "back": "B"}] # Dummy flashcard data
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print("✅ Session created.")
        
        # 2. Read back
        print("Reading back session...")
        statement = select(LearningSessionModel).where(LearningSessionModel.session_id == session_id)
        result = db.exec(statement).first()
        
        if not result:
            print("❌ Session not found!")
            return
            
        print(f"Retrieved Quizzes: {result.quizzes}")
        print(f"Retrieved Flashcards: {result.flashcards}")
        
        if result.quizzes == [{"id": 1, "score": 10}] and result.flashcards == [{"front": "A", "back": "B"}]:
            print("✅ Persistence verified: Data matches!")
        else:
            print("❌ Data mismatch!")
            
        # 3. Cleanup
        db.delete(result)
        db.commit()
        print("✅ Cleanup done.")

if __name__ == "__main__":
    verify_persistence()
