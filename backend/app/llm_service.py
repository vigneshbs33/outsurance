import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

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
    # 1. Primary: OpenAI API
    openai_text = call_openai_api(system_prompt, user_prompt, max_tokens)
    if openai_text:
        return openai_text

    # 2. Fallback: Gemini API
    gemini_text = call_gemini_fallback(system_prompt, user_prompt, max_tokens)
    if gemini_text:
        return gemini_text

    # 3. No Hardcoded Fallbacks! It's real production now.
    raise RuntimeError("Both OpenAI and Gemini APIs failed to generate a response. No fallback available in production mode.")

def load_model():
    pass

