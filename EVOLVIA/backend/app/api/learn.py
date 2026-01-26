"""
Learn router - REST/WebSocket endpoints for interactive learning sessions.

Provides:
- POST /learn/session/start - Initialize a lesson session
- POST /learn/session/event - Send events (user message, interrupt, resume)
- WS /learn/ws - WebSocket for bidirectional streaming (recommended)
"""

from fastapi import APIRouter, WebSocket, Depends, HTTPException, WebSocketDisconnect
from typing import Optional
import uuid
import json
import logging

from app.schemas.learn import (
    InboundEvent,
    OutboundEvent,
    StartLessonEvent,
    UserMessageEvent,
    InterruptEvent,
    ResumeEvent,
    StatusEvent,
    ErrorEvent,
    SessionStatus,
)
from app.services.learn_session import LearnSessionManager, LearnSession
from app.services.learn_llm import LearnLLMService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["learn"])

# Global session manager
session_manager = LearnSessionManager()
# LLM service for teacher responses
llm_service = LearnLLMService(llm_provider="token_factory", enable_tracing=True)


# ============================================================================
# HTTP Endpoints (for future use / testing)
# ============================================================================


@router.post("/learn/session/start")
async def start_session(event: StartLessonEvent):
    """
    Start a new learning session.

    Returns: session_id for use in subsequent events
    """
    logger.info("🔄 Received start_session request")
    session_id = str(uuid.uuid4())
    logger.info(f"🔄 Generated session_id: {session_id}")

    try:
        logger.info("🔄 Creating session...")
        session = session_manager.create_session(
            session_id=session_id,
            lesson_id=event.lesson_id,
            user_id=str(event.user_id) if event.user_id else None,
        )
        logger.info("✅ Session created successfully")

        logger.info(f"Started session {session_id} for lesson {event.lesson_id}")
        logger.info(f"Session manager now has {len(session_manager.sessions)} sessions")
        logger.info(f"All session IDs: {list(session_manager.sessions.keys())}")

        response = {
            "session_id": session_id,
            "status": session.status,
        }
        logger.info(f"🔄 Returning response: {response}")
        return response
    except Exception as e:
        logger.error(f"❌ Failed to start session: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learn/session/event")
