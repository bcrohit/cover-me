import binascii

from flask import Blueprint, jsonify, request

from core.config import CONTENTS_DIR
from services.cache_service import load_cached_analysis, save_analysis_cache
from services.pipeline_service import PipelineService
from services.profile_service import resolve_profile
from utils import save_json

analyze_bp = Blueprint("analyze", __name__)


@analyze_bp.route("/api/analyze", methods=["POST"])
def analyze():
    """Run the 4-stage analysis pipeline. Results are cached for reuse."""
    data = request.get_json() or {}
    try:
        assert isinstance(data, dict), "Request payload must be a JSON object."
        job_data = data.get("jobData")
        assert job_data is not None, "jobData is required."

        save_json("job_data.json", job_data, CONTENTS_DIR)

        if data.get("profileMode"):
            profile = resolve_profile(data)
        else:
            profile = data.get("profile")
            assert profile, "profile is required."

        save_json("profile.json", profile, CONTENTS_DIR)

        use_cache = data.get("useCache", True)
        if use_cache:
            cached = load_cached_analysis(job_data, profile)
            if cached:
                return jsonify(
                    {
                        "status": "success",
                        "message": "Analysis loaded from cache.",
                        "cache_key": cached.get("cache_key"),
                        "analysis_bundle": cached.get("analysis_bundle"),
                        "profile": profile,
                        "jobData": job_data,
                    }
                )

        bundle = PipelineService.run(job_data, profile)
        analysis_dict = PipelineService.to_dict(bundle)
        cache_key = save_analysis_cache(job_data, profile, analysis_dict)

        return jsonify(
            {
                "status": "success",
                "message": "Analysis complete.",
                "cache_key": cache_key,
                "analysis_bundle": analysis_dict,
                "profile": profile,
                "jobData": job_data,
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except binascii.Error:
        return jsonify({"status": "error", "message": "Invalid base64 payload."}), 400
    except Exception as e:
        print("Analyze error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
