# ✅ Step 2 & 3: Complete

## 🎯 What Was Done

### Step 2: Learn Router Endpoint Shape ✅

The **Learn router** is now fully integrated into the main FastAPI app.

**Exposed endpoints:**
- `POST /api/v1/learn/session/start` — Start a new lesson session
- `POST /api/v1/learn/session/event` — Send events via HTTP (for testing)
- `WS /api/v1/learn/ws/{session_id}` — WebSocket for interrupt-anytime + streaming ⭐ **recommended**

**Modified files:**
- [backend/app/main.py](app/main.py) — Registered learn router + initialized Opik at startup
- [backend/app/api/learn.py](app/api/learn.py) — Full router implementation with HTTP + WebSocket support

---

### Step 3: LearnSession State Machine ✅

The **state machine** is fully implemented and ready to use.

**State transitions:**
```
IDLE → TEACHING ↔ PAUSED
  ↑      ↓  ↑         ↓
  └─ ANSWERING    RESUMING
```

**Tracked metrics:**
- `interruption_count`: Increments on each interrupt (drives difficulty adjustment)
- `difficulty_level`: 1-5 scale, automatically decreases on repeated "Ma Fhemtch"
- `checkpoint_summary`: Stores where lesson was paused
- `step_id`: Current teaching step
- `last_activity`: For session timeout management

**Implementation:**
- [backend/app/services/learn_session.py](app/services/learn_session.py) — `LearnSession` class + `LearnSessionManager`

---

## 🔐 Opik Configuration

Your credentials are now in place.

### .env File Updated

```env
OPIK_ENABLED=true
OPIK_API_KEY=QTidL9OQfdTrl7TQB6CWXpI9t
OPIK_PROJECT=evolvia-learn
OPIK_URL=  # (for self-hosted; leave empty for Comet-hosted)
```

The Opik client initializes automatically when the backend starts:
```
Opik observability configured
```

---

## 📡 Event Contract (Ready for Frontend)

### Frontend → Backend (Inbound Events)

| Event | Payload | When? |
|-------|---------|-------|
| `START_LESSON` | `{lessonId, userId?}` | Student clicks "Start Lesson" |
| `USER_MESSAGE` | `{sessionId, text, stepId?}` | Student responds to teacher |
| `INTERRUPT` | `{sessionId, reason, text?, stepId?}` | Student clicks "Ma Fhemtch" or asks question |
| `RESUME` | `{sessionId, stepId}` | Student clicks "Resume" |

### Backend → Frontend (Outbound Events - Streamed via WebSocket)

| Event | Payload | When? |
|-------|---------|-------|
| `STATUS` | `{sessionId, status}` | State changes (TEACHING, PAUSED, RESUMING, ANSWERING) |
| `TEACHER_TEXT_DELTA` | `{sessionId, delta}` | Live text stream (word-by-word) |
| `BOARD_ACTION` | `{sessionId, action}` | Teacher writes on board (title, bullet, etc.) |
| `TEACHER_TEXT_FINAL` | `{sessionId, text}` | Complete teacher response (for TTS/replay) |
| `CHECKPOINT` | `{sessionId, stepId, shortSummary}` | Checkpoint saved (for resume later) |
| `ERROR` | `{sessionId, errorCode, message}` | Something went wrong |

---

## 🔍 How Opik Traces Flow

Every teacher response is automatically logged:

1. **Student sends message** → `USER_MESSAGE` event
2. **LLM generates response** → `LearnLLMService.generate_teacher_response()`
3. **Opik logs trace** → `opik_client.log_teacher_turn(turn)`
4. **Trace includes:**
   - Prompt sent to LLM
   - Lesson context
   - Student input
   - Teacher response (speech + board actions)
   - Metadata (session ID, step, difficulty, interruption count)
5. **Appears in Opik dashboard** → Can evaluate, compare, iterate

---

## 🚀 How to Test

### 1. Start the backend

```bash
cd backend
uvicorn app.main:app --reload
```

