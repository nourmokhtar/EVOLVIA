# LangGraph + Opik Integration for Personality Analysis

## Overview
The personality module has been updated to use **LangGraph** for workflow orchestration and **Opik** for observability/monitoring.

## Key Changes

### 1. **Dependencies Added** (`requirements.txt`)
- `langgraph` - Workflow orchestration framework
- `langchain` - Core LangChain library
- `langchain-core` - Core abstractions
- `langchain-community` - Community integrations (including Ollama)
- `opik` - Observability and monitoring platform

### 2. **Architecture Updates** (`app/services/personality_service.py`)

#### New Components:

**PersonalityState (TypedDict)**
```python
class PersonalityState(TypedDict):
    user_prompt: str          # User input text
    analysis_text: str        # LLM analysis output
    traits_delta: Dict        # Trait changes (-10 to +10)
    model_used: str          # Model identifier
    error: str               # Error messages if any
```

**LangGraph Workflow Pipeline**
```
validate_input → analyze_traits → parse_response → finalize
```

#### Node Functions:

1. **validate_input_node** - Validates user input is not empty
2. **analyze_traits_node** - Calls Ollama via LangChain with Opik tracking (`@track`)
3. **parse_response_node** - Extracts JSON trait scores from LLM response
4. **finalize_node** - Finalizes the analysis result

### 3. **Observability with Opik**

The `analyze_traits_node` is decorated with `@track(name="analyze_personality_traits")`, which enables:
- Automatic tracing of the LLM call
- Performance metrics collection
- Request/response logging
- Integration with Opik dashboard

### 4. **LangChain Integration**

The service now uses:
- `langchain_community.llms.Ollama` - Direct LangChain Ollama integration
- Replaced raw httpx calls with LangChain's abstraction
- Consistent error handling across LangChain ecosystem

## Benefits

✅ **Better Workflow Management** - LangGraph provides clear control flow and state management
✅ **Built-in Observability** - Opik tracks all LLM calls automatically
✅ **LangChain Ecosystem** - Compatible with other LangChain tools and integrations
✅ **Scalability** - LangGraph handles complex workflows with conditional routing
✅ **Monitoring** - Full visibility into personality analysis pipeline execution

## Usage

The API endpoints remain unchanged. The improvements are internal:

```python
# Existing endpoint still works as before
POST /personality/analyze-with-ollama
{
  "prompt": "User input for analysis"
}
```

## Monitoring

With Opik integrated:
- Visit your Opik dashboard to see real-time traces of personality analysis
- Monitor LLM latency and token usage
- Track error rates and model performance
- Set up alerts for failed analyses

## Configuration

Ensure your `.env` has:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
USE_OLLAMA_FOR_PERSONALITY=true
OPIK_API_KEY=your_opik_api_key  # Optional for cloud tracking
```

## Future Enhancements

- Add conditional routing for different analysis paths
- Implement parallel trait analysis for speed
- Add feedback loops for continuous improvement
- Create custom Opik metrics for personality traits
