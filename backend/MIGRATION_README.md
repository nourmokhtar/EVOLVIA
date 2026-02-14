# Evolvia AI Learning Platform - Migration to Supabase

## 📋 Overview

This document details the complete migration process of the **Evolvia AI Learning Platform** backend from SQLAlchemy ORM to **Supabase client** (PostgreSQL REST API). The migration was completed on February 8, 2026.

---

## 🎯 Project Summary

**Evolvia** is an AI-powered learning platform that teaches soft and hard skills through:
- Personalized lessons and quizzes
- AI-powered personality analysis (via Ollama)
- Pitch analysis and feedback
- Collaboration simulations
- Real-time progress tracking

**Tech Stack After Migration:**
- Backend: FastAPI (Python)
- Database: Supabase (PostgreSQL)
- AI Services: Ollama, Google Gemini
- Frontend: Next.js (React)
- Observability: Opik

---

## 🔄 Migration Process

### Phase 1: Supabase Setup & Configuration

#### Step 1.1: Add Supabase Dependencies
**File:** `requirements.txt`

Added Supabase libraries:
```
supabase
python-gotrue
```

Removed SQLAlchemy dependencies:
- ❌ `sqlalchemy`
- ❌ `sqlmodel`
- ❌ `alembic`
- ❌ `psycopg-binary`
- ❌ `psycopg`

#### Step 1.2: Update Configuration
**File:** `app/core/config.py`

Added Supabase settings:
```python
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
```

Updated `DATABASE_URL` to PostgreSQL format for connection pooling (if needed):
```
postgresql://postgres.[project]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

#### Step 1.3: Create Database Schema
**Supabase SQL Editor:**

Created 5 core tables with proper constraints:

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  personality_profile JSONB DEFAULT '{}'::jsonb,
  learning_goals JSONB DEFAULT '[]'::jsonb,
  streak INTEGER DEFAULT 0,
  last_active TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons Table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  skill_type TEXT CHECK (skill_type IN ('soft', 'hard')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes Table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB,
  correct_option TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Progress Table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT,
  content_type TEXT,
  score NUMERIC,
  status TEXT DEFAULT 'in_progress',
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Phase 2: Database Access Layer Migration

#### Step 2.1: Create Supabase Helper Module
**File:** `app/db/supabase.py` (NEW)

Created comprehensive helper module with 20+ functions:

**User Operations:**
- `get_user_by_id()` - Fetch user by UUID
- `get_user_by_email()` - Fetch user by email
- `create_user()` - Create new user with timestamps
- `update_user()` - Update user profile

**Lesson Operations:**
- `get_all_lessons()` - Fetch all lessons (with optional skill_type filter)
- `get_lesson_by_id()` - Fetch specific lesson

**Quiz Operations:**
- `get_quiz_by_lesson()` - Get quiz for a lesson
- `get_quiz_by_id()` - Get quiz by ID
- `get_questions_by_quiz()` - Get questions for quiz

**Progress Tracking:**
- `get_user_progress()` - Get user's progress records
- `create_progress()` - Create progress record
- `update_progress()` - Update progress record

**Generic Operations:**
- `query_table()` - Generic SELECT queries
- `insert_table()` - Generic INSERT operations
- `update_table()` - Generic UPDATE operations
- `delete_record()` - Generic DELETE operations

**Key Feature:** Automatic timestamp handling
```python
async def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if "created_at" not in user_data:
        user_data["created_at"] = datetime.utcnow().isoformat()
    if "updated_at" not in user_data:
        user_data["updated_at"] = datetime.utcnow().isoformat()
```

#### Step 2.2: Update Session Module
**File:** `app/db/session.py`

Simplified to provide Supabase client via dependency injection:
```python
def get_db() -> Client:
    return get_supabase()
