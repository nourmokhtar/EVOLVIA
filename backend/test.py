
from app.core.config import settings
from supabase import create_client, Client
from supabase.client import ClientOptions
import logging

logger = logging.getLogger(__name__)
DATABASE_URL="postgresql://postgres.dwixcmrmtvuunploqdww:7I74gdD9UXBkoUUh@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

SUPABASE_URL="https://dwixcmrmtvuunploqdww.supabase.co"
SUPABASE_KEY="sb_publishable_EYavPAqC9BUQv1-QKs5VbA_jnZ8FWGl"
# Initialize Supabase client if credentials are available
supabase_client: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        supabase_client = create_client(
            SUPABASE_URL,
            SUPABASE_KEY,
            options=ClientOptions(
                postgrest_client_timeout=10,
                storage_client_timeout=10,
                schema="public",
            )
        )
        logger.info("Supabase client initialized successfully")
        print("✅ Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        print(f"❌ Failed to initialize Supabase client: {e}")  
else:
    logger.warning("SUPABASE_URL or SUPABASE_KEY not configured")

    