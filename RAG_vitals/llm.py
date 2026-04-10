"""
llm.py
------
Responsible for:
  - Initialising the Google Gemini generative AI client
  - Sending the augmented prompt to gemini-1.5-flash-latest
  - Parsing the model's JSON response safely with multiple fallback strategies
  - Returning a structured Python dict with the final answer

OPTIMIZATION CHANGES (v2):
  - temperature lowered from 0.2 → 0.0 for fully deterministic medical output
  - max_output_tokens raised to 2048 to accommodate chain-of-thought reasoning
  - JSON extractor now has 4 fallback strategies and validates all expected keys
  - Safe fallback dict returned on any parse failure (never crashes the pipeline)

Environment variable required:
    GEMINI_API_KEY  – your Google AI Studio API key
                      (https://aistudio.google.com/app/apikey)
"""

import json
import logging
import os
import re

import google.generativeai as genai

# ── Logger setup ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Model configuration ───────────────────────────────────────────────────────
GEMINI_MODEL      = "gemini-2.5-flash"
GENERATION_CONFIG = {
    "temperature":       0.0,    # v2: fully deterministic — critical for medical
    "top_p":             0.95,
    "top_k":             40,
    "max_output_tokens": 2048,   # v2: raised for chain-of-thought reasoning
}


def _get_api_key() -> str:
    """
    Read the Gemini API key from the environment.
    Raises a clear RuntimeError if it is not set.
    """
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set.\n"
            "Export it with:  export GEMINI_API_KEY='your-key-here'"
        )
    return key


def init_gemini() -> genai.GenerativeModel:
    """
    Configure the google-generativeai SDK and return a GenerativeModel
    instance ready to generate content.

    Returns
    -------
    genai.GenerativeModel
    """
    api_key = _get_api_key()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=GENERATION_CONFIG,
    )
    logger.info(f"Gemini model initialised: {GEMINI_MODEL}")
    return model


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from the model's raw text output.

    4-strategy cascade (most specific → most permissive):
      1. Strip markdown code fences (```json ... ```)
      2. Find first complete { ... } block using brace counting
         (handles nested braces correctly, unlike a simple regex)
      3. Regex fallback for simple flat JSON objects
      4. Try parsing the whole string as-is

    Parameters
    ----------
    text : str – raw LLM output

    Returns
    -------
    dict – parsed JSON as a Python dictionary

    Raises
    ------
    ValueError if no valid JSON object can be found after all strategies.
    """
    text = text.strip()

    # Strategy 1 — strip markdown code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 2 — brace-counting to find the outermost JSON object
    # This correctly handles nested objects unlike a greedy regex.
    start = text.find("{")
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break   # brace counting found a block but it's invalid JSON

    # Strategy 3 — greedy regex (last-resort for flat objects)
    match = re.search(r"\{[^{}]+\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Strategy 4 — parse the whole string
    return json.loads(text)


def generate_response(prompt: str, model: genai.GenerativeModel | None = None) -> dict:
    """
    Send the augmented RAG prompt to Gemini and return a structured dict.

    Expected output keys (matches the prompt in augmenter.py):
        disease   – identified condition
        risk      – LOW / MEDIUM / HIGH
        reasoning – supporting reasoning from the retrieved context
        action    – recommended next action for the patient

    Parameters
    ----------
    prompt : str                        – the full augmented prompt
    model  : genai.GenerativeModel|None – if None, a new instance is created

    Returns
    -------
    dict  – structured JSON response from Gemini

    Raises
    ------
    RuntimeError if the API call fails or the response cannot be parsed.
    """
    if model is None:
        model = init_gemini()

    logger.info("Sending prompt to Gemini …")
    logger.debug(f"Prompt (first 200 chars): {prompt[:200]}…")

    try:
        response = model.generate_content(prompt)
        raw_text = response.text
        logger.info("Gemini response received.")
        logger.debug(f"Raw response: {raw_text[:400]}")
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        raise RuntimeError(f"Gemini API error: {e}") from e

    # ── Parse JSON from LLM output ─────────────────────────────────────────
    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Could not parse JSON from Gemini response: {e}")
        logger.error(f"Raw text was:\n{raw_text}")
        # Graceful fallback: return raw text wrapped in a dict
        result = {
            "disease":   "PARSE_ERROR",
            "risk":      "UNKNOWN",
            "reasoning": raw_text,
            "action":    "Please review the raw response above.",
        }

    # ── Validate expected keys ─────────────────────────────────────────────
    expected_keys = {"disease", "risk", "reasoning", "action"}
    missing_keys  = expected_keys - result.keys()
    if missing_keys:
        logger.warning(f"LLM response missing keys: {missing_keys}")

    logger.info(f"Final parsed response: {result}")
    return result


# ── Quick smoke-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    test_prompt = """You are a medical AI assistant.

Context:
--- Source [1]: Diabetes (NIDDK) ---
Patient Query: What are symptoms of diabetes?
Medical Answer: Common symptoms include increased thirst, frequent urination, fatigue, and blurred vision.
Category: Diabetes

User Query: I feel very thirsty all the time and I urinate frequently.

Tasks:
1. Identify possible disease (Diabetes or Cardiac Arrest)
2. Assign risk level (LOW, MEDIUM, HIGH)
3. Provide reasoning
4. Suggest next action

Return STRICT JSON:
{"disease": "", "risk": "", "reasoning": "", "action": ""}"""

    response = generate_response(test_prompt)
    print("\n✅ Structured Response:")
    print(json.dumps(response, indent=2))
