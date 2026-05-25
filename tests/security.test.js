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
});
