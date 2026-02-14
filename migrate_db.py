import sqlite3
import os

DB_PATH = "backend/virtual_closet.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Nothing to migrate.")
        return

    print(f"Migrating database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check existing columns
        cursor.execute("PRAGMA table_info(learning_sessions)")
        columns = [info[1] for info in cursor.fetchall()]
        print("Existing columns:", columns)

        if "quizzes" not in columns:
            print("Adding 'quizzes' column...")
            cursor.execute("ALTER TABLE learning_sessions ADD COLUMN quizzes JSON DEFAULT '[]'")
        else:
            print("'quizzes' column already exists.")

        if "flashcards" not in columns:
            print("Adding 'flashcards' column...")
            cursor.execute("ALTER TABLE learning_sessions ADD COLUMN flashcards JSON DEFAULT '[]'")
        else:
            print("'flashcards' column already exists.")

        conn.commit()
        print("✅ Migration complete.")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
