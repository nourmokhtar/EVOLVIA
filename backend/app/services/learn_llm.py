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
        session_language: Optional[str] = None,
    ) -> TeacherResponse:
        """
        Generate a structured teacher response.
        
        Args:
            session_language: The persistent language of the session (e.g. 'french', 'english').
        """

        # Check if question is covered in uploaded file
        question_covered = False
        if has_uploaded_file and lesson_context:
            question_covered = self._check_question_coverage(student_input, lesson_context)
        
        # Detect language with session context (sticky behavior)
        detected_language = self._detect_language(student_input, context_language=session_language)
        
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
            target_language=detected_language,
        )

        # Call LLM
        self._current_student_input = student_input
        raw_response = await self._call_llm(prompt, student_input)

        # Parse into structured format
        speech_text, board_actions = self._parse_response(raw_response)
        
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

        # Map to ISO code for TTS
        lang_map = {
            "french": "fr",
            "spanish": "es",
            "arabic": "ar",
            "english": "en"
        }
        language_iso = lang_map.get(detected_language, "en")
        logger.info(f"Final response language: {detected_language} (ISO: {language_iso})")

        return TeacherResponse(
            speech_text=speech_text,
            board_actions=board_actions,
            language=language_iso
        )

    async def generate_flashcards_response(
        self,
        session_id: str,
        lesson_context: str,
        difficulty_level: int = 1,
        history: List[dict] = [],
        session_language: Optional[str] = "english",
    ) -> TeacherResponse:
        """
        Generate exactly 10 flashcards (concept/definition) based on context.
        """
        # Detect language (sticky)
        detected_language = session_language if session_language else "english"

        # Build flashcard prompt
        prompt = self._build_flashcard_prompt(
            lesson_context=lesson_context,
            difficulty_level=difficulty_level,
            history=history,
            target_language=detected_language
        )

        # Call LLM
        raw_response = await self._call_llm(prompt)

        # Parse into structured format
        speech_text, board_actions = self._parse_response(raw_response)

        # Map to ISO code for TTS
        lang_map = {
            "french": "fr",
            "spanish": "es",
            "arabic": "ar",
            "english": "en"
        }
        language_iso = lang_map.get(detected_language, "en")

        return TeacherResponse(
            speech_text=speech_text,
            board_actions=board_actions,
            language=language_iso
        )

    async def generate_quiz_response(
        self,
        session_id: str,
        lesson_context: str,
        student_input: str,
        difficulty_level: int = 1,
        history: List[dict] = [],
        session_language: Optional[str] = "english",
    ) -> TeacherResponse:
        """
        Generate a strictly formatted 10-question quiz.
        """
        prompt = self._build_quiz_prompt(
            lesson_context=lesson_context,
            difficulty_level=difficulty_level,
            history=history,
            target_language=session_language or "english"
        )

        # Call LLM
        raw_response = await self._call_llm(prompt, student_input="[QUIZ GENERATION]")
        
        # Parse - we expect a JSON payload for the quiz
        # We reuse _parse_response but we might need to be more aggressive about finding the JSON
        speech_text, board_actions = self._parse_response(raw_response)
        
        # If no quiz action found, try to force it if raw_response looks like JSON
        has_quiz = any(a.kind == BoardActionKind.SHOW_QUIZ for a in board_actions)
        if not has_quiz:
            # Fallback: try to find the JSON array/object in the raw text and wrap it
            import re
            import json
            json_match = re.search(r'(\{[\s\n]*"questions"[\s\n]*:[\s\n]*\[[\s\S]+?\][\s\n]*\})', raw_response)
            if json_match:
                try:
                    quiz_payload = json.loads(json_match.group(1))
                    board_actions.append(BoardAction(kind=BoardActionKind.SHOW_QUIZ, payload=quiz_payload))
                except:
                    pass

        # If still no speech, add a default one or overwrite with the exact phrase requested
        if not speech_text or len(board_actions) > 0:
            speech_text = "It's time to test your knowledge"

        return TeacherResponse(
            speech_text=speech_text,
            board_actions=board_actions,
            language="en" # Quiz is always in English
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
        target_language: str = "english",
    ) -> str:
        """Condensed and robust prompt builder."""
        
        lang_names = {
            "french": "FRENCH",
            "spanish": "SPANISH",
            "arabic": "ARABIC",
            "english": "ENGLISH"
        }
        detected_lang_name = lang_names.get(target_language, "ENGLISH")
        forced_lang = f"YOU MUST RESPOND ENTIRELY IN {detected_lang_name}. This is a critical constraint."
        
        # Build concise context
        history_ctx = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-5:]])
        
        # SPECIAL CASE: Audio Overview
        audio_overview_instructions = ""
        if "[AUDIO_OVERVIEW]" in student_input:
            audio_overview_instructions = """
    - **PERSONA**: Professional Podcast Host. Engaging, clear, and insightful.
    - **STYLE**: Narrative podcast (storytelling mode). Use conversational transitions and direct listener engagement (e.g., "Welcome to this audio overview...", "One key thing that really jumps out...", "To wrap things up...").
    - **NARRATIVE**: Don't just list facts; tell the story of the document. Address the listener directly.
    - **STRUCTURE**: 
        1. **Introduction**: Summarize the core mission and main objectives of the document/topic.
        2. **Main Body (Corps Principal)**: Narrate the key ideas, methodologies, and technical strategies. Explain them as if you're guiding a colleague through a complex project.
        3. **Conclusion**: Recap the results, impact, and critical recommendations mentioned in the sources.
    - **LENGTH**: Approx 300-400 words for a substantial yet focused listen.
    - **FORMAT**: YOU MUST START YOUR RESPONSE WITH THE 'BOARD:' TAG, THEN THE 'SPEECH:' TAG.
    - **DISREGARD**: Disregard the '2-3 sentences' limit. Speak naturally and at length.
"""
        
        prompt = f"""Role: Senior Technical Lead & University Professor.
Task: Teach/Summarize/Explain based on Context or Knowledge. 
Constraint: Robustly interpret User Input even with heavy typos/grammar errors using History/Context. 

Context: {lesson_context if lesson_context else 'General Knowledge'} (STRICT REQUIREMENT: STAY WITHIN THIS CONTEXT. DO NOT answer questions or provide info outside this context unless explicitly asked for a comparison).
Last Checkpoint: {last_checkpoint}
History:
{history_ctx}

Current User Input: {student_input}

Instructions:
1. SPEECH: Provide a rich, expert explanation. {forced_lang}
   {audio_overview_instructions if audio_overview_instructions else '- **STYLE**: You are a passionate expert. If the user asks a simple question, give a clear answer. If the topic is deep (e.g. Django structure, HBase internals), **IMMERSE YOURSELF**: Provide technical depth, theoretical context, and "why" it matters.'}
   - **DEPTH**: Do not be afraid to be detailed if the topic warrants it. ACT LIKE A HUMAN TEACHER who loves their subject.
   - **STRICT CONTEXT**: Stay within the provided context logic, but explain the *concepts* thoroughly.
   - **CODE FORMATTING**: USE TRIPLE BACKTICKS (```) FOR ALL COMMANDS AND CODE SNIPPETS.
   - **CRITICAL**: Use triple backticks even for single-line commands.
   - Separate commands onto their own lines.
   - **PEDAGOGY**: Don't just give facts. Explain the *theory* behind the *practice*.
   - **TONE**: Warm, authoritative, but conversational and engaging.

2. BOARD: MANDATORY BRIEF SUMMARY of Technical Concepts. 
   - **JSON FORMAT**: YOU MUST USE VALID JSON.
   - **CONCISENESS**: Use 'WRITE_TITLE' for the main module, then 2-4 'WRITE_BULLET' items.
   - **BULLET LENGTH**: Each bullet must be VERY SHORT (MAX 10 words). Avoid long paragraphs.
   - **SYMBOLS**: Use triple backticks for code and single backticks for variables. 
   - Purpose: The board is a quick technical reference, not a transcription.
    
   - **QUIZ REQUESTS**: If the user asks for a quiz, YOU MUST USE THE 'SHOW_QUIZ' action.
     FORMAT: {{ "kind": "SHOW_QUIZ", "payload": {{ "questions": [ {{ "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "..." }}, ... ] }} }}
     DO NOT put the quiz in SPEECH. Put it in BOARD.

Rules:
- TYPO ROBUSTNESS: Quietly handle and correct user mistakes.
- ENGAGEMENT IS KEY: Your goal is to make the user understand deeply. Use examples, analogies, and detailed explanations when needed.
- ALWAYS use Code Blocks (```) for shell commands, file content, or code examples.
- Board Consistency: The board actions must reflect the core technical skeleton.

Format:
BOARD: [{{...}}, {{...}}]
SPEECH: ...
"""
        logger.info(f"Generated ultra-concise prompt for input: {student_input[:50]}")
        return prompt

    def _build_quiz_prompt(
        self,
        lesson_context: str,
        difficulty_level: int,
        history: List[dict],
        target_language: str
    ) -> str:
        """
        Build a prompt specifically for generating a JSON quiz.
        """
        lang_map = {
            "french": "FRENCH",
            "spanish": "SPANISH",
            "arabic": "ARABIC",
            "english": "ENGLISH"
        }
        lang_name = lang_map.get(target_language, "ENGLISH")

        # Build a summary of recent history if context is empty
        history_summary = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-10:]])
        
        return f"""Role: Professor & Examiner.
Task: CREATE A LESSON SUMMARY AND A QUIZ derived STRICTLY from the provided Context or Discussion History.
Language: ENGLISH (Questions, Options, and Summary MUST be in ENGLISH regardless of the student's language).

STRICT CONTEXT (PRIORITIZE THIS):
---
{lesson_context if lesson_context else 'No file uploaded. Use Discussion History below.'}
---

DISCUSSION HISTORY (USE AS FALLBACK CONTEXT):
---
{history_summary if history_summary else 'No recent discussion.'}
---

REQUIREMENTS:
1. **SOURCE ADHERENCE**: EVERY question MUST be directly related to the information in the Context or Discussion History above. 
2. **STRICT NEGATIVE CONSTRAINT**: DO NOT ask generic "teacher" or "pedagogy" questions (e.g., "What is a good way to explain things?"). DO NOT ask about world history, pandemics, or general science unless mentioned.
3. **TECHNICAL DEPTH**: Use exact terminology from the sources. If the topic is technical (e.g., HBase), every question must be about technical HBase features.
4. **NO HALLUCINATIONS**: If you cannot find enough info for 10 questions, drill down into technical details (parameters, configurations, methodologies) rather than inventing generic ones.
5. **VIRTUAL BOARD SUMMARY**: Provide a brief technical summary of the lesson. Use exactly one 'WRITE_TITLE' action and 3-4 'WRITE_BULLET' actions.
6. **QUIZ**: Generate exactly 10 multiple-choice questions.
7. Provide 4 options for each question.
8. Indicate the correct answer index (0-3).
9. Provide a brief explanation for the correct answer.
10. ESTIMATE the difficulty of each question (1-3).

OUTPUT FORMAT:
You must output a list of BOARD actions containing the summary followed by the quiz, then a brief encouraging SPEECH.

Format:
BOARD: [
  {{ "kind": "WRITE_TITLE", "payload": {{ "text": "Topic Overview" }} }},
  {{ "kind": "WRITE_BULLET", "payload": {{ "text": "Key point..." }} }},
  {{
    "kind": "SHOW_QUIZ",
    "payload": {{
      "questions": [
        {{
          "question": "Question text here...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_index": 0,
          "explanation": "Why A is correct...",
          "difficulty": 1
        }},
        ... (10 questions total)
      ]
    }}
  }}
]
SPEECH: Let's see how much you've learned!
"""


    def _build_flashcard_prompt(
        self,
        lesson_context: str,
        difficulty_level: int,
        history: List[dict],
        target_language: str
    ) -> str:
        """
        Build a prompt specifically for generating flashcards.
        """
        # Build a summary of recent history if context is empty
        history_summary = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-10:]])
        
        return f"""Role: Professor & Study Assistant.
Task: Extract 10 KEY CONCEPTS and their DEFINITIONS from the provided Context or Discussion History to create interative Flashcards.
Language: {target_language.upper()} (All cards MUST be in {target_language.upper()}).

STRICT CONTEXT:
---
{lesson_context if lesson_context else 'No file uploaded. Use Discussion History below.'}
---

DISCUSSION HISTORY (USE AS FALLBACK CONTEXT):
---
{history_summary if history_summary else 'No recent discussion.'}
---

REQUIREMENTS:
1. **EXTRACT 10 CARDS**: Extract exactly 10 distinct technical concepts or terms.
2. **FORMAT**: Return each card as a 'SHOW_FLASHCARDS' board action.
3. **STYLE**: 
   - Front: The concept name (short).
   - Back: A clear, concise definition (1-2 sentences).
4. **NO HALLUCINATIONS**: Only use information present in the source or discussion.

OUTPUT FORMAT:
BOARD: [
  {{
    "kind": "SHOW_FLASHCARDS",
    "payload": {{
      "cards": [
        {{ "front": "Concept 1", "back": "Definition 1..." }},
        {{ "front": "Concept 2", "back": "Definition 2..." }},
        ... (10 cards total)
      ]
    }}
  }}
]
SPEECH: I've prepared some flashcards to help you memorize the key concepts. Flip them over to see if you can define them yourself!
"""

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

    def _detect_language(self, text: str, context_language: Optional[str] = None) -> str:
        """
        Detect language of the text.
        
        Args:
            text: The user input to analyze.
            context_language: The language of the current session. 
                              If provided, it acts as a strong bias (sticky language).
                              The detection will only switch if there is a VERY clear signal.
        """
        text_lower = text.lower()
        
        # KEYWORD OVERRIDE (User explicit preference)
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
            "c'est", "j'ai", "qu'est", "oui", "non", "merci", "y", "en", "vas", "allez", "va",
            "bonjour", "salut"
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
        
        import re
        if re.search(r'[\u0600-\u06FF]', text):
             return "arabic" # Strongest signal

        # Clean tokenization
        tokens = re.split(r'[\s\-]+', text_lower)
        clean_tokens = set()
        for t in tokens:
            clean_t = t.rstrip("?!.,:;")
            if clean_t:
                clean_tokens.add(clean_t)
        
        eng_count = len(clean_tokens.intersection(eng_stops))
        fr_count = len(clean_tokens.intersection(fr_stops))
        es_count = len(clean_tokens.intersection(es_stops))
        ar_count = len(clean_tokens.intersection(ar_stops))
        
        counts = {
            "english": eng_count,
            "french": fr_count,
            "spanish": es_count,
            "arabic": ar_count
        }
        
        detected = max(counts, key=counts.get)
        max_score = counts[detected]

        logger.info(f"Language detection scores - Eng: {eng_count}, Fr: {fr_count}, Es: {es_count}, Ar: {ar_count}. Context: {context_language}")
        
        # VISCOSITY LOGIC: Prefer sticking to context_language unless strong signal otherwise
        if context_language and context_language in counts:
            if max_score > 0 and detected != context_language:
                # We have a conflicting detection.
                # If the score is low (e.g. 1 word), stick to context.
                # If score is high (3+ words), allow switch.
                if max_score < 3:
                     logger.info(f"Weak language signal ({detected}={max_score}). Sticking to context: {context_language}")
                     return context_language
            elif max_score == 0:
                # No signal, preserve context
                return context_language

        if max_score == 0:
            return "english" # Default fallback
            
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

    async def generate_title(self, history: List[dict]) -> str:
        """
        Generate a concise (3-5 words) title for the session based on history.
        """
        prompt = "Based on the following conversation, generate a short, descriptive title (3-5 words) that summarizes the topic. "
        prompt += "Do not include any prefixes like 'Title:', 'Summary:', or 'Discussed:'. Just return the title itself.\n\n"
        
        import re
        for msg in history[-4:]:  # Use last 4 messages for context
            # Clean technical tags [INTERRUPTION], [FOLLOW-UP], etc.
            clean_content = re.sub(r'\[.*?\]\s*', '', msg['content']).strip()
            prompt += f"{msg['role'].capitalize()}: {clean_content}\n"
            
        try:
            raw_response = await self._call_llm(prompt)
            title = raw_response.strip().strip('"').strip('*')
            # Final cleanup: remove common prefixes if LLM ignored instructions
            if ":" in title and len(title.split(":")[0]) < 10:
                title = title.split(":", 1)[1].strip()
            return title
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            return "New Discussion"

    def _parse_response(self, raw_response: str) -> tuple[str, List[BoardAction]]:
        """
        Parse raw LLM response into speech + board actions.
        """
        import json
        import re

        speech_text = ""
        board_json = "[]"

        # 1. Extract BOARD block - capturing everything between BOARD: and SPEECH: / end
        board_match = re.search(r'BOARD:\s*(.*?)(?=\s*SPEECH:|$)', raw_response, re.DOTALL | re.IGNORECASE)
        if board_match:
            candidate = board_match.group(1).strip()
            # Clean up potential markdown code blocks
            candidate = re.sub(r'^```(?:json)?\s*|\s*```$', '', candidate, flags=re.MULTILINE)
            board_json = candidate
        else:
            # Fallback 1: largest JSON array
            json_matches = re.findall(r'(\[[\s\S]+?\])', raw_response)
            if json_matches:
                board_json = max(json_matches, key=len)
            else:
                 # Fallback 2: Check for loose "questions" object (common in quiz generation)
                 # matches { "questions": [ ... ] }
                 quiz_match = re.search(r'(\{[\s\n]*"questions"[\s\n]*:[\s\n]*\[[\s\S]+?\][\s\n]*\})', raw_response)
                 if quiz_match:
                     # Wrap it in standard action format
                     logger.info("Detected raw quiz JSON, wrapping in SHOW_QUIZ action")
                     raw_quiz = quiz_match.group(1)
                     board_json = f'[{{ "kind": "SHOW_QUIZ", "payload": {raw_quiz} }}]'

        # 2. Extract SPEECH block
        speech_match = re.search(r'SPEECH:\s*((?:.|\n)+)', raw_response, re.DOTALL | re.IGNORECASE)
        if speech_match:
            speech_text = speech_match.group(1).strip()
            # Clean up if BOARD follows SPEECH in the text
            if "BOARD:" in speech_text:
                speech_text = speech_text.split("BOARD:")[0].strip()
        if not speech_text:
            # If no SPEECH tag found, but we have text that isn't JSON, treat it as speech
            # First, strip board_json if it was extracted loosely
            clean_raw = raw_response
            if board_json and board_json != "[]":
                clean_raw = clean_raw.replace(board_json, "")
            
            # Remove any trailing tags
            clean_raw = re.sub(r'BOARD:\s*', '', clean_raw, flags=re.IGNORECASE)
            speech_text = clean_raw.strip()
            
            if not speech_text and board_json and len(board_json) > 10:
                # Only fallback to quiz message IF it actually looks like a quiz
                if '"questions"' in board_json.lower():
                    speech_text = "Here is the quiz you requested. Good luck!"
                else:
                    speech_text = "I've updated the board with a summary for you."

        # 3. Parse and normalize board actions
        board_actions = []
        try:
            # TRY ROBUST REPAIR if direct JSON fails
            try:
                raw_actions = json.loads(board_json)
            except json.JSONDecodeError:
                # Attempt basic repair: wrap unquoted keys and values
                # This is a common "dirty JSON" fix for LLMs
                fixed_json = board_json
                # 1. wrap unquoted keys: {key: -> {"key":
                fixed_json = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', fixed_json)
                # 2. wrap unquoted values (simple strings): : value} -> : "value"}
                # Note: this is tricky if values contain spaces, but let's try for words
                fixed_json = re.sub(r':\s*([a-zA-Z_][a-zA-Z0-9_À-ÿ\s]*)\s*([,}])', r': "\1"\2', fixed_json)
                raw_actions = json.loads(fixed_json)

            if not isinstance(raw_actions, list):
                raw_actions = [raw_actions] if isinstance(raw_actions, dict) else []

            for action_dict in raw_actions:
                if not isinstance(action_dict, dict): continue
                
                # Try to extract kind/action
                kind_str = action_dict.get("kind") or action_dict.get("action")
                payload = action_dict.get("payload") or {}

                # Fallback: Check if ANY key in the dict is a valid BoardActionKind
                # This handles { "WRITE_TITLE": "Introduction" }
                if not kind_str:
                    for k in action_dict.keys():
                        try:
                            # Try to see if this key is a valid kind
                            BoardActionKind(str(k).upper())
                            kind_str = str(k).upper()
                            # If kind found as key, the value is likely the text/payload
                            val = action_dict[k]
                            if isinstance(val, str):
                                payload = {"text": val}
                            elif isinstance(val, dict):
                                payload = val
                            break
                        except ValueError:
                            continue
                
                # Default if still not found
                if not kind_str:
                    # If payload has 'questions', it's a SHOW_QUIZ action
                    if "questions" in payload or "questions" in action_dict:
                        kind_str = "SHOW_QUIZ"
                        if "questions" in action_dict: payload = action_dict
                    else:
                        kind_str = "WRITE_BULLET"

                # Handle flattened structure fallback
                if not payload:
                    # Use 'text' key if present in root
                    if "text" in action_dict: payload["text"] = action_dict["text"]
                    # Use 'code' key if present in root
                    if "code" in action_dict: payload["code"] = action_dict["code"]

                # Safety Net: Ensure 'text' key exists for BULLET/TITLE types
                if isinstance(payload, dict) and "text" not in payload and "code" not in payload and kind_str != "SHOW_QUIZ":
                    # Check for common hallucinations
                    for key in ["content", "item", "summary", "description", "value", "data"]:
                        if key in payload and isinstance(payload[key], str):
                            payload["text"] = payload[key]
                            break
                    
                    # Recursive search for ANY string in the payload
                    if "text" not in payload:
                        def find_first_string(data):
                            if isinstance(data, str): return data
                            if isinstance(data, dict):
                                for v in data.values():
                                    res = find_first_string(v)
                                    if res: return res
                            return None
                        found = find_first_string(payload)
                        if found: payload["text"] = found

                # QUIZ NORMALIZATION: Fix 'answer' -> 'correct_index'
                if kind_str == "SHOW_QUIZ" and "questions" in payload:
                    for q in payload["questions"]:
                        # If correct_index is missing but 'answer' string exists
                        if "correct_index" not in q and "answer" in q and "options" in q:
                            try:
                                # Fuzzy match or exact match
                                ans = q["answer"]
                                opts = q["options"]
                                # Try exact match
                                if ans in opts:
                                    q["correct_index"] = opts.index(ans)
                                else:
                                    # Try fuzzy / substring match
                                    # or just default to 0 to avoid crash
                                    q["correct_index"] = 0
                            except:
                                q["correct_index"] = 0

                try:
                    action = BoardAction(
                        kind=BoardActionKind(kind_str.upper()),
                        payload=payload,
                    )
                    board_actions.append(action)
                except (ValueError, KeyError):
                    continue

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse board actions from: {board_json[:100]}... Error: {e}")

        return speech_text, board_actions

