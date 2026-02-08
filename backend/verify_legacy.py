
import requests
import urllib3
urllib3.disable_warnings()

api_key = "sk-031cf2545257449f8301e46466b480e9"
endpoint = "https://tokenfactory.esprit.tn/v1/completions"
model_name = "hosted_vllm/Llama-3.1-70B-Instruct"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": model_name,
    "prompt": "Hello",
    "max_tokens": 10
}

print(f"Testing Legacy Completions: {endpoint}", flush=True)

try:
    response = requests.post(endpoint, json=payload, headers=headers, timeout=10, verify=False)
    print(f"Status: {response.status_code}", flush=True)
    print(f"Response: {response.text[:500]}", flush=True)
except Exception as e:
    print(f"Error: {e}", flush=True)
