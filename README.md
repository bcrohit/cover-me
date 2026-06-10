# cover-me
Craft custom cover letters and CV's (Working prototype)

## Extension usage

Open the extension popup, fill in your Profile (name, skills, experience, projects) and click "Save Profile". You can also upload your current CV as a PDF; the popup sends it to the backend endpoint at `http://127.0.0.1:8000/api/upload-cv`, which stores it as `assets/contents/current_cv.pdf`. When you open a job posting in the browser and click "Scrape Job Info", the extension will scrape the page and send the job data plus your saved profile to the backend at `http://127.0.0.1:8000/api/jobdata`.

## Backend

Run the Flask app (requires Python + flask + flask-cors): it will save the received `jobData` to `assets/contents/job_data.json` and the profile to `assets/contents/profile.json`.

### Generation endpoint

The server flow is now split in two steps:

1. `POST /api/jobdata`  
   Saves scraped job data + profile input, generates both cover letter and CV drafts, and returns JSON preview payloads.

2. `POST /api/generate`  
   Accepts the reviewed/edited text from UI plus:
   - `outputFormat`: `pdf` or `word`
   - `documentType`: `cover_letter` or `cv`  
     and returns a downloadable file response (`application/pdf` or DOCX mime type).

Install server deps:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt
python app.py
```
