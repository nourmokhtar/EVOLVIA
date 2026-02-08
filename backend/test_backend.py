import requests
import json

# Test the collaboration API
BASE_URL = "http://localhost:8000/api/v1"

def test_collaboration():
    print("Testing collaboration API...")

    # Start session
    print("\n1. Starting session...")
    start_response = requests.post(
        f"{BASE_URL}/collaboration/start",
        json={"scenario_id": "scenario_001"}
    )
    print(f"Start response status: {start_response.status_code}")
    start_data = start_response.json()
    print(f"Start response: {json.dumps(start_data, indent=2)}")

    session_id = start_data.get("session_id")
    if not session_id:
        print("No session_id received!")
        return

    # Make a few turns
    messages = [
        "Hello, I understand you're frustrated about the deadline.",
        "I agree we need to work together on this.",
        "Here's the summary: we agree to meet tomorrow at 3 PM to finalize the plan."
    ]

    for i, message in enumerate(messages):
        print(f"\n{i+2}. Sending turn {i+1}: {message}")
        turn_response = requests.post(
            f"{BASE_URL}/collaboration/turn",
            json={"session_id": session_id, "user_message": message}
        )
        print(f"Turn response status: {turn_response.status_code}")
        turn_data = turn_response.json()
        print(f"Turn response: {json.dumps(turn_data, indent=2)}")

        if turn_data.get("status") == "completed":
            print("Simulation completed!")
            break

if __name__ == "__main__":
    test_collaboration()
