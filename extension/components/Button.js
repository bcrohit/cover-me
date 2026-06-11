/**
 * @param {object} opts
 * @param {string} opts.label
 * @param {'primary'|'secondary'|'ghost'|'danger'} [opts.variant]
 * @param {'sm'|'md'} [opts.size]
 * @param {boolean} [opts.fullWidth]
 * @param {boolean} [opts.disabled]
 * @param {string} [opts.id]
 * @param {string} [opts.ariaLabel]
 * @param {() => void} [opts.onClick]
 */
export function createButton({
    label,
    variant = 'secondary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    id,
    ariaLabel,
    onClick
}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn--${variant} btn--${size}${fullWidth ? ' btn--full' : ''}`;
    btn.textContent = label;
    if (id) btn.id = id;
    if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
    btn.disabled = disabled;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
}

export function setButtonLoading(btn, loading, loadingLabel = 'Loading…') {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalLabel = btn.textContent;
        btn.textContent = loadingLabel;
        btn.disabled = true;
        btn.classList.add('btn--loading');
        btn.setAttribute('aria-busy', 'true');
    } else {
        btn.textContent = btn.dataset.originalLabel || btn.textContent;
        btn.disabled = false;
        btn.classList.remove('btn--loading');
        btn.removeAttribute('aria-busy');
    }
}
