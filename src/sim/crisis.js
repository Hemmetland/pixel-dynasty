// Rivaler och kriser: rivalen går efter studion personligen (släpper på ditt släpp, värvar ditt folk, sprider rykten, kopierar dina
// succéer) och kriser som läckor, strejker och floppar måste hanteras. Båda kommer som vanliga händelserutor med val (data/crisis-events.js).
// Jakten har en temperatur (G.crisis.heat 0-100): den stiger när du leder över rivalen och lugnas av bra svar. Krisberedskapen
// (kassa, stämning, personalavdelning, QA-labb, fans) gör att färre kriser kommer. Allt som avgör om och vilken händelse som
// kommer (och vem den gäller) dras med hashStr, aldrig G.rng: utan en händelse är slumpföljden i spelet densamma som utan
// systemet. Bara utfallet av ett val med slump (när spelaren valt) använder G.rng, som i alla andra händelser.
import { hashStr } from '../core/rng.js';
import { clamp } from '../core/util.js';
import { EVENTS } from '../data/events.js';
import { yearOf, moneyScale } from './const.js';
import { rivalOf, rivalLast } from './rival.js';
import { payroll } from './people.js';
import { facLevel } from './studio.js';
import { breathing } from './events.js';
import { beat } from './life.js';

export const CRISIS_COOLDOWN = 40; // veckor mellan två likadana händelser
export const CRISIS_START = 48 * 2; // inga kriser förrän studion funnits i två år
export const HEAT_STEPS = [25, 55, 80]; // gränser för Lugnt, Spänt, Het och Krig
const LOG_MAX = 24;
// vilken scenhändelse och textvariant varje händelse får (huntMove: 0 släpp, 1 värvning, 2 rykten, 3 kopia, 4 flopp; crisisHit: 0 läcka, 1 strejk, 2 flopp)
const MOVE = { hunt_launch: 0, hunt_poach: 1, hunt_smear: 2, hunt_copy: 3, hunt_flop: 4 };
const HIT = { crisis_leak: 0, crisis_strike: 1, crisis_flop: 2 };
export const CRISIS_IDS = [...Object.keys(MOVE), ...Object.keys(HIT)];

// Spelets egen krisbok: skapas första gången den behövs (äldre sparningar saknar den)
export function crisisOf(G) {
  return G.crisis || (G.crisis = { heat: 0, last: {}, log: [], n: 0 });
}
export const heatLevel = (h) => HEAT_STEPS.filter((x) => h >= x).length; // 0 lugnt, 1 spänt, 2 het, 3 krig

// En vanlig månads intäkter från spelen (de tre senaste månaderna), så att kostnaderna i kriserna följer studions storlek
export function monthRev(G) {
  const h = (G.hist && G.hist.revenue ? G.hist.revenue : []).slice(-3);
  const avg = h.length ? h.reduce((a, x) => a + x.v, 0) / h.length : 0;
  return Math.max(avg, 1500 * moneyScale(yearOf(G.t)));
}
const avgMood = (G) => {
  const s = G.staff.filter((x) => !x.isFounder);
  return s.length ? s.reduce((a, x) => a + x.mood, 0) / s.length : 100;
};

// Krisberedskapen: fem delar som tillsammans (högst 50 procent) minskar chansen att en kris eller rivalens drag kommer
export const SHIELD_PARTS = [
  { id: 'cash', v: 0.12, on: (G) => payroll(G) > 0 && G.money >= 6 * payroll(G) },
  { id: 'mood', v: 0.12, on: (G) => G.staff.some((x) => !x.isFounder) && avgMood(G) >= 62 },
  { id: 'hr', v: 0.1, on: (G) => !!G.u.flags.hrAuto },
  { id: 'qa', v: 0.08, on: (G) => facLevel(G, 'qa') >= 1 },
  { id: 'fans', v: 0.08, on: (G) => G.fans >= 5000 },
];
export function crisisShield(G) {
  const parts = SHIELD_PARTS.map((p) => ({ id: p.id, v: p.v, on: !!p.on(G) }));
  return { total: Math.min(0.5, parts.reduce((a, p) => a + (p.on ? p.v : 0), 0)), parts };
}

