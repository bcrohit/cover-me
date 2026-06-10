import hashlib
import json

from core.config import CONTENTS_DIR
from utils import save_json


def _cache_key(job_data: dict, profile: dict) -> str:
    payload = json.dumps({"job": job_data, "profile": profile}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def load_cached_analysis(job_data: dict, profile: dict) -> dict | None:
    key = _cache_key(job_data, profile)
    cache_path = CONTENTS_DIR / f"analysis_{key}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    return None


def save_analysis_cache(job_data: dict, profile: dict, analysis_dict: dict) -> str:
    key = _cache_key(job_data, profile)
    payload = {"analysis_bundle": analysis_dict, "cache_key": key}
    save_json(f"analysis_{key}.json", payload, CONTENTS_DIR)
    save_json("analysis_bundle.json", payload, CONTENTS_DIR)
    return key