```

---

### Phase 3: API Endpoint Migration

#### Step 3.1: Authentication Endpoints
**File:** `app/api/auth.py`

**Changes:**
- Signup: Uses `create_user()` with auto-timestamp
- Login: Uses `get_user_by_email()` and JWT generation
- Debug endpoint: Queries Supabase table

```python
@router.post("/signup", response_model=UserOut)
async def signup(user_in: UserCreate):
    existing_user = await get_user_by_email(user_in.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_data = {
        "id": str(uuid4()),
        "email": user_in.email,
        "hashed_password": security.get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "personality_profile": {},
        "learning_goals": [],
        "streak": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    db_user = await create_user(user_data)
    return db_user
```

#### Step 3.2: User Management
**File:** `app/api/user.py`

- Profile endpoints now use `get_user_by_id()` and `update_user()`
- Avatar upload stores URL in Supabase
- Progress retrieval uses `query_table()`

#### Step 3.3: Content Endpoints
**Files:** `app/api/lessons.py`, `app/api/quizzes.py`

- Replaced hardcoded mock data with Supabase queries
- `get_lessons()` → `await get_all_lessons()`
- `get_lesson_by_id()` → `await get_lesson_by_id(lesson_id)`
- `get_quiz_by_lesson()` → Real database queries
- `get_questions_by_quiz()` → Fetch from questions table

#### Step 3.4: AI Features
**Files:** `app/api/ai_teacher.py`, `app/api/pitch.py`, `app/api/collaboration.py`

- All endpoints verify user existence before processing
- Use `get_user_by_id()` for validation
- Remove unused `db: Session` parameters

---

### Phase 4: Security & Authentication Fix

#### Step 4.1: Update Get Current User
**File:** `app/core/security.py`

Changed from SQLAlchemy query to Supabase:
```python
# ❌ Before
user = db.query(User).filter(User.id == user_id).first()

# ✅ After
user = asyncio.run(get_user_by_id(user_id))
```

Removed imports:
- ❌ `from sqlalchemy.orm import Session`
- ❌ `from app.db.session import get_db`

---

### Phase 5: Service Layer Migration

#### Step 5.1: Learning Service
**File:** `app/services/learning_service.py`

Updated to use Supabase helpers:
```python
class LearningService:
    async def get_lessons(self, skill_type: Optional[str] = None):
        return await get_all_lessons(skill_type)
    
    async def get_user_progress(self, user_id: str):
        return await query_table("user_progress", {"user_id": user_id})
    
    async def track_progress(self, user_id: str, content_id: str, ...):
        progress_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "content_id": content_id,
            "created_at": datetime.utcnow().isoformat(),
        }
        return await create_progress(progress_data)
```

#### Step 5.2: Personality Service
**File:** `app/services/personality_service.py`

**Major Rewrite:**
- Removed all SQLAlchemy imports and mutations
- Changed `analyze_and_update_personality()` signature:
  - ❌ `db: Session, user: User` → ✅ `user: dict`
- Updated `update_score()` to use Supabase:
  ```python
  async def update_score(self, user: dict, trait: str, delta: int) -> dict:
      profile = user.get("personality_profile") or {}
      profile = dict(profile)
      current = profile.get(trait, 50)
      profile[trait] = max(0, min(100, current + delta))
      
      user_id = user.get("id")
      update_data = {
          "personality_profile": profile,
          "updated_at": datetime.utcnow().isoformat()
      }
      
      updated_user = await update_user(user_id, update_data)
      return updated_user or user
  ```
- Streak calculation moved from ORM to manual logic

---

### Phase 6: Main Application Setup

#### Step 6.1: Remove SQLAlchemy Initialization
**File:** `app/main.py`

Removed:
- ❌ `from app.db.session import engine`
- ❌ `from sqlmodel import SQLModel`
- ❌ Startup event for `SQLModel.metadata.create_all(engine)`

---

## 🐛 Issues Found & Fixed

### Issue 1: Timestamp Not Null Constraint
**Error:**
```
null value in column "created_at" violates not-null constraint
```

**Root Cause:** Supabase PostgreSQL requires explicit timestamps (no auto-generation on client).

**Solution:** Updated all `create_*` functions in `supabase.py` to auto-add timestamps.

**Files Fixed:**
- `app/db/supabase.py` - All create functions
- `app/api/auth.py` - Signup endpoint

### Issue 2: Dictionary vs Model Object
**Error:**
```
AttributeError: 'dict' object has no attribute 'id'
```

**Root Cause:** After Supabase migration, user objects are dictionaries, not ORM models.

**Solution:** Replace all `object.attribute` with `object.get("attribute")`.

**Files Fixed:**
- `app/api/personality.py` - All dictionary accesses
- `app/services/personality_service.py` - Complete rewrite of methods
- `app/core/security.py` - Database access pattern

---

## 📁 Complete File Inventory

### Configuration
- ✅ `app/core/config.py` - Added SUPABASE_URL, SUPABASE_KEY
- ✅ `app/core/security.py` - Updated get_current_user()
- ✅ `requirements.txt` - Removed SQLAlchemy, added Supabase

### Database Layer
- ✅ `app/db/session.py` - Simplified to return Supabase client
- ✅ `app/db/supabase.py` - NEW: Comprehensive Supabase helpers

### API Endpoints
- ✅ `app/api/auth.py` - Signup/login with Supabase
- ✅ `app/api/user.py` - Profile management with Supabase
- ✅ `app/api/lessons.py` - Real database queries
- ✅ `app/api/quizzes.py` - Quiz/question queries
- ✅ `app/api/ai_teacher.py` - User verification with Supabase
- ✅ `app/api/pitch.py` - User verification with Supabase
- ✅ `app/api/collaboration.py` - User verification with Supabase
- ✅ `app/api/personality.py` - Dictionary access patterns

### Services
- ✅ `app/services/learning_service.py` - Updated for Supabase
- ✅ `app/services/personality_service.py` - Major rewrite for Supabase
- ✅ `app/services/ai_service.py` - No changes needed
- ✅ `app/services/storage.py` - No changes needed

### Main Application
- ✅ `app/main.py` - Removed SQLAlchemy startup

### Documentation (NEW)
- ✅ `QUICK_START.md` - 5-minute setup guide
- ✅ `SUPABASE_SETUP.md` - Complete database setup
- ✅ `MIGRATION_SUMMARY.md` - High-level overview
- ✅ `SETUP_CHECKLIST.md` - Step-by-step checklist
- ✅ `TIMESTAMP_FIX.md` - Timestamp handling guide
- ✅ `DICT_ATTRIBUTE_ERROR_FIX.md` - Dictionary access fix
- ✅ `MIGRATION_README.md` - This file

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Environment
Create `.env` in `backend/`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_URL=postgresql://postgres.[id]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SECRET_KEY=your-secret-key
ALGORITHM=HS256
MAX_PASSWORD_LENGTH=72
GEMINI_API_KEY=your-key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-q4_0
USE_OLLAMA_FOR_PERSONALITY=true
OPIK_API_KEY=your-key
OPIK_PROJECT_NAME=your-project
OPIK_WORKSPACE=your-workspace
```

### 3. Start Server
```bash
uvicorn app.main:app --reload
```

Server runs on `http://localhost:8000`
Docs available at `http://localhost:8000/docs`

---

## 🧪 Testing

### Test User Signup
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123",
    "full_name": "Test User"
  }'
