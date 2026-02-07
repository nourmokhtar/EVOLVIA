"""
Language Improvement API - analyzes user speech for fluency & pronunciation.

MVP implementation:
- Uses Faster-Whisper (via existing STT model) to get transcript + word timestamps.
- Computes deterministic fluency metrics.
- Computes heuristic pronunciation diagnostics from ASR confidences.
- Returns a simple, hard-coded coaching payload (no LLM yet).
"""

from __future__ import annotations

import io
from typing import Literal, Optional, Dict, Any, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.services.stt_service import stt_service
from app.services.learn_llm import LearnLLMService

# Setup logger
import logging
logger = logging.getLogger(__name__)

router = APIRouter()


LanguageCode = Literal["en", "fr", "es", "it", "ar"]
UserLevel = Literal["beginner", "intermediate", "advanced"]
Goal = Literal["conversation", "exam", "business"]


FILLERS_BY_LANG: Dict[str, List[str]] = {
    "en": ["um", "uh", "er", "like", "you know"],
    "fr": ["euh", "bah"],
    "es": ["eh", "este"],
    "it": ["ehm"],
    "ar": ["يعني", "اه", "ام"],
}


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def compute_fluency(
    words: List[Dict[str, Any]],
    language_code: str,
    user_level: str,
    min_pause_ms: int = 300,
    long_pause_ms: int = 800,
) -> Dict[str, Any]:
    """Compute basic fluency metrics from word-level timestamps."""
    if not words:
        return {
            "speech_rate_wpm": 0.0,
            "articulation_rate_wpm": 0.0,
            "pause_frequency_per_min": 0.0,
            "long_pauses": [],
            "filler_counts": {},
            "repetition_estimate": {"count": 0, "examples": []},
            "normalized_against_level": False,
            "fluency_score": 0.0,
            "notes": ["No speech detected."],
        }

    total_duration = float(words[-1]["end"] - words[0]["start"])
    total_minutes = max(total_duration / 60.0, 1e-6)
    total_words = len(words)

    # pauses between words
    pauses: List[Dict[str, float]] = []
    for i in range(len(words) - 1):
        gap = float(words[i + 1]["start"] - words[i]["end"])
        if gap * 1000.0 >= min_pause_ms:
            pauses.append(
                {
                    "start": float(words[i]["end"]),
                    "end": float(words[i + 1]["start"]),
                    "duration": gap,
                }
            )

    long_pauses = [p for p in pauses if p["duration"] * 1000.0 >= long_pause_ms]
    pause_frequency_per_min = len(pauses) / total_minutes

    total_pause_duration = sum(p["duration"] for p in pauses)
    articulation_time_min = max((total_duration - total_pause_duration) / 60.0, 1e-6)

    speech_rate_wpm = total_words / total_minutes
    articulation_rate_wpm = total_words / articulation_time_min

    # filler words
    fillers = FILLERS_BY_LANG.get(language_code, [])
    filler_counts: Dict[str, int] = {}
    for w in words:
        token = str(w["word"]).lower()
        if token in fillers:
            filler_counts[token] = filler_counts.get(token, 0) + 1

    # simple repetition heuristic: consecutive identical tokens
    repetition_examples: List[str] = []
    repetition_count = 0
    for i in range(len(words) - 1):
        if str(words[i]["word"]).lower() == str(words[i + 1]["word"]).lower():
            repetition_count += 1
            if len(repetition_examples) < 3:
                repetition_examples.append(
                    f"... {words[i]['word']} {words[i + 1]['word']} ..."
                )

    # level-based target ranges
    target_wpm_low = 90 if user_level == "advanced" else 70
    target_wpm_high = 160 if user_level == "advanced" else 130
    mid = (target_wpm_low + target_wpm_high) / 2.0

    rate_score = 100.0 - abs(speech_rate_wpm - mid) * 0.8
    rate_score = _clamp(rate_score, 0.0, 100.0)

    pause_score = 100.0 - (len(long_pauses) * 5.0 + pause_frequency_per_min * 2.0)
    pause_score = _clamp(pause_score, 0.0, 100.0)

    filler_penalty = float(sum(filler_counts.values()) * 3)
    repetition_penalty = float(repetition_count * 2)

    raw_score = rate_score * 0.5 + pause_score * 0.3 + 20.0
    raw_score -= filler_penalty + repetition_penalty
    fluency_score = _clamp(raw_score, 0.0, 100.0)

    notes: List[str] = []
    if speech_rate_wpm < target_wpm_low:
        notes.append("You are speaking quite slowly; try to connect words more smoothly.")
    elif speech_rate_wpm > target_wpm_high:
        notes.append("You are speaking very fast; try to slow down slightly for clarity.")
    if long_pauses:
        notes.append(f"There are {len(long_pauses)} long pauses over {long_pause_ms}ms.")
    if filler_counts:
        desc = ", ".join(f"{k}×{v}" for k, v in filler_counts.items())
        notes.append(f"You use filler words frequently: {desc}.")

    return {
        "speech_rate_wpm": speech_rate_wpm,
        "articulation_rate_wpm": articulation_rate_wpm,
        "pause_frequency_per_min": pause_frequency_per_min,
        "long_pauses": long_pauses,
        "filler_counts": filler_counts,
        "repetition_estimate": {
            "count": repetition_count,
            "examples": repetition_examples,
        },
        "normalized_against_level": True,
        "fluency_score": fluency_score,
        "notes": notes,
    }


