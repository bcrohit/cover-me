document.getElementById("scrapeBtn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapeJobInfo
    }, (injectionResults) => {
        if (injectionResults && injectionResults[0].result) {
            let jobData = injectionResults[0].result;

            // Send job data to Python backend
            fetch("http://127.0.0.1:8000/api/jobdata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jobData)
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
        } else {
            document.getElementById("status").innerText = "No data found.";
        }
    });
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
