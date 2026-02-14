
import requests
import os
import urllib3
urllib3.disable_warnings()

api_key = "sk-031cf2545257449f8301e46466b480e9"
url = "https://tokenfactory.esprit.tn/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print(f"Testing POST to {url}")
try:
    resp = requests.post(url, json={"model": "gpt-4", "messages": []}, headers=headers, verify=False, timeout=10)
    print(f"Status: {resp.status_code}")
    print(f"Headers: {dict(resp.headers)}")
    print(f"Allow Header: {resp.headers.get('Allow', 'Not Present')}")
except Exception as e:
    print(f"Error: {e}")
