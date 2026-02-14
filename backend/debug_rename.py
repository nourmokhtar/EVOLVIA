import requests
import json

BASE_URL = "http://localhost:8000/api/v1/learn"

# 1. List sessions to get an ID
try:
    print("Fetching sessions...")
    res = requests.get(f"{BASE_URL}/sessions")
    res.raise_for_status()
    sessions = res.json()
    if not sessions:
        print("No sessions found to test rename.")
        exit(0)
    
    session_id = sessions[0]["session_id"]
    print(f"Testing rename on session: {session_id}")

    # 2. Rename
    new_title = "Test Rename Script"
    print(f"Sending PATCH to rename to '{new_title}'...")
    res = requests.patch(
        f"{BASE_URL}/sessions/{session_id}",
        json={"title": new_title}
    )
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    res.raise_for_status()

    # 3. Verify
    print("Verifying rename...")
    res = requests.get(f"{BASE_URL}/sessions")
    sessions = res.json()
    updated = next(s for s in sessions if s["session_id"] == session_id)
    print(f"New title is: '{updated['summary']}'")
    if updated['summary'] == new_title:
        print("SUCCESS: Rename verified.")
    else:
        print("FAILURE: Title mismatch.")

except Exception as e:
    print(f"Error: {e}")
