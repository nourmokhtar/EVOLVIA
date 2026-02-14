import sqlite3

try:
    conn = sqlite3.connect('virtual_closet.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE learning_sessions ADD COLUMN custom_title TEXT")
    conn.commit()
    print("Migration successful: Added custom_title column.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column custom_title already exists.")
    else:
        print(f"Migration error: {e}")
finally:
    if conn:
        conn.close()
