# Fix: Timestamp Handling in Supabase Operations

## Problem
When creating records in Supabase, we were getting:
```
null value in column "created_at" violates not-null constraint
```

This happened because Supabase PostgreSQL requires `created_at` and `updated_at` fields to be explicitly provided when inserting records (they don't auto-generate on the client side).

## Solution

### Updated Functions
All record creation functions now automatically add timestamps if not provided:

✅ `create_user()` - Adds timestamps when creating user  
✅ `create_lesson()` - Adds timestamps when creating lesson  
✅ `create_quiz()` - Adds timestamps when creating quiz  
✅ `create_progress()` - Adds timestamps when creating progress  

### How It Works

```python
async def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        from datetime import datetime
        
        # Automatically add timestamps if missing
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.utcnow().isoformat()
        if "updated_at" not in user_data:
            user_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = get_supabase().table("users").insert(user_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return None
```

### Usage in Endpoints

The helper functions handle timestamps automatically:

```python
@router.post("/signup")
async def signup(user_in: UserCreate):
    user_data = {
        "id": str(uuid4()),
        "email": user_in.email,
        "hashed_password": security.get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "personality_profile": {},
        "learning_goals": [],
        "streak": 0,
        # These are now added automatically:
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    db_user = await create_user(user_data)
    return db_user
```

## Files Updated

✅ `app/db/supabase.py`
- Updated `create_user()`
- Updated `create_lesson()`
- Updated `create_quiz()`
- Updated `create_progress()`

✅ `app/api/auth.py`
- Updated `signup()` to include timestamps in user_data

✅ `app/services/learning_service.py`
- Already includes timestamps (no changes needed)

## Testing

Try signing up again:

```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123",
    "full_name": "Test User"
  }'
```

Should now work without timestamp errors! ✅

## Important Notes for Future Development

### When Creating Records:

✅ **DO** - Include timestamps (helper functions add them automatically):
```python
user_data = {
    "email": "user@example.com",
    "hashed_password": hash,
    "full_name": "Name",
    # Let create_user() add these:
    # "created_at": ...,
    # "updated_at": ...,
}
await create_user(user_data)
```

✅ **DO** - Use Supabase helper functions:
```python
await create_user(data)
await create_lesson(data)
await create_progress(data)
```

❌ **DON'T** - Use raw `.insert()` without timestamps:
```python
get_supabase().table("users").insert(data).execute()  # ❌ Will fail!
```

### All Tables Require Timestamps

These tables all have `created_at` NOT NULL constraints:
- `users`
- `lessons`
- `quizzes`
- `user_progress`

The helper functions in `app/db/supabase.py` handle this automatically.

## Timezone Note

All timestamps use UTC (Coordinated Universal Time) in ISO 8601 format:
```python
datetime.utcnow().isoformat()
# Example: "2026-02-08T14:30:45.123456"
```

This ensures consistency across all records regardless of server location.
