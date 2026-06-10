import binascii

from flask import Blueprint, jsonify, request

from core.config import CONTENTS_DIR
from services.document_generation_service import DocumentGenerationService
from services.pipeline_service import PipelineService
from services.profile_service import resolve_profile
from utils import save_json

legacy_bp = Blueprint("legacy", __name__)


@legacy_bp.route("/api/jobdata", methods=["POST"])
def receive_job_data():
    """Legacy endpoint: runs analyze + generate-documents in one call for extension compat."""
    data = request.get_json() or {}
    try:
        assert isinstance(data, dict), "Request payload must be a JSON object."
        job_data = data.get("jobData")
        assert job_data is not None, "No job data retrieved."
        save_json("job_data.json", job_data, CONTENTS_DIR)

        profile = resolve_profile(data)
        save_json("profile.json", profile, CONTENTS_DIR)

        bundle = PipelineService.run(job_data, profile)
        analysis_dict = PipelineService.to_dict(bundle)
        save_json("analysis_bundle.json", analysis_dict, CONTENTS_DIR)

        result = DocumentGenerationService.generate(
            analysis_bundle=analysis_dict,
            profile=profile,
            job_data=job_data,
        )

        cover_letter = result["cover_letter"]
        tailored_cv = result["tailored_cv"]
        cv_content = {
            "cv_text": tailored_cv.get("cv_text", ""),
            "candidate_details": tailored_cv.get("candidate_details", {}),
        }

        save_json("cover_letter.json", cover_letter, CONTENTS_DIR)
        save_json("cv.json", cv_content, CONTENTS_DIR)

        return jsonify(
            {
                "status": "success",
                "message": "Cover letter and CV generated.",
                "analysis_bundle": analysis_dict,
                "cover_letter": cover_letter,
                "cv_content": cv_content,
                "preview": {
                    "coverLetter": cover_letter,
                    "cv": cv_content,
                    "analysis": analysis_dict,
                },
                "profile": profile,
                "jobData": job_data,
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except binascii.Error:
        return jsonify({"status": "error", "message": "Invalid base64 payload."}), 400
    except Exception as e:
        print("Jobdata error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
