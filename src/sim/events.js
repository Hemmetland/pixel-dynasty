import { clamp } from '../core/util.js';
import { rnd, chance, weighted, pick } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { EVENTS, EV } from '../data/events.js';
import { SCOPES, yearOf, moneyScale } from './const.js';
import { SCOPE_TEMPO } from './tempo.js';
import { earn, spend } from './studio.js';
import { parPerTick } from './score.js';
import { note } from './news.js';

export function rollStudioEvent(G, force) {
  if (G.pending.length || (!force && (G.games.length < 1 || !chance(G, 0.17)))) return false;
  const pool = EVENTS.filter((e) => e.kind === 'studio' && e.when(G) && G.t - (G.flags['ev_' + e.id] ?? -999) > 36);
  if (!pool.length) return false;
  const ev = weighted(G, pool, (e) => e.weight);
  G.flags['ev_' + ev.id] = G.t;
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id });
  return true;
}
export function rollDevEvent(G) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.state !== 'dev' || J.phase >= 3 || G.pending.length) return false;
  if (J.events >= 3 || J.ticks < 12 || !chance(G, 0.075 / (SCOPE_TEMPO[J.scope] || 1))) return false;
  const pool = EVENTS.filter((e) => e.kind === 'dev' && e.when(G));
  if (!pool.length) return false;
  const ev = weighted(G, pool, (e) => e.weight);
  J.events++;
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id });
  return true;
}

// Tillämpa effekter, returnera lista med förändringar för visning.
export function applyFx(G, fx, out = []) {
  const year = yearOf(G.t);
  const ms = moneyScale(year);
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  if (fx.money) {
    const v = Math.round((fx.money * ms) / 10) * 10;
    if (v > 0) earn(G, v, 'events');
    else spend(G, -v, 'events');
    out.push({ k: 'money', v });
  }
  if (fx.rp) {
    G.rp = Math.max(0, G.rp + fx.rp);
    out.push({ k: 'rp', v: fx.rp });
  }
  if (fx.fans) {
    G.fans = Math.max(0, G.fans + fx.fans);
    out.push({ k: 'fans', v: fx.fans });
  }
  if (fx.hype) {
    if (J) J.hype = clamp(J.hype + fx.hype, 0, 100);
    out.push({ k: 'hype', v: fx.hype });
  }
  if (fx.hypeNext) {
    G.flags.hypeNext = (G.flags.hypeNext || 0) + fx.hypeNext;
    out.push({ k: 'hype', v: fx.hypeNext });
  }
  if (J) {
    const parTotal = parPerTick(G, J) * J.devTicks;
    if (fx.D) J.D += fx.D * parTotal;
    if (fx.T) J.T += fx.T * parTotal;
    if (fx.D) out.push({ k: 'design', v: Math.round(fx.D * 100) + '%' });
    if (fx.T) out.push({ k: 'tech', v: Math.round(fx.T * 100) + '%' });
    if (fx.bugs) {
      J.bugs += fx.bugs * SCOPES[J.scope].bugs;
      out.push({ k: 'bugs', v: Math.round(fx.bugs * SCOPES[J.scope].bugs) });
    }
    if (fx.bugsFrac) {
      const d = J.bugs * fx.bugsFrac;
      J.bugs = Math.max(0, J.bugs + d);
      out.push({ k: 'bugs', v: Math.round(d) });
    }
    if (fx.crunch) {
      J.crunch = true;
      J.crunchTicks = fx.crunch * 4;
    }
  }
  if (fx.mood) {
    for (const s of G.staff) s.mood = clamp(s.mood + fx.mood, 0, 100);
    out.push({ k: 'mood', v: fx.mood });
  }
  if (fx.salesMult) {
    G.flags.salesQ = G.flags.salesQ || [];
    G.flags.salesQ.push(fx.salesMult);
    out.push({ k: 'sales', v: Math.round((fx.salesMult - 1) * 100) + '%' });
  }
  if (fx.loseStaff) {
    const cand = G.staff.filter((s) => !s.isFounder);
    if (cand.length) {
      const s = pick(G, cand);
      G.staff = G.staff.filter((x) => x !== s);
      note(G, 'news.staffLeft', { name: s.name }, 'bad');
      out.push({ k: 'staff', v: -1 });
    }
  }
  if (fx.raiseRandom) {
    const cand = G.staff.filter((s) => !s.isFounder);
    if (cand.length) {
      const s = pick(G, cand);
      s.salary = Math.round((s.salary * 1.15) / 10) * 10;
      s.mood = clamp(s.mood + 15, 0, 100);
    }
  }
  if (fx.rand) {
    let r = rnd(G);
    for (const [p, sub] of fx.rand) {
      if (r < p) {
        applyFx(G, sub, out);
        break;
      }
      r -= p;
    }
  }
  return out;
}

export function resolveEvent(G, promptId, idx) {
  const i = G.pending.findIndex((p) => p.id === promptId && p.type === 'event');
  if (i < 0) return null;
  const pr = G.pending[i];
  const ev = EV[pr.ev];
  const ch = ev.choices[idx];
  G.pending.splice(i, 1);
  const out = applyFx(G, ch.fx, []);
  G.stats.events++;
  emit('eventResolved', { ev, idx, out });
  return out;
}
