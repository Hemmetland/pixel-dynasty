import { emit } from '../core/bus.js';
import { RES, RESEARCH } from '../data/research.js';
import { applyUnlocks } from './state.js';
import { yearOf, TICKS_PER_WEEK } from './const.js';
import { researchSlots, labMult, spend } from './studio.js';
import { workers } from './people.js';

export const RP_RATE = 0.05;

export function researchStatus(G, id) {
  const r = RES[id];
  if (G.research.done.includes(id)) return 'done';
  if (G.research.active.some((a) => a.id === id)) return 'active';
  if (!r.req.every((q) => G.research.done.includes(q))) return 'locked';
  if (r.year > yearOf(G.t)) return 'future';
  return 'available';
}
export function canResearch(G, id) {
  const st = researchStatus(G, id);
  if (st !== 'available') return st;
  const r = RES[id];
  if (G.research.active.length >= researchSlots(G)) return 'slots';
  if (G.rp < r.rp) return 'rp';
  if (G.money < r.money) return 'money';
  return true;
}
export function startResearch(G, id) {
  const ok = canResearch(G, id);
  if (ok !== true) return ok;
  const r = RES[id];
  G.rp -= r.rp;
  if (r.money) spend(G, r.money, 'research');
  G.research.active.push({ id, progress: 0, total: r.weeks * TICKS_PER_WEEK });
  emit('researchStart', r);
  return true;
}
export function researchTick(G) {
  // RP-inkomst
  let rp = 0;
  for (const w of workers(G)) rp += w.research;
  const gain = rp * RP_RATE * labMult(G);
  G.rp += gain;
  const done = [];
  for (const a of G.research.active) {
    a.progress++;
    if (a.progress >= a.total) done.push(a);
  }
  for (const a of done) {
    G.research.active = G.research.active.filter((x) => x !== a);
    G.research.done.push(a.id);
    applyUnlocks(G, RES[a.id]);
    G.stats.researched++;
    emit('researched', RES[a.id]);
  }
  return gain;
}
export function researchCount(G) {
  return { done: G.research.done.length, total: RESEARCH.length };
}
export function rpPerWeek(G) {
  let rp = 0;
  for (const w of workers(G)) rp += w.research;
  return rp * RP_RATE * labMult(G) * TICKS_PER_WEEK;
}
