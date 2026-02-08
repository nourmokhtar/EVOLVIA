
import requests
import json

api_key = "sk-031cf2545257449f8301e46466b480e9"
model_name = "hosted_vllm/Llama-3.1-70B-Instruct"

paths_to_test = [
    "/v1/chat/completions",
    "/v1/completions",
    "/chat/completions",
    "/completions",
    "/api/v1/chat/completions",
    "/api/chat",
    "/v1/generate",
    "/generate",
    "/api/generate",
    "/ollama/api/chat",
    "/ollama/v1/chat/completions"
]

base_domain = "https://tokenfactory.esprit.tn"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

payload_chat = {
    "model": model_name,
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
}

import urllib3
urllib3.disable_warnings()

print(f"Scanning paths on {base_domain} for model {model_name}...")

for path in paths_to_test:
    url = f"{base_domain}{path}"
    print(f"--------------------------------------------------")
    print(f"Scanning: {url}")
    
    # Try POST
    try:
        response = requests.post(url, json=payload_chat, headers=headers, timeout=5, verify=False)
        print(f"POST Status: {response.status_code}")
        if response.status_code not in [404, 405]:
            print(f"!!! POST SUCCESS/INTERESTING !!!")
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"POST Error: {e}")

    # Try GET
    try:
        response = requests.get(url, headers=headers, timeout=5, verify=False)
        print(f"GET Status: {response.status_code}")
    except Exception as e:
        print(f"GET Error: {e}")
