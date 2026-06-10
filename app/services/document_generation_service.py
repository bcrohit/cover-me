from agents.cover_letter_agent import generate_cover_letter
from agents.cv_tailor_agent import tailor_cv
from schemas.analysis import AnalysisBundle, CandidateAnalysis, JobAnalysis, MatchAnalysis, PositioningStrategy
from schemas.documents import CoverLetter, TailoredCV


class DocumentGenerationService:
    """Generates final documents from an analysis bundle."""

    @staticmethod
    def generate(
        analysis_bundle: dict,
        profile: dict,
        job_data: dict,
        edited_user_inputs: dict | None = None,
    ) -> dict:
        bundle = AnalysisBundle(
            job_analysis=JobAnalysis(**analysis_bundle["job_analysis"]),
            candidate_analysis=CandidateAnalysis(**analysis_bundle["candidate_analysis"]),
            match_analysis=MatchAnalysis(**analysis_bundle["match_analysis"]),
            positioning_strategy=PositioningStrategy(**analysis_bundle["positioning_strategy"]),
        )

        cover_letter = generate_cover_letter(
            bundle.job_analysis,
            bundle.candidate_analysis,
            bundle.positioning_strategy,
            job_data,
        )
        tailored_cv = tailor_cv(
            profile,
            bundle.job_analysis,
            bundle.candidate_analysis,
            bundle.match_analysis,
            bundle.positioning_strategy,
        )

        if edited_user_inputs:
            if edited_user_inputs.get("cover_letter"):
                cover_letter = CoverLetter(**{**cover_letter.model_dump(), **edited_user_inputs["cover_letter"]})
            if edited_user_inputs.get("tailored_cv"):
                tailored_cv = TailoredCV(**{**tailored_cv.model_dump(), **edited_user_inputs["tailored_cv"]})

        return {
            "cover_letter": cover_letter.model_dump(),
            "tailored_cv": tailored_cv.model_dump(),
        }
