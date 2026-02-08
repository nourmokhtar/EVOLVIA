#!/usr/bin/env python3
"""
Automated Test script for LLM-Driven Evaluation in Collaboration Simulation.
Run this to test the LLM evaluation functionality.
Usage: python test_llm_evaluation.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.collaboration_service import CollaborationService

def test_llm_evaluation():
    service = CollaborationService()

    print("Starting LLM Evaluation Test...")

    # Test start session
    scenario_id = "empathy_work_easy"
    print(f"\n1. Starting session with scenario_id='{scenario_id}'")
    start_result = service.start_session(scenario_id)
    session_id = start_result["session_id"]
    print(f"Session ID: {session_id}")
    print(f"NPC: {start_result['npc_message']}")
    print(f"Scenario: {start_result['scenario_title']}")
    print(f"Turn Index: {start_result['turn_index']}")

    # Test turns with sample responses to trigger LLM evaluation
    sample_responses = [
        "I understand your frustration, let's work on this together.",
        "I'm sorry you're feeling unheard. What can I do to help?",
        "Let's meet tomorrow at 3 PM to finalize the plan."
    ]

    for i, user_message in enumerate(sample_responses, 1):
        print(f"\nTurn {i}: User response: '{user_message}'")
        turn_result = service.process_turn(session_id, user_message)
        print(f"NPC: {turn_result.get('npc_reply', 'N/A')}")
        print(f"Turn Index: {turn_result['turn_index']}")
        eval = turn_result['evaluation']
        print(f"Evaluation Scores: {eval['scores']}")
        print(f"Confidence: {eval.get('confidence', 'N/A')}")
        print(f"Evidence: {eval.get('evidence', [])}")
        print(f"Missed Opportunities: {eval.get('missed_opportunities', [])}")
        if turn_result['is_completed']:
            print("Scenario completed!")
            feedback = turn_result['feedback']
            print(f"Feedback: {feedback['summary']}")
            print(f"Well done: {feedback['what_you_did_well']}")
            print(f"Improvements: {feedback['what_to_improve']}")
            print(f"Next: {feedback['next_drill_suggestion']}")
            break

if __name__ == "__main__":
    test_llm_evaluation()
