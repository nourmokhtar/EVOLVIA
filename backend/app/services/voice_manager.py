try:
    import webrtcvad
    HAS_WEBRTCVAD = True
except ImportError:
    HAS_WEBRTCVAD = False

import logging
import io
import wave
import numpy as np
from typing import List, Optional
from app.services.stt_service import stt_service
from app.services.tts_service import tts_service

logger = logging.getLogger(__name__)

class VoiceManager:
    def __init__(self, sample_rate: int = 16000):
        """
        Initialize VoiceManager with VAD and audio buffering.
        
        Args:
            sample_rate: Expected sample rate of input audio (default 16000Hz).
        """
        if HAS_WEBRTCVAD:
            self.vad = webrtcvad.Vad(3)  # Most aggressive
        else:
            self.vad = None
            logger.warning("webrtcvad not installed. Backend VAD will be disabled.")
            
        self.sample_rate = sample_rate
        self.frame_duration_ms = 30  # webrtcvad supports 10, 20, or 30ms
        self.frame_size = int(sample_rate * self.frame_duration_ms / 1000) * 2  # 2 bytes per sample (16-bit)
        
        self.audio_buffer = bytearray()
        self.recorded_audio = bytearray()
        self.is_recording = False
        self.silence_frames = 0
        self.max_silence_frames = 10  # ~300ms of silence to trigger end of speech
        self.auto_finish = True # New flag
        
    async def add_audio_chunk(self, chunk: bytes, language: Optional[str] = None) -> Optional[str]:
        """
        Add an audio chunk to the buffer and check for end of speech.
        
        Args:
            chunk: Raw PCM 16-bit mono audio data.
            language: Language of the audio. If None, STT will auto-detect.
            
        Returns:
            Transcribed text if speech ended, else None.
        """
        self.audio_buffer.extend(chunk)
        
        # Process frames for VAD
        while len(self.audio_buffer) >= self.frame_size:
            frame = self.audio_buffer[:self.frame_size]
            self.audio_buffer = self.audio_buffer[self.frame_size:]
            
            try:
                if self.vad:
                    is_speech = self.vad.is_speech(frame, self.sample_rate)
                else:
                    # If no VAD, we only record if manual is_recording is on
                    is_speech = self.is_recording
            except Exception as e:
                logger.warning(f"VAD error: {e}")
                is_speech = False
                
            if is_speech:
                if not self.is_recording and self.vad: # Only auto-start if VAD exists
                    logger.info("Speech detected, starting recording...")
                    self.is_recording = True
                    self.recorded_audio = bytearray()
                
                if self.is_recording:
                    self.recorded_audio.extend(frame)
                    self.silence_frames = 0
            else:
                if self.is_recording:
                    if not self.auto_finish:
                        # In manual mode, capture everything
                        self.recorded_audio.extend(frame)
                    else:
                        self.recorded_audio.extend(frame)
                        self.silence_frames += 1
                    
                    if self.silence_frames >= self.max_silence_frames:
                        if self.auto_finish:
                            logger.info("Silence detected, ending speech...")
                            text = await self._process_recorded_speech(language)
                            self.is_recording = False
                            return text
                        else:
                            # Just stop adding to recorded_audio but don't finish?
                            # Actually better to keep adding to buffer until manual stop
                            pass
                        
        return None
    
    def start_recording(self):
        """Manually force start recording."""
        if not self.is_recording:
            logger.info("Manual start of recording triggered...")
            self.is_recording = True
            self.recorded_audio = bytearray()
            self.audio_buffer = bytearray() # Clear stale buffer data too
            self.silence_frames = 0
    
    async def end_recording(self, language: Optional[str] = None) -> Optional[str]:
        """
        Manually end the current recording and transcribe.
        
        Returns:
            Transcribed text if audio was recorded, else None.
        """
        if self.is_recording:
            logger.info(f"Manual end of recording triggered. Buffer size: {len(self.recorded_audio)} bytes")
            text = await self._process_recorded_speech(language)
            self.is_recording = False
            return text
        return None

    async def _process_recorded_speech(self, language: str) -> str:
        """Transcribe the recorded speech buffer."""
        if not self.recorded_audio:
            return ""
            
        # Convert raw PCM to WAV for STT
        wav_data = self._pcm_to_wav(self.recorded_audio)
        
        # Call STT in a thread to avoid blocking the event loop
        import asyncio
        text = await asyncio.to_thread(stt_service.transcribe, wav_data, language=language)
        
        # --- Filter Hallucinations ---
        # Whisper and other models often hallucinate common phrases during silence
        hallucinations = [
            "you", "thank you", "thanks", "than k u", 
            "you.", "thank you.", "thanks.", "than k u."
        ]
        
        # Clean text for comparison (lowercase, stripped)
        clean_text = text.lower().strip()
        
        if clean_text in hallucinations:
            logger.info(f"Filtered STT hallucination: '{text}'")
            return ""
            
        logger.info(f"Transcribed speech: {text}")
        return text

    def _pcm_to_wav(self, pcm_data: bytes) -> bytes:
        """Wrap raw PCM data in a WAV container."""
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(pcm_data)
        return buffer.getvalue()

    async def synthesize_response(self, text: str, language: str = "en", speed: float = 1.1) -> bytes:
        """Synthesize text to speech with natural speed."""
        return tts_service.speak(text, language, speed=speed)

# We'll create instances per session in the API layer
