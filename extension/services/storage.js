const MODE_UPLOAD = 'upload';
const MODE_MANUAL = 'manual';

export { MODE_UPLOAD, MODE_MANUAL };

export function readProfile() {
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

export function saveProfileToStorage(profile) {
    return new Promise((resolve) => {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ profile }, resolve);
            return;
        }
        resolve();
    });
}

export function clearProfileStorage() {
    const empty = {
        name: '',
        skills: '',
        experience: '',
        projects: '',
        email: '',
        phone: '',
        location: '',
        cvAsset: null,
        profileMode: MODE_UPLOAD
    };
    return saveProfileToStorage(empty);
}

export function readFileAsBase64(file) {
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

export function buildAnalyzePayload(jobData, profile) {
    const profileMode = profile && profile.profileMode === MODE_MANUAL ? MODE_MANUAL : MODE_UPLOAD;
    const cvAsset = profile && profile.cvAsset ? profile.cvAsset : null;
    const manualProfile = {
        name: (profile && profile.name) || '',
        skills: (profile && profile.skills) || '',
        experience: (profile && profile.experience) || '',
        projects: (profile && profile.projects) || ''
    };

    const payload = {
        profileMode,
        jobData,
        profile: profileMode === MODE_MANUAL
            ? manualProfile
            : {
                filename: (cvAsset && cvAsset.filename) || '',
                data: (cvAsset && cvAsset.base64Data) || ''
            }
    };

    if (profileMode === MODE_UPLOAD) {
        return {
            ...payload,
            filename: payload.profile.filename || '',
            data: payload.profile.data || ''
        };
    }
    return payload;
}

export function hasValidProfile(profile) {
    if (!profile || !profile.profileMode) return false;
    if (profile.profileMode === MODE_MANUAL) {
        return Boolean(
            (profile.name && profile.name.trim())
            || (profile.skills && profile.skills.trim())
            || (profile.experience && profile.experience.trim())
        );
    }
    return Boolean(profile.cvAsset && profile.cvAsset.base64Data);
}
