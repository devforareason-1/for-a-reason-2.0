const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');
for (const page of ['index.html', 'privacy.html', '404.html']) {
  test(`${page} stylesheet and scripts resolve to actual files`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const urls = [...html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"/g)]
      .map(match => match[1]).map(url => url.replace(/^\//, '')).filter(url => url.startsWith('assets/'));
    assert(urls.some(url => url.startsWith('assets/css/site.css') || page === '404.html'));
    for (const url of urls) {
      assert(!/[\u2018\u2019\u201c\u201d]/.test(url), `Invalid punctuation in asset URL: ${url}`);
      const resolved = new URL(url, 'http://localhost/');
      assert(fs.existsSync(path.join(root, decodeURIComponent(resolved.pathname))), `Missing asset: ${url}`);
    }
  });
}
