import { createCard } from '../components/Card.js';
import { createProgressIndicator } from '../components/ProgressIndicator.js';
import { createStatusBadge } from '../components/StatusBadge.js';
import { API, postJson } from '../services/api.js';
import {
    getState,
    setDocuments,
    markStepComplete,
    setStep,
    setLoading
} from '../state/app-state.js';

const GENERATION_STEPS = [
    'Generating Cover Letter…',
    'Tailoring CV…',
    'Optimizing for ATS…'
];

function createChipList(items, variant) {
    const list = document.createElement('div');
    list.className = 'chip-list';
    (items || []).slice(0, 8).forEach((item) => {
        const chip = document.createElement('span');
        chip.className = `chip${variant ? ` chip--${variant}` : ''}`;
        chip.textContent = item;
        list.appendChild(chip);
    });
    return list;
}

export function createAnalysisScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-analysis';
    screen.className = 'screen';
    screen.setAttribute('role', 'tabpanel');
    screen.setAttribute('aria-label', 'Job fit analysis');

    const content = document.createElement('div');
    content.className = 'stack stack--lg';

    const resultsHost = document.createElement('div');
    resultsHost.className = 'stack stack--lg';
    const progressHost = document.createElement('div');
    progressHost.className = 'section-hidden';

    content.appendChild(resultsHost);
    content.appendChild(progressHost);
    screen.appendChild(content);

    let progressController = null;

    function renderResults(bundle, jobData) {
        resultsHost.innerHTML = '';
        resultsHost.classList.remove('section-hidden');
        progressHost.classList.add('section-hidden');

        const match = bundle.match_analysis || {};
        const job = bundle.job_analysis || {};
        const positioning = bundle.positioning_strategy || {};

        const scoreCard = document.createElement('div');
        scoreCard.className = 'card';
        const scoreBody = document.createElement('div');
        scoreBody.className = 'match-score';

        const ring = document.createElement('div');
        ring.className = 'match-score__ring';
        const matchCount = (match.strong_matches || []).length;
        const gapCount = (match.skill_gaps || []).length;
        const score = Math.min(95, Math.max(35, 55 + matchCount * 8 - gapCount * 5));
        ring.textContent = `${score}%`;
        ring.setAttribute('aria-label', `Fit score ${score} percent`);

        const narrative = document.createElement('div');
        const narrativeTitle = document.createElement('p');
        narrativeTitle.className = 'text-subheading';
        narrativeTitle.textContent = 'Fit analysis';
        const narrativeText = document.createElement('p');
        narrativeText.className = 'text-caption';
        narrativeText.textContent = match.narrative_summary
            || positioning.primary_positioning_statement
            || 'Your profile aligns with key requirements for this role.';

        narrative.appendChild(narrativeTitle);
        narrative.appendChild(narrativeText);
        scoreBody.appendChild(ring);
        scoreBody.appendChild(narrative);
        scoreCard.appendChild(scoreBody);
        resultsHost.appendChild(scoreCard);

        if (job.role_title || jobData) {
            resultsHost.appendChild(createCard({
                title: job.role_title || jobData.title || 'Role overview',
                subtitle: [job.seniority_level, jobData && jobData.company].filter(Boolean).join(' · '),
                children: createChipList(job.required_skills || job.ATS_keywords || [], 'primary')
            }));
        }

        if ((match.strong_matches || []).length) {
            resultsHost.appendChild(createCard({
                title: 'Strong matches',
                children: createChipList(match.strong_matches, 'success')
            }));
        }

        if ((match.skill_gaps || []).length) {
            resultsHost.appendChild(createCard({
                title: 'Skill gaps',
                subtitle: 'Areas to address in your application',
                children: createChipList(match.skill_gaps, 'warning')
            }));
        }

        if ((match.positioning_opportunities || []).length) {
            const list = document.createElement('ul');
            list.className = 'text-caption';
            list.style.margin = '0';
            list.style.paddingLeft = '16px';
            match.positioning_opportunities.slice(0, 4).forEach((item) => {
                const li = document.createElement('li');
                li.textContent = item;
                li.style.marginBottom = '4px';
                list.appendChild(li);
            });
            resultsHost.appendChild(createCard({
                title: 'Positioning strategy',
                children: list
            }));
        }
    }

    function showProgress() {
        resultsHost.classList.add('section-hidden');
        progressHost.classList.remove('section-hidden');
        progressHost.innerHTML = '';

        progressController = createProgressIndicator({
            steps: GENERATION_STEPS,
            title: 'Generating application materials…'
        });
        progressHost.appendChild(progressController.element);
        progressController.start(1400);
    }

    async function generateDocuments() {
        const state = getState();
        const { analysisBundle, profile, jobData } = state;
        if (!analysisBundle) throw new Error('Run job analysis first.');

        setLoading(true);
        showProgress();

        try {
            const data = await postJson(API.generateDocuments, {
                analysis_bundle: analysisBundle,
                profile,
                jobData
            });

            if (progressController) progressController.complete();

            const coverLetter = (data.preview && data.preview.coverLetter) || data.cover_letter || {};
            const tailoredCv = data.tailored_cv || {};
            const cv = (data.preview && data.preview.cv) || {
                cv_text: tailoredCv.cv_text || '',
                candidate_details: tailoredCv.candidate_details || tailoredCv
            };

            setDocuments({
                coverLetter,
                cv: { ...cv, ...tailoredCv },
                jobData: data.jobData || jobData,
                profile: data.profile || profile,
                analysisBundle
            });

            markStepComplete('analysis');
            setStep('documents');
            return data;
        } finally {
            setLoading(false);
            if (progressController) progressController.destroy();
        }
    }

    return {
        element: screen,
        generateDocuments,
        render(state) {
            screen.classList.toggle('is-active', state.step === 'analysis');
            if (state.step !== 'analysis') return;

            if (state.isLoading) {
                showProgress();
            } else if (state.analysisBundle) {
                renderResults(state.analysisBundle, state.jobData);
            }
        }
    };
}
