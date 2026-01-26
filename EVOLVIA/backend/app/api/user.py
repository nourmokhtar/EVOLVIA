from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.storage import storage_service
from app.models import User
import uuid

router = APIRouter()

@router.get("/me")
def get_me(db: Session = Depends(get_db)):
    try:
        user = db.query(User).first()
        if not user:
            return {
                "id": None,
                "email": "learner@evolvia.ai",
                "full_name": "Evolvia Learner",
                "avatar_url": None
            }
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": getattr(user, 'avatar_url', None)
        }
    except Exception:
        return {
            "id": None,
            "email": "learner@evolvia.ai",
            "full_name": "Evolvia Learner",
            "avatar_url": None
        }

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads the user's avatar."""
    content = await file.read()
    
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")
        
    file_id = str(uuid.uuid4())
    file_name = f"avatar_{file_id}.jpg"
    
    image_url = await storage_service.upload_file(content, file_name, file.content_type)
    
    user.avatar_url = image_url
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"avatar_url": image_url}
