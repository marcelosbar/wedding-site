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
    let modal = document.getElementById('confirm-modal');
    let msgEl = document.getElementById('confirm-modal-message');
    let okBtn = document.getElementById('confirm-modal-ok');
    let cancelBtn = document.getElementById('confirm-modal-cancel');

    if (!modal || !msgEl || !okBtn || !cancelBtn) {
      if (modal) {
        modal.remove();
      }
      modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'confirm-modal-overlay';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="confirm-modal-box">
          <h4 id="confirm-modal-title">Confirmação</h4>
          <p id="confirm-modal-message">Tem certeza?</p>
          <div class="confirm-modal-actions">
            <button id="confirm-modal-cancel" class="btn btn-secondary btn-sm">Cancelar</button>
            <button id="confirm-modal-ok" class="btn btn-accent btn-sm">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      msgEl = document.getElementById('confirm-modal-message');
      okBtn = document.getElementById('confirm-modal-ok');
      cancelBtn = document.getElementById('confirm-modal-cancel');
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

/**
 * Displays a custom alert modal dialog.
 * Falls back to dynamic creation if elements are missing.
 * @param {string} message - The message to show.
 * @returns {Promise<void>} Resolves when the user clicks OK.
 */
export function showAlert(message, title = 'Aviso') {
  return new Promise((resolve) => {
    let modal = document.getElementById('alert-modal');
    let msgEl = document.getElementById('alert-modal-message');
    let okBtn = document.getElementById('alert-modal-ok');

    if (!modal || !msgEl || !okBtn) {
      if (modal) {
        modal.remove();
      }
      modal = document.createElement('div');
      modal.id = 'alert-modal';
      modal.className = 'confirm-modal-overlay';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="confirm-modal-box">
          <h4 id="alert-modal-title">Aviso</h4>
          <p id="alert-modal-message">Houve um problema.</p>
          <div class="confirm-modal-actions">
            <button id="alert-modal-ok" class="btn btn-accent btn-sm">Entendido</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      msgEl = document.getElementById('alert-modal-message');
      okBtn = document.getElementById('alert-modal-ok');
    }

    const titleEl = document.getElementById('alert-modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }

    msgEl.textContent = message;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const cleanup = () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      okBtn.removeEventListener('click', onOk);
      resolve();
    };

    function onOk() {
      cleanup();
    }

    okBtn.addEventListener('click', onOk);
  });
}
