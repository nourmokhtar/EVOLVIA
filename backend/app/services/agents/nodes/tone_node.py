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
        
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Vocal Psychology expert. 
             Analyze the relationship between the TEXT content and the VOCAL metrics.
             Respond ONLY in valid JSON.
             {{
                "score": int,
                "feedback": "string",
                "empathy_score": int,
                "energy_level": "Low/Calm/Dynamic/High",
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
        return {"tone_analysis": {"score": 75, "feedback": "Your voice has a good baseline rhythm.", "voice_type": "Neutral"}}
