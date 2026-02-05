import librosa
import numpy as np
import io
import os
import tempfile
import base64
from langchain.tools import tool

@tool
def analyze_vocal_delivery(audio_bytes_base64: str) -> dict:
    """
    Analyzes vocal characteristics from base64 encoded audio bytes.
    Robustly handles various formats (WebM, WAV, MP3) via temp file loading.
    Returns: Pitch Variance (Monotone), Volume (Energy), Duration, and Silence Ratio.
    """
    temp_path = None
    try:
        # 1. Decode Base64 to Raw Bytes
        audio_data = base64.b64decode(audio_bytes_base64)
        
        # 2. Write to a temporary file (Critical for robust loading of WebM/MP3)
        # We assume .webm if coming from browser, but librosa/ffmpeg usually auto-detects.
        # Using a generic extension or trying to detect can help, but .tmp usually works with ffmpeg.
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        # 3. Load with Librosa (Handles resampling to 22050Hz mono automatically)
        # This uses system ffmpeg/avconv if available for non-wav formats
        y, sr = librosa.load(temp_path, sr=22050)
        
        # 4. METRIC: Duration
        duration = librosa.get_duration(y=y, sr=sr)
        if duration < 0.5:
             return {"error": "Audio too short", "vocal_engagement_score": 0}

        # 5. METRIC: Silence / Pauses
        # split returns intervals of [start, end] non-silent audio
        non_silent_intervals = librosa.effects.split(y, top_db=20) # 20dB threshold
        non_silent_time = sum([end - start for start, end in non_silent_intervals]) / sr
        silence_ratio = (duration - non_silent_time) / duration

        # 6. METRIC: Pitch (F0) - Monotone Check
        # piptrack estimate
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        # Select pitches with some magnitude energy (ignore silence noise)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 50] # Filter low rumble < 50Hz
        
        pitch_std = 0.0
        if len(pitch_values) > 0:
            pitch_std = float(np.std(pitch_values))
        
        # 7. METRIC: Volume (Energy)
        rms = librosa.feature.rms(y=y)
        avg_volume = float(np.mean(rms))
        
        # Cleanup
        try:
            os.remove(temp_path)
        except:
            pass

        return {
            "vocal_engagement_score": min(100, int(pitch_std * 1.5)), # Heuristic
            "pitch_variance": round(pitch_std, 2),
            "is_monotone": pitch_std < 15, # Threshold
            "volume_level": round(avg_volume, 4),
            "duration": round(duration, 2),
            "silence_ratio": round(silence_ratio, 2),
            "status": "Analysis Successful"
        }

    except Exception as e:
        # Cleanup if failed
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        
        print(f"!!! VOCAL TOOL ERROR: {str(e)} !!!")
        return {
            "error": str(e), 
            "vocal_engagement_score": 0,
            "status": "Processing Failed"
        }
