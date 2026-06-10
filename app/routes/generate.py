from flask import Blueprint, jsonify, request

from core.config import CONTENTS_DIR
from services.document_generation_service import DocumentGenerationService
from utils import save_json

generate_bp = Blueprint("generate", __name__)


@generate_bp.route("/api/generate-documents", methods=["POST"])
def generate_documents():
    """Generate cover letter and tailored CV from an analysis bundle."""
    data = request.get_json() or {}
    try:
        analysis_bundle = data.get("analysis_bundle")
        assert analysis_bundle, "analysis_bundle is required."

        profile = data.get("profile")
        job_data = data.get("jobData")
        assert profile, "profile is required."
        assert job_data, "jobData is required."

        edited_user_inputs = data.get("edited_user_inputs")

        result = DocumentGenerationService.generate(
            analysis_bundle=analysis_bundle,
            profile=profile,
            job_data=job_data,
            edited_user_inputs=edited_user_inputs,
        )

        save_json("cover_letter.json", result["cover_letter"], CONTENTS_DIR)
        save_json("cv.json", result["tailored_cv"], CONTENTS_DIR)

        cover_letter = result["cover_letter"]
        tailored_cv = result["tailored_cv"]

        return jsonify(
            {
                "status": "success",
                "message": "Documents generated.",
                "cover_letter": cover_letter,
                "tailored_cv": tailored_cv,
                "preview": {
                    "coverLetter": cover_letter,
                    "cv": {
                        "cv_text": tailored_cv.get("cv_text", ""),
                        "candidate_details": tailored_cv.get("candidate_details", {}),
                    },
                    "analysis": analysis_bundle,
                },
                "analysis_bundle": analysis_bundle,
                "profile": profile,
                "jobData": job_data,
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        print("Generate documents error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
