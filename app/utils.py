import os
import json
import re
from pathlib import Path
from groq import Groq
from io import BytesIO
from PyPDF2 import PdfReader

PROMPTS_DIR = Path("assets/prompts")

def get_prompt(prompt_file, prompt_dir=PROMPTS_DIR):
    """Load a prompt from a file.

    Args:
        prompt_file (str): Name of the prompt file.
        prompt_dir (str, optional): Path to the prompt directory. Defaults to 'assets/prompts'.

    Returns:
        str: prompt
    """
    prompt_path = os.path.join(prompt_dir, prompt_file)
    return open(prompt_path, "r", encoding="utf-8").read()

def extract_json_block(text: str):
    """Extract a fenced JSON block if present, otherwise return original text."""
    match = re.search(r"```json(.*)```", text or "", re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"```(.*)```", text or "", re.DOTALL)
    if match:
        return match.group(1)
    return text or ""


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


def parse_pdf(base64_string_decoded: bytes):
    """Parse a PDF file from a base64 string."""
    pdf_file = BytesIO(base64_string_decoded) # Load into memory buffer
    reader = PdfReader(pdf_file) # Read PDF
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    return text