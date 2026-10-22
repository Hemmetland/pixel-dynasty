import { clamp } from '../core/util.js';
import { rnd, chance, weighted, pick } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { EVENTS, EV } from '../data/events.js';
import { SCOPES, yearOf, moneyScale } from './const.js';
import { SCOPE_TEMPO } from './tempo.js';
import { earn, spend } from './studio.js';
import { parPerTick } from './score.js';
import { note } from './news.js';
import { subPrices } from './live.js';

// Det största onlinespelet som är igång, eller null
const liveTop = (G) => G.games.reduce((a, g) => (g.live && !g.live.closed && (!a || g.live.subs > a.live.subs) ? g : a), null);

// Vem och vad händelsen handlar om väljs när den dras, så att texten och effekten gäller samma person och spel.
// needs: 'staff' = en anställd (inte grundaren), 'game' = senaste släppta spelet, 'oldGame' = studions bästa äldre spel,
// 'live' = det största onlinespelet som är igång.
function eventContext(G, ev) {
  const ctx = {};
  const needs = ev.needs || [];
  if (needs.includes('staff')) {
    const cand = G.staff.filter((s) => !s.isFounder);
    if (cand.length) ctx.who = pick(G, cand).id;
  }
  if (needs.includes('game') && G.games.length) ctx.game = G.games[G.games.length - 1].id;
  if (needs.includes('oldGame') && G.games.length) {
    const old = G.games.slice(0, -1);
    const best = (old.length ? old : G.games).reduce((a, g) => (g.score > a.score ? g : a));
    ctx.game = best.id;
  }
  if (needs.includes('live')) {
    const lg = liveTop(G);
    if (lg) ctx.game = lg.id;
  }
  return ctx;
}
// Samma händelse kommer tidigast efter 36 veckor (studio) eller 40 veckor (under utveckling).
const COOLDOWN = { studio: 36, dev: 40 };
const fresh = (G, e) => G.t - (G.flags['ev_' + e.id] ?? -999) > COOLDOWN[e.kind];
export function rollStudioEvent(G, force) {
  if (G.pending.length || (!force && (G.games.length < 1 || !chance(G, 0.17)))) return false;
  const pool = EVENTS.filter((e) => e.kind === 'studio' && e.when(G) && fresh(G, e));
  if (!pool.length) return false;
  const ev = weighted(G, pool, (e) => e.weight);
  G.flags['ev_' + ev.id] = G.t;
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id, ...eventContext(G, ev) });
  return true;
}
export function rollDevEvent(G) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.state !== 'dev' || J.phase >= 3 || G.pending.length) return false;
  if (J.events >= 3 || J.ticks < 12 || !chance(G, 0.075 / (SCOPE_TEMPO[J.scope] || 1))) return false;
  const pool = EVENTS.filter((e) => e.kind === 'dev' && e.when(G) && fresh(G, e));
  if (!pool.length) return false;
  const ev = weighted(G, pool, (e) => e.weight);
  J.events++;
  G.flags['ev_' + ev.id] = G.t;
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id, ...eventContext(G, ev) });
  return true;
}

