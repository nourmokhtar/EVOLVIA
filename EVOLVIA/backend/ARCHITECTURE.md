# Architecture Overview: Learn Domain

## Backend File Structure

```
backend/
├── app/
│   ├── main.py                          ← ✨ Updated: Learn router + Opik init
│   ├── api/
│   │   ├── __init__.py
│   │   ├── learn.py                     ← ✨ NEW: Router (HTTP + WebSocket)
│   │   ├── auth.py
│   │   ├── lessons.py
│   │   └── ...
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── learn.py                     ← ✨ NEW: Event contract
│   │   └── user.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── learn_session.py             ← ✨ NEW: State machine
│   │   ├── learn_llm.py                 ← ✨ NEW: LLM service + Opik logging
│   │   ├── observability/
│   │   │   ├── __init__.py
│   │   │   └── opik_client.py           ← ✨ NEW: Opik wrapper
│   │   └── ...
│   └── ...
├── .env                                 ← ✨ Updated: Opik + Gemini secrets
├── .env.example                         ← ✨ Updated: Config template
├── requirements.txt                     ← ✨ Updated: Added opik
└── STEP2_3_COMPLETE.md                 ← This file

```

---

## Call Flow: How Events Flow Through System

### User starts lesson

```
Frontend
  │
  ├─ POST /api/v1/learn/session/start
  │   ├─ LearnSessionManager.create_session()
  │   │   └─ LearnSession(IDLE) → start() → LearnSession(TEACHING)
  │   └─ Returns {session_id, status: "TEACHING"}
  │
  └─ WS /api/v1/learn/ws/{session_id}
     └─ Receives: STATUS {status: "TEACHING"}
```

### User asks question

```
Frontend (WebSocket)
  │
  └─ Send: USER_MESSAGE {sessionId, text: "What is X?"}
     │
     Backend (learn.py router)
     │
     ├─ Parse event
     ├─ LearnSession.wait_for_answer()
     ├─ Send: STATUS {status: "ANSWERING"}
     │
     └─ LearnLLMService.generate_teacher_response()
        │
        ├─ Build prompt (context + difficulty)
        ├─ Call LLM (mock for now)
        │
        └─ opik_client.log_teacher_turn()  ← ✨ TRACE LOGGED
           │
           └─ Opik Dashboard: New trace recorded
        │
        ├─ Stream responses:
        │   ├─ Send: TEACHER_TEXT_DELTA {delta: "Sure "}
        │   ├─ Send: TEACHER_TEXT_DELTA {delta: "let "}
        │   ├─ ...
        │   ├─ Send: BOARD_ACTION {action: {kind: "WRITE_TITLE", ...}}
        │   ├─ Send: TEACHER_TEXT_FINAL {text: "Sure, let me..."}
        │   └─ Send: CHECKPOINT {stepId: 1, shortSummary: "..."}
        │
        └─ LearnSession.continue_teaching()
           └─ LearnSession(TEACHING)
```

### User interrupts

```
Frontend (WebSocket)
  │
  └─ Send: INTERRUPT {sessionId, reason: "MA_FHEMTCH"}
     │
     Backend (learn.py router)
     │
     ├─ LearnSession.pause()
     │   ├─ interruption_count += 1
     │   ├─ difficulty_level = max(1, difficulty_level - 1)  ← Auto-adjust
     │   └─ status = PAUSED
     │
     └─ Send: STATUS {status: "PAUSED"}
```

### User resumes

```
Frontend (WebSocket)
  │
  └─ Send: RESUME {sessionId, stepId: 1}
     │
     Backend (learn.py router)
     │
     ├─ LearnSession.resume()
     │   └─ status = RESUMING
     ├─ Send: STATUS {status: "RESUMING"}
     │
     ├─ LearnSession.continue_teaching()
     │   └─ status = TEACHING
     └─ Send: STATUS {status: "TEACHING"}
```

---

## Data Models (Pydantic)

### Session State

```python
LearnSession {
  session_id: str
  lesson_id: str
  user_id: Optional[UUID]
  
  status: SessionStatus  # TEACHING, PAUSED, ANSWERING, RESUMING, IDLE
  step_id: int           # Current teaching step
  
  interruption_count: int      # Increments on pause
  difficulty_level: int        # 1-5, decreases on repeated MA_FHEMTCH
  checkpoint_summary: str      # "We covered: ..."
  checkpoints: List[CheckpointEvent]
  
  created_at: datetime
  last_activity: datetime
}
```

### Events (Schemas)

