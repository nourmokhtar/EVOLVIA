
import requests
import json
import urllib3
import sys

urllib3.disable_warnings()

api_key = "sk-031cf2545257449f8301e46466b480e9"
model_name = "hosted_vllm/Llama-3.1-70B-Instruct"

paths = [
    "/api/v1/chat/completions",
    "/api/chat",
    "/v1/generate",
    "/generate",
    "/api/generate",
    "/ollama/api/chat",
    "/ollama/v1/chat/completions",
    "/v1/engines/hosted_vllm/Llama-3.1-70B-Instruct/chat/completions",
    "/v1/chat/completions" # Retest standard one
]

base = "https://tokenfactory.esprit.tn"

payload_chat = {
    "model": model_name,
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
}

payload_ollama = {
    "model": "llama3.1",
    "prompt": "Hello",
    "stream": False
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

print("VERIFYING PATHS ROUND 2...", flush=True)

for path in paths:
    url = f"{base}{path}"
    print(f"\nTesting: {url}", flush=True)
    
    # payload selection
    data = payload_ollama if "generate" in path or "ollama" in path else payload_chat
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=10, verify=False)
        print(f"Status: {response.status_code}", flush=True)
        print(f"Response: {response.text[:200]}", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)
