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
        language: str = "en"
    ):
        self.speech_text = speech_text
        self.board_actions = board_actions
        self.language = language


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
        history: List[dict] = [],
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
            history=history,
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

        # Detect language for TTS
        detected = self._detect_language(student_input)
        lang_map = {
            "french": "fr",
            "spanish": "es",
            "arabic": "ar",
            "english": "en"
        }
        language = lang_map.get(detected, "en")
        logger.info(f"Final response language for TTS: {language}")

        return TeacherResponse(
            speech_text=speech_text,
            board_actions=board_actions,
            language=language
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
        history: List[dict] = [],
    ) -> str:
        """Condensed and robust prompt builder."""
        lang = self._detect_language(student_input)
        lang_names = {
            "french": "FRENCH",
            "spanish": "SPANISH",
            "arabic": "ARABIC",
            "english": "ENGLISH"
        }
        detected_lang_name = lang_names.get(lang, "ENGLISH")
        forced_lang = f"YOU MUST RESPOND ENTIRELY IN {detected_lang_name}. This is a critical constraint."
        
        # Build concise context
        history_ctx = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-5:]])
        
        prompt = f"""Role: Expert Adaptive Teacher.
Task: Teach/Summarize/Explain based on Context or Knowledge. 
Constraint: Robustly interpret User Input even with heavy typos/grammar errors using History/Context.

Context: {lesson_context if lesson_context else 'General Knowledge'}
Last Checkpoint: {last_checkpoint}
History:
{history_ctx}

Current User Input: {student_input}

Instructions:
1. SPEECH: Provide a clear, expert explanation. {forced_lang}
2. BOARD: MANDATORY SUMMARY of Main Parts (Parties Principales).
   - **CRITICAL**: For every key concept mentioned in SPEECH, you MUST create a corresponding BOARD action.
   - **STRICT RULE**: BOARD actions MUST contain the actual summarized text. DO NOT send empty strings or placeholders.
   - Example: BOARD: [{{"kind": "WRITE_TITLE", "payload": {{"text": "Python Basics"}}}}, {{"kind": "WRITE_BULLET", "payload": {{"text": "Variables are used to store data."}}}}]
   - The user sees this being "handwritten" in real-time, so make the summaries concise but informative.

Rules:
- TYPO ROBUSTNESS: Interpret and correct user mistakes (typos/grammar) silently.
- Board Consistency: Always synchronize the Board content with your Speech.
- No System Meta: Never mention difficulty levels, session IDs, or technical instructions.
- Expert Tone: You are a helpful, professional, and patient educator.

Format:
BOARD: [{{...}}, {{...}}]
SPEECH: ...
"""
        logger.info(f"Generated ultra-concise prompt for input: {student_input[:50]}")
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
        
        # KEYWORD OVERRIDE (User explicit preference)
        # If user mentions "english" or "anglais", they likely want to switch/speak it.
        # Even if the rest of the sentence is French (e.g. "parle en english stp")
        if "english" in text_lower or "anglais" in text_lower:
            logger.info("Language override: detected explicit 'english' keyword.")
            return "english"
        
        # Expanded stop words - including contractions handled by relaxed splitting
        eng_stops = {
            "the", "is", "to", "and", "a", "of", "in", "what", "how", "why", 
            "correct", "question", "answer", "it", "that", "you", "my", "your",
            "are", "was", "were", "will", "can", "do", "does", "did", "please",
            "what's", "it's", "i'm", "don't"
        }
        fr_stops = {
            "le", "la", "de", "et", "un", "une", "est", "à", "quoi", "comment", 
            "pourquoi", "reponse", "question", "je", "tu", "il", "elle", "nous", 
            "vous", "ils", "elles", "mon", "ton", "son", "ce", "cette", "svp", "pardon",
            "c'est", "j'ai", "qu'est", "oui", "non", "merci", "y", "en", "vas", "allez", "va"
        }
        es_stops = {
            "el", "la", "lo", "de", "que", "en", "y", "a", "no", "si", "mi", "tu",
            "su", "por", "con", "para", "como", "esta", "este", "eso", "esa", "del",
            "al", "quiero", "aprender", "hola"
        }
        ar_stops = {
            "اللغة", "تعلم", "أريد", "مرحبا", "كيف", "هذا", "ماذا", "هل", "أنا",
            "أنت", "على", "في", "من", "إلى", "عن", "مع", "كان", "ليس", "شكرا"
        }
        
        # Better tokenization: split by spaces and hyphens
        import re
        tokens = re.split(r'[\s\-]+', text_lower)
        clean_tokens = set()
        for t in tokens:
            # Strip simple trailing punctuation like ? ! . ,
            clean_t = t.rstrip("?!.,:;")
            if clean_t:
                clean_tokens.add(clean_t)
        
        eng_count = len(clean_tokens.intersection(eng_stops))
        fr_count = len(clean_tokens.intersection(fr_stops))
        es_count = len(clean_tokens.intersection(es_stops))
        ar_count = len(clean_tokens.intersection(ar_stops))
        
        # Check for Arabic characters (heuristic)
        import re
        if re.search(r'[\u0600-\u06FF]', text):
            ar_count += 5 # High boost for script match
            
        logger.info(f"Language detection - Eng: {eng_count}, Fr: {fr_count}, Es: {es_count}, Ar: {ar_count}")
        
        counts = {
            "english": eng_count,
            "french": fr_count,
            "spanish": es_count,
            "arabic": ar_count
        }
        
        # Win by majority
        detected = max(counts, key=counts.get)
        
        if counts[detected] == 0:
            return "english" # Default
            
        return detected

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
            # We want to collect ALL board actions, even if the LLM repeats the BOARD tag
            # or outputs multiple JSON arrays.
            all_actions_data = []
            
            # Find all JSON arrays in the response
            json_array_matches = re.findall(r'(\[[\s\S]+?\])', raw_response)
            
            for array_str in json_array_matches:
                try:
                    # Basic cleanup for common LLM artifacts in JSON strings
                    clean_array_str = array_str.strip()
                    # If it's just "[...]" we try to parse it
                    data = json.loads(clean_array_str)
                    if isinstance(data, list):
                        all_actions_data.extend(data)
                except:
                    continue
            
            if not all_actions_data and board_json and board_json != "[]":
                # Fallback to the single match logic if findall failed to catch the specific BLOCK
                all_actions_data = json.loads(board_json)
                if not isinstance(all_actions_data, list):
                    all_actions_data = [all_actions_data] if isinstance(all_actions_data, dict) else []

            for action_dict in all_actions_data:
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