```python
# Frontend sends
UserMessageEvent {type, session_id, text, step_id?}
InterruptEvent {type, session_id, reason, text?, step_id?}
ResumeEvent {type, session_id, step_id}

# Backend sends (via WebSocket)
StatusEvent {type, session_id, status}
TeacherTextDeltaEvent {type, session_id, delta}
TeacherTextFinalEvent {type, session_id, text}
BoardActionEvent {type, session_id, action}
CheckpointEvent {type, session_id, step_id, short_summary}
ErrorEvent {type, session_id, error_code, message}
```

### Opik Trace

```python
TeacherTurn {
  session_id: str
  step_id: int
  
  # Input
  prompt_input: str
  lesson_context: str
  student_input: str
  last_checkpoint: Optional[str]
  
  # Output
  speech_text: str
  board_actions: List[BoardAction]
  
  # Metadata
  model_name: str
  model_config: dict
  interruption_count: int
  difficulty_level: int
}
```

---

## API Endpoints Reference

### Start Session

```http
POST /api/v1/learn/session/start
Content-Type: application/json

{
  "type": "START_LESSON",
  "lesson_id": "lesson-123",
  "user_id": "user-456"  // optional
}

Response:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "TEACHING"
}
```

### WebSocket (Recommended)

```
WS ws://localhost:8000/api/v1/learn/ws/550e8400-e29b-41d4-a716-446655440000

Client → Server:
{
  "type": "USER_MESSAGE",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Can you explain this?",
  "step_id": 0
}

Server → Client (streaming):
{"type": "STATUS", "session_id": "...", "status": "TEACHING"}
{"type": "TEACHER_TEXT_DELTA", "session_id": "...", "delta": "Sure "}
{"type": "TEACHER_TEXT_DELTA", "session_id": "...", "delta": "let "}
{"type": "BOARD_ACTION", "session_id": "...", "action": {...}}
{"type": "TEACHER_TEXT_FINAL", "session_id": "...", "text": "Sure let me..."}
{"type": "CHECKPOINT", "session_id": "...", "step_id": 0, "short_summary": "..."}
```

### HTTP Event Endpoint (for testing)

```http
POST /api/v1/learn/session/event
Content-Type: application/json

{
  "type": "USER_MESSAGE",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "What is X?"
}

Response:
{
  "status": "TEACHING",
  "teacher_response": {
    "speech": "...",
    "board_actions": [...]
  }
}
```

---

## Environment Variables

```env
# Opik Observability
OPIK_ENABLED=true                                    # Enable/disable tracing
OPIK_API_KEY=QTidL9OQfdTrl7TQB6CWXpI9t             # Comet API key
OPIK_WORKSPACE=                                     # Workspace name
OPIK_PROJECT=evolvia-learn                         # Project name in Opik
OPIK_URL=                                          # Self-hosted URL (optional)

# Gemini (for LLM calls)
GEMINI_API_KEY=sk-7549bef4a952449fa9d41f2624d51677  # API key for Gemini
```

---

## Key Classes & Methods

### LearnSession

```python
session.start()                    # IDLE → TEACHING
session.pause(reason)              # TEACHING → PAUSED
session.resume()                   # PAUSED → RESUMING
session.continue_teaching()        # RESUMING/ANSWERING → TEACHING
session.wait_for_answer()          # TEACHING → ANSWERING
session.next_step()                # Increment step_id
session.set_checkpoint(summary)    # Record checkpoint

session.get_metadata()             # Return SessionMetadata (for logging)
session.update_activity()          # Update last_activity timestamp
```

### LearnSessionManager

```python
manager.create_session(session_id, lesson_id, user_id)
manager.get_session(session_id)
manager.session_exists(session_id)
manager.close_session(session_id)
```

### LearnLLMService

```python
await service.generate_teacher_response(
  session_id, step_id, lesson_context,
  student_input, last_checkpoint,
  difficulty_level, interruption_count
)
# Returns: TeacherResponse(speech_text, board_actions)
```

### OpikClient

```python
opik_client.configure()                    # Read from env + init
opik_client.log_teacher_turn(turn)         # Log trace for single turn
opik_client.create_evaluation_dataset(name, examples)  # Create dataset
opik_client.get_experiment_runs(dataset_name, limit)   # Query runs
```

---

## Ready for...

✅ **Step 4**: Real LLM integration (Llama provider)  
✅ **Step 5**: Frontend WebSocket client  
✅ **Step 6**: TTS (text-to-speech)  
✅ **Step 7**: 3D robot avatar  
✅ **Step 8**: Opik evaluation loops  

All infrastructure is in place. The rest is implementation details on top of this foundation.
