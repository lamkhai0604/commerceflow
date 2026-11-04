const { chromium } = require('@playwright/test');
const fs = require('fs');
(async () => {
 const mode = process.argv[2]; let browser;
 try {
  browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM, args: ['--no-sandbox'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: false });
  let accepted = false, authorityRejected = false;
  try { const response = await page.goto('https://localhost:8443/api/v1/health', { timeout: 15000 }); accepted = response.status() === 200; }
  catch (error) { authorityRejected = error.message.includes('ERR_CERT_AUTHORITY_INVALID'); }
  const pass = mode === 'reject' ? authorityRejected : accepted;
  fs.writeFileSync(`/evidence/tls-${mode}.json`, JSON.stringify({ status: pass ? 'PASS' : 'FAIL', mode, certificateVerificationEnabled: true }));
  if (!pass) process.exitCode = 1;
 } catch { process.exitCode = 1; }
 finally { if (browser) await browser.close(); }
})().catch(() => { process.exitCode = 1; });
