import { createDocumentCard } from '../components/DocumentCard.js';
import { createEmptyState } from '../components/EmptyState.js';
import { createModal } from '../components/Modal.js';
import { renderCoverPreview, renderCvSections } from '../utils/cv-render.js';
import { API, postBlob, parseFilename } from '../services/api.js';
import {
    getState,
    updateCoverLetterBody,
    updateCvText,
    setStep,
    setLoading
} from '../state/app-state.js';

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    if (chrome && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url, filename }, () => URL.revokeObjectURL(url));
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export function createDocumentsScreen({ onRegenerate }) {
    const screen = document.createElement('div');
    screen.id = 'screen-documents';
    screen.className = 'screen';
    screen.setAttribute('role', 'tabpanel');
    screen.setAttribute('aria-label', 'Generated documents');

    const content = document.createElement('div');
    content.className = 'stack stack--lg';

    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    tabs.setAttribute('role', 'tablist');

    const tabCover = document.createElement('button');
    tabCover.type = 'button';
    tabCover.className = 'tab is-active';
    tabCover.textContent = 'Cover Letter';
    tabCover.setAttribute('role', 'tab');
    tabCover.setAttribute('aria-selected', 'true');

    const tabCv = document.createElement('button');
    tabCv.type = 'button';
    tabCv.className = 'tab';
    tabCv.textContent = 'CV';
    tabCv.setAttribute('role', 'tab');
    tabCv.setAttribute('aria-selected', 'false');

    tabs.appendChild(tabCover);
    tabs.appendChild(tabCv);

    const docHost = document.createElement('div');
    docHost.className = 'stack';

    const emptyHost = document.createElement('div');

    content.appendChild(tabs);
    content.appendChild(docHost);
    content.appendChild(emptyHost);
    screen.appendChild(content);

    let activeTab = 'cover';
    let coverPreviewEl = null;
    let cvPreviewEl = null;

    const editTextarea = document.createElement('textarea');
    editTextarea.className = 'textarea';
    editTextarea.rows = 10;
    editTextarea.setAttribute('aria-label', 'Edit document text');

    const editModal = createModal({
        id: 'editModal',
        title: 'Edit content',
        description: 'Refine wording before exporting.',
        body: editTextarea
    });
    document.body.appendChild(editModal.element);

    function setActiveTab(tab) {
        activeTab = tab;
        tabCover.classList.toggle('is-active', tab === 'cover');
        tabCv.classList.toggle('is-active', tab === 'cv');
        tabCover.setAttribute('aria-selected', tab === 'cover' ? 'true' : 'false');
        tabCv.setAttribute('aria-selected', tab === 'cv' ? 'true' : 'false');
        renderDocuments(getState());
    }

    tabCover.addEventListener('click', () => setActiveTab('cover'));
    tabCv.addEventListener('click', () => setActiveTab('cv'));

    tabs.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = activeTab === 'cover' ? 'cv' : 'cover';
            setActiveTab(next);
            (next === 'cover' ? tabCover : tabCv).focus();
        }
    });

    async function exportDocument(format) {
        const state = getState();
        const docs = state.documents;
        if (!docs) throw new Error('No documents to export.');

        setLoading(true);
        try {
            const documentType = activeTab === 'cover' ? 'cover_letter' : 'cv';
            const payload = {
                outputFormat: format === 'pdf' ? 'pdf' : 'word',
                documentType,
                jobData: docs.jobData,
                profile: docs.profile,
                coverLetter: docs.coverLetter,
                cv: docs.cv
            };

            const response = await postBlob(API.export, payload);
            const blob = await response.blob();
            const defaultName = documentType === 'cover_letter'
                ? `cover_letter.${format === 'pdf' ? 'pdf' : 'docx'}`
                : `cv.${format === 'pdf' ? 'pdf' : 'docx'}`;
            const filename = parseFilename(response.headers.get('content-disposition'), defaultName);
            triggerBlobDownload(blob, filename);
        } finally {
            setLoading(false);
        }
    }

    function openEditor() {
        const state = getState();
        const docs = state.documents;
        if (!docs) return;

        if (activeTab === 'cover') {
            editTextarea.value = (docs.coverLetter && docs.coverLetter.body) || '';
        } else {
            editTextarea.value = (docs.cv && docs.cv.cv_text) || '';
        }
        editModal.open();
    }

    editModal.saveBtn.addEventListener('click', () => {
        const text = editTextarea.value.trim();
        if (activeTab === 'cover') {
            updateCoverLetterBody(text);
        } else {
            updateCvText(text);
        }
        editModal.close();
        renderDocuments(getState());
    });

    function renderDocuments(state) {
        docHost.innerHTML = '';
        emptyHost.innerHTML = '';

        const docs = state.documents;
        if (!docs) {
            emptyHost.appendChild(createEmptyState({
                icon: '📝',
                title: 'No generated documents',
                description: 'Complete job analysis to generate your tailored cover letter and CV.',
                actionLabel: 'Go to analysis',
                onAction: () => setStep('analysis')
            }));
            return;
        }

        if (activeTab === 'cover') {
            const body = (docs.coverLetter && docs.coverLetter.body) || '';
            coverPreviewEl = renderCoverPreview(body);
            docHost.appendChild(createDocumentCard({
                title: 'Generated Cover Letter',
                subtitle: docs.coverLetter && docs.coverLetter.subject
                    ? `Re: ${docs.coverLetter.subject}`
                    : 'Tailored to this role',
                previewEl: coverPreviewEl,
                actions: {
                    onEdit: openEditor,
                    onRegenerate: onRegenerate,
                    onCopy: async () => {
                        try {
                            await navigator.clipboard.writeText(body);
                        } catch {
                            // ignore
                        }
                    },
                    onExportPdf: () => exportDocument('pdf'),
                    onExportDocx: () => exportDocument('docx')
                }
            }));
        } else {
            cvPreviewEl = renderCvSections(docs.cv || {});
            docHost.appendChild(createDocumentCard({
                title: 'Tailored CV',
                subtitle: 'Structured for this application',
                previewEl: cvPreviewEl,
                actions: {
                    onEdit: openEditor,
                    onRegenerate: onRegenerate,
                    onCopy: async () => {
                        const text = (docs.cv && docs.cv.cv_text) || cvPreviewEl.innerText || '';
                        try {
                            await navigator.clipboard.writeText(text);
                        } catch {
                            // ignore
                        }
                    },
                    onExportPdf: () => exportDocument('pdf'),
                    onExportDocx: () => exportDocument('docx')
                }
            }));
        }
    }

    return {
        element: screen,
        render(state) {
            screen.classList.toggle('is-active', state.step === 'documents');
            if (state.step === 'documents') {
                renderDocuments(state);
            }
        }
    };
}
