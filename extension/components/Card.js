/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {HTMLElement|HTMLElement[]} [opts.children]
 * @param {string} [opts.className]
 */
export function createCard({ title, subtitle, children, className = '' }) {
    const card = document.createElement('div');
    card.className = `card ${className}`.trim();

    if (title || subtitle) {
        const header = document.createElement('div');
        header.className = 'card__header';
        if (title) {
            const h = document.createElement('h3');
            h.className = 'card__title text-subheading';
            h.textContent = title;
            header.appendChild(h);
        }
        if (subtitle) {
            const p = document.createElement('p');
            p.className = 'card__subtitle text-caption';
            p.textContent = subtitle;
            header.appendChild(p);
        }
        card.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'card__body';
    appendChildren(body, children);
    card.appendChild(body);

    return card;
}

function appendChildren(parent, children) {
    if (!children) return;
    const items = Array.isArray(children) ? children : [children];
    items.forEach((child) => {
        if (child) parent.appendChild(child);
    });
}
