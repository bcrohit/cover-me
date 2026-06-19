import json
import os
from typing import TypeVar

from dotenv import load_dotenv
from groq import Groq
from google import genai
from pydantic import BaseModel, ValidationError

from core.config import LLM_MAX_RETRIES, LLM_MODEL, LLM_TEMPERATURE, GENAI_MODEL
from utils import extract_json_block, get_prompt

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
assert api_key, "GROQ_API_KEY is required for LLM pipeline."

groq = Groq(api_key=api_key)
google = genai.Client()

T = TypeVar("T", bound=BaseModel)


def call_llm_groq(system_message: str, user_message: str, temperature: float = LLM_TEMPERATURE) -> str:
    response = groq.chat.completions.create(
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        model=LLM_MODEL,
        temperature=temperature,
        stream=False,
    )
    return response.choices[0].message.content or ""

def call_llm(system_message: str, user_message: str):
    response = google.models.generate_content(
        model=GENAI_MODEL,
        contents=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
    )
    return response.text


def call_structured_llm(
    prompt_file: str,
    user_payload: dict,
    response_model: type[T],
    prompt_dir=None,
    temperature: float = LLM_TEMPERATURE,
    max_retries: int = LLM_MAX_RETRIES,
) -> T:
    """Call LLM and validate response against a Pydantic model, retrying on invalid JSON."""
    system_message = get_prompt(prompt_file, prompt_dir)
    user_message = json.dumps(user_payload, indent=2, ensure_ascii=False)
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            raw = call_llm(system_message, user_message, temperature=temperature)
            json_block = extract_json_block(raw).strip()
            parsed = json.loads(json_block)
            return response_model.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            last_error = exc
            user_message = (
                f"{json.dumps(user_payload, indent=2, ensure_ascii=False)}\n\n"
                f"Your previous response was invalid ({exc}). "
                "Return ONLY a valid JSON object matching the required schema. "
                "No markdown, no code fences, no extra text."
            )

    assert last_error is not None
    raise RuntimeError(
        f"LLM failed to produce valid JSON after {max_retries} attempts: {last_error}"
    ) from last_error
