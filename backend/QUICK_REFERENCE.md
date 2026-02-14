# QUICK REFERENCE CARD - Ollama Personality Analysis

## 🚀 QUICK START (Copy-Paste Commands)

```bash
# 1. START OLLAMA (Terminal 1)
ollama pull mistral
ollama serve

# 2. START BACKEND (Terminal 2)
cd backend
python app/main.py

# 3. RUN TESTS (Terminal 3)
cd backend
python test_ollama_personality.py
```

## 📡 API ENDPOINT

```bash
# Test the endpoint
curl -X POST http://localhost:8000/api/v1/personality/analyze-with-ollama \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I helped my colleague debug a complex issue"}'
```

## 📊 TRAIT SCORING

| Trait | Description | Example |
|-------|-------------|---------|
| Communication | Clear expression | "Explained clearly" |
| Empathy | Understanding feelings | "Listened to concerns" |
| Conflict Res | Resolving disagreements | "Found common ground" |
| Collaboration | Working with others | "Worked as a team" |
| Confidence | Self-assurance | "Spoke with conviction" |
| Adaptability | Flexibility to change | "Adjusted to new approach" |

### Score Ranges
- **Per Interaction**: -10 to +10 (delta)
- **Profile Total**: 0 to 100
- **Starting Value**: 50 (neutral)

## ⚙️ CONFIGURATION

### In `.env`
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
USE_OLLAMA_FOR_PERSONALITY=True
```

### Models & Commands
```bash
ollama pull mistral      # 4GB, fast, good (recommended)
ollama pull llama2       # 7GB, slower, excellent
ollama pull neural-chat  # 4GB, fast, good for chat
```

## 📁 FILES CHANGED

```
backend/
├── app/
│   ├── api/
│   │   └── personality.py           [MODIFIED] + endpoint
│   ├── core/
│   │   └── config.py                [MODIFIED] + Ollama config
│   └── services/
│       └── personality_service.py   [MODIFIED] + Ollama methods
└── [NEW FILES]
    ├── test_ollama_personality.py   [NEW] test suite
    ├── QUICKSTART.md                [NEW] setup guide
    ├── OLLAMA_PERSONALITY_GUIDE.md  [NEW] documentation
    ├── OLLAMA_INTEGRATION_EXAMPLES.md [NEW] code examples
    ├── README_OLLAMA.md             [NEW] overview
    ├── ARCHITECTURE_DIAGRAMS.md     [NEW] visual diagrams
    ├── IMPLEMENTATION_SUMMARY.md    [NEW] change summary
    └── CHECKLIST.md                 [NEW] progress tracker
```

## 🔌 INTEGRATION (Quick Examples)

### Quiz Answer Analysis
```python
@router.post("/submit-answer")
async def submit_answer(answer: str, db: Session = Depends(get_db)):
    user = db.query(User).first()
    result = await personality_service.analyze_and_update_personality(
        db=db, user=user, user_prompt=answer
    )
    return {"answer_saved": True, "personality_update": result}
```

### Pitch Practice
```python
@router.post("/submit-pitch")
async def submit_pitch(pitch_text: str, db: Session = Depends(get_db)):
    user = db.query(User).first()
    result = await personality_service.analyze_and_update_personality(
        db=db, user=user, user_prompt=pitch_text
    )
    return result
```

### Frontend Hook (React)
```typescript
async function analyzePersonality(prompt: string) {
  const response = await fetch('/api/v1/personality/analyze-with-ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
}
```

## 🧪 TESTING

```bash
# Full test suite
python test_ollama_personality.py

# Single prompt test
python test_ollama_personality.py "I resolved a conflict"

# Expected output:
# ✅ Ollama running
# ✅ Backend running  
# ✅ [Test 1/5] Conflict Resolution
# ✅ [Test 2/5] Communication & Confidence
# ✅ [Test 3/5] Collaboration & Empathy
# ✅ [Test 4/5] Adaptability
# ✅ [Test 5/5] Communication
```

## 🐛 TROUBLESHOOTING

### "Could not connect to Ollama"
```bash
# Solution: Start Ollama
ollama serve
```

### "Connection refused" (Backend)
```bash
# Solution: Start backend
cd backend
python app/main.py
```

### Slow responses
```bash
# Use faster model
ollama pull mistral

# Update config
OLLAMA_MODEL=mistral
```

### High memory usage
```bash
# Use smaller model
ollama pull orca-mini
OLLAMA_MODEL=orca-mini
```

## 📈 RESPONSE EXAMPLE

```json
{
  "success": true,
  "user_prompt": "I mediated between two team members...",
  "traits_delta": {
    "Communication": 5,
    "Empathy": 7,
    "Conflict Res": 8,
    "Collaboration": 3,
    "Confidence": 2,
    "Adaptability": 1
  },
  "updated_profile": {
    "Communication": 55,
    "Empathy": 57,
    "Conflict Res": 58,
    "Collaboration": 53,
    "Confidence": 52,
    "Adaptability": 51
  },
  "analysis": "The user demonstrated strong empathy and...",
  "model_used": "mistral"
}
```

## 📚 DOCUMENTATION MAP

```
Read in this order:
1. README_OLLAMA.md ← Overview & Summary
2. QUICKSTART.md ← 5-minute setup
3. OLLAMA_PERSONALITY_GUIDE.md ← Complete guide
4. OLLAMA_INTEGRATION_EXAMPLES.md ← Code patterns
5. ARCHITECTURE_DIAGRAMS.md ← System diagrams
6. test_ollama_personality.py ← Test examples
```

## ✅ CHECKLIST

- [ ] Install Ollama
- [ ] Pull model: `ollama pull mistral`
- [ ] Start Ollama: `ollama serve`
- [ ] Start Backend: `python app/main.py`
- [ ] Run Tests: `python test_ollama_personality.py`
- [ ] Read QUICKSTART.md
- [ ] Review OLLAMA_INTEGRATION_EXAMPLES.md
- [ ] Integrate with first endpoint (Quizzes?)
- [ ] Test end-to-end from UI
- [ ] Deploy to production

## 🎯 KEY METHODS

### Main Method
```python
await personality_service.analyze_and_update_personality(
    db=db,
    user=user,
    user_prompt="user text"
)
```

### Returns
```python
{
    "success": bool,
    "user_prompt": str,
    "traits_delta": {trait: delta},
    "updated_profile": {trait: score},
    "analysis": str
}
```

## 🔒 SECURITY NOTES

- ✅ No external API calls (local only)
- ✅ Input validation on prompt
- ✅ Error handling for all scenarios
- ⚠️ TODO: Add rate limiting to endpoint
- ⚠️ TODO: Add authentication (currently mock user)

## 📞 SUPPORT

- Issue? Check OLLAMA_PERSONALITY_GUIDE.md
- Code example? See OLLAMA_INTEGRATION_EXAMPLES.md
- Architecture? See ARCHITECTURE_DIAGRAMS.md
- Testing? Run test_ollama_personality.py
- Setup? Start with QUICKSTART.md

## 🚀 NEXT STEPS

1. **Now**: Run test script
2. **Today**: Integrate with one endpoint
3. **This week**: Test end-to-end
4. **Next week**: Full production rollout

---

**Version**: 1.0  
**Status**: ✅ Ready for Integration  
**Date**: January 23, 2026
