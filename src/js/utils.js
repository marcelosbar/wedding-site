/**
 * Utility functions shared across modules.
 */

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML special characters.
 * @param {string} str - The string to sanitize.
 * @returns {string} The sanitized string.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Displays a styled toast notification.
 * Falls back to globalThis.alert if toast container is missing.
 * @param {string} message - The message to show.
 */
export function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) {
    globalThis.alert(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  // Force reflow to trigger transition
  void toast.offsetHeight;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    }, { once: true });
  }, 3000);
}

/**
 * Displays a custom confirmation modal dialog.
 * Falls back to globalThis.confirm if elements are missing.
 * @param {string} message - The message to show.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
 */
export function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (!modal || !msgEl || !okBtn || !cancelBtn) {
      resolve(globalThis.confirm(message));
      return;
    }

    msgEl.textContent = message;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const cleanup = (result) => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };

    function onOk() {
      cleanup(true);
    }

    function onCancel() {
      cleanup(false);
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}
