// Skriver ut en kontrollsumma för byggnadens statiska lager per nivå (med fast studionamn m.m.), så att man kan se att en
// ändring inte rört en nivå som den inte skulle röra. node test/statichash.mjs [nivåer=0,1,2,3,4,5]   (kräver dist/index.html)
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const tiers = (process.argv[2] || '0,1,2,3,4,5').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'sv-SE' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + resolve('dist/index.html') + '?title=dusk');
await p.waitForTimeout(500);
await p.click('[data-act="tt-new"]');
await p.waitForTimeout(300);
await p.click('[data-act="ng-go"]');
await p.waitForTimeout(5500);
for (const t of tiers) {
  const url = await p.evaluate((t) => {
    const a = window.__pd;
    a.setSpeed(0);
    a.G.office.tier = +t;
    a.G.studio = 'Hash Test';
    a.G.awards = [];
    a.G.games = [];
    a.G.office.fac = { coffee: { lvl: 2, slot: 0 }, lab: { lvl: 1, slot: 1 } };
    a.scene.tierChanged();
    a.scene.buildStatics();
    return a.scene.statics.layer.toDataURL();
  }, t);
  console.log('tier', t, createHash('md5').update(url).digest('hex'));
}
console.log(errs.join('\n') || 'inga fel');
await b.close();
