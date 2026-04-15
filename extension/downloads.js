import { getGeneratedFiles } from './generated-files.js';

export function downloadBase64File(file) {
    const byteChars = atob(file.data);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.content_type });
    const url = URL.createObjectURL(blob);
    if (chrome && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url, filename: file.filename }, () => {
            URL.revokeObjectURL(url);
        });
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export function initDownloadListeners() {
    const docxBtn = document.getElementById('downloadDocx');
    const pdfBtn = document.getElementById('downloadPdf');
    console.assert(docxBtn && pdfBtn, 'downloads: buttons missing');
    if (docxBtn) {
        docxBtn.addEventListener('click', () => {
            const files = getGeneratedFiles();
            const f = files.find((x) => x.content_type && x.content_type.includes('word')) || files[0];
            if (f) downloadBase64File(f);
        });
    }
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            const files = getGeneratedFiles();
            const f = files.find((x) => x.content_type && x.content_type.includes('pdf')) || files[1] || files[0];
            if (f) downloadBase64File(f);
        });
    }
}
