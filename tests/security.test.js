import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Security Configuration Regressions', () => {
  it('should enforce strict Content Security Policy in firebase.json', () => {
    const configPath = path.resolve(__dirname, '../firebase.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const headers = config.hosting.headers[0].headers;
    
    const cspHeader = headers.find(h => h.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();
    
    const cspValue = cspHeader.value;
    // Enforce no unsafe-inline
    expect(cspValue).not.toContain("'unsafe-inline'");
    // Enforce fallbacks
    expect(cspValue).toContain("object-src 'none'");
    expect(cspValue).toContain("base-uri 'self'");
  });

  it('should ensure HTML files have no inline styling or inline onclick attributes', () => {
    const htmlFiles = [
      path.resolve(__dirname, '../src/index.html'),
      path.resolve(__dirname, '../src/admin.html')
    ];

    htmlFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 1. Check for inline style attributes: style="..."
      const inlineStyleMatch = content.match(/\sstyle=/i);
      expect(inlineStyleMatch).toBeNull();
      
      // 2. Check for inline style blocks: <style>...</style>
      const styleBlockMatch = content.match(/<style[^>]*>/i);
      expect(styleBlockMatch).toBeNull();

      // 3. Check for inline event handler attributes: onclick, onload, etc.
      const inlineEventMatch = content.match(/\son[a-z]+=/i);
      expect(inlineEventMatch).toBeNull();
    });
  });

  it('should define CSP frame-ancestors and form-action directives (ZAP alert 10055)', () => {
    const configPath = path.resolve(__dirname, '../firebase.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const headers = config.hosting.headers[0].headers;

    const cspHeader = headers.find(h => h.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();

    const cspValue = cspHeader.value;
    // frame-ancestors and form-action do NOT fall back to default-src,
    // so they must be explicitly declared to prevent ZAP alert 10055.
    expect(cspValue).toContain("frame-ancestors 'self'");
    expect(cspValue).toContain("form-action 'self'");
  });

  it('should set Cross-Origin-Embedder-Policy to credentialless (ZAP alert 90004)', () => {
    const configPath = path.resolve(__dirname, '../firebase.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const headers = config.hosting.headers[0].headers;

    const coepHeader = headers.find(h => h.key === 'Cross-Origin-Embedder-Policy');
    expect(coepHeader).toBeDefined();
    // 'unsafe-none' provides no isolation. 'credentialless' is the safe middle-ground:
    // it provides cross-origin isolation without blocking Firebase Auth popups,
    // which would happen with 'require-corp'.
    expect(coepHeader.value).toBe('credentialless');
  });

  it('should keep Cross-Origin-Opener-Policy as same-origin-allow-popups (intentional)', () => {
    const configPath = path.resolve(__dirname, '../firebase.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const headers = config.hosting.headers[0].headers;

    const coopHeader = headers.find(h => h.key === 'Cross-Origin-Opener-Policy');
    expect(coopHeader).toBeDefined();
    // INTENTIONAL DEVIATION: ZAP prefers 'same-origin', but we use 'same-origin-allow-popups'
    // to preserve the Google Sign-In popup flow used by the admin panel.
    // Changing this to 'same-origin' would silently break Firebase Authentication.
    expect(coopHeader.value).toBe('same-origin-allow-popups');
  });
});
