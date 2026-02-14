from app.db.session import SessionLocal
from app.models.learning_session import LearningSessionModel
from sqlalchemy import text

def count_sessions():
    with SessionLocal() as db:
        count = db.query(LearningSessionModel).count()
        print(f"Total sessions in DB: {count}")
        
        # Print the last 5 created_at times to see if any are recent
        sessions = db.query(LearningSessionModel).order_by(LearningSessionModel.created_at.desc()).limit(5).all()
        for s in sessions:
            print(f"Session {s.session_id[:8]}... created at {s.created_at}")

if __name__ == "__main__":
    count_sessions()
