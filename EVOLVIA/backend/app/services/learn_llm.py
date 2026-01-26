"""
Learn LLM service - structured LLM calls for teacher responses.

This is the single point where we call the Llama provider and transform
responses into structured output (speech + board actions).

Supports multiple LLM providers:
- google (Gemini API)
- llama (via Ollama or compatible endpoint)
- token_factory (ESPRIT Token Factory API)
"""

import os
import asyncio
import logging
from typing import Optional, List
import aiohttp
import json
from app.schemas.learn import BoardAction, BoardActionKind, TeacherTurn
from app.services.observability.opik_client import opik_client

logger = logging.getLogger(__name__)


class TeacherResponse:
    """Structured response from teacher LLM"""

    def __init__(
        self,
        speech_text: str,
        board_actions: List[BoardAction],
    ):
        self.speech_text = speech_text
        self.board_actions = board_actions


class LearnLLMService:
    """
    Service that manages LLM calls for teacher responses.
    
    Responsibilities:
    1. Build prompt from lesson context + student input + history
    2. Call Llama provider (or Gemini fallback)
    3. Parse response into structured format
    4. Log trace via Opik for observability
    """

    def __init__(self, llm_provider: str = "llama", enable_tracing: bool = True):
        """
        Args:
            llm_provider: "llama" or "gemini"
            enable_tracing: Whether to log traces to Opik
        """
        self.llm_provider = llm_provider
        self.enable_tracing = enable_tracing

    async def generate_teacher_response(
        self,
        session_id: str,
        step_id: int,
        lesson_context: str,
        student_input: str,
        last_checkpoint: Optional[str] = None,
        difficulty_level: int = 1,
        interruption_count: int = 0,
        has_uploaded_file: bool = False,
    ) -> TeacherResponse:
        """
        Generate a structured teacher response.
        
        Args:
            session_id: Session identifier
            step_id: Current step in lesson
            lesson_context: The lesson material
            student_input: What student asked/said
            last_checkpoint: Previous checkpoint summary (for context)
            difficulty_level: 1-5 scale (lower = simpler explanations)
            interruption_count: Times student interrupted (context for teacher)
            
        Returns:
            TeacherResponse with speech_text and board_actions
        """

        # Check if question is covered in uploaded file
        question_covered = False
        if has_uploaded_file and lesson_context:
            question_covered = self._check_question_coverage(student_input, lesson_context)
        
        # Build the prompt
        prompt = self._build_prompt(
            lesson_context=lesson_context,
            student_input=student_input,
            last_checkpoint=last_checkpoint,
            difficulty_level=difficulty_level,
            interruption_count=interruption_count,
            has_uploaded_file=has_uploaded_file,
            question_covered=question_covered,
        )

        # Call LLM (mock for now - replace with real provider)
        # Store student_input for mock fallback
        self._current_student_input = student_input
        raw_response = await self._call_llm(prompt, student_input)

        # Parse into structured format
        speech_text, board_actions = self._parse_response(raw_response)
        
        # If in exam mode, double check we have a quiz action if it looks like a question
        # (This is a safety heuristic, likely handled by prompt engineering)

        # Log to Opik if enabled
        if self.enable_tracing:
            turn = TeacherTurn(
                session_id=session_id,
                step_id=step_id,
                prompt_input=prompt,
                lesson_context=lesson_context,
                student_input=student_input,
                last_checkpoint=last_checkpoint,
                speech_text=speech_text,
                board_actions=board_actions,
                model_name=self.llm_provider,
                interruption_count=interruption_count,
                difficulty_level=difficulty_level,
            )
            opik_client.log_teacher_turn(turn)

        return TeacherResponse(
            speech_text=speech_text,
            board_actions=board_actions,
        )

    def _build_prompt(
        self,
        lesson_context: str,
        student_input: str,
        last_checkpoint: Optional[str],
        difficulty_level: int,
        interruption_count: int,
        has_uploaded_file: bool = False,
        question_covered: bool = False,
    ) -> str:
        """
        Build the prompt for the LLM.
        
        Incorporates lesson material, student input, history, and difficulty.
        """
        difficulty_guidance = {
            1: "very simple and concrete examples",
            2: "clear examples with basic analogies",
            3: "balanced explanation",
            4: "more advanced concepts",
        }

        # CRITICAL FIX: If this is a QUIZ RESULT, we must wipe the history (context/checkpoint)
        # to prevent "language pollution". If the previous turn was in French, the checkpoint is in French.
        # If we include it, the LLM catches the French scent and ignores the English input.
        # By removing it, we force the LLM to look ONLY at the current input (the quiz result).
        
        forced_language_instruction = ""
        
        if "[QUIZ_RESULT" in student_input:
            lesson_context = ""
            last_checkpoint = ""
            
            # PYTHON-SIDE LANGUAGE DETECTION (The "Nuclear Option" Phase 2)
            # We don't trust the LLM to detect the language anymore. We do it ourselves.
            detected_lang = self._detect_language(student_input)
            
            if detected_lang == "english":
                forced_language_instruction = "SYSTEM OVERRIDE: YOU MUST SPEAK ENGLISH. IGNORE ALL OTHER LANGUAGE HINTS."
            elif detected_lang == "french":
                forced_language_instruction = "SYSTEM OVERRIDE: YOU MUST SPEAK FRENCH. IGNORE ALL OTHER LANGUAGE HINTS."
            
            logger.info(f"Detected language for quiz result: {detected_lang}")

        guidance = difficulty_guidance.get(difficulty_level, "balanced explanation")

        checkpoint_text = (
            f"Previous checkpoint: {last_checkpoint}\n" if last_checkpoint else ""
        )

        interrupt_note = (
            f"\nNote: Student has interrupted you while you were teaching. "
            f"If the input starts with [INTERRUPTION], please acknowledge it naturally "
            f"(e.g., 'Oh, interesting point!' or 'Good question!') but DON'T spend too much time apologizing. "
            f"Address their specific point directly and update the board key points accordingly.\n"
            if interruption_count > 0
            else ""
        )



        goal_text = f"Summarize key points after discussion and explain using {guidance}.{interrupt_note}"

        # Override goal if this is a quiz result
        if "[QUIZ_RESULT: INCORRECT]" in student_input:
            goal_text = (
                f"The user just answered a quiz INCORRECTLY. "
                f"INPUT_CONTEXT: {student_input} "
                f"1. Acknowledge the effort positively (e.g., 'Great attempt!', 'You're learning well!'). "
                f"2. You MUST explicitly state the correct answer text provided in the INPUT_CONTEXT (e.g., 'The correct answer is [Answer from input] because...'). Do not just say 'Option A'. "
                f"3. Explain that you are adjusting to Difficulty Level {difficulty_level}, which focuses on '{guidance}'. "
                f"4. Tell the user clearly what this level implies. "
                f"5. **LANGUAGE**: Detect the language of INPUT_CONTEXT and use ONLY that language."
            )
        elif "[QUIZ_RESULT: CORRECT]" in student_input:
            goal_text = (
                f"The user answered the quiz CORRECTLY. "
                f"INPUT_CONTEXT: {student_input} "
                f"1. Congratulate them warmly. "
                f"2. Briefly summarize why the answer ({student_input}) was correct. "
                f"3. Explain that you are adjusting to Difficulty Level {difficulty_level}, which allows us to explore '{guidance}'. "
                f"4. Tell the user clearly what this level implies. "
                f"5. **LANGUAGE**: Detect the language of INPUT_CONTEXT and use ONLY that language."
            )
        
        # Override goal if user explicitly asks for a quiz
        elif "quiz" in student_input.lower():
            # If asking for quiz in normal mode, we can say "Let's check your progress bar first!" or just give a normal quiz.
            # For now, keep existing behavior but maybe slightly shorter.
            goal_text = "The user asks for a quiz. Provide a 'SHOW_QUIZ' action. Brief speech."

        prompt = f"""You are a patient AI teacher. Generate a response with two parts:
1. SPEECH: A spoken explanation. **IMPORTANT: ADAPT TO THE USER'S LANGUAGE.**
   {forced_language_instruction}
   - If the user speaks French, respond in French.
   - If the user speaks English, respond in English.
   - **SYSTEM MESSAGES ([QUIZ_RESULT...])**: COMPLETE PRIORITY on the language of the **CONTENT** (Question/Answer) inside the input.
     - **CRITICAL**: Ignore the "[QUIZ_RESULT...]" tag itself. Look at the "Question:" and "Answer:" text.
     - If the Question/Answer text is English -> YOU MUST RESPOND IN ENGLISH.
     - If the Question/Answer text is French -> YOU MUST RESPOND IN FRENCH.
     - Never mix languages. Match the user's content language exactly.
   - Be encouraging and clear. 
   - If user interrupted, address their point naturally.
   
   - **CRITICAL**: The language of the response is determined **SOLEY** by the **Current Student Input** below.
   - **IGNORE** the language of the "Previous checkpoint" or "Lesson context". They are history.
   - If "Current Student Input" is English -> Speak English.
   - If "Current Student Input" is French -> Speak French.

2. BOARD: Up to 5 actions to visualize your explanation. Focus on summarizing KEY POINTS.
   {forced_language_instruction}
   - **CRITICAL:** The board content MUST be in the SAME LANGUAGE as your SPEECH.
   - If you speak French, write board text in French.
   - If you speak English, write board text in English.
   - Do NOT mix languages (e.g. English speech with French board).
   - **REQUIREMENT**: You MUST generate at least 2-3 `WRITE_BULLET` actions to summarize the key points of your speech.
   - `WRITE_TITLE` alone is NOT enough.
   - Example Correct Board: [TITLE: "Big Data"], [BULLET: "Large volume"], [BULLET: "High velocity"], [BULLET: "Varied types"]

2.1 Board Action Categories:
- WRITE_TITLE: Key topic or heading.
- WRITE_BULLET: Summary point or "Key Takeaway".
- WRITE_STEP: Sequence or logic.
- CLEAR: Clear board for new major topic.
- HIGHLIGHT: Emphasize critical terms.
- **SHOW_QUIZ**: Ask a multiple choice question to check understanding.
  - Payload: {{"question": "...", "options": ["A", "B", "C"], "correct_index": 0}}
  - Use this ONLY when explicitly requested or suggested by the goal.

Lesson context (Background info - IGNORE LANGUAGE HERE):
{lesson_context}

{checkpoint_text}

{f"[IMPORTANT] The user has uploaded a course file. Use the content above to answer their question. "
f"If the question is NOT covered in the uploaded file, answer from your general knowledge "
f"but WARN the user: 'Note: This topic is not covered in your uploaded course file. "
f"I'm answering from general knowledge.'" if has_uploaded_file and not question_covered and lesson_context else ""}
{f"[IMPORTANT] The user's question IS covered in the uploaded course file. "
f"Answer using the file content as the primary source." if has_uploaded_file and question_covered and lesson_context else ""}

=== CURRENT STUDENT INPUT (DETERMINES LANGUAGE) ===
{student_input}
===================================================

Goal: {goal_text}

Format:
BOARD: [ {{"kind": "WRITE_TITLE", "payload": {{"text": "Topic"}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "Point 1", "position": 1}}}} ]
SPEECH: ...
"""
        logger.info(f"Generated prompt: {prompt}")
        return prompt

    def _check_question_coverage(self, question: str, file_content: str) -> bool:
        """
        Check if the question is covered in the uploaded file content.
        
        Uses simple keyword matching and semantic similarity heuristics.
        Returns True if question appears to be covered, False otherwise.
        """
        if not question or not file_content:
            return False
        
        # Normalize text for comparison
        question_lower = question.lower()
        file_content_lower = file_content.lower()
        
        # Extract key terms from question (remove common words)
        common_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'can', 'what', 'when', 'where', 'who',
            'why', 'how', 'which', 'this', 'that', 'these', 'those', 'i', 'you',
            'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou',
            'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'a', 'as',
            'qu', 'que', 'qui', 'quoi', 'comment', 'pourquoi', 'où', 'quand'
        }
        
        # Extract meaningful words from question
        question_words = set(word.lower() for word in question.split() 
                           if len(word) > 3 and word.lower() not in common_words)
        
        if not question_words:
            # If no meaningful words, check if question phrases appear
            # Check for question patterns
            question_phrases = [
                phrase.strip() for phrase in question_lower.split('?')[0].split()
                if len(phrase.strip()) > 2
            ]
            if question_phrases:
                # Check if any significant phrase appears in file
                for phrase in question_phrases[-3:]:  # Check last 3 words
                    if phrase in file_content_lower and len(phrase) > 4:
                        return True
            return False
        
        # Count how many question words appear in file content
        matches = sum(1 for word in question_words if word in file_content_lower)
        coverage_ratio = matches / len(question_words) if question_words else 0
        
        # Consider covered if at least 30% of key terms match
        # or if any key term appears multiple times (indicating relevance)
        is_covered = coverage_ratio >= 0.3
        
        # Additional check: if question contains specific terms that appear in file
        if not is_covered:
            # Check for longer phrases (2-3 word combinations)
            question_parts = question_lower.split()
            for i in range(len(question_parts) - 1):
                phrase = f"{question_parts[i]} {question_parts[i+1]}"
                if phrase in file_content_lower and len(phrase) > 6:
                    is_covered = True
                    break
        
        logger.info(f"Question coverage check: {coverage_ratio:.2%} match, covered={is_covered}")
        return is_covered

    def _detect_language(self, text: str) -> str:
        """
        Simple deterministic stop-word language detection.
        Returns 'english' or 'french'. Defaults to 'english' if ambiguous.
        """
        text_lower = text.lower()
        
        # Expanded stop words
        eng_stops = {
            "the", "is", "to", "and", "a", "of", "in", "what", "how", "why", 
            "correct", "question", "answer", "it", "that", "you", "my", "your",
            "are", "was", "were", "will", "can", "do", "does", "did"
        }
        fr_stops = {
            "le", "la", "de", "et", "un", "une", "est", "à", "quoi", "comment", 
            "pourquoi", "reponse", "question", "je", "tu", "il", "elle", "nous", 
            "vous", "ils", "elles", "mon", "ton", "son", "ce", "cette"
        }
        
        words = set(text_lower.split())
        
        eng_count = len(words.intersection(eng_stops))
        fr_count = len(words.intersection(fr_stops))
        
        logger.info(f"Language detection - Eng: {eng_count}, Fr: {fr_count}")
        
        # STRONG BIAS: If English count is non-zero and >= French, pick English.
        # Even if French is higher but close, maybe favor English?
        # For now, strict majority, but tie = English.
        if fr_count > eng_count:
            return "french"
        else:
            # Default to English for safety (matches user preference "je veux qu'il repond juste in english")
            return "english"

    async def _call_llm(self, prompt: str, student_input: str = "") -> str:
        """
        Call the LLM provider (Llama, Gemini, or Token Factory).
        Falls back to mock if provider is unavailable.
        """
        try:
            if self.llm_provider == "google":
                return await self._call_gemini(prompt)
            elif self.llm_provider == "llama":
                return await self._call_llama(prompt)
            elif self.llm_provider == "token_factory":
                return await self._call_token_factory(prompt)
            else:
                return self._mock_response(student_input)
        except Exception as e:
            print(f"LLM provider {self.llm_provider} failed: {e}. Using mock.")
            return self._mock_response(student_input)

    async def _call_gemini(self, prompt: str) -> str:
        """Call Google Gemini API"""
        try:
            import google.generativeai as genai
            
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not set")
            
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            response = model.generate_content(prompt)
            return response.text
        except ImportError:
            raise ImportError("google-generativeai not installed")

    async def _call_llama(self, prompt: str) -> str:
        """Call Llama via Ollama or compatible endpoint"""
        try:
            # Try local Ollama first, then fallback to other endpoints
            ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
            model_name = os.getenv("LLAMA_MODEL", "llama2")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False,
                    },
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("response", "")
                    else:
                        raise Exception(f"Ollama error: {resp.status}")
        except Exception as e:
            raise Exception(f"Llama call failed: {e}")

    async def _call_token_factory(self, prompt: str) -> str:
        """
        Call ESPRIT Token Factory API using OpenAI-compatible client
        
        API Key: sk-e376096028c847389e18f6d1f650be93
        Endpoint: https://tokenfactory.esprit.tn/api
        Model: hosted_vllm/Llama-3.1-70B-Instruct
        """
        try:
            # Import here to avoid startup issues
            import httpx
            from openai import OpenAI
            
            api_key = os.getenv("TOKEN_FACTORY_KEY", "sk-e376096028c847389e18f6d1f650be93")
            base_url = os.getenv("TOKEN_FACTORY_URL", "https://tokenfactory.esprit.tn/api")
            model = os.getenv("TOKEN_FACTORY_MODEL", "hosted_vllm/Llama-3.1-70B-Instruct")
            
            # Create HTTP client with SSL verification disabled
            http_client = httpx.Client(verify=False)
            
            # Create OpenAI client with TokenFactory endpoint
            client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                http_client=http_client
            )
            
            # Call the model
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a patient AI teacher. Detect the language of the user's input and respond in that SAME language (English->English, French->French). Generate responses with exactly two parts: BOARD and SPEECH. Generate BOARD ACTIONS FIRST. Follow the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=4096,
                temperature=0.7,
            )
            
            return response.choices[0].message.content
            
        except ImportError as e:
            logger.warning(f"TokenFactory dependencies not available: {e}. Using mock response.")
            return self._mock_response(getattr(self, '_current_student_input', ''))
        except Exception as e:
            logger.error(f"TokenFactory call failed: {str(e)}. Using mock response.")
            return self._mock_response(getattr(self, '_current_student_input', ''))

    def _mock_response(self, student_input: str = "") -> str:
        """
        Fallback mock response for development/testing.
        Now contextual based on student input.
        """
        # Make the mock response contextual
        if student_input:
            clean_input = student_input.replace("[INTERRUPTION - new question] ", "").replace("[FOLLOW-UP QUESTION after pause] ", "")
            return f"""SPEECH: Great question about '{clean_input}'! Let me explain this to you. This is a mock response because the LLM provider is currently unavailable. In a real session, I would give you a detailed explanation about your topic. For now, just know that I received your message and I'm here to help you learn!
BOARD: [{{"kind": "WRITE_TITLE", "payload": {{"text": "About: {clean_input[:30]}..."}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "Your question was received", "position": 1}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "LLM is in mock mode", "position": 2}}}}]"""
        
        return """SPEECH: Let me break this down for you. Think of it like building blocks—each piece stacks on the other. This helps you understand the foundation before we move to more complex ideas.
BOARD: [{{"kind": "WRITE_TITLE", "payload": {{"text": "Key Concept"}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "First part: the foundation", "position": 1}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "Second part: builds on that", "position": 2}}}}]"""

    def _parse_response(self, raw_response: str) -> tuple[str, List[BoardAction]]:
        """
        Parse raw LLM response into speech + board actions.

        Expected format:
            SPEECH: ...
            BOARD: [...]
        """
        import json
        import re

        speech_text = ""
        board_json = "[]"

        # Try to find BOARD first now
        board_match = re.search(r'BOARD:\s*(\[.+?\])\s*(?:SPEECH:|$)', raw_response, re.DOTALL | re.IGNORECASE)
        if board_match:
            board_json = board_match.group(1).strip()
        else:
            # Fallback: Look for any JSON array, picking the largest one
            json_matches = re.findall(r'(\[[\s\S]+\])', raw_response)
            if json_matches:
                 # Find the match with the most nested brackets or just longest
                 board_json = max(json_matches, key=len)

        # Attempt to repair truncated JSON (simple fix)
        if board_json and not board_json.endswith(']'):
            # If it looks like it ended inside an object, try to close it
            if board_json.strip().endswith('}'): 
                board_json += ']' 
            elif board_json.strip().endswith('"'):
                board_json += '}]'
            else:
                 # Last resort: try to close generic structure
                 board_json += '}]'

        # Parse SPEECH
        speech_match = re.search(r'SPEECH:\s*((?:.|\n)+)', raw_response, re.DOTALL | re.IGNORECASE)
        if speech_match:
             speech_text = speech_match.group(1).strip()
        
        # Cleanup speech if it captured trailing brackets/artifacts
        if "BOARD:" in speech_text: # Should not happen if BOARD is first, but robust check
             speech_text = speech_text.split("BOARD:")[0].strip()

        # Clean up speech text (remove quotes if present)
        if speech_text.startswith('"') and speech_text.endswith('"'):
            speech_text = speech_text[1:-1]
            
        # Fallback Speech if empty (e.g. truncated)
        if not speech_text and board_json and len(board_json) > 10:
             speech_text = "I've outlined the key points on the board. Let's take a look."

        # Parse board actions
        board_actions = []
        try:
            board_data = json.loads(board_json)
            if isinstance(board_data, list):
                for action_dict in board_data:
                    # Handle different action formats
                    if "action" in action_dict:
                        kind = action_dict.get("action", "WRITE_BULLET")
                        payload = {"text": action_dict.get("text", "")}
                    else:
                        kind = action_dict.get("kind", "WRITE_BULLET")
                        payload = action_dict.get("payload", {})

                    action = BoardAction(
                        kind=BoardActionKind(kind.upper()),
                        payload=payload,
                    )
                    board_actions.append(action)
        except (json.JSONDecodeError, ValueError):
            # Fallback for "broken" format like [WRITE_TITLE: text] seen in logs
            # Matches: WRITE_TITLE: Some text up to comma or bracket
            broken_matches = re.findall(r'(WRITE_[A-Z_]+|CLEAR|HIGHLIGHT|SHOW_QUIZ):\s*([^,\]\}]+)', board_json)
            for kind_str, text in broken_matches:
                try:
                    kind = BoardActionKind(kind_str.strip().upper())
                    # Note: Payload for SHOW_QUIZ via this fallback will be messy/incomplete
                    # But better than nothing.
                    board_actions.append(BoardAction(kind=kind, payload={"text": text.strip()}))
                except ValueError:
                    continue
            
            if not board_actions:
                 logger.warning(f"Failed to parse board actions from: {board_json}")

        return speech_text, board_actions
