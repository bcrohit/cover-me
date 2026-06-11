/**
 * @param {object} opts
 * @param {string} opts.label
 * @param {'default'|'success'|'warning'|'error'|'primary'} [opts.tone]
 */
export function createStatusBadge({ label, tone = 'default' }) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-badge--${tone}`;
    badge.textContent = label;
    return badge;
}
