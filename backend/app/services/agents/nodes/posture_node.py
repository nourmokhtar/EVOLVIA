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
    Advanced Body Language Analysis Agent supporting temporal (multi-frame) analysis.
    """
    print("--- POSTURE AGENT: ANALYZING KINETICS ---")
    try:
        video_frames = state.get("video_frames")
        video_frame_single = state.get("video_frame")
        
        frames_to_process = video_frames if video_frames else ([video_frame_single] if video_frame_single else [])
        
        if not frames_to_process:
            return {"posture_analysis": {"score": 50, "feedback": "No visual data detected."}}

        all_metrics = []
        print(f"Processing {len(frames_to_process)} frames for posture analysis...")
        
        for idx, frame in enumerate(frames_to_process):
            try:
                video_base64 = base64.b64encode(frame).decode('utf-8')
                frame_metrics = analyze_posture.invoke(video_base64)
                if "error" not in frame_metrics:
                    all_metrics.append({
                        "frame_index": idx,
                        "metrics": frame_metrics.get("metrics", {})
                    })
            except Exception as e:
                print(f"Skipping frame {idx} due to error: {e}")

        if not all_metrics:
             return {"posture_analysis": {"score": 50, "feedback": "Could not extract metrics from any frames."}}

        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a specialized Presentation Coach focusing on Non-Verbal Communication.
             Analyze the provided sequence of computer vision metrics to give a detailed performance review.
             You are looking at multiple snapshots across the duration of a pitch.
             
             METRICS EXPLANATION:
             - 'head_lift_score': Measures vertical projection. High = Confident/Projecting. Low = Looking down/Reading notes.
             - 'hands_visible': Count (0-2). Uses hands = Dynamic/Engaging. Static hands = Rigid.
             - 'shoulder_symmetry': Measures posture balance. High = Level/Professional. Low = Slouching.
             - 'alignment_score': Measures centering. High = Focused on audience.

             YOUR TASK:
             1. Observe TRENDS over time. Did the posture improve or degrade?
             2. Calculate an overall score (0-100) based on all frames.
             3. Provide a detailed prose 'feedback' summary covering the overall impression and temporal changes.
             4. List specific 'strengths' and 'improvements'.
             5. Rate Authority and Engagement.

             Respond ONLY in valid JSON:
             {{
                "score": int, (0-100)
                "feedback": "string", (3-4 sentences summarizing performance and any trends observed across frames)
                "strengths": ["string", "string"],
                "improvements": ["string", "string"],
                "authority_rating": int, (0-10)
                "engagement_rating": int, (0-10)
                "is_good": bool,
                "trends": "string" (Short description of how posture evolved)
             }}
             """),
            ("user", "Sequence of Live Metrics: {metrics}")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({"metrics": json.dumps(all_metrics)})
        
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
