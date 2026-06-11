import { createEmptyState } from '../components/EmptyState.js';
import { createSection } from '../components/Section.js';
import {
    MODE_MANUAL,
    MODE_UPLOAD,
    readFileAsBase64,
    hasValidProfile,
    saveProfileToStorage
} from '../services/storage.js';
import { setProfile, markStepComplete } from '../state/app-state.js';

let mode = MODE_UPLOAD;
let cvAsset = null;

function createSegmentedControl(onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'segmented';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Profile source');

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'segmented__option is-active';
    uploadBtn.textContent = 'Upload CV';
    uploadBtn.dataset.mode = MODE_UPLOAD;

    const manualBtn = document.createElement('button');
    manualBtn.type = 'button';
    manualBtn.className = 'segmented__option';
    manualBtn.textContent = 'Manual entry';
    manualBtn.dataset.mode = MODE_MANUAL;

    function setMode(next) {
        mode = next;
        uploadBtn.classList.toggle('is-active', mode === MODE_UPLOAD);
        manualBtn.classList.toggle('is-active', mode === MODE_MANUAL);
        onChange(mode);
    }

    uploadBtn.addEventListener('click', () => setMode(MODE_UPLOAD));
    manualBtn.addEventListener('click', () => setMode(MODE_MANUAL));

    wrap.appendChild(uploadBtn);
    wrap.appendChild(manualBtn);
    return { element: wrap, setMode };
}

function createUploadPanel(onFile) {
    const zone = document.createElement('label');
    zone.className = 'upload-zone';
    zone.setAttribute('for', 'cvPdfInput');

    const icon = document.createElement('div');
    icon.className = 'upload-zone__icon';
    icon.textContent = '📄';

    const title = document.createElement('p');
    title.className = 'text-subheading';
    title.textContent = 'Drop your CV here';

    const hint = document.createElement('p');
    hint.className = 'text-caption';
    hint.textContent = 'PDF only · Used to tailor your application';

    const status = document.createElement('p');
    status.className = 'text-caption';
    status.id = 'cvFileStatus';
    status.textContent = 'No CV uploaded yet';

    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'cvPdfInput';
    input.accept = 'application/pdf,.pdf';
    input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            status.textContent = 'Please select a PDF file.';
            return;
        }
        const base64Data = await readFileAsBase64(file);
        cvAsset = { filename: file.name, base64Data, uploadedAt: new Date().toISOString() };
        status.textContent = `Uploaded: ${file.name}`;
        onFile(cvAsset);
    });

    zone.appendChild(input);
    zone.appendChild(icon);
    zone.appendChild(title);
    zone.appendChild(hint);
    zone.appendChild(status);

    return { element: zone, statusEl: status, setAsset(asset) {
        cvAsset = asset;
        status.textContent = asset && asset.filename ? `Uploaded: ${asset.filename}` : 'No CV uploaded yet.';
    } };
}

function createField(id, label, placeholder, multiline = false) {
    const field = document.createElement('div');
    field.className = 'field';

    const labelEl = document.createElement('label');
    labelEl.className = 'field__label';
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;

    const input = multiline ? document.createElement('textarea') : document.createElement('input');
    input.id = id;
    input.className = multiline ? 'textarea' : 'input';
    input.placeholder = placeholder;
    if (!multiline) input.type = 'text';

    field.appendChild(labelEl);
    field.appendChild(input);
    return { field, input };
}

function createManualPanel() {
    const panel = document.createElement('div');
    panel.id = 'manualProfileFields';
    panel.className = 'stack section-hidden';

    const name = createField('profileName', 'Full name', 'Jane Doe');
    const skills = createField('profileSkills', 'Core skills', 'Python, React, SQL');
    const experience = createField('profileExperience', 'Experience', '2 years at…', true);
    const projects = createField('profileProjects', 'Key projects', 'Project A, Project B');

    [name, skills, experience, projects].forEach(({ field }) => panel.appendChild(field));
    return {
        element: panel,
        getValues: () => ({
            name: name.input.value.trim(),
            skills: skills.input.value.trim(),
            experience: experience.input.value.trim(),
            projects: projects.input.value.trim()
        }),
        setValues: (p) => {
            name.input.value = p.name || '';
            skills.input.value = p.skills || '';
            experience.input.value = p.experience || '';
            projects.input.value = p.projects || '';
        }
    };
}

export function createProfileScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-profile';
    screen.className = 'screen';
    screen.setAttribute('role', 'tabpanel');
    screen.setAttribute('aria-label', 'Profile setup');

    const content = document.createElement('div');
    content.className = 'stack stack--lg';

    const emptyHost = document.createElement('div');
    const formHost = document.createElement('div');
    formHost.className = 'stack stack--lg section-hidden';

    const segmented = createSegmentedControl((nextMode) => {
        uploadPanel.element.classList.toggle('section-hidden', nextMode !== MODE_UPLOAD);
        manualPanel.element.classList.toggle('section-hidden', nextMode !== MODE_MANUAL);
    });

    const uploadPanel = createUploadPanel(() => {});
    const manualPanel = createManualPanel();

    const profileSection = createSection({
        title: 'Your professional profile',
        description: 'We use this to personalize every application.',
        children: [
            segmented.element,
            uploadPanel.element,
            manualPanel.element
        ]
    });

    formHost.appendChild(profileSection);
    content.appendChild(emptyHost);
    content.appendChild(formHost);
    screen.appendChild(content);

    function showEmpty() {
        emptyHost.innerHTML = '';
        emptyHost.classList.remove('section-hidden');
        formHost.classList.add('section-hidden');
        emptyHost.appendChild(createEmptyState({
            icon: '👤',
            title: 'No profile yet',
            description: 'Add your CV or enter your experience to get started with tailored applications.',
            actionLabel: 'Set up profile',
            onAction: () => {
                emptyHost.classList.add('section-hidden');
                formHost.classList.remove('section-hidden');
            }
        }));
    }

    function hydrate(profile) {
        mode = profile.profileMode || MODE_UPLOAD;
        cvAsset = profile.cvAsset || null;
        segmented.setMode(mode);
        uploadPanel.setAsset(cvAsset);
        manualPanel.setValues(profile);
        uploadPanel.element.classList.toggle('section-hidden', mode !== MODE_UPLOAD);
        manualPanel.element.classList.toggle('section-hidden', mode !== MODE_MANUAL);

        if (hasValidProfile(profile)) {
            emptyHost.classList.add('section-hidden');
            formHost.classList.remove('section-hidden');
        } else {
            showEmpty();
        }
    }

    return {
        element: screen,
        hydrate,
        async save() {
            if (mode === MODE_UPLOAD && !cvAsset) {
                throw new Error('Please upload a CV PDF to continue.');
            }
            if (mode === MODE_MANUAL) {
                const values = manualPanel.getValues();
                if (!values.name && !values.skills && !values.experience) {
                    throw new Error('Please add at least your name or experience.');
                }
            }

            const profile = mode === MODE_MANUAL
                ? { ...manualPanel.getValues(), cvAsset: null, profileMode: MODE_MANUAL }
                : { name: '', skills: '', experience: '', projects: '', cvAsset, profileMode: MODE_UPLOAD };

            await saveProfileToStorage(profile);
            setProfile(profile);
            markStepComplete('profile');
            return profile;
        },
        render(state) {
            screen.classList.toggle('is-active', state.step === 'profile');
            if (state.profile) hydrate(state.profile);
        }
    };
}

export async function loadInitialProfile() {
    const { readProfile } = await import('../services/storage.js');
    const profile = await readProfile();
    setProfile(profile);
    return profile;
}
