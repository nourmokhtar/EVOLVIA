# Quick Start: Test Steps 2 & 3

## 🚀 Start Backend

```bash
cd backend
pip install -r requirements.txt   # If first time
uvicorn app.main:app --reload
```

Expected output:
```
Opik observability configured
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## 🧪 Test 1: HTTP Endpoint (Quick)

```bash
# Terminal 1: Backend is running (see above)

# Terminal 2: Test session creation
curl -X POST http://localhost:8000/api/v1/learn/session/start \
  -H "Content-Type: application/json" \
  -d '{"type": "START_LESSON", "lesson_id": "test-lesson"}'

# Response (example):
# {
#   "session_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "TEACHING"
# }

# Copy session_id for next test
export SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

# Test sending message
curl -X POST http://localhost:8000/api/v1/learn/session/event \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"USER_MESSAGE\",
    \"session_id\": \"$SESSION_ID\",
    \"text\": \"What is Python?\"
  }"

# Response (example):
# {
#   "status": "TEACHING",
#   "teacher_response": {
#     "speech": "Python is a...",
#     "board_actions": [{"kind": "WRITE_TITLE", "payload": {...}}]
#   }
# }
```

---

## 📡 Test 2: WebSocket (Full Stream)

### Using wscat (recommended)

```bash
# Install wscat globally (if not installed)
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/api/v1/learn/ws/test-session-123

# You should see:
# Connected (press CTRL+C to quit)
# >

# Send user message (paste this):
{"type": "USER_MESSAGE", "session_id": "test-session-123", "text": "What is recursion?"}

# You should receive stream of events:
# {"type":"STATUS","session_id":"test-session-123","status":"TEACHING"}
# {"type":"TEACHER_TEXT_DELTA","session_id":"test-session-123","delta":"Recursion "}
# {"type":"TEACHER_TEXT_DELTA","session_id":"test-session-123","delta":"is..."}
# {"type":"BOARD_ACTION","session_id":"test-session-123","action":{"kind":"WRITE_TITLE"...}}
# ... more events ...
# {"type":"TEACHER_TEXT_FINAL","session_id":"test-session-123","text":"..."}
# {"type":"CHECKPOINT","session_id":"test-session-123","step_id":0,...}

# Now test interrupt:
{"type":"INTERRUPT","session_id":"test-session-123","reason":"MA_FHEMTCH"}

# Response:
# {"type":"STATUS","session_id":"test-session-123","status":"PAUSED"}

# Test resume:
{"type":"RESUME","session_id":"test-session-123","step_id":0}

# Response:
# {"type":"STATUS","session_id":"test-session-123","status":"RESUMING"}
# {"type":"STATUS","session_id":"test-session-123","status":"TEACHING"}
```

### Using Browser Console

```javascript
const SESSION_ID = 'test-session-' + Date.now();
const ws = new WebSocket('ws://localhost:8000/api/v1/learn/ws/' + SESSION_ID);

ws.onmessage = (event) => {
  console.log('← Server:', JSON.parse(event.data));
};

ws.onopen = () => {
  console.log('✓ Connected');
  
  // Send user message
  ws.send(JSON.stringify({
    type: 'USER_MESSAGE',
    session_id: SESSION_ID,
    text: 'What is machine learning?'
  }));
};

ws.onerror = (error) => console.error('✗ Error:', error);
ws.onclose = () => console.log('✗ Disconnected');

// To interrupt, run in console:
// ws.send(JSON.stringify({type: 'INTERRUPT', session_id: SESSION_ID, reason: 'MA_FHEMTCH'}))

// To resume, run in console:
// ws.send(JSON.stringify({type: 'RESUME', session_id: SESSION_ID, step_id: 0}))
```

### Using Python

```python
import asyncio
import websockets
import json

async def test_websocket():
    session_id = 'test-session-py'
    uri = f'ws://localhost:8000/api/v1/learn/ws/{session_id}'
    
    async with websockets.connect(uri) as websocket:
        print('✓ Connected')
        
        # Send message
        msg = {
            'type': 'USER_MESSAGE',
            'session_id': session_id,
            'text': 'What is an algorithm?'
        }
        await websocket.send(json.dumps(msg))
        print(f'→ Sent: {msg}')
        
        # Receive responses
        while True:
            try:
                response = await websocket.recv()
                event = json.loads(response)
                print(f'← Received: {event["type"]} - {event}')
            except websockets.exceptions.ConnectionClosed:
                print('✗ Disconnected')
                break

asyncio.run(test_websocket())
```

---

## ✅ Test 3: State Machine (Python Script)

```python
# test_state_machine.py

from app.services.learn_session import LearnSession, SessionStatus

# Create session
session = LearnSession(
    session_id='test-123',
    lesson_id='lesson-1',
    user_id='user-1'
)

# Test initial state
assert session.status == SessionStatus.IDLE, "Should start in IDLE"
print(f"✓ Initial state: {session.status}")

# Start session
session.start()
assert session.status == SessionStatus.TEACHING, "Should move to TEACHING"
print(f"✓ After start(): {session.status}")

