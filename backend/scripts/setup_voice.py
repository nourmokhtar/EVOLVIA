import os
import urllib.request
import zipfile
import shutil
import logging
from huggingface_hub import hf_hub_download

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BIN_DIR = os.path.join(BASE_DIR, "bin", "piper")
MODELS_DIR = os.path.join(BASE_DIR, "models", "piper")

# Piper release for Windows
PIPER_URL = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"

# Model paths in the rhasspy/piper-voices repo
VOICE_MODELS = [
    "en/en_US/amy/medium/en_US-amy-medium.onnx",
    "en/en_US/amy/medium/en_US-amy-medium.onnx.json",
    "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
    "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json",
    "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx",
    "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json",
    "ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx",
    "ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json",
]

def setup_piper():
    os.makedirs(BIN_DIR, exist_ok=True)
    zip_path = os.path.join(BIN_DIR, "piper.zip")
    
    if not os.path.exists(os.path.join(BIN_DIR, "piper.exe")):
        logger.info(f"Downloading Piper from {PIPER_URL}...")
        req = urllib.request.Request(PIPER_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
            
        logger.info("Extracting Piper...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(BIN_DIR)
        os.remove(zip_path)
        
        # Piper zip often has a nested 'piper' directory
        extracted_dir = os.path.join(BIN_DIR, "piper")
        if os.path.exists(extracted_dir):
            for item in os.listdir(extracted_dir):
                dest = os.path.join(BIN_DIR, item)
                if os.path.exists(dest):
                    if os.path.isdir(dest): shutil.rmtree(dest)
                    else: os.remove(dest)
                shutil.move(os.path.join(extracted_dir, item), dest)
            os.rmdir(extracted_dir)
    else:
        logger.info("Piper already setup.")

def setup_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    for model_path in VOICE_MODELS:
        filename = os.path.basename(model_path)
        dest = os.path.join(MODELS_DIR, filename)
        if os.path.exists(dest):
            logger.info(f"Model already exists: {filename}")
            continue
            
        logger.info(f"Downloading model: {model_path}...")
        try:
            downloaded_path = hf_hub_download(
                repo_id="rhasspy/piper-voices",
                filename=model_path,
                repo_type="dataset" if "dataset" in model_path else "model"
            )
            shutil.copy(downloaded_path, dest)
            logger.info(f"Downloaded {filename}")
        except Exception as e:
            logger.error(f"Failed to download {model_path}: {e}")

def setup_whisper():
    whisper_dir = os.path.join(BASE_DIR, "models", "whisper")
    os.makedirs(whisper_dir, exist_ok=True)
    logger.info("Pre-downloading Faster-Whisper 'small' model...")
    from faster_whisper import WhisperModel
    # This triggers the download
    WhisperModel("small", compute_type="float32", download_root=whisper_dir)

if __name__ == "__main__":
    setup_piper()
    setup_models()
    setup_whisper()
    logger.info("Setup complete!")
