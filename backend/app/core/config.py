from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Virtual Closet"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-256bit-minimum")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database - SQLite by default (no installation needed)
    DATABASE_URL: str = "sqlite:///./virtual_closet.db"
    
    # Gemini API Key
    GEMINI_API_KEY: str = ""

    # AWS S3 (optional - for image storage)
    S3_BUCKET: str = "virtual-closet-assets"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # Token Factory (Internal ESPRIT LLM)
    TOKEN_FACTORY_KEY: str = ""
    TOKEN_FACTORY_URL: str = "https://tokenfactory.esprit.tn/api"
    TOKEN_FACTORY_MODEL: str = "hosted_vllm/Llama-3.1-70B-Instruct"

    # Groq API Key (for agents)
    GROQ_API_KEY: str = ""

    # LLM Provider
    LLM_PROVIDER: str = "token_factory"

    # Supabase Configuration (for video storage and optional cloud database)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET_NAME: str = "vid"

    # Ollama Configuration (for personality analysis)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