Expected output:
```
Opik observability configured
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Test WebSocket (recommended)

Use any WebSocket client or this browser console code:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/learn/ws/test-session-1');

ws.onmessage = (event) => {
  console.log('← Server:', JSON.parse(event.data));
};

ws.onopen = () => {
  console.log('✓ Connected');
  
  // Send user message
  ws.send(JSON.stringify({
    type: 'USER_MESSAGE',
    session_id: 'test-session-1',
    text: 'What is recursion?'
  }));
};

ws.onerror = (error) => console.error('✗ Error:', error);
ws.onclose = () => console.log('✗ Disconnected');
```

Expected flow:
```
← Server: STATUS {sessionId, status: "TEACHING"}
← Server: TEACHER_TEXT_DELTA {delta: "Recursion "}
← Server: TEACHER_TEXT_DELTA {delta: "is when "}
...
← Server: BOARD_ACTION {action: {kind: "WRITE_TITLE", payload: {...}}}
← Server: TEACHER_TEXT_FINAL {text: "Recursion is..."}
← Server: CHECKPOINT {stepId: 0, shortSummary: "..."}
```

### 3. Test HTTP (for reference)

```bash
# Start session
curl -X POST http://localhost:8000/api/v1/learn/session/start \
  -H "Content-Type: application/json" \
  -d '{"type": "START_LESSON", "lesson_id": "intro-algorithms"}'

# Result:
# {"session_id": "550e8400-e29b-41d4-a716-446655440000", "status": "TEACHING"}

# Send user message
curl -X POST http://localhost:8000/api/v1/learn/session/event \
  -H "Content-Type: application/json" \
  -d '{
  "type": "USER_MESSAGE",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Can you explain the time complexity?"
}'
```

---

## 📊 Files Created/Modified

### Created:
- ✅ [backend/app/api/learn.py](app/api/learn.py) — Router with HTTP + WebSocket endpoints
- ✅ [backend/app/schemas/learn.py](app/schemas/learn.py) — Event contract (Pydantic models)
- ✅ [backend/app/services/learn_session.py](app/services/learn_session.py) — State machine
- ✅ [backend/app/services/learn_llm.py](app/services/learn_llm.py) — LLM service + Opik logging
- ✅ [backend/app/services/observability/opik_client.py](app/services/observability/opik_client.py) — Opik wrapper
- ✅ [backend/.env](.env) — Your secrets (Opik API key + Gemini key)

### Modified:
- ✅ [backend/app/main.py](app/main.py) — Added learn router + Opik initialization
- ✅ [backend/.env.example](.env.example) — Opik config template
- ✅ [backend/requirements.txt](requirements.txt) — Added `opik` dependency

---

## 🎬 Next Steps

### Step 4: Implement LLM Structured Output
- Replace mock LLM response in `learn_llm.py` with real Llama provider
- Test that board actions are parsed correctly
- Verify Opik traces appear in dashboard

### Step 5: Frontend Session Controller
- Add WebSocket client in `frontend/app/learn/page.tsx`
- Replace mock `setTimeout` with real stream events
- Display TEACHER_TEXT_DELTA live
- Apply BOARD_ACTION to update board UI
- Add "Ma Fhemtch" interrupt button

---

## 💡 Key Design Decisions

✅ **WebSocket over HTTP polling** — Enables interrupt-anytime without lag  
✅ **Centralized Opik logging** — All LLM calls traceable + evaluable  
✅ **Stateful session manager** — In-memory for dev, can swap for Redis/DB  
✅ **Event contract first** — Frontend + backend can build independently  
✅ **Difficulty auto-adjustment** — Simpler responses on repeated confusion  
✅ **Checkpoint-based resuming** — Can pause, come back, continue from where we left off  

---

## 📝 Notes

- Opik dashboard: Visit https://tokenfactory.esprit.tn/ (or your self-hosted Opik)
- Traces appear with metadata: session ID, step, difficulty, interruption count
- All events are JSON serializable (Pydantic models)
- WebSocket reconnection: Client should handle and retry
- Error events: Always sent as JSON with `error_code` + `message`

Everything is ready for Step 4 (real LLM integration) and Step 5 (frontend).
