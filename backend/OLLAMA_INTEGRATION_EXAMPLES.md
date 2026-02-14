"""
Integration Examples: How to use Ollama Personality Analysis in Different Scenarios

This file shows example code for integrating the personality analysis
into various parts of your application.
"""

# ============================================================================
# 1. INTEGRATION WITH AI TEACHER (ai_teacher.py)
# ============================================================================

example_ai_teacher_integration = """
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.services.ai_service import ai_service
from app.services.personality_service import personality_service

router = APIRouter()

@router.post("/ask-teacher")
async def ask_teacher(message: str, db: Session = Depends(get_db)):
    '''
    Ask the AI teacher a question, and also analyze it for personality traits
    '''
    user = db.query(User).first()
    if not user:
        return {"error": "User not found"}
    
    # Get teacher response
    teacher_response = await ai_service.get_teacher_response(message)
    
    # Analyze user message for personality traits (async, non-blocking)
    personality_result = await personality_service.analyze_and_update_personality(
        db=db,
        user=user,
        user_prompt=message
    )
    
    return {
        "teacher_response": teacher_response,
        "personality_update": personality_result if personality_result.get("success") else None
    }
"""


# ============================================================================
# 2. INTEGRATION WITH QUIZ SYSTEM (quizzes.py)
# ============================================================================

example_quiz_integration = """
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models import User
from app.services.personality_service import personality_service

router = APIRouter()

class QuizAnswerRequest(BaseModel):
    question_id: str
    answer: str

@router.post("/submit-answer")
async def submit_quiz_answer(
    answer_request: QuizAnswerRequest,
    db: Session = Depends(get_db)
):
    '''
    Submit a quiz answer and analyze it for personality insights
    '''
    user = db.query(User).first()
    if not user:
        return {"error": "User not found"}
    
    # Process quiz answer normally
    # ... your existing quiz logic ...
    
    # Analyze the answer text for personality traits
    personality_result = await personality_service.analyze_and_update_personality(
        db=db,
        user=user,
        user_prompt=answer_request.answer  # The answer becomes input for personality analysis
    )
    
    return {
        "message": "Answer submitted",
        "personality_insights": personality_result if personality_result.get("success") else {}
    }
"""


# ============================================================================
# 3. INTEGRATION WITH PITCH PRACTICE (pitch.py)
# ============================================================================

example_pitch_integration = """
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.services.personality_service import personality_service

router = APIRouter()

@router.post("/submit-pitch")
async def submit_pitch_practice(
    pitch_text: str,
    db: Session = Depends(get_db)
):
    '''
    Submit pitch practice and get personality feedback
    - Analyzes for: Communication, Confidence, Clarity
    '''
    user = db.query(User).first()
    if not user:
        return {"error": "User not found"}
    
    # Analyze the pitch for personality traits
    # This will specifically evaluate communication and confidence
    personality_result = await personality_service.analyze_and_update_personality(
        db=db,
        user=user,
        user_prompt=pitch_text
    )
    
    # Extract specific traits relevant to pitching
    pitch_traits = {
        "Communication": personality_result.get("traits_delta", {}).get("Communication", 0),
        "Confidence": personality_result.get("traits_delta", {}).get("Confidence", 0),
    }
    
    return {
        "pitch_feedback": "Your pitch was well-structured and confident",
        "personality_update": pitch_traits,
        "updated_profile": personality_result.get("updated_profile")
    }
"""


# ============================================================================
# 4. INTEGRATION WITH COLLABORATION (collaboration.py)
# ============================================================================

example_collaboration_integration = """
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models import User
from app.services.personality_service import personality_service

router = APIRouter()

class CollaborationEventRequest(BaseModel):
    interaction_type: str  # "help_offered", "feedback_given", "conflict_resolved"
    description: str

@router.post("/log-collaboration")
async def log_collaboration_event(
    event: CollaborationEventRequest,
    db: Session = Depends(get_db)
):
    '''
    Log a collaboration event and measure personality impact
    - help_offered: Increases Empathy, Collaboration
    - feedback_given: Increases Communication, Confidence
    - conflict_resolved: Increases Empathy, Conflict Res, Communication
    '''
    user = db.query(User).first()
    if not user:
        return {"error": "User not found"}
    
    # Analyze the collaboration event description
    personality_result = await personality_service.analyze_and_update_personality(
        db=db,
        user=user,
        user_prompt=event.description
    )
    
    return {
        "event_logged": True,
        "event_type": event.interaction_type,
        "personality_impact": personality_result.get("traits_delta")
    }
"""


# ============================================================================
# 5. MIDDLEWARE INTEGRATION (Analyze all prompts automatically)
# ============================================================================

example_middleware_integration = """
from fastapi import Request
from sqlalchemy.orm import Session
from app.services.personality_service import personality_service
from app.db.session import get_db

async def personality_analysis_middleware(request: Request, call_next):
    '''
    Middleware to automatically analyze certain types of requests
    for personality traits
    '''
    response = await call_next(request)
    
    # Only analyze certain endpoints
    if should_analyze_endpoint(request.url.path):
        try:
            # Get the request body
            body = await request.body()
            
            # Extract prompt/message from request
            if body:
                data = json.loads(body)
                user_prompt = data.get("message") or data.get("prompt") or data.get("answer")
                
                if user_prompt:
                    # Analyze in background (non-blocking)
                    db = next(get_db())
                    user = db.query(User).first()
                    
                    if user:
                        await personality_service.analyze_and_update_personality(
                            db=db,
                            user=user,
                            user_prompt=user_prompt
                        )
        except Exception as e:
            logger.error(f"Error in personality middleware: {str(e)}")
    
    return response

def should_analyze_endpoint(path: str) -> bool:
    '''Determine which endpoints should trigger personality analysis'''
    analyze_paths = [
        "/api/v1/ai-teacher/",
        "/api/v1/quizzes/submit",
        "/api/v1/pitch/submit",
        "/api/v1/collaboration/"
    ]
    return any(path.startswith(p) for p in analyze_paths)
"""


