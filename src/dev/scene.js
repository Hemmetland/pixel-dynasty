import { Scene } from '../render/scene.js';
import { newGame } from '../sim/state.js';
import { makeCompetitors } from '../sim/market.js';
import { initWorld } from '../sim/clock.js';
import { makeCandidate } from '../sim/people.js';
const q = new URLSearchParams(location.search);
const tier = +(q.get('tier') || 0);
const tod = q.get('tod') ? +q.get('tod') : null;
const G = newGame({ studio: 'Nordlys Games', seed: 5 });
makeCompetitors(G); initWorld(G);
G.office.tier = tier;
G.t = 48 * (+(q.get('year') || 2) );
const n = +(q.get('staff') || 2);
for (let i = 1; i < n; i++) { const c = makeCandidate(G, 0); delete c.fee; G.staff.push(c); }
G.office.fac = { coffee: { lvl: 2, slot: 0 }, lab: { lvl: 1, slot: 1 } };
if (tier >= 2) Object.assign(G.office.fac, { qa: { lvl: 1, slot: 2 }, gameroom: { lvl: 2, slot: 3 } });
if (tier >= 3) Object.assign(G.office.fac, { training: { lvl: 2, slot: 4 }, marketing: { lvl: 1, slot: 5 } });
if (q.get('job')) G.job = { kind: 'game' };
document.body.style.cssText = 'margin:0;overflow:hidden;background:#000';
const canvas = document.createElement('canvas');
canvas.style.cssText = 'position:fixed;left:0;top:0;image-rendering:pixelated';
document.body.appendChild(canvas);
const sc = new Scene(canvas);
sc.setGame(G);
sc.todLock = tod;
sc.resize(innerWidth, innerHeight, { top: 70, bottom: 110 });
window.__sc = sc;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  sc.update(dt); sc.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
