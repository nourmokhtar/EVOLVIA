# Step 2 & 3: Learn Router + State Machine Setup

## ✅ Step 2: Learn Router Endpoints (COMPLETE)

The Learn router is now wired into the main FastAPI app.

### Available Endpoints:

#### HTTP Endpoints (for testing)
- **POST** `/api/v1/learn/session/start` — Initialize a new lesson session
- **POST** `/api/v1/learn/session/event` — Send events (user message, interrupt, resume)

#### WebSocket Endpoint (recommended)
- **WS** `/api/v1/learn/ws/{session_id}` — Bidirectional streaming for interrupt-anytime + live updates

### Event Flow (WebSocket recommended):

```
Client connects: ws://localhost:8000/api/v1/learn/ws/session-uuid

← Server: STATUS {sessionId, status: "TEACHING"}

Client sends: USER_MESSAGE {sessionId, text, stepId}

← Server: TEACHER_TEXT_DELTA {sessionId, delta: "Let me..."}
← Server: TEACHER_TEXT_DELTA {sessionId, delta: " explain..."}
← Server: BOARD_ACTION {sessionId, action: {kind: "WRITE_TITLE", payload: {...}}}
← Server: TEACHER_TEXT_FINAL {sessionId, text: "...full response..."}
← Server: CHECKPOINT {sessionId, stepId: 1, shortSummary: "..."}

Client clicks "Ma Fhemtch":
Client sends: INTERRUPT {sessionId, reason: "MA_FHEMTCH"}

← Server: STATUS {sessionId, status: "PAUSED"}

Client resumes:
Client sends: RESUME {sessionId, stepId: 1}

← Server: STATUS {sessionId, status: "RESUMING"}
← Server: STATUS {sessionId, status: "TEACHING"}
```

---

## ✅ Step 3: LearnSession State Machine (COMPLETE)

The state machine is fully implemented in `backend/app/services/learn_session.py`.

### State Diagram:

```
IDLE
  ↓ (start)
TEACHING ←→ PAUSED
  ↓           ↓
ANSWERING     RESUMING
  ↓            ↓
TEACHING ←────┘
```

### State Transitions:

- **IDLE → TEACHING**: `session.start()` (when lesson begins)
- **TEACHING → PAUSED**: `session.pause()` (when student interrupts)
- **PAUSED → RESUMING**: `session.resume()` (when student clicks resume)
- **RESUMING → TEACHING**: `session.continue_teaching()`
- **TEACHING → ANSWERING**: `session.wait_for_answer()` (waiting for student input)
- **ANSWERING → TEACHING**: `session.continue_teaching()` (after student responds)

### Tracked Metrics:

- `interruption_count`: Incremented on each pause
- `difficulty_level`: 1-5 scale, decreases on repeated "Ma Fhemtch"
- `checkpoint_summary`: Last checkpoint for resuming
- `step_id`: Current teaching step
- `last_activity`: Timestamp for session timeout

### Example Usage:

```python
from app.services.learn_session import LearnSessionManager

manager = LearnSessionManager()

# Start a session
session = manager.create_session(
    session_id="uuid-123",
    lesson_id="lesson-456",
    user_id="user-789"
)

# Session starts in TEACHING state
assert session.status == SessionStatus.TEACHING

# Student interrupts
session.pause(reason="Don't understand")
assert session.status == SessionStatus.PAUSED
assert session.interruption_count == 1

# Student resumes
session.resume()
assert session.status == SessionStatus.RESUMING

session.continue_teaching()
assert session.status == SessionStatus.TEACHING

# Set checkpoint
checkpoint = session.set_checkpoint(
    summary="Covered: Introduction to algorithms"
)
# Can use this checkpoint_summary when resuming later
```

---

## 🔧 Opik Configuration

The Opik observability layer is now initialized at startup.

### Setup Instructions:

1. **Copy `.env.example` to `.env`** (in backend folder):
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Add your Opik credentials to `.env`**:
   ```env
   OPIK_ENABLED=true
   OPIK_API_KEY=QTidL9OQfdTrl7TQB6CWXpI9t
   OPIK_WORKSPACE=  # Your workspace (if Comet-hosted)
   OPIK_PROJECT=evolvia-learn
   OPIK_URL=  # Leave empty for Comet-hosted, or set to your self-hosted URL
   ```

3. **Install Opik** (already in requirements.txt):
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend**:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

   You should see:
   ```
   Opik observability configured
   ```

---

## 📊 Opik Tracing

Every teacher response is automatically logged with:

- **Inputs**: Student question, lesson context, difficulty level, interruption count
- **Outputs**: Teacher speech, board actions
- **Metadata**: Session ID, step, model name/config

### Example Trace (from `opik_client.log_teacher_turn()`):

```json
{
  "session_id": "uuid-123",
  "step_id": 1,
  "student_input": "What is recursion?",
  "lesson_context": "Chapter 3: Advanced Algorithms",
  "speech_text": "Recursion is when a function calls itself...",
  "board_actions": [
    {
      "kind": "WRITE_TITLE",
      "payload": {"text": "Recursion"}
    },
    {
      "kind": "WRITE_BULLET",
      "payload": {"text": "Function calls itself", "position": 1}
    }
  ],
  "interruption_count": 1,
  "difficulty_level": 1,
  "timestamp": "2026-01-24T12:30:45.123456"
}
```

Traces appear in your Opik dashboard for analysis + evaluation.

---

## 🧪 Quick Test

### Test HTTP endpoint:

```bash
# Start a session
curl -X POST http://localhost:8000/api/v1/learn/session/start \
  -H "Content-Type: application/json" \
  -d '{"type": "START_LESSON", "lesson_id": "lesson-1"}'

# Response:
# {
#   "session_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "TEACHING"
# }

# Send a user message
curl -X POST http://localhost:8000/api/v1/learn/session/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "USER_MESSAGE",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Can you explain this concept?"
  }'
```

### Test WebSocket endpoint:

Use a WebSocket client (e.g., wscat, Postman, or browser console):

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/learn/ws/session-123');

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};

ws.onopen = () => {
  // Send user message
  ws.send(JSON.stringify({
    type: 'USER_MESSAGE',
    session_id: 'session-123',
    text: 'What is a data structure?'
  }));
};
```

---

## 📝 Router Implementation Details

### [backend/app/api/learn.py](backend/app/api/learn.py)

- `session_manager`: Singleton `LearnSessionManager` tracking all active sessions
- `llm_service`: `LearnLLMService` for generating teacher responses (with Opik tracing)
- `@router.post("/session/start")`: Create new session
- `@router.post("/session/event")`: Handle HTTP events (testing)
- `@router.websocket("/ws/{session_id}")`: WebSocket handler with full streaming

### [backend/app/main.py](backend/app/main.py)

- Imports `learn` router
- Initializes `opik_client.configure()` at startup
- Registers router at `/api/v1/learn` prefix

---

## 🚀 Next: Step 4 & 5

- **Step 4**: Implement LLM structured output (integrate real Llama provider)
- **Step 5**: Frontend session controller (replace mock setTimeout with streamed events)

Both are now supported by the infrastructure created in Steps 1-3.
