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

test('internal links use clean URLs served by Workers assets (no .html redirect hops)', () => {
  for (const page of ['index.html', 'privacy.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const internal = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(url => !/^(https?:|mailto:|tel:|#|assets\/)/.test(url));
    for (const url of internal) assert(!/\.html\b/.test(url), `${page}: ${url} should be a clean URL`);
  }
});

test('canonical URLs match sitemap entries', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const page of ['index.html', 'privacy.html']) {
    const canonical = fs.readFileSync(path.join(root, page), 'utf8').match(/rel="canonical" href="([^"]+)"/)[1];
    assert(locs.includes(canonical), `${page} canonical ${canonical} missing from sitemap`);
  }
});

test('wrangler config deploys public/ as static assets with the custom 404 page', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(path.normalize(config.assets.directory), path.normalize('./public'));
  assert.equal(config.assets.not_found_handling, '404-page');
  assert(!config.main, 'static site: no Worker script expected');
});
