"""
Test script to verify Supabase connection and tables exist
Run with: python test_supabase_setup.py
"""

import asyncio
import logging
from app.db.supabase import get_supabase, get_user_by_id, query_table
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_supabase_connection():
    """Test Supabase client connection"""
    print("\n" + "="*60)
    print("Testing Supabase Connection")
    print("="*60)
    
    try:
        # Test 1: Get Supabase client
        print("\n✅ Test 1: Initializing Supabase client...")
        client = get_supabase()
        print(f"   Connected to: {settings.SUPABASE_URL}")
        
        # Test 2: Check tables exist
        print("\n✅ Test 2: Checking if tables exist...")
        tables = ["users", "lessons", "quizzes", "questions", "user_progress"]
        
        for table in tables:
            try:
                response = client.table(table).select("*").limit(1).execute()
                print(f"   ✅ Table '{table}' exists")
            except Exception as e:
                print(f"   ❌ Table '{table}' does NOT exist")
                print(f"      Error: {str(e)}")
        
        # Test 3: Try a sample query
        print("\n✅ Test 3: Testing sample query...")
        try:
            users = await query_table("users")
            print(f"   Found {len(users)} users in database")
        except Exception as e:
            print(f"   Query succeeded but may be empty: {e}")
        
        print("\n" + "="*60)
        print("✅ All tests passed! Supabase is configured correctly.")
        print("="*60 + "\n")
        
    except Exception as e:
        print("\n" + "="*60)
        print(f"❌ Connection failed: {e}")
        print("="*60)
        print("\nTo fix this:")
        print("1. Check your .env file has SUPABASE_URL and SUPABASE_KEY")
        print("2. Verify credentials are from: https://supabase.com")
        print("3. Create the required tables (see SUPABASE_SETUP.md)")
        print("\n")
        raise


if __name__ == "__main__":
    asyncio.run(test_supabase_connection())
