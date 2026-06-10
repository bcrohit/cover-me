let generationContext = {
    jobData: null,
    profile: null,
    coverLetter: null,
    cv: null,
    analysisBundle: null
};

export function setGenerationContext(context) {
    generationContext = {
        jobData: (context && context.jobData) || null,
        profile: (context && context.profile) || null,
        coverLetter: (context && context.coverLetter) || null,
        cv: (context && context.cv) || null,
        analysisBundle: (context && context.analysisBundle) || null
    };
}

export function getGenerationContext() {
    return generationContext;
}

export function updateGeneratedCoverBody(body) {
    const coverLetter = generationContext.coverLetter || {};
    generationContext = {
        ...generationContext,
        coverLetter: {
            ...coverLetter,
            body
        }
    };
}

export function updateGeneratedCvText(cvText) {
    const cv = generationContext.cv || {};
    generationContext = {
        ...generationContext,
        cv: {
            ...cv,
            cv_text: cvText
        }
    };
}

export function getAnalysisBundle() {
    return generationContext.analysisBundle;
}
