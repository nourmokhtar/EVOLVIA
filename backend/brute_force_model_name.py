
import requests
import urllib3
urllib3.disable_warnings()

api_key = "sk-031cf2545257449f8301e46466b480e9"
endpoint = "https://tokenfactory.esprit.tn/ollama/v1/chat/completions"

# Based on common Ollama/vLLM mappings
candidate_names = [
    "llama3.1",
    "llama3.1:70b",
    "llama-3.1-70b-instruct",
    "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "hosted_vllm/Llama-3.1-70B-Instruct", # Retest
    "Llama-3.1-70B-Instruct",
    "llama3",
    "gpt-4" # Sometimes proxies map gpt-4 to the internal model
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# Test Native Ollama Endpoint
endpoint_native = "https://tokenfactory.esprit.tn/ollama/api/chat"

print(f"\nTesting Native Ollama: {endpoint_native}", flush=True)
for model in candidate_names:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "stream": False
    }
    try:
        response = requests.post(endpoint_native, json=payload, headers=headers, timeout=10, verify=False)
        print(f"Model: {model} -> Status: {response.status_code}", flush=True)
        if response.status_code == 200:
             print(f"!!! SUCCESS !!!", flush=True)
             print(f"Response: {response.text[:200]}", flush=True)
             break
        elif response.status_code != 404 and response.status_code != 403:
             print(f"Response: {response.text[:200]}", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)
