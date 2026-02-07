import requests
import sys

try:
    response = requests.get("http://localhost:8000/api/v1/learn/sessions", timeout=5)
    print(f"Status: {response.status_code}")
    print(response.text[:500])
except Exception as e:
    print(f"Error: {e}")
