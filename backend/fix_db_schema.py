import sqlite3
import sys

db_path = "virtual_closet.db"
print(f"Connecting to {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get columns
    cursor.execute("PRAGMA table_info(learning_sessions)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Current columns in learning_sessions: {columns}")

    # Columns to ensure exist
    # Based on LearningSessionModel I created
    target_columns = {
        "uploaded_file_content": "TEXT",
        "uploaded_file_name": "TEXT",
        "checkpoint_summary": "TEXT",
        "checkpoints": "JSON", # SQLite keeps JSON as TEXT mostly, but let's see
        "history": "JSON"
    }

    for col_name, col_type in target_columns.items():
        if col_name not in columns:
            print(f"Adding missing column: {col_name} ({col_type})")
            try:
                # Add column. Note: SQLite has limited ALTER TABLE support but ADD COLUMN is supported.
                cursor.execute(f"ALTER TABLE learning_sessions ADD COLUMN {col_name} {col_type}")
                print(f"Successfully added {col_name}")
            except Exception as e:
                print(f"Failed to add {col_name}: {e}")
        else:
            print(f"Column {col_name} exists.")

    conn.commit()
    conn.close()
    print("Database patch completed.")

except Exception as e:
    print(f"Database error: {e}")
