import { getGenerationContext, updateGeneratedCoverBody, updateGeneratedCvText } from './generated-files.js';
import { setStatus } from './status.js';

const API_GENERATE = 'http://127.0.0.1:8000/api/generate';

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    if (chrome && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url, filename }, () => {
            URL.revokeObjectURL(url);
        });
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

function activeDocumentType() {
    const cover = document.getElementById('previewCover');
    const cv = document.getElementById('previewCV');
    console.assert(cover && cv, 'downloads: preview elements missing');
    if (!(cover && cv)) return 'cover_letter';
    return cover.style.display !== 'none' ? 'cover_letter' : 'cv';
}

function getActivePreviewText(documentType) {
    const id = documentType === 'cover_letter' ? 'previewCover' : 'previewCV';
    const el = document.getElementById(id);
    return el ? (el.innerText || '').trim() : '';
}

function parseFilename(contentDisposition, fallback) {
    const disposition = String(contentDisposition || '');
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    if (!match) return fallback;
    try {
        return decodeURIComponent(match[1].replace(/"/g, '').trim());
    } catch {
        return match[1].replace(/"/g, '').trim();
    }
}

async function requestAndDownload(outputFormat) {
    const documentType = activeDocumentType();
    const currentText = getActivePreviewText(documentType);
    if (documentType === 'cover_letter') {
        updateGeneratedCoverBody(currentText);
    } else {
        updateGeneratedCvText(currentText);
    }
    const context = getGenerationContext();
    const payload = {
        outputFormat,
        documentType,
        jobData: context.jobData,
        profile: context.profile,
        coverLetter: context.coverLetter,
        cv: context.cv
    };

    setStatus(`Generating ${outputFormat.toUpperCase()}...`);
    const response = await fetch(API_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let errorText = `Generation request failed (${response.status})`;
        try {
            const payloadError = await response.json();
            if (payloadError && payloadError.error) errorText = payloadError.error;
        } catch {
            // ignore non-JSON errors
        }
        throw new Error(errorText);
    }

    const blob = await response.blob();
    const defaultName = documentType === 'cover_letter'
        ? `cover_letter.${outputFormat === 'pdf' ? 'pdf' : 'docx'}`
        : `cv.${outputFormat === 'pdf' ? 'pdf' : 'docx'}`;
    const filename = parseFilename(response.headers.get('content-disposition'), defaultName);
    triggerBlobDownload(blob, filename);
    setStatus(`Downloaded ${filename}`);
}

export function initDownloadListeners() {
    const docxBtn = document.getElementById('downloadDocx');
    const pdfBtn = document.getElementById('downloadPdf');
    console.assert(docxBtn && pdfBtn, 'downloads: buttons missing');
    if (docxBtn) {
        docxBtn.addEventListener('click', async () => {
            try {
                await requestAndDownload('word');
            } catch (err) {
                console.error('downloads: DOCX generation failed', err);
                setStatus((err && err.message) || 'DOCX generation failed.');
            }
        });
    }
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async () => {
            try {
                await requestAndDownload('pdf');
            } catch (err) {
                console.error('downloads: PDF generation failed', err);
                setStatus((err && err.message) || 'PDF generation failed.');
            }
        });
    }
}
