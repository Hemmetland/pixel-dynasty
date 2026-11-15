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
// omgivningsljudet: igång under spelet, tystas av ljudknappen, och firandet lägger bara till bilder och ljud
await page.waitForTimeout(2500);
const amb1 = await page.evaluate(() => window.__ambLevels());
console.log('ambience levels:', JSON.stringify(amb1));
if (!amb1 || !(amb1.city > 0.005)) { console.log('FAIL omgivningsljudet är inte igång'); process.exitCode = 1; }
const fx0 = await page.evaluate(() => window.__pd.scene.fx.length);
const cheered = await page.evaluate(() => { window.__pd.cheerT = 0; window.__pd.cheer('rankTop'); return window.__pd.scene.fx.length; });
console.log('effects before/after cheer:', fx0, cheered);
if (cheered < fx0 + 80) { console.log('FAIL firandet gav ingen konfetti'); process.exitCode = 1; }
await page.click('#mute-btn');
await page.waitForTimeout(6000);
const amb2 = await page.evaluate(() => window.__ambLevels());
const lvMute = await page.evaluate(() => window.__audioLevel());
console.log('muted levels:', JSON.stringify(amb2), 'rms', lvMute.toFixed(4));
if (Object.values(amb2).some((v) => v > 0.005)) { console.log('FAIL ljudknappen tystar inte omgivningen'); process.exitCode = 1; }
await page.click('#mute-btn');
await page.waitForTimeout(6000);
const amb3 = await page.evaluate(() => window.__ambLevels());
console.log('unmuted levels:', JSON.stringify(amb3));
if (!(amb3.city > 0.005)) { console.log('FAIL omgivningen kommer inte tillbaka'); process.exitCode = 1; }
await browser.close();
