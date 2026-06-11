const API_BASE = 'http://127.0.0.1:8000';

export const API = {
    analyze: `${API_BASE}/api/analyze`,
    generateDocuments: `${API_BASE}/api/generate-documents`,
    export: `${API_BASE}/api/generate`
};

export async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error((data && (data.message || data.error)) || `Request failed (${response.status})`);
    }
    return data;
}

export async function postBlob(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        let errorText = `Export failed (${response.status})`;
        try {
            const payloadError = await response.json();
            if (payloadError && payloadError.error) errorText = payloadError.error;
        } catch {
            // ignore
        }
        throw new Error(errorText);
    }
    return response;
}

export function parseFilename(contentDisposition, fallback) {
    const disposition = String(contentDisposition || '');
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    if (!match) return fallback;
    try {
        return decodeURIComponent(match[1].replace(/"/g, '').trim());
    } catch {
        return match[1].replace(/"/g, '').trim();
    }
}
