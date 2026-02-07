"""
Learn router - REST/WebSocket endpoints for interactive learning sessions.

Provides:
- POST /learn/session/start - Initialize a lesson session
- POST /learn/session/event - Send events (user message, interrupt, resume)
- WS /learn/ws - WebSocket for bidirectional streaming (recommended)
"""

from fastapi import APIRouter, WebSocket, Depends, HTTPException, WebSocketDisconnect, UploadFile, File, Form
from typing import Optional
from pydantic import BaseModel
import uuid
import json
import logging
import asyncio

from app.schemas.learn import (
    InboundEvent,
    OutboundEvent,
    StartLessonEvent,
    UserMessageEvent,
    InterruptEvent,
    ResumeEvent,
    ChangeDifficultyEvent,
    StatusEvent,
    ErrorEvent,
    SessionStatus,
    ToggleVoiceEvent,
    RequestQuizEvent,
    RequestFlashcardsEvent,
    HistoryEvent,
    VoiceTranscriptionEvent,
    BoardActionEvent,
    TeacherTextDeltaEvent,
    TeacherTextFinalEvent,
    BoardActionKind,
)
from app.services.learn_session import LearnSessionManager, LearnSession
from app.services.learn_llm import LearnLLMService
from app.services.file_extractor import file_extractor
from app.services.voice_manager import VoiceManager

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
    logger.error(f"🚨🚨 START SESSION CALLED 🚨🚨 Payload: {event}")
    session_id = str(uuid.uuid4())
    logger.info(f"🔄 Generated session_id: {session_id}")

    try:
        logger.info("🔄 Creating session...")
        session = session_manager.create_session(
            session_id=session_id,
            lesson_id=event.lesson_id,
            user_id=str(event.user_id) if event.user_id else None,
            initial_difficulty=event.initial_difficulty or 1,
            language=event.language or "en",
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


@router.post("/learn/session/{session_id}/upload-course")
async def upload_course_file(
    session_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a course file for a learning session.
    
    The file content will be extracted and used as context when answering questions.
    If a question is not covered in the file, the system will answer from general knowledge
    and warn the user.
    """
    logger.info(f"📁 Uploading course file for session {session_id}")
    
    # Validate session
    if not session_manager.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = session_manager.get_session(session_id)
    
    # Read file content
    file_content = await file.read()
    
    # Extract text from file
    extracted_text = await file_extractor.extract_text(file_content, file.filename or "unknown")
    
    if not extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Failed to extract text from file. Supported formats: PDF, DOCX, TXT, MD"
        )
    
    # Store in session
    session.uploaded_file_content = extracted_text
    session.uploaded_file_name = file.filename
    session.uploaded_file_bytes = file_content  # Store raw bytes for persistence
    
    # Persist changes
    # Set custom title from filename if not already set or generic
    if file.filename and (not session.custom_title or session.custom_title in ["Session", "Current Session", "New Discussion"]):
        import os
        name = os.path.splitext(file.filename)[0]
        # Clean up name: replace underscore/hyphen with space, title case
        name = name.replace("_", " ").replace("-", " ").title()
        session.custom_title = name

    session_manager.update_session(session)
    
    logger.info(f"✅ Course file uploaded and extracted ({len(extracted_text)} characters)")
    
    return {
        "success": True,
        "file_name": file.filename,
        "content_length": len(extracted_text),
        "message": "Course file uploaded successfully. The teacher will now use this content to answer your questions."
    }


@router.get("/learn/sessions")
async def list_sessions():
    """List all active sessions"""
    # Use manager to list (fetches from DB)
    sessions = session_manager.list_sessions()
    
    return [
        {
            "session_id": s.session_id,
            "lesson_id": s.lesson_id,
            "created_at": s.created_at.isoformat(),
            "difficulty": s.difficulty_title,
            "turns": len(s.history),
            "summary": s.title,
            "uploaded_file_name": s.uploaded_file_name
        }
        for s in sessions
    ]


@router.get("/learn/sessions/{session_id}")
async def get_session_details(session_id: str):
    """Get detailed state for a specific session"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Process artifacts to include metadata needed for frontend (delete/display)
    quizzes_enriched = []
    if session.quizzes:
        for idx, q in enumerate(session.quizzes):
            q_meta = dict(q)
            q_meta["session_id"] = session.session_id
            q_meta["original_index"] = idx
            q_meta["source_title"] = session.custom_title or session.title
            quizzes_enriched.append(q_meta)

    flashcards_enriched = []
    if session.flashcards:
        for idx, f in enumerate(session.flashcards):
            f_meta = dict(f)
            f_meta["session_id"] = session.session_id
            f_meta["original_index"] = idx
            f_meta["source_title"] = session.custom_title or session.title
            flashcards_enriched.append(f_meta)

    return {
        "session_id": session.session_id,
        "lesson_id": session.lesson_id,
        "created_at": session.created_at.isoformat(),
        "difficulty": session.difficulty_level,
        "difficulty_title": session.difficulty_title,
        "language": session.language,
        "uploaded_file_name": session.uploaded_file_name,
        "has_uploaded_file": session.uploaded_file_bytes is not None,
        "turns": len(session.history),
        "summary": session.title,
        "quizzes": quizzes_enriched,
        "flashcards": flashcards_enriched
    }


@router.get("/learn/study-hub-items")
async def get_all_study_hub_items():
    """
    Aggregate all quizzes and flashcards from all sessions.
    
    Returns:
    {
        "quizzes": [ { ...quiz_data, "source_title": "Spark", "session_id": "..." }, ... ],
        "flashcards": [ { ...fc_data, "source_title": "Course 1", "session_id": "..." }, ... ]
    }
    """
    sessions = session_manager.list_sessions()
    
    all_quizzes = []
    all_flashcards = []
    
    # Generic title patterns to replace
    generic_titles = ["Session", "Current Session", "New Discussion", "Nouvelle Discussion"]
    
    for i, s in enumerate(sessions):
        # Determine display title
        title = s.custom_title
        if not title or title in generic_titles:
            # Fallback for generic titles: "Course X"
            # Since sessions are often ordered by activity, assignment of numbers might fluctuate if we sort by date.
            # But "Course {i}" (where i is index) is a simple way to differentiate.
            # Ideally we'd use consistent ID-based numbering but for now this matches user request "Course 1, Course 2"
            title = f"Course {len(sessions) - i}" # Reverse index so oldest is Course 1? Or just arbitrary.
            
            # Use uploaded file name if available and title is generic
            if s.uploaded_file_name:
                import os
                name = os.path.splitext(s.uploaded_file_name)[0]
                 # Clean up name: replace underscore/hyphen with space, title case
                name = name.replace("_", " ").replace("-", " ").title()
                title = name

        # Collect Quizzes
        if s.quizzes:
            for idx, q in enumerate(s.quizzes):
                # Inject source metadata
                q_with_meta = dict(q)
                q_with_meta["source_title"] = title
                q_with_meta["session_id"] = s.session_id
                q_with_meta["original_index"] = idx
                all_quizzes.append(q_with_meta)
                
        # Collect Flashcards
        if s.flashcards:
            for idx, f in enumerate(s.flashcards):
                f_with_meta = dict(f)
                f_with_meta["source_title"] = title
                f_with_meta["session_id"] = s.session_id
                f_with_meta["original_index"] = idx
                all_flashcards.append(f_with_meta)
                
    return {
        "quizzes": all_quizzes,
        "flashcards": all_flashcards
    }


@router.delete("/learn/sessions/{session_id}/artifacts")
async def delete_session_artifact(session_id: str, type: str, index: int):
    """
    Delete a specific artifact (quiz or flashcard) from a session.
    type: 'quiz' or 'flashcards'
    index: 0-based index in the list
    """
    if not session_manager.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = session_manager.get_session(session_id)
    
    try:
        if type == "quiz":
            if 0 <= index < len(session.quizzes):
                session.quizzes.pop(index)
                session_manager.update_session(session)
                return {"status": "success", "message": "Quiz deleted"}
            else:
                 raise HTTPException(status_code=400, detail="Invalid index")
        
        elif type == "flashcards":
            if 0 <= index < len(session.flashcards):
                session.flashcards.pop(index)
                session_manager.update_session(session)
                return {"status": "success", "message": "Flashcards deleted"}
            else:
                raise HTTPException(status_code=400, detail="Invalid index")
        
        else:
             raise HTTPException(status_code=400, detail="Invalid artifact type")
             
    except Exception as e:
        logger.error(f"Error deleting artifact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/learn/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    success = session_manager.delete_session(session_id)
    if not success:
        # We might return 404, but for now just 200 with result is fine or just 200
        pass
    return {"status": "success", "deleted": success}


class RenameSessionRequest(BaseModel):
    title: str

@router.patch("/learn/sessions/{session_id}")
async def rename_session(session_id: str, body: RenameSessionRequest):
    """Rename a session"""
    if not session_manager.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = session_manager.get_session(session_id)
    session.custom_title = body.title
    session_manager.update_session(session)
    
    return {"status": "success", "session_id": session_id, "new_title": session.title}


# ============================================================================
# WebSocket Endpoint (recommended for interrupt-anytime + streaming)
# ============================================================================


@router.websocket("/learn/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for interactive learning sessions.
    """
    logger.info(f"WebSocket connection attempt for session {session_id}")
    
    await websocket.accept()

    # Validate session
    if not session_manager.session_exists(session_id):
        logger.error(f"Session {session_id} not found in session manager")
        await websocket.close(code=4004, reason="Session not found")
        return
    
    session = session_manager.get_session(session_id)
    voice_manager = VoiceManager(sample_rate=16000)
    voice_manager.auto_finish = False # Use manual toggle-to-talk
    logger.info(f"WebSocket connected for session {session_id}")
    
    try:
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

        # Send history if available
        if session.history:
            logger.info(f"Sending history for session {session_id} ({len(session.history)} items)")
            await _send_event(
                websocket,
                HistoryEvent(
                    session_id=session.session_id,
                    history=session.history
                )
            )
        
        while True:
            # Wait for client event - can be text or binary
            msg = await websocket.receive()
            
            if "text" in msg:
                event_data = json.loads(msg["text"])
                event_type = event_data.get("type")
                
                if event_type == "USER_MESSAGE":
                    event = UserMessageEvent(**event_data)
                elif event_type == "INTERRUPT":
                    event = InterruptEvent(**event_data)
                elif event_type == "RESUME":
                    event = ResumeEvent(**event_data)
                elif event_type == "CHANGE_DIFFICULTY":
                    event = ChangeDifficultyEvent(**event_data)
                elif event_type == "TOGGLE_VOICE":
                    event = ToggleVoiceEvent(**event_data)
                    
                    if event.action == "start":
                        voice_manager.start_recording()
                        continue
                    elif event.action == "stop":
                        transcribed_text = await voice_manager.end_recording(
                            language=session.language
                        )
                        logger.info(f"Manual Voice input captured: '{transcribed_text}'")
                        await _send_event(
                            websocket,
                            VoiceTranscriptionEvent(
                                session_id=session_id,
                                text=transcribed_text or ""
                            )
                        )
                        continue
                elif event_type == "REQUEST_QUIZ":
                    event = RequestQuizEvent(**event_data)
                    logger.info(f"Quiz requested for session {session_id}")
                    
                    # Generate quiz response
                    lesson_context = session.uploaded_file_content or ""
                    
                    response = await llm_service.generate_quiz_response(
                        session_id=session.session_id,
                        lesson_context=lesson_context,
                        student_input="[USER REQUESTED QUIZ]",
                        difficulty_level=session.difficulty_level,
                        history=session.history,
                        session_language=session.language,
                    )
                    
                    # Stream response (Speech + Quiz Action)
                    # 1. Start Audio Synthesis
                    async def get_audio():
                        try:
                            return await voice_manager.synthesize_response(
                                response.speech_text, 
                                language=response.language
                            )
                        except Exception as e:
                            logger.error(f"Failed to synthesize audio: {e}")
                            return None
                    audio_task = asyncio.create_task(get_audio())

                    # 2. Send Board Actions (The Quiz)
                    for action in response.board_actions:
                        await _send_event(
                            websocket,
                            BoardActionEvent(
                                session_id=session.session_id,
                                action=action,
                            ),
                        )
                        # PERSIST ARTIFACTS (Fix for manual Quiz Request)
                        if action.kind == BoardActionKind.SHOW_QUIZ:
                             session.quizzes.append(action.payload)
                             session_manager.update_session(session)

                    # 3. Text Delta
                    words = response.speech_text.split()
                    for word in words:
                        await _send_event(
                            websocket,
                            TeacherTextDeltaEvent(
                                session_id=session.session_id,
                                delta=word + " ",
                            ),
                        )
                        await asyncio.sleep(0.05)

                    # 4. Final Event
                    audio_data = await audio_task
                    await _send_event(
                        websocket,
                        TeacherTextFinalEvent(
                            session_id=session.session_id,
                            text=response.speech_text,
                            board_actions=response.board_actions,
                        ),
                    )
                    
                    if audio_data:
                        await websocket.send_bytes(audio_data)

                    continue

                elif event_type == "REQUEST_FLASHCARDS":
                    event = RequestFlashcardsEvent(**event_data)
                    logger.info(f"Flashcards requested for session {session_id}")

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
                    websocket, session, event, llm_service, voice_manager
                )
            elif "bytes" in msg:
                # Handle binary audio chunk
                audio_chunk = msg["bytes"]
                # Log occasionally to confirm data flow without flooding
                if not hasattr(voice_manager, '_chunk_count'): voice_manager._chunk_count = 0
                voice_manager._chunk_count += 1
                if voice_manager._chunk_count % 100 == 0:
                    logger.info(f"Received 100 audio chunks (last size: {len(audio_chunk)} bytes)")
                
                transcribed_text = await voice_manager.add_audio_chunk(
                    audio_chunk, 
                    language=session.language
                )
                
                if transcribed_text:
                    logger.info(f"Voice input captured: {transcribed_text}")
                    # Treat as UserMessageEvent
                    event = UserMessageEvent(
                        session_id=session_id,
                        text=transcribed_text
                    )
                    await _handle_websocket_event(
                        websocket, session, event, llm_service, voice_manager
                    )
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
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
        
        # Add user message to history
        session.add_history("user", event.text)

        # Generate teacher response
        # Use uploaded file content as lesson context if available
        lesson_context = session.uploaded_file_content or ""
        
        response = await llm_service.generate_teacher_response(
            session_id=session.session_id,
            step_id=session.step_id,
            lesson_context=lesson_context,
            student_input=event.text,
            last_checkpoint=session.checkpoint_summary,
            difficulty_level=session.difficulty_level,
            interruption_count=session.interruption_count,
            has_uploaded_file=bool(session.uploaded_file_content),

            history=session.history,
            session_language=session.language,
        )
        
        session.continue_teaching()
        session.next_step()
        
        # Add teacher response to history
        session.add_history("assistant", response.speech_text)
        
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
    voice_manager: VoiceManager,
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

                # BROADCAST STATUS UPDATE
                # Critical: Frontend needs to know the difficulty level changed immediately
                await _send_event(
                    websocket,
                    StatusEvent(
                        session_id=session.session_id,
                        status=session.status,
                        difficulty_level=session.difficulty_level,
                        difficulty_title=session.difficulty_title,
                        progress=session.progress
                    )
                )



                # We pass the raw "[QUIZ_RESULT: ...]" string to learn_llm.py
                # so it can apply the specific prompt logic we defined there.
            
            elif is_interruption:
                # Add context that this is an interruption/follow-up question
                if was_paused:
                    student_input = f"[FOLLOW-UP QUESTION after pause] {student_input}"
                else:
                    student_input = f"[INTERRUPTION - new question] {student_input}"
            
            # Add user message to history
            session.add_history("user", student_input)
            session_manager.update_session(session)

            # Generate teacher response
            # Use uploaded file content as lesson context if available
            lesson_context = session.uploaded_file_content or ""
            
            response = await llm_service.generate_teacher_response(
                session_id=session.session_id,
                step_id=session.step_id,
                lesson_context=lesson_context,
                student_input=student_input,
                last_checkpoint=session.checkpoint_summary,
                difficulty_level=session.difficulty_level,
                interruption_count=session.interruption_count,
                has_uploaded_file=bool(session.uploaded_file_content),

                history=session.history,
                session_language=session.language,
            )


            
            # 1. Start Audio Synthesis in background immediately
            async def get_audio():
                try:
                    return await voice_manager.synthesize_response(
                        response.speech_text, 
                        language=response.language
                    )
                except Exception as e:
                    logger.error(f"Failed to synthesize audio: {e}")
                    return None
            
            audio_task = asyncio.create_task(get_audio())

            # 2. Stream speech as deltas
            words = response.speech_text.split()
            for word in words:
                await _send_event(
                    websocket,
                    TeacherTextDeltaEvent(
                        session_id=session.session_id,
                        delta=word + " ",
                    ),
                )
                await asyncio.sleep(0.05) # Small sleep to make streaming visible
            
            # 3. Send board actions
            for action in response.board_actions:
                logger.info(f"📤 Sending Board Action to frontend: {action.kind} | Payload: {action.payload}")
                await _send_event(
                    websocket,
                    BoardActionEvent(
                        session_id=session.session_id,
                        action=action,
                    ),
                )

                # PERSIST ARTIFACTS
                if action.kind == BoardActionKind.SHOW_QUIZ:
                    session.quizzes.append(action.payload)
                    session_manager.update_session(session)
                elif action.kind == BoardActionKind.SHOW_FLASHCARDS:
                    session.flashcards.append(action.payload)
                    session_manager.update_session(session)
            
            # 4. Wait for audio to be ready
            audio_data = await audio_task
            
            # 5. Send final speech event
            await _send_event(
                websocket,
                TeacherTextFinalEvent(
                    session_id=session.session_id,
                    text=response.speech_text,
                    board_actions=response.board_actions,
                ),
            )
            
            # 6. Send audio binary immediately after final event
            if audio_data:
                await websocket.send_bytes(audio_data)
            
            # --- Automatic Titling ---
            # Generate a title if it's the first exchange OR if title is generic
            is_generic_title = not session.custom_title or session.custom_title in ["Session", "Current Session", "New Discussion"]
            if is_generic_title and not getattr(response, 'quiz', False):
                try:
                    logger.info(f"Generating automatic title for session {session.session_id}")
                    new_title = await llm_service.generate_title(session.history)
                    if new_title and new_title not in ["New Discussion", "Nouvelle Discussion"]:
                        session.custom_title = new_title
                        session_manager.update_session(session)
                        # Send status to trigger sidebar refresh
                        await _send_event(
                            websocket,
                            StatusEvent(
                                session_id=session.session_id,
                                status=session.status,
                                message=f"Session titled: {new_title}"
                            )
                        )
                except Exception as title_err:
                    logger.error(f"Failed to generate title: {title_err}")
            
            # Add teacher response to history
            session.add_history("assistant", response.speech_text)
            
            # Record checkpoint
            session.continue_teaching()
            session.next_step()
            # Clean summary without "Discussed:" prefix
            checkpoint = session.set_checkpoint(
                summary=event.text[:50] + "..." if len(event.text) > 50 else event.text
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
                ),
            )
        
        elif isinstance(event, ChangeDifficultyEvent):
            session.set_difficulty(event.level)
            logger.info(f"Manually set difficulty to {event.level} ({session.difficulty_title})")
            
            # Broadcast new status with updated level
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=session.status,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
        
        elif isinstance(event, ToggleVoiceEvent):
            # Already handled in the main loop, just ignore here to avoid fallthrough error
            pass
        
        elif isinstance(event, RequestQuizEvent):
            logger.info(f"Student requested a quiz for session {session.session_id}")
            session.wait_for_answer()
            
            # Send status update
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.ANSWERING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            
            # Generate quiz response
            lesson_context = session.uploaded_file_content or ""
            response = await llm_service.generate_quiz_response(
                session_id=session.session_id,
                difficulty_level=session.difficulty_level,
                lesson_context=lesson_context,
                history=session.history,
                target_language=session.language or "english"
            )
            
            # Send status: TEACHING
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.TEACHING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            
            # 1. Synthesize fixed speech immediately
            try:
                audio_data = await voice_manager.synthesize_response(
                    response.speech_text, 
                    language=response.language
                )
            except Exception as e:
                logger.error(f"Failed to synthesize quiz intro audio: {e}")
                audio_data = None

            # 2. Stream speech deltas
            words = response.speech_text.split()
            for word in words:
                await _send_event(
                    websocket,
                    TeacherTextDeltaEvent(
                        session_id=session.session_id,
                        delta=word + " ",
                    ),
                )
                await asyncio.sleep(0.05)

            # 3. Send board actions (The Quiz)
            for action in response.board_actions:
                await _send_event(
                    websocket,
                    BoardActionEvent(
                        session_id=session.session_id,
                        action=action,
                    ),
                )

                # PERSIST ARTIFACTS
                if action.kind == BoardActionKind.SHOW_QUIZ:
                    session.quizzes.append(action.payload)
                    session_manager.update_session(session)
                elif action.kind == BoardActionKind.SHOW_FLASHCARDS:
                    session.flashcards.append(action.payload)
                    session_manager.update_session(session)

            # 4. Send final speech event
            await _send_event(
                websocket,
                TeacherTextFinalEvent(
                    session_id=session.session_id,
                    text=response.speech_text,
                    board_actions=response.board_actions,
                ),
            )

            # 5. Send audio binary
            if audio_data:
                await websocket.send_bytes(audio_data)

        elif isinstance(event, RequestFlashcardsEvent):
            logger.info(f"Student requested flashcards for session {session.session_id}")
            session.wait_for_answer()
            
            # Send status update
            await _send_event(
                websocket,
                StatusEvent(
                    session_id=session.session_id,
                    status=SessionStatus.TEACHING,
                    difficulty_level=session.difficulty_level,
                    difficulty_title=session.difficulty_title,
                ),
            )
            
            # Generate flashcards response
            lesson_context = session.uploaded_file_content or ""
            response = await llm_service.generate_flashcards_response(
                session_id=session.session_id,
                difficulty_level=session.difficulty_level,
                lesson_context=lesson_context,
                history=session.history,
                session_language=session.language or "english"
            )
            
            # 1. Synthesize fixed speech immediately
            try:
                audio_data = await voice_manager.synthesize_response(
                    response.speech_text, 
                    language=response.language
                )
            except Exception as e:
                logger.error(f"Failed to synthesize flashcards intro audio: {e}")
                audio_data = None

            # 2. Stream speech deltas
            words = response.speech_text.split()
            for word in words:
                await _send_event(
                    websocket,
                    TeacherTextDeltaEvent(
                        session_id=session.session_id,
                        delta=word + " ",
                    ),
                )
                await asyncio.sleep(0.05)

            # 3. Send board actions (The Flashcards)
            for action in response.board_actions:
                await _send_event(
                    websocket,
                    BoardActionEvent(
                        session_id=session.session_id,
                        action=action,
                    ),
                )

                # PERSIST ARTIFACTS (with deduplication)
                if action.kind == BoardActionKind.SHOW_FLASHCARDS:
                    is_duplicate = any(f.get('cards') == action.payload.get('cards') for f in session.flashcards)
                    if not is_duplicate:
                        session.flashcards.append(action.payload)
                        session_manager.update_session(session)

            # 4. Send final speech event
            await _send_event(
                websocket,
                TeacherTextFinalEvent(
                    session_id=session.session_id,
                    text=response.speech_text,
                    board_actions=response.board_actions,
                ),
            )

            # 5. Send audio binary
            if audio_data:
                await websocket.send_bytes(audio_data)

            # No automatic titling for quiz-only turns
            session.add_history("assistant", response.speech_text)
            session.continue_teaching()
            session.next_step()
        
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
