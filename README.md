# For a Reason website

Buildless HTML, CSS and JavaScript. **Deploy only `public/`** (set it as the host's publish/output directory, no build command). Everything outside it is tooling and source material and must not be served.

```
public/                     deploy root
  index.html  privacy.html  404.html
  _headers  robots.txt  sitemap.xml
  assets/
    css/site.css            base styles, then editorial overrides (one file, order matters)
    js/site.js              navigation, portfolio filters, enquiry form
    js/particles.js         particle wordmark, parallax, "Pause motion"
    js/config.js            public enquiry endpoint (served no-cache)
    fonts/  img/  work/     Inter + JetBrains Mono, icons/OG/wordmark, portfolio WebP
google-sheets/              Apps Script receiver (Code.gs) and SETUP.md
content/projects.json       portfolio data reference (not loaded by the page)
brand/                      unused logo variants kept as source material
scripts/serve.mjs           local preview server for public/
tests/                      node:test suites (no dependencies)
```

Preview with any static server pointed at `public/`, with `npm start` (dependency-free; applies `public/_headers` and returns a real 404 status). Opening the HTML files directly also works for a quick look.

Run checks with `npm test` (or `node --test tests/*.cjs`). Enquiry tests use local mocks; they send no enquiries and do not verify Google authorization, web-app permissions, CORS or production hosting.

`public/_headers` carries a Content-Security-Policy that allows the inline style and script in `404.html` by SHA-256 hash. After editing either block, run `PRINT_HASHES=1 node tests/headers.test.cjs` and update the hashes; `npm test` fails until they match. `.gitattributes` pins LF line endings so the hashes stay stable on every platform.

## Content still needing owner evidence

The featured project records use the existing brand names, sectors and service scopes. They are project details, not invented case studies: client briefs, specific deliverables, approved campaign assets and substantiated outcomes are needed for full case studies. The Sahyadri Steel Studio entry retains its existing monogram until actual work imagery is available. Do not attribute profile follower counts to agency performance.

Add verified founder/team names, responsibilities and approved photos before adding people-focused trust content. Starting prices and response-time commitments need actual business terms; none have been invented. Budget ranges are visitor-provided preferences, not published quotes.

## Launch checks

1. Activate the endpoint using the setup guide; otherwise the site explicitly offers a WhatsApp/email draft flow.
2. Confirm a live test row and acknowledgement, failure preservation, and signed-out access on the published domain.
3. Review project permissions and factual content, privacy practices, contact details and prices.
4. Check real iOS/Android devices, virtual keyboards, zoom/reflow, keyboard navigation and a screen reader.
5. Verify production redirects, HTTPS, security/cache headers, social preview image, sitemap and custom 404 status. No performance score is claimed by local source checks.

Versioned CSS/JS URLs allow this update to replace previously cached files. `public/_headers` uses a one-day asset cache and revalidates endpoint configuration. When deploying changes to a host with an older immutable-cache policy, purge its existing cached assets as needed.
