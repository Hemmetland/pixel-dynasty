// Kör igenom UI:t i headless Chromium och tar skärmdumpar. node test/drive.mjs <ut-katalog> [bredd] [höjd]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const [, , outDir = '.shots', w = '1280', h = '720'] = process.argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, locale: process.env.LOCALE || 'en-US' });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(800);
const shot = async (n) => { await page.screenshot({ path: `${outDir}/${n}.png` }); };
const click = async (sel) => { await page.click(sel); await page.waitForTimeout(350); };
await shot('01-title');
await click('[data-act="tt-new"]');
await shot('02-newgame');
await click('[data-act="ng-go"]');
await page.waitForTimeout(5800);
await shot('03-start');
await click('.dk.create');
await shot('04-wizard1');
await click('.tile[data-act="w-topic"]');
await click('.tile[data-act="w-genre"]');
await shot('05-wizard1b');
await click('[data-act="w-next"]');
await shot('06-wizard2');
await click('[data-act="w-next"]');
await shot('07-wizard3');
await click('[data-act="w-start"]');
await page.waitForTimeout(3000);
await shot('08-dev');
await page.evaluate(() => { window.__pd.setSpeed(3); });
// kör tills recensionen visas
let tries = 0;
while (tries++ < 400) {
  await page.waitForTimeout(300);
  if (await page.$('.report')) break;
  const T = { timeout: 800 };
  if (await page.$('[data-act="p-go"]')) await page.click('[data-act="p-go"]', T).catch(() => {});
  else if (await page.$('.choice')) { await page.click('.choice', T).catch(() => {}); await page.waitForTimeout(300); if (await page.$('[data-act="ev-ok"]')) await page.click('[data-act="ev-ok"]', T).catch(() => {}); }
  else if (await page.$('#coach.on [data-act="coach-ok"]')) await page.click('#coach.on [data-act="coach-ok"]', T).catch(() => {});
  if (tries === 20) await shot('09-dev-later');
}
await page.waitForTimeout(1500);
await shot('10-report-a');
await page.waitForTimeout(5800);
await shot('11-report-b');
await page.click('[data-act="rp-release"]');
await page.waitForTimeout(1500);
await shot('12-released');
await page.evaluate(() => window.__pd.setSpeed(0));
for (const f of ['research', 'staff', 'studio', 'market', 'finance', 'library', 'contracts', 'achievements', 'help']) {
  await page.evaluate((id) => window.__ui.open(id, null, { force: true }), f);
  await page.waitForTimeout(500);
  await shot('20-' + f);
}
console.log(errors.length ? errors.slice(0, 12).join('\n') : 'no console errors');
await browser.close();
