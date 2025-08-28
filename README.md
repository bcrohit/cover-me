# cover-me
Craft custom cover letters and CV's

## Extension usage

Open the extension popup, fill in your Profile (name, skills, experience, projects) and click "Save Profile". When you open a job posting in the browser and click "Scrape Job Info", the extension will scrape the page and send the job data plus your saved profile to the backend at `http://127.0.0.1:8000/api/jobdata`.

## Backend

Run the Flask app (requires Python + flask + flask-cors): it will save the received `jobData` to `assets/contents/job_data.json` and the profile to `assets/contents/profile.json`.

### Generation endpoint

The server exposes `/api/generate` (POST) which accepts `{ jobData, profile }` and returns a JSON payload with a `preview` string and `files` array where each file is `{ filename, content_type, data }` and `data` is base64. The popup will show the preview and offer DOCX/PDF downloads.

Install server deps:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt
python app.py
```
