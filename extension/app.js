import { createStepper, updateStepper } from './components/Stepper.js';
import { createButton, setButtonLoading } from './components/Button.js';
import { createProfileScreen, loadInitialProfile } from './screens/profile-screen.js';
import { createAnalyzeScreen } from './screens/analyze-screen.js';
import { createAnalysisScreen } from './screens/analysis-screen.js';
import { createDocumentsScreen } from './screens/documents-screen.js';
import { subscribe, getState, setStep, setStatusMessage, markStepComplete } from './state/app-state.js';
import { hasValidProfile } from './services/storage.js';

/**
 * @param {() => object} scrapeJobInfoFn
 */
export async function initApp(scrapeJobInfoFn) {
    const app = document.getElementById('app');
    const main = document.getElementById('app-main');
    const footer = document.getElementById('app-footer');
    const statusEl = document.getElementById('app-status');

    const stepper = createStepper();
    document.getElementById('app-stepper-host').appendChild(stepper);

    stepper.querySelectorAll('.stepper__item').forEach((item) => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            const stepId = item.dataset.step;
            const state = getState();
            const canNavigate = state.completedSteps.includes(stepId) || stepId === state.step;
            if (canNavigate) setStep(stepId);
        });
    });

    const profileScreen = createProfileScreen();
    const analyzeScreen = createAnalyzeScreen({ scrapeJobInfoFn });
    const analysisScreen = createAnalysisScreen();
    const documentsScreen = createDocumentsScreen({
        onRegenerate: async () => {
            setStep('analysis');
            setStatusMessage('Regenerating application materials…');
            await analysisScreen.generateDocuments();
        }
    });

    [profileScreen, analyzeScreen, analysisScreen, documentsScreen].forEach((s) => {
        main.appendChild(s.element);
    });

    const primaryBtn = createButton({
        label: 'Continue',
        variant: 'primary',
        fullWidth: true,
        id: 'primary-action'
    });
    footer.appendChild(primaryBtn);

    let footerAction = null;

    function setPrimaryAction({ label, handler, hidden = false }) {
        footerAction = handler;
        primaryBtn.textContent = label;
        footer.classList.toggle('section-hidden', hidden);
        primaryBtn.setAttribute('aria-label', label);
    }

    async function handlePrimaryAction() {
        if (!footerAction) return;
        setButtonLoading(primaryBtn, true);
        try {
            await footerAction();
        } catch (err) {
            setStatusMessage((err && err.message) || 'Something went wrong.');
        } finally {
            setButtonLoading(primaryBtn, false);
        }
    }

    primaryBtn.addEventListener('click', handlePrimaryAction);

    function configureFooter(state) {
        switch (state.step) {
            case 'profile':
                setPrimaryAction({
                    label: 'Save & continue',
                    handler: async () => {
                        await profileScreen.save();
                        setStep('analyze');
                        setStatusMessage('Profile saved. Open a job posting to analyze.');
                    }
                });
                break;
            case 'analyze':
                setPrimaryAction({
                    label: 'Analyze this job',
                    handler: async () => {
                        await analyzeScreen.runAnalysis();
                        setStatusMessage('Analysis complete. Review your fit.');
                    }
                });
                break;
            case 'analysis':
                setPrimaryAction({
                    label: 'Generate application materials',
                    handler: async () => {
                        await analysisScreen.generateDocuments();
                        setStatusMessage('Documents ready for review.');
                    }
                });
                break;
            case 'documents':
                // Export actions live on the document card — no competing footer CTA.
                setPrimaryAction({ label: '', handler: null, hidden: true });
                break;
            default:
                setPrimaryAction({ label: 'Continue', handler: null, hidden: true });
        }
    }

    function render(state) {
        updateStepper(stepper, state.step, state.completedSteps);
        profileScreen.render(state);
        analyzeScreen.render(state);
        analysisScreen.render(state);
        documentsScreen.render(state);
        configureFooter(state);

        if (statusEl) {
            const msg = state.statusMessage || '';
            statusEl.textContent = msg;
            statusEl.classList.toggle('section-hidden', !msg);
            statusEl.classList.toggle('is-error', /failed|error|please/i.test(msg));
        }
    }

    subscribe(render);

    const profile = await loadInitialProfile();
    profileScreen.hydrate(profile);

    if (hasValidProfile(profile)) {
        markStepComplete('profile');
        setStep('analyze');
        setStatusMessage('Profile ready. Navigate to a job posting.');
    }

    render(getState());
}
