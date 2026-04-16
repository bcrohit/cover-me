
from groq import Groq
from pathlib import Path
import os
import json
from utils import get_prompt, extract_json_block
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
assert api_key, "GROQ_API_KEY is required for /api/coverletter"

groq = Groq(api_key=api_key)

PROMPTS_DIR = Path("assets/prompts")
LLM_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def call_llm(system_message: str, user_message: str):
    """Call the LLM and return the response."""
    response = groq.chat.completions.create(
        messages=[system_message, user_message], model=LLM_MODEL, stream=False
    )
    return response.choices[0].message.content

def generate_cover_content(job: dict, profile: dict):
    """Prepare the input data and call the LLM to generate the cover content."""
    input_data = {
        "job_description": job.get("description", ""),
        "candidate_details": profile or {},
    }
    assert input_data["job_description"], (
        "jobData.description is required for /api/coverletter"
    )

    system_message = {"role": "system", "content": get_prompt("system.md", PROMPTS_DIR)}
    user_content = get_prompt("user.md", PROMPTS_DIR).format(
        JSON_DATA=json.dumps(input_data, indent=4)
    )
    user_message = {"role": "user", "content": user_content}

    response_text = call_llm(system_message, user_message)
    json_block = extract_json_block(response_text).strip()
    parsed = json.loads(json_block)
    return parsed

def structure_parsed_cv(cv_content: str):
    """Prepare input to structure the parsed CV content into a dictionary via LLM."""
    input_data = {
        "cv_content": cv_content
    }
    assert input_data["cv_content"], (
        "cv_content is required for /api/structure-parsed-cv"
    )
    system_message = {"role": "system", "content": get_prompt("system_profile.md", PROMPTS_DIR)}
    user_content = get_prompt("user_profile.md", PROMPTS_DIR).format(
        CV_PARSED=json.dumps(input_data, indent=4)
    )
    user_message = {"role": "user", "content": user_content}
    response_text = call_llm(system_message, user_message)
    json_block = extract_json_block(response_text).strip()
    parsed = json.loads(json_block)
    return parsed