from typing import Dict, Any, List, TypedDict
from app.models import User
from sqlalchemy.orm import Session
from app.core.config import settings
import json
import logging
import os
from langgraph.graph import StateGraph
from langchain_ollama import OllamaLLM
from opik import track, configure
from datetime import datetime
logger = logging.getLogger(__name__)


from app.core.config import settings


opik_api_key = settings.opik_api_key

opik_project_name = settings.opik_project_name

opik_workspace = settings.opik_workspace

if opik_api_key:
    configure(api_key=opik_api_key ,workspace=opik_workspace
            #   project_name=opik_project_name
            )
    logger.info(f"Opik configured with project: {opik_project_name}")
else:
    logger.warning("OPIK_API_KEY not set. Opik tracing will be disabled.")

class PersonalityState(TypedDict):
    """State for LangGraph personality analysis workflow"""
    user_prompt: str
    analysis_text: str
    traits_delta: Dict[str, int]
    model_used: str
    error: str

class PersonalityService:
    """
    Manages psychological traits and radar map data generation.
    Integrates with Ollama for local LLM-based personality analysis.
    Uses LangGraph for workflow orchestration and Opik for observability.
    """
    
    PERSONALITY_TRAITS = [
        "Communication",
        "Empathy",
        "Conflict Res",
        "Collaboration",
        "Confidence",
        "Adaptability"
    ]
    
    def __init__(self):
        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.ollama_model = settings.OLLAMA_MODEL
        self.use_ollama = settings.USE_OLLAMA_FOR_PERSONALITY
        self.llm = None
        self.graph = None
        
        if self.use_ollama:
            try:
                self.llm = OllamaLLM(
                    base_url=self.ollama_base_url,
                    model=self.ollama_model,
                    temperature=0.7,
                    timeout=180 
                )
                self.graph = self._build_personality_graph()
            except Exception as e:
                logger.warning(f"Failed to initialize Ollama LLM: {e}")
    
    def _build_personality_graph(self):
        """Build LangGraph workflow for personality analysis"""
        workflow = StateGraph(PersonalityState)
        
        # Add nodes for the analysis pipeline
        workflow.add_node("validate_input", self._validate_input_node)
        workflow.add_node("analyze_traits", self._analyze_traits_node)
        workflow.add_node("parse_response", self._parse_response_node)
        workflow.add_node("finalize", self._finalize_node)
        
        # Define edges
        workflow.add_edge("validate_input", "analyze_traits")
        workflow.add_edge("analyze_traits", "parse_response")
        workflow.add_edge("parse_response", "finalize")
        
        # Set entry and exit points
        workflow.set_entry_point("validate_input")
        workflow.set_finish_point("finalize")
        
        return workflow.compile()
    
    def _validate_input_node(self, state: PersonalityState) -> PersonalityState:
        """Validate user input"""
        if not state["user_prompt"] or state["user_prompt"].strip() == "":
            state["error"] = "Prompt cannot be empty"
        return state
    
    @track(project_name=opik_project_name)
    def _analyze_traits_node(self, state: PersonalityState) -> PersonalityState:
        """Analyze personality traits using Ollama with Opik tracking"""
        if state.get("error"):
            return state
        
        try:
            analysis_prompt = self._create_personality_analysis_prompt(state["user_prompt"])
            
            if self.llm:
                analysis_text = self.llm.invoke(analysis_prompt)
                logger.info(f"Ollama response: {analysis_text}")
                state["analysis_text"] = analysis_text
                state["model_used"] = self.ollama_model
            else:
                state["error"] = "Ollama model not initialized"
        
        except Exception as e:
            logger.error(f"Error in traits analysis: {str(e)}")
            state["error"] = str(e)
        
        return state
    
    def _parse_response_node(self, state: PersonalityState) -> PersonalityState:
        """Parse the LLM response to extract trait scores"""
        if state.get("error"):
            state["traits_delta"] = {trait: 0 for trait in self.PERSONALITY_TRAITS}
            return state
        
        state["traits_delta"] = self._parse_trait_scores(state.get("analysis_text", ""))
        return state
    
    def _finalize_node(self, state: PersonalityState) -> PersonalityState:
        """Finalize the analysis result"""
        return state
    
    def get_radar_data(self, user: User) -> Dict[str, Any]:
        """
        Calculates and formats user traits for Recharts.
        Returns a list of objects ready for the Frontend radar chart.
        """
        default_profile = {
            "Communication": 50,
            "Empathy": 50,
            "Conflict Res": 50,
            "Collaboration": 50,
            "Confidence": 50,
            "Adaptability": 50
        }
        profile = user.personality_profile or default_profile
        
        return [
            {"subject": k, "A": v, "fullMark": 100} 
            for k, v in profile.items()
        ]

    async def update_score(self, db: Session, user: User, trait: str, delta: int):
        """
        Updates a specific trait score (e.g., Confidence +5).
        Clamps values between 0 and 100.
        """
        profile = user.personality_profile or {}
        current = profile.get(trait, 50)
        profile[trait] = max(0, min(100, current + delta))
        
        user.personality_profile = profile
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    async def analyze_user_input_with_ollama(self, user_prompt: str) -> Dict[str, Any]:
        """
        Uses LangGraph + Opik to analyze user prompt and estimate personality trait changes.
        LangGraph orchestrates the workflow, Opik tracks the execution for observability.
        Returns a dict with trait deltas and analysis feedback.
        """
        if not self.use_ollama:
            logger.warning("Ollama is disabled. Skipping personality analysis.")
            return {"error": "Ollama is not enabled", "traits_delta": {}}
        
        if not self.graph or not self.llm:
            logger.error("LangGraph or LLM not initialized")
            return {
                "success": False,
                "error": "LangGraph or LLM not properly initialized",
                "traits_delta": {}
            }
        
        try:
            # Initialize state for LangGraph
            initial_state: PersonalityState = {
                "user_prompt": user_prompt,
                "analysis_text": "",
                "traits_delta": {},
                "model_used": self.ollama_model,
                "error": ""
            }
            
            # Execute the LangGraph workflow with Opik tracing
            result_state = self.graph.invoke(initial_state)
            
            if result_state.get("error"):
                logger.error(f"Error in personality analysis: {result_state['error']}")
                return {
                    "success": False,
                    "error": result_state["error"],
                    "traits_delta": result_state.get("traits_delta", {})
                }
            
            return {
                "success": True,
                "traits_delta": result_state.get("traits_delta", {}),
                "analysis": result_state.get("analysis_text", ""),
                "model_used": result_state.get("model_used", self.ollama_model)
            }
        
        except Exception as e:
            logger.error(f"Error in LangGraph personality analysis: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "traits_delta": {}
            }
    
    def _create_personality_analysis_prompt(self, user_prompt: str) -> str:
        """
        Creates a detailed prompt for Ollama to analyze personality traits.
        """
        traits_list = ", ".join(self.PERSONALITY_TRAITS)
        
        prompt = f"""Analyze the following user input and estimate personality trait point changes (-10 to +10 range).

User input: "{user_prompt}"

Personality traits to evaluate: {traits_list}

Provide a JSON response in the following format:
{{
    "Communication": <-10 to +10>,
    "Empathy": <-10 to +10>,
    "Conflict Res": <-10 to +10>,
    "Collaboration": <-10 to +10>,
    "Confidence": <-10 to +10>,
    "Adaptability": <-10 to +10>,
    "analysis": "Brief explanation of why these scores were assigned"
}}

Be concise and provide only the JSON response.
"""
        return prompt
    
    def _parse_trait_scores(self, response_text: str) -> Dict[str, int]:
        """
        Parses Ollama response to extract trait score deltas.
        Looks for JSON structure in the response.
        """
        traits_delta = {trait: 0 for trait in self.PERSONALITY_TRAITS}
        
        try:
            # Try to extract JSON from the response
            # Look for content between { and }
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(0)
                parsed = json.loads(json_str)
                
                # Extract trait scores and clamp to [-10, 10]
                for trait in self.PERSONALITY_TRAITS:
                    if trait in parsed:
                        score = int(parsed[trait])
                        traits_delta[trait] = max(-10, min(10, score))
            
            return traits_delta
        
        except Exception as e:
            logger.error(f"Error parsing trait scores: {str(e)}")
            return {trait: 0 for trait in self.PERSONALITY_TRAITS}
    
    async def analyze_and_update_personality(
        self, 
        db: Session, 
        user: User, 
        user_prompt: str
    ) -> Dict[str, Any]:
        """
        Complete flow: Analyzes user input with Ollama and updates personality profile.
        Returns updated profile and analysis details.
        """
        # Analyze with Ollama
        analysis_result = await self.analyze_user_input_with_ollama(user_prompt)
        
        if not analysis_result.get("success", False):
            return analysis_result
        
        # Update personality traits based on analysis
        traits_delta = analysis_result.get("traits_delta", {})
        profile = user.personality_profile or {trait: 50 for trait in self.PERSONALITY_TRAITS}
        
        for trait, delta in traits_delta.items():
            if trait in profile:
                current = profile[trait]
                profile[trait] = max(0, min(100, current + delta))
        

        try:
            # CRITICAL FIX: Create a new dict to trigger SQLAlchemy's change detection
            user.personality_profile = dict(profile)
            
            # Mark the column as modified (important for JSON columns!)
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(user, "personality_profile")
            
            # Update the timestamp
            user.updated_at = datetime.utcnow()
            print(user,file=os.sys.stdout,flush=True)
            print("Committing changes to database...")
            db.add(user)
            db.commit()
            print("Changes committed to database")
            db.refresh(user)
            print("Database refreshed")
        except Exception as e:
            db.rollback()  # Important: rollback on error
            print(f"Error updating user: {e}")
            # Handle the error appropriately

        return {
            "success": True,
            "user_prompt": user_prompt,
            "traits_delta": traits_delta,
            "updated_profile": user.personality_profile,
            "analysis": analysis_result.get("analysis", "")
        }

personality_service = PersonalityService()
