import os
import subprocess
import shutil
import logging
import uuid
import wave
import io
from typing import Optional

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self, piper_binary_path: str = "bin/piper/piper.exe", models_dir: str = "models/piper"):
        """
        Initialize the TTS service using Piper.
        
        Args:
            piper_binary_path: Path to the piper executable.
            models_dir: Directory where voice models are stored.
        """
        self.piper_binary = piper_binary_path
        self.models_dir = models_dir
        
        # Mapping language to model file names
        # Standard Piper female/natural voices
        # Mapping language to model file names - Using Female Voices
        self.voice_models = {
            "en": "en_US-amy-medium.onnx", # Female
            "fr": "fr_FR-siwis-medium.onnx", # Female
            "es": "es_ES-sharvard-medium.onnx", # Female
            "ar": "arabic-emirati-female.onnx", # Female (Emirati)
        }
        
        # Create directories if they don't exist
        os.makedirs(models_dir, exist_ok=True)
        os.makedirs(os.path.dirname(piper_binary_path), exist_ok=True)

    def speak(self, text: str, language: str = "en", output_path: Optional[str] = None, speed: float = 1.0) -> bytes:
        """
        Synthesize text to speech using Piper.
        
        Args:
            text: Text to speak.
            language: Language code ("en", "fr", "es", "ar").
            output_path: If provided, save the audio to this file path.
            speed: Length scale (higher = slower).
            
        Returns:
            The audio data in WAV format.
        """
        model_name = self.voice_models.get(language, self.voice_models["en"])
        model_path = os.path.join(self.models_dir, model_name)
        
        if not os.path.exists(model_path):
            logger.error(f"Voice model not found for language {language}: {model_path}")
            # Fallback to English if model missing
            if language != "en":
                return self.speak(text, "en", output_path, speed)
            raise FileNotFoundError(f"Model file {model_path} not found.")

        if not os.path.exists(self.piper_binary):
            logger.error(f"Piper binary not found: {self.piper_binary}")
            raise FileNotFoundError(f"Piper binary {self.piper_binary} not found.")

        # If no output path, use a temporary one or capture stdout
        # Piper outputs to stdout by default if no -f flag
        
        cmd = [
            self.piper_binary,
            "--model", model_path,
            "--length_scale", str(speed),
            "--output_raw" # Output raw PCM to stdout
        ]
        
        try:
            logger.info(f"Synthesizing speech with Piper: '{text[:50]}...'")
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            stdout, stderr = process.communicate(input=text.encode('utf-8'))
            
            if process.returncode != 0:
                logger.error(f"Piper error: {stderr.decode()}")
                raise Exception(f"Piper process failed: {stderr.decode()}")

            # stdout contains raw PCM data (usually 16-bit 22050Hz mono)
            # We need to wrap it in a WAV container for browser compatibility
            
            audio_data = self._raw_to_wav(stdout)
            
            if output_path:
                with open(output_path, "wb") as f:
                    f.write(audio_data)
            
            return audio_data

        except Exception as e:
            logger.error(f"Error during TTS synthesis: {e}")
            raise

    def _raw_to_wav(self, pcm_data: bytes, sample_rate: int = 22050) -> bytes:
        """Wrap raw PCM data in a WAV container."""
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1) # Mono
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        return buffer.getvalue()

# Singleton instance
tts_service = TTSService(
    piper_binary_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../bin/piper/piper.exe")),
    models_dir=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/piper"))
)
