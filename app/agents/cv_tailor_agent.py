from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import (
    CandidateAnalysis,
    JobAnalysis,
    MatchAnalysis,
    PositioningStrategy,
)
from schemas.documents import TailoredCV


def tailor_cv(
    profile: dict,
    job_analysis: JobAnalysis,
    candidate_analysis: CandidateAnalysis,
    match_analysis: MatchAnalysis,
    positioning_strategy: PositioningStrategy,
) -> TailoredCV:
    payload = {
        "profile": profile,
        "job_analysis": job_analysis.model_dump(),
        "candidate_analysis": candidate_analysis.model_dump(),
        "match_analysis": match_analysis.model_dump(),
        "positioning_strategy": positioning_strategy.model_dump(),
    }
    return call_structured_llm(
        "cv_tailor_agent.md",
        payload,
        TailoredCV,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
