import { createEmptyState } from '../components/EmptyState.js';
import { createProgressIndicator } from '../components/ProgressIndicator.js';
import { createStatusBadge } from '../components/StatusBadge.js';
import { buildAnalyzePayload } from '../services/storage.js';
import { API, postJson } from '../services/api.js';
import {
    getState,
    setJobData,
    setAnalysisBundle,
    markStepComplete,
    setStep,
    setLoading
} from '../state/app-state.js';

const ANALYSIS_STEPS = [
    'Job Analysis…',
    'Extracting Skills…',
    'Comparing Experience…',
    'Building Positioning Strategy…'
];

export function createAnalyzeScreen({ scrapeJobInfoFn }) {
    const screen = document.createElement('div');
    screen.id = 'screen-analyze';
    screen.className = 'screen';
    screen.setAttribute('role', 'tabpanel');
    screen.setAttribute('aria-label', 'Job analysis');

    const content = document.createElement('div');
    content.className = 'stack stack--lg';

    const idleHost = document.createElement('div');
    const jobHost = document.createElement('div');
    jobHost.className = 'section-hidden';
    const progressHost = document.createElement('div');
    progressHost.className = 'section-hidden';

    content.appendChild(idleHost);
    content.appendChild(jobHost);
    content.appendChild(progressHost);
    screen.appendChild(content);

    let progressController = null;

    function showIdle() {
        idleHost.innerHTML = '';
        idleHost.classList.remove('section-hidden');
        jobHost.classList.add('section-hidden');
        progressHost.classList.add('section-hidden');

        idleHost.appendChild(createEmptyState({
            icon: '🔍',
            title: 'No job detected',
            description: 'Open a job posting on LinkedIn, Indeed, or Glassdoor, then return here to analyze your fit.',
        }));
    }

    function showJobSummary(jobData) {
        idleHost.classList.add('section-hidden');
        jobHost.classList.remove('section-hidden');

        jobHost.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'job-summary';

        const title = document.createElement('h3');
        title.className = 'job-summary__title text-heading';
        title.textContent = jobData.title || 'Job posting';

        const company = document.createElement('p');
        company.className = 'text-caption';
        company.textContent = [jobData.company, jobData.location].filter(Boolean).join(' · ') || 'Company not detected';

        const meta = document.createElement('div');
        meta.className = 'job-summary__meta';
        if (jobData.seniority) meta.appendChild(createStatusBadge({ label: jobData.seniority, tone: 'primary' }));
        if (jobData.employmentType) meta.appendChild(createStatusBadge({ label: jobData.employmentType }));
        if (jobData.remote) meta.appendChild(createStatusBadge({ label: 'Remote', tone: 'success' }));

        card.appendChild(title);
        card.appendChild(company);
        if (meta.childElementCount) card.appendChild(meta);
        jobHost.appendChild(card);
    }

    function showProgress() {
        jobHost.classList.add('section-hidden');
        progressHost.classList.remove('section-hidden');
        progressHost.innerHTML = '';

        progressController = createProgressIndicator({ steps: ANALYSIS_STEPS });
        progressHost.appendChild(progressController.element);
        progressController.start(1200);
    }

    async function scrapeCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.id == null) throw new Error('No active tab found.');

        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript(
                { target: { tabId: tab.id }, function: scrapeJobInfoFn },
                (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    const jobData = results && results[0] && results[0].result;
                    if (!jobData || !jobData.title) {
                        reject(new Error('Could not detect job details on this page.'));
                        return;
                    }
                    resolve(jobData);
                }
            );
        });
    }

    async function runAnalysis() {
        const state = getState();
        const profile = state.profile;
        if (!profile) throw new Error('Set up your profile first.');

        setLoading(true);
        showProgress();

        try {
            const jobData = state.jobData || await scrapeCurrentTab();
            setJobData(jobData);

            const payload = buildAnalyzePayload(jobData, profile);
            const data = await postJson(API.analyze, payload);

            if (progressController) progressController.complete();

            setAnalysisBundle(data.analysis_bundle);
            markStepComplete('analyze');
            setStep('analysis');
            return data;
        } finally {
            setLoading(false);
            if (progressController) progressController.destroy();
        }
    }

    async function detectJobOnScreen() {
        try {
            const jobData = await scrapeCurrentTab();
            setJobData(jobData);
            showJobSummary(jobData);
            return jobData;
        } catch {
            showIdle();
            return null;
        }
    }

    return {
        element: screen,
        runAnalysis,
        detectJobOnScreen,
        render(state) {
            screen.classList.toggle('is-active', state.step === 'analyze');
            if (state.step !== 'analyze') return;

            if (state.isLoading) {
                showProgress();
            } else if (state.jobData && state.jobData.title) {
                showJobSummary(state.jobData);
            } else {
                detectJobOnScreen();
            }
        }
    };
}
