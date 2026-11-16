// Spelmässan, programmet (v133): en presentation på scen med löfte, demo (och smygsläpp), trailer, ett möte med en rival i hallen och en
// stunt. Därtill mässpriserna, pressens dom och löftet som lämnas till släppet. Allt här är tillägg till mässan i expo.js: ett program med
// bara nollor (inget extra) ger samma mässa som förut. All slump kommer ur fröet och året (expoRoll, aldrig G.rng), så samma val ger samma
// mässa, och att hoppa över mässan eller programmet rör ingenting.
//
// Val (plan): { keynote 0-3 (från monter 2), demo 0-2 (bara när det pågående spelet visas), trailer 0-2, meet 0-2, stunt 0-3 }.
// Kostnaderna är andelar av monterns pris, så de följer prisutvecklingen.
import { clamp } from '../core/util.js';
import { hashStr } from '../core/rng.js';
import { L } from '../core/i18n.js';
import { dateOf, WEEKS_PER_YEAR } from './const.js';
import { note } from './news.js';
import { beat } from './life.js';
import { compMean } from './market.js';

// Presentation på scen. crowd: fler besökare, hype: andel av monterns förväntan som läggs på spelet i utveckling, bar: betyget du lovar,
// pen: hur hårt det straffas per betygssteg som saknas, keep: lyftet i försäljningen när löftet hålls
export const KEYNOTES = [null, { id: 1, cost: 0.15, crowd: 0.04, hype: 0.15, bar: 6.5, pen: 0.05, keep: 0.01 }, { id: 2, cost: 0.35, crowd: 0.1, hype: 0.4, bar: 7.5, pen: 0.09, keep: 0.03 }, { id: 3, cost: 0.6, crowd: 0.18, hype: 0.7, bar: 8.5, pen: 0.14, keep: 0.06 }];
// Demon: 0 som vanligt, 1 säker demo (krasch mindre sannolik, lite mindre förväntan), 2 smygsläpp (demon ges till alla, utfallet beror på hur buggigt spelet är)
export const DEMOS = [{ id: 0, cost: 0 }, { id: 1, cost: 0.05, crash: 0.35, hype: 0.8 }, { id: 2, cost: 0.15 }];
// Trailern: buzz = fler besökare, hit = chansen att den sprids på nätet, viral = extra chans att ett visat spel blir mässans snackis
export const TRAILERS = [{ id: 0, cost: 0, buzz: 0, hit: 0, viral: 0 }, { id: 1, cost: 0.06, buzz: 0.05, hit: 0.2, viral: 0.04 }, { id: 2, cost: 0.16, buzz: 0.12, hit: 0.45, viral: 0.1 }];
// Mötet med en rival: 0 en nick, 1 en kaffe (lugnar jakten, ger en titt på rivalens nästa släpp), 2 tävla om uppmärksamheten (kan gå åt båda hållen)
export const MEETS = [{ id: 0, cost: 0 }, { id: 1, cost: 0.02 }, { id: 2, cost: 0.04 }];
// Stunten: 0 ingen, 1 gratisprylar (fler fans, mindre i kassan), 2 tävling (visade spel säljer mer), 3 kändisgäst (kan utebli)
export const STUNTS = [{ id: 0, cost: 0 }, { id: 1, cost: 0.08 }, { id: 2, cost: 0.05 }, { id: 3, cost: 0.2 }];
// Smygsläppets chans att lyckas ur hur buggigt spelet är (ratio: nuvarande buggar mot vad en bygge av den storleken brukar ha)
export const dropChance = (ratio) => clamp(0.8 - 0.7 * ratio, 0.1, 0.8);
export const CELEB_P = 0.55; // chansen att kändisgästen kommer
export const KEY_REACT = [0.35, 0.6]; // under det första är det tyst i hallen, över det andra jublar publiken (0,6 x det visade + 0,4 x slumpen)
export const EXPO_NO_PLAN = { keynote: 0, demo: 0, trailer: 0, meet: 0, stunt: 0 };

// Mässpriserna, i den ordning de delas ut
export const EXPO_PRIZES = ['booth', 'show', 'crowd', 'soon', 'tech'];
export const EXPO_PRIZE_FANS = 0.03; // nya fans per pris, som andel av besökarna
// Pressens dom: nivå 0-4 av betyget R (0-1)
export const VERDICT_STEPS = [0.25, 0.42, 0.6, 0.78];
export const EXPO_VERDICT = { lift: [0.8, 0.92, 1, 1.08, 1.15], hype: [-3, -1, 0, 1, 2], fans: [0.92, 0.97, 1, 1.05, 1.12] };
export const verdictTier = (R) => VERDICT_STEPS.filter((x) => R >= x).length;

