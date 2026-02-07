import asyncio
import websockets
import json
import requests

BASE_URL = "http://localhost:8000/api/v1/learn"
WS_URL = "ws://localhost:8000/api/v1/learn/ws"

async def test_history():
    # 1. Get a session ID
    res = requests.get(f"{BASE_URL}/sessions")
    sessions = res.json()
    if not sessions:
        print("No sessions found.")
        return
    
    session_id = sessions[0]["session_id"]
    print(f"Connecting to WS for session: {session_id}")

    # 2. Connect WS
    uri = f"{WS_URL}/{session_id}"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected.")
            while True:
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    if isinstance(msg, str):
                        data = json.loads(msg)
                        print(f"Received event: {data.get('type')}")
                        if data.get("type") == "HISTORY":
                            print("SUCCESS: Received HISTORY event!")
                            print(f"History length: {len(data.get('history', []))}")
                            return
                        if data.get("type") == "TEACHER_TEXT_FINAL": # If we receive this, maybe history was skipped?
                            pass
                except asyncio.TimeoutError:
                    print("Timeout waiting for HISTORY event.")
                    break
    except Exception as e:
        print(f"WS Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_history())
