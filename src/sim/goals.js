// Studiomål (data/goals.js): en trappa av delmål med små belöningar. Ren sim, ingen slump.
import { emit } from '../core/bus.js';
import { GOALS } from '../data/goals.js';
import { moneyScale, yearOf } from './const.js';
import { earn } from './studio.js';
import { note } from './news.js';

const doneOf = (G) => (G.goals ||= { done: [] }).done;
export const goalDone = (G, id) => doneOf(G).includes(id);
const isOpen = (G, x) => !x.when || x.when(G);

// Nuläge mot målet: { cur, max, pct } (cur klipps till max)
export function goalProg(G, x) {
  const [cur, max] = x.prog(G);
  const c = Math.min(cur, max);
  return { cur: c, max, pct: max > 0 ? Math.floor((c / max) * 100) : 0, ok: cur >= max };
}

// De aktiva målen: de första som inte är klara och är öppna, i listans ordning (nivå först)
export function activeGoals(G, n = 3) {
  return GOALS.filter((x) => !goalDone(G, x.id) && isOpen(G, x)).slice(0, n);
}

// Belöningen i dagens pengar (pengarna skalas med år, som i händelserna)
export function goalReward(G, x) {
  const r = x.reward;
  const out = {};
  if (r.money) out.money = Math.round((r.money * moneyScale(yearOf(G.t))) / 10) * 10;
  if (r.fans) out.fans = r.fans;
  if (r.rp) out.rp = r.rp;
  return out;
}

function finish(G, x) {
  const r = goalReward(G, x);
  doneOf(G).push(x.id);
  if (r.money) earn(G, r.money, 'goals');
  if (r.fans) G.fans += r.fans;
  if (r.rp) G.rp += r.rp;
  const item = note(G, 'news.goal', { name: x.name }, 'award', true);
  emit('goal', { goal: x, reward: r, item });
}

// Klara de aktiva målen som är nådda. Ett nått mål som ännu inte är aktivt väntar tills det blir det, så att flera
// belöningar inte kommer på en gång. Körs varje månad och efter släpp, anställning och forskning.
export function checkGoals(G) {
  for (let guard = 0; guard < 8; guard++) {
    const hit = activeGoals(G).find((x) => goalProg(G, x).ok);
    if (!hit) return;
    finish(G, hit);
  }
}

// En sparning från före målen: det som redan är gjort räknas som klart utan belöning, så att inget regnar in på en gång
export function seedGoals(G) {
  const d = doneOf(G);
  for (const x of GOALS) if (!d.includes(x.id) && isOpen(G, x) && goalProg(G, x).ok) d.push(x.id);
}
