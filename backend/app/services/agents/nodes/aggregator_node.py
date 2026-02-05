from langchain_groq import ChatGroq
import os
from langchain_core.prompts import ChatPromptTemplate
from ..pitch_graph_state import PitchAnalysisState
import json
try:
    from opik import track
except ImportError:
    def track(func): return func

@track
async def aggregator_node(state: PitchAnalysisState):
    """
    Lead Executive Coach Agent - Final Synthesis.
    """
    print("--- HEAD COACH: THE FINAL VERDICT ---")
    try:
        posture = state.get("posture_analysis", {})
        tone = state.get("tone_analysis", {})
        stress = state.get("stress_analysis", {})
        transcript = state.get("transcript", "")
        
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1, # Lower temperature for stricter JSON
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Lead Executive Coach. 
             Synthesize the data into a high-impact growth plan.
             
             INPUT DATA to consider:
             - Posture: Look at 'head_lift_score', 'hands_visible', and the 'trends' field (which describes how body language evolved).
             - Tone: Look at 'wpm', 'silence_ratio', and 'pitch_variance'.
             - Stress: Look at 'stress_score' and 'nervous_habits'.
             
             Generate a Summary that specifically references these details and the PROGRESSION of the performance (e.g. 'You started strong but your energy dipped towards the end, as seen in your decreasing head lift score and slower pace').

             Respond ONLY in a single valid JSON object. 
             IMPORTANT: Do not use unescaped double quotes inside strings. Use single quotes if necessary.
             
             JSON Structure:
             {{
                "overall_score": int,
                "summary": "vision-driven summary",
                "recommendations": ["Strategy 1", "Strategy 2", "Strategy 3"],
                "competency_map": {{
                    "Authority": int,
                    "Empathy": int,
                    "Resilience": int,
                    "Persuasion": int
                }}
             }}
             """),
            ("user", "Transcript: {transcript}\nPosture: {posture}\nTone: {tone}\nStress: {stress}")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({
            "transcript": transcript,
            "posture": json.dumps(posture),
            "tone": json.dumps(tone),
            "stress": json.dumps(stress)
        })
        
        content = response.content.strip()
        
        # Robust JSON extraction
        try:
            import re
            json_match = re.search(r"(\{.*\})", content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            
            final_data = json.loads(content)
        except Exception as json_err:
            print(f"--- JSON PARSE RETRY: {str(json_err)} ---")
            # Fallback to simple cleanup if regex+loads fails
            content = content.replace("```json", "").replace("```", "").strip()
            final_data = json.loads(content)
        print(f"AGGREGATOR RESULT: {json.dumps(final_data, indent=2)}")
        
        # Format recommendations safely
        raw_recs = final_data.get("recommendations", ["Focus on clarity", "Relax your posture"])
        clean_recs = [str(r.get("feedback", r)) if isinstance(r, dict) else str(r) for r in raw_recs]

        # Normalize competency_map keys for the frontend
        raw_map = final_data.get("competency_map", {})
        norm_map = {
            "Authority": raw_map.get("Authority", raw_map.get("authority", 70)),
            "Empathy": raw_map.get("Empathy", raw_map.get("empathy", 70)),
            "Resilience": raw_map.get("Resilience", raw_map.get("resilience", 70)),
            "Persuasion": raw_map.get("Persuasion", raw_map.get("persuasion", 70))
        }

        return {
            "overall_score": int(final_data.get("overall_score", 70)),
            "feedback_summary": str(final_data.get("summary", "Session recorded.")),
            "recommendations": clean_recs,
            "competency_map": norm_map
        }
    except Exception as e:
        print(f"!!! AGGREGATOR FAILED: {str(e)} !!!")
        return {
            "overall_score": 75,
            "feedback_summary": "Solid foundation. Work on eye contact and vocal dynamics.",
            "recommendations": ["Watch your pacing", "Stand tall"],
            "competency_map": {"Authority": 70, "Empathy": 70, "Resilience": 70, "Persuasion": 70}
        }
