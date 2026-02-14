# Supabase Database Setup Guide

## Overview
Your backend now uses **Supabase exclusively** - no SQLAlchemy or traditional ORM. All database operations go through the Supabase Python client.

## Step 1: Create Supabase Tables

Login to your Supabase dashboard and create these tables using SQL:

### Users Table
```sql
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Lessons Table
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  skill_type TEXT CHECK (skill_type IN ('soft', 'hard')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_skill_type ON lessons(skill_type);
```

### Quizzes Table
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
```

### Questions Table
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB,
  correct_option TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
```

### User Progress Table
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT,
  content_type TEXT,
  score NUMERIC,
  status TEXT DEFAULT 'in_progress',
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
```

## Step 2: Environment Variables

Create a `.env` file in your `backend/` directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Database (for connection pooling if needed)
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Auth
SECRET_KEY=your-secret-key-change-me
ALGORITHM=HS256
MAX_PASSWORD_LENGTH=72
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Optional: Other services
GEMINI_API_KEY=your-key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-q4_0
```

## Step 3: Update Your Application Code

All database operations now use the Supabase client. Here's how:

### In API Endpoints:
```python
from fastapi import APIRouter, Depends
from app.db.supabase import get_user_by_email, create_user
from app.core.security import get_current_user

@router.post("/signup")
async def signup(user_data: UserCreate):
    # Check existing user
    existing = await get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    new_user = await create_user({
        "id": str(uuid4()),
        "email": user_data.email,
        "hashed_password": hash_password(user_data.password),
        "full_name": user_data.full_name,
    })
    return new_user
```

### Available Helper Functions:

```python
from app.db.supabase import (
    get_supabase,                # Get raw Supabase client
    get_user_by_id,             # Fetch user by ID
    get_user_by_email,          # Fetch user by email
    create_user,                # Create new user
    update_user,                # Update user
    get_all_lessons,            # Fetch all lessons
    get_lesson_by_id,           # Fetch lesson
    get_quiz_by_lesson,         # Get quiz for lesson
    get_questions_by_quiz,      # Get questions
    get_user_progress,          # Get user progress
    query_table,                # Generic query
    insert_table,               # Generic insert
    update_table,               # Generic update
    delete_record,              # Generic delete
)
```

## Step 4: Base Behavior

The Supabase client automatically:
- ✅ Handles authentication using your SUPABASE_KEY
- ✅ Manages connection pooling
- ✅ Converts JSON responses to Python dictionaries
- ✅ Handles errors and timeouts
- ✅ No need to manage sessions or commits

## Step 5: Testing

Test your setup:

```bash
cd backend
python -c "from app.db.supabase import get_supabase; db = get_supabase(); print('✅ Connected to Supabase!')"
```

## Old SQLAlchemy Code Removed

The following were removed to use only Supabase:
- ❌ `SQLAlchemy` ORM
- ❌ `SQLModel` models
- ❌ Database sessions and transaction management
- ❌ SQLAlchemy query builders

All replaced with simple, async Supabase operations.

## Troubleshooting

### "Tenant or user not found"
- Check your `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Verify they match your Supabase project

### "Relation does not exist"
- Run the SQL scripts above to create all tables
- Check table names match exactly

### "Unauthorized"
- Ensure your `SUPABASE_KEY` is the **anon/public key**, not the service role key
- Get it from Settings > API > Project API Keys

## Next Steps

Your app is now ready to:
1. Run migrations as needed using Supabase SQL editor
2. Scale to production with Supabase's managed PostgreSQL
3. Use Supabase Auth if you add authentication later
4. Use Supabase Storage for file uploads
