# Database Setup & Initialization

## Overview

The application uses SQLite with SQLModel/SQLAlchemy ORM. The database tables are automatically created when the application starts.

## Automatic Table Creation

**The database tables are now created automatically on startup!**

When you run `python app/main.py`, the application will:
1. Connect to the SQLite database (or create it if it doesn't exist)
2. Read all model definitions
3. Create any missing tables automatically

## Manual Table Creation (Optional)

If you want to manually create the database tables before running the application:

```bash
cd backend
python init_db.py
```

This script will:
- Create the SQLite database file if it doesn't exist
- Create all tables based on the models
- Show you a list of created tables

## Database File Location

The SQLite database file will be created at:
```
backend/virtual_closet.db
```

(Or wherever `DATABASE_URL` points to in your `.env` file)

## Models

The following tables are created:

### 1. **users**
- id (Primary Key)
- email (Unique)
- hashed_password
- full_name
- avatar_url
- personality_profile (JSON)
- learning_goals (JSON)
- created_at
- updated_at

### 2. **lesson**
- (Define based on your Lesson model)

### 3. **quiz**
- (Define based on your Quiz model)

### 4. **question**
- (Define based on your Question model)

### 5. **user_progress**
- (Define based on your UserProgress model)

## Verifying Database Creation

To verify the database was created correctly:

```bash
# List all tables
sqlite3 virtual_closet.db ".tables"

# Check users table schema
sqlite3 virtual_closet.db ".schema users"
```

## If Tables Already Exist

The application will skip creating tables that already exist, so it's safe to restart.

## Resetting the Database

To reset the database and start fresh:

```bash
# Option 1: Delete the database file
rm backend/virtual_closet.db

# Option 2: Drop all tables (using Python)
python
>>> from app.db.session import engine
>>> from sqlmodel import SQLModel
>>> from app.models import *
>>> SQLModel.metadata.drop_all(engine)
```

Then restart the application to create fresh tables.

## Troubleshooting

### Error: "no such table: users"

This means the database tables haven't been created yet.

**Solution**: Run the application, which will automatically create them on startup:
```bash
python app/main.py
```

Or manually create them:
```bash
python init_db.py
```

### Error: "table users already exists"

This is normal if you've run the application before. The application will just skip creating tables that exist.

### Foreign Key Constraint Errors

SQLite foreign key constraints are automatically enabled when the application starts. No configuration needed.

## Database Configuration

To change the database location or type, edit `app/core/config.py`:

```python
# SQLite (default, no setup needed)
DATABASE_URL: str = "sqlite:///./virtual_closet.db"

# PostgreSQL (requires database server)
DATABASE_URL: str = "postgresql://user:password@localhost/database_name"

# MySQL (requires database server)
DATABASE_URL: str = "mysql://user:password@localhost/database_name"
```

## Migrations (Optional)

If you want to use Alembic for migrations in the future:

```bash
# Initialize Alembic
alembic init migrations

# Create migration script
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

Alembic is already in `requirements.txt` if you want to use it.

## Next Steps

After creating the database:

1. ✅ Database initialized
2. Start the application: `python app/main.py`
3. Test the API: `python test_ollama_personality.py`
4. Begin development!

---

For more information, see:
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
