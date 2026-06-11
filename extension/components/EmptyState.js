import { createButton } from './Button.js';

/**
 * @param {object} opts
 * @param {string} opts.icon — emoji or short symbol
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.actionLabel]
 * @param {() => void} [opts.onAction]
 */
export function createEmptyState({ icon, title, description, actionLabel, onAction }) {
    const root = document.createElement('div');
    root.className = 'empty-state';

    const iconEl = document.createElement('div');
    iconEl.className = 'empty-state__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;

    const titleEl = document.createElement('h3');
    titleEl.className = 'empty-state__title text-subheading';
    titleEl.textContent = title;

    const descEl = document.createElement('p');
    descEl.className = 'empty-state__desc text-caption';
    descEl.textContent = description;

    root.appendChild(iconEl);
    root.appendChild(titleEl);
    root.appendChild(descEl);

    if (actionLabel && onAction) {
        const action = createButton({
            label: actionLabel,
            variant: 'primary',
            size: 'sm',
            onClick: onAction
        });
        action.classList.add('empty-state__action');
        root.appendChild(action);
    }

    return root;
}
