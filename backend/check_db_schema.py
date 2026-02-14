import sqlite3
import os

db_path = 'virtual_closet.db'

if not os.path.exists(db_path):
    print(f"Database file {db_path} not found.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(learning_sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Columns in learning_sessions: {columns}")
        if 'custom_title' in columns:
            print("SUCCESS: custom_title column exists.")
        else:
            print("FAILURE: custom_title column MISSING.")
        conn.close()
    except Exception as e:
        print(f"Error checking DB: {e}")
