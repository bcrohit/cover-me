import json

from core.config import PROMPTS_DIR
from core.llm import call_llm
from utils import extract_json_block, get_prompt


def structure_parsed_cv(cv_content: str) -> dict:
    """Convert raw PDF text into structured profile JSON via LLM."""
    assert cv_content, "cv_content is required for profile structuring."
    input_data = {"cv_content": cv_content}
    system_message = get_prompt("system_profile.md", PROMPTS_DIR)
    user_content = get_prompt("user_profile.md", PROMPTS_DIR).format(
        USER_PROFILE=json.dumps(input_data, indent=4)
    )

    raw = call_llm(system_message, user_content)
    json_block = extract_json_block(raw).strip()
    return json.loads(json_block)
