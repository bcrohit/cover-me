/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {HTMLElement|HTMLElement[]} opts.children
 * @param {boolean} [opts.open]
 */
export function createCollapsible({ title, children, open = false }) {
    const root = document.createElement('div');
    root.className = `collapsible${open ? ' is-open' : ''}`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'collapsible__trigger';
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');

    const titleEl = document.createElement('span');
    titleEl.textContent = title;

    const chevron = document.createElement('span');
    chevron.className = 'collapsible__chevron';
    chevron.textContent = '▼';

    trigger.appendChild(titleEl);
    trigger.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'collapsible__body';
    if (children) {
        const items = Array.isArray(children) ? children : [children];
        items.forEach((child) => {
            if (child) body.appendChild(child);
        });
    }

    trigger.addEventListener('click', () => {
        const isOpen = root.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    root.appendChild(trigger);
    root.appendChild(body);
    return root;
}
