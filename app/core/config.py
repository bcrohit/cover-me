from pathlib import Path

PROMPTS_DIR = Path("assets/prompts")
AGENT_PROMPTS_DIR = PROMPTS_DIR / "agents"
CONTENTS_DIR = Path("assets/contents")
TEMPLATES_DIR = Path("assets/templates")

LLM_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
LLM_TEMPERATURE = 0.3
LLM_MAX_RETRIES = 3
