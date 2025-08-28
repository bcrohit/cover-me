// Profile save/load
const loadProfile = () => {
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['profile'], (res) => {
            const p = res.profile || {};
            document.getElementById('name').value = p.name || '';
            document.getElementById('skills').value = p.skills || '';
            document.getElementById('experience').value = p.experience || '';
            document.getElementById('projects').value = p.projects || '';
        });
    }
};

const saveProfile = () => {
    const p = {
        name: document.getElementById('name').value.trim(),
        skills: document.getElementById('skills').value.trim(),
        experience: document.getElementById('experience').value.trim(),
        projects: document.getElementById('projects').value.trim()
    };
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ profile: p }, () => {
            document.getElementById('status').innerText = 'Profile saved.';
        });
    }
};

document.getElementById('saveProfile').addEventListener('click', saveProfile);
document.getElementById('clearProfile').addEventListener('click', () => {
    const empty = { name:'', skills:'', experience:'', projects:'' };
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ profile: empty }, () => {
            loadProfile();
            document.getElementById('status').innerText = 'Profile cleared.';
        });
    }
});
loadProfile();

document.getElementById("scrapeBtn").addEventListener("click", async () => {
    document.getElementById('status').innerText = 'Scraping...';
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapeJobInfo
    }, (injectionResults) => {
        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
            let jobData = injectionResults[0].result;

            // Attach saved profile to payload
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['profile'], (res) => {
                    const profile = res.profile || {};
                    const payload = { jobData, profile };

                    // Send combined payload to Python backend
                    // Send combined payload to Python backend and then request generation
                    fetch("http://127.0.0.1:8000/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Generation Response:", data);
                        if (data.preview) {
                            // render nicely: split preview into paragraphs
                            const cover = document.getElementById('previewCover');
                            const cv = document.getElementById('previewCV');
                            cover.innerHTML = '';
                            data.preview.split('\n\n').forEach(p => {
                                const pnode = document.createElement('p');
                                pnode.textContent = p.trim();
                                cover.appendChild(pnode);
                            });

                            // simple CV rendering from profile/job fields
                            const name = payload.profile.name || '';
                            const skills = payload.profile.skills || '';
                            const experience = payload.profile.experience || '';
                            const projects = payload.profile.projects || '';
                            cv.innerHTML = '';
                            if (name) cv.appendChild(Object.assign(document.createElement('h3'), { textContent: name }));
                            if (skills) { const el = document.createElement('div'); el.innerHTML = '<strong>Skills</strong><div>' + skills + '</div>'; cv.appendChild(el); }
                            if (experience) { const el = document.createElement('div'); el.innerHTML = '<strong>Experience</strong><div>' + experience.replace(/\n/g,'<br/>') + '</div>'; cv.appendChild(el); }
                            if (projects) { const el = document.createElement('div'); el.innerHTML = '<strong>Projects</strong><ul>' + projects.split(',').map(s => '<li>'+s.trim()+'</li>').join('') + '</ul>'; cv.appendChild(el); }

                            document.getElementById('generation').style.display = 'block';
                            document.getElementById('status').innerText = 'Generation ready.';
                            // store files in-memory (simple)
                            window.__generated_files = data.files || [];
                        } else {
                            document.getElementById('status').innerText = 'No preview returned.';
                        }
                    })
                    .catch(err => {
                        console.error("Error generating files:", err);
                        document.getElementById('status').innerText = "Error generating files.";
                    });
                });
            } else {
                // If storage not available, send jobData only
                fetch("http://127.0.0.1:8000/api/jobdata", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobData })
                })
                .then(response => response.json())
                .then(data => {
                    console.log("Server Response:", data);
                    document.getElementById("status").innerText = "Job info sent to backend!";
                })
                .catch(err => {
                    console.error("Error sending data:", err);
                    document.getElementById("status").innerText = "Error sending data.";
                });
            }
        } else {
            document.getElementById("status").innerText = "No data found.";
        }
    });
});

// Download helper that accepts the file object returned by the server
function downloadBase64File(file) {
    const byteChars = atob(file.data);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.content_type });
    const url = URL.createObjectURL(blob);
    if (chrome && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url, filename: file.filename }, () => {
            URL.revokeObjectURL(url);
        });
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

document.getElementById('downloadDocx').addEventListener('click', () => {
    const files = window.__generated_files || [];
    const f = files.find(x => x.content_type && x.content_type.includes('word')) || files[0];
    if (f) downloadBase64File(f);
});