async def send_event(event: InboundEvent):
    """
    Send an event to the learning session.
    
    Supports: USER_MESSAGE, INTERRUPT, RESUME
    
    Note: This is a synchronous endpoint. For streaming responses,
    use the WebSocket endpoint instead.
    """
    # Determine session ID based on event type
    if isinstance(event, StartLessonEvent):
        raise HTTPException(
            status_code=400,
            detail="Use /learn/session/start for starting sessions",
        )
    
    # Get session
    session_id = getattr(event, "session_id", None)
    if not session_id or not session_manager.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = session_manager.get_session(session_id)
    
    try:
        response = await _handle_event(session, event, llm_service)
        return response
    except Exception as e:
        logger.error(f"Error handling event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WebSocket Endpoint (recommended for interrupt-anytime + streaming)
# ============================================================================


@router.websocket("/learn/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for interactive learning sessions.
    
    Flow:
    1. Client connects with session_id
    2. Server sends STATUS events as state changes
    3. Client sends events (USER_MESSAGE, INTERRUPT, RESUME)
    4. Server streams back: TEACHER_TEXT_DELTA, BOARD_ACTION, TEACHER_TEXT_FINAL, CHECKPOINT
    
    Example client flow:
    - Connect: ws://localhost:8000/learn/ws/session-uuid
    - Receive: STATUS {status: "TEACHING"}
    - Send: USER_MESSAGE {"type": "USER_MESSAGE", "text": "Can you explain X?"}
    - Receive: TEACHER_TEXT_DELTA {"delta": "Sure, let me..."}
    - Receive: BOARD_ACTION {"action": {"kind": "WRITE_TITLE", ...}}
    - ... more deltas ...
    - Receive: TEACHER_TEXT_FINAL {"text": "..."}
    - Receive: CHECKPOINT {"step_id": 1, "short_summary": "..."}
    - User clicks "Ma Fhemtch" button
    - Send: INTERRUPT {"reason": "MA_FHEMTCH"}
    - Receive: STATUS {status: "PAUSED"}
    - Send: RESUME {"step_id": 1}
    - Receive: STATUS {status: "RESUMING"}
    - Receive: STATUS {status: "TEACHING"}
    """
    
    logger.info(f"WebSocket connection attempt for session {session_id}")
    logger.info(f"Session manager has {len(session_manager.sessions)} sessions: {list(session_manager.sessions.keys())}")
    
    # Validate session
    if not session_manager.session_exists(session_id):
        logger.error(f"Session {session_id} not found in session manager")
        await websocket.close(code=4004, reason="Session not found")
        return
    
    session = session_manager.get_session(session_id)
    await websocket.accept()
    
    logger.info(f"WebSocket connected for session {session_id}")
    
    # Send initial status
    await _send_event(
        websocket,
        StatusEvent(
            session_id=session_id,
            status=session.status,
            difficulty_level=session.difficulty_level,
            difficulty_title=session.difficulty_title,
        ),
    )
    
    try:
        while True:
            # Wait for client event
            data = await websocket.receive_text()
            event_data = json.loads(data)
            
            # Parse event
            event_type = event_data.get("type")
            
            if event_type == "USER_MESSAGE":
                event = UserMessageEvent(**event_data)
            elif event_type == "INTERRUPT":
                event = InterruptEvent(**event_data)
            elif event_type == "RESUME":
                event = ResumeEvent(**event_data)
            else:
                await _send_event(
                    websocket,
                    ErrorEvent(
                        session_id=session_id,
                        error_code="INVALID_EVENT",
                        message=f"Unknown event type: {event_type}",
                    ),
                )
                continue
            
            # Handle event and stream responses
            await _handle_websocket_event(
                websocket, session, event, llm_service
            )
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
        # Could optionally close session here or keep it alive for reconnection
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        await _send_event(
            websocket,
            ErrorEvent(
                session_id=session_id,
                error_code="INTERNAL_ERROR",
                message=str(e),
            ),
        )


# ============================================================================
# Internal Helpers
# ============================================================================


async def _handle_event(
    session: LearnSession,
    event: InboundEvent,
    llm_service: LearnLLMService,
):
    """Handle an inbound event and return response (for HTTP)"""
    
    if isinstance(event, UserMessageEvent):
        session.update_activity()
        session.wait_for_answer()
        
        # Generate teacher response
        response = await llm_service.generate_teacher_response(
            session_id=session.session_id,
            step_id=session.step_id,
            lesson_context="",  # TODO: load from DB
            student_input=event.text,
            last_checkpoint=session.checkpoint_summary,
            difficulty_level=session.difficulty_level,
            interruption_count=session.interruption_count,
        )
        
        session.continue_teaching()
        session.next_step()
        
        return {
            "status": session.status,
            "teacher_response": {
                "speech": response.speech_text,
                "board_actions": [
                    {
                        "kind": action.kind.value,
                        "payload": action.payload,
                    }
                    for action in response.board_actions
                ],
            },
        }
    
    elif isinstance(event, InterruptEvent):
        reason = str(event.reason) if event.reason else "User paused"
        session.pause(reason)
        return {"status": session.status}
    
    elif isinstance(event, ResumeEvent):
        session.resume()
        session.continue_teaching()
        return {"status": session.status}
    
    else:
        raise ValueError(f"Unknown event type: {type(event)}")


async def _handle_websocket_event(
    websocket: WebSocket,
    session: LearnSession,
    event: InboundEvent,
    llm_service: LearnLLMService,
):
    """Handle an inbound event and stream responses (for WebSocket)"""
    
    try:
        if isinstance(event, UserMessageEvent):
            session.update_activity()
            
            # Check if this is an interruption (user sending message while paused or during teaching)
            was_paused = session.status == SessionStatus.PAUSED
            was_teaching = session.status == SessionStatus.TEACHING
            is_interruption = was_paused or was_teaching
            
            if is_interruption and not was_paused:
                # User interrupted during teaching - automatically pause first
                session.pause("User interrupted with new question")
            
            # If was paused, user is taking control with a new question
            if was_paused:
                # User interrupted during pause - they're taking the floor with a new question
                # interruption_count already incremented in pause()
                pass
            
            session.wait_for_answer()
            
            # Send status change
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id, 
                    status=SessionStatus.ANSWERING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id, 
                    status=SessionStatus.TEACHING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            
            # Prepare student input with interruption context if needed
            student_input = event.text
            
            # CHECK FOR QUIZ RESULT
            if "[QUIZ_RESULT:" in student_input:
                is_correct = "CORRECT" in student_input
                session.handle_quiz_result(is_correct)
                logger.info(f"Updated difficulty to {session.difficulty_level} after quiz result: {is_correct}")

                # We pass the raw "[QUIZ_RESULT: ...]" string to learn_llm.py
                # so it can apply the specific prompt logic we defined there.
            
            elif is_interruption:
                # Add context that this is an interruption/follow-up question
                if was_paused:
                    student_input = f"[FOLLOW-UP QUESTION after pause] {student_input}"
                else:
                    student_input = f"[INTERRUPTION - new question] {student_input}"
            
            # Generate teacher response
            response = await llm_service.generate_teacher_response(
                session_id=session.session_id,
                step_id=session.step_id,
                lesson_context="",  # TODO: load from DB
                student_input=student_input,
                last_checkpoint=session.checkpoint_summary,
                difficulty_level=session.difficulty_level,
                interruption_count=session.interruption_count,
            )
            
            # Stream speech as deltas (simulate streaming)
            # In production, this would come from the LLM streaming response
            words = response.speech_text.split()
            for word in words:
                from app.schemas.learn import TeacherTextDeltaEvent
                
                await _send_event(
                    websocket,
                    TeacherTextDeltaEvent(
                        session_id=session.session_id,
                        delta=word + " ",
                    ),
                )
            
            # Send board actions
            for action in response.board_actions:
                from app.schemas.learn import BoardActionEvent
                
                await _send_event(
                    websocket,
                    BoardActionEvent(
                        session_id=session.session_id,
                        action=action,
                    ),
                )
            
            # Send final speech
            from app.schemas.learn import TeacherTextFinalEvent
            
            await _send_event(
                websocket,
                TeacherTextFinalEvent(
                    session_id=session.session_id,
                    text=response.speech_text,
                    board_actions=response.board_actions,
                ),
            )
            
            # Record checkpoint
            session.continue_teaching()
            session.next_step()
            checkpoint = session.set_checkpoint(
                summary=f"Discussed: {event.text[:50]}..."
            )
            await _send_event(websocket, checkpoint)
        
        elif isinstance(event, InterruptEvent):
            reason = str(event.reason) if event.reason else "User paused"
            session.pause(reason)
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.PAUSED,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
        
        elif isinstance(event, ResumeEvent):
            session.resume()
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.RESUMING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            session.continue_teaching()
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.TEACHING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
        
        else:
            await _send_event(
                websocket,
                ErrorEvent(
                    session_id=session.session_id,
                    error_code="INVALID_EVENT",
                    message=f"Unknown event type: {type(event)}",
                ),
            )
    
    except Exception as e:
        logger.error(f"Error handling WebSocket event: {e}")
        await _send_event(
            websocket,
            ErrorEvent(
                session_id=session.session_id,
                error_code="INTERNAL_ERROR",
                message=str(e),
            ),
        )


async def _send_event(websocket: WebSocket, event: OutboundEvent):
    """Send an outbound event to the client"""
    await websocket.send_text(event.model_dump_json())
