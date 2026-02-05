import os
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
from faster_whisper import WhisperModel
import io
import numpy as np
import logging

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize the Faster Whisper model for STT. Lazy loading is used.
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/whisper"))
        logger.info(f"STTService configured with model={model_size}, device={device} (lazy loading)")

    def _get_model(self):
        """Lazy load the Whisper model."""
        if self.model is None:
            logger.info(f"Loading Whisper model '{self.model_size}' (this may take a moment on first run)...")
            try:
                self.model = WhisperModel(
                    self.model_size, 
                    device=self.device, 
                    compute_type=self.compute_type, 
                    download_root=self.model_path
                )
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise
        return self.model

    def transcribe(self, audio_data: bytes, language: str = None) -> str:
        """
        Transcribe audio bytes to text.
        
        Args:
            audio_data: Bytes representing the audio file (WAV, MP3, etc.)
            language: Optional language code (e.g., "en", "fr", "es", "ar")
            
        Returns:
            Transcribed text.
        """
        try:
            model = self._get_model()
            audio_file = io.BytesIO(audio_data)
            
            # Log audio size for debugging
            duration_sec = len(audio_data) / (16000 * 2)
            logger.info(f"Transcribing {duration_sec:.2f}s of audio...")

            segments, info = model.transcribe(
                audio_file, 
                beam_size=5, 
                language=language,
                task="transcribe",
                # Prevent hallucinations on silence
                no_speech_threshold=0.6,
                condition_on_previous_text=False,
                compression_ratio_threshold=2.4,
                log_prob_threshold=-1.0
            )
            
            text = " ".join([segment.text for segment in segments])
            result = text.strip()
            
            # Simple heuristic: if Whisper returns common Chinese hallucinations or very predictable silence text
            hallucination_check = [
                "哈啰", "先生", "教授", "帮你拍一张照片", # Chinese "Hello professor/photo" hallucination
                "字幕", "感谢", "Transcribed by", # Common byproduct transcriptions
            ]
            
            if any(h in result for h in hallucination_check) and len(result) < 30:
                logger.warning(f"Discarding likely hallucination: {result}")
                return ""

            logger.info(f"Whisper Transcription Result: {result}")
            return result
        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return ""

# Singleton instance
# Using 'small' for much better accuracy than 'base'
stt_service = STTService(model_size="small")