```

### Test User Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123"
  }'
```

### Test Protected Endpoint
```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Verify Database Connection
```bash
python test_supabase_setup.py
```

---

## 📊 Migration Statistics

| Metric | Count |
|--------|-------|
| Files Modified | 15 |
| Files Created | 7 (docs) + 1 (supabase.py) |
| API Endpoints Updated | 8 |
| Services Updated | 2 |
| Database Tables Created | 5 |
| Helper Functions Added | 20+ |
| Issues Fixed | 2 |
| Tests Passed | ✅ |

---

## 🔑 Key Improvements

### Before (SQLAlchemy)
- ❌ Complex ORM models
- ❌ Migration files to manage
- ❌ Session management required
- ❌ Difficult to understand DB operations
- ❌ Tight coupling to local database

### After (Supabase)
- ✅ Simple async functions
- ✅ Cloud-managed database
- ✅ No session management
- ✅ Clear REST API operations
- ✅ Scalable cloud infrastructure
- ✅ Built-in authentication ready
- ✅ Real-time capabilities available

---

## 📝 Code Patterns Established

### Creating Records
```python
user_data = {
    "id": str(uuid4()),
    "email": user_in.email,
    "hashed_password": hash,
    "created_at": datetime.utcnow().isoformat(),
    "updated_at": datetime.utcnow().isoformat(),
}
user = await create_user(user_data)
```

### Fetching Records
```python
user = await get_user_by_id(user_id)
if not user:
    raise HTTPException(status_code=404, detail="User not found")
```

### Updating Records
```python
update_data = {
    "personality_profile": profile,
    "updated_at": datetime.utcnow().isoformat()
}
await update_user(user_id, update_data)
```

### Generic Queries
```python
lessons = await query_table("lessons", {"skill_type": "soft"})
```

---

## ✅ Checklist for Future Development

When adding new features:

- [ ] Use only Supabase client (`app/db/supabase.py`)
- [ ] All `current_user` access via `.get()` method
- [ ] Include timestamps on all create operations
- [ ] Use helper functions in `supabase.py`
- [ ] No direct `.table()` calls in endpoints
- [ ] Test with `test_supabase_setup.py` first
- [ ] Document new database operations

---

## 🎓 Learning Resources

- [Supabase Python Client Docs](https://supabase.com/docs/reference/python)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [FastAPI Async](https://fastapi.tiangolo.com/async-concurrency/)
- [PostgreSQL JSON](https://www.postgresql.org/docs/current/datatype-json.html)

---

## 📞 Support

For issues during setup:
1. Check [SUPABASE_SETUP.md](SUPABASE_SETUP.md) troubleshooting section
2. Run `python test_supabase_setup.py` to verify connection
3. Check logs in Supabase dashboard
4. Verify `.env` variables are correct

---

## 🎉 Conclusion

The **Evolvia AI Learning Platform** backend has been successfully migrated from SQLAlchemy ORM to **Supabase client**, providing:

- ✅ Simpler codebase
- ✅ Cloud-managed scalability
- ✅ No database migrations
- ✅ Clear async API patterns
- ✅ Ready for production deployment

**Status:** ✅ **COMPLETE & TESTED**

---

**Last Updated:** February 8, 2026  
**Migrated By:** AI Assistant  
**Backend Version:** Supabase Client v1.0
