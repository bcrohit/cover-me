import os
import json
import re
from pathlib import Path
from groq import Groq

PROMPTS_DIR = Path("assets/prompts")
LLM_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def get_prompt(prompt_file, prompt_dir=r"assets\prompts"):
    """Load a prompt from a file.

    Args:
        prompt_file (str): Name of the prompt file.
        prompt_dir (str, optional): Path to the prompt directory. Defaults to 'assets/prompts'.

    Returns:
        str: prompt
    """
    prompt_path = os.path.join(prompt_dir, prompt_file)
    return open(prompt_path, "r", encoding="utf-8").read()


def get_job_data(job_data_file, job_data_dir=r"assets\contents"):
    """Load job data from a file.

    Args:
        job_data_file (str): Name of the job data file.
        job_data_dir (str, optional): Path to the job data directory. Defaults to 'assets/contents'.

    Returns:
        dict: job data
    """
    job_data_path = os.path.join(job_data_dir, job_data_file)
    return json.load(open(job_data_path, "r", encoding="utf-8"))


def extract_json_block(text: str):
    """Extract a fenced JSON block if present, otherwise return original text."""
    match = re.search(r"```json(.*)```", text or "", re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"```(.*)```", text or "", re.DOTALL)
    if match:
        return match.group(1)
    return text or ""


def generate_cover_content(job: dict, profile: dict):
    """Call the LLM and return parsed JSON output + raw response text."""
    api_key = os.environ.get("GROQ_API_KEY")
    assert api_key, "GROQ_API_KEY is required for /api/coverletter"

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

    client = Groq(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[system_message, user_message], model=LLM_MODEL, stream=False
    )

    response_text = (chat_completion.choices[0].message.content or "").strip()
    json_block = extract_json_block(response_text).strip()
    parsed = json.loads(json_block)
    return parsed, response_text
