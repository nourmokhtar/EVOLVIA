#!/usr/bin/env python3
"""
Interactive Test script for Collaboration Simulation.
Run this to test the services interactively (type your responses).
Usage: python test_collaboration.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.collaboration_service import CollaborationService

def test_collaboration():
    service = CollaborationService()

    print("Starting Interactive Collaboration Simulation Test...")

    # Test start session
    scenario_id = input("Enter scenario_id (e.g., empathy_work_easy): ").strip() or "empathy_work_easy"
    print(f"\n1. Starting session with scenario_id='{scenario_id}'")
    start_result = service.start_session(scenario_id)
    session_id = start_result["session_id"]
    print(f"Session ID: {session_id}")
    print(f"NPC: {start_result['npc_message']}")
    print(f"Scenario: {start_result['scenario_title']}")
    print(f"Turn Index: {start_result['turn_index']}")

    # Interactive turns
    while True:
        user_message = input("\nYour response: ")
        if user_message.lower() in ['quit', 'exit', 'q']:
            break

        turn_result = service.process_turn(session_id, user_message)
        print(f"NPC: {turn_result.get('npc_reply', 'N/A')}")
        print(f"Turn Index: {turn_result['turn_index']}")
        if turn_result['is_completed']:
            print("Scenario completed!")
            eval = turn_result['evaluation']
            print(f"Final Scores: {eval['scores']}")
            print(f"Confidence: {eval.get('confidence', 'N/A')}")
            print(f"Evidence: {eval.get('evidence', [])}")
            print(f"Missed Opportunities: {eval.get('missed_opportunities', [])}")
            print(f"Quotes: {eval.get('quotes', [])}")
            feedback = turn_result['feedback']
            print(f"Feedback: {feedback['summary']}")
            print(f"Well done: {feedback['what_you_did_well']}")
            print(f"Improvements: {feedback['what_to_improve']}")
            print(f"Next: {feedback['next_drill_suggestion']}")
            break

if __name__ == "__main__":
    test_collaboration()