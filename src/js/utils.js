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
