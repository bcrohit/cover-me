/**
 * Premium loading experience with staged progress messages.
 */
export function createProgressIndicator({ steps, title = 'Working…' }) {
    const root = document.createElement('div');
    root.className = 'progress-indicator';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');

    const heading = document.createElement('p');
    heading.className = 'progress-indicator__title text-subheading';
    heading.textContent = title;
    root.appendChild(heading);

    const barTrack = document.createElement('div');
    barTrack.className = 'progress-indicator__track';
    barTrack.setAttribute('aria-hidden', 'true');
    const barFill = document.createElement('div');
    barFill.className = 'progress-indicator__fill';
    barTrack.appendChild(barFill);
    root.appendChild(barTrack);

    const stepList = document.createElement('ul');
    stepList.className = 'progress-indicator__steps';

    const stepEls = (steps || []).map((label, index) => {
        const li = document.createElement('li');
        li.className = 'progress-indicator__step';
        li.dataset.index = String(index);

        const icon = document.createElement('span');
        icon.className = 'progress-indicator__step-icon';
        icon.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'progress-indicator__step-text text-caption';
        text.textContent = label;

        li.appendChild(icon);
        li.appendChild(text);
        stepList.appendChild(li);
        return li;
    });

    root.appendChild(stepList);

    let currentIndex = 0;
    let intervalId = null;

    function setStep(index) {
        currentIndex = Math.min(index, stepEls.length - 1);
        const pct = stepEls.length > 0 ? ((currentIndex + 1) / stepEls.length) * 100 : 0;
        barFill.style.width = `${pct}%`;

        stepEls.forEach((el, i) => {
            el.classList.remove('is-active', 'is-done');
            if (i < currentIndex) el.classList.add('is-done');
            if (i === currentIndex) el.classList.add('is-active');
        });

        if (stepEls[currentIndex]) {
            heading.textContent = steps[currentIndex];
        }
    }

    return {
        element: root,
        start(autoAdvanceMs = 1400) {
            setStep(0);
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => {
                if (currentIndex < stepEls.length - 1) {
                    setStep(currentIndex + 1);
                }
            }, autoAdvanceMs);
        },
        setStep,
        complete() {
            if (intervalId) clearInterval(intervalId);
            setStep(stepEls.length - 1);
            stepEls.forEach((el) => {
                el.classList.add('is-done');
                el.classList.remove('is-active');
            });
            barFill.style.width = '100%';
        },
        destroy() {
            if (intervalId) clearInterval(intervalId);
        }
    };
}
