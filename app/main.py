import base64
import binascii
import io
import json
from pathlib import Path

from docx import Document
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from utils import get_job_data, parse_pdf
from chat_utils import generate_cover_content, structure_parsed_cv
app = Flask(__name__)
CORS(app)
CONTENTS_DIR = Path("assets/contents")

load_dotenv()


def save_json(filename: str, payload: dict):
    CONTENTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONTENTS_DIR / filename, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def has_profile_content(profile: dict) -> bool:
    return any(bool(value) for value in profile.values())


@app.route("/api/jobdata", methods=["POST"])
def receive_job_data():
    data = request.get_json() or {}
    print("Received profile/job data")
    # Unified endpoint: accepts manual profile, uploaded CV PDF, and/or job data.
    try:
        assert isinstance(data, dict), "Request payload must be a JSON object."
        profile_mode = data.get("profileMode")
        profile = data.get("profile")
        encoded_data = data.get("data", "")
        filename = data.get("filename", "")
        parsed_cv_profile_saved = False
        job_saved = False
        profile_saved = False

        if encoded_data:
            decoded_bytes = base64.b64decode(encoded_data, validate=True)
            assert decoded_bytes.startswith(b"%PDF"), "Uploaded file is not a valid PDF."

            extracted_text = parse_pdf(decoded_bytes)
            structured_cv = structure_parsed_cv(extracted_text)
            assert has_profile_content(structured_cv), "Parsed CV profile is empty."
            save_json("profile.json", structured_cv)
            parsed_cv_profile_saved = True

        if "jobData" in data:
            save_json("job_data.json", data.get("jobData"))
            job_saved = True
        elif "profileMode" not in data and "data" not in data and "profile" not in data:
            # Legacy payload: treat entire dict as raw job data.
            save_json("job_data.json", data)
            job_saved = True

        if profile_mode == "manual":
            assert isinstance(profile, dict), "profile must be a dictionary in manual mode."
            save_json("profile.json", profile)
            profile_saved = True
        elif profile_mode == "upload":
            pass
        elif isinstance(profile, dict) and has_profile_content(profile):
            # Legacy payloads without profileMode can still update profile when non-empty.
            save_json("profile.json", profile)
            profile_saved = True

        assert (
            parsed_cv_profile_saved or job_saved or profile_saved
        ), "No profile or job data provided."

        return jsonify(
            {
                "status": "success",
                "message": "Data received",
                "profile_saved": parsed_cv_profile_saved or profile_saved,
                "job_saved": job_saved,
                "filename": filename,
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except binascii.Error:
        return jsonify({"status": "error", "message": "Invalid base64 payload."}), 400
    except Exception as e:
        print("Error saving data:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/coverletter", methods=["POST"])
def generate_coverletter():
    """Generate custom cover letter from jobData (+ optional profile) using LLM."""
    payload = request.get_json() or {}

    try:
        if isinstance(payload, dict) and "jobData" in payload:
            job = payload.get("jobData") or {}
            profile = payload.get("profile") or {}
        else:
            job = payload if isinstance(payload, dict) else {}
            profile = {}

        # Fallback to saved profile when omitted.
        if not profile:
            profile_path = CONTENTS_DIR / "profile.json"
            if profile_path.exists():
                profile = get_job_data("profile.json", CONTENTS_DIR)

        llm_output = generate_cover_content(job, profile)

        CONTENTS_DIR.mkdir(parents=True, exist_ok=True)
        with open(CONTENTS_DIR / "output.json", "w", encoding="utf-8") as fp:
            json.dump(llm_output, fp, ensure_ascii=False, indent=2)

        return jsonify(
            {
                "status": "success",
                "message": "Cover letter generated.",
                "output": llm_output,
            }
        )
    except AssertionError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except json.JSONDecodeError as e:
        return jsonify(
            {
                "status": "error",
                "message": f"LLM output is not valid JSON: {e}",
            }
        ), 500
    except Exception as e:
        print("Cover letter generation error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/generate", methods=["POST"])
def generate_documents():
    """Generates a preview, DOCX and PDF from jobData and profile and returns files as base64."""
    payload = request.get_json() or {}
    # Accept either { jobData, profile } or read saved files
    profile = payload.get("profile") or {}

    try:
        if not profile:
            profile_path = CONTENTS_DIR / "profile.json"
            if profile_path.exists():
                profile = get_job_data("profile.json", CONTENTS_DIR)

        # Build a simple preview text (cover letter + CV summary)
        name = profile.get("name", "")
        skills = profile.get("skills", "")
        experience = profile.get("experience", "")
        projects = profile.get("projects", "")

        cover_lines = (
            get_job_data("output.json", CONTENTS_DIR)
            .get("cover_letter", "")
            .split("\n")
        )
        preview = "\n".join(cover_lines)

        # Create DOCX
        doc = Document()
        if name:
            doc.add_heading(name, level=1)
        doc.add_heading("Cover Letter", level=2)
        for line in cover_lines:
            doc.add_paragraph(line)

        doc.add_page_break()
        doc.add_heading("Curriculum Vitae", level=2)
        if experience:
            doc.add_heading("Experience", level=3)
            doc.add_paragraph(experience)
        if projects:
            doc.add_heading("Projects", level=3)
            for p in [s.strip() for s in projects.split(",") if s.strip()]:
                doc.add_paragraph(p, style="List Bullet")
        if skills:
            doc.add_heading("Skills", level=3)
            doc.add_paragraph(skills)

        docx_buffer = io.BytesIO()
        doc.save(docx_buffer)
        docx_bytes = docx_buffer.getvalue()
        docx_b64 = base64.b64encode(docx_bytes).decode("utf-8")

        # Create a simple PDF using reportlab
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        width, height = letter
        textobj = c.beginText(40, height - 40)
        textobj.setFont("Helvetica", 11)
        for paragraph in cover_lines:
            # Simple wrapping
            for line in paragraph.split("\n"):
                textobj.textLine(line)
            textobj.textLine("")
        c.drawText(textobj)
        c.showPage()

        # Append basic CV lines
        textobj = c.beginText(40, height - 40)
        textobj.setFont("Helvetica-Bold", 12)
        textobj.textLine("Curriculum Vitae")
        textobj.textLine("")
        textobj.setFont("Helvetica", 11)
        if experience:
            textobj.textLine("Experience:")
            for experience_line in experience.split("\n"):
                textobj.textLine("- " + experience_line)
            textobj.textLine("")
        if projects:
            textobj.textLine("Projects:")
            for p in [s.strip() for s in projects.split(",") if s.strip()]:
                textobj.textLine("- " + p)
            textobj.textLine("")
        if skills:
            textobj.textLine("Skills: " + skills)

        c.drawText(textobj)
        c.showPage()
        c.save()

        pdf_bytes = pdf_buffer.getvalue()
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        files = [
            {
                "filename": f"{(name or 'candidate').replace(' ', '_')}_cover_and_cv.docx",
                "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "data": docx_b64,
            },
            {
                "filename": f"{(name or 'candidate').replace(' ', '_')}_cover_and_cv.pdf",
                "content_type": "application/pdf",
                "data": pdf_b64,
            },
        ]

        return jsonify({"preview": preview, "files": files})
    except Exception as e:
        print("Generation error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
