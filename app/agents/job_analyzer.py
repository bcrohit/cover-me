from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import JobAnalysis


def analyze_job(job_data: dict) -> JobAnalysis:
    payload = {
        "title": job_data.get("title", ""),
        "company": job_data.get("company", ""),
        "location": job_data.get("location", ""),
        "description": job_data.get("description", ""),
        "seniority": job_data.get("seniority", ""),
        "employmentType": job_data.get("employmentType", ""),
        "jobFunctions": job_data.get("jobFunctions", ""),
        "industries": job_data.get("industries", ""),
    }
    assert payload["description"], "jobData.description is required for job analysis."
    return call_structured_llm(
        "job_analyzer.md",
        payload,
        JobAnalysis,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
