from langgraph.graph import StateGraph, END
from .deck_analysis_state import DeckAnalysisState
from .nodes.deck_nodes import (
    presentation_classifier, 
    content_analyzer, 
    design_analyzer, 
    strategy_analyzer, 
    deck_aggregator
)

def create_deck_analysis_graph():
    """
    Creates and compiles the LangGraph workflow for pitch deck analysis.
    The Classifier runs first, then Content, Design, and Strategy run in PARALLEL.
    """
    workflow = StateGraph(DeckAnalysisState)

    # 1. Add our nodes
    workflow.add_node("classifier", presentation_classifier)
    workflow.add_node("content_analyzer", content_analyzer)
    workflow.add_node("design_analyzer", design_analyzer)
    workflow.add_node("strategy_analyzer", strategy_analyzer)
    workflow.add_node("deck_aggregator", deck_aggregator)

    # 2. Define the Routing
    workflow.set_entry_point("classifier")
    
    # Fan out from classifier to parallel agents
    workflow.add_edge("classifier", "content_analyzer")
    workflow.add_edge("classifier", "design_analyzer")
    workflow.add_edge("classifier", "strategy_analyzer")
    
    # Fan in (Wait for all to finish before aggregating)
    workflow.add_edge("content_analyzer", "deck_aggregator")
    workflow.add_edge("design_analyzer", "deck_aggregator")
    workflow.add_edge("strategy_analyzer", "deck_aggregator")
    
    workflow.add_edge("deck_aggregator", END)

    # 3. Compile the graph
    return workflow.compile()

# Singleton instance of the graph
deck_graph = create_deck_analysis_graph()
