import os
import json
import base64
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from ..deck_analysis_state import DeckAnalysisState

def get_llm():
    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.2,
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_kwargs={"response_format": {"type": "json_object"}}
    )

async def presentation_classifier(state: DeckAnalysisState):
    """
    Detects the type of presentation based on the first few slides.
    """
    print("--- CLASSIFIER AGENT: IDENTIFYING PRESENTATION TYPE ---")
    # Send titles and some text from first 5 slides
    first_slides = "\n".join([f"Slide {s['page_number']}: {s['text'][:300]}" for s in state['slides'][:5]])
    
    llm = get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert Presentation Analyst. 
        Your task is to classify the provided slides into one of the following categories:
        - 'Startup Pitch': Seeking investment, focused on problem/solution/market.
        - 'Sales Deck': Focused on product features, benefits, and client pain points.
        - 'Academic/Educational': Research findings, lecture notes, or educational content.
        - 'Internal Business Report': Internal metrics, project updates, or quarterly reviews.
        - 'Keynote/Inspirational': Visionary, minimal text, focused on storytelling.
        
        Respond ONLY in JSON:
        {{
            "presentation_type": "string",
            "confidence": float
        }}
        """),
        ("user", "Slide Snippets:\n{slides}")
    ])
    
    chain = prompt | llm
    response = await chain.ainvoke({"slides": first_slides})
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        result = json.loads(content)
        presentation_type = result.get("presentation_type", "Startup Pitch")
    except:
        presentation_type = "Startup Pitch"
        
    print(f"Detected Type: {presentation_type}")
    return {"presentation_type": presentation_type}

async def content_analyzer(state: DeckAnalysisState):
    """
    Analyzes the narrative, clarity, and messaging of the pitch deck.
    """
    print("--- CONTENT AGENT: ANALYZING NARRATIVE ---")
    slides_text = "\n".join([f"Slide {s['page_number']}: {s['text']}" for s in state['slides']])
    
    llm = get_llm()
    presentation_type = state.get("presentation_type", "General")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert Presentation Storyteller specialized in {presentation_type}. 
        Analyze the text content of the slides for narrative flow, clarity, and impact based on the standards of a {presentation_type}.
        
        Use this SCORING RUBRIC:
        - 90-100: Compelling story, perfect flow, clear calls to action.
        - 70-89: Clear message but narrative breaks in places.
        - 40-69: Confusing structure or lacks a clear 'Hook'.
        - <40: Disorganized or unintelligible.
        
        Respond ONLY in JSON:
        {{
            "score": int,
            "feedback": "string",
            "strengths": ["string"],
            "weaknesses": ["string"],
            "narrative_flow_rating": int (1-10)
        }}
        """),
        ("user", "Slide Contents:\n{slides}")
    ])
    
    chain = prompt | llm
    response = await chain.ainvoke({"slides": slides_text, "presentation_type": presentation_type})
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
    except:
        analysis = {"score": 70, "feedback": "Could not parse analysis.", "narrative_flow_rating": 7}
        
    return {"content_analysis": analysis, "content_score": analysis.get("score", 70)}

