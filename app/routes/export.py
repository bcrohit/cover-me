import io

from flask import Blueprint, jsonify, request, send_file

from core.config import CONTENTS_DIR
from services.document_service import (
    build_cover_letter_docx,
    build_cv_docx,
    build_cv_pdf,
    render_latex_cover_pdf,
)
from utils import save_json

export_bp = Blueprint("export", __name__)


@export_bp.route("/api/generate", methods=["POST"])
def export_documents():
    """Export PDF/DOCX for cover letter or CV from reviewed payload."""
    try:
        payload = request.get_json() or {}
        output_format = payload.get("outputFormat")
        document_type = payload.get("documentType")

        profile = payload.get("profile")
        job_data = payload.get("jobData")
        cover_letter = payload.get("coverLetter")
        cv_payload = payload.get("cv")

        if payload.get("coverTextEdited"):
            cover_letter["body"] = payload.get("coverTextEdited")
        if payload.get("cvTextEdited"):
            cv_payload["cv_text"] = payload.get("cvTextEdited")

        save_json("cover_letter.json", cover_letter, CONTENTS_DIR)
        save_json("cv.json", cv_payload, CONTENTS_DIR)

        candidate_name = (profile.get("name", "candidate") or "candidate").strip().replace(" ", "_")
        wants_docx = output_format in {"word", "docx"}

        if document_type == "cover_letter" and not wants_docx:
            file_bytes = render_latex_cover_pdf(profile, job_data, cover_letter)
            mimetype = "application/pdf"
            download_name = f"{candidate_name}_cover_letter.pdf"
        elif document_type == "cover_letter" and wants_docx:
            file_bytes = build_cover_letter_docx(profile, job_data, cover_letter)
            mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            download_name = f"{candidate_name}_cover_letter.docx"
        elif document_type == "cv" and not wants_docx:
            file_bytes = build_cv_pdf(cv_payload)
            mimetype = "application/pdf"
            download_name = f"{candidate_name}_cv.pdf"
        else:
            file_bytes = build_cv_docx(profile, cv_payload)
            mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            download_name = f"{candidate_name}_cv.docx"

        return send_file(
            io.BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=download_name,
        )
    except Exception as e:
        print("Export error:", e)
        return jsonify({"error": str(e)}), 500
