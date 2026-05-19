/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { escapeHTML } from '../src/js/utils.js';

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