// Slump 0-1 ur frö, år och nyckel (blandas en gång till, hashStr ensam sprider lika strängar ojämnt)
export function expoRoll(G, year, tag) {
  let h = hashStr(`${G.seed || 0}|expo|${year}|${tag}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const ci = (v, hi) => Math.max(0, Math.min(hi, Math.floor(+v || 0)));
// Programmet som faktiskt gäller för en monter och ett urval: scen kräver monter 2, demon kräver spelet i utveckling bland de visade sakerna
export function normPlan(level, picks, plan) {
  const p = plan || {};
  const dev = (picks || []).some((x) => x.k === 'dev');
  return { keynote: level >= 2 ? ci(p.keynote, 3) : 0, demo: dev ? ci(p.demo, 2) : 0, trailer: ci(p.trailer, 2), meet: ci(p.meet, 2), stunt: ci(p.stunt, 3) };
}
const r50 = (x) => Math.round(x / 50) * 50;
// Kostnaden för varje del av programmet (andel av monterns pris) och summan
export function planCosts(boothCost, plan) {
  const c = {
    keynote: r50(boothCost * (KEYNOTES[plan.keynote] ? KEYNOTES[plan.keynote].cost : 0)),
    demo: r50(boothCost * DEMOS[plan.demo].cost),
    trailer: r50(boothCost * TRAILERS[plan.trailer].cost),
    meet: r50(boothCost * MEETS[plan.meet].cost),
    stunt: r50(boothCost * STUNTS[plan.stunt].cost),
  };
  c.total = c.keynote + c.demo + c.trailer + c.meet + c.stunt;
  return c;
}
// Förväntad påverkan på besökarna (för planeringsvyn): scenen drar folk, trailern och en kändisgäst ökar surret
export const planCrowd = (plan) => 1 + (KEYNOTES[plan.keynote] ? KEYNOTES[plan.keynote].crowd : 0);
export const planBuzz = (plan) => TRAILERS[plan.trailer].buzz + TRAILERS[plan.trailer].hit * 0.06 + (plan.stunt === 3 ? CELEB_P * 0.12 : 0);

// Rivalerna i hallen, i en ordning som bara beror på fröet och året
export function floorRivals(G, year) {
  return (G.comps || [])
    .filter((c) => !c.owned)
    .map((c) => ({ c, o: expoRoll(G, year, 'floor:' + c.id) }))
    .sort((a, b) => a.o - b.o)
    .map((e) => e.c);
}
// Rivalens form 0-1: deras bästa släpp det senaste året (annars vad de brukar nå), på samma skala som vårt q
export function rivalForm(G, c, year) {
  let b = 0;
  for (const r of (G.market && G.market.releases) || []) if (r.comp === c.id && r.t <= G.t && G.t - r.t <= WEEKS_PER_YEAR && r.score > b) b = r.score;
  return clamp(((b || compMean(c, year)) - 5.5) / 4, 0, 1);
}
const rivalPower = (c, year) => clamp((compMean(c, year) - 5.2) / 3.8, 0, 1);

// Prislistan: vad vi har (ours) mot det bästa en handfull rivaler ställer upp med (theirs, 0-1). x = { level, plan, q, buzz, hype, hwQ, hasDev, hasHw, trailerHit, celeb }.
// Bästa visning jämförs med rivalernas verkliga släpp det senaste året. Bästa monter och publikens favorit gäller alltid, de andra bara när vi ställt upp något i klassen.
export function prizeBoard(G, year, x) {
  const field = floorRivals(G, year).slice(0, 3);
  const best = (tag, base, spread, jit, n) => {
    const rows = field.slice(0, n);
    if (!rows.length) return 0.5;
    return rows.reduce((m, c) => Math.max(m, base + spread * rivalPower(c, year) + jit * expoRoll(G, year, `${tag}:${c.id}`)), 0);
  };
  const recent = (c) => rivalForm(G, c, year);
  const showBest = field.length ? field.reduce((m, c) => Math.max(m, recent(c) + 0.16 * (expoRoll(G, year, 'show:' + c.id) - 0.5)), 0) : 0.5;
  const out = [];
  const add = (id, ours, theirs) => out.push({ id, ours: Math.round(clamp(ours, 0, 1) * 100) / 100, theirs: Math.round(theirs * 100) / 100, win: clamp(ours, 0, 1) > theirs });
  const P = x.plan;
  add('booth', 0.18 + 0.17 * x.level + 0.12 * (P.trailer > 0) + 0.08 * x.trailerHit + 0.1 * (P.keynote > 0) + 0.1 * (P.stunt > 0) + 0.08 * (x.celeb === true), best('booth', 0.3, 0.3, 0.3, 3));
  if (x.nPicks) add('show', x.q, showBest);
  add('crowd', (x.buzz - 0.7) / 1.6, best('crowd', 0.25, 0.15, 0.5, 3));
  if (x.hasDev) add('soon', (x.hype / 100) * 0.85, best('soon', 0.3, 0.1, 0.4, 2));
  if (x.hasHw) add('tech', x.hwQ, best('tech', 0.25, 0.1, 0.45, 2));
  return out;
}

// ── Löftet från scenen ──────────────────────────────────────────
// Ett löfte hänger på spelet i utveckling (J.promise). Vid släppet jämförs det utlovade betyget med det verkliga: håller spelet, lyfter
// försäljningen några veckor och fansen gillar det; håller det inte, sjunker försäljningen och fans lämnar. Anropas från dev.js.
export const PROMISE_WEEKS = 8;
export function settlePromise(G, J, game) {
  const P = J && J.promise;
  if (!P) return null;
  const gap = P.bar - game.score;
  let mult;
  let fans;
  if (gap > 0) {
    mult = 1 - Math.min(0.35, P.pen * gap);
    fans = -Math.round(G.fans * Math.min(0.06, 0.01 * P.tone * gap));
  } else {
    mult = 1 + P.keep;
    fans = Math.round(G.fans * Math.min(0.03, 0.005 * P.tone * (1 - gap)));
  }
  game.expo = { until: G.t + PROMISE_WEEKS, mult };
  G.fans = Math.max(0, G.fans + fans);
  game.fansGained = (game.fansGained || 0) + Math.max(0, fans);
  game.promise = { bar: P.bar, tone: P.tone, kept: gap <= 0, mult: Math.round(mult * 1000) / 1000, fans };
  const vars = { title: game.title, bar: P.bar.toFixed(1), v: game.score.toFixed(1) };
  note(G, gap > 0 ? 'news.promiseBroken' : 'news.promiseKept', vars, gap > 0 ? 'bad' : 'good');
  beat(G, 'expoPromise', { g: game.title, a: Math.round(game.score * 10) / 10, v: gap > 0 ? 1 : 0 });
  return game.promise;
}
// Det aktuella löftet (för fönstret): null om spelet i utveckling inte har något
export function expoPromise(G) {
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  const P = J && J.promise;
  return P ? { title: L(J.title), bar: P.bar, tone: P.tone, pen: P.pen, y: P.y } : null;
}

// ── Historik och ögonblicksbild ─────────────────────────────────
export const HIST_MAX = 20;
export function recordShow(G, r) {
  const h = G.expoHist || (G.expoHist = []);
  h.push({ y: r.year, lv: r.level, vis: r.visitors, fans: r.fans, rev: r.revenue, cost: r.cost, kn: r.plan ? r.plan.keynote : 0, pz: (r.prizes || []).filter((p) => p.win).map((p) => p.id), vd: r.verdict ? r.verdict.tier : 2 });
  if (h.length > HIST_MAX) h.shift();
}
export function nextExpoT(G) {
  for (let t = G.t + 1; t <= G.t + WEEKS_PER_YEAR; t++) {
    const d = dateOf(t);
    if (d.month === 5 && d.week === 1) return t;
  }
  return null;
}
// lifeState(G, 'expo'): open = mässan är upplåst, next = veckor till nästa mässa (-1 när den inte är upplåst), last = senaste mässan (null om ingen),
// promise = löftet på spelet i utveckling, shows/prizes = antal mässor och vunna priser. last: year, level 1-3, visitors, buzz, plan {keynote, demo,
// trailer, meet, stunt}, picks [{k, name, q}], prizes [id på vunna priser], verdict 0-4, rivals [{name, color}], crash/drop/celeb/trailerHit/meet för det som hände.
export function expoState(G) {
  const R = G.expoLast || null;
  const nx = G.u.flags.expo ? nextExpoT(G) : null;
  const hist = G.expoHist || [];
  return {
    open: !!G.u.flags.expo,
    next: nx == null ? -1 : nx - G.t,
    last: R
      ? {
          year: R.year,
          level: R.level,
          visitors: R.visitors,
          buzz: Math.round(R.buzz * 100) / 100,
          plan: { ...EXPO_NO_PLAN, ...(R.plan || {}) },
          picks: R.items.map((x) => ({ k: x.k, name: L(x.name), q: Math.round(x.q * 100) / 100, crash: !!x.crash, viral: !!x.viral, drop: x.drop || '' })),
          prizes: (R.prizes || []).filter((p) => p.win).map((p) => p.id),
          verdict: R.verdict ? R.verdict.tier : 2,
          rivals: (R.rivals || []).map((c) => ({ name: c.name, color: c.color })),
          trailerHit: !!R.trailerHit,
          celeb: R.celeb == null ? null : !!R.celeb,
          meet: R.meet || null,
        }
      : null,
    promise: expoPromise(G),
    shows: hist.length,
    prizes: hist.reduce((a, h) => a + (h.pz ? h.pz.length : 0), 0),
  };
}