# Interrupt
session.pause(reason="Don't understand")
assert session.status == SessionStatus.PAUSED, "Should move to PAUSED"
assert session.interruption_count == 1, "Should count interruption"
print(f"✓ After pause(): {session.status}, interruption_count={session.interruption_count}")

# Resume
session.resume()
assert session.status == SessionStatus.RESUMING, "Should move to RESUMING"
print(f"✓ After resume(): {session.status}")

# Continue
session.continue_teaching()
assert session.status == SessionStatus.TEACHING, "Should move back to TEACHING"
print(f"✓ After continue(): {session.status}")

# Wait for answer
session.wait_for_answer()
assert session.status == SessionStatus.ANSWERING, "Should move to ANSWERING"
print(f"✓ After wait_for_answer(): {session.status}")

# Continue again
session.continue_teaching()
assert session.status == SessionStatus.TEACHING, "Should return to TEACHING"
print(f"✓ After continue(): {session.status}")

# Test checkpoint
checkpoint = session.set_checkpoint("Covered: Introduction")
print(f"✓ Checkpoint set: {checkpoint.short_summary}")

# Test metadata
metadata = session.get_metadata()
print(f"✓ Metadata: session_id={metadata.session_id}, step_id={metadata.step_id}, interruption_count={metadata.interruption_count}")

print("\n✅ All state machine tests passed!")
```

Run it:
```bash
cd backend
python -c "
from app.services.learn_session import LearnSession, SessionStatus

session = LearnSession('test', 'lesson-1')
session.start()
print('✓ Session started:', session.status)

session.pause('test')
print('✓ Session paused:', session.status)

session.resume()
print('✓ Session resumed:', session.status)

session.continue_teaching()
print('✓ Continued:', session.status)

print('✅ State machine works!')
"
```

---

## 🔍 Test 4: Opik Tracing

Check that Opik is initialized:

```bash
# Look for this in backend output:
# Opik observability configured
```

Check Opik dashboard:
1. Go to https://tokenfactory.esprit.tn/
2. Login with your workspace
3. Navigate to project `evolvia-learn`
4. Make a WebSocket request (it will generate traces)
5. Traces should appear in the dashboard

---

## 📊 Test 5: Verify Event Contract

```python
# Quick validation that all events can be created

from app.schemas.learn import (
    StartLessonEvent, UserMessageEvent, InterruptEvent, ResumeEvent,
    StatusEvent, TeacherTextDeltaEvent, TeacherTextFinalEvent,
    BoardActionEvent, CheckpointEvent, ErrorEvent,
    SessionStatus, InterruptReason, BoardActionKind
)

# Test inbound events
start = StartLessonEvent(lesson_id='lesson-1')
print(f"✓ {start.type}")

msg = UserMessageEvent(session_id='sess-1', text='Hello')
print(f"✓ {msg.type}")

interrupt = InterruptEvent(session_id='sess-1', reason=InterruptReason.MA_FHEMTCH)
print(f"✓ {interrupt.type}")

resume = ResumeEvent(session_id='sess-1', step_id=0)
print(f"✓ {resume.type}")

# Test outbound events
status = StatusEvent(session_id='sess-1', status=SessionStatus.TEACHING)
print(f"✓ {status.type}")

delta = TeacherTextDeltaEvent(session_id='sess-1', delta='Hello ')
print(f"✓ {delta.type}")

final = TeacherTextFinalEvent(session_id='sess-1', text='Hello world')
print(f"✓ {final.type}")

print("\n✅ All event schemas validate!")
```

---

## 🎯 Checklist: All Tests

- [ ] Backend starts without errors
- [ ] `Opik observability configured` appears in logs
- [ ] HTTP session/start endpoint returns session_id
- [ ] HTTP session/event endpoint returns teacher response
- [ ] WebSocket connects successfully
- [ ] WebSocket receives STATUS event on connect
- [ ] USER_MESSAGE produces streaming events
- [ ] BOARD_ACTION events contain valid actions
- [ ] INTERRUPT changes status to PAUSED
- [ ] RESUME changes status to RESUMING then TEACHING
- [ ] State machine transitions work correctly
- [ ] Traces appear in Opik dashboard
- [ ] All event schemas validate

---

## 🚨 Troubleshooting

### "Module not found: learn"
```
Fix: python -m pip install -e .
or: Check that backend/app/api/learn.py exists
```

### "Opik configuration failed"
```
Fix: Make sure OPIK_API_KEY is set in .env
or: Set OPIK_ENABLED=false to disable tracing
```

### "WebSocket connection refused"
```
Fix: Make sure backend is running (uvicorn app.main:app --reload)
or: Check that port 8000 is available
```

### "Session not found"
```
Fix: Use same session_id from /session/start response
or: WebSocket session is different (starts fresh)
```

---

## 🎉 Success Criteria

You know it's working when:
1. ✅ Backend starts without errors
2. ✅ HTTP endpoints return valid responses
3. ✅ WebSocket connects and streams events
4. ✅ State transitions work correctly
5. ✅ Traces appear in Opik dashboard

**If all 5 pass, Steps 2 & 3 are complete!**
