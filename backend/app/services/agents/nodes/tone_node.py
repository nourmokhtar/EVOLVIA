from langchain_groq import ChatGroq
import os
from langchain_core.prompts import ChatPromptTemplate
from ..pitch_graph_state import PitchAnalysisState
from ..tools.audio_tools import analyze_vocal_delivery
import json
import base64
try:
    from opik import track
except ImportError:
    def track(func): return func

@track
async def tone_agent(state: PitchAnalysisState):
    """
    Advanced Vocal Resonance Analysis Agent.
    """
    print("--- TONE AGENT: ANALYZING RESONANCE ---")
    try:
        audio_chunk = state.get("audio_chunk")
        transcript = state.get("transcript", "No transcript available")
        
        metrics = {"vocal_engagement_score": 50, "status": "No audio"}
        if audio_chunk:
            audio_base64 = base64.b64encode(audio_chunk).decode('utf-8')
            metrics = analyze_vocal_delivery.invoke(audio_base64)
        
        # 1. ENRICH METRICS WITH WPM
        word_count = len(transcript.split())
        duration = metrics.get("duration", 0)
        
        wpm = 0
        if duration > 0 and word_count > 0:
            wpm = int((word_count / duration) * 60)
        
        metrics["wpm"] = wpm
        metrics["word_count"] = word_count
        
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Vocal Psychology expert. 
             Analyze the speaker's delivery based on the provided acoustic metrics and text.
             
             METRICS EXPLANATION:
             - 'wpm' (Words Per Minute): Normal is 130-150. >160 is fast/anxious. <110 is slow.
             - 'pitch_variance': High (>25) = Expressive/Dynamic. Low (<15) = Monotone/Bored.
             - 'silence_ratio': High (>0.2) = Many pauses (thoughtful or hesitant). Low = Continuous speech.
             - 'volume_level': Energy indicator.

             Analyze the relationship between the TEXT content and the VOCAL metrics.
             Respond ONLY in valid JSON.
             {{
                "score": int, (0-100, based on engagement)
                "feedback": "string", (Specific advice on speed, tone, and pauses)
                "empathy_score": int,
                "energy_level": "Low/Calm/Dynamic/High",
                "speaking_rate_rating": "Slow/Ideal/Fast",
                "voice_type": "string"
             }}
             """),
            ("user", "Metrics: {metrics}. Text: {transcript}")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({"metrics": json.dumps(metrics), "transcript": transcript})
        
        content = response.content.strip()
        try:
            import re
            json_match = re.search(r"(\{.*\})", content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            analysis = json.loads(content)
        except:
            content = response.content.replace("```json", "").replace("```", "").strip()
            analysis = json.loads(content)

        print(f"TONE RESULT: {json.dumps(analysis, indent=2)}")
        return {"tone_analysis": analysis}
    except Exception as e:
        print(f"!!! TONE AGENT FAILED: {str(e)} !!!")
        return {"tone_analysis": {"score": 0, "feedback": "Vocal analysis failed. Check API configuration.", "voice_type": "Unavailable"}}
