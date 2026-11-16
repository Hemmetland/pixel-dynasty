// Hårdvarukriget: när studion säljer egen hårdvara går en konkurrerande tillverkare efter den (priskrig, exklusiva spel, patentstämningar
// och korslicenser) och komponentbrist hos tillverkaren stoppar leveranserna. Allt kommer som vanliga händelserutor med val
// (data/hwwar-events.js). Kriget har en egen temperatur (G.hwwar.heat 0-100) som stiger när du har en plattform på marknaden och
// lugnas av bra svar. Beredskapen (egen fabrik, rykte, goda partners, egen arkitektur, kassa) gör att färre drag kommer.
// Som i crisis.js dras allt som avgör om och vilken händelse som kommer med hashStr, aldrig G.rng.
import { clamp } from '../core/util.js';
import { EVENTS } from '../data/events.js';
import { HW_PARTNER } from '../data/hardware.js';
import { PLATFORM } from '../data/platforms.js';
import { warOpponent } from '../data/hwwar-events.js';
import { payroll } from './people.js';
import { breathing } from './events.js';
import { beat } from './life.js';
import { warFront, warShortNow, fabLvl } from './hardware.js';
import { roll01, heatLevel } from './crisis.js';

export const WAR_COOLDOWN = 40; // veckor mellan två likadana händelser
export const WAR_START = 24; // veckor efter att hårdvaruavdelningen öppnats
const LOG_MAX = 24;
// vilken scenhändelse och textvariant varje händelse får (warMove: 0 prissänkning, 1 exklusivt spel, 2 fankrig, 3 patentstämning, 4 korslicens, 5 komponentbrist, 6 brand)
const MOVE = { war_pricecut: 0, war_exclusive: 1, war_fanwar: 2, war_patent_sue: 3, war_patent_license: 4, war_short: 5, war_fire: 6 };
export const WAR_IDS = Object.keys(MOVE);

// Hårdvarukrigets bok: skapas första gången den behövs (äldre sparningar saknar den)
export function warOf(G) {
  return G.hwwar || (G.hwwar = { heat: 0, last: {}, log: [], n: 0, due: '', lic: 0 });
}

// Beredskapen: fem delar som tillsammans (högst 50 procent) minskar chansen att ett drag kommer
export const WAR_PARTS = [
  { id: 'fab', v: 0.15, on: (G) => fabLvl(G) >= 1 },
  { id: 'rep', v: 0.12, on: (G) => !!G.hw && G.hw.rep >= 60 },
  { id: 'rel', v: 0.1, on: (G) => !!G.hw && Object.values(G.hw.partners).some((s) => s.rel >= 70) },
  { id: 'arch', v: 0.08, on: (G) => !!G.hw && G.hw.products.some((p) => p.arch === 'own' && p.state !== 'ended') },
  { id: 'cash', v: 0.05, on: (G) => payroll(G) > 0 && G.money >= 6 * payroll(G) },
];
export function warShield(G) {
  const parts = WAR_PARTS.map((p) => ({ id: p.id, v: p.v, on: !!p.on(G) }));
  return { total: Math.min(0.5, parts.reduce((a, p) => a + (p.on ? p.v : 0), 0)), parts };
}

const eligible = (G) => {
  const W = warOf(G);
  return EVENTS.filter((e) => e.kind === 'hwwar' && G.t - (W.last[e.id] ?? -999) > WAR_COOLDOWN && e.when(G));
};
const pickBy = (pool, u) => {
  let tot = pool.reduce((a, e) => a + e.weight, 0) * u;
  for (const e of pool) {
    tot -= e.weight;
    if (tot <= 0) return e;
  }
  return pool[pool.length - 1];
};

// Vad rutan behöver fylla i: konkurrenten, produkten och tillverkaren (tomt när något saknas, då väljs rutan inte)
function warContext(G, ev) {
  const F = warFront(G);
  const needs = ev.needs || [];
  const ctx = {};
  if (!F) return ctx;
  const P = needs.includes('plat') ? F.plat : needs.includes('arch') ? F.arch : null;
  if (needs.includes('opp')) {
    const o = warOpponent(G, P ? P.type : 'console');
    if (o) ctx.opp = { maker: o.maker, plat: o.name };
  }
  if (P) ctx.prod = P.name;
  if (needs.includes('partner') && F.sup) ctx.partner = HW_PARTNER[F.sup.partner].name;
  return ctx;
}

