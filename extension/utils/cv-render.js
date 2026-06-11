import { createCollapsible } from '../components/Collapsible.js';

function createProse(text) {
    const el = document.createElement('div');
    el.className = 'preview-prose text-caption';
    (text || '').split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const p = document.createElement('p');
        p.textContent = trimmed;
        el.appendChild(p);
    });
    return el;
}

function createExperienceEntry(entry) {
    const wrap = document.createElement('div');
    wrap.className = 'cv-entry';

    const role = document.createElement('p');
    role.className = 'cv-entry__role text-body';
    role.textContent = [entry.role, entry.company].filter(Boolean).join(' · ') || 'Experience';

    const meta = document.createElement('p');
    meta.className = 'cv-entry__meta';
    const dates = [entry.start_date, entry.end_date].filter(Boolean).join(' – ');
    meta.textContent = [entry.location, dates].filter(Boolean).join(' · ');

    wrap.appendChild(role);
    if (meta.textContent) wrap.appendChild(meta);

    if (entry.highlights && entry.highlights.length) {
        const ul = document.createElement('ul');
        ul.className = 'cv-entry__highlights';
        entry.highlights.forEach((h) => {
            const li = document.createElement('li');
            li.textContent = h;
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
    }

    return wrap;
}

function createProjectEntry(entry) {
    const wrap = document.createElement('div');
    wrap.className = 'cv-entry';

    const name = document.createElement('p');
    name.className = 'cv-entry__role text-body';
    name.textContent = entry.name || 'Project';

    const meta = document.createElement('p');
    meta.className = 'cv-entry__meta';
    meta.textContent = [entry.role, ...(entry.technologies || [])].filter(Boolean).join(' · ');

    wrap.appendChild(name);
    if (meta.textContent) wrap.appendChild(meta);

    if (entry.highlights && entry.highlights.length) {
        const ul = document.createElement('ul');
        ul.className = 'cv-entry__highlights';
        entry.highlights.forEach((h) => {
            const li = document.createElement('li');
            li.textContent = h;
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
    }

    return wrap;
}

function createChipList(items, variant) {
    const list = document.createElement('div');
    list.className = 'chip-list';
    (items || []).forEach((item) => {
        const chip = document.createElement('span');
        chip.className = `chip${variant ? ` chip--${variant}` : ''}`;
        chip.textContent = item;
        list.appendChild(chip);
    });
    return list;
}

/**
 * Build collapsible CV sections from structured tailored_cv data.
 * @param {object} tailoredCv
 */
export function renderCvSections(tailoredCv) {
    const container = document.createElement('div');
    container.className = 'stack';

    const details = tailoredCv.candidate_details || tailoredCv;
    const summary = tailoredCv.summary || details.summary || '';
    const skills = tailoredCv.skills || details.skills || details.technical_skills || [];
    const experience = tailoredCv.experience || details.experience || [];
    const projects = tailoredCv.projects || details.projects || [];

    if (summary) {
        container.appendChild(createCollapsible({
            title: 'Summary',
            children: createProse(summary),
            open: true
        }));
    }

    if (experience.length) {
        const expBody = document.createElement('div');
        expBody.className = 'stack stack--sm';
        experience.forEach((entry) => expBody.appendChild(createExperienceEntry(entry)));
        container.appendChild(createCollapsible({ title: 'Experience', children: expBody }));
    }

    if (projects.length) {
        const projBody = document.createElement('div');
        projBody.className = 'stack stack--sm';
        projects.forEach((entry) => projBody.appendChild(createProjectEntry(entry)));
        container.appendChild(createCollapsible({ title: 'Projects', children: projBody }));
    }

    const skillItems = Array.isArray(skills) ? skills : String(skills).split(',').map((s) => s.trim()).filter(Boolean);
    if (skillItems.length) {
        container.appendChild(createCollapsible({
            title: 'Skills',
            children: createChipList(skillItems)
        }));
    }

    if (!container.childElementCount) {
        const fallback = document.createElement('div');
        fallback.className = 'preview-prose';
        const text = (tailoredCv.cv_text || '').trim();
        if (text) {
            text.split('\n\n').forEach((p) => {
                const node = document.createElement('p');
                node.textContent = p.trim();
                if (node.textContent) fallback.appendChild(node);
            });
        }
        container.appendChild(fallback);
    }

    return container;
}

export function renderCoverPreview(text) {
    const el = document.createElement('div');
    el.className = 'preview-prose';
    (text || '').split('\n\n').forEach((p) => {
        const node = document.createElement('p');
        node.textContent = p.trim();
        if (node.textContent) el.appendChild(node);
    });
    return el;
}
