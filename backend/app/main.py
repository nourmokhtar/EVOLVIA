import os
from dotenv import load_dotenv
import logging

# Load environment variables before anything else
load_dotenv()

logger = logging.getLogger(__name__)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import auth, user, lessons, quizzes, ai_teacher, pitch, collaboration, personality, learn, evaluations
from app.core.config import settings
from app.services.observability.opik_client import opik_client

# Initialize Opik observability at startup
opik_client.configure()
logger.info("Opik observability configured")

app = FastAPI(
    title="Evolvia API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://evolvia-.*\.vercel\.app",
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://evolvia-6u8e.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory and serve static files
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(lessons.router, prefix=f"{settings.API_V1_STR}/lessons", tags=["lessons"])
app.include_router(quizzes.router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["quizzes"])
app.include_router(ai_teacher.router, prefix=f"{settings.API_V1_STR}/ai_teacher", tags=["ai_teacher"])
app.include_router(pitch.router, prefix=f"{settings.API_V1_STR}/pitch", tags=["pitch"])
app.include_router(collaboration.router, prefix=f"{settings.API_V1_STR}/collaboration", tags=["collaboration"])
app.include_router(personality.router, prefix=f"{settings.API_V1_STR}/personality", tags=["personality"])
app.include_router(learn.router, prefix=f"{settings.API_V1_STR}", tags=["learn"])
app.include_router(evaluations.router, prefix=f"{settings.API_V1_STR}/evaluations", tags=["evaluations"])
from app.api import language_improvement
app.include_router(language_improvement.router, prefix=f"{settings.API_V1_STR}/language-improvement", tags=["language_improvement"])

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    return {"detail": "Internal server error"}

@app.get("/")
def root():
    return {"message": "Welcome to Evolvia API"}
