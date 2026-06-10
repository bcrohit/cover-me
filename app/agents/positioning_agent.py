from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import (
    CandidateAnalysis,
    JobAnalysis,
    MatchAnalysis,
    PositioningStrategy,
)


def build_positioning_strategy(
    job_analysis: JobAnalysis,
    candidate_analysis: CandidateAnalysis,
    match_analysis: MatchAnalysis,
) -> PositioningStrategy:
    payload = {
        "job_analysis": job_analysis.model_dump(),
        "candidate_analysis": candidate_analysis.model_dump(),
        "match_analysis": match_analysis.model_dump(),
    }
    return call_structured_llm(
        "positioning_agent.md",
        payload,
        PositioningStrategy,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
