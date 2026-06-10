import base64
import binascii

from agents.profile_structurer import structure_parsed_cv
from utils import parse_pdf


def normalize_manual_profile(profile: dict) -> dict:
    """Convert flat manual profile strings into a structured shape for agents."""
    skills_raw = profile.get("skills", "")
    if isinstance(skills_raw, list):
        skills = skills_raw
    else:
        skills = [s.strip() for s in str(skills_raw).split(",") if s.strip()]

    return {
        "name": profile.get("name", ""),
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "location": profile.get("location", ""),
        "summary": profile.get("summary", ""),
        "skills": skills,
        "experience": [
            {
                "company": "",
                "role": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "is_current": "",
                "description": [profile.get("experience", "")] if profile.get("experience") else [],
            }
        ] if profile.get("experience") else [],
        "projects": [
            {
                "name": "Projects",
                "role": "",
                "technologies": [],
                "link": "",
                "description": [profile.get("projects", "")] if profile.get("projects") else [],
            }
        ] if profile.get("projects") else [],
        "education": profile.get("education", []) if isinstance(profile.get("education"), list) else [],
        "_source": "manual",
    }


def resolve_profile(data: dict) -> dict:
    """Resolve profile from request payload (manual or PDF upload)."""
    profile_mode = data.get("profileMode")
    if profile_mode == "manual":
        profile = data.get("profile") or {}
        return normalize_manual_profile(profile)

    encoded_data = data.get("data", "")
    decoded_bytes = base64.b64decode(encoded_data, validate=True)
    assert decoded_bytes.startswith(b"%PDF"), "Uploaded file is not a valid PDF."
    raw_text = parse_pdf(decoded_bytes)
    return structure_parsed_cv(raw_text)
