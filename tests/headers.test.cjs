const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8');

const headers = read('_headers');
const csp = (headers.match(/Content-Security-Policy: (.+)/) || [])[1] || '';
const hash = text => `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`;

test('CSP allows each inline block in 404.html by hash (update _headers after editing them)', () => {
  assert(csp, 'Content-Security-Policy header missing');
  const html = read('404.html');
  for (const tag of ['style', 'script']) {
    const blocks = [...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[1]);
    assert(blocks.length, `no inline ${tag} found`);
    for (const block of blocks) assert(csp.includes(hash(block)), `${tag} hash ${hash(block)} missing from CSP`);
  }
});

test('site pages have no inline scripts, handlers or style attributes blocked by CSP', () => {
  for (const page of ['index.html', 'privacy.html']) {
    const html = read(page);
    assert(!/<script(?![^>]*\b(?:src=|type="application\/ld\+json"))[^>]*>/.test(html), `${page}: inline script`);
    assert(!/\son[a-z]+="/.test(html), `${page}: inline event handler`);
    assert(!/\sstyle="/.test(html), `${page}: style attribute`);
    assert(!/<style>/.test(html), `${page}: inline style element`);
  }
});

test('CSP permits the enquiry endpoint and its Apps Script redirect target', () => {
  const endpoint = read('assets/js/config.js').match(/https:\/\/[^'"]+/)[0];
  assert(csp.includes(new URL(endpoint).origin), 'endpoint origin missing from connect-src');
  assert(csp.includes('https://script.googleusercontent.com'), 'Apps Script redirect origin missing');
});

// Print current hashes: PRINT_HASHES=1 node tests/headers.test.cjs
if (process.env.PRINT_HASHES) {
  const html = read('404.html');
  for (const tag of ['style', 'script']) for (const m of html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))) console.log(tag, hash(m[1]));
}
