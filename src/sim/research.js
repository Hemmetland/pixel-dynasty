import { emit } from '../core/bus.js';
import { RES, RESEARCH } from '../data/research.js';
import { applyUnlocks } from './state.js';
import { yearOf, moneyScale, TICKS_PER_WEEK } from './const.js';
import { researchSlots, labMult, spend } from './studio.js';
import { workers } from './people.js';

export const RP_RATE = 0.05;

// Förfiningar (r.refine) forskas om och om igen upp till r.max nivåer; nivån sparas i G.research.levels.
export const refineLevel = (G, id) => (G.research.levels && G.research.levels[id]) || 0;
// Kostnad för nästa omgång: vanlig forskning har fast pris, förfiningar blir dyrare för varje nivå.
export function researchCost(G, id) {
  const r = RES[id];
  if (!r.refine) return { rp: r.rp, money: r.money };
  const lvl = refineLevel(G, id);
  return { rp: Math.round((r.rp * Math.pow(2, lvl)) / 10) * 10, money: Math.round((r.money * moneyScale(yearOf(G.t)) * Math.pow(1.5, lvl)) / 100) * 100 };
}
// Året då forskningen (eller förfiningens nästa nivå) går att starta.
export const researchYear = (G, id) => RES[id].year + (RES[id].refine ? 3 * refineLevel(G, id) : 0);
export function researchStatus(G, id) {
  const r = RES[id];
  if (G.research.active.some((a) => a.id === id)) return 'active';
  if (r.refine ? refineLevel(G, id) >= r.max : G.research.done.includes(id)) return 'done';
  if (!r.req.every((q) => G.research.done.includes(q))) return 'locked';
  if (researchYear(G, id) > yearOf(G.t)) return 'future';
  return 'available';
}
export function canResearch(G, id) {
  const st = researchStatus(G, id);
  if (st !== 'available') return st;
  const c = researchCost(G, id);
  if (G.research.active.length >= researchSlots(G)) return 'slots';
  if (G.rp < c.rp) return 'rp';
  if (G.money < c.money) return 'money';
  return true;
}
export function startResearch(G, id) {
  const ok = canResearch(G, id);
  if (ok !== true) return ok;
  const r = RES[id];
  const c = researchCost(G, id);
  G.rp -= c.rp;
  if (c.money) spend(G, c.money, 'research');
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
    const r = RES[a.id];
    if (r.refine) {
      G.research.levels = G.research.levels || {};
      G.research.levels[a.id] = refineLevel(G, a.id) + 1;
      applyUnlocks(G, r);
      emit('refined', { r, level: G.research.levels[a.id] });
      continue;
    }
    G.research.done.push(a.id);
    applyUnlocks(G, r);
    G.stats.researched++;
    emit('researched', r);
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
