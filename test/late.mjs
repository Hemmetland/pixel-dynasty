import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const [, , outDir = '.shots-late', w = '1280', h = '720'] = process.argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
await page.click('[data-act="tt-new"]');
await page.waitForTimeout(200);
await page.click('[data-act="ng-go"]');
await page.waitForTimeout(5600);
const setup = (tier, year, nStaff) => page.evaluate(([tier, year, nStaff]) => {
  const S = window.__sim; const app = window.__pd; const G = app.G;
  app.setSpeed(0);
  app.settings.tutorial = false;
  G.t = (year - 1980) * 48 + 6;
  G.office.tier = tier;
  for (const r of window.__RESEARCH) { if (!G.research.done.includes(r.id)) { G.research.done.push(r.id); S.applyUnlocks(G, r); } }
  G.staff = G.staff.slice(0, 1);
  while (G.staff.length < nStaff) { const c = S.makeCandidate(G, 1); delete c.fee; G.staff.push(c); }
  G.office.fac = {}; let slot = 0;
  for (const id of S.FAC_IDS) { if (slot < S.tierOf(G).slots) G.office.fac[id] = { lvl: 1 + (slot % 3), slot: slot++ }; }
  G.awards = [{}, {}, {}]; G.fans = 2e6; G.money = 5e7;
  G.games = [];
  for (const tp of ['fantasy', 'space', 'horror', 'cars', 'robots']) G.games.push({ id: G.games.length + 1, title: 'G' + tp, topic: tp, genre: 'action', platform: 'pc', t: G.t - 4, score: 8, weekly: [], priceAt: 30, revenue: 0, units: 0, parts: { rd: 1, rt: 1 }, reviews: [], flags: [], insights: [], scope: 'small', bugs: 0, hype: 0, total: 1e6 });
  G.job = { kind: 'game', id: 99, title: 'Mega', topic: 'space', genre: 'action', platform: 'pc', scope: 'large', state: 'dev', phase: 1, ticks: 40, devTicks: 128, polishTicks: 24, polishDone: 0, D: 1000, T: 900, bugs: 10, hype: 30, marketing: [], focus: [{}, {}, {}], crunch: false };
  app.scene.rebuildLayout(false); app.scene.fade = 0; app.resize();
}, [tier, year, nStaff]);
const tod = (v) => page.evaluate((v) => { window.__pd.scene.todLock = v; window.__pd.scene.world.tod = v; window.__pd.scene.world.weather = { type: 'clear', amt: 0, target: 0, timer: 999 }; }, v);
await setup(5, 2015, 36);
await tod(0.5); await page.waitForTimeout(9000); await page.screenshot({ path: `${outDir}/t5-day.png` });
await tod(0.93); await page.waitForTimeout(600); await page.screenshot({ path: `${outDir}/t5-night.png` });
await setup(2, 1996, 9);
await tod(0.76); await page.waitForTimeout(6000); await page.screenshot({ path: `${outDir}/t2-dusk.png` });
await setup(4, 2005, 22);
await page.evaluate(() => { window.__pd.G.t = (2005 - 1980) * 48 + 46; });
await page.evaluate(() => { const w = window.__pd.scene.world; w.weather = { type: 'snow', amt: 1, target: 1, timer: 999 }; window.__pd.scene.todLock = 0.35; });
await page.waitForTimeout(7000); await page.screenshot({ path: `${outDir}/t4-snow.png` });
// prestanda
const perf = await page.evaluate(async () => {
  const sc = window.__pd.scene; const t0 = performance.now(); let n = 0;
  while (performance.now() - t0 < 1500) { sc.update(0.016); sc.draw(); n++; }
  return (1500 / n).toFixed(1) + ' ms/frame (' + n + ' frames)';
});
console.log('perf:', perf);
await setup(5, 2012, 30);
await page.evaluate(() => {
  const S = window.__sim; const G = window.__pd.G;
  G.hist.cash = Array.from({ length: 36 }, (_, i) => ({ t: G.t - 36 * 4 + i * 4, v: 1e6 * (1 + i * 0.8 + Math.sin(i / 3)) }));
  G.hist.revenue = G.hist.cash.map((h) => ({ t: h.t, v: 3e5 + Math.random() * 4e5 }));
  G.lastMonth = { income: 1.4e6, expense: 9e5, breakdown: { sales: 1.2e6, contracts: 2e5, salaries: -6e5, rent: -1.5e5, facilities: -8e4, marketing: -7e4 } };
  G.market.releases = []; S.updateTrends(G);
  for (let i = 0; i < 40; i++) { for (const c of G.comps) while (c.nextT <= G.t + 30) S.releaseComp(G, c); }
  G.t += 0;
  const gm = G.games[0];
  for (let i = 0; i < 30; i++) gm.weekly.push(5e5 * Math.exp(-i / 9));
  gm.revenue = gm.weekly.reduce((a, b) => a + b, 0); gm.units = gm.revenue / 30;
  for (const g of G.games) { g.reviews = [{ id: 'a', score: 8 }, { id: 'b', score: 8.5 }, { id: 'c', score: 7.5 }, { id: 'd', score: 8 }]; g.parts = { rd: 1.4, rt: 1.2, compat: 4, bugRatio: .2 }; g.flags = [{ k: 'compat', v: 1 }, { k: 'design', v: 1 }]; g.insights = []; g.ff = {}; g.chain = 1; }
  G.contracts = []; S.refreshContracts(G);
  G.job = null;
  G.know.combos['fantasy|action'] = 4; G.know.combos['space|action'] = 2; G.know.combos['horror|action'] = 1; G.know.focus.action = true;
});
for (const [id, arg] of [['finance'], ['staff'], ['studio'], ['market'], ['library'], ['library', { id: 1 }], ['contracts'], ['research'], ['achievements']]) {
  await page.evaluate(([id, arg]) => window.__ui.open(id, arg || null, { force: true }), [id, arg]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/w-${id}${arg ? '-detail' : ''}.png` });
}
for (const tab of ['charts', 'trends', 'insights', 'rivals']) {
  await page.evaluate(() => window.__ui.close(true));
  await page.evaluate((tab) => { window.__ui.open('market', null, { force: true }); document.querySelector(`[data-act="m-tab"][data-id="${tab}"]`).click(); }, tab);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/w-market-${tab}.png` });
}
console.log(errors.length ? errors.slice(0, 10).join('\n') : 'no console errors');
await browser.close();
