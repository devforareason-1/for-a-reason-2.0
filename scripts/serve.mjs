// Local preview of public/ with production-like behaviour: _headers applied, real 404 status.
// Usage: npm start  (PORT=8080 by default). No dependencies.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const port = Number(process.env.PORT) || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Parse _headers blocks: an unindented path pattern followed by indented "Name: value" lines.
const rules = [];
for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
  if (/^\S/.test(line)) rules.push({ pattern: line.trim(), headers: {} });
  else if (line.trim() && rules.length) {
    const [name, ...value] = line.trim().split(':');
    rules.at(-1).headers[name] = value.join(':').trim();
  }
}
const matches = (pattern, url) => pattern.endsWith('*') ? url.startsWith(pattern.slice(0, -1)) : url === pattern;
// Local http:// cannot be upgraded to https.
const headersFor = url => Object.fromEntries(rules.filter(r => matches(r.pattern, url)).flatMap(r => Object.entries(r.headers))
  .filter(([name]) => name !== 'Strict-Transport-Security')
  .map(([name, value]) => [name, value.replace(/;\s*upgrade-insecure-requests/, '')]));

http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (url.endsWith('/')) url += 'index.html';
  const file = path.join(root, url);
  const found = file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() && !url.endsWith('/_headers');
  const served = found ? file : path.join(root, '404.html');
  res.writeHead(found ? 200 : 404, { ...headersFor(url), 'Content-Type': types[path.extname(served)] || 'application/octet-stream' });
  fs.createReadStream(served).pipe(res);
}).listen(port, () => console.log(`Serving public/ at http://localhost:${port}`));
