"""
SYSTEM ARCHITECTURE & FLOW DIAGRAMS

Ollama Personality Analysis Integration
"""

# ============================================================================
# 1. BASIC FLOW DIAGRAM
# ============================================================================

BASIC_FLOW = """
┌─────────────────────────────────────────────────────────────────┐
│                      PERSONALITY ANALYSIS FLOW                  │
└─────────────────────────────────────────────────────────────────┘

    User Input
        ↓
    ┌─────────────────────────┐
    │ FastAPI Endpoint        │
    │ /analyze-with-ollama    │
    └────────────┬────────────┘
                 ↓
    ┌─────────────────────────────────────┐
    │ Personality Service                 │
    │ - validate input                    │
    │ - create analysis prompt            │
    └────────────┬────────────────────────┘
                 ↓
    ┌─────────────────────────────────────┐
    │ Ollama HTTP Request                 │
    │ POST http://localhost:11434/generate│
    │ - model: mistral                    │
    │ - prompt: analysis prompt           │
    │ - stream: false                     │
    └────────────┬────────────────────────┘
                 ↓
    ┌─────────────────────────────────────┐
    │ Ollama Model Processing             │
    │ - Analyzes user prompt              │
    │ - Estimates trait changes           │
    │ - Returns JSON response             │
    └────────────┬────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Parse Response                       │
    │ - Extract JSON                       │
    │ - Get trait deltas                   │
    │ - Validate scores (-10 to +10)       │
    └────────────┬─────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Update User Profile                  │
    │ - Apply trait deltas                 │
    │ - Clamp values (0-100)               │
    │ - Save to database                   │
    └────────────┬─────────────────────────┘
                 ↓
    ┌──────────────────────────────────────┐
    │ Return Response                      │
    │ - success: true                      │
    │ - traits_delta                       │
    │ - updated_profile                    │
    │ - analysis (Ollama feedback)         │
    └──────────────────────────────────────┘
"""


# ============================================================================
# 2. SYSTEM ARCHITECTURE
# ============================================================================

SYSTEM_ARCHITECTURE = """
┌────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                         │
└────────────────────────────────────────────────────────────────────┘

                            Frontend
                              ↓
                    ┌─────────────────────┐
                    │   React/Next.js     │
                    │  Components         │
                    │  Hooks              │
                    └──────────┬──────────┘
                              ↓
                    ┌─────────────────────┐
                    │   HTTP Requests     │
                    │   (fetch/axios)     │
                    └──────────┬──────────┘
                              ↓
            ┌─────────────────────────────────────┐
            │         FastAPI Backend             │
            │   ┌──────────────────────────────┐  │
            │   │ Personality API Endpoint     │  │
            │   │ POST /analyze-with-ollama    │  │
            │   └──────────┬───────────────────┘  │
            │              ↓                      │
            │   ┌──────────────────────────────┐  │
            │   │ Personality Service          │  │
            │   │ ├─ analyze_and_update()      │  │
            │   │ ├─ analyze_user_input()      │  │
            │   │ ├─ _parse_trait_scores()     │  │
            │   │ └─ update_score()            │  │
            │   └──────────┬───────────────────┘  │
            │              ↓                      │
            │   ┌──────────────────────────────┐  │
            │   │ User Model (SQLAlchemy)      │  │
            │   │ ├─ personality_profile{}     │  │
            │   │ └─ [other user data]         │  │
            │   └──────────┬───────────────────┘  │
            │              ↓                      │
            │   ┌──────────────────────────────┐  │
            │   │ SQLite Database              │  │
            │   └──────────────────────────────┘  │
            └─────────────┬──────────────────────┘
                          ↓
                ┌──────────────────────┐
                │   Ollama Service     │
                │  (Local LLM)         │
                │                      │
                │ http://localhost:    │
                │ 11434/api/generate   │
                │                      │
                │ Models:              │
                │ - mistral (4GB)      │
                │ - llama2 (7GB)       │
                │ - neural-chat (4GB)  │
                └──────────────────────┘
"""


# ============================================================================
# 3. DATA FLOW FOR PERSONALITY UPDATE
# ============================================================================

