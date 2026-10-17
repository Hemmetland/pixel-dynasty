import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
await page.click('[data-act="tt-new"]'); await page.waitForTimeout(200);
await page.click('[data-act="ng-go"]'); await page.waitForTimeout(5600);
await page.evaluate(() => {
  const S = window.__sim; const app = window.__pd; const G = app.G;
  app.settings.tutorial = false;
  for (const id of ['p_dialogue', 'p_ai', 'p_sound', 'p_world']) { const r = window.__RESEARCH.find((x) => x.id === id); G.research.done.push(id); S.applyUnlocks(G, r); }
  G.know.focus.rpg = true; G.u.genres.push('rpg');
  S.startProject(G, { title: 'Triangle Test', topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', audience: 'everyone' });
  app.turbo = 30; app.setSpeed(3);
});
// slumpade händelser kan komma före fasprompten: svara på dem och vänta vidare
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(250);
  if (await page.$('[data-act="p-go"]')) break;
  await page.evaluate(() => document.querySelector('[data-act="ev-ok"], [data-act="ev-pick"]')?.click());
}
await page.evaluate(() => { window.__pd.turbo = 1; });
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/phase2.png' });
// Esc/M/N under en prompt får inte stänga den och låsa simuleringen (promptActive kvar utan modal)
await page.keyboard.press('Escape'); await page.keyboard.press('m'); await page.keyboard.press('n'); await page.waitForTimeout(200);
const kept = await page.evaluate(() => ({ modal: window.__ui.modalOn, cur: window.__ui.cur, go: !!document.querySelector('[data-act="p-go"]') }));
if (!kept.modal || kept.cur || !kept.go) errors.push('fail: prompt lost after Esc/M/N ' + JSON.stringify(kept));
await page.click('[data-act="p-ideal"]').catch(() => {});
await page.waitForTimeout(300);
const t0 = await page.evaluate(() => { window.__pd.turbo = 10; return window.__pd.G.t; });
await page.waitForTimeout(800);
const t1 = await page.evaluate(() => window.__pd.G.t);
console.log('after Esc/M/N on the phase prompt:', JSON.stringify(kept), '| t', t0, '->', t1);
if (!(t1 > t0)) errors.push('fail: time does not advance after answering the prompt');
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
