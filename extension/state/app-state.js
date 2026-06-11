const listeners = new Set();

const state = {
    step: 'profile',
    completedSteps: [],
    profile: null,
    jobData: null,
    analysisBundle: null,
    documents: null,
    statusMessage: '',
    isLoading: false
};

export function getState() {
    return { ...state };
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    listeners.forEach((fn) => fn(getState()));
}

export function setStep(step) {
    state.step = step;
    notify();
}

export function markStepComplete(stepId) {
    if (!state.completedSteps.includes(stepId)) {
        state.completedSteps = [...state.completedSteps, stepId];
        notify();
    }
}

export function setProfile(profile) {
    state.profile = profile;
    notify();
}

export function setJobData(jobData) {
    state.jobData = jobData;
    notify();
}

export function setAnalysisBundle(bundle) {
    state.analysisBundle = bundle;
    notify();
}

export function setDocuments(docs) {
    state.documents = docs;
    notify();
}

export function setStatusMessage(message) {
    state.statusMessage = message;
    notify();
}

export function setLoading(isLoading) {
    state.isLoading = isLoading;
    notify();
}

export function updateCoverLetterBody(body) {
    if (!state.documents) return;
    state.documents = {
        ...state.documents,
        coverLetter: {
            ...state.documents.coverLetter,
            body
        }
    };
    notify();
}

export function updateCvText(cvText) {
    if (!state.documents) return;
    state.documents = {
        ...state.documents,
        cv: {
            ...state.documents.cv,
            cv_text: cvText
        }
    };
    notify();
}
