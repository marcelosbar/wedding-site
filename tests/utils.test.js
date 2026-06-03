/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { escapeHTML, showToast, showConfirm } from '../src/js/utils.js';

describe('escapeHTML', () => {
  it('should escape ampersands', () => {
    expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape angle brackets', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should escape single and double quotes', () => {
    expect(escapeHTML("it's a \"test\"")).toBe("it&#39;s a &quot;test&quot;");
  });

  it('should return empty string for non-string input', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
    expect(escapeHTML(123)).toBe('');
  });

  it('should return the same string if no special characters', () => {
    expect(escapeHTML('Hello World')).toBe('Hello World');
  });
});

describe('showToast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should fall back to alert if toast-container is missing', () => {
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    showToast('Hello world');
    expect(alertSpy).toHaveBeenCalledWith('Hello world');
    alertSpy.mockRestore();
  });

  it('should create and append toast element if toast-container is present', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    showToast('Hello toast');

    const toast = container.querySelector('.toast');
    expect(toast).toBeDefined();
    expect(toast.textContent).toBe('Hello toast');
    expect(toast.classList.contains('show')).toBe(true);

    // Advance timers to trigger removal
    vi.advanceTimersByTime(3500);
    // Simulate transitionend event on toast
    toast.dispatchEvent(new Event('transitionend'));

    expect(container.querySelector('.toast')).toBeNull();
    vi.useRealTimers();
  });
});

describe('showConfirm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should fall back to globalThis.confirm if elements are missing', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockImplementation(() => true);
    const result = await showConfirm('Are you sure?');
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
    expect(result).toBe(true);
    confirmSpy.mockRestore();
  });

  it('should show custom confirm modal and resolve true when ok is clicked', async () => {
    document.body.innerHTML = `
      <div id="confirm-modal" class="confirm-modal-overlay">
        <p id="confirm-modal-message"></p>
        <button id="confirm-modal-cancel"></button>
        <button id="confirm-modal-ok"></button>
      </div>
    `;

    const modal = document.getElementById('confirm-modal');
    const msg = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');

    const promise = showConfirm('Confirm action?');

    expect(msg.textContent).toBe('Confirm action?');
    expect(modal.classList.contains('active')).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');

    okBtn.click();

    const result = await promise;
    expect(result).toBe(true);
    expect(modal.classList.contains('active')).toBe(false);
    expect(modal.getAttribute('aria-hidden')).toBe('true');
  });

  it('should show custom confirm modal and resolve false when cancel is clicked', async () => {
    document.body.innerHTML = `
      <div id="confirm-modal" class="confirm-modal-overlay">
        <p id="confirm-modal-message"></p>
        <button id="confirm-modal-cancel"></button>
        <button id="confirm-modal-ok"></button>
      </div>
    `;

    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    const promise = showConfirm('Confirm action?');
    cancelBtn.click();

    const result = await promise;
    expect(result).toBe(false);
    expect(modal.classList.contains('active')).toBe(false);
  });
});
