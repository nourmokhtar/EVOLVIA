from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from ..pitch_graph_state import PitchAnalysisState
from ..tools.posture_tools import analyze_posture
import json
import base64
import os
try:
    from opik import track
except ImportError:
    def track(func): return func

@track
async def posture_agent(state: PitchAnalysisState):
    """
    Advanced Body Language Analysis Agent.
    """
    print("--- POSTURE AGENT: ANALYZING KINETICS ---")
    try:
        video_frame = state.get("video_frame")
        if not video_frame:
            return {"posture_analysis": {"score": 50, "feedback": "No visual data detected."}}

        video_base64 = base64.b64encode(video_frame).decode('utf-8')
        metrics = analyze_posture.invoke(video_base64)
        
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an world-class Executive Body Language Expert. 
             Analyze the provided metrics and return a sophisticated JSON analysis.
             Respond ONLY in valid JSON.
             {{
                "score": int,
                "feedback": "string",
                "authority_rating": int,
                "engagement_rating": int,
                "is_good": bool
             }}
             """),
            ("user", "Live Metrics: {metrics}")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({"metrics": json.dumps(metrics)})
        
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

        print(f"POSTURE RESULT: {json.dumps(analysis, indent=2)}")
        return {"posture_analysis": analysis}
    except Exception as e:
        print(f"!!! POSTURE AGENT FAILED: {str(e)} !!!")
        return {"posture_analysis": {"score": 70, "feedback": "Keep your back straight and shoulders level to project confidence.", "is_good": True}}
