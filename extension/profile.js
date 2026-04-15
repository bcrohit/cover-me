import { setStatus } from './status.js';

export function loadProfile() {
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['profile'], (res) => {
            const p = res.profile || {};
            const nameEl = document.getElementById('name');
            const skillsEl = document.getElementById('skills');
            const expEl = document.getElementById('experience');
            const projEl = document.getElementById('projects');
            console.assert(nameEl && skillsEl && expEl && projEl, 'profile: form elements missing');
            if (nameEl) nameEl.value = p.name || '';
            if (skillsEl) skillsEl.value = p.skills || '';
            if (expEl) expEl.value = p.experience || '';
            if (projEl) projEl.value = p.projects || '';
        });
    }
}

export function saveProfile() {
    const nameEl = document.getElementById('name');
    const skillsEl = document.getElementById('skills');
    const expEl = document.getElementById('experience');
    const projEl = document.getElementById('projects');
    console.assert(nameEl && skillsEl && expEl && projEl, 'profile: form elements missing');
    const p = {
        name: (nameEl && nameEl.value.trim()) || '',
        skills: (skillsEl && skillsEl.value.trim()) || '',
        experience: (expEl && expEl.value.trim()) || '',
        projects: (projEl && projEl.value.trim()) || ''
    };
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ profile: p }, () => {
            setStatus('Profile saved.');
        });
    }
}

export function initProfileUI() {
    const saveBtn = document.getElementById('saveProfile');
    const clearBtn = document.getElementById('clearProfile');
    console.assert(saveBtn && clearBtn, 'profile: buttons missing');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const empty = { name: '', skills: '', experience: '', projects: '' };
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ profile: empty }, () => {
                    loadProfile();
                    setStatus('Profile cleared.');
                });
            }
        });
    }
    loadProfile();
}
