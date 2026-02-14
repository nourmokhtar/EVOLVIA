# Ollama Personality Analysis Integration Guide

## Overview

This implementation integrates a locally hosted Ollama model to analyze user prompts and estimate personality trait changes. The system evaluates six key personality dimensions and updates user profiles in real-time.

## Features

- **Local LLM Integration**: Uses Ollama models (Mistral, Llama 2, etc.) running locally
- **Personality Trait Analysis**: Evaluates changes in 6 key traits:
  - Communication
  - Empathy
  - Conflict Resolution
  - Collaboration
  - Confidence
  - Adaptability
- **Automatic Profile Updates**: Trait scores are updated based on analysis
- **Error Handling**: Graceful fallback if Ollama is unavailable
- **Configurable**: Easy to adjust model, URL, and trait weights

## Setup Instructions

### 1. Install Ollama

Visit [ollama.ai](https://ollama.ai) and download/install Ollama for your OS.

### 2. Pull a Model

Run one of these commands in your terminal:

```bash
ollama pull mistral    # Recommended: fast and accurate
ollama pull llama2     # Alternative: more capable but larger
ollama pull neural-chat  # Alternative: optimized for chat
```

### 3. Start Ollama Server

```bash
ollama serve
```

The server will run on `http://localhost:11434` by default.

### 4. Configure Backend Settings

Update your `.env` file or `app/core/config.py`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
USE_OLLAMA_FOR_PERSONALITY=True
```

### 5. Dependencies

All required dependencies are already in `requirements.txt`:
- `httpx` - for async HTTP requests to Ollama
- `python-dotenv` - for environment configuration

## API Endpoint

### Analyze User Prompt with Ollama

**Endpoint**: `POST /api/v1/personality/analyze-with-ollama`

**Request Body**:
```json
{
  "prompt": "I helped resolve a conflict between two team members by listening to both sides and finding common ground."
}
```

**Response**:
```json
{
  "success": true,
  "user_prompt": "I helped resolve a conflict...",
  "traits_delta": {
    "Communication": 5,
    "Empathy": 8,
    "Conflict Res": 7,
    "Collaboration": 3,
    "Confidence": 4,
    "Adaptability": 2
  },
  "updated_profile": {
    "Communication": 55,
    "Empathy": 58,
    "Conflict Res": 57,
    "Collaboration": 53,
    "Confidence": 54,
    "Adaptability": 52
  },
  "analysis": "The user demonstrated strong empathy and conflict resolution skills by actively listening and finding common ground...",
  "model_used": "mistral"
}
```

## How It Works

### 1. Prompt Analysis Flow

```
User Input
    ↓
Personality Service receives prompt
    ↓
Create analysis prompt for Ollama
    ↓
Send to Ollama API (async)
    ↓
Parse JSON response with trait deltas
    ↓
Update user personality profile in DB
    ↓
Return results to client
```

### 2. Trait Scoring

- **Delta Range**: -10 to +10 per interaction
- **Profile Range**: 0 to 100 per trait
- **Starting Value**: 50 (neutral)
- **Clamping**: All values are clamped to valid ranges

### 3. Analysis Prompt Template

The service generates a prompt like:

```
Analyze the following user input and estimate personality trait point changes (-10 to +10 range).

User input: "[user's prompt]"

Personality traits to evaluate: Communication, Empathy, Conflict Res, Collaboration, Confidence, Adaptability

Provide a JSON response in the following format:
{
    "Communication": <-10 to +10>,
    "Empathy": <-10 to +10>,
    "Conflict Res": <-10 to +10>,
    "Collaboration": <-10 to +10>,
    "Confidence": <-10 to +10>,
    "Adaptability": <-10 to +10>,
    "analysis": "Brief explanation of why these scores were assigned"
}

Be concise and provide only the JSON response.
```

## Usage Examples

### Python Example

```python
import httpx
import asyncio

async def analyze_personality():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/personality/analyze-with-ollama",
            json={
                "prompt": "I organized a team workshop to improve communication skills"
            }
        )
        result = response.json()
        print(result)

asyncio.run(analyze_personality())
```

### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/personality/analyze-with-ollama \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I helped my colleague debug a complex problem by asking clarifying questions"}'
```

