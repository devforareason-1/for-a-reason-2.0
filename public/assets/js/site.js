(() => {
  'use strict';
  document.documentElement.classList.add('js');
  document.getElementById('yr').textContent = new Date().getFullYear();
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav-links');
  function closeMenu(returnFocus = false) {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Menu';
    if (returnFocus) menu.focus();
  }
  menu.hidden = false;
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => { if (!event.target.closest('nav')) closeMenu(); });
  matchMedia('(max-width:760px)').addEventListener('change', () => closeMenu());
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      const heading = target.querySelector('h1,h2') || target;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    closeMenu();
  }));

  const filters = document.querySelector('.work-filters');
  const cards = [...document.querySelectorAll('.project-card')];
  const showWork = document.querySelector('.show-work');
  const workStatus = document.querySelector('.work-status');
  let activeFilter = 'all', expanded = false;
  function renderWork() {
    const matching = cards.filter(card => activeFilter === 'all' || card.dataset.industry === activeFilter);
    const shown = expanded ? matching : matching.slice(0, 4);
    cards.forEach(card => { card.hidden = !shown.includes(card); });
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
    showWork.hidden = shown.length >= matching.length;
    showWork.textContent = `Show all ${matching.length} brands`;
    workStatus.textContent = `Showing ${shown.length} of ${matching.length} brands${activeFilter === 'all' ? '' : ' in this sector'}.`;
  }
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    expanded = false;
    renderWork();
  });
  showWork.addEventListener('click', () => {
    const next = cards.find(card => card.hidden && (activeFilter === 'all' || card.dataset.industry === activeFilter));
    expanded = true;
    renderWork();
    next?.focus({ preventScroll: true });
  });
  renderWork();

  const form = document.getElementById('lead');
  const status = document.getElementById('status');
  const draft = document.getElementById('draft');
  const draftText = document.getElementById('draft-text');
  const openEmail = document.getElementById('open-email');
  const openWhatsApp = document.getElementById('open-whatsapp');
  const copyStatus = document.getElementById('copy-status');
  const button = form.querySelector('button[type="submit"]');
  const fields = form.elements;
  const endpoint = window.FAR_CONFIG?.enquiryEndpoint || '';
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint);
  const idleLabel = configured ? 'Send project enquiry ↗' : 'Prepare enquiry ↗';
  button.textContent = idleLabel;
  document.getElementById('form-method').textContent = configured
    ? 'Send your brief directly. We’ll confirm here when it has been received.'
    : 'Prepare your brief here, then review and send it through WhatsApp or email. Nothing is sent automatically.';
  let pending = false, requestId = '', lastPayload = '';
  function setError(id, message) {
    document.getElementById(id + '-error').textContent = message;
    if (message) fields.namedItem(id).setAttribute('aria-invalid', 'true');
    else fields.namedItem(id).removeAttribute('aria-invalid');
  }
  function validate(id) {
    const field = fields.namedItem(id), value = field.value.trim();
    let error = '';
    if (id === 'name' && !value) error = 'Please enter your name.';
    if (id === 'email' && value && (!field.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) error = 'Enter a valid email address, such as name@business.com.';
    if (id === 'phone' && value && (!/^[+\d\s().-]{7,40}$/.test(value) || value.replace(/\D/g, '').length < 7)) error = 'Enter a phone number with its country code.';
    setError(id, error);
    return !error;
  }
  function invalidateDraft() {
    draft.hidden = true;
    draftText.value = '';
    copyStatus.textContent = '';
    if (!pending) status.textContent = '';
    document.getElementById('contact-error').textContent = '';
    for (const id of ['email', 'phone']) {
      if (!document.getElementById(id + '-error').textContent) fields.namedItem(id).removeAttribute('aria-invalid');
    }
  }
  for (const id of ['name', 'email', 'phone']) {
    const field = fields.namedItem(id);
    field.addEventListener('blur', () => { field.value = field.value.trim(); validate(id); });
    field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) validate(id); });
  }
  form.addEventListener('input', invalidateDraft);
  form.addEventListener('change', invalidateDraft);
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (pending) return;
    const field = [...form.querySelectorAll('[name="need"]')].find(input => input.value === link.dataset.service);
    if (field) { field.checked = true; invalidateDraft(); }
  }));
  function prepareDraft(payload) {
    const subject = 'Project enquiry from ' + payload.name;
    const body = `Name: ${payload.name}\nEmail: ${payload.email || 'Not provided'}\nPhone: ${payload.phone || 'Not provided'}\nBrand: ${payload.brand || 'To discuss'}\nBudget context: ${payload.engagement || 'To discuss'}\nBudget: ${payload.budget || 'To discuss'}\nServices: ${payload.needs || 'To discuss'}\n\n${payload.msg}`;
    draftText.value = `To: connect@forareason.in\nSubject: ${subject}\n\n${body}`;
    openEmail.href = `mailto:connect@forareason.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    openWhatsApp.href = `https://wa.me/918383098339?text=${encodeURIComponent(subject + '\n\n' + body)}`;
    draft.hidden = false;
  }
  function setPending(value) {
    pending = value;
    // Freeze the submitted snapshot so typing cannot be lost when the save completes.
    [...form.elements].forEach(control => { control.disabled = value; });
    if (value) {
      form.setAttribute('aria-busy', 'true');
      button.textContent = 'Sending…';
      openEmail.removeAttribute('href');
      openWhatsApp.removeAttribute('href');
    } else {
      form.removeAttribute('aria-busy');
      button.textContent = idleLabel;
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const invalid = ['name', 'email', 'phone'].filter(id => !validate(id));
    document.getElementById('contact-error').textContent = '';
    if (!fields.namedItem('email').value.trim() && !fields.namedItem('phone').value.trim()) {
      document.getElementById('contact-error').textContent = 'Add an email address or phone number so we can reply.';
      fields.namedItem('email').setAttribute('aria-invalid', 'true');
      fields.namedItem('phone').setAttribute('aria-invalid', 'true');
      invalid.push('email');
    }
    if (invalid.length) {
      draft.hidden = true;
      status.textContent = 'Please check the highlighted fields. Nothing has been sent.';
      fields.namedItem(invalid[0]).focus();
      return;
    }
    const data = new FormData(form);
    if (data.get('website')) return;
    const payload = Object.fromEntries(['name','email','phone','brand','engagement','budget','msg'].map(key => [key, String(data.get(key) || '').trim()]));
    payload.needs = data.getAll('need').join(', ');
    prepareDraft(payload);
    if (!configured) {
      status.textContent = 'Your draft is ready. Nothing has been sent. Choose WhatsApp or email below to send it.';
      const heading = draft.querySelector('h3');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      draft.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' });
      return;
    }
    draft.hidden = true;
    const serialized = JSON.stringify(payload);
    if (serialized !== lastPayload || !requestId) {
      requestId = crypto.randomUUID();
      lastPayload = serialized;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    setPending(true);
    status.textContent = 'Sending your project enquiry…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST', body: new URLSearchParams({ ...payload, requestId }),
        credentials: 'omit', redirect: 'follow', signal: controller.signal
      });
      if (!response.ok) throw new Error('Request failed');
      const result = await response.json();
      if (result.ok !== true || result.requestId !== requestId) throw new Error('Save not confirmed');
      form.reset();
      requestId = lastPayload = '';
      draftText.value = '';
      status.textContent = 'Your enquiry has been received. We’ll use your brief to discuss your project and next steps.';
    } catch (_) {
      prepareDraft(payload);
      status.textContent = 'We couldn’t confirm receipt. Your details are still here. Retry, or send the prepared brief through WhatsApp or email below.';
    } finally {
      clearTimeout(timer);
      setPending(false);
    }
  });
  document.getElementById('copy-draft').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(draftText.value);
      copyStatus.textContent = 'Brief copied. Paste it into your preferred app and send it.';
    } catch (_) {
      draftText.focus(); draftText.select();
      copyStatus.textContent = 'Select and copy the brief above, then paste it into your preferred app.';
    }
  });
  openEmail.addEventListener('click', () => { copyStatus.textContent = 'Review and send in your email app. If it doesn’t open, use Copy brief.'; });
  openWhatsApp.addEventListener('click', () => { copyStatus.textContent = 'Review the message in WhatsApp and press Send there.'; });
  form.hidden = false;
})();
