from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import CandidateAnalysis, JobAnalysis, PositioningStrategy
from schemas.documents import CoverLetter


def generate_cover_letter(
    job_analysis: JobAnalysis,
    candidate_analysis: CandidateAnalysis,
    positioning_strategy: PositioningStrategy,
    job_data: dict,
) -> CoverLetter:
    payload = {
        "job_analysis": job_analysis.model_dump(),
        "candidate_analysis": candidate_analysis.model_dump(),
        "positioning_strategy": positioning_strategy.model_dump(),
        "job_metadata": {
            "title": job_data.get("title", ""),
            "company": job_data.get("company", ""),
            "location": job_data.get("location", ""),
        },
    }
    return call_structured_llm(
        "cover_letter_agent.md",
        payload,
        CoverLetter,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
