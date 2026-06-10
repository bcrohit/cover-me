from flask import Blueprint, jsonify, request

from schemas.analysis import JobAnalysis
from schemas.documents import TailoredCV
from services.ats_service import score_ats

ats_bp = Blueprint("ats", __name__)


@ats_bp.route("/api/ats-score", methods=["POST"])
def ats_score():
    """Score ATS keyword coverage for a tailored CV against job analysis."""
    data = request.get_json() or {}
    try:
        job_analysis_raw = data.get("job_analysis")
        cv_raw = data.get("cv")
        assert job_analysis_raw, "job_analysis is required."
        assert cv_raw, "cv is required."

        job_analysis = JobAnalysis(**job_analysis_raw)
        cv = TailoredCV(**cv_raw) if isinstance(cv_raw, dict) and "cv_text" in cv_raw else cv_raw

        score = score_ats(job_analysis, cv)

        return jsonify(
            {
                "status": "success",
                "ats_score": score.model_dump(),
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        print("ATS score error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