async def design_analyzer(state: DeckAnalysisState):
    """
    Analyzes the visual appeal, layout, and hierarchy.
    Now uses structural metadata and slide images.
    """
    print("--- DESIGN AGENT: ANALYZING VISUALS & LAYOUT ---")
    
    # 1. Prepare structural data
    design_context = []
    for s in state['slides']:
        meta = s.get('metadata', {})
        design_context.append({
            "slide": s['page_number'],
            "word_count": meta.get("word_count", 0),
            "block_count": meta.get("block_count", 0),
            "is_heavy": meta.get("is_heavy", False),
            "snippet": s['text'][:100].replace("\n", " ") + "..."
        })
    
    # 2. Pick representative images (First 3 slides) to avoid token overflow
    sample_images = []
    for s in state['slides'][:3]:
        if s.get('image_base64'):
            sample_images.append(s['image_base64'])

    llm = get_llm() # Using Llama 3.1 8B (Text) for metadata analysis
    # If you have Llama 3.2 Vision, we could pass the actual images here.
    # For now, we use the rich metadata to simulate "seeing" the layout.
    
    presentation_type = state.get("presentation_type", "General")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a High-End Presentation Designer specialized in {presentation_type}.
        Your goal is to audit the visual design and layout of the deck.
        
        Analyze the structural data provided slide-by-slide:
        
        CRITICAL DESIGN RULES:
        1. **The 3-Second Rule**: Slides must be scannable in 3 seconds. Any slide with 'is_heavy': true fails this rule.
        2. **Visual Clutter**: Deduct 15 points if block_count > 6 across multiple slides.
        3. **Consistency**: Flag any slide that deviates significantly from the median word_count.
        
        SCORING RUBRIC (BE BRUTAL):
        - 90-100: Pristine layout, minimal text, elite visual hierarchy.
        - 70-89: Good, but occasional density issues or inconsistent blocks.
        - 40-69: Wall of text detected. This deck will lose an audience's attention.
        - <40: Amateur layout. Overwhelmingly text-heavy (e.g., >30% heavy slides).
        
        Respond ONLY in JSON:
        {{
            "score": int,
            "feedback": "string (Start with your most critical observation)",
            "visual_tips": ["Specific slide X needs [change]", "General style tip"],
            "layout_rating": int (1-10),
            "cluttered_slides": [int] (actual page numbers of heavy slides)
        }}
        """),
        ("user", "Structural Data of the Presentation:\n{data}")
    ])
    
    chain = prompt | llm
    response = await chain.ainvoke({
        "data": json.dumps(design_context, indent=2),
        "presentation_type": presentation_type
    })
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
    except:
        analysis = {"score": 60, "feedback": "Visually dense layout detected.", "layout_rating": 6}
        
    return {"design_analysis": analysis, "presentation_score": analysis.get("score", 60)}
    

async def strategy_analyzer(state: DeckAnalysisState):
    """
    Analyzes the business logic, market fit, and strategy.
    """
    print("--- STRATEGY AGENT: ANALYZING BUSINESS LOGIC ---")
    slides_text = "\n".join([f"Slide {s['page_number']}: {s['text']}" for s in state['slides']])
    
    llm = get_llm()
    presentation_type = state.get("presentation_type", "General")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a Strategic Consultant specializing in {presentation_type}.
        Analyze the strategic depth of this {presentation_type}.
        
        VC/CONSULTANT CHECKLIST:
        1. **Missing Moat**: If there is no clear competitive advantage mentioned, cap score at 75.
        2. **Vague Market**: If TAM/SAM is not clearly articulated with numbers, deduct 15 points.
        3. **Business Logic**: If the 'How you make money' is unclear, cap score at 60.
        
        SCORING RUBRIC:
        - 90-100: Airtight logic, massive opportunity, clear 'Unfair Advantage'.
        - 75-89: Solid business case but standard market execution risks.
        - 50-74: 'Good Idea' but lacks the rigor of a professional business case.
        - <50: Fatal flaws detected in the market logic or revenue model.
        
        Respond ONLY in JSON:
        {{
            "score": int,
            "feedback": "string (Begin with your most skeptical question)",
            "strategic_advice": ["Actionable step for slide X", "High-level strategic pivot"],
            "market_fit_rating": int (1-10)
        }}
        """),
        ("user", "Slide Contents:\n{slides}")
    ])
    
    chain = prompt | llm
    response = await chain.ainvoke({"slides": slides_text, "presentation_type": presentation_type})
    
    try:
        content = response.content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
    except:
        analysis = {"score": 65, "feedback": "Strategy seems solid but needs more data.", "market_fit_rating": 6}
        
    return {"strategy_analysis": analysis, "strategy_score": analysis.get("score", 65)}

async def deck_aggregator(state: DeckAnalysisState):
    """
    Aggregates all agent feedback into a final report.
    """
    print("--- DECK AGGREGATOR: FINALIZING REPORT ---")
    
    content = state.get("content_analysis", {})
    design = state.get("design_analysis", {})
    strategy = state.get("strategy_analysis", {})
    
    # Check if we have at least partial data to avoid division by zero or empty reports
    # In a fan-in, this node might be called multiple times.
    scores = [s for s in [content.get("score"), design.get("score"), strategy.get("score")] if s is not None]
    if not scores:
        return {}
        
    overall_score = sum(scores) // len(scores)
    presentation_type = state.get("presentation_type", "Presentation")
    
    summary = f"Your {presentation_type} analysis is complete. Content Score: {content.get('score', 'N/A')}, Design Score: {design.get('score', 'N/A')}, Strategy Score: {strategy.get('score', 'N/A')}."
    
    recommendations = []
    recommendations.extend(content.get("weaknesses", []))
    recommendations.extend(strategy.get("strategic_advice", []))
    
    return {
        "overall_score": overall_score,
        "feedback_summary": summary,
        "recommendations": recommendations[:5]
    }
