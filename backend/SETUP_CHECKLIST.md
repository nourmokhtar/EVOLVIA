# ✅ Supabase Migration Checklist

Complete this checklist to get your backend running with **Supabase only**.

## Phase 1: Setup (15 minutes)

- [ ] Read [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) for overview
- [ ] Read [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions
- [ ] Go to https://supabase.com and create a free project
- [ ] Get your credentials from Settings > API:
  - [ ] SUPABASE_URL (project URL)
  - [ ] SUPABASE_KEY (anon/public key)
  - [ ] DATABASE_URL (connection string for pooler)

## Phase 2: Environment (5 minutes)

- [ ] Create `.env` file in `backend/` directory
- [ ] Add all required variables from SUPABASE_SETUP.md
- [ ] Verify `.env` is in `.gitignore` (don't commit secrets!)

## Phase 3: Database Setup (10 minutes)

- [ ] Go to your Supabase dashboard SQL editor
- [ ] Copy-paste all SQL scripts from SUPABASE_SETUP.md
  - [ ] Users table
  - [ ] Lessons table
  - [ ] Quizzes table
  - [ ] Questions table
  - [ ] User Progress table
- [ ] Click "Run" to create all tables
- [ ] Verify tables appear in "Tables" sidebar

## Phase 4: Dependencies (5 minutes)

- [ ] Open terminal in `backend/` directory
- [ ] Run: `pip install -r requirements.txt`
- [ ] Wait for installation to complete

## Phase 5: Verification (5 minutes)

- [ ] Run: `python test_supabase_setup.py`
- [ ] Should see ✅ for all tests
- [ ] If any ❌, check the error message and SUPABASE_SETUP.md

## Phase 6: Start Server (2 minutes)

- [ ] Run: `uvicorn app.main:app --reload`
- [ ] Should see startup messages without errors
- [ ] Backend is running on http://localhost:8000

## Phase 7: Test Endpoints (10 minutes)

### Test Signup
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123",
    "full_name": "Test User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123"
  }'
```

### Test Protected Endpoint
Copy the token from login response, then:
```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ✅ Done!

Your backend now uses **Supabase only** - no SQLAlchemy, no local database. 

All data is stored in your Supabase project and accessible via REST API.

## 🆘 If Something Goes Wrong

1. **"ModuleNotFoundError: No module named..."**
   - Did you run `pip install -r requirements.txt`?

2. **"SUPABASE_URL or SUPABASE_KEY not configured"**
   - Check your `.env` file exists and has these variables
   - Restart the server after updating `.env`

3. **"Relation/table does not exist"**
   - Did you run all SQL scripts in SUPABASE_SETUP.md?
   - Check table names in Supabase dashboard

4. **"Unauthorized" or "Tenant not found"**
   - Verify SUPABASE_KEY is the "anon/public" key, not service role
   - Check SUPABASE_URL doesn't have trailing slashes

5. **Still stuck?**
   - Check the error message carefully
   - Look in SUPABASE_SETUP.md > Troubleshooting section
   - Check logs for more details

---

**Remember:** This is the **Supabase-only version**. All database operations go through the Supabase client at `app/db/supabase.py`.

No SQLAlchemy. No migrations. Just simple, direct database operations! 🚀
