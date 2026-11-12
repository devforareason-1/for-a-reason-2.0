const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const page of ['index.html', 'privacy.html']) {
  test(`${page} stylesheet and scripts resolve to actual files`, () => {
    const html = fs.readFileSync(page, 'utf8');
    const urls = [...html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"/g)]
      .map(match => match[1]).filter(url => url.startsWith('assets/'));
    assert(urls.some(url => url.startsWith('assets/site.css?')));
    for (const url of urls) {
      assert(!/[\u2018\u2019\u201c\u201d]/.test(url), `Invalid punctuation in asset URL: ${url}`);
      const resolved = new URL(url, 'http://localhost/');
      assert(fs.existsSync(path.join(process.cwd(), decodeURIComponent(resolved.pathname))), `Missing asset: ${url}`);
    }
  });
}
