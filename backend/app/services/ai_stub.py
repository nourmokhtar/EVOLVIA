from typing import Any, Dict, List, Optional
import json
import re
import os
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class AIService:
    """
    AI Service using Grok API. Replace stubs with real LLM calls.
    """

    def __init__(self, api_key: Optional[str] = None):
        # Use provided key or environment variable
        self.api_key = api_key or os.getenv("GROK_API_KEY") 
        
        # Working path found via discovery: https://tokenfactory.esprit.tn/api
        # (This is the OpenAI-compatible entry point for this OpenWebUI instance)
        self.base_url = "https://tokenfactory.esprit.tn/api"
        self.model = os.getenv("AI_MODEL", "hosted_vllm/Llama-3.1-70B-Instruct") 
        
        print(f"!!! USING CUSTOM AI ENDPOINT: {self.base_url} with model {self.model} !!!")
        
        self.use_llm = bool(self.api_key)
        if self.use_llm:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def _call_grok(self, prompt: str, max_tokens: int = 150) -> str:
        """Helper to call Grok API using OpenAI client."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"LLM API error (Using Fallback instead): {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return "I understand your point. Let's continue the conversation."  # Fallback response

    def roleplay_reply(
        self, scenario: Dict[str, Any], state: Dict[str, Any], chat_history: List[Dict[str, str]], user_message: str, extracted_signals: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate NPC reply using Grok LLM if available, else fallback to logic-based response."""
        if self.use_llm:
            # Use LLM to generate reply
            npc_name = scenario.get("npc_name", "NPC")
            mood = "neutral"
            if state.get("trust", 50) > 60:
                mood = "calm"
            elif state.get("tension", 30) > 40:
                mood = "annoyed"
            
            # Determine testing focus
            testing_focus = "general"
            if extracted_signals:
                if not extracted_signals.get("empathy_markers"):
                    testing_focus = "empathy"
                elif "propose_solution" not in extracted_signals.get("intents", []):
                    testing_focus = "clarity"
                elif "aggressive" in extracted_signals.get("tone_markers", []):
                    testing_focus = "tone"
            
            # Include recent conversation history (last 4 messages) for context
            recent_history = chat_history[-8:]  # Get last 8 messages (4 exchanges)
            history_text = "\n".join([f"{msg['role'].title()}: {msg['content']}" for msg in recent_history])

            prompt = f"""
You are {npc_name}, an NPC in a collaboration simulation. Your current mood is {mood}.

Recent conversation:
{history_text}

The user just said: "{user_message}"

Based on the conversation history and your mood, generate a response that tests the user's collaboration skills.
Focus on: {testing_focus}

Keep the response natural, in character, and under 50 words. Do not repeat generic phrases like "I understand your point. Let's continue the conversation."
"""
            try:
                reply = self._call_grok(prompt, max_tokens=200)
                # Skip generic fallback responses
                if reply == "I understand your point. Let's continue the conversation.":
                    raise Exception("Generic fallback response, use logic-based fallback instead")
                # Update mood based on reply (simple)
                new_mood = mood
                if "frustrated" in reply.lower() or "annoyed" in reply.lower():
                    new_mood = "annoyed"
                elif "better" in reply.lower() or "thanks" in reply.lower():
                    new_mood = "calm"
                return {"reply": f"{npc_name}: {reply}", "new_mood": new_mood}
            except Exception as e:
                print(f"LLM error: {e}, using logic-based fallback")
        
        # Enhanced fallback logic with more context-aware responses
        last_npc = scenario.get("npc_name", "NPC")
        lm = user_message.lower()
        turn_index = state.get("turn_index", 0)
        trust = state.get("trust", 50)
        tension = state.get("tension", 30)
        chat_history = state.get("chat_history", [])

        # Determine mood based on state
        if trust > 70:
            mood = "calm"
        elif tension > 50:
            mood = "annoyed"
        elif trust < 30:
            mood = "frustrated"
        else:
            mood = "neutral"

        # Get recent context from chat history
        recent_messages = chat_history[-4:] if chat_history else []
        user_recent = [msg for msg in recent_messages if msg.get("role") == "user"]
        assistant_recent = [msg for msg in recent_messages if msg.get("role") == "assistant"]

        # Enhanced agent testing logic based on extracted signals and context
        if extracted_signals:
            intents = extracted_signals.get("intents", [])
            empathy_markers = extracted_signals.get("empathy_markers", [])
            tone_markers = extracted_signals.get("tone_markers", [])
            communication_markers = extracted_signals.get("communication_markers", [])

            # Test for empathy with more nuanced responses
            if not empathy_markers and turn_index > 1:
                empathy_responses = [
                    f"{last_npc}: I appreciate you trying to help, but I'm still feeling frustrated about this situation. Can you understand where I'm coming from?",
                    f"{last_npc}: Thanks for your input, but I need you to really hear me out. How would you feel if you were in my position?",
                    f"{last_npc}: I see you're trying to move forward, but I need some empathy first. Can you acknowledge my perspective?"
                ]
                reply = empathy_responses[turn_index % len(empathy_responses)]
                mood = "frustrated"
                return {"reply": reply, "new_mood": mood}

            # Test for clarity with specific follow-ups
            if "propose_solution" not in intents and turn_index > 2:
                clarity_responses = [
                    f"{last_npc}: I need more concrete details. What exactly are you proposing we do, step by step?",
                    f"{last_npc}: That's still pretty vague. Can you give me specific actions and timelines?",
                    f"{last_npc}: I want to understand your plan better. What are the key deliverables and when?"
                ]
                reply = clarity_responses[turn_index % len(clarity_responses)]
                return {"reply": reply, "new_mood": mood}

            # Test for commitment with accountability
            if not re.search(r'\b(i will|we will|let\'s|propose|handle|deliver|commit|responsible)\b', lm) and turn_index > 1:
                commitment_responses = [
                    f"{last_npc}: I need to know you're fully committed to this. Who will take ownership of each part?",
                    f"{last_npc}: This needs clear accountability. Can you tell me who's responsible for what and when?",
                    f"{last_npc}: Let's establish clear ownership. What are you personally committing to deliver?"
                ]
                reply = commitment_responses[turn_index % len(commitment_responses)]
                return {"reply": reply, "new_mood": mood}

            # Test boundaries with de-escalation
            if "aggressive" in tone_markers:
                boundary_responses = [
                    f"{last_npc}: I can hear you're passionate about this, but let's keep our discussion productive. Can we focus on solutions?",
                    f"{last_npc}: Your intensity is coming across strongly. I want to work together, but I need us to stay respectful.",
                    f"{last_npc}: I understand you feel strongly, but raised voices won't help. Let's find a collaborative approach."
                ]
                reply = boundary_responses[turn_index % len(boundary_responses)]
                mood = "annoyed"
                return {"reply": reply, "new_mood": mood}

        # Enhanced keyword-based responses with more variety and context
        if re.search(r'\b(sorry|apologize|i\'m sorry|my apologies)\b', lm):
            if mood == "annoyed":
                apology_responses = [
                    f"{last_npc}: Thank you for apologizing. I accept it, but we still need to address the core issue.",
                    f"{last_npc}: Apology noted. Now let's focus on what we can do to fix this situation.",
                    f"{last_npc}: I appreciate the apology. Let's use this as an opportunity to improve our working relationship."
                ]
                reply = apology_responses[turn_index % len(apology_responses)]
            else:
                reply = f"{last_npc}: Thank you for apologizing. I appreciate your willingness to make things right."
        elif re.search(r'\b(deadline|friday|due|time|schedule)\b', lm):
            if trust > 60:
                deadline_responses = [
                    f"{last_npc}: I understand the time pressure. What aspects of the deadline are most flexible?",
                    f"{last_npc}: Deadlines are important, but so is quality. How can we balance both?",
                    f"{last_npc}: I hear the timeline concerns. What support do you need to meet it?"
                ]
                reply = deadline_responses[turn_index % len(deadline_responses)]
            else:
                deadline_responses = [
                    f"{last_npc}: The deadline is approaching and I'm worried about the quality. Can we get more resources?",
                    f"{last_npc}: I'm feeling the time crunch too. What can we realistically accomplish by the deadline?",
                    f"{last_npc}: Deadlines are tight, but rushing might cause mistakes. How can we prioritize effectively?"
                ]
                reply = deadline_responses[turn_index % len(deadline_responses)]
        elif re.search(r'\b(solution|propose|suggest|idea|plan)\b', lm):
            solution_responses = [
                f"{last_npc}: That approach sounds interesting. Can you walk me through the potential challenges?",
                f"{last_npc}: I like where you're going with this. What would success look like?",
                f"{last_npc}: That's a creative solution. How do you see us implementing it?"
            ]
            reply = solution_responses[turn_index % len(solution_responses)]
        elif re.search(r'\b(understand|see|get it|hear you)\b', lm):
            understanding_responses = [
                f"{last_npc}: Good, I'm glad we're on the same page. What's our next concrete step?",
                f"{last_npc}: Thank you for understanding. Now let's turn that understanding into action.",
                f"{last_npc}: I appreciate you seeing my perspective. How can we move forward together?"
            ]
            reply = understanding_responses[turn_index % len(understanding_responses)]
        elif re.search(r'\b(help|support|assist|together|team)\b', lm):
            help_responses = [
                f"{last_npc}: I appreciate the offer of help. What specific support do you think would be most useful?",
                f"{last_npc}: Teamwork is important to me. How can we collaborate effectively on this?",
                f"{last_npc}: I value your willingness to help. What resources or skills do you bring to the table?"
            ]
            reply = help_responses[turn_index % len(help_responses)]
        else:
            # Context-aware default responses based on conversation flow
            if mood == "annoyed":
                annoyed_responses = [
                    f"{last_npc}: I'm still frustrated with this situation. I need you to show me you understand my concerns.",
                    f"{last_npc}: This isn't addressing what I need. Can we focus on the real issues here?",
                    f"{last_npc}: I'm not satisfied with how this is going. What are you willing to do differently?"
                ]
                reply = annoyed_responses[turn_index % len(annoyed_responses)]
            elif mood == "frustrated":
                frustrated_responses = [
                    f"{last_npc}: I feel like we're not making progress. Can you help me understand your perspective better?",
                    f"{last_npc}: This is really challenging for me. What can you do to make this easier?",
                    f"{last_npc}: I'm struggling with this. I need more concrete help from you."
                ]
                reply = frustrated_responses[turn_index % len(frustrated_responses)]
            elif mood == "calm":
                calm_responses = [
                    f"{last_npc}: I feel heard now. What's your next step in helping us resolve this?",
                    f"{last_npc}: Thank you for listening. How can we turn this understanding into a plan?",
                    f"{last_npc}: I appreciate your approach. Let's build on this positive momentum."
                ]
                reply = calm_responses[turn_index % len(calm_responses)]
            else:
                neutral_responses = [
                    f"{last_npc}: I want to work through this together. What's your main concern right now?",
                    f"{last_npc}: Let's keep the conversation going. What are your thoughts on how to proceed?",
                    f"{last_npc}: I'm open to your ideas. What do you think would be the best next step?"
                ]
                reply = neutral_responses[turn_index % len(neutral_responses)]

        return {"reply": reply, "new_mood": mood}

    def evaluate(self, user_message: str, scenario: Dict[str, Any], rubric: Dict[str, Any], state: Dict[str, Any], extracted_signals: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Scoring & Rubric Evaluator Agent: Scores using LLM based on rubric and extracted signals.
        Returns: {scores, confidence, evidence, missed_opportunities}
        """
        if self.use_llm:
            # Craft LLM prompt
            rubric_str = json.dumps(rubric, indent=2)
            scenario_str = json.dumps(scenario, indent=2)
            state_str = json.dumps(state, indent=2)
            signals_str = json.dumps(extracted_signals or {}, indent=2)

            prompt = f"""
You are an expert evaluator for collaboration skills in a simulation scenario. Evaluate the user's response based on the provided rubric, scenario, current state, and extracted signals.

Rubric: {rubric_str}

Scenario: {scenario_str}

Current State: {state_str}

Extracted Signals: {signals_str}

User Message: "{user_message}"

Return ONLY a valid JSON object with the following exact structure. Do not include any additional text, explanations, or markdown. Start your response with {{ and end with }}:

{{
  "scores": {{
    "empathy": <score 0-100>,
    "clarity": <score 0-100>,
    "commitment": <score 0-100>
  }},
  "confidence": <float 0-1>,
  "evidence": [<list of strings, e.g., "Acknowledged feelings">],
  "missed_opportunities": [<list of strings, e.g., "Validate the other person's feelings">]
}}

Be objective, consider the context, and base scores on how well the response demonstrates empathy (acknowledging feelings), clarity (clear plans), and commitment (follow-up actions).
"""
            try:
                response = self._call_grok(prompt, max_tokens=300)
                # Try to extract JSON from response
                response = response.strip()
                if not response.startswith('{'):
                    # Find JSON in response
                    start = response.find('{')
                    end = response.rfind('}') + 1
                    if start != -1 and end > start:
                        response = response[start:end]
                result = json.loads(response)
                # Validate structure
                if "scores" in result and "confidence" in result and "evidence" in result and "missed_opportunities" in result:
                    return result
                else:
                    print("LLM response missing required fields, using fallback")
            except (json.JSONDecodeError, Exception) as e:
                print(f"LLM evaluation error: {e}, using fallback")

        # Fallback to original keyword-based logic
        lm = user_message.lower()
        scores = {}
        scores["empathy"] = 100 if any(w in lm for w in ["i understand", "i'm sorry", "sorry", "je comprends"]) else 20
        scores["clarity"] = 100 if any(w in lm for w in ["we will", "i will", "let's", "nous allons"]) else 30
        scores["commitment"] = 100 if any(w in lm for w in ["i'll", "i will", "je vais", "i will follow up"]) else 0

        if extracted_signals:
            if "validation" in extracted_signals.get("empathy_markers", []):
                scores["empathy"] = min(100, scores["empathy"] + 30)
            if "propose_solution" in extracted_signals.get("intents", []):
                scores["clarity"] = min(100, scores["clarity"] + 40)
            if "set_boundaries" in extracted_signals.get("intents", []):
                scores["commitment"] = min(100, scores["commitment"] + 50)

        confidence = 0.8
        evidence = []
        if scores["empathy"] > 50:
            evidence.append("Acknowledged feelings")
        if scores["clarity"] > 50:
            evidence.append("Offered solution")
        if scores["commitment"] > 50:
            evidence.append("Set next steps")

        missed_opportunities = []
        if scores["empathy"] < 50:
            missed_opportunities.append("Validate the other person's feelings")
        if scores["clarity"] < 50:
            missed_opportunities.append("Propose a clear action plan")
        if scores["commitment"] < 50:
            missed_opportunities.append("Commit to follow-up")

        return {
            "scores": scores,
            "confidence": confidence,
            "evidence": evidence,
            "missed_opportunities": missed_opportunities
        }

    def synthesize_feedback(self, evaluation: Dict[str, Any], scenario: Dict[str, Any], extracted_signals: Dict[str, Any], chat_history: List[Dict[str, str]], state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Feedback Synthesizer Agent: Produces evidence-based feedback, global if completed.
        Returns: {summary, what_you_did_well, what_to_improve, example_improved_response, next_drill_suggestion, quotes}
        """
        # Aggregate scores globally if completed
        if state.get("is_completed", False) and "all_evaluations" in state:
            all_scores = [ev["scores"] for ev in state["all_evaluations"] if "scores" in ev]
            if all_scores:
                aggregated_scores = {
                    "empathy": sum(s.get("empathy", 0) for s in all_scores) / len(all_scores),
                    "clarity": sum(s.get("clarity", 0) for s in all_scores) / len(all_scores),
                    "commitment": sum(s.get("commitment", 0) for s in all_scores) / len(all_scores)
                }
                scores = aggregated_scores
                # Aggregate evidence and missed opportunities
                all_evidence = [ev.get("evidence", []) for ev in state["all_evaluations"]]
                all_missed = [ev.get("missed_opportunities", []) for ev in state["all_evaluations"]]
                evidence = [item for sublist in all_evidence for item in sublist]
                missed = [item for sublist in all_missed for item in sublist]
            else:
                scores = evaluation["scores"]
                evidence = evaluation.get("evidence", [])
                missed = evaluation.get("missed_opportunities", [])
        else:
            scores = evaluation["scores"]
            evidence = evaluation.get("evidence", [])
            missed = evaluation.get("missed_opportunities", [])

        # Extract quotes from chat history (user messages that demonstrate skills)
        quotes = []
        for msg in chat_history:
            if msg["role"] == "user" and len(msg["content"]) > 10:  # Simple filter for meaningful quotes
                quotes.append(msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"])

        summary = f"Your collaboration skills scored {scores['empathy']:.0f}% empathy, {scores['clarity']:.0f}% clarity, {scores['commitment']:.0f}% commitment."

        what_you_did_well = []
        if scores["empathy"] > 70:
            what_you_did_well.append("Effectively validated the other person's feelings")
        if scores["clarity"] > 70:
            what_you_did_well.append("Provided clear, actionable plans with timelines")
        if len(what_you_did_well) < 2:
            what_you_did_well.extend(["Attempted to engage positively", "Listened actively"])

        what_to_improve = []
        if scores["empathy"] < 70:
            what_to_improve.append("Practice more empathy by acknowledging emotions")
        if scores["clarity"] < 70:
            what_to_improve.append("Include specific times and next steps in plans")
        if len(what_to_improve) < 2:
            what_to_improve.extend(["Build stronger commitments", "Reduce defensive responses"])

        example_improved_response = "I'm sorry you're overwhelmed. I understand the pressure. Let's meet tomorrow at 3 PM to finalize the plan and assign tasks."

        next_drill_suggestion = "Try a 'conflict resolution' scenario next to practice boundary-setting."

        feedback = {
            "summary": summary,
            "what_you_did_well": what_you_did_well[:2],
            "what_to_improve": what_to_improve[:2],
            "example_improved_response": example_improved_response,
            "next_drill_suggestion": next_drill_suggestion,
            "quotes": quotes[:3]  # Limit to 3 quotes
        }
        return feedback

    def safety_check(self, scenario: Dict[str, Any], messages: List[str]) -> Dict[str, Any]:
        """
        Safety & Policy Guard Agent: Detects unsafe content.
        Returns: {allow: bool, action: "allow"|"transform"|"refuse", safe_message: str}
        """
        # Mock: check for bad words
        bad_words = ["hate", "kill", "stupid", "idiot"]
        for msg in messages:
            if any(word in msg.lower() for word in bad_words):
                return {"allow": False, "action": "transform", "safe_message": "Please keep the conversation respectful."}
        return {"allow": True, "action": "allow", "safe_message": ""}

    def generate_scenario(self, user_profile: Optional[Dict[str, Any]], skill: str, difficulty: str, domain: str) -> Dict[str, Any]:
        """
        Scenario Designer Agent: Generates scenario based on inputs.
        Returns: {scenario_brief, characters, hidden_constraints, success_criteria, max_turns, resolution_conditions}
        """
        # Mock generation based on inputs
        if skill == "empathy":
            scenario_brief = f"In a {domain} setting, a colleague feels unheard and is pushing back on a task."
            characters = [{"name": "Alex", "role": "Colleague", "goals": "Get support and understanding"}]
            hidden_constraints = ["Alex values work-life balance above all."]
            success_criteria = ["Acknowledge feelings", "Show perspective-taking", "Propose empathetic solution"]
            max_turns = 10  # Increased for longer conversations
            resolution_conditions = {"trust_threshold": 70, "tension_threshold": 80}  # resolution if trust >=70, failure if tension >=80
        elif skill == "conflict":
            scenario_brief = f"A {domain} disagreement arises over resource allocation."
            characters = [{"name": "Jordan", "role": "Team Lead", "goals": "Resolve without escalation"}]
            hidden_constraints = ["Jordan is under pressure from upper management."]
            success_criteria = ["Set clear boundaries", "Find compromise", "De-escalate tension"]
            max_turns = 10  # Increased
            resolution_conditions = {"trust_threshold": 60, "tension_threshold": 70}
        else:
            scenario_brief = f"A general {domain} interaction requiring {skill} skills."
            characters = [{"name": "NPC", "role": "Counterparty", "goals": "Reach agreement"}]
            hidden_constraints = ["NPC prefers direct communication."]
            success_criteria = ["Communicate clearly", "Show respect", "Solve the problem"]
            max_turns = 8  # Increased
            resolution_conditions = {"trust_threshold": 50, "tension_threshold": 60}

        # Adjust for difficulty
        if difficulty == "easy":
            scenario_brief += " (Simple version)"
            max_turns += 1
        elif difficulty == "hard":
            scenario_brief += " (Complex version with multiple stakes)"
            max_turns -= 1

        return {
            "scenario_brief": scenario_brief,
            "characters": characters,
            "hidden_constraints": hidden_constraints,
            "success_criteria": success_criteria,
            "max_turns": max_turns,
            "resolution_conditions": resolution_conditions
        }

    def extract_signals(self, user_message: str, scenario: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
        """
        User Response Interpreter Agent: Extracts structured signals using LLM emotion classification.
        """
        # Use LLM to classify emotions
        emotion_result = self.classify_emotions(user_message)
        emotions = emotion_result["emotions"]

        # Derive signals from emotions
        intents = []
        if "apologetic" in emotions:
            intents.append("apologize")
        if "empathetic" in emotions or re.search(r'\b(we will|i will|let\'s|solution)\b', user_message.lower()):
            intents.append("propose_solution")
        if "angry" in emotions or re.search(r'\b(no|can\'t|refuse)\b', user_message.lower()):
            intents.append("set_boundaries")
        if "empathetic" in emotions:
            intents.append("clarify")

        tone_markers = []
        if "apologetic" in emotions or "positive" in emotions:
            tone_markers.append("calm")
        if "angry" in emotions or "frustrated" in emotions:
            tone_markers.append("aggressive")
        else:
            tone_markers.append("neutral")

        empathy_markers = []
        if "empathetic" in emotions:
            empathy_markers.append("validation")
        if re.search(r'\b(from your perspective|i see why|so you don\'t have to)\b', user_message.lower()):
            empathy_markers.append("perspective-taking")

        communication_markers = []
        if re.search(r'\bi\b.*\b(you|we)\b', user_message.lower()):
            communication_markers.append("I-statements")
        if re.search(r'\byou are\b|\byou always\b', user_message.lower()):
            communication_markers.append("accusations")
        if re.search(r'\blet\'s find\b|\bhow can we\b|\btell me\b', user_message.lower()):
            communication_markers.append("active_listening")

        # Check for time commitment
        if re.search(r'\b(today|tomorrow|at|by)\b.*\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b', user_message.lower()):
            state["signal_counters"]["time_commitment"] = state["signal_counters"].get("time_commitment", 0) + 1

        # Guess conflict style based on emotions
        if "positive" in emotions:
            conflict_style = "collaborate"
        elif "angry" in emotions:
            conflict_style = "compete"
        elif "apologetic" in emotions:
            conflict_style = "accommodate"
        else:
            conflict_style = "avoid"

        return {
            "intents": intents,
            "tone_markers": tone_markers,
            "empathy_markers": empathy_markers,
            "communication_markers": communication_markers,
            "conflict_style": conflict_style
        }

    def classify_emotions(self, user_message: str) -> Dict[str, Any]:
        """
        LLM-based emotion classifier using Grok.
        Returns: {emotions: list of detected emotions, confidence: float}
        """
        prompt = f"""
Analyze the following user message and classify the primary emotions expressed. Return emotions as a comma-separated list.

Message: "{user_message}"

Possible emotions: apologetic, frustrated, positive, empathetic, angry, neutral.

Example: empathetic, positive
"""
        try:
            response = self._call_grok(prompt, max_tokens=100)
            # Parse comma-separated emotions
            emotions = [e.strip() for e in response.split(',') if e.strip()]
            # Filter to known emotions
            valid_emotions = ["apologetic", "frustrated", "positive", "empathetic", "angry", "neutral"]
            emotions = [e for e in emotions if e in valid_emotions]
            if not emotions:
                emotions = ["neutral"]
            return {"emotions": emotions, "confidence": 0.85}
        except Exception as e:
            print(f"LLM emotion classification error: {e}, using mock")
            # Fallback to mock
            lm = user_message.lower()
            emotions = []
            if re.search(r'\b(sorry|apologize|i\'m sorry)\b', lm):
                emotions.append("apologetic")
            if re.search(r'\b(frustrated|annoyed|stressed|overwhelmed)\b', lm):
                emotions.append("frustrated")
            if re.search(r'\b(happy|good|great|excited)\b', lm):
                emotions.append("positive")
            if re.search(r'\b(understand|hear|see|i get it)\b', lm):
                emotions.append("empathetic")
            if re.search(r'\b(angry|mad|hate|stupid)\b', lm):
                emotions.append("angry")
            if not emotions:
                emotions.append("neutral")
            
            confidence = 0.85
            return {"emotions": emotions, "confidence": confidence}

    def detect_closure(self, user_message: str, state: Dict[str, Any]) -> bool:
        """
        Detect if user provides closure: summarized plan + confirmation + time commitment.
        """
        import re
        lm = user_message.lower()

        # Quick check for specific end simulation messages
        if "here's the summary" in lm or "end this simulation" in lm or "get my score" in lm:
            return True

        has_plan = re.search(r'\b(here(\'s| are)?|summary|plan|details|end this simulation|get my score)\b', lm, re.IGNORECASE)
        has_confirmation = re.search(r'\b(if you\'re aligned|does this work|agree|confirm|finalize)\b', lm, re.IGNORECASE) or re.search(r'\b(end this simulation|get my score)\b', lm, re.IGNORECASE)
        has_time = re.search(r'\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b', lm, re.IGNORECASE) or state.get("signal_counters", {}).get("time_commitment", 0) > 0
        return bool(has_plan and has_confirmation and has_time)
