import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def call_ollama_api(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "gemma3:1b")
    
    url = f"{ollama_host}/api/chat"
    payload = {
        "model": ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": max_tokens
        }
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=40.0)
        if response.status_code == 200:
            data = response.json()
            return data["message"]["content"].strip()
        else:
            print(f"[WARN] Local Ollama returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[WARN] Local Ollama call failed (is Ollama running?): {e}")
    return None

def call_openai_api(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[WARN] OPENAI_API_KEY environment variable is not set.")
        return None
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15.0)
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            print(f"[WARN] OpenAI API returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[WARN] OpenAI call timed out or failed: {e}")
    return None

def call_gemini_fallback(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[WARN] GEMINI_API_KEY environment variable is not set.")
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_prompt}\n\n{user_prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.3
        }
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15.0)
        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        else:
            print(f"[WARN] Gemini API returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[WARN] Gemini fallback timed out or failed: {e}")
    return None

def generate_text(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    # 1. Primary: Local Ollama (e.g. gemma3:1b)
    local_text = call_ollama_api(system_prompt, user_prompt, max_tokens)
    if local_text:
        return local_text

    # Disable other fallbacks (Only Ollama allowed for now)
    raise RuntimeError("Local Ollama failed to generate a response, and fallbacks are currently disabled.")

def load_model():
    pass

