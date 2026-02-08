from typing import Any, Dict, List, TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
import json
import os
from dotenv import load_dotenv

load_dotenv()

from .ai_stub import AIService


class CollaborationState(TypedDict):
    scenario_id: str
    scenario: Dict[str, Any]
    rubric: Dict[str, Any]
    state: Dict[str, Any]  # turn_index, facts, commitments, npc_mood, tension, progress, trust, signal_counters, max_turns, is_completed, all_extracted_signals
    chat_history: List[Dict[str, str]]
    user_message: str
    extracted_signals: Dict[str, Any]
    evaluation: Dict[str, Any]
    feedback: Dict[str, Any]
    npc_reply: str


class CollaborationAgents:
    """Mock implementations of the collaboration simulation agents using LangGraph."""

    def __init__(self):
        self.ai = AIService()
        self.llm = ChatOpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            model_name="gpt-4",
            temperature=0.1
        )

    def scenario_designer(self, state: CollaborationState) -> Dict[str, Any]:
        """Generates the simulation scenario based on inputs."""
        scenario_id = state["scenario_id"]
        # Parse scenario_id: assume format "skill_domain_difficulty" e.g. "empathy_work_easy"
        parts = scenario_id.split('_')
        if len(parts) == 3:
            skill, domain, difficulty = parts
        else:
            skill, domain, difficulty = "conflict", "work", "medium"  # defaults

        generated = self.ai.generate_scenario(None, skill, difficulty, domain)
        # Build full scenario dict
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
        return {"scenario": scenario}

    def role_player(self, state: CollaborationState) -> Dict[str, Any]:
        """Acts as the NPC and generates the next message."""
        scenario = state["scenario"]
        chat_history = state["chat_history"]
        user_message = state.get("user_message", "")
        if not user_message:
            # Initial message
            npc_reply = scenario.get("initial_npc_message", "NPC: Hello.")
            new_mood = "annoyed"  # initial
        else:
            # Use the AI stub logic
            result = self.ai.roleplay_reply(scenario, state["state"], chat_history, user_message)
            npc_reply = result["reply"]
            new_mood = result["new_mood"]
            # Update mood in state
            state["state"]["npc_mood"] = new_mood
        return {"npc_reply": npc_reply}

    def user_response_interpreter(self, state: CollaborationState) -> Dict[str, Any]:
        """Extracts structured signals from the user reply and updates state."""
        user_message = state["user_message"]
        scenario = state["scenario"]
        extracted_signals = self.ai.extract_signals(user_message, scenario, state["state"])
        
        # Update state based on signals
        st = state["state"]
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
        
        return {"extracted_signals": extracted_signals}

    def rubric_evaluator(self, state: CollaborationState) -> Dict[str, Any]:
        """Scores collaboration skills using the rubric."""
        user_message = state["user_message"]
        scenario = state["scenario"]
        rubric = state["rubric"]
        extracted_signals = state["extracted_signals"]
        evaluation = self.ai.evaluate(user_message, scenario, rubric, state["state"], extracted_signals)
        return {"evaluation": evaluation}

    def feedback_synthesizer(self, state: CollaborationState) -> Dict[str, Any]:
        """Produces user-friendly feedback."""
        evaluation = state["evaluation"]
        scenario = state["scenario"]
        extracted_signals = state["extracted_signals"]
        feedback = self.ai.synthesize_feedback(evaluation, scenario, extracted_signals)
        return {"feedback": feedback}

    def build_graph(self) -> StateGraph:
        """Builds the LangGraph for the collaboration simulation."""
        graph = StateGraph(CollaborationState)

        # Add nodes
        graph.add_node("scenario_designer", self.scenario_designer)
        graph.add_node("role_player", self.role_player)
        graph.add_node("interpreter", self.user_response_interpreter)
        graph.add_node("evaluator", self.rubric_evaluator)
        graph.add_node("synthesizer", self.feedback_synthesizer)

        # Define edges
        # For start: scenario_designer -> role_player -> END (for initial message)
        graph.add_edge(START, "scenario_designer")
        graph.add_edge("scenario_designer", "role_player")
        graph.add_edge("role_player", END)  # For initial setup

        # For turn: interpreter -> evaluator -> synthesizer -> role_player -> END
        # But since it's conditional, for now simple chain
        # Actually, for process_turn, we can have a separate subgraph or call specific nodes

        # To make it work, perhaps have the graph for turn processing
        # For simplicity, the graph is for the full flow, but we can invoke from different starts

        # For MVP, the graph is scenario -> role_player for start, and for turn: interpreter -> evaluator -> synthesizer -> role_player

        # But to handle both, perhaps have conditional edges or separate graphs

        # For now, let's make the graph for turn processing, and handle start separately

        # Since LangGraph can have multiple entry points, but to keep simple, create two graphs or use one with flags

        # Add edges for turn
        graph.add_edge("interpreter", "evaluator")
        graph.add_edge("evaluator", "synthesizer")
        graph.add_edge("synthesizer", "role_player")

        return graph

    def run_start(self, scenario_id: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """Run start: scenario_designer -> role_player."""
        state: CollaborationState = {
            "scenario_id": scenario_id,
            "scenario": {},
            "rubric": rubric,
            "state": {
                "turn_index": 0,
                "facts": [],
                "commitments": [],
                "npc_mood": "annoyed",
                "tension": 0,
                "progress": 0,
                "trust": 0,
                "signal_counters": {},
                "max_turns": 5,  # will be updated
                "is_completed": False,
                "all_extracted_signals": []
            },
            "chat_history": [],
            "user_message": "",
            "extracted_signals": {},
            "evaluation": {},
            "feedback": {},
            "npc_reply": ""
        }
        state.update(self.scenario_designer(state))
        state["state"]["max_turns"] = state["scenario"]["max_turns"]
        state.update(self.role_player(state))
        # Initialize chat_history
        state["chat_history"] = [{"role": "npc", "text": state["npc_reply"]}]
        return state

    def run_turn(self, session_state: CollaborationState, user_message: str) -> Dict[str, Any]:
        """Run the turn processing: interpreter -> evaluator -> synthesizer -> role_player."""
        session_state["user_message"] = user_message
        # Append user message to chat_history
        session_state["chat_history"].append({"role": "user", "text": user_message})

        # Run interpreter
        session_state.update(self.user_response_interpreter(session_state))
        
        # Check end condition
        st = session_state["state"]
        res_cond = session_state["scenario"]["resolution_conditions"]
        # Check for closure
        closure_detected = self.detect_closure(user_message, st)
        if closure_detected or st["turn_index"] >= st["max_turns"] - 1 or st["trust"] >= res_cond["trust_threshold"] or st["tension"] >= res_cond["tension_threshold"]:
            st["is_completed"] = True
            # Compute final evaluation
            session_state.update(self.compute_final_evaluation(session_state))
            session_state.update(self.feedback_synthesizer(session_state))
        else:
            # Run role_player
            session_state.update(self.role_player(session_state))
            # Append npc_reply to chat_history
            session_state["chat_history"].append({"role": "npc", "text": session_state["npc_reply"]})
        
        st["turn_index"] += 1
        return session_state

    def detect_closure(self, user_message: str, state: Dict[str, Any]) -> bool:
        """Detect if user provides closure: summarized plan + confirmation + time commitment."""
        import re
        lm = user_message.lower()
        has_plan = re.search(r'\b(here are|summary|plan|details)\b', lm)
        has_confirmation = re.search(r'\b(if you\'re aligned|does this work|agree|confirm)\b', lm)
        has_time = re.search(r'\b(today|tomorrow|at|by)\b.*\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b', lm) or state.get("signal_counters", {}).get("time_commitment", 0) > 0
        return bool(has_plan and has_confirmation and has_time)

    def compute_final_evaluation(self, state: CollaborationState) -> Dict[str, Any]:
        """Compute final evaluation using LLM agent from the entire conversation."""
        rubric = state["rubric"]
        scenario = state["scenario"]
        chat_history = state["chat_history"]
        all_signals = state["state"]["all_extracted_signals"]

        # Prepare conversation text
        conversation = "\n".join([f"{msg['role'].capitalize()}: {msg['text']}" for msg in chat_history])

        # Prompt for LLM evaluation agent
        prompt = f"""
You are an expert evaluator agent for collaboration skills in a simulation scenario. Evaluate the entire user conversation based on the provided rubric and scenario.

Rubric: {json.dumps(rubric, indent=2)}

Scenario: {json.dumps(scenario, indent=2)}

Extracted Signals Summary: {json.dumps(all_signals, indent=2)}

Full Conversation:
{conversation}

Provide a JSON response with the following structure. Evaluate the user's overall performance across empathy, clarity, and commitment based on the conversation as a whole:

{{
  "scores": {{
    "empathy": <score 0-100>,
    "clarity": <score 0-100>,
    "commitment": <score 0-100>
  }},
  "confidence": <float 0-1>,
  "evidence": [<list of strings, e.g., "Acknowledged feelings in multiple responses">],
  "missed_opportunities": [<list of strings, e.g., "Could have validated feelings more often">],
  "quotes": [<list of 1-3 short user quotes demonstrating skills, e.g., "I understand your frustration...">]
}}

Be objective, consider the context, and base scores on how well the user demonstrated empathy (acknowledging feelings), clarity (clear plans), and commitment (follow-up actions) throughout the conversation.
"""

        try:
            response = self.llm.invoke(prompt)
            result = json.loads(response.content.strip())
            # Validate structure
            if "scores" in result and "confidence" in result and "evidence" in result and "missed_opportunities" in result and "quotes" in result:
                return {"evaluation": result}
            else:
                print("LLM evaluation response missing required fields, using fallback")
        except Exception as e:
            print(f"LLM evaluation error: {e}, using fallback")

        # Fallback to keyword-based logic
        import re
        user_messages = [msg["text"] for msg in chat_history if msg["role"] == "user"]

        # Collect detections
        empathy_detections = 0
        clarity_detections = 0
        commitment_detections = 0

        for sig in all_signals:
            if "validation" in sig.get("empathy_markers", []) or "perspective-taking" in sig.get("empathy_markers", []):
                empathy_detections += 1

        for msg in user_messages:
            lm = msg.lower()
            # Commitment: "I will/I'll/I can" + action verbs
            if re.search(r'\b(i will|i\'ll|i can)\b', lm) and re.search(r'\b(deliver|send|handle|integrate|test|update|check-in)\b', lm):
                commitment_detections += 1
            # Clarity: at least 2 of {time marker, concrete action, explicit next step}
            clarity_count = 0
            if re.search(r'\b(today|tomorrow|at|by)\b.*\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b', lm):
                clarity_count += 1
            if re.search(r'\b(deliver|send|handle|integrate|test|update|check-in|meet|call)\b', lm):
                clarity_count += 1
            if re.search(r'\b(next|then|after that|following)\b', lm):
                clarity_count += 1
            if clarity_count >= 2:
                clarity_detections += 1

        # Normalize scores (0-100) based on detections across conversation
        num_turns = len(all_signals)
        scores = {
            "empathy": min(100, (empathy_detections / max(1, num_turns)) * 100),
            "clarity": min(100, (clarity_detections / max(1, num_turns)) * 100),
            "commitment": min(100, (commitment_detections / max(1, num_turns)) * 100)
        }

        # Evidence and missed
        evidence = []
        if scores["empathy"] > 50:
            evidence.append("Showed empathy in responses")
        missed_opportunities = []
        if scores["empathy"] < 50:
            missed_opportunities.append("Validate feelings more")

        # Quotes: 1-2 short quotes
        quotes = []
        for msg in user_messages[:2]:  # first two
            if len(msg) > 10:
                quotes.append(f'"{msg[:50]}..."')

        evaluation = {
            "scores": scores,
            "confidence": 0.9,
            "evidence": evidence,
            "missed_opportunities": missed_opportunities,
            "quotes": quotes
        }
        return {"evaluation": evaluation}