# ============================================================================
# 6. FRONTEND REACT HOOK (usePersonalityAnalysis)
# ============================================================================

example_react_hook = """
import { useState } from 'react';
import { useApi } from './useApi';

interface PersonalityUpdate {
  traits_delta: Record<string, number>;
  updated_profile: Record<string, number>;
  analysis: string;
}

export function usePersonalityAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const analyzePrompt = async (prompt: string): Promise<PersonalityUpdate | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/personality/analyze-with-ollama', {
        prompt,
      });

      if (!response.success) {
        throw new Error(response.error || 'Analysis failed');
      }

      return {
        traits_delta: response.traits_delta,
        updated_profile: response.updated_profile,
        analysis: response.analysis,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    analyzePrompt,
    loading,
    error,
  };
}

// Usage Example:
export function QuizComponent() {
  const { analyzePrompt, loading } = usePersonalityAnalysis();

  const handleSubmitAnswer = async (answer: string) => {
    const result = await analyzePrompt(answer);
    
    if (result) {
      console.log('Personality update:', result.traits_delta);
      showPersonalityFeedback(result);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmitAnswer(answerText);
    }}>
      <textarea placeholder="Your answer..." value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
      <button disabled={loading}>
        {loading ? 'Analyzing...' : 'Submit Answer'}
      </button>
    </form>
  );
}
"""


# ============================================================================
# 7. BACKGROUND TASK (Analyze interactions in the background)
# ============================================================================

example_background_task = """
from celery import shared_task
from app.services.personality_service import personality_service
from app.models import User
from app.db.session import get_db

@shared_task
def analyze_personality_async(user_id: str, user_prompt: str):
    '''
    Background task to analyze personality traits without blocking the request
    '''
    db = next(get_db())
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return {"error": "User not found"}
    
    try:
        import asyncio
        result = asyncio.run(
            personality_service.analyze_and_update_personality(
                db=db,
                user=user,
                user_prompt=user_prompt
            )
        )
        return result
    except Exception as e:
        logger.error(f"Background personality analysis failed: {str(e)}")
        return {"error": str(e)}

# Usage in an endpoint:
@router.post("/submit-answer")
async def submit_answer(answer: str, user_id: str):
    # Save answer immediately
    # ... save logic ...
    
    # Analyze personality in background (non-blocking)
    analyze_personality_async.delay(user_id, answer)
    
    return {"message": "Answer submitted. Personality analysis in progress..."}
"""


# ============================================================================
# 8. BATCH ANALYSIS (Analyze multiple prompts in one call)
# ============================================================================

example_batch_analysis = """
from typing import List
from app.services.personality_service import personality_service

async def analyze_multiple_prompts(
    db: Session,
    user: User,
    prompts: List[str]
) -> dict:
    '''
    Analyze multiple prompts and accumulate trait changes
    Useful for batch processing or historical analysis
    '''
    total_traits_delta = {trait: 0 for trait in personality_service.PERSONALITY_TRAITS}
    
    for prompt in prompts:
        result = await personality_service.analyze_and_update_personality(
            db=db,
            user=user,
            user_prompt=prompt
        )
        
        if result.get("success"):
            for trait, delta in result.get("traits_delta", {}).items():
                total_traits_delta[trait] += delta
    
    return {
        "prompts_analyzed": len(prompts),
        "total_traits_delta": total_traits_delta,
        "final_profile": user.personality_profile
    }

# Usage:
# results = await analyze_multiple_prompts(
#     db, 
#     user, 
#     [prompt1, prompt2, prompt3, ...]
# )
"""


# ============================================================================
# 9. PERIODIC PERSONALITY REFRESH (Recalculate based on historical data)
# ============================================================================

example_periodic_refresh = """
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.models import User

def periodic_personality_analysis(db: Session):
    '''
    Scheduled task to periodically re-analyze user history
    and update personality profiles
    '''
    users = db.query(User).all()
    
    for user in users:
        # Get historical interactions
        # This would depend on your data model
        historical_prompts = get_user_historical_data(user.id)
        
        if historical_prompts:
            # Analyze and update
            result = analyze_multiple_prompts(db, user, historical_prompts)
            logger.info(f"Updated personality for user {user.id}: {result}")

# Setup scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    periodic_personality_analysis,
    'interval',
    hours=24,  # Run daily
    args=[db]
)
scheduler.start()
"""


if __name__ == "__main__":
    print("Integration Examples for Ollama Personality Analysis")
    print("=" * 70)
    print("\nRefer to this file for examples of how to integrate the")
    print("personality analysis into different parts of your application.")
    print("\nExamples include:")
    print("  1. AI Teacher integration")
    print("  2. Quiz system integration")
    print("  3. Pitch practice integration")
    print("  4. Collaboration tracking")
    print("  5. Middleware for automatic analysis")
    print("  6. React hook for frontend")
    print("  7. Background tasks with Celery")
    print("  8. Batch analysis of multiple prompts")
    print("  9. Periodic personality refresh")
