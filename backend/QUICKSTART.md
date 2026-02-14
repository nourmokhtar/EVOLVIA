# Quick Start: Ollama Personality Analysis

## 30-Second Setup

### 1. Install Ollama
Download from [ollama.ai](https://ollama.ai)

### 2. Pull a Model
```bash
ollama pull mistral
```

### 3. Start Ollama
```bash
ollama serve
```
(Keep this terminal open)

### 4. Start Backend
```bash
cd backend
python app/main.py
```

### 5. Test It
```bash
# In a new terminal
cd backend
python test_ollama_personality.py
```

---

## API Usage

### Basic Request
```bash
curl -X POST http://localhost:8000/api/v1/personality/analyze-with-ollama \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I helped resolve a team conflict by listening to both sides"}'
```

### Response
```json
{
  "success": true,
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
  }
}
```

---

## Configuration (Optional)

In `.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
USE_OLLAMA_FOR_PERSONALITY=True
```

## Models

| Model | Speed | Quality | Size |
|-------|-------|---------|------|
| mistral | ⚡⚡ Fast | ✓ Good | 4GB |
| llama2 | ⚡ Medium | ✓✓ Excellent | 7GB |
| neural-chat | ⚡⚡ Fast | ✓✓ Good | 4GB |

---

## Personality Traits Analyzed

1. **Communication** - Clear, effective expression
2. **Empathy** - Understanding others' feelings
3. **Conflict Res** - Resolving disagreements
4. **Collaboration** - Working with others
5. **Confidence** - Self-assurance
6. **Adaptability** - Flexibility to change

---

## Integration Points

Add personality analysis to:
- ✅ AI Teacher responses
- ✅ Quiz answers
- ✅ Pitch practice
- ✅ Collaboration logs
- ✅ Any user text input

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not connect to Ollama" | Run `ollama serve` |
| "Connection refused" to backend | Run `python app/main.py` in backend folder |
| Slow responses | Use faster model: `ollama pull mistral` |
| High memory usage | Use smaller model or reduce concurrent requests |

---

## Files Created

- `personality_service.py` - Main logic with Ollama integration
- `personality.py` - API endpoint
- `config.py` - Configuration
- `test_ollama_personality.py` - Testing script
- `OLLAMA_PERSONALITY_GUIDE.md` - Detailed guide
- `OLLAMA_INTEGRATION_EXAMPLES.md` - Code examples

---

## Next Steps

1. Integrate with your UI (see `OLLAMA_INTEGRATION_EXAMPLES.md`)
2. Fine-tune prompts for your use case
3. Customize personality traits if needed
4. Add real user authentication (currently uses first user)
5. Implement analytics/tracking of trait changes

---

For detailed documentation, see:
- `OLLAMA_PERSONALITY_GUIDE.md` - Complete guide
- `OLLAMA_INTEGRATION_EXAMPLES.md` - Code examples
