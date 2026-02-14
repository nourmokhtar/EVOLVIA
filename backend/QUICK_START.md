# 🚀 Quick Start - Supabase Only Backend

**Your backend now uses Supabase client exclusively.** No SQLAlchemy, no local DB needed.

## ⚡ 5-Minute Setup

### 1️⃣ Create Supabase Project (2 min)
```
Go to: https://supabase.com
Click: Create a new project
Save: Project URL and anon key
```

### 2️⃣ Create `.env` (1 min)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_URL=postgresql://postgres.[id]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
MAX_PASSWORD_LENGTH=72
```

### 3️⃣ Create Database Tables (1 min)
1. Open Supabase SQL editor
2. Copy-paste **all SQL scripts** from [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
3. Click Run

### 4️⃣ Install & Start (1 min)
```bash
pip install -r requirements.txt
python test_supabase_setup.py      # Verify connection
uvicorn app.main:app --reload      # Start server
```

That's it! 🎉

## 📚 Documentation

- **Complete Setup:** [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- **What Changed:** [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)
- **Full Checklist:** [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)

## 🧪 Test It

```bash
# Signup
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🆘 Common Issues

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| `SUPABASE_URL not configured` | Check .env file and restart server |
| `Relation does not exist` | Run SQL scripts in Supabase dashboard |
| `Unauthorized` | Use anon key, not service role key |

## ✨ What You Get

✅ Direct REST API calls (no ORM overhead)  
✅ Simple async/await database operations  
✅ Automatic connection pooling  
✅ Built-in authentication support  
✅ Real-time capabilities ready  
✅ Easy to understand and maintain  

## 🎯 Your Database Functions

All in `app/db/supabase.py`:

```python
# Users
await get_user_by_id(user_id)
await get_user_by_email(email)
await create_user(user_data)
await update_user(user_id, user_data)

# Content
await get_all_lessons()
await get_quiz_by_lesson(lesson_id)

# Generic (for any table)
await query_table(table_name, filters)
await insert_table(table_name, data)
await update_table(table_name, filters, data)
```

---

✅ **Next:** Open [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for complete instructions.

**Questions?** Check the relevant docs - they have detailed instructions and troubleshooting!