def heuristic_pronunciation(
    segments: List[Dict[str, Any]], language_code: str
) -> Dict[str, Any]:
    """Heuristic pronunciation diagnostics from ASR confidences."""
    words: List[Dict[str, Any]] = [w for seg in segments for w in seg["words"]]
    if not words:
        return {
            "overall_score": 0.0,
            "method": "heuristic_asr_confidence",
            "suspect_words": [],
            "issues_summary": [],
        }

    avg_conf = sum(float(w.get("confidence", 0.0)) for w in words) / len(words)
    base_thresh = 0.8
    suspect: List[Dict[str, Any]] = []
    for w in words:
        conf = float(w.get("confidence", 0.0))
        if conf < base_thresh:
            suspect.append(
                {
                    "word": w["word"],
                    "start": float(w["start"]),
                    "end": float(w["end"]),
                    "confidence": conf,
                    "reason": "low ASR confidence (heuristic, may indicate mispronunciation)",
                    "certainty": "likely" if conf < base_thresh - 0.1 else "possible",
                }
            )

    issues: List[Dict[str, Any]] = []
    if language_code == "en":
        th_suspects = [w for w in suspect if "th" in str(w["word"]).lower()]
        if len(th_suspects) >= 3:
            issues.append(
                {
                    "label": "th sound",
                    "description": "The 'th' sound may be unclear. Pay attention to placing your tongue gently between your teeth.",
                    "example_words": [w["word"] for w in th_suspects[:5]],
                    "certainty": "possible",
                }
            )

    overall_score = _clamp(avg_conf * 100.0, 0.0, 100.0)

    return {
        "overall_score": overall_score,
        "method": "heuristic_asr_confidence",
        "suspect_words": suspect[:50],
        "issues_summary": issues[:5],
    }


def build_fallback_coaching(
    transcript: str,
    fluency: Dict[str, Any],
    pronunciation: Dict[str, Any],
    language_code: str,
    user_level: str,
    goal: str,
) -> Dict[str, Any]:
    """
    Simple heuristic coaching payload that matches the frontend JSON shape.
    Used as fallback if LLM service fails.
    """
    priorities = []
    explanations = []
    micro_drills = []
    example_sentences = []

    # Priority 1: pauses / fluency
    p1_id = "pause_control"
    priorities.append(
        {
            "id": p1_id,
            "title": "Reduce long pauses",
            "reason": "You have noticeable long pauses which break your flow.",
        }
    )
    explanations.append(
        {
            "priority_id": p1_id,
            "simple_explanation": "Try to keep your ideas moving, even if you make small mistakes. Shorter pauses make you sound more confident.",
            "language_specific_notes": "",
        }
    )
    micro_drills.append(
        {
            "priority_id": p1_id,
            "title": "30-second no-pause story",
            "instructions": "Describe your day in about 30 seconds, trying not to pause for more than half a second. It's okay if your grammar is not perfect.",
            "estimated_seconds": 40,
        }
    )

    # Priority 2: pronunciation
    p2_id = "pronunciation_clarity"
    priorities.append(
        {
            "id": p2_id,
            "title": "Improve word clarity",
            "reason": "Some words are hard to recognize for the model, which may reflect unclear pronunciation.",
        }
    )
    explanations.append(
        {
            "priority_id": p2_id,
            "simple_explanation": "Focus on saying each key word clearly, especially the beginning and ending sounds.",
            "language_specific_notes": "",
        }
    )
    micro_drills.append(
        {
            "priority_id": p2_id,
            "title": "Slow & clear repetition",
            "instructions": "Pick 5–10 important words from your sentence and repeat them slowly 3 times each, exaggerating the beginning and ending sounds.",
            "estimated_seconds": 45,
        }
    )

    # Priority 3: filler words if present
    total_fillers = sum(int(v) for v in fluency.get("filler_counts", {}).values())
    if total_fillers > 0:
        p3_id = "filler_words"
        priorities.append(
            {
                "id": p3_id,
                "title": "Use fewer filler words",
                "reason": f"You used {total_fillers} filler words, which can make you sound less confident.",
            }
        )
        explanations.append(
            {
                "priority_id": p3_id,
                "simple_explanation": "It's natural to say 'um' or 'like', but reducing them makes you sound more fluent and confident.",
                "language_specific_notes": "",
            }
        )
        micro_drills.append(
            {
                "priority_id": p3_id,
                "title": "Silent pause instead of fillers",
                "instructions": "Retell the same idea but replace any 'um' or similar filler with a silent pause. Concentrate on breathing instead of saying a filler.",
                "estimated_seconds": 35,
            }
        )

    # Very simple example sentences: echo a fragment of transcript if available
    if transcript:
        snippet = transcript.split(".")[0][:120]
        example_sentences.append(
            {
                "priority_id": p1_id,
                "sentence": snippet or "I want to practice speaking more smoothly.",
                "phonetic_hint": "Focus on linking words and keeping your voice moving.",
            }
        )

    retry_goal = {
        "description": "Speak again with fewer long pauses and clearer key words.",
        "metrics_target": {
            "max_long_pauses": max(0, len(fluency.get("long_pauses", [])) - 2),
            "max_filler_words": max(0, total_fillers - 2),
            "target_fluency_score": min(100, float(fluency.get("fluency_score", 0.0)) + 10),
            "target_pronunciation_score": min(
                100, float(pronunciation.get("overall_score", 0.0)) + 10
            ),
        },
    }

    return {
        "grammar_score": 0,
        "grammar_feedback": "N/A (Heuristic mode)",
        "vocabulary_score": 0,
        "vocabulary_feedback": "N/A (Heuristic mode)",
        "top_priorities": priorities[:3],
        "explanations": explanations,
        "micro_drills": micro_drills,
        "example_sentences": example_sentences,
        "retry_goal": retry_goal,
    }


