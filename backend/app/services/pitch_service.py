import os
import base64
import traceback
from .agents.tools.transcription_tools import transcribe_audio_groq
try:
    import opik
    api_key = os.getenv("OPIK_API_KEY")
    project = os.getenv("OPIK_PROJECT_NAME", "evolvia-coaching-platform")
    if api_key:
        opik.configure(api_key=api_key)
        print(f"--- OPIK CONFIGURED: Project={project} ---")
    else:
        print("--- OPIK WARNING: No API Key found in environment ---")
except Exception as e:
    print(f"--- OPIK CONFIG ERROR: {str(e)} ---")

class PitchService:
    """
    Service layer to handle pitch analysis requests via LangGraph + Groq Whisper.
    """
    
    async def analyze_presentation_segment(self, video_bytes=None, audio_bytes=None, transcript_provided=""):
        """
        Transcribes audio and then invokes the LangGraph to analyze the presentation.
        """
        try:
            # 1. Real Transcription Step
            transcript = transcript_provided
            if audio_bytes and not transcript_provided:
                print("--- STARTING TRANSCRIPTION ---")
                transcript = await transcribe_audio_groq(audio_bytes)
                print(f"--- GOT TRANSCRIPT: {transcript[:50]}... ---")

            # 2. Initial state
            initial_state = {
                "video_frame": video_bytes,
                "audio_chunk": audio_bytes,
                "transcript": transcript,
                "posture_analysis": {},
                "tone_analysis": {},
                "stress_analysis": {},
                "presentation_analysis": {},
                "messages": [],
                "overall_score": 0,
                "feedback_summary": "",
                "recommendations": []
            }
            
            # 3. Dynamic import to avoid module-level initialization crashes
            from .agents.pitch_analysis_graph import pitch_graph
            
            # 4. Integrate Opik Tracing
            try:
                import os
                from opik.integrations.langchain import OpikTracer
                project_name = os.getenv("OPIK_PROJECT_NAME", "evolvia-coaching-platform")
                opik_tracer = OpikTracer(project_name=project_name)
                config = {"callbacks": [opik_tracer]}
                print(f"--- INVOKING GRAPH WITH OPIK TRACING (Project: {project_name}) ---")
            except Exception as opik_err:
                print(f"--- OPIK NOT INITIALIZED: {str(opik_err)} (Continuing without tracing) ---")
                config = {}

            result = await pitch_graph.ainvoke(initial_state, config=config)
            print("--- GRAPH COMPLETE ---")
            
            return {
                "overall_score": result.get("overall_score", 70),
                "posture": result.get("posture_analysis", {}),
                "tone": result.get("tone_analysis", {}),
                "stress": result.get("stress_analysis", {}),
                "transcript": transcript,
                "summary": result.get("feedback_summary", "Analysis complete."),
                "recommendations": result.get("recommendations", ["Keep practicing!"]),
                "competency_map": result.get("competency_map", {"Authority": 50, "Empathy": 50, "Resilience": 50, "Persuasion": 50})
            }
        except Exception as e:
            print("!!! CRITICAL SERVICE ERROR !!!")
            traceback.print_exc()
            return {
                "overall_score": 0,
                "summary": f"Service Error: {str(e)}",
                "recommendations": ["Restarting the backend might help if the issue persists."],
                "transcript": ""
            }

pitch_service = PitchService()
