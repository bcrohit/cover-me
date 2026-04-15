import { setStatus } from './status.js';

export function initPreviewTabs() {
    const tabCover = document.getElementById('tabCover');
    const tabCV = document.getElementById('tabCV');
    const previewCover = document.getElementById('previewCover');
    const previewCV = document.getElementById('previewCV');
    console.assert(tabCover && tabCV && previewCover && previewCV, 'preview-ui: tab elements missing');
    if (tabCover && tabCV && previewCover && previewCV) {
        tabCover.addEventListener('click', () => {
            tabCover.classList.add('active');
            tabCV.classList.remove('active');
            previewCover.style.display = '';
            previewCV.style.display = 'none';
        });
        tabCV.addEventListener('click', () => {
            tabCV.classList.add('active');
            tabCover.classList.remove('active');
            previewCV.style.display = '';
            previewCover.style.display = 'none';
        });
    }
}

export function initCopyPreview() {
    const btn = document.getElementById('copyPreview');
    console.assert(btn, 'preview-ui: copyPreview missing');
    if (btn) {
        btn.addEventListener('click', async () => {
            const cover = document.getElementById('previewCover');
            const cv = document.getElementById('previewCV');
            console.assert(cover && cv, 'preview-ui: preview elements missing');
            const active = cover && cv && cover.style.display !== 'none' ? cover : cv;
            const text = (active && active.innerText) || '';
            try {
                await navigator.clipboard.writeText(text);
                setStatus('Preview copied.');
            } catch (e) {
                setStatus('Copy failed.');
            }
        });
    }
}

export function initEditModal() {
    const editBtn = document.getElementById('editPreview');
    const closeBtn = document.getElementById('closeEdit');
    const saveBtn = document.getElementById('saveEdit');
    const modal = document.getElementById('editModal');
    const editText = document.getElementById('editText');
    console.assert(editBtn && closeBtn && saveBtn && modal && editText, 'preview-ui: modal elements missing');

    if (editBtn && modal && editText) {
        editBtn.addEventListener('click', () => {
            const cover = document.getElementById('previewCover');
            const cv = document.getElementById('previewCV');
            console.assert(cover && cv, 'preview-ui: preview elements missing');
            const active = cover && cv && cover.style.display !== 'none' ? cover : cv;
            editText.value = (active && active.innerText) || '';
            modal.style.display = 'flex';
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    if (saveBtn && modal && editText) {
        saveBtn.addEventListener('click', () => {
            const text = editText.value || '';
            const cover = document.getElementById('previewCover');
            const cv = document.getElementById('previewCV');
            console.assert(cover && cv, 'preview-ui: preview elements missing');
            const active = cover && cv && cover.style.display !== 'none' ? cover : cv;
            if (active) {
                active.innerHTML = '';
                text.split('\n\n').forEach((p) => {
                    const pnode = document.createElement('p');
                    pnode.textContent = p.trim();
                    active.appendChild(pnode);
                });
            }
            modal.style.display = 'none';
            setStatus('Edited.');
        });
    }
}
