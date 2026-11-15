// Fasrutan: i läget "Jag väljer" kommer rutan (och överlever Esc/M/N), i läget "Genrens ideal" kommer ingen ruta när idealet är känt,
// teamet får idealet i varje fas och tiden går vidare. Okänt ideal ger alltid en ruta.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = [];

async function run(mode, known) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript((m) => localStorage.setItem('pixel-dynasty-settings-v1', JSON.stringify({ lang: 'sv', pfocus: m, tutorial: false, music: false, sfx: false, amb: false })), mode);
  await page.goto('file://' + resolve('dist/index.html'));
  await page.waitForTimeout(500);
  await page.click('[data-act="tt-new"]'); await page.waitForTimeout(200);
  await page.click('[data-act="ng-go"]'); await page.waitForTimeout(5600);
  await page.evaluate((known) => {
    const S = window.__sim; const app = window.__pd; const G = app.G;
    for (const id of ['p_dialogue', 'p_ai', 'p_sound', 'p_world']) { const r = window.__RESEARCH.find((x) => x.id === id); G.research.done.push(id); S.applyUnlocks(G, r); }
    if (known) G.know.focus.rpg = true;
    G.u.genres.push('rpg');
    S.startProject(G, { title: 'Triangle Test', topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', audience: 'everyone' });
    app.turbo = 30; app.setSpeed(3);
  }, known);
  const label = `${mode}/${known ? 'känt' : 'okänt'}`;
  const expectPrompt = mode === 'manual' || !known;
  let saw = false;
  // slumpade händelser kan komma före fasrutan: svara på dem och vänta vidare
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(250);
    if (await page.$('[data-act="p-go"]')) { saw = true; break; }
    await page.evaluate(() => document.querySelector('[data-act="ev-ok"], [data-act="ev-pick"]')?.click());
    const ph = await page.evaluate(() => (window.__pd.G.job ? window.__pd.G.job.phase : 9));
    if (ph >= 2 && !expectPrompt) break;
  }
  if (saw !== expectPrompt) errors.push(`fail ${label}: fasruta ${saw}, väntade ${expectPrompt}`);
  if (saw) {
    await page.evaluate(() => { window.__pd.turbo = 1; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.shots/phase-${mode}.png` });
    // Esc/M/N under en prompt får inte stänga den och låsa simuleringen (promptActive kvar utan modal)
    await page.keyboard.press('Escape'); await page.keyboard.press('m'); await page.keyboard.press('n'); await page.waitForTimeout(200);
    const kept = await page.evaluate(() => ({ modal: window.__ui.modalOn, cur: window.__ui.cur, go: !!document.querySelector('[data-act="p-go"]') }));
    if (!kept.modal || kept.cur || !kept.go) errors.push(`fail ${label}: prompt lost after Esc/M/N ` + JSON.stringify(kept));
    const hasAuto = known ? !!(await page.$('[data-act="p-auto"]')) : !(await page.$('[data-act="p-auto"]'));
    if (!hasAuto) errors.push(`fail ${label}: knappen "Följ idealet framöver" ${known ? 'saknas' : 'visas trots okänt ideal'}`);
    await page.click(known ? '[data-act="p-ideal"]' : '[data-act="p-go"]').catch(() => {});
    await page.waitForTimeout(300);
  }
  const t0 = await page.evaluate(() => { window.__pd.turbo = 10; return window.__pd.G.t; });
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => {
    const G = window.__pd.G; const J = G.job;
    const S = window.__sim;
    return { t: G.t, phase: J ? J.phase : null, fit: J ? S.focusFit(G, J).fit : null, seen: window.__pd.settings.pfocusSeen, pf: window.__pd.settings.pfocus, pending: G.pending.length };
  });
  console.log(label + ':', JSON.stringify({ sawPrompt: saw, t0, ...st }));
  // en rapport eller händelse kan stoppa tiden efter fasen (snabb körning): bara en kvarstående fasruta räknas som fel
  if (!(st.t > t0) && !st.pending) errors.push(`fail ${label}: tiden går inte vidare`);
  if (known && mode === 'auto' && st.phase !== null && st.phase >= 1 && st.fit < 0.999) errors.push(`fail ${label}: idealet följdes inte (passning ${st.fit})`);
  if (known && mode === 'auto' && st.phase >= 1 && !st.seen) errors.push(`fail ${label}: förklaringen visades inte`);
  await page.close();
}
await run('manual', true);
await run('auto', true);
await run('auto', false);
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
