
import requests
import urllib3
import os
urllib3.disable_warnings()

api_key = os.getenv("GROK_API_KEY") or "sk-031cf2545257449f8301e46466b480e9"
# Common OpenWebUI path for OpenAI compatibility is /api
url = "https://tokenfactory.esprit.tn/api/chat/completions"
model = "hosted_vllm/Llama-3.1-70B-Instruct"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": model,
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 5
}

print(f"Testing OpenWebUI Path: {url}")
try:
    r = requests.post(url, json=payload, headers=headers, verify=False, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