document.getElementById('downloadPdf').addEventListener('click', () => {
    const files = window.__generated_files || [];
    const f = files.find(x => x.content_type && x.content_type.includes('pdf')) || files[1] || files[0];
    if (f) downloadBase64File(f);
});

document.getElementById('copyPreview').addEventListener('click', async () => {
    // copy currently visible preview (cover or cv)
    const cover = document.getElementById('previewCover');
    const cv = document.getElementById('previewCV');
    const active = (cover.style.display !== 'none') ? cover : cv;
    const text = active.innerText || '';
    try { await navigator.clipboard.writeText(text); document.getElementById('status').innerText = 'Preview copied.'; } catch (e) { document.getElementById('status').innerText = 'Copy failed.'; }
});

// Tabs
const tabCover = document.getElementById('tabCover');
const tabCV = document.getElementById('tabCV');
tabCover.addEventListener('click', () => {
    tabCover.classList.add('active'); tabCV.classList.remove('active');
    document.getElementById('previewCover').style.display = ''; document.getElementById('previewCV').style.display = 'none';
});
tabCV.addEventListener('click', () => {
    tabCV.classList.add('active'); tabCover.classList.remove('active');
    document.getElementById('previewCV').style.display = ''; document.getElementById('previewCover').style.display = 'none';
});

// Edit modal behavior
document.getElementById('editPreview').addEventListener('click', () => {
    const cover = document.getElementById('previewCover');
    const cv = document.getElementById('previewCV');
    const active = (cover.style.display !== 'none') ? cover : cv;
    document.getElementById('editText').value = active.innerText || '';
    document.getElementById('editModal').style.display = 'flex';
});
document.getElementById('closeEdit').addEventListener('click', () => { document.getElementById('editModal').style.display = 'none'; });
document.getElementById('saveEdit').addEventListener('click', () => {
    const text = document.getElementById('editText').value || '';
    const cover = document.getElementById('previewCover');
    const cv = document.getElementById('previewCV');
    const active = (cover.style.display !== 'none') ? cover : cv;
    // render simple paragraphs
    active.innerHTML = '';
    text.split('\n\n').forEach(p => { const pnode = document.createElement('p'); pnode.textContent = p.trim(); active.appendChild(pnode); });
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('status').innerText = 'Edited.';
});

