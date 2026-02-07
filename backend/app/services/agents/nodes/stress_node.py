from langchain_groq import ChatGroq
import os
from langchain_core.prompts import ChatPromptTemplate
from ..pitch_graph_state import PitchAnalysisState
from ..tools.stress_tools import analyze_filler_words
import json
try:
    from opik import track
except ImportError:
    def track(func): return func

@track
async def stress_agent(state: PitchAnalysisState):
    """
    Advanced Psychological Stress Monitoring Agent.
    """
    print("--- STRESS AGENT: CORE PSYCHOMETRICS ---")
    try:
        transcript = state.get("transcript", "")
        filler_metrics = analyze_filler_words.invoke(transcript)
        tone_data = state.get("tone_analysis", {})
        posture_data = state.get("posture_analysis", {})
        
        if os.getenv("GROQ_API_KEY"):
            llm = ChatGroq(
                model="llama-3.1-8b-instant",
                temperature=0.1,
                groq_api_key=os.getenv("GROQ_API_KEY"),
                model_kwargs={"response_format": {"type": "json_object"}}
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a Stress & Performance Psychologist. 
                 Combine TEXT fillers, VOCAL tones, and BODY posture to determine stress levels.
                 Respond ONLY in valid JSON.
                 {{
                    "stress_score": int,
                    "resilience_score": int,
                    "feedback": "string",
                    "nervous_habits": ["habit1", "habit2"]
                 }}
                 """),
                ("user", "Fillers: {fillers}. Tone: {tone}. Posture: {posture}")
            ])
            
            chain = prompt | llm
            response = await chain.ainvoke({
                "fillers": json.dumps(filler_metrics),
                "tone": json.dumps(tone_data),
                "posture": json.dumps(posture_data)
            })
            content = response.content.strip()
        else:
            print("--- USING TOKEN FACTORY FALLBACK FOR STRESS AGENT ---")
            from openai import OpenAI
            import httpx
            from app.core.config import settings
            
            client = OpenAI(
                api_key=settings.TOKEN_FACTORY_KEY,
                base_url=settings.TOKEN_FACTORY_URL,
                http_client=httpx.Client(verify=False)
            )
            
            system_prompt = """You are a Stress & Performance Psychologist. 
             Combine TEXT fillers, VOCAL tones, and BODY posture to determine stress levels.
             Respond ONLY in valid JSON.
             {
                "stress_score": int,
                "resilience_score": int,
                "feedback": "string",
                "nervous_habits": ["habit1", "habit2"]
             }
             """
            
            response = client.chat.completions.create(
                model=settings.TOKEN_FACTORY_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt + "\nIMPORTANT: Return ONLY valid JSON."},
                    {"role": "user", "content": f"Fillers: {json.dumps(filler_metrics)}. Tone: {json.dumps(tone_data)}. Posture: {json.dumps(posture_data)}"}
                ],
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()

        try:
            import re
            json_match = re.search(r"(\{.*\})", content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            analysis = json.loads(content)
        except:
            content = content.replace("```json", "").replace("```", "").strip()
            analysis = json.loads(content)

        print(f"STRESS RESULT: {json.dumps(analysis, indent=2)}")
        return {"stress_analysis": analysis}
    except Exception as e:
        print(f"!!! STRESS AGENT FAILED: {str(e)} !!!")
        return {"stress_analysis": {"stress_score": 0, "feedback": "Stress analysis failed. Check API configuration.", "nervous_habits": []}}
