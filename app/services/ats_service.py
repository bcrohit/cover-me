from core.config import AGENT_PROMPTS_DIR
from core.llm import call_structured_llm
from schemas.analysis import JobAnalysis
from schemas.documents import ATSScore, TailoredCV


def score_ats(job_analysis: JobAnalysis, cv: TailoredCV | dict) -> ATSScore:
    cv_payload = cv.model_dump() if isinstance(cv, TailoredCV) else cv
    payload = {
        "job_analysis": job_analysis.model_dump() if isinstance(job_analysis, JobAnalysis) else job_analysis,
        "cv": cv_payload,
    }
    return call_structured_llm(
        "ats_scorer.md",
        payload,
        ATSScore,
        prompt_dir=AGENT_PROMPTS_DIR,
    )
