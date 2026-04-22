import { setStatus } from './status.js';

const MODE_UPLOAD = 'upload';
const MODE_MANUAL = 'manual';

function readStoredProfile() {
    return new Promise((resolve) => {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['profile'], (res) => {
                resolve((res && res.profile) || {});
            });
            return;
        }
        resolve({});
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(file);
    });
}

function getSelectedProfileMode() {
    const uploadRadio = document.getElementById('modeUpload');
    const manualRadio = document.getElementById('modeManual');
    console.assert(uploadRadio && manualRadio, 'profile: mode selectors missing');
    if (!(uploadRadio && manualRadio)) return MODE_UPLOAD;
    return manualRadio.checked ? MODE_MANUAL : MODE_UPLOAD;
}

function applyProfileMode(mode) {
    const uploadRadio = document.getElementById('modeUpload');
    const manualRadio = document.getElementById('modeManual');
    const uploadFields = document.getElementById('uploadProfileFields');
    const manualFields = document.getElementById('manualProfileFields');
    console.assert(uploadRadio && manualRadio && uploadFields && manualFields, 'profile: mode UI missing');
    if (!(uploadRadio && manualRadio && uploadFields && manualFields)) return;

    const activeMode = mode === MODE_MANUAL ? MODE_MANUAL : MODE_UPLOAD;
    uploadRadio.checked = activeMode === MODE_UPLOAD;
    manualRadio.checked = activeMode === MODE_MANUAL;
    uploadFields.classList.toggle('section-hidden', activeMode !== MODE_UPLOAD);
    manualFields.classList.toggle('section-hidden', activeMode !== MODE_MANUAL);
}

export function loadProfile() {
    if (!(chrome.storage && chrome.storage.local)) return;
    chrome.storage.local.get(['profile'], (res) => {
        const p = res.profile || {};
        const profileMode = p.profileMode || MODE_UPLOAD;
        const nameEl = document.getElementById('name');
        const skillsEl = document.getElementById('skills');
        const expEl = document.getElementById('experience');
        const projEl = document.getElementById('projects');
        const cvInput = document.getElementById('cvPdf');
        const cvStatusEl = document.getElementById('cvFileStatus');
        console.assert(nameEl && skillsEl && expEl && projEl && cvInput && cvStatusEl, 'profile: form elements missing');
        if (nameEl) nameEl.value = p.name || '';
        if (skillsEl) skillsEl.value = p.skills || '';
        if (expEl) expEl.value = p.experience || '';
        if (projEl) projEl.value = p.projects || '';
        if (cvInput) cvInput.value = '';
        applyProfileMode(profileMode);
        if (cvStatusEl) {
            cvStatusEl.textContent = p.cvAsset && p.cvAsset.filename
                ? `Uploaded: ${p.cvAsset.filename}`
                : 'No CV uploaded yet.';
        }
    });
}

export async function saveProfile() {
    const nameEl = document.getElementById('name');
    const skillsEl = document.getElementById('skills');
    const expEl = document.getElementById('experience');
    const projEl = document.getElementById('projects');
    const cvInput = document.getElementById('cvPdf');
    const cvStatusEl = document.getElementById('cvFileStatus');
    console.assert(nameEl && skillsEl && expEl && projEl && cvInput && cvStatusEl, 'profile: form elements missing');

    const previousProfile = await readStoredProfile();
    const profileMode = getSelectedProfileMode();
    const cvFile = cvInput && cvInput.files && cvInput.files[0] ? cvInput.files[0] : null;
    let cvAsset = profileMode === MODE_UPLOAD ? (previousProfile.cvAsset || null) : null;

    try {
        if (profileMode === MODE_UPLOAD && cvFile) {
            const isPdf = cvFile.type === 'application/pdf' || cvFile.name.toLowerCase().endsWith('.pdf');
            console.assert(isPdf, 'profile: uploaded CV must be a PDF');
            if (!isPdf) throw new Error('Please select a PDF file.');
            setStatus('Reading CV PDF...');
            const base64Data = await readFileAsBase64(cvFile);
            cvAsset = {
                filename: cvFile.name,
                base64Data,
                uploadedAt: new Date().toISOString()
            };
            if (cvStatusEl) cvStatusEl.textContent = `Uploaded: ${cvAsset.filename}`;
        }
        if (profileMode === MODE_UPLOAD && !cvAsset) {
            throw new Error('Please upload a CV PDF before saving.');
        }
    } catch (err) {
        console.error('profile: CV upload failed', err);
        setStatus((err && err.message) || 'CV upload failed.');
        return;
    }

    const p = {
        name: profileMode === MODE_MANUAL ? ((nameEl && nameEl.value.trim()) || '') : '',
        skills: profileMode === MODE_MANUAL ? ((skillsEl && skillsEl.value.trim()) || '') : '',
        experience: profileMode === MODE_MANUAL ? ((expEl && expEl.value.trim()) || '') : '',
        projects: profileMode === MODE_MANUAL ? ((projEl && projEl.value.trim()) || '') : '',
        cvAsset: profileMode === MODE_UPLOAD ? cvAsset : null,
        profileMode
    };
    if (chrome.storage && chrome.storage.local) {
        setStatus('Saving profile...');
        await new Promise((resolve) => {
            chrome.storage.local.set({ profile: p }, resolve);
        });
        setStatus('Profile saved.');
    }
}

function initProfileModeSelector() {
    const uploadRadio = document.getElementById('modeUpload');
    const manualRadio = document.getElementById('modeManual');
    console.assert(uploadRadio && manualRadio, 'profile: mode selector missing');
    if (!(uploadRadio && manualRadio)) return;

    uploadRadio.addEventListener('change', () => applyProfileMode(MODE_UPLOAD));
    manualRadio.addEventListener('change', () => applyProfileMode(MODE_MANUAL));
    applyProfileMode(getSelectedProfileMode());
}

export function initProfileUI() {
    const saveBtn = document.getElementById('saveProfile');
    const clearBtn = document.getElementById('clearProfile');
    console.assert(clearBtn, 'profile: clear button missing');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const empty = { name: '', skills: '', experience: '', projects: '', cvAsset: null, profileMode: MODE_UPLOAD };
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ profile: empty }, () => {
                    loadProfile();
                    setStatus('Profile cleared.');
                });
            }
        });
    }
    initProfileModeSelector();
    loadProfile();
}
