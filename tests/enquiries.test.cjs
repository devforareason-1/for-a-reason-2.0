const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function receiver() {
  const rows = [['headers']];
  let locked = false;
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: row => rows.push(row),
    getRange: () => ({ createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => rows.some(row => row[0] === id) }) }) })
  };
  const context = vm.createContext({
    ContentService: { createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }), MimeType: { JSON: 'json' } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'sheet-id' }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { locked = true; }, hasLock: () => locked, releaseLock: () => { locked = false; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => {} }, console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'google-sheets', 'Code.gs'), 'utf8'), context);
  return { post: p => context.doPost({ parameter: p }), rows, locked: () => locked };
}
const valid = () => ({ requestId: randomUUID(), name: 'Test business', email: 'test@example.com', phone: '', needs: 'Website, CRM', msg: 'A test brief', engagement: 'One-time project', budget: '₹25,000–₹50,000' });
test('receiver confirms saves, deduplicates retries and escapes formulas', () => {
  const api = receiver(), p = { ...valid(), name: '=IMPORTXML("example")', msg: '+SUM(1,2)' };
  assert.equal(api.post(p).ok, true);
  assert.equal(api.rows.length, 2);
  assert.equal(api.rows[1][2][0], "'");
  assert.equal(api.rows[1][9][0], "'");
  assert.equal(api.post(p).requestId, p.requestId);
  assert.equal(api.rows.length, 2);
  assert.equal(api.locked(), false);
});
test('receiver accepts phone-only enquiries and rejects invalid or oversized submissions', () => {
  const api = receiver();
  assert.equal(api.post({ ...valid(), email: '', phone: '+91 98765 43210' }).ok, true);
  for (const change of [{ email: '', phone: '' }, { email: 'bad-email' }, { email: '', phone: '-------' }, { needs: 'Unknown' }, { engagement: 'Injected' }, { budget: 'Injected' }, { msg: 'x'.repeat(1501) }, { website: 'spam' }, { requestId: 'bad-id' }, { name: '' }]) {
    assert.equal(api.post({ ...valid(), ...change }).ok, false, JSON.stringify(change));
  }
  assert.equal(api.rows.length, 2);
});

class Element {
  constructor() { this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.dataset = {}; this.attrs = {}; this.events = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
  addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name]; }
  hasAttribute(name) { return name in this.attrs; }
  removeAttribute(name) { delete this.attrs[name]; }
  get validity() { return { valid: !this.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value) }; }
  focus() { this.focused = true; }
  scrollIntoView() {}
}
function client({ endpoint = '', fetchImpl = async () => ({ ok: false }) } = {}) {
  const ids = new Map();
  const element = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
  const selectors = new Map();
  const selected = selector => { if (!selectors.has(selector)) selectors.set(selector, new Element()); return selectors.get(selector); };
  const form = element('lead');
  const keys = ['name','email','phone','brand','engagement','budget','msg','website'];
  const fields = keys.map(key => element(key));
  fields.namedItem = key => element(key);
  form.elements = fields;
  const button = new Element();
  form.querySelector = () => button;
  form.querySelectorAll = () => [];
  form.reset = () => fields.forEach(field => { field.value = ''; });
  element('draft').querySelector = () => element('draft-heading');
  selected('.work-filters').querySelectorAll = () => [];
  selected('.menu-toggle').setAttribute('aria-expanded', 'false');
  const doc = { documentElement: new Element(), getElementById: element, querySelector: selected, querySelectorAll: () => [], addEventListener() {} };
  class Data {
    get(key) { return element(key).value; }
    getAll() { return []; }
  }
  const context = vm.createContext({ document: doc, window: { FAR_CONFIG: { enquiryEndpoint: endpoint } }, matchMedia: () => ({ matches: false, addEventListener() {} }), FormData: Data, fetch: fetchImpl, crypto: { randomUUID }, URLSearchParams, AbortController, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'site.js'), 'utf8'), context);
  element('name').value = 'Test visitor';
  element('email').value = 'visitor@example.com';
  return { element, button, submit: () => form.events.submit[0]({ preventDefault() {} }) };
}
test('unconfigured form prepares an honest draft without calling a network endpoint', async () => {
  let calls = 0;
  const ui = client({ fetchImpl: () => { calls++; } });
  await ui.submit();
  assert.equal(calls, 0);
  assert.match(ui.element('status').textContent, /Nothing has been sent/);
  assert.equal(ui.element('draft').hidden, false);
  assert.match(ui.element('open-whatsapp').href, /^https:\/\/wa.me/);
});
const endpoint = 'https://script.google.com/macros/s/example-deployment/exec';
test('confirmed matching save clears fields; rejected acknowledgement keeps details and fallback', async () => {
  const ui = client({ endpoint, fetchImpl: async (_, options) => ({ ok: true, json: async () => ({ ok: true, requestId: options.body.get('requestId') }) }) });
  await ui.submit();
  assert.equal(ui.element('name').value, '');
  assert.match(ui.element('status').textContent, /has been received/);
  assert.equal(ui.button.disabled, false);
  const failed = client({ endpoint, fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, requestId: 'wrong-id' }) }) });
  await failed.submit();
  assert.equal(failed.element('name').value, 'Test visitor');
  assert.match(failed.element('status').textContent, /couldn’t confirm/);
  assert.equal(failed.element('draft').hidden, false);
});
test('network failures preserve data and retries reuse their request ID', async () => {
  const requests = [];
  const ui = client({ endpoint, fetchImpl: async (_, options) => { requests.push(options.body.get('requestId')); throw new Error('offline'); } });
  await ui.submit(); await ui.submit();
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
  assert.equal(ui.element('email').value, 'visitor@example.com');
});
test('contact validation requires one usable reply channel before preparing or sending', async () => {
  const ui = client();
  ui.element('email').value = '';
  await ui.submit();
  assert.match(ui.element('contact-error').textContent, /email address or phone/);
  ui.element('phone').value = '+91 98765 43210';
  await ui.submit();
  assert.equal(ui.element('draft').hidden, false);
});
