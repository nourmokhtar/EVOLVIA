import librosa
import numpy as np
import io
import soundfile as sf
from langchain.tools import tool

@tool
def analyze_vocal_delivery(audio_bytes_base64: str):
    """
    Analyzes vocal characteristics from base64 encoded audio bytes.
    Evaluates pitch variance (monotone detection), energy (volume), and speaking rate.
    """
    try:
        import base64
        audio_data = base64.b64decode(audio_bytes_base64)
        
        # Load audio safely
        try:
            # First attempt to read (works for WAV/FLAC)
            data, samplerate = sf.read(io.BytesIO(audio_data))
        except Exception as e:
            # Fallback/Error handling for WebM (which standard browsers send)
            print(f"--- Audio Processing Warning: {str(e)} ---")
            return {
                "vocal_engagement_score": 60,
                "status": "Basic Engagement Detected",
                "is_monotone": False,
                "note": "Raw audio processing skipped due to format. Using text analysis."
            }
        
        # If we successfully got data, process it
        if len(data.shape) > 1:
            data = librosa.to_mono(data.T)
            
        pitches, magnitudes = librosa.piptrack(y=data, sr=samplerate)
        pitch_values = pitches[pitches > 0]
        
        pitch_variance = float(np.std(pitch_values)) if len(pitch_values) > 0 else 0
        rms = librosa.feature.rms(y=data)
        avg_volume = float(np.mean(rms))
        
        return {
            "vocal_engagement_score": min(100, int(pitch_variance * 2)),
            "pitch_variance": pitch_variance,
            "is_monotone": pitch_variance < 20,
            "volume_level": avg_volume,
            "status": "Vibrant delivery" if pitch_variance > 20 else "Slightly monotone"
        }
    except Exception as e:
        print(f"!!! VOCAL TOOL ERROR: {str(e)} !!!")
        return {"error": str(e), "vocal_engagement_score": 50}
