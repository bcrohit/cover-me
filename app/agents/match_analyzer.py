from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import CandidateAnalysis, JobAnalysis, MatchAnalysis


def analyze_match(job_analysis: JobAnalysis, candidate_analysis: CandidateAnalysis) -> MatchAnalysis:
    payload = {
        "job_analysis": job_analysis.model_dump(),
        "candidate_analysis": candidate_analysis.model_dump(),
    }
    return call_structured_llm(
        "match_analyzer.md",
        payload,
        MatchAnalysis,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
