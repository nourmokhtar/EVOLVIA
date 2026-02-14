# Quick Start Guide - EVOLVIA Learning Platform

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Step 1: Start Backend (2 min)

```bash
cd backend

# Activate virtual environment
./myenv/Scripts/activate  # Windows
source myenv/bin/activate  # macOS/Linux

# Verify setup
python verify_backend.py
# Expected: ✓✓✓ ALL TESTS PASSED (5/5)

# Start server
uvicorn app.main:app --host 127.0.0.1 --port 8000
# Expected: INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start Frontend (2 min)

```bash
cd frontend

# Install Three.js (for 3D avatar)
npm install three @types/three

# Start dev server
npm run dev
# Expected: ▲ Next.js ready on http://localhost:3000
```

### Step 3: Access Learning Interface (1 min)

1. Open browser: **http://localhost:3000/learn**
2. You should see:
   - Left: Virtual teacher chat panel
   - Center: 3D animated robot
   - Right: Virtual board

---

## 🎓 Try It Out

### Start a Learning Session
```
1. The page auto-connects to learning session
2. Watch for "Connected to teacher! Ready to learn."
3. Type a question in the input box
4. Press Enter or click Send

Example questions:
- "How does recursion work?"
- "Explain loops"
- "What is object-oriented programming?"
```

### Control the Teaching
- **Pause Button** (Yellow): Pause teacher
- **Volume Button** (Blue): Play/pause audio
- **Message Box**: Ask questions
- **Virtual Board**: Shows lesson content

### Observe the Avatar
- **Idle**: Gentle head swaying when waiting
- **Speaking**: Head nods, mouth animates during speech
- **Thinking**: Different poses for different emotions

---

## 🔌 API Endpoints

### Learning Endpoints
```bash
# WebSocket (bidirectional)
ws://localhost:8000/api/v1/learn/ws/{session_id}

# HTTP (also available)
POST /api/v1/learn/session/start
POST /api/v1/learn/session/event
```

### Evaluation Endpoints
```bash
# Create evaluation dataset
curl -X POST http://localhost:8000/api/v1/evaluations/confusion-dataset \
  -H "Content-Type: application/json" \
  -d '{
    "confusion_points": [...]
  }'

# Get trends
curl http://localhost:8000/api/v1/evaluations/trends?days=7

# Get report
curl http://localhost:8000/api/v1/evaluations/report?days=7
```

---

## ⚙️ Configuration

### Backend Settings (.env)
```env
# Already configured for you:
LLM_PROVIDER=mock
OPIK_API_KEY=QTidL9OQfdTrl7TQB6CWXpI9t
OPIK_PROJECT=evolvia-learn
TOKEN_FACTORY_KEY=sk-7549bef4a952449fa9d41f2624d51677
```

### To Use Real LLM Provider
```env
# Option 1: Google Gemini
LLM_PROVIDER=google
GOOGLE_API_KEY=your-gemini-api-key

# Option 2: Llama (Ollama)
LLM_PROVIDER=llama
OLLAMA_URL=http://localhost:11434

# Option 3: Token Factory
LLM_PROVIDER=token_factory
TOKEN_FACTORY_URL=https://tokenfactory.esprit.tn
```

---

## 🧪 Verify Everything Works

### 1. Backend Health Check
```bash
# Backend running?
curl http://localhost:8000/

# Expected response:
# {"message":"Welcome to Evolvia API"}
```

### 2. WebSocket Connection
```bash
# Check routes registered
curl http://localhost:8000/openapi.json | grep learn

# Should see: /api/v1/learn/session/start, /api/v1/learn/ws/{session_id}
```

### 3. Frontend Rendering
```bash
# Visit http://localhost:3000/learn
# Look for:
# ✓ Teacher panel on left
# ✓ Robot avatar in center
# ✓ Virtual board on right
# ✓ "Connected to teacher! Ready to learn."
```

### 4. TTS Working
```bash
# Type a message and send
# Should hear: "Let me break this down..."
# (Browser may ask for audio permission first)
```

### 5. Avatar Animation
```bash
# Watch the robot:
# When idle: Head sways gently
# When speaking: Mouth animates, head nods
# Eyes blink periodically
```

---

## 📊 Test Evaluation System

```bash
# Create confusion dataset
curl -X POST http://localhost:8000/api/v1/evaluations/confusion-dataset \
  -H "Content-Type: application/json" \
  -d '{
    "confusion_points": [
      {
        "session_id": "sess-1",
        "checkpoint_id": "chk-1",
        "checkpoint_title": "Recursion Basics",
        "student_input": "How is this different from a loop?",
        "interruption_count": 2,
        "teacher_response": "Recursion calls itself, loops iterate...",
        "resolved": true
      }
    ]
  }'

