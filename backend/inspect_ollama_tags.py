
import requests
import json
import urllib3
urllib3.disable_warnings()

api_key = "sk-031cf2545257449f8301e46466b480e9"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

url = "https://tokenfactory.esprit.tn/ollama/api/tags"

print(f"GET {url}")
try:
    response = requests.get(url, headers=headers, timeout=5, verify=False)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"JSON: {json.dumps(data, indent=2)}")
        except:
            print(f"Response (not JSON): {response.text[:200]}")
    else:
        print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
