// Sparplatser i webbläsaren: flera spel, ladda, spara hit, ta bort och skriv över när alla platser är fulla
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.shots-slots', { recursive: true });
const [W = '1280', H = '800'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, locale: 'sv-SE' });
const page = await ctx.newPage();
const errors = [];
let bad = 0;
const check = (c, m) => {
  if (!c) {
    bad++;
    errors.push('fail: ' + m);
  }
  console.log(c ? 'ok  ' : 'FAIL', m);
};
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const keys = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pixel-dynasty-save-v1')).sort());
const newGame = async () => {
  await page.click('[data-act="tt-new"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="ng-go"]');
  await page.waitForFunction(() => window.__G && window.__pd.mode === 'play', null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__pd.settings.tutorial = false;
    window.__pd.setSpeed(0);
  });
};
const toTitle = async () => {
  await page.evaluate(() => {
    window.__ui.close(true);
    window.__pd.toTitle();
  });
  await page.waitForTimeout(700);
};
const studio = () => page.evaluate(() => window.__G.studio);
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
check(!(await page.$('[data-act="tt-slots"]')), 'inga sparningar: ingen knapp för sparade spel');

await newGame();
const s1 = await studio();
await toTitle();
check((await keys()).join() === 'pixel-dynasty-save-v1', 'första spelet hamnar i plats 1 under den gamla nyckeln');
check(!!(await page.$('[data-act="tt-slots"]')) && /1\/5/.test(await page.innerText('[data-act="tt-slots"]')), 'titelskärmen visar sparade spel 1/5');
await page.screenshot({ path: '.shots-slots/title.png' });

await newGame();
const s2 = await studio();
console.log('   spel 1:', s1, '| spel 2:', s2);
check((await keys()).join() === 'pixel-dynasty-save-v1,pixel-dynasty-save-v1-s2', 'andra spelet hamnar i plats 2, det första är kvar');
await toTitle();

await page.click('[data-act="tt-slots"]');
await page.waitForTimeout(400);
check((await page.$$('.ltier.slot')).length === 5 && (await page.$$('.ltier.slot.vacant')).length === 3, 'fönstret visar fem platser, tre tomma');
await page.screenshot({ path: '.shots-slots/slots-title.png' });
await page.click('[data-act="sl-load"][data-n="1"]');
await page.waitForTimeout(800);
check((await studio()) === s1 && (await page.evaluate(() => window.__pd.mode)) === 'play', 'ladda plats 1 ger det första spelet');
await page.evaluate(() => window.__pd.setSpeed(0));

// under spelet: menyn har knappen, spara hit i en tom plats, ta bort
await page.evaluate(() => window.__ui.open('menu', null, { force: true }));
await page.waitForTimeout(300);
check(!!(await page.$('[data-act="mn-slots"]')), 'menyn har Sparade spel');
await page.click('[data-act="mn-slots"]');
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots-slots/slots-game.png' });
check((await page.$$('.ltier.slot.on')).length === 1 && !!(await page.$('[data-act="sl-saveto"][data-n="3"]')), 'aktiv plats är markerad och en tom plats går att spara i');
await page.click('[data-act="sl-saveto"][data-n="3"]');
await page.waitForTimeout(300);
check((await keys()).length === 3, 'spara hit skapar plats 3');
await page.click('[data-act="sl-del"][data-n="2"]');
await page.waitForTimeout(200);
check(/Säker/.test(await page.innerText('[data-act="sl-del"][data-n="2"]')) && (await keys()).length === 3, 'ta bort kräver ett klick till');
await page.click('[data-act="sl-del"][data-n="2"]');
await page.waitForTimeout(300);
check((await keys()).join() === 'pixel-dynasty-save-v1,pixel-dynasty-save-v1-s3', 'andra klicket tar bort plats 2');
check(!(await page.$('[data-act="sl-del"][data-n="3"]')) && !!(await page.$('[data-act="sl-del"][data-n="1"]')), 'den aktiva platsen (spara hit byter till den) går inte att ta bort');

// fyll alla platser: ett nytt spel ska be om en plats att skriva över
await page.evaluate(() => {
  const v = localStorage.getItem('pixel-dynasty-save-v1');
  for (const n of [2, 4, 5]) localStorage.setItem('pixel-dynasty-save-v1-s' + n, v);
});
await toTitle();
await page.click('[data-act="tt-new"]');
await page.waitForTimeout(200);
await page.click('[data-act="ng-go"]');
await page.waitForTimeout(500);
check(!!(await page.$('[data-act="sl-over"][data-n="4"]')) && (await page.$$('[data-act="sl-over"]')).length === 5, 'alla fulla: spelaren får välja plats att skriva över');
await page.screenshot({ path: '.shots-slots/slots-pick.png' });
await page.click('[data-act="sl-over"][data-n="4"]');
await page.waitForTimeout(200);
check((await page.$$('[data-act="sl-over"]')).length === 5 && /Säker/.test(await page.innerText('[data-act="sl-over"][data-n="4"]')), 'att skriva över kräver ett klick till');
await page.click('[data-act="sl-over"][data-n="4"]');
await page.waitForFunction(() => window.__G && window.__pd.mode === 'play', null, { timeout: 15000 });
await page.waitForTimeout(500);
const act4 = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-dynasty-save-v1-s4')).meta.studio);
check(act4 === (await studio()), 'det nya spelet skrev över plats 4 (' + act4 + ')');
await page.evaluate(() => window.__pd.setSpeed(0));

// ladda om sidan: Fortsätt tar den senast sparade
await toTitle();
await page.reload();
await page.waitForTimeout(800);
check(!!(await page.$('[data-act="tt-continue"]')), 'Fortsätt finns efter omladdning');
await page.click('[data-act="tt-continue"]');
await page.waitForTimeout(1200);
check((await studio()) === act4, 'Fortsätt laddar den senast sparade platsen');
// en konkursad plats går inte att spela vidare, inte ens med ett direkt anrop
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('pixel-dynasty-save-v1-s5'));
  d.meta = { ...(d.meta || {}), over: true };
  localStorage.setItem('pixel-dynasty-save-v1-s5', JSON.stringify(d));
});
check((await page.evaluate(() => window.__pd.continueGame(5))) === false && (await studio()) === act4, 'en konkursad plats går inte att ladda, inte ens med ett direkt anrop');
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
