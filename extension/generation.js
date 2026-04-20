import { setStatus } from './status.js';
import { renderCoverPreview, renderCvPreview } from './preview-render.js';
import { setGeneratedFiles } from './generated-files.js';

const API_GENERATE = 'http://127.0.0.1:8000/api/generate';
const API_JOBDATA = 'http://127.0.0.1:8000/api/jobdata';
const API_COVERLETTER = 'http://127.0.0.1:8000/api/coverletter';

function buildPayload(jobData, profile) {
    const profileMode = profile && profile.profileMode === 'manual' ? 'manual' : 'upload';
    const payload = { jobData, profileMode };
    const manualProfile = {
        name: (profile && profile.name) || '',
        skills: (profile && profile.skills) || '',
        experience: (profile && profile.experience) || '',
        projects: (profile && profile.projects) || ''
    };

    if (profileMode === 'manual') {
        payload.profile = manualProfile;
    }

    return { payload, previewProfile: manualProfile };
}

function readProfile() {
    return new Promise((resolve) => {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['profile'], (res) => {
                resolve((res && res.profile) || {});
            });
            return;
        }
        resolve({});
    });
}

async function sendGenerateWithProfile(jobData) {
    try {
        const savedProfile = await readProfile();
        const { payload, previewProfile } = buildPayload(jobData, savedProfile);

        setStatus('Saving job data...');
        const jobDataResponse = await fetch(API_JOBDATA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!jobDataResponse.ok) {
            throw new Error(`Failed to save job data (${jobDataResponse.status})`);
        }

        setStatus('Generating cover letter...');
        const coverLetterResponse = await fetch(API_COVERLETTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!coverLetterResponse.ok) {
            throw new Error(`Cover letter request failed (${coverLetterResponse.status})`);
        }

        const coverLetterData = await coverLetterResponse.json();
        if (coverLetterData.status && coverLetterData.status !== 'success') {
            throw new Error(coverLetterData.message || 'Cover letter generation failed');
        }

        setStatus('Generating preview/documents...');
        const generationResponse = await fetch(API_GENERATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!generationResponse.ok) {
            throw new Error(`Generation request failed (${generationResponse.status})`);
        }

        const data = await generationResponse.json();
        console.log('Generation Response:', data);
        if (data.preview) {
            const cover = document.getElementById('previewCover');
            const cv = document.getElementById('previewCV');
            const generation = document.getElementById('generation');
            console.assert(cover && cv && generation, 'generation: preview UI missing');
            if (cover && cv) {
                renderCoverPreview(cover, data.preview);
                renderCvPreview(cv, previewProfile);
            }
            if (generation) generation.style.display = 'block';
            setStatus('Saved and generated successfully.');
            setGeneratedFiles(data.files || []);
        } else {
            setStatus('Saved, but no preview returned.');
        }
    } catch (err) {
        console.error('Error during save/generate flow:', err);
        setStatus('Error saving or generating.');
    }
}

/**
 * @param {() => object} scrapeJobInfoFn — serialized for injection; must be the same reference Chrome expects.
 */
export function initScrapeGeneration(scrapeJobInfoFn) {
    const scrapeBtn = document.getElementById('scrapeBtn');
    console.assert(scrapeBtn, 'generation: scrapeBtn missing');
    if (!scrapeBtn) return;

    scrapeBtn.addEventListener('click', async () => {
        setStatus('Scraping...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.assert(tab && tab.id != null, 'generation: no active tab');

        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                function: scrapeJobInfoFn
            },
            (injectionResults) => {
                if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                    const jobData = injectionResults[0].result;
                    sendGenerateWithProfile(jobData);
                } else {
                    setStatus('No data found.');
                }
            }
        );
    });
}
