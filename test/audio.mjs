import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
await page.click('[data-act="tt-new"]');
await page.waitForTimeout(300);
let max = 0;
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(250);
  const lv = await page.evaluate(() => window.__audioLevel());
  max = Math.max(max, lv);
}
console.log('max level after clicking (sfx):', max.toFixed(4));
await page.click('[data-act="ng-go"]');
await page.waitForTimeout(6500);
max = 0;
for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); max = Math.max(max, await page.evaluate(() => window.__audioLevel())); }
console.log('max level during music:', max.toFixed(4), errors.length ? errors : 'no errors');
await browser.close();
