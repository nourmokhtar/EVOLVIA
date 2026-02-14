
import requests
import json
import urllib3
import os
urllib3.disable_warnings()

api_key = os.getenv("GROK_API_KEY") or "sk-031cf2545257449f8301e46466b480e9"
base_domain = "https://tokenfactory.esprit.tn"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print(f"--- Step 1: Fetching Model Name from {base_domain}/v1/models ---")
model_id = None
try:
    resp = requests.get(f"{base_domain}/v1/models", headers=headers, verify=False, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        # Handle list in 'data' or 'data.data'
        models = data.get('data', data) if isinstance(data.get('data'), list) else data
        if not isinstance(models, list): 
             # maybe top level list
             if isinstance(data, list): models = data
             else: models = []
        
        if models:
            model_id = models[0].get('id')
            print(f"✅ Found Model ID: {model_id}")
            print(f"   Full list: {[m.get('id') for m in models]}")
        else:
            print("❌ No models in list.")
    else:
        print(f"❌ Failed to list models. Status: {resp.status_code}")
except Exception as e:
    print(f"❌ Error fetching models: {e}")

if not model_id:
    model_id = "hosted_vllm/Llama-3.1-70B-Instruct" # Fallback
    print(f"⚠️ Using fallback model ID: {model_id}")

print(f"\n--- Step 2: Testing POST Endpoints with model '{model_id}' ---")

endpoints = [
    "/v1/chat/completions",
    "/v1/chat",
    "/chat/completions",
    "/api/chat",
    "/api/v1/chat",
    "/v1/engines/{model}/chat/completions",
    "/openai/deployments/{model}/chat/completions",
    "/ollama/v1/chat/completions",
    "/ollama/api/chat"
]

payload = {
    "model": model_id,
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 5
}

for ep in endpoints:
    # Replace {model} placeholder if present
    path = ep.format(model=model_id)
    url = f"{base_domain}{path}"
    
    # Adjust payload for Ollama native
    curr_payload = payload.copy()
    if "ollama/api/chat" in path:
        curr_payload["stream"] = False
        
    try:
        print(f"Testing POST {url} ... ", end="", flush=True)
        r = requests.post(url, json=curr_payload, headers=headers, verify=False, timeout=10)
        print(f"Status: {r.status_code}")
        
        if r.status_code == 200:
            print(f"🎉 SUCCCESS! Response: {r.text[:200]}")
            print(f"!!! FOUND WORKING ENDPOINT: {path} !!!")
            break
        elif r.status_code != 404 and r.status_code != 405:
            print(f"   Make note: {r.status_code} - {r.text[:100]}")
            
    except Exception as e:
        print(f"Error: {e}")
