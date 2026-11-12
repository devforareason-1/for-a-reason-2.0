const HEADERS = ['Request ID', 'Submitted at', 'Name', 'Email', 'Phone', 'Brand', 'Services', 'Budget context', 'Budget', 'Message'];
const SERVICES = ['Branding', 'Market positioning', 'Reels', 'Ads', 'Website', 'CRM', 'Content', 'Social media', 'Other', 'Not sure yet'];

// Run once in the Apps Script editor attached to the destination Google Sheet.
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open Extensions > Apps Script from your destination sheet.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  const sheet = spreadsheet.getSheetByName('Enquiries') || spreadsheet.insertSheet('Enquiries');
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function doPost(event) {
  const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  const p = event && event.parameter || {};
  const value = key => String(p[key] || '').trim();
  const name = value('name'), email = value('email'), phone = value('phone');
  const brand = value('brand'), msg = value('msg'), requestId = value('requestId');
  const needs = value('needs').split(', ').filter(Boolean);
  const engagement = value('engagement'), budget = value('budget');
  const budgets = ['', 'Under ₹25,000', '₹25,000–₹50,000', '₹50,000–₹1 lakh', '₹1–₹3 lakh', '₹3 lakh+', 'Not sure yet'];
  if (value('website') || !name || name.length > 120 || (!email && !phone) ||
      email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (phone && (!/^[+\d\s().-]{7,40}$/.test(phone) || phone.replace(/\D/g, '').length < 7)) ||
      brand.length > 120 || msg.length > 1500 ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId) ||
      needs.length > SERVICES.length || needs.some(need => !SERVICES.includes(need)) ||
      !['', 'One-time project', 'Monthly engagement', 'Not sure yet'].includes(engagement) || !budgets.includes(budget)) {
    return reply({ ok: false, error: 'Invalid enquiry.' });
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('Run setup before deploying.');
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Enquiries');
    if (!sheet) throw new Error('Enquiries tab missing.');
    const rows = sheet.getLastRow();
    if (rows > 1 && sheet.getRange(2, 1, rows - 1, 1).createTextFinder(requestId).matchEntireCell(true).findNext()) {
      return reply({ ok: true, requestId });
    }
    // Treat user input as text, rather than executable spreadsheet formulas.
    const text = input => /^\s*[=+@-]/.test(input) ? "'" + input : input;
    sheet.appendRow([requestId, new Date(), text(name), text(email), text(phone), text(brand), needs.join(', ') || 'To discuss', engagement || 'To discuss', budget || 'To discuss', text(msg)]);
    SpreadsheetApp.flush();
    return reply({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return reply({ ok: false, error: 'Unable to save enquiry.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
