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

  it('should set Cross-Origin-Embedder-Policy to unsafe-none (intentional)', () => {
    const configPath = path.resolve(__dirname, '../firebase.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const headers = config.hosting.headers[0].headers;

    const coepHeader = headers.find(h => h.key === 'Cross-Origin-Embedder-Policy');
    expect(coepHeader).toBeDefined();
    // INTENTIONAL DEVIATION: ZAP flags anything other than 'require-corp' as invalid,
    // but both 'credentialless' and 'require-corp' break Firebase Authentication.
    // Firebase Auth injects a hidden cross-origin iframe (/__/auth/iframe) that loads
    // with credentials from lorenaemarcelo2026.firebaseapp.com. COEP blocks it because
    // that domain does not serve a Cross-Origin-Resource-Policy header.
    // 'unsafe-none' is the only value compatible with Firebase Auth popup/iframe flow.
    expect(coepHeader.value).toBe('unsafe-none');
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

  it('should enforce strict read security rules on config/admins in firestore.rules', () => {
    const rulesPath = path.resolve(__dirname, '../firestore.rules');
    const content = fs.readFileSync(rulesPath, 'utf-8');
    
    // Find the match /config/admins block
    const adminsMatchRegex = /match\s+\/config\/admins\s*\{([\s\S]*?)\}/;
    const matchBlock = content.match(adminsMatchRegex);
    
    expect(matchBlock).not.toBeNull();
    const rulesBlock = matchBlock[1];
    
    // Assert that read rule requires authentication and does not allow open read (if true)
    const readRuleRegex = /allow\s+read:\s*if\s*([\s\S]*?);/;
    const readRule = rulesBlock.match(readRuleRegex);
    
    expect(readRule).not.toBeNull();
    const readCondition = readRule[1];
    
    // Enforce that the read rule checks request.auth and doesn't just return true
    expect(readCondition).toContain('request.auth != null');
    expect(readCondition).not.toBe('true');
  });
});
