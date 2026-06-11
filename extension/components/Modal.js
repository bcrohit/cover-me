import { createButton } from './Button.js';

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {HTMLElement} opts.body
 * @param {string} [opts.id]
 */
export function createModal({ title, description, body, id }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay section-hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (id) overlay.id = id;

    const dialog = document.createElement('div');
    dialog.className = 'modal';

    const header = document.createElement('div');
    header.className = 'modal__header';

    const titleEl = document.createElement('h2');
    titleEl.className = 'modal__title text-heading';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (description) {
        const desc = document.createElement('p');
        desc.className = 'modal__desc text-caption';
        desc.textContent = description;
        header.appendChild(desc);
    }

    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'modal__body';
    bodyWrap.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'modal__footer';

    const cancelBtn = createButton({ label: 'Cancel', variant: 'ghost', id: `${id || 'modal'}-cancel` });
    const saveBtn = createButton({ label: 'Save changes', variant: 'primary', id: `${id || 'modal'}-save` });
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    dialog.appendChild(header);
    dialog.appendChild(bodyWrap);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    function open() {
        overlay.classList.remove('section-hidden');
        overlay.style.display = 'flex';
        saveBtn.focus();
    }

    function close() {
        overlay.classList.add('section-hidden');
        overlay.style.display = 'none';
    }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    return { element: overlay, open, close, saveBtn, cancelBtn };
}
