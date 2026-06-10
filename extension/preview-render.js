export function renderCoverPreview(coverEl, previewText) {
    coverEl.innerHTML = '';
    previewText.split('\n\n').forEach((p) => {
        const pnode = document.createElement('p');
        pnode.textContent = p.trim();
        if (pnode.textContent) {
            coverEl.appendChild(pnode);
        }
    });
}

export function renderCvPreview(cvEl, cvText) {
    const text = (cvText || '').trim();
    cvEl.innerHTML = '';
    if (!text) return;
    text.split('\n\n').forEach((paragraph) => {
        const pnode = document.createElement('p');
        pnode.textContent = paragraph.trim();
        if (pnode.textContent) {
            cvEl.appendChild(pnode);
        }
    });
    if (!cvEl.innerText.trim()) {
        text.split('\n').forEach((line) => {
            const pnode = document.createElement('p');
            pnode.textContent = line.trim();
            if (pnode.textContent) {
                cvEl.appendChild(pnode);
            }
        });
    }
}
