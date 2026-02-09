import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import auth, user, lessons, quizzes, ai_teacher, pitch, collaboration, personality
from app.core.config import settings

app = FastAPI(
    title="Evolvia API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory and serve static files
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
from app.core.security import get_current_user

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"], dependencies=[Depends(get_current_user)])
app.include_router(lessons.router, prefix=f"{settings.API_V1_STR}/lessons", tags=["lessons"], dependencies=[Depends(get_current_user)])
app.include_router(quizzes.router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["quizzes"], dependencies=[Depends(get_current_user)])
app.include_router(ai_teacher.router, prefix=f"{settings.API_V1_STR}/ai_teacher", tags=["ai_teacher"], dependencies=[Depends(get_current_user)])

app.include_router(pitch.router, prefix=f"{settings.API_V1_STR}/pitch", tags=["pitch"], dependencies=[Depends(get_current_user)])
app.include_router(collaboration.router, prefix=f"{settings.API_V1_STR}/collaboration", tags=["collaboration"], dependencies=[Depends(get_current_user)])
app.include_router(personality.router, prefix=f"{settings.API_V1_STR}/personality", tags=["personality"], dependencies=[Depends(get_current_user)])

@app.get("/")
def root():
    return {"message": "Welcome to Evolvia API"}



