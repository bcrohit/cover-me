import { createButton } from './Button.js';

/**
 * Card layout for generated documents with preview + actions.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {HTMLElement} opts.previewEl
 * @param {object} opts.actions
 * @param {() => void} [opts.actions.onEdit]
 * @param {() => void} [opts.actions.onRegenerate]
 * @param {() => void} [opts.actions.onExportPdf]
 * @param {() => void} [opts.actions.onExportDocx]
 * @param {() => void} [opts.actions.onCopy]
 */
export function createDocumentCard({ title, subtitle, previewEl, actions = {} }) {
    const card = document.createElement('article');
    card.className = 'document-card';

    const header = document.createElement('header');
    header.className = 'document-card__header row row--between';

    const titles = document.createElement('div');
    const titleEl = document.createElement('h3');
    titleEl.className = 'document-card__title text-subheading';
    titleEl.textContent = title;
    titles.appendChild(titleEl);

    if (subtitle) {
        const sub = document.createElement('p');
        sub.className = 'document-card__subtitle text-caption';
        sub.textContent = subtitle;
        titles.appendChild(sub);
    }
    header.appendChild(titles);
    card.appendChild(header);

    const previewWrap = document.createElement('div');
    previewWrap.className = 'document-card__preview';
    previewWrap.appendChild(previewEl);
    card.appendChild(previewWrap);

    const toolbar = document.createElement('div');
    toolbar.className = 'document-card__toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', `${title} actions`);

    if (actions.onEdit) {
        toolbar.appendChild(createButton({
            label: 'Edit',
            variant: 'ghost',
            size: 'sm',
            onClick: actions.onEdit
        }));
    }
    if (actions.onRegenerate) {
        toolbar.appendChild(createButton({
            label: 'Regenerate',
            variant: 'ghost',
            size: 'sm',
            onClick: actions.onRegenerate
        }));
    }
    if (actions.onCopy) {
        toolbar.appendChild(createButton({
            label: 'Copy',
            variant: 'ghost',
            size: 'sm',
            onClick: actions.onCopy
        }));
    }

    const exportGroup = document.createElement('div');
    exportGroup.className = 'document-card__exports row';

    if (actions.onExportPdf) {
        exportGroup.appendChild(createButton({
            label: 'PDF',
            variant: 'secondary',
            size: 'sm',
            onClick: actions.onExportPdf
        }));
    }
    if (actions.onExportDocx) {
        exportGroup.appendChild(createButton({
            label: 'DOCX',
            variant: 'secondary',
            size: 'sm',
            onClick: actions.onExportDocx
        }));
    }

    if (exportGroup.childElementCount) {
        toolbar.appendChild(exportGroup);
    }

    card.appendChild(toolbar);
    return card;
}
