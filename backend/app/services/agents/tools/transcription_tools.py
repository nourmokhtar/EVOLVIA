import os
import httpx
import base64
import io
from dotenv import load_dotenv

load_dotenv()

async def transcribe_audio_groq(audio_bytes: bytes):
    """
    Sends audio bytes to Groq's Whisper API and returns the transcript.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("!!! ERROR: GROQ_API_KEY is missing from environment !!!")
        return "Error: No GROQ_API_KEY found."

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    # Use a generic name that Whisper accepts
    files = {
        "file": ("audio.webm", io.BytesIO(audio_bytes), "audio/webm"),
        "model": (None, "whisper-large-v3"),
        "response_format": (None, "json")
    }

    print(f"--- ATTEMPTING GROQ WHISPER TRANSCRIPTION ({len(audio_bytes)} bytes) ---")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, files=files, timeout=30.0)
            if response.status_code != 200:
                print(f"!!! GROQ ERROR: {response.status_code} - {response.text} !!!")
                return f"Transcription service currently unavailable (Error {response.status_code})."
            
            transcript = response.json().get("text", "")
            return transcript if transcript.strip() else "The audio was too quiet to transcribe."
        except Exception as e:
            print(f"!!! TRANSCRIPTION EXCEPTION: {str(e)} !!!")
            return "Could not transcribe audio due to a connection issue."
