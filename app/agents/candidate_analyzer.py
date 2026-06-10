from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import CandidateAnalysis


def analyze_candidate(profile: dict) -> CandidateAnalysis:
    assert profile, "profile is required for candidate analysis."
    return call_structured_llm(
        "candidate_analyzer.md",
        {"profile": profile},
        CandidateAnalysis,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
