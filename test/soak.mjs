// Spelar spelet i den riktiga UI:n med en bot i turboläge och fångar alla sorters dialoger.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const [, , outDir = '.shots-soak', years = '12', w = '1280', h = '720'] = process.argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(600);
await page.click('[data-act="tt-new"]');
await page.waitForTimeout(300);
await page.click('[data-act="ng-go"]');
await page.waitForTimeout(5600);
// bot i sidan
await page.evaluate(() => {
  const S = window.__sim;
  const app = window.__pd;
  window.__stats = { prompts: {}, shots: [] };
  app.settings.tutorial = false;
  app.settings.menuPause = false;
  app.settings.sfx = false;
  app.applySettings();
  app.turbo = 40;
  app.setSpeed(3);
  const G = () => app.G;
  setInterval(() => {
    const g = G();
    if (!g || g.over) return;
    const year = S.yearOf(g.t);
    // starta spel
    if (!g.job && !g.pending.length) {
      const plats = Object.keys(S.PLATFORM || {});
      void plats;
      let best = null, bv = -1;
      for (const id of g.licenses) {
        if (!S.platformOpen(g, id)) continue;
        const p = window.__PL.find((x) => x.id === id);
        const v = window.__potential(p, S.yfOf(g.t)) / Math.pow(window.__techMult(p, year), 0.55);
        if (v > bv) { bv = v; best = p; }
      }
      const sk = { d: 0, t: 0 };
      for (const w of S.workers(g)) { sk.d += w.design; sk.t += w.tech; }
      let scope = 'small';
      for (const id of ['medium', 'large', 'aaa']) {
        if (!g.u.scopes.includes(id)) continue;
        if (window.__platTier(best, year) < S.SCOPES[id].minTier) continue;
        if (Math.min(sk.d, sk.t) * 0.8 >= S.SCOPES[id].par * window.__techMult(best, year) * 0.95) scope = id;
      }
      let tp = g.u.topics[0], ge = g.u.genres[0], bvv = -9;
      for (const a of g.u.topics) for (const b of g.u.genres) {
        const known = g.know.combos[a + '|' + b];
        const comp = known ?? window.__TOPICS.find((x) => x.id === a).compat[S.genreIdx(b)];
        const rep = g.games.slice(-4).filter((x) => x.topic === a && x.genre === b).length;
        const v = comp - rep * 0.8 + Math.random() * 0.7;
        if (v > bvv) { bvv = v; tp = a; ge = b; }
      }
      S.startProject(g, { title: 'Soak ' + g.games.length, topic: tp, genre: ge, genre2: g.u.flags.genre2 && Math.random() < 0.4 ? g.u.genres[(g.u.genres.indexOf(ge) + 1) % g.u.genres.length] : null, platform: best.id, scope, audience: g.u.aud[0] });
    }
    // forskning/anställning/kontor
    for (const r of window.__RESEARCH) { if (S.canResearch(g, r.id) === true) S.startResearch(g, r.id); }
    const burn = S.payroll(g) + S.rentOf(g);
    for (const c of g.candidates) { if (S.canHire(g) && g.money > c.fee + (c.salary + burn) * 8 + 5000) { S.hire(g, c.id); break; } }
    const n = S.nextTier(g);
    if (n && S.canUpgradeOffice(g) === true && g.money > n.cost * 1.8) S.upgradeOffice(g);
    for (const id of S.FAC_IDS) { if (g.u.facs.includes(id) && S.facLevel(g, id) < 2 && g.money > S.facCost(g, id) * 6) S.buildFacility(g, id); }
    for (const p of window.__PL) { if (S.canLicense(g, p.id) === true && window.__potential(p, S.yfOf(g.t)) > 25 && g.money > S.licenseCost(g, p.id) * 3) S.buyLicense(g, p.id); }
    if (g.money < 4000 && !g.job && g.contracts.length) S.acceptContract(g, g.contracts[0].id);
    if (g.job && g.job.kind === 'game' && g.job.state === 'dev' && g.job.phase >= 1) for (const m of S.marketingOptions(g)) if (!m.used && g.money > m.cost * 6) S.launchMarketing(g, m.id);
  }, 400);
});
let last = '';
const seen = new Set();
const t0 = Date.now();
while (Date.now() - t0 < +(process.env.MAXMS || 200000)) {
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => {
    const g = window.__pd.G;
    return g ? { y: window.__sim.yearOf(g.t), over: !!g.over, money: Math.round(g.money), games: g.games.length, staff: g.staff.length, tier: g.office.tier, pend: g.pending.map((p) => p.type) } : null;
  });
  if (!st) break;
  const modal = await page.evaluate(() => {
    const ov = document.querySelector('#overlay.on .win');
    if (!ov) return null;
    return { has: ov.querySelector('.report') ? 'report' : ov.querySelector('.awards-stage') ? 'award' : ov.querySelector('[data-act="ev-pick"]') ? 'event' : ov.querySelector('[data-act="ex-pick"]') ? 'expo' : ov.querySelector('[data-act="yr-ok"]') ? 'year' : ov.querySelector('[data-act="bail-yes"]') ? 'bailout' : ov.querySelector('[data-act="over-title"]') ? 'over' : ov.querySelector('[data-act="end-go"]') ? 'ending' : ov.querySelector('[data-act="p-go"]') ? 'phase' : 'other' };
  });
  if (modal && !seen.has(modal.has)) {
    seen.add(modal.has);
    await page.waitForTimeout(modal.has === 'report' || modal.has === 'award' ? 6500 : 400);
    await page.screenshot({ path: `${outDir}/modal-${modal.has}.png` });
  }
  const T = { timeout: 700 };
  if (modal) {
    if (modal.has === 'report') { await page.click('#rp-skip', T).catch(() => {}); await page.waitForTimeout(200); await page.click('[data-act="rp-release"]', T).catch(() => {}); }
    else if (modal.has === 'award') { await page.click('[data-act="aw-skip"]', T).catch(() => {}); await page.waitForTimeout(200); await page.click('[data-act="aw-done"]', T).catch(() => {}); }
    else if (modal.has === 'event') { await page.click('.choice', T).catch(() => {}); await page.waitForTimeout(200); await page.click('[data-act="ev-ok"]', T).catch(() => {}); }
    else if (modal.has === 'expo') await page.click('[data-act="ex-pick"][data-lv="1"]', T).catch(() => page.click('[data-act="ex-pick"][data-lv="0"]', T).catch(() => {}));
    else if (modal.has === 'year') await page.click('[data-act="yr-ok"]', T).catch(() => {});
    else if (modal.has === 'bailout') await page.click('[data-act="bail-yes"]', T).catch(() => {});
    else if (modal.has === 'ending') await page.click('[data-act="end-go"]', T).catch(() => {});
    else if (modal.has === 'phase') await page.click('[data-act="p-go"]', T).catch(() => {});
    else if (modal.has === 'over') break;
  }
  const key = `${st.y}`;
  if (key !== last) {
    last = key;
    console.log(`${st.y} $${st.money} games ${st.games} staff ${st.staff} tier ${st.tier}`);
    if (st.y % 5 === 0 || st.y === 1981) await page.screenshot({ path: `${outDir}/year-${st.y}.png` });
  }
  if (st.y >= 1980 + +years || st.over) break;
}
console.log('seen dialogs:', [...seen].join(', '));
console.log(errors.length ? errors.slice(0, 15).join('\n') : 'no console errors');
await browser.close();
