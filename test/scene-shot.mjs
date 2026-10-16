// Tar skärmdumpar av själva scenen (byggnad + gata) i valfri nivå, tid, väder och ljusläge.
// node test/scene-shot.mjs <ut-prefix> [bredd] [höjd] [nivåer=1,2] [tod=0.5] [väder=clear|rain|snow] [gl=0|1] [år=1990]
// Miljövariabler: NOHUD=1 döljer gränssnittet, EXTRA="js" körs i sidan efter uppsättningen (window.__pd.scene m.m.),
//                 WAIT=ms väntetid före varje bild (standard 1200, höj för gl=1 i headless utan GPU).
// Kräver playwright-core (npm install) och en Chromium; sökvägen till den står längst ner i launch().
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const [, , out = '.shots/scene', w = '1280', h = '720', tiers = '1,2', tod = '0.5', weather = 'clear', gl = '0', year = '1990'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, locale: 'sv-SE' });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text().slice(0, 600)); });
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(600);
await page.click('[data-act="tt-new"]');
await page.waitForTimeout(300);
await page.click('[data-act="ng-go"]');
await page.waitForTimeout(5500);
await page.evaluate(() => document.querySelector('[data-act="coach-skip"], #coach .coach-close')?.click());
if (process.env.NOHUD) await page.addStyleTag({ content: '#hud,#dock,#devpanel,#coach,#toasts,.vignette{display:none!important}' });
for (const t of tiers.split(',')) {
  const ok = await page.evaluate(({ t, tod, weather, gl, year }) => {
    const a = window.__pd;
    a.setSpeed(0);
    const S = window.__sim;
    a.G.office.tier = +t;
    a.G.t = (+year - 1980) * 192 + 20;
    const n = [2, 5, 10, 15, 24, 36][+t];
    while (a.G.staff.length < n) { const c = S.makeCandidate(a.G, 0); delete c.fee; a.G.staff.push(c); }
    if (!a.G.job) S.startProject(a.G, { title: 'Demo', topic: a.G.u.topics[0], genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
    a.scene.rebuildLayout(true);
    a.scene.todLock = +tod;
    a.scene.world.tod = +tod;
    a.scene.weatherLock = weather === 'clear' ? { type: 'clear', amt: 0, snap: true } : { type: weather, amt: 1, snap: true };
    a.scene.world.setYear(+year);
    const wd = a.scene.world;
    const W = wd.W;
    wd.cars = [];
    wd.peds = [];
    wd.cars.push({ x: W / 2 - 190, dir: 1, v: 0, color: '#d84a4a', type: 'car', era: 1 }, { x: W / 2 - 20, dir: -1, v: 0, color: '#4a7ad8', type: 'van', era: 0 }, { x: W / 2 + 120, dir: 1, v: 0, color: '#f2c84a', type: 'bus', era: 0 });
    wd.peds.push({ x: W / 2 - 100, dir: 1, v: 0, t: 0, look: { skin: 1, hair: 2, hairColor: 3, shirt: 4, pants: 1, acc: 0 } }, { x: W / 2 + 60, dir: -1, v: 0, t: 1, look: { skin: 3, hair: 4, hairColor: 1, shirt: 9, pants: 0, acc: 3 } });
    wd.nextCar = 1e9;
    wd.nextPed = 1e9;
    return a.scene.setGL(!!+gl);
  }, { t, tod, weather, gl, year });
  if (process.env.EXTRA) await page.evaluate(process.env.EXTRA);
  await page.waitForTimeout(+(process.env.WAIT || 1200) * (+gl ? 2 : 1));
  await page.screenshot({ path: `${out}-${t}.png` });
  console.log('nivå', t, 'gl:', ok);
}
console.log(errors.join('\n') || 'inga fel');
await browser.close();