DATA_FLOW = """
┌──────────────────────────────────────────────────────────────────┐
│               PERSONALITY PROFILE UPDATE FLOW                     │
└──────────────────────────────────────────────────────────────────┘

Input:
┌────────────────────────────────────────┐
│ User Prompt                            │
│ "I resolved a conflict by listening"   │
└────────────────────────┬───────────────┘
                         ↓
Ollama Analysis Prompt:
┌──────────────────────────────────────────────────────┐
│ "Analyze user input and estimate trait changes:"     │
│ - Range: -10 to +10                                  │
│ - Traits: Communication, Empathy, Conflict Res...    │
│ - Return JSON format                                 │
└──────────────────────────┬───────────────────────────┘
                           ↓
Ollama Response (Example):
┌────────────────────────────────────────────────────┐
│ {                                                   │
│   "Communication": 4,                               │
│   "Empathy": 7,                                     │
│   "Conflict Res": 8,                                │
│   "Collaboration": 3,                               │
│   "Confidence": 2,                                  │
│   "Adaptability": 1,                                │
│   "analysis": "Demonstrated strong listening..."    │
│ }                                                   │
└──────────────────────┬───────────────────────────────┘
                       ↓
Database Update (Before):
┌────────────────────────────────────────┐
│ user.personality_profile {             │
│   "Communication": 50,                 │
│   "Empathy": 50,                       │
│   "Conflict Res": 50,                  │
│   "Collaboration": 50,                 │
│   "Confidence": 50,                    │
│   "Adaptability": 50                   │
│ }                                      │
└────────────────────────┬───────────────┘
                         ↓
Update Logic (Clamped 0-100):
┌──────────────────────────────────────────────────┐
│ For each trait:                                   │
│   new_value = min(100, max(0, old + delta))      │
│                                                   │
│ Communication:  50 + 4 = 54                       │
│ Empathy:        50 + 7 = 57                       │
│ Conflict Res:   50 + 8 = 58                       │
│ Collaboration:  50 + 3 = 53                       │
│ Confidence:     50 + 2 = 52                       │
│ Adaptability:   50 + 1 = 51                       │
└──────────────────────┬────────────────────────────┘
                       ↓
Database Update (After):
┌────────────────────────────────────────┐
│ user.personality_profile {             │
│   "Communication": 54,  ↑ +4           │
│   "Empathy": 57,        ↑ +7           │
│   "Conflict Res": 58,   ↑ +8           │
│   "Collaboration": 53,  ↑ +3           │
│   "Confidence": 52,     ↑ +2           │
│   "Adaptability": 51    ↑ +1           │
│ }                                      │
└────────────────────────────────────────┘
"""


# ============================================================================
# 4. TRAIT EVALUATION MATRIX
# ============================================================================

TRAIT_MATRIX = """
┌──────────────────────────────────────────────────────────────────┐
│                   PERSONALITY TRAIT MATRIX                        │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┬──────────────────────────┬─────────────────────┐
│     Trait       │     Definition           │   What Increases    │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Communication   │ Clear, effective         │ - Clear explanations│
│                 │ expression of ideas      │ - Good listening    │
│                 │                          │ - Articulate speech │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Empathy         │ Understanding others'    │ - Listening actively│
│                 │ feelings and perspectives│ - Showing care      │
│                 │                          │ - Validating others │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Conflict Res    │ Ability to resolve       │ - Finding common    │
│                 │ disagreements            │   ground            │
│                 │                          │ - Fair solutions    │
│                 │                          │ - Patience          │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Collaboration   │ Working effectively      │ - Teamwork          │
│                 │ with others              │ - Cooperation       │
│                 │                          │ - Shared success    │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Confidence      │ Self-assurance in        │ - Taking initiatives│
│                 │ abilities                │ - Assertive behavior│
│                 │                          │ - Making decisions  │
├─────────────────┼──────────────────────────┼─────────────────────┤
│ Adaptability    │ Flexibility to           │ - Embracing change  │
│                 │ handle change            │ - Problem solving   │
│                 │                          │ - Learning new ways │
└─────────────────┴──────────────────────────┴─────────────────────┘
"""


# ============================================================================
# 5. INTERACTION SCENARIOS
# ============================================================================

SCENARIOS = """
┌──────────────────────────────────────────────────────────────────┐
│                    INTERACTION SCENARIOS                          │
└──────────────────────────────────────────────────────────────────┘

SCENARIO 1: Quiz Answer Analysis
──────────────────────────────────
Quiz Answer (Essay) → Personality Analysis → Trait Update

Example:
User answers: "I would handle this by first understanding..."
              ↓
Analyzed for: Communication, Confidence, Clarity
              ↓
Traits increase based on: thoughtfulness, clarity, confidence shown


SCENARIO 2: Pitch Practice Feedback
─────────────────────────────────────
Pitch Submission → Personality Analysis → Confidence/Communication Update

Example:
User gives: Sales pitch
            ↓
Analyzed for: Communication, Confidence, Clarity, Empathy
            ↓
Traits increase based on: delivery quality, clarity, engagement


SCENARIO 3: Collaboration Session
──────────────────────────────────
Team Interaction Log → Personality Analysis → Collaboration/Empathy Update

Example:
User describes: "I helped my teammate by..."
                ↓
Analyzed for: Collaboration, Empathy, Communication
                ↓
Traits increase based on: helping behavior, teamwork


SCENARIO 4: AI Teacher Discussion
─────────────────────────────────
User Question/Response → Personality Analysis → Multiple Trait Update

Example:
User asks/responds to: Learning question
                       ↓
Analyzed for: Communication, Confidence, Adaptability, Empathy
                       ↓
Traits increase based on: engagement level, question quality
"""


