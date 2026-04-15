export function renderCoverPreview(coverEl, previewText) {
    coverEl.innerHTML = '';
    previewText.split('\n\n').forEach((p) => {
        const pnode = document.createElement('p');
        pnode.textContent = p.trim();
        coverEl.appendChild(pnode);
    });
}

export function renderCvPreview(cvEl, profile) {
    const name = profile.name || '';
    const skills = profile.skills || '';
    const experience = profile.experience || '';
    const projects = profile.projects || '';
    cvEl.innerHTML = '';
    if (name) cvEl.appendChild(Object.assign(document.createElement('h3'), { textContent: name }));
    if (skills) {
        const el = document.createElement('div');
        el.innerHTML = '<strong>Skills</strong><div>' + skills + '</div>';
        cvEl.appendChild(el);
    }
    if (experience) {
        const el = document.createElement('div');
        el.innerHTML = '<strong>Experience</strong><div>' + experience.replace(/\n/g, '<br/>') + '</div>';
        cvEl.appendChild(el);
    }
    if (projects) {
        const el = document.createElement('div');
        el.innerHTML =
            '<strong>Projects</strong><ul>' +
            projects.split(',').map((s) => '<li>' + s.trim() + '</li>').join('') +
            '</ul>';
        cvEl.appendChild(el);
    }
}