### Frontend (React/TypeScript) Example

```typescript
async function analyzePersonality(prompt: string) {
  const response = await fetch('/api/v1/personality/analyze-with-ollama', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  
  const result = await response.json();
  console.log('Updated traits:', result.traits_delta);
  console.log('Personality profile:', result.updated_profile);
  return result;
}
```

## Configuration Options

### Models Available

Different Ollama models have different characteristics:

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| mistral | 4GB | Fast | Good | Default choice |
| llama2 | 7GB | Medium | Excellent | Detailed analysis |
| neural-chat | 4GB | Fast | Very Good | Conversational |
| orca-mini | 2GB | Very Fast | Fair | Testing |

### Adjusting Model

In `.env` or `config.py`:
```
OLLAMA_MODEL=llama2
```

### Disabling Ollama

If you want to disable Ollama:
```
USE_OLLAMA_FOR_PERSONALITY=False
```

The endpoint will return an error response with `success: false`.

## Error Handling

### Connection Errors

If Ollama is not running:
```json
{
  "success": false,
  "error": "Could not connect to Ollama at http://localhost:11434",
  "traits_delta": {}
}
```

**Fix**: Start Ollama with `ollama serve`

### Timeout Errors

If the analysis takes too long:
```json
{
  "success": false,
  "error": "timeout",
  "traits_delta": {}
}
```

**Fix**: Consider using a faster model or increasing timeout (currently 30 seconds)

### Empty Prompt

```json
{
  "detail": "Prompt cannot be empty"
}
```

## Performance Considerations

- **Response Time**: 2-10 seconds depending on model and hardware
- **Memory Usage**: 4-14GB depending on model
- **CPU**: Supports CPU inference, but GPU acceleration recommended
- **Concurrency**: The async implementation supports multiple concurrent requests

## Development & Testing

### Test Endpoint

```bash
# Start backend
cd backend
python app/main.py

# In another terminal, test the endpoint
curl -X POST http://localhost:8000/api/v1/personality/analyze-with-ollama \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test prompt here"}'
```

### Debugging

Enable debug logging to see Ollama API calls:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Integration with UI

The personality analysis can be integrated into various parts of the application:

1. **After Chat Interactions**: Analyze user responses in learning scenarios
2. **After Quiz Submissions**: Assess personality traits from answers
3. **Pitch Practice**: Evaluate communication and confidence
4. **Collaboration Sessions**: Assess collaboration and empathy traits
5. **User Reflections**: Direct prompt submission for trait updates

## Advanced Customization

### Modify Trait List

Edit `PERSONALITY_TRAITS` in `personality_service.py`:

```python
PERSONALITY_TRAITS = [
    "Leadership",
    "Creativity", 
    "Technical Skill",
    # Add more traits as needed
]
```

Update the analysis prompt template accordingly.

### Custom Scoring Logic

Override `_parse_trait_scores()` method for custom parsing logic:

```python
def _parse_trait_scores(self, response_text: str) -> Dict[str, int]:
    # Custom implementation
    pass
```

### Weighted Traits

Implement trait weighting before updating:

```python
trait_weights = {
    "Communication": 1.5,
    "Empathy": 1.2,
    # ...
}
```

## Troubleshooting

### Q: Ollama responses are too long
**A**: Adjust the prompt to be more specific or use a smaller model

### Q: Personality scores aren't changing
**A**: Check that the Ollama analysis is parsing correctly. Enable debug logging.

### Q: Ollama is slow
**A**: Use a smaller/faster model like `mistral` instead of `llama2`

### Q: Memory usage is high
**A**: Use a smaller model or reduce concurrent requests

## Future Enhancements

- [ ] Fine-tune models on personality assessment datasets
- [ ] Add confidence scores for trait predictions
- [ ] Implement personality trend analysis over time
- [ ] Add multi-language support
- [ ] Cache similar prompts to reduce API calls
- [ ] A/B test different models for accuracy

## Support & References

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Ollama Models](https://ollama.ai/library)
- [FastAPI Async](https://fastapi.tiangolo.com/async/)
- [HTTPX Async Client](https://www.python-httpx.org/)