// Now return object
function scrapeJobInfo() {
    // Helper to get trimmed text from a selector
    const text = (sel, root = document) => {
        try {
            const el = root.querySelector(sel);
            return el ? el.innerText.trim() : "";
        } catch (e) { return ""; }
    };

    const firstMatch = (selectors) => {
        for (const s of selectors) {
            const t = text(s);
            if (t) return t;
        }
        return "";
    };

    let jobData = {
        title: "",
        company: "",
        location: "",
        description: "",
        seniority: "",
        employmentType: "",
        jobFunctions: "",
        industries: "",
        salary: "",
        applicants: "",
        postedDate: "",
        jobId: "",
        url: window.location.href,
        remote: false,
        scrapedAt: new Date().toISOString()
    };

    try {
        const host = window.location.hostname;
        if (!host.includes("linkedin.com")) {
            return jobData; // only handle LinkedIn for now
        }

        // Try to parse structured JSON-LD data if present (JobPosting)
        const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        let ld = null;
        for (const s of ldScripts) {
            try {
                const parsed = JSON.parse(s.innerText);
                if (!parsed) continue;
                if (Array.isArray(parsed)) {
                    const found = parsed.find(p => p && (p['@type'] === 'JobPosting' || (p['@type'] && /Job/i.test(p['@type']))));
                    if (found) { ld = found; break; }
                } else if (parsed['@type'] === 'JobPosting' || (parsed['@type'] && /Job/i.test(parsed['@type']))) {
                    ld = parsed; break;
                }
            } catch (e) {
                // ignore JSON parse errors
            }
        }

        if (ld) {
            jobData.title = ld.title || jobData.title;
            if (ld.hiringOrganization) {
                jobData.company = ld.hiringOrganization.name || jobData.company;
            }
            if (ld.description) {
                jobData.description = (typeof ld.description === 'string') ? ld.description : (ld.description.text || jobData.description);
            }
            jobData.postedDate = ld.datePosted || jobData.postedDate;
            if (ld.baseSalary) {
                try { jobData.salary = typeof ld.baseSalary === 'string' ? ld.baseSalary : JSON.stringify(ld.baseSalary); } catch (e) { jobData.salary = String(ld.baseSalary); }
            }
            if (ld.jobLocation) {
                try {
                    if (Array.isArray(ld.jobLocation)) {
                        jobData.location = ld.jobLocation.map(j => (j.address && (j.address.addressLocality || j.address.addressRegion || j.address.addressCountry)) || '').filter(Boolean).join(', ') || jobData.location;
                    } else if (ld.jobLocation.address) {
                        const a = ld.jobLocation.address;
                        jobData.location = [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(', ') || jobData.location;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        // Fallback DOM selectors commonly seen on LinkedIn job pages
        jobData.title = firstMatch([
            'h1.jobs-unified-top-card__job-title',
            'h1.top-card-layout__title',
            'h1.topcard__title',
            'h1'
        ]) || jobData.title;

        jobData.company = firstMatch([
            '.jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name',
            '.topcard__org-name-link',
            '.top-card-layout__second-subline a',
            '.topcard__flavor--company'
        ]) || jobData.company;

        jobData.location = firstMatch([
            '.jobs-unified-top-card__bullet',
            '.topcard__flavor--bullet',
            '.jobs-unified-top-card__subtle',
            '.top-card__location'
        ]) || jobData.location;

        jobData.description = firstMatch([
            '.show-more-less-html__markup',
            '.jobs-description__content',
            '.job-description__content',
            '#job-details',
            '.description__text'
        ]) || jobData.description;

        // Job ID often present in URL: /jobs/view/123456789
        const idMatch = window.location.pathname.match(/jobs\/view\/(\d+)/) || window.location.search.match(/currentJobId=(\d+)/);
        if (idMatch) jobData.jobId = idMatch[1];

        // Posted date / applicants / salary fallbacks
        jobData.postedDate = jobData.postedDate || firstMatch(['.jobs-unified-top-card__posted-date', '.posted-time-ago__text', 'time']) || jobData.postedDate;
        jobData.applicants = firstMatch(['.num-applicants__caption', '.jobs-unified-top-card__applicant-count', '.jobs-unified-top-card__applicants-count']) || jobData.applicants;
        jobData.salary = jobData.salary || firstMatch(['.salary', '.salary-snippet__salary', '.jobs-salary__salary']) || jobData.salary;

        // Collect job criteria items (seniority, employment type, job functions, industries)
        const criteria = {};
        const candidates = document.querySelectorAll('.description__job-criteria-list__item, .job-criteria__item, .job-criteria__list li, .jobs-unified-top-card__job-insight');
        if (candidates && candidates.length) {
            candidates.forEach(node => {
                try {
                    // Prefer labelled subelements if available
                    const labelEl = node.querySelector('.description__job-criteria-subheader, .job-criteria__subheader, .job-criteria__label, strong, b, .label');
                    const valueEl = node.querySelector('.description__job-criteria-text, .job-criteria__text, .job-criteria__value, span');
                    const rawLabel = labelEl ? labelEl.innerText.trim().toLowerCase().replace(/[:\n]/g, '') : '';
                    let rawValue = valueEl ? valueEl.innerText.trim() : node.innerText.trim();

                    // If the node contains a colon-separated label: value pattern, split it
                    if (!rawLabel) {
                        const split = node.innerText.split('\n').map(s => s.trim()).filter(Boolean);
                        if (split.length === 1 && split[0].includes(':')) {
                            const parts = split[0].split(':');
                            rawLabel = parts.shift().trim().toLowerCase();
                            rawValue = parts.join(':').trim();
                        }
                    }

                    if (rawLabel) {
                        criteria[rawLabel] = rawValue;
                    }
                } catch (e) {
                    // ignore individual node errors
                }
            });
        }

        // Map common labels to fields
        const getCriteria = (keys) => {
            for (const k of keys) {
                if (criteria[k]) return criteria[k];
            }
            return "";
        };

        jobData.seniority = jobData.seniority || getCriteria(['seniority level', 'seniority', 'level']);
        jobData.employmentType = jobData.employmentType || getCriteria(['employment type', 'employment', 'job type', 'type']);
        jobData.jobFunctions = jobData.jobFunctions || getCriteria(['job function', 'functions', 'function']);
        jobData.industries = jobData.industries || getCriteria(['industry', 'industries']);

        // Remote detection
        jobData.remote = /remote/i.test(jobData.location + ' ' + jobData.description);

    } catch (err) {
        console.error('scrapeJobInfo error:', err);
    }

    jobData.scrapedAt = new Date().toISOString();
    jobData.url = window.location.href;
    return jobData;
}
