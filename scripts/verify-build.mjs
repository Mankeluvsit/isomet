import { chromium } from 'playwright';
const url = process.env.VERIFY_URL || 'http://127.0.0.1:4173/';
const viewports = [
  { width: 1280, height: 720, touch: false },
  { width: 844, height: 390, touch: true },
];
let failed = false;
for (const vp of viewports) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.querySelector('.archetype-btn'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`${vp.width}x${vp.height}: ${errors.length} errors`);
  errors.forEach(e => console.log('  ', e));
  if (errors.length) failed = true;
  await browser.close();
}
if (failed) process.exit(1);
