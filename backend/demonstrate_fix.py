
import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app.api.collaboration import process_turn
from app.schemas.collaboration import TurnRequest

def demonstrate_fix():
    print("--- Demonstrating Collaboration API Fix ---")
    print("Simulating a simulation completion scenario...")

    # Mock the service to return a 'completed' status with evaluation data
    # This simulates exactly what the Service returns when a user finishes a scenario
    mock_service_response = {
        "npc_reply": "Thank you for the session. You did well.",
        "evaluation": {
            "scores": {"empathy": 80.0, "clarity": 90.0},
            "confidence": 0.95,
            "evidence": [],
            "missed_opportunities": [],
            "quotes": []
        },
        "feedback": {
            "summary": "Good job",
            "what_you_did_well": [],
            "what_to_improve": [],
            "example_improved_response": "",
            "next_drill_suggestion": "",
            "quotes": []
        },
        "turn_index": 5,
        "status": "completed",  # This is the key field the API now checks
        "final_evaluation": {
            "scores": {"empathy": 88.5, "clarity": 92.0, "commitment": 75.0},
            "confidence": 0.98,
            "evidence": ["Strong empathy in final statement"],
            "missed_opportunities": [],
            "feedback": {
                "summary": "You resolved the conflict effectively.",
                "what_you_did_well": ["Active listening", "Clear proposal"],
                "what_to_improve": ["Check for agreement sooner"],
                "example_improved_response": "N/A",
                "next_drill_suggestion": "Try the 'Advanced Negotiation' scenario next.",
                "quotes": []
            }
        }
    }

    print("\n[Mock] Service returns:", json.dumps(mock_service_response, indent=2))

    # Pattern the API call
    with patch('app.api.collaboration._service') as mock_service:
        mock_service.process_turn.return_value = mock_service_response
        
        request = TurnRequest(session_id="demo_session", user_message="Let's wrap up.")
        
        print("\n[Action] Calling API endpoint 'process_turn'...")
        response = process_turn(request)

        print("\n[Result] API Response:")
        print(f"  Status: {response.status}")
        print(f"  NPC Reply: {response.npc_reply}")
        
        if response.final_evaluation:
            print("\n  SUCCESS: Final Evaluation received!")
            print(f"  Scores: {response.final_evaluation.scores}")
            print(f"  Feedback Summary: {response.final_evaluation.feedback.summary}")
            print(f"  Next Drill: {response.final_evaluation.feedback.next_drill_suggestion}")
        else:
            print("\n  FAILURE: Final Evaluation is missing!")

if __name__ == "__main__":
    demonstrate_fix()