// Varje månad: kriget lugnas eller hettas upp och slumpen kan ge en händelse. Svarar händelsens id, annars ''.
export function hwwarMonth(G) {
  if (!G.hw) return ''; // ingen hårdvaruavdelning: varken krig eller bok
  const W = warOf(G);
  const F = warFront(G);
  const opp = F && F.plat ? warOpponent(G, F.plat.type) : null;
  // en egen plattform i samma storleksklass som konkurrentens hettar upp kriget mest
  const pl = F && F.plat ? PLATFORM[F.plat.plat] : null;
  const strong = !!(pl && opp && pl.weight >= 0.5 * opp.w);
  W.heat = clamp(W.heat * 0.92 + (F ? (F.plat ? (strong ? 3 : 2) : 1) : 0), 0, 100);
  if (!F || G.t - G.hw.t0 < WAR_START) return '';
  const calm = 1 - warShield(G).total;
  const roll = roll01(G, 'war') < (0.05 + 0.0016 * W.heat) * calm;
  // som i crisis.js: faller slumpen medan spelet nyss stannat väntar händelsen till nästa månad
  if (G.pending.length || breathing(G)) {
    if (roll) W.due = 'x';
    return '';
  }
  const hit = roll || !!W.due;
  W.due = '';
  if (!hit) return '';
  const pool = eligible(G);
  if (!pool.length) return '';
  const ev = pickBy(pool, roll01(G, 'war-pick'));
  const ctx = warContext(G, ev);
  if ((ev.needs || []).includes('opp') && !ctx.opp) return '';
  W.last[ev.id] = G.t;
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id, ...ctx });
  beat(G, 'warMove', { g: ctx.opp ? ctx.opp.maker : ctx.partner || '', v: MOVE[ev.id] });
  return ev.id;
}

// Efter ett val: händelsen skrivs in i boken och scenen får veta hur det gick. out = effekterna som valet gav.
export function hwwarAfter(G, pr, ev, idx, out) {
  if (ev.kind !== 'hwwar') return;
  const W = warOf(G);
  W.log.push({ t: G.t, ev: ev.id, c: idx, rival: pr.opp ? pr.opp.maker : '', rplat: pr.opp ? pr.opp.plat : '', prod: pr.prod || '', partner: pr.partner || '' });
  if (W.log.length > LOG_MAX) W.log.shift();
  W.n++;
  const rough = out.some((o) => o.k === 'hwShort' || o.k === 'hwCut' || (['money', 'hwRep', 'hwBase', 'fans'].includes(o.k) && typeof o.v === 'number' && o.v < 0));
  beat(G, 'warSolved', { g: pr.opp ? pr.opp.maker : pr.partner || '', a: idx, v: rough ? 1 : 0 });
}

// Allt fönstret och scenen behöver: konkurrenten, kriget, beredskapen, de tre fronterna och de senaste händelserna
export function warState(G) {
  const W = warOf(G);
  const F = G.hw ? warFront(G) : null;
  const kind = F && F.plat ? F.plat.type : 'console';
  const o = F ? warOpponent(G, kind) : null;
  const pl = F && F.plat ? PLATFORM[F.plat.plat] : null;
  const sh = warShield(G);
  const short = G.hw ? warShortNow(G) : null;
  return {
    open: !!F,
    opp: o ? { maker: o.maker, plat: o.name, color: o.color, kind: o.kind, w: Math.round(o.w) } : null,
    own: F && F.plat ? { name: F.plat.name, kind: F.plat.type, w: Math.round(pl ? pl.weight : 0), base: Math.round(F.plat.base || 0) } : null,
    heat: Math.round(W.heat),
    level: heatLevel(W.heat),
    shield: Math.round(sh.total * 100),
    patent: { on: !!(F && F.arch), lic: W.lic > G.t ? W.lic - G.t : 0 },
    supply: { on: !!(F && F.sup), short: short ? { partner: HW_PARTNER[short.partner].name, left: short.left } : null },
    handled: W.n,
    recent: W.log.slice(-6).reverse(),
  };
}
