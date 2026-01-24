from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

from dotenv import load_dotenv
load_dotenv()
class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AI Virtual Closet")
    # "AI Virtual Closet"
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    # "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    # "YOUR_SUPER_SECRET_KEY_CHANGE_ME"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    # Database - SQLite by default (no installation needed)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./virtual_closet.db")
    # "sqlite:///./virtual_closet.db"
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # ""

    # AWS S3 (optional - for image storage)
    S3_BUCKET: str = os.getenv("S3_BUCKET", "virtual-closet-assets")
    # "virtual-closet-assets"
    AWS_ACCESS_KEY_ID: str =os.getenv("AWS_ACCESS_KEY_ID", "")
    # ""
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    # ""
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    # "us-east-1"
    
    # Ollama Configuration (for local personality analysis)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    # "http://localhost:11434"
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral:7b-instruct-q4_0")
    # "mistral:7b-instruct-q4_0"
    USE_OLLAMA_FOR_PERSONALITY: bool = os.getenv("USE_OLLAMA_FOR_PERSONALITY", "true").lower() == "true"
    # True
    # Configure Opik for observability and tracing
    opik_api_key:str = os.getenv("OPIK_API_KEY", "KlHeYE6IiENcxZkxf2gAXkc90")
    # "QTidL9OQfdTrl7TQB6CWXpI9t"
    # os.getenv("OPIK_API_KEY")
    opik_project_name:str = os.getenv("OPIK_PROJECT_NAME", "or-ro")
    opik_workspace:str = os.getenv("OPIK_WORKSPACE", "nour-mokhtar-1235")
    # "nour-mokhtar-1235"
    # "evolvia-coaching-platform"
    # os.getenv("OPIK_PROJECT_NAME", "personality-analysis")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
