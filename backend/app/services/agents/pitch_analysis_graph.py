from langgraph.graph import StateGraph, END
from .pitch_graph_state import PitchAnalysisState
from .nodes.posture_node import posture_agent
from .nodes.tone_node import tone_agent
from .nodes.stress_node import stress_agent
from .nodes.aggregator_node import aggregator_node

def create_pitch_analysis_graph():
    """
    Creates and compiles the LangGraph workflow for pitch analysis.
    """
    # 1. Initialize the Graph
    workflow = StateGraph(PitchAnalysisState)

    # 2. Add our nodes
    workflow.add_node("posture_agency", posture_agent)
    workflow.add_node("tone_agency", tone_agent)
    workflow.add_node("stress_agency", stress_agent)
    workflow.add_node("aggregator", aggregator_node)

    # 3. Define the edges (Path: Posture -> Tone -> Stress -> Aggregator)
    workflow.set_entry_point("posture_agency")
    workflow.add_edge("posture_agency", "tone_agency")
    workflow.add_edge("tone_agency", "stress_agency")
    workflow.add_edge("stress_agency", "aggregator")
    workflow.add_edge("aggregator", END)

    # 4. Compile the graph
    return workflow.compile()

# Singleton instance of the graph
pitch_graph = create_pitch_analysis_graph()