# ============================================================================
# 6. ERROR HANDLING FLOW
# ============================================================================

ERROR_HANDLING = """
┌──────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING FLOW                            │
└──────────────────────────────────────────────────────────────────┘

Request Validation
    ↓
├─ Empty prompt? → 400 Bad Request
├─ User not found? → 404 Not Found
└─ Valid → Continue
    ↓
Connect to Ollama
    ↓
├─ Ollama not running? → 
│   Return {success: false, error: "Could not connect..."}
│
├─ Timeout (>30s)? → 
│   Return {success: false, error: "timeout"}
│
└─ Connected → Continue
    ↓
Parse Response
    ↓
├─ Invalid JSON? → 
│   Use default values (all deltas = 0)
│
├─ Missing fields? → 
│   Fallback to 0 for missing traits
│
└─ Valid → Continue
    ↓
Update Database
    ↓
├─ Database error? → 
│   Log error, return {success: false, error: "..."}
│
└─ Success → Return complete response
    ↓
Response to Client
"""


# ============================================================================
# 7. CONFIGURATION & DEPLOYMENT
# ============================================================================

CONFIG_DEPLOYMENT = """
┌──────────────────────────────────────────────────────────────────┐
│              CONFIGURATION & DEPLOYMENT SETUP                    │
└──────────────────────────────────────────────────────────────────┘

DEVELOPMENT ENVIRONMENT
─────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ Machine 1: Ollama Server                                    │
├─────────────────────────────────────────────────────────────┤
│ • ollama serve (running on port 11434)                      │
│ • Model: mistral (4GB)                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Machine 1 (Same): Backend Server                            │
├─────────────────────────────────────────────────────────────┤
│ • python app/main.py (running on port 8000)                 │
│ • Config:                                                    │
│   - OLLAMA_BASE_URL=http://localhost:11434                  │
│   - OLLAMA_MODEL=mistral                                    │
│   - USE_OLLAMA_FOR_PERSONALITY=True                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Machine 2 (Optional): Frontend                              │
├─────────────────────────────────────────────────────────────┤
│ • npm run dev (running on port 3000)                        │
│ • Connects to: http://localhost:8000                        │
└─────────────────────────────────────────────────────────────┘


PRODUCTION ENVIRONMENT
──────────────────────
┌─────────────────────────────────────────────────────────────┐
│ Production Server 1: Ollama                                 │
├─────────────────────────────────────────────────────────────┤
│ • Ollama Docker container                                   │
│ • Port: 11434 (internal only)                               │
│ • Model: llama2 (7GB, high accuracy)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Production Server 2: Backend API                            │
├─────────────────────────────────────────────────────────────┤
│ • FastAPI on Uvicorn                                        │
│ • Config (from .env):                                       │
│   - OLLAMA_BASE_URL=http://ollama-server:11434              │
│   - OLLAMA_MODEL=llama2                                     │
│   - USE_OLLAMA_FOR_PERSONALITY=True                         │
│ • Port: 8000 (behind reverse proxy)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Production Server 3: Frontend                               │
├─────────────────────────────────────────────────────────────┤
│ • Next.js on Node                                           │
│ • CDN for static assets                                     │
│ • API_URL env: https://api.example.com                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Load Balancer/Reverse Proxy                                 │
├─────────────────────────────────────────────────────────────┤
│ • Nginx or similar                                          │
│ • Routes /api/* to Backend Server 2                         │
│ • Routes /static/* to Frontend Server 3                     │
└─────────────────────────────────────────────────────────────┘
"""


if __name__ == "__main__":
    print("=" * 70)
    print("OLLAMA PERSONALITY ANALYSIS - ARCHITECTURE DIAGRAMS")
    print("=" * 70)
    
    print("\n1. BASIC FLOW")
    print("-" * 70)
    print(BASIC_FLOW)
    
    print("\n2. SYSTEM ARCHITECTURE")
    print("-" * 70)
    print(SYSTEM_ARCHITECTURE)
    
    print("\n3. DATA FLOW")
    print("-" * 70)
    print(DATA_FLOW)
    
    print("\n4. TRAIT EVALUATION MATRIX")
    print("-" * 70)
    print(TRAIT_MATRIX)
    
    print("\n5. INTERACTION SCENARIOS")
    print("-" * 70)
    print(SCENARIOS)
    
    print("\n6. ERROR HANDLING")
    print("-" * 70)
    print(ERROR_HANDLING)
    
    print("\n7. CONFIGURATION & DEPLOYMENT")
    print("-" * 70)
    print(CONFIG_DEPLOYMENT)
