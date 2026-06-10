import { setStatus } from './status.js';
import { renderCoverPreview, renderCvPreview } from './preview-render.js';
import { setGenerationContext } from './generated-files.js';
import { saveProfile } from './profile.js';

const API_BASE = 'http://127.0.0.1:8000';
const API_ANALYZE = `${API_BASE}/api/analyze`;
const API_GENERATE_DOCS = `${API_BASE}/api/generate-documents`;

function buildPayload(jobData, profile) {
    const profileMode = profile && profile.profileMode === 'manual' ? 'manual' : 'upload';
    const cvAsset = profile && profile.cvAsset ? profile.cvAsset : null;
    const manualProfile = {
        name: (profile && profile.name) || '',
        skills: (profile && profile.skills) || '',
        experience: (profile && profile.experience) || '',
        projects: (profile && profile.projects) || ''
    };
    const payload = {
        profileMode,
        jobData,
        profile: profileMode === 'manual'
            ? manualProfile
            : {
                filename: (cvAsset && cvAsset.filename) || '',
                data: (cvAsset && cvAsset.base64Data) || ''
            }
    };

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

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error((data && data.message) || `Request failed (${response.status})`);
    }
    return data;
}

async function sendGenerateWithProfile(jobData) {
    try {
        const savedProfile = await readProfile();
        const { payload, previewProfile } = buildPayload(jobData, savedProfile);
        const analyzePayload = payload.profileMode === 'upload'
            ? {
                ...payload,
                filename: payload.profile.filename || '',
                data: payload.profile.data || ''
            }
            : payload;

        setStatus('Analyzing job and profile...');
        const analyzeData = await postJson(API_ANALYZE, analyzePayload);
        const analysisBundle = analyzeData.analysis_bundle;
        const profileFromApi = analyzeData.profile || previewProfile;

        setStatus('Generating tailored documents...');
        const docsData = await postJson(API_GENERATE_DOCS, {
            analysis_bundle: analysisBundle,
            profile: profileFromApi,
            jobData: analyzeData.jobData || jobData
        });

        const coverPayload = (docsData.preview && docsData.preview.coverLetter) || docsData.cover_letter || {};
        const cvPayload = (docsData.preview && docsData.preview.cv) || {
            cv_text: (docsData.tailored_cv && docsData.tailored_cv.cv_text) || '',
            candidate_details: (docsData.tailored_cv && docsData.tailored_cv.candidate_details) || {}
        };
        const coverText = (coverPayload && coverPayload.body) || '';
        const cvText = (cvPayload && cvPayload.cv_text) || '';

        const cover = document.getElementById('previewCover');
        const cv = document.getElementById('previewCV');
        const generation = document.getElementById('generation');
        console.assert(cover && cv && generation, 'generation: preview UI missing');
        if (cover && cv) {
            renderCoverPreview(cover, coverText);
            renderCvPreview(cv, cvText);
        }
        if (generation) generation.style.display = 'block';

        const narrative = analysisBundle
            && analysisBundle.match_analysis
            && analysisBundle.match_analysis.narrative_summary;
        setGenerationContext({
            jobData: docsData.jobData || jobData,
            profile: docsData.profile || profileFromApi,
            coverLetter: coverPayload,
            cv: cvPayload,
            analysisBundle
        });
        setStatus(narrative
            ? `Drafts ready. ${narrative}`
            : 'Drafts ready. Review and download when ready.');
    } catch (err) {
        console.error('Error during save/generate flow:', err);
        setStatus((err && err.message) || 'Error saving or generating.');
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
        try {
            setStatus('Saving profile...');
            await saveProfile();
        } catch (err) {
            console.error('generation: profile save failed', err);
            setStatus((err && err.message) || 'Profile save failed.');
            return;
        }

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