@router.post("/analyze")
async def analyze_speech(
    audio: UploadFile = File(...),
    language_code: LanguageCode = Form("en"),
    user_level: UserLevel = Form("intermediate"),
    goal: Goal = Form("conversation"),
    exercise_type: str = Form("free_speaking"),
    exercise_id: Optional[str] = Form(None),
):
    """
    Analyze one spoken attempt:
    - Transcribe with word timestamps.
    - Compute fluency metrics.
    - Compute heuristic pronunciation diagnostics.
    - Return a simple structured coaching payload.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file.")

        # Use the existing Whisper model but request word timestamps
        model = stt_service._get_model()  # type: ignore[attr-defined]
        audio_file = io.BytesIO(audio_bytes)

        segments_raw, info = model.transcribe(
            audio_file,
            beam_size=5,
            language=language_code,
            task="transcribe",
            word_timestamps=True,
            no_speech_threshold=0.6,
            condition_on_previous_text=False,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
        )

        segments: List[Dict[str, Any]] = []
        all_words: List[Dict[str, Any]] = []

        for seg in segments_raw:
            seg_dict: Dict[str, Any] = {
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text,
                "words": [],
            }
            if seg.words:
                for w in seg.words:
                    w_dict = {
                        "word": w.word,
                        "start": float(w.start),
                        "end": float(w.end),
                        "confidence": float(getattr(w, "probability", 0.0) or 0.0),
                    }
                    seg_dict["words"].append(w_dict)
                    all_words.append(w_dict)
            segments.append(seg_dict)

        transcript = " ".join(seg["text"] for seg in segments).strip()

        asr_output = {
            "language_code": language_code,
            "transcript": transcript,
            "segments": segments,
        }

        fluency = compute_fluency(all_words, language_code, user_level)
        pronunciation = heuristic_pronunciation(segments, language_code)

        # Try LLM coaching, fall back to heuristic
        try:
            llm_service = LearnLLMService() # Default to env var (or 'llama' if unset)
            coaching = await llm_service.generate_coaching_feedback(
                transcript, fluency, pronunciation, language_code, user_level, goal
            )
        except Exception as e:
            logger.error(f"LLM Coaching failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Fallback to heuristics
            coaching = build_fallback_coaching(
                transcript, fluency, pronunciation, language_code, user_level, goal
            )

        return {
            "attempt_id": exercise_id or "temp",
            "asr": {"transcript": transcript, "language_code": language_code},
            "fluency": fluency,
            "pronunciation": pronunciation,
            "coaching": coaching,
        }

    except HTTPException:
        raise
    except Exception as e:
        # Let global exception handler log details; return 500 here.
        raise HTTPException(status_code=500, detail=str(e))

