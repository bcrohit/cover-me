export function setStatus(message) {
    const el = document.getElementById('status');
    console.assert(el, 'status: #status element missing');
    if (el) el.innerText = message;
}
