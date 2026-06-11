/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {HTMLElement|HTMLElement[]} [opts.children]
 */
export function createSection({ title, description, children }) {
    const section = document.createElement('section');
    section.className = 'section stack stack--sm';

    const header = document.createElement('div');
    header.className = 'section__header';

    const h = document.createElement('h2');
    h.className = 'section__title text-subheading';
    h.textContent = title;
    header.appendChild(h);

    if (description) {
        const p = document.createElement('p');
        p.className = 'section__desc text-caption';
        p.textContent = description;
        header.appendChild(p);
    }

    section.appendChild(header);

    const body = document.createElement('div');
    body.className = 'section__body stack';
    if (children) {
        const items = Array.isArray(children) ? children : [children];
        items.forEach((child) => {
            if (child) body.appendChild(child);
        });
    }
    section.appendChild(body);

    return section;
}
