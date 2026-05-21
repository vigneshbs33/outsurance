import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def call_ollama_api(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
    
    try:
        models_resp = requests.get(f"{ollama_host}/api/tags", timeout=2.0)
        if models_resp.status_code == 200:
            installed = [m["name"] for m in models_resp.json().get("models", [])]
            if installed and ollama_model not in installed:
                found = False
                for candidate in ["llama3.2:latest", "llama3:latest", "gemma4:latest"]:
                    for name in installed:
                        if candidate in name or name.startswith(candidate):
                            ollama_model = name
                            found = True
                            break
                    if found:
                        break
                if not found:
                    ollama_model = installed[0]
    except Exception:
        pass

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
        response = requests.post(url, headers=headers, json=payload, timeout=30.0)
        if response.status_code == 200:
            data = response.json()
            return data["message"]["content"].strip()
    except Exception:
        pass
    return None

def call_openai_api(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
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
    except Exception:
        pass
    return None

def call_gemini_fallback(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
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
    except Exception:
        pass
    return None

def generate_text(system_prompt: str, user_prompt: str, max_tokens: int = 150) -> str:
    local_text = call_ollama_api(system_prompt, user_prompt, max_tokens)
    if local_text:
        return local_text

    openai_text = call_openai_api(system_prompt, user_prompt, max_tokens)
    if openai_text:
        return openai_text

    gemini_text = call_gemini_fallback(system_prompt, user_prompt, max_tokens)
    if gemini_text:
        return gemini_text

    return "Based on your health metrics, this insurance plan is recommended for your profile."

def load_model():
    pass
