from fastapi import APIRouter, HTTPException, status, Request
from typing import Any
import json

from ..services.collaboration_service import CollaborationService
from ..services.session_store import SessionNotFound
from ..schemas.collaboration_schemas import StartRequest, StartResponse, TurnRequest, TurnResponse, EvaluationModel

router = APIRouter()
# Singleton instance: safe since CollaborationService is stateless
_service = CollaborationService()


async def parse_request_body_robust(request: Request, model_class):
    """
    Parse request body with fallback for malformed JSON (e.g., from curl.exe on Windows).
    Always reads raw body, cleans it, and parses manually to handle encoding issues.
    """
    try:
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8-sig')  # Handle BOM
        # Clean common Windows/curl artifacts
        cleaned = body_str.strip().replace('\r', '').replace('\n', '').replace('\t', '')
        data = json.loads(cleaned)
        return model_class(**data)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON in request body")


@router.post("/start", response_model=StartResponse)
async def start_session(request: Request) -> Any:
    """Start a collaboration session (delegates to service)."""
    payload = await parse_request_body_robust(request, StartRequest)
    result = _service.start_session(payload.scenario_id or "scenario_001")
    return StartResponse(**result)


@router.post("/turn", response_model=TurnResponse)
async def process_turn(request: Request) -> Any:
    """Process a user turn. Returns 404 if session invalid/expired."""
    payload = await parse_request_body_robust(request, TurnRequest)
    try:
        result = _service.process_turn(payload.session_id, payload.user_message)
    except SessionNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    # FIX: Check for completion status in service result
    # We want to use the service's status, but if it says ongoing and we see the completion message, we override it.
    status_str = result.get("status", "ongoing")
    npc_reply = result.get("npc_reply")

    if status_str != "completed" and npc_reply and "Thank you for completing" in npc_reply:
        status_str = "completed"

    final_eval = None
    if status_str == "completed":
        if result.get("final_evaluation"):
            final_eval = result["final_evaluation"]
        else:
            # Fallback if service didn't create it
            final_eval = {
                "scores": result.get("evaluation", {}).get("scores", {"empathy": 50, "clarity": 50, "commitment": 50}),
                "confidence": 0.8,
                "evidence": [],
                "missed_opportunities": [],
                "feedback": {
                    "summary": "Simulation completed.",
                    "what_you_did_well": [],
                    "what_to_improve": [],
                    "example_improved_response": "",
                    "next_drill_suggestion": "",
                    "quotes": []
                }
            }

    # Construct response
    eval_model = None
    if result.get("evaluation"):
        eval_model = EvaluationModel(**result["evaluation"])

    # Ensure we use the mapped valid status and final_evaluation
    return TurnResponse(
        npc_reply=result.get("npc_reply"),
        evaluation=eval_model,
        turn_index=result["turn_index"],
        status=status_str,
        final_evaluation=final_eval
    )