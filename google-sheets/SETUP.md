# Connect a new Google Sheet

1. Create a blank Google Sheet named **For a Reason — Enquiries**. Keep its sharing restricted.
2. In the sheet, open **Extensions → Apps Script**. Replace the default code with the complete contents of `google-sheets/Code.gs` and save.
3. Select **setup** in the function dropdown, click **Run**, and authorize it with the sheet owner's Google account. This creates the **Enquiries** tab and stores the destination ID in script properties.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. The endpoint accepts public enquiries; the sheet remains private. Your Workspace administrator may restrict anonymous web apps.
5. Copy the deployed URL ending in `/exec`, not the `/dev` test URL. Paste it into `enquiryEndpoint` in `public/assets/js/config.js`. Never add account passwords, OAuth tokens or service-account keys to the website.
6. Publish the website files, then test from a signed-out browser. Verify that a row appears in the sheet and the website confirms receipt. Test a disconnected network too: entered details should remain available for retry or WhatsApp/email fallback.

The receiver stores request ID, timestamp, name, email, phone, brand, services, budget context, budget and message. Either email or phone is required. Identical retries in the same page session reuse a request ID to prevent duplicate rows after uncertain responses.

Until an endpoint is configured, the form prepares a draft for the visitor to review and send through WhatsApp or email. It does not claim the enquiry was saved.

Success requires readable JSON confirming the matching request ID. Do not use `no-cors`, which prevents checking acknowledgement. If submission fails, inspect deployment access, the `/exec` URL and Apps Script execution logs. When modifying receiver code, update the deployment to a new version under **Deploy → Manage deployments → Edit**.

Local tests use mocks and send no enquiries. Google permissions, browser CORS, quotas and production hosting require a live check. The endpoint has validation, a honeypot and duplicate protection; consider a protected backend if public-endpoint spam becomes an issue. Review the site's privacy notice and your retention/access practices before launch.

Google web-app documentation: https://developers.google.com/apps-script/guides/web
