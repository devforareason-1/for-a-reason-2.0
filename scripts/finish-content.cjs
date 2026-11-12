const fs = require('node:fs');
for (const page of ['index.html', 'privacy.html']) {
  let html = fs.readFileSync(page, 'utf8');
  html = html.replaceAll('For a Reason ?', 'For a Reason —')
    .replaceAll('Privacy ? For a Reason', 'Privacy — For a Reason')
    .replaceAll('Creative ? technology', 'Creative × technology')
    .replaceAll('creative ? technology', 'creative × technology')
    .replaceAll('agency ? Hyderabad', 'agency · Hyderabad')
    .replaceAll('Hyderabad, India ? Working everywhere', 'Hyderabad, India · Working everywhere')
    .replaceAll('CRM?connected', 'CRM—connected')
    // Repair prose only: URL query separators must remain ASCII question marks.
    .replace(/>[^<>]*</g, text => text.replace(/([A-Za-z])\?([A-Za-z])/g, '$1’$2'))
    .replace(/ \?(?=<|"| \(opens)/g, ' ↗')
    .replace(/>\?</g, '>↗<')
    .replace(/>\? <span id="yr"/g, '>© <span id="yr"')
    .replace('>Under ?25,000<', '>Under ₹25,000<')
    .replace('>?25,000??50,000<', '>₹25,000–₹50,000<')
    .replace('>?50,000??1 lakh<', '>₹50,000–₹1 lakh<')
    .replace('>?1??3 lakh<', '>₹1–₹3 lakh<')
    .replace('>?3 lakh+<', '>₹3 lakh+<');
  fs.writeFileSync(page, html);
}
// Every service keeps concrete deliverables visible, including on desktop.
const descriptions = {
  Branding: 'Logos, visual identity, brand voice and guidelines.',
  'Market positioning': 'Audience research, positioning and launch strategy.',
  Reels: 'Shoots, editing and content calendars.',
  Ads: 'Meta and Google ads, creatives, targeting and reporting.',
  Content: 'Photography, video, copywriting and product shoots.',
  'Social media': 'Content planning, account management and community.',
  Website: 'Design, development, landing pages and e-commerce.',
  CRM: 'Lead management, workflows, automation and dashboards.'
};
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/(<a href="#contact" data-service="([^"]+)">)([^<]+)(<span aria-hidden="true">↗<\/span>)/g, (whole, start, service, label, arrow) => descriptions[service] ? `${start}<div>${label}<small>${descriptions[service]}</small></div>${arrow}` : whole);
fs.writeFileSync('index.html', html);
