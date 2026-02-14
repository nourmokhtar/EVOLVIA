from typing import Any, Dict, List
import json
from pathlib import Path
from uuid import uuid4

from .session_store import SessionStore, SessionNotFound
from .ai_stub import AIService


BASE_DIR = Path(__file__).resolve().parents[1]  # backend/app
DATA_DIR = BASE_DIR / "data"
SCENARIOS_DIR = DATA_DIR / "scenarios"
RUBRICS_DIR = DATA_DIR / "rubrics"

print("!!! COLLABORATION SERVICE MODULE LOADED - VERSION 8 !!!")

class CollaborationService:
    """Service layer for collaboration simulation using agent graph (no FastAPI logic here)."""

    def __init__(self) -> None:
        self._store = SessionStore()
        self._ai = AIService()

    def load_scenario(self, scenario_id: str) -> Dict[str, Any]:
        """Load scenario JSON from app/data/scenarios/{scenario_id}.json"""
        path = SCENARIOS_DIR / f"{scenario_id}.json"
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def load_rubric(self) -> Dict[str, Any]:
        """Load default rubric JSON from app/data/rubrics/rubric_v1.json"""
        path = RUBRICS_DIR / "rubric_v1.json"
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def start_session(self, scenario_id: str) -> Dict[str, Any]:
        """
        Create a new session: load rubric, generate scenario, initialize state.
        """
        rubric = self.load_rubric()

        # Check if it's a static scenario ID, otherwise generate dynamically
        if scenario_id.startswith("scenario_"):
            try:
                scenario = self.load_scenario(scenario_id)
            except FileNotFoundError:
                # Fallback to random static scenario
                import random
                import os
                scenario_files = [f for f in os.listdir(SCENARIOS_DIR) if f.endswith('.json')]
                if scenario_files:
                    random_scenario = random.choice(scenario_files).replace('.json', '')
                    scenario = self.load_scenario(random_scenario)
                else:
                    # Ultimate fallback to generated scenario
                    parts = scenario_id.split('_')
                    if len(parts) == 3:
                        skill, domain, difficulty = parts
                    else:
                        skill, domain, difficulty = "conflict", "work", "medium"
                    generated = self._ai.generate_scenario(None, skill, difficulty, domain)
                    scenario = {
                        "id": scenario_id,
                        "title": generated["scenario_brief"],
                        "npc_name": generated["characters"][0]["name"] if generated["characters"] else "NPC",
                        "initial_npc_message": f"{generated['characters'][0]['name'] if generated['characters'] else 'NPC'}: {generated['scenario_brief']}. What do you say?",
                        "characters": generated["characters"],
                        "hidden_constraints": generated["hidden_constraints"],
                        "success_criteria": generated["success_criteria"],
                        "max_turns": generated["max_turns"],
                        "resolution_conditions": generated["resolution_conditions"]
                    }
        else:
            # Parse dynamic scenario_id
            parts = scenario_id.split('_')
            if len(parts) == 3:
                skill, domain, difficulty = parts
            else:
                skill, domain, difficulty = "conflict", "work", "medium"

            generated = self._ai.generate_scenario(None, skill, difficulty, domain)
            scenario = {
                "id": scenario_id,
                "title": generated["scenario_brief"],
                "npc_name": generated["characters"][0]["name"] if generated["characters"] else "NPC",
                "initial_npc_message": f"{generated['characters'][0]['name'] if generated['characters'] else 'NPC'}: {generated['scenario_brief']}. What do you say?",
                "characters": generated["characters"],
                "hidden_constraints": generated["hidden_constraints"],
                "success_criteria": generated["success_criteria"],
                "max_turns": generated["max_turns"],
                "resolution_conditions": generated["resolution_conditions"]
            }

        # Initialize state
        state = {
            "turn_index": 0,
            "facts": [],
            "commitments": [],
            "npc_mood": "neutral",
            "tension": 30,
            "progress": 0,
            "trust": 50,
            "signal_counters": {},
            "max_turns": scenario["max_turns"],
            "is_completed": False,
            "all_extracted_signals": []
        }

        session_id = str(uuid4())
        session_value = {
            "scenario": scenario,
            "rubric": rubric,
            "state": state,
            "chat_history": [{"role": "assistant", "content": scenario["initial_npc_message"]}],
        }
        self._store.set(session_id, session_value, ttl=7200)
        return {
            "session_id": session_id,
            "npc_message": scenario["initial_npc_message"],
            "scenario_title": scenario["title"],
            "turn_index": 0
        }

    def process_turn(self, session_id: str, user_message: str) -> Dict[str, Any]:
        """
        Process a user turn:
         1) safety check
         2) extract signals
         3) generate NPC reply using signals for testing
         4) evaluate and synthesize feedback
         5) update state, chat_history, turn_index
        """
        try:
            session = self._store.get(session_id)
        except SessionNotFound:
            raise

        # Safety check
        safety = self._ai.safety_check(session["scenario"], [user_message])
        if not safety["allow"]:
            # Return safe response without processing
            return {
                "npc_reply": safety["safe_message"],
                "evaluation": {"scores": {}, "confidence": 0.0, "evidence": [], "missed_opportunities": []},
                "feedback": {"summary": "Conversation paused for safety.", "what_you_did_well": [], "what_to_improve": [], "example_improved_response": "", "next_drill_suggestion": ""},
                "turn_index": session["state"]["turn_index"]
            }

        # Extract signals first
        extracted_signals = self._ai.extract_signals(user_message, session["scenario"], session["state"])

        # Check for closure before generating response
        is_completed = self._ai.detect_closure(user_message, session["state"]) or session["state"]["turn_index"] >= session["state"]["max_turns"]
        print(f"DEBUG: User message: '{user_message}'")
        print(f"DEBUG: Is completed: {is_completed}")
        print(f"DEBUG: Turn index: {session['state']['turn_index']}, Max turns: {session['state']['max_turns']}")

        # Update state based on signals (similar to interpreter agent)
        st = session["state"]
        if "validation" in extracted_signals.get("empathy_markers", []):
            st["trust"] = min(100, st["trust"] + 10)
            st["tension"] = max(0, st["tension"] - 5)
        if "propose_solution" in extracted_signals.get("intents", []):
            st["progress"] = min(100, st["progress"] + 15)
        if "aggressive" in extracted_signals.get("tone_markers", []):
            st["tension"] = min(100, st["tension"] + 10)
            st["trust"] = max(0, st["trust"] - 5)

        # Accumulate signal counters
        counters = st["signal_counters"]
        for key, value in extracted_signals.items():
            if isinstance(value, list):
                for item in value:
                    counters[item] = counters.get(item, 0) + 1

        # Accumulate all signals
        st["all_extracted_signals"].append(extracted_signals)

        # Generate NPC reply using signals for testing (only if not completed)
        if is_completed:
            npc_reply = f"{session['scenario']['npc_name']}: Thank you for completing this collaboration scenario. Let's review your performance."
            st["npc_mood"] = "calm"
            print(f"DEBUG: Completion detected, NPC reply: {npc_reply}")
        else:
            npc_result = self._ai.roleplay_reply(session["scenario"], st, session["chat_history"], user_message, extracted_signals)
            npc_reply = npc_result["reply"]
            st["npc_mood"] = npc_result["new_mood"]

        # Update chat history
        session["chat_history"].append({"role": "user", "content": user_message})
        session["chat_history"].append({"role": "assistant", "content": npc_reply})

        # Increment turn
        st["turn_index"] += 1

        # Evaluate
        evaluation = self._ai.evaluate(user_message, session["scenario"], session["rubric"], st, extracted_signals)

        # Accumulate evaluations for global scoring
        if "all_evaluations" not in st:
            st["all_evaluations"] = []
        st["all_evaluations"].append(evaluation)

        # Refactored completion logic
        print(f"DEBUG: is_completed state check 1: {is_completed}")
        
        # Check new conditions
        closure_now = self._ai.detect_closure(user_message, st)
        max_turns = st["turn_index"] >= st["max_turns"]
        
        print(f"DEBUG: closure_now: {closure_now}, max_turns: {max_turns}")

        if is_completed:
            # Already completed (detected at start of turn)
            pass
        elif closure_now or max_turns:
            is_completed = True
            
        # EXTRA FAILSAFE based on generated reply
        if npc_reply and "Thank you for completing" in npc_reply:
             print("DEBUG: Force-setting completion based on NPC reply content (Redundant check)")
             is_completed = True

        print(f"DEBUG: is_completed final state: {is_completed}")
        st["is_completed"] = is_completed

        # If this is a closure message, don't increment the turn counter
        if is_completed and self._ai.detect_closure(user_message, st):
            st["turn_index"] -= 1  # Don't count the closure message as a turn

        # Synthesize feedback (global if completed)
        feedback = self._ai.synthesize_feedback(evaluation, session["scenario"], extracted_signals, session["chat_history"], st)

        if "Thank you for completing this collaboration scenario" in npc_reply:
             print("DEBUG: Force-setting completion based on NPC reply content")
             is_completed = True
             st["is_completed"] = True

        # Create final evaluation if completed
        final_evaluation = None
        if is_completed:
            print(f"DEBUG: Creating final evaluation. All evaluations: {len(st.get('all_evaluations', []))}")
            # Aggregate scores across all evaluations
            all_scores = st.get("all_evaluations", [])
            if all_scores:
                aggregated_scores = {
                    "empathy": sum(ev.get("scores", {}).get("empathy", 0) for ev in all_scores) / len(all_scores),
                    "clarity": sum(ev.get("scores", {}).get("clarity", 0) for ev in all_scores) / len(all_scores),
                    "commitment": sum(ev.get("scores", {}).get("commitment", 0) for ev in all_scores) / len(all_scores)
                }
                print(f"DEBUG: Aggregated scores: {aggregated_scores}")
            else:
                # Fallback to current evaluation
                aggregated_scores = evaluation.get("scores", {"empathy": 50, "clarity": 50, "commitment": 50})
                print(f"DEBUG: Using fallback scores: {aggregated_scores}")

            final_evaluation = {
                "scores": aggregated_scores,
                "confidence": 0.9,
                "evidence": feedback.get("evidence", []),
                "missed_opportunities": feedback.get("missed_opportunities", []),
                "feedback": feedback
            }
            print(f"DEBUG: Final evaluation created: {final_evaluation}")
            print("=== FINAL EVALUATION RESULTS ===")
            print(f"Empathy Score: {aggregated_scores['empathy']:.1f}%")
            print(f"Clarity Score: {aggregated_scores['clarity']:.1f}%")
            print(f"Commitment Score: {aggregated_scores['commitment']:.1f}%")
            print(f"Evidence: {feedback.get('evidence', [])}")
            print(f"What you did well: {feedback.get('what_you_did_well', [])}")
            print(f"What to improve: {feedback.get('what_to_improve', [])}")
            print(f"Next drill suggestion: {feedback.get('next_drill_suggestion', '')}")
            print("=================================")
            print(f"Full final_evaluation object: {json.dumps(final_evaluation, indent=2)}")
            print("=================================")

        # Persist updated session
        self._store.set(session_id, session, ttl=7200)

        return {
            "npc_reply": npc_reply,
            "evaluation": evaluation,
            "feedback": feedback,
            "turn_index": st["turn_index"],
            "status": "completed" if is_completed else "ongoing",
            "final_evaluation": final_evaluation
        }