# Should return: dataset_id

# Then run evaluation
curl -X POST http://localhost:8000/api/v1/evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "dataset-id-from-above"
  }'

# Get trends
curl "http://localhost:8000/api/v1/evaluations/trends?days=7"

# Get full report
curl "http://localhost:8000/api/v1/evaluations/report?days=7"
```

---

## 🐛 Troubleshooting

### WebSocket Connection Failed
```
Problem: "Connection lost. Attempting to reconnect..."
Solution: 
  1. Check backend is running: curl http://localhost:8000/
  2. Check port 8000 is not blocked
  3. Restart backend server
```

### No Audio Playback
```
Problem: TTS button doesn't play sound
Solution:
  1. Check browser audio permissions
  2. Check system volume is up
  3. Try different browser
  4. Check console for errors (F12)
```

### Avatar Not Showing
```
Problem: Black area where robot should be
Solution:
  1. Check Three.js installed: npm list three
  2. Restart npm dev server
  3. Clear browser cache (Ctrl+Shift+Delete)
  4. Try different browser
```

### Evaluation API Errors
```
Problem: 500 error from /evaluations endpoints
Solution:
  1. Check OPIK_API_KEY in .env
  2. Verify confusion points format
  3. Check backend logs
```

---

## 📚 Important Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | Backend entry point |
| `backend/app/api/learn.py` | Learning endpoints |
| `backend/app/api/evaluations.py` | Evaluation endpoints |
| `frontend/app/learn/page.tsx` | Learning UI |
| `frontend/lib/hooks/useLearnWebSocket.ts` | WebSocket hook |
| `frontend/components/RobotAvatar.tsx` | 3D avatar |

---

## 🔗 Useful Links

- **Local Backend**: http://127.0.0.1:8000
- **Local Frontend**: http://localhost:3000
- **API Docs**: http://127.0.0.1:8000/docs (Swagger)
- **Learning Page**: http://localhost:3000/learn
- **Opik Dashboard**: https://opik.comet.com

---

## 💡 Example Usage

### Start with Default Lesson
```bash
# Opens with default lesson and user
http://localhost:3000/learn

# Custom lesson and user
http://localhost:3000/learn?lesson=lesson-123&user=user-456
```

### Send Multiple Questions
```
1. "What is a for loop?"
   → Teacher explains with examples
   → Board shows: Title, Bullet points, Steps

2. "I don't understand the iterator"
   → Teaching adjusts
   → Avatar shows "thinking" emotion
   → Response tailored to clarify

3. "Can you slow down?"
   → Click pause button
   → Teacher pauses
   → Click play to resume
```

---

## ✨ What You're Getting

✅ **Real-time Learning**
- Live WebSocket connection
- Streaming teacher responses
- Instant board updates

✅ **Engaging UI**
- 3D animated robot teacher
- Text-to-speech audio
- Virtual whiteboard
- Chat interface

✅ **Smart Teaching**
- Multi-provider LLM support
- Difficulty adaptation
- Interruption handling
- State tracking

✅ **Quality Measurement**
- Opik observability
- Confusion point analysis
- Teaching effectiveness scoring
- Improvement recommendations

---

## 🎯 Next Steps

1. **Explore the Interface** (5 min)
   - Try different questions
   - Test pause/resume
   - Observe avatar animations

2. **Check Evaluation System** (5 min)
   - Create test confusion dataset
   - Run evaluation
   - View trends report

3. **Customize Settings** (10 min)
   - Edit .env for real LLM
   - Configure TTS provider
   - Adjust avatar scale

4. **Prepare for Production** (30 min)
   - Configure database (PostgreSQL)
   - Set up monitoring
   - Deploy to server

---

## 📞 Support

- **Backend Issues**: Check `server_output.txt` or backend console
- **Frontend Issues**: Open DevTools (F12) → Console tab
- **LLM Issues**: Verify API keys in `.env`
- **Evaluation Issues**: Check Opik dashboard at https://opik.comet.com

---

**Ready to learn? Start the backend and frontend, then visit http://localhost:3000/learn! 🚀**

