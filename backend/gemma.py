"""Gemma 4 via the hosted Gemini API (google-genai SDK). Not local inference."""
import json
import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

load_dotenv()


class GemmaError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.message, self.status = message, status


def _client():
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or key == "your_api_key_here":
        raise GemmaError("GEMINI_API_KEY is not set. Add it to your .env file (see README).", 500)
    timeout_ms = int(float(os.getenv("GEMMA_TIMEOUT_SECONDS", "90")) * 1000)
    return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=timeout_ms))


def generate_text(prompt: str) -> str:
    model = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")
    client = _client()
    try:
        resp = client.models.generate_content(
            model=model, contents=prompt, config=types.GenerateContentConfig(temperature=0.2))
        text = resp.text or ""
    except genai_errors.APIError as e:
        msg = str(e).lower()
        if e.code in (400, 401, 403) and ("api key" in msg or "api_key" in msg or e.code in (401, 403)):
            raise GemmaError("The Gemini API rejected the API key. Check GEMINI_API_KEY in .env.", 401)
        if e.code == 404:
            raise GemmaError(f"Model '{model}' not found. Check GEMMA_MODEL in .env.", 502)
        if e.code == 429:
            raise GemmaError("Rate limit or quota reached on the Gemini API. Wait a minute and retry.", 429)
        raise GemmaError(f"Gemini API error ({e.code}). Please try again.", 502)
    except Exception as e:  # network / timeout
        if "timeout" in type(e).__name__.lower() or "timed out" in str(e).lower() or "timeout" in str(e).lower():
            raise GemmaError("The model took too long to respond. Try again or shorten the inputs.", 504)
        raise GemmaError("Could not reach the Gemini API. Check your internet connection.", 502)
    if not text.strip():
        raise GemmaError("The model returned an empty response. Please retry.", 502)
    return text


def extract_json(text: str) -> dict:
    """Pull the first balanced JSON object out of model output (handles fences/prose/trailing commas)."""
    text = re.sub(r"```(?:json)?", "", text)
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON object found")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            esc = (c == "\\" and not esc)
            if c == '"' and not esc:
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                chunk = text[start:i + 1]
                try:
                    return json.loads(chunk)
                except json.JSONDecodeError:
                    return json.loads(re.sub(r",\s*([}\]])", r"\1", chunk))
    raise ValueError("unbalanced JSON")


def generate_json(prompt: str, validator):
    """Call Gemma, parse + validate; on failure ask the model once to repair its own output."""
    raw = generate_text(prompt)
    try:
        return validator(extract_json(raw))
    except Exception:
        from prompts import REPAIR
        raw2 = generate_text(REPAIR.format(bad=raw[:12000]))
        try:
            return validator(extract_json(raw2))
        except Exception:
            raise GemmaError("The model returned malformed output twice. Please try again.", 502)
