from typing import List, Optional, TypedDict, Annotated
import operator
from langchain_core.messages import BaseMessage

class PitchAnalysisState(TypedDict):
    """
    Shared state for the Pitch Analysis LangGraph workflow.
    """
    # Input data
    video_frame: Optional[bytes]      # Current video frame for analysis
    audio_chunk: Optional[bytes]      # Current audio chunk for analysis
    transcript: Optional[str]         # Text transcript of the pitch segment
    
    # Analysis results (Agent outputs)
    posture_analysis: Annotated[dict, operator.ior]     # Merge dictionaries
    tone_analysis: Annotated[dict, operator.ior]
    stress_analysis: Annotated[dict, operator.ior]
    presentation_analysis: Annotated[dict, operator.ior]
    
    # Final combined results
    overall_score: int
    feedback_summary: str
    recommendations: List[str]
    competency_map: Annotated[dict, operator.ior]
    
    # Routing and history
    messages: Annotated[List[BaseMessage], operator.add] # Append to message history
    next_node: str
