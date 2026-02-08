from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class StartRequest(BaseModel):
    scenario_id: Optional[str] = Field(default="scenario_001")


class StartResponse(BaseModel):
    session_id: str
    npc_message: str
    scenario_title: str
    turn_index: int


class TurnRequest(BaseModel):
    session_id: str
    user_message: str


class EvaluationModel(BaseModel):
    scores: Dict[str, float]
    confidence: float
    evidence: List[str]
    missed_opportunities: List[str]
    quotes: Optional[List[str]] = None


class FeedbackModel(BaseModel):
    summary: str
    what_you_did_well: List[str]
    what_to_improve: List[str]
    example_improved_response: str
    next_drill_suggestion: str
    quotes: Optional[List[str]] = None


class FinalEvaluationModel(BaseModel):
    scores: Dict[str, float]
    confidence: float
    evidence: List[str]
    missed_opportunities: List[str]
    feedback: FeedbackModel


class TurnResponse(BaseModel):
    npc_reply: Optional[str] = None
    evaluation: Optional[EvaluationModel] = None
    feedback: Optional[FeedbackModel] = None
    turn_index: int
    status: str = "ongoing"
    final_evaluation: Optional[FinalEvaluationModel] = None