// Spelet en kris gäller: läckan gäller bygget som är under arbete, de andra det senast släppta
const crisisGame = (G, ev, id) => (ev === 'crisis_leak' && G.job && G.job.kind === 'game' ? G.job : G.games.find((x) => x.id === id) || G.games[G.games.length - 1] || null);
// Vem och vilket spel händelsen gäller (samma som eventContext i events.js, men dragen med hashStr)
function crisisContext(G, ev) {
  const ctx = {};
  const needs = ev.needs || [];
  if (needs.includes('staff')) {
    const cand = G.staff.filter((s) => !s.isFounder);
    if (cand.length) ctx.who = cand[Math.floor(hash01(G, 'crisis-who') * cand.length)].id;
  }
  if (needs.includes('game') && G.games.length) ctx.game = G.games[G.games.length - 1].id;
  return ctx;
}
// 0 till 1 ur seed, nyckel och vecka. hashStr ensam sprider tätt följande veckor ojämnt, så resultatet blandas en gång till.
export const roll01 = (G, tag) => {
  let h = hashStr(`${G.seed}|${tag}|${G.t}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const hash01 = roll01;
const pickBy = (G, pool, u) => {
  let tot = pool.reduce((a, e) => a + e.weight, 0) * u;
  for (const e of pool) {
    tot -= e.weight;
    if (tot <= 0) return e;
  }
  return pool[pool.length - 1];
};

// Händelser som just nu kan komma: rätt sort, villkoret uppfyllt och inte nyligen
const eligible = (G, kind) => {
  const C = crisisOf(G);
  return EVENTS.filter((e) => e.kind === kind && G.t - (C.last[e.id] ?? -999) > CRISIS_COOLDOWN && e.when(G));
};

// Varje månad: jaktens temperatur justeras och slumpen kan ge en händelse. Svarar händelsens id, annars ''.
export function crisisMonth(G) {
  const C = crisisOf(G);
  const R = rivalOf(G);
  C.heat = clamp(C.heat * 0.92 + (R ? (G.rival.lead ? 3 : 1) : 0), 0, 100);
  if (G.games.length < 1 || G.t < CRISIS_START) return '';
  const calm = 1 - crisisShield(G).total;
  const pHunt = R ? (0.06 + 0.0016 * C.heat) * calm : 0;
  const pCrisis = 0.045 * calm;
  const u = hash01(G, 'crisis');
  const roll = u < pHunt ? 'hunt' : u < pHunt + pCrisis ? 'crisis' : '';
  // faller slumpen medan spelet nyss stannat för något annat väntar händelsen till nästa månad (som övriga händelser, så att det
  // blir lika många men utspridda)
  if (G.pending.length || breathing(G)) {
    if (roll) C.due = roll;
    return '';
  }
  const kind = roll || C.due || '';
  C.due = '';
  if (!kind) return '';
  const pool = eligible(G, kind);
  if (!pool.length) return '';
  const ev = pickBy(G, pool, hash01(G, 'crisis-pick'));
  C.last[ev.id] = G.t;
  const ctx = crisisContext(G, ev);
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id, ...ctx });
  if (kind === 'hunt') beat(G, 'huntMove', { g: R ? R.name : '', v: MOVE[ev.id] });
  else beat(G, 'crisisHit', { g: (crisisGame(G, ev.id, ctx.game) || {}).title || '', v: HIT[ev.id] });
  return ev.id;
}

// Efter ett val: händelsen skrivs in i boken och scenen får veta hur det gick. out = effekterna som valet gav.
export function crisisAfter(G, pr, ev, idx, out) {
  if (ev.kind !== 'hunt' && ev.kind !== 'crisis') return;
  const C = crisisOf(G);
  const s = G.staff.find((x) => x.id === pr.who);
  const g = crisisGame(G, ev.id, pr.game);
  const rl = rivalLast(G);
  C.log.push({ t: G.t, ev: ev.id, c: idx, rival: G.rival ? G.rival.name : '', name: s ? s.name : '', title: g ? g.title : '', rtitle: rl ? rl.title : '' });
  if (C.log.length > LOG_MAX) C.log.shift();
  C.n++;
  const rough = out.some((o) => ['fans', 'money', 'mood', 'hype', 'staff'].includes(o.k) && typeof o.v === 'number' && o.v < 0);
  beat(G, 'crisisSolved', { g: ev.kind === 'hunt' ? (G.rival ? G.rival.name : '') : g ? g.title : '', a: idx, v: rough ? 1 : 0 });
}

// Allt fönstret och scenen behöver: rivalen, jaktens temperatur, beredskapen och de senaste händelserna
export function crisisState(G) {
  const C = crisisOf(G);
  const R = rivalOf(G);
  const open = G.pending.find((p) => p.type === 'event' && CRISIS_IDS.includes(p.ev));
  return {
    rival: R ? { id: R.id, name: R.name, color: R.color, since: G.rival.since, w: G.rival.w, l: G.rival.l, lead: !!G.rival.lead } : null,
    heat: Math.round(C.heat),
    level: heatLevel(C.heat),
    shield: Math.round(crisisShield(G).total * 100),
    open: open ? open.ev : '',
    handled: C.n,
    recent: C.log.slice(-6).reverse(),
  };
}
