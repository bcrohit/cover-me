from agents.candidate_analyzer import analyze_candidate
from agents.job_analyzer import analyze_job
from agents.match_analyzer import analyze_match
from agents.positioning_agent import build_positioning_strategy
from schemas.analysis import AnalysisBundle


class PipelineService:
    """Orchestrates the multi-stage analysis pipeline."""

    @staticmethod
    def run(job_data: dict, profile: dict) -> AnalysisBundle:
        job_analysis = analyze_job(job_data)
        candidate_analysis = analyze_candidate(profile)
        match_analysis = analyze_match(job_analysis, candidate_analysis)
        positioning_strategy = build_positioning_strategy(
            job_analysis, candidate_analysis, match_analysis
        )
        return AnalysisBundle(
            job_analysis=job_analysis,
            candidate_analysis=candidate_analysis,
            match_analysis=match_analysis,
            positioning_strategy=positioning_strategy,
        )

    @staticmethod
    def to_dict(bundle: AnalysisBundle) -> dict:
        return {
            "job_analysis": bundle.job_analysis.model_dump(),
            "candidate_analysis": bundle.candidate_analysis.model_dump(),
            "match_analysis": bundle.match_analysis.model_dump(),
            "positioning_strategy": bundle.positioning_strategy.model_dump(),
        }
