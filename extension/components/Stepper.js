const STEPS = [
    { id: 'profile', label: 'Profile' },
    { id: 'analyze', label: 'Job' },
    { id: 'analysis', label: 'Fit' },
    { id: 'documents', label: 'Export' }
];

export function createStepper() {
    const nav = document.createElement('nav');
    nav.className = 'stepper';
    nav.setAttribute('aria-label', 'Application progress');

    const list = document.createElement('ol');
    list.className = 'stepper__list';

    STEPS.forEach((step, index) => {
        const item = document.createElement('li');
        item.className = 'stepper__item';
        item.dataset.step = step.id;

        const dot = document.createElement('span');
        dot.className = 'stepper__dot';
        dot.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'stepper__label';
        label.textContent = step.label;

        item.appendChild(dot);
        item.appendChild(label);

        if (index < STEPS.length - 1) {
            const connector = document.createElement('span');
            connector.className = 'stepper__connector';
            connector.setAttribute('aria-hidden', 'true');
            item.appendChild(connector);
        }

        list.appendChild(item);
    });

    nav.appendChild(list);
    return nav;
}

/**
 * @param {HTMLElement} stepper
 * @param {string} activeStepId
 * @param {string[]} [completedStepIds]
 */
export function updateStepper(stepper, activeStepId, completedStepIds = []) {
    if (!stepper) return;
    const items = stepper.querySelectorAll('.stepper__item');
    const activeIndex = STEPS.findIndex((s) => s.id === activeStepId);

    items.forEach((item, index) => {
        const stepId = item.dataset.step;
        item.classList.remove('is-active', 'is-complete');
        item.setAttribute('aria-current', 'false');

        if (completedStepIds.includes(stepId) || index < activeIndex) {
            item.classList.add('is-complete');
        }
        if (stepId === activeStepId) {
            item.classList.add('is-active');
            item.setAttribute('aria-current', 'step');
        }
    });
}

export { STEPS };
