from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AI Virtual Closet")
    # "AI Virtual Closet"
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    # "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    # "YOUR_SUPER_SECRET_KEY_CHANGE_ME"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    # Database - Supabase PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/virtual_closet")
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    # Postgres environment variables - support multiple common names and sensible defaults
    # _pg_user = os.getenv("POSTGRES_USER") or os.getenv("POSTGRES_USER")
    # _pg_password = os.getenv("POSTGRES_PASSWORD") or os.getenv("POSTGRES_PASSWORD")
    # _pg_host = os.getenv("POSTGRES_HOST") or os.getenv("POSTGRES_SERVER") or "localhost"
    # _pg_port = os.getenv("POSTGRES_PORT") or os.getenv("POSTGRES_PORT") or "5432"
    # _pg_db = os.getenv("POSTGRES_DB") or "fastapi_db"

    # POST_DATABASE_URL: str = (
    #     f"postgresql+psycopg://{_pg_user}:{_pg_password}@{_pg_host}:{_pg_port}/{_pg_db}"
    # )

    # MongoDB support removed — no Mongo configuration
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
   
    # os.getenv("OPIK_API_KEY")
    opik_project_name:str = os.getenv("OPIK_PROJECT_NAME", "or-ro")
    opik_workspace:str = os.getenv("OPIK_WORKSPACE", "test")
    # "nour-mokhtar-1235"
    # "evolvia-coaching-platform"


    # In your Settings class, add these fields:

    # ESPRIT API Configuration
    USE_ESPRIT_FOR_PERSONALITY: bool = Field(
        default=False, 
        env="USE_ESPRIT_FOR_PERSONALITY"
    )
    ESPRIT_API_KEY: str = Field(
        default="", 
        env="ESPRIT_API_KEY"
    )
    ESPRIT_BASE_URL: str = Field(
        default="", 
        env="ESPRIT_BASE_URL"
    )
    ESPRIT_MODEL: str = Field(
        default="gpt-4", 
        env="ESPRIT_MODEL"
    )



    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

print("📌 Chargement des variables d'environnement...")
settings = Settings()
print(f"settings :{settings}")