// typografiskt minustecken för negativa procent
const pct = (x) => (x > 0 ? '+' : x < 0 ? '\u2212' : '') + Math.abs(Math.round(x * 100)) + '%';
// Tillämpa effekter, returnera lista med förändringar för visning. ctx = { who, game } från händelsen.
// dry = true ändrar ingenting och ger bara de säkra effekterna (förhandsvisning); slumpgrenar blir { k: 'risk' }.
export function applyFx(G, fx, out = [], ctx = {}, dry = false) {
  const year = yearOf(G.t);
  const ms = moneyScale(year);
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  if (fx.money) {
    const v = Math.round((fx.money * ms) / 10) * 10;
    if (!dry) {
      if (v > 0) earn(G, v, 'events');
      else spend(G, -v, 'events');
    }
    out.push({ k: 'money', v });
  }
  if (fx.rp) {
    if (!dry) G.rp = Math.max(0, G.rp + fx.rp);
    out.push({ k: 'rp', v: fx.rp });
  }
  if (fx.fans) {
    if (!dry) G.fans = Math.max(0, G.fans + fx.fans);
    out.push({ k: 'fans', v: fx.fans });
  }
  // fansRel = andel av nuvarande fans (minst 25 åt något håll), så att sena händelser märks även för stora studior
  if (fx.fansRel) {
    const v = Math.sign(fx.fansRel) * Math.max(25, Math.round(G.fans * Math.abs(fx.fansRel)));
    if (!dry) G.fans = Math.max(0, G.fans + v);
    out.push({ k: 'fans', v });
  }
  if (fx.hype) {
    if (J && !dry) J.hype = clamp(J.hype + fx.hype, 0, 100);
    out.push({ k: 'hype', v: fx.hype });
  }
  if (fx.hypeNext) {
    if (!dry) G.flags.hypeNext = (G.flags.hypeNext || 0) + fx.hypeNext;
    out.push({ k: 'hype', v: fx.hypeNext });
  }
  if (J) {
    const parTotal = parPerTick(G, J) * J.devTicks;
    if (fx.D && !dry) J.D += fx.D * parTotal;
    if (fx.T && !dry) J.T += fx.T * parTotal;
    if (fx.D) out.push({ k: 'design', v: pct(fx.D) });
    if (fx.T) out.push({ k: 'tech', v: pct(fx.T) });
    if (fx.bugs) {
      if (!dry) J.bugs += fx.bugs * SCOPES[J.scope].bugs;
      out.push({ k: 'bugs', v: Math.round(fx.bugs * SCOPES[J.scope].bugs) });
    }
    if (fx.bugsFrac) {
      const d = J.bugs * fx.bugsFrac;
      if (!dry) J.bugs = Math.max(0, J.bugs + d);
      out.push({ k: 'bugs', v: Math.round(d) });
    }
    if (fx.crunch) {
      if (!dry) {
        J.crunch = true;
        J.crunchTicks = fx.crunch * 4;
      }
      out.push({ k: 'crunch', v: fx.crunch });
    }
  }
  if (fx.mood) {
    if (!dry) for (const s of G.staff) s.mood = clamp(s.mood + fx.mood, 0, 100);
    out.push({ k: 'mood', v: fx.mood });
  }
  // onlinespelet händelsen gäller (ctx.game), annars det största som är igång; utan onlinespel händer ingenting
  if (fx.subs || fx.fresh || fx.subsMoney) {
    const own = G.games.find((g) => g.id === ctx.game);
    const lg = own && own.live && !own.live.closed ? own : liveTop(G);
    const lv = lg && lg.live;
    if (lv && fx.subsMoney) {
      const v = Math.round((fx.subsMoney * lv.subs * subPrices(year)[0]) / 10) * 10;
      if (!dry) {
        if (v > 0) earn(G, v, 'events');
        else spend(G, -v, 'events');
      }
      out.push({ k: 'money', v });
    }
    if (lv && fx.subs) {
      const v = Math.round(lv.subs * fx.subs);
      if (!dry) {
        lv.subs = Math.max(0, lv.subs + v);
        lv.peak = Math.max(lv.peak, lv.subs);
      }
      out.push({ k: 'subs', v });
    }
    if (lv && fx.fresh) {
      if (!dry) lv.fresh = clamp(lv.fresh + fx.fresh, 0, 100);
      out.push({ k: 'fresh', v: fx.fresh });
    }
  }
  if (fx.salesMult) {
    if (!dry) (G.flags.salesQ = G.flags.salesQ || []).push(fx.salesMult);
    out.push({ k: 'sales', v: pct(fx.salesMult - 1) });
  }
  // personen händelsen gäller (ctx.who), annars någon slumpad som inte är grundare
  const target = () => {
    const cand = G.staff.filter((s) => !s.isFounder);
    return cand.find((s) => s.id === ctx.who) || (cand.length ? pick(G, cand) : null);
  };
  if (fx.loseStaff && G.staff.some((s) => !s.isFounder)) {
    if (!dry) {
      const s = target();
      G.staff = G.staff.filter((x) => x !== s);
      note(G, 'news.staffLeft', { name: s.name }, 'bad');
    }
    out.push({ k: 'staff', v: -1 });
  }
  if (fx.raiseRandom && G.staff.some((s) => !s.isFounder)) {
    if (!dry) {
      const s = target();
      s.salary = Math.round((s.salary * 1.15) / 10) * 10;
      s.mood = clamp(s.mood + 15, 0, 100);
    }
    out.push({ k: 'raise', v: '+15%' });
  }
  if (fx.res) out.push({ k: 'text', v: fx.res });
  if (fx.rand && dry) out.push({ k: 'risk' });
  else if (fx.rand) {
    let r = rnd(G);
    for (const [p, sub] of fx.rand) {
      if (r < p) {
        applyFx(G, sub, out, ctx);
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
  const out = applyFx(G, ch.fx, [], { who: pr.who, game: pr.game });
  G.stats.events++;
  emit('eventResolved', { ev, idx, out });
  return out;
}

// Säkra effekter av ett val, utan att något ändras (för knapparna i händelserutan)
export const previewFx = (G, fx, ctx) => applyFx(G, fx, [], ctx, true);
