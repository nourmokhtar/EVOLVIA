from typing import List, Optional, TypedDict, Annotated
import operator
from langchain_core.messages import BaseMessage

class SlideData(TypedDict):
    page_number: int
    text: str
    image_base64: Optional[str]

class DeckAnalysisState(TypedDict):
    """
    Shared state for the Pitch Deck Analysis LangGraph workflow.
    """
    # Input data
    file_name: str
    file_type: str  # 'pdf' or 'pptx'
    slides: List[SlideData]
    presentation_type: Annotated[str, lambda x, y: y] # e.g., 'Internal Pitch', 'Academic', 'Sales'
    
    # Analysis results (Agent outputs)
    content_analysis: Annotated[dict, operator.ior]     # Merge dictionaries
    design_analysis: Annotated[dict, operator.ior]
    strategy_analysis: Annotated[dict, operator.ior]
    
    # Final combined results
    overall_score: Annotated[int, lambda x, y: y]
    feedback_summary: Annotated[str, lambda x, y: y]
    recommendations: Annotated[List[str], operator.add]
    presentation_score: Annotated[int, lambda x, y: y]
    content_score: Annotated[int, lambda x, y: y]
    strategy_score: Annotated[int, lambda x, y: y]
    
    # Routing and history
    messages: Annotated[List[BaseMessage], operator.add] 
    next_node: str
