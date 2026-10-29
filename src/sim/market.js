import { clamp } from '../core/util.js';
import { rnd, rint, gauss, pick, chance, weighted, shuffle } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { COMPETITORS, TITLE_PARTS, TOPIC_NOUNS } from '../data/names.js';
import { TOPICS, TOPIC } from '../data/topics.js';
import { GENRES, GENRE } from '../data/genres.js';
import { PLATFORMS, potential } from '../data/platforms.js';
import { SCOPES, yearOf, yfOf, priceOf, WEEKS_PER_MONTH } from './const.js';
import { unitRev, curveFor } from './sales.js';
import { SALES_TAIL } from './tempo.js';
import { RESEARCH } from '../data/research.js';
import { note } from './news.js';
import { subRelease, subCadence } from './group.js';

export function makeCompetitors(G) {
  const picks = shuffle(G, COMPETITORS).slice(0, 10);
  G.comps = picks.map(([name, color], i) => ({
    id: i + 1, name, color,
    strength: 0.65 + rnd(G) * 0.7,
    growth: 0.01 + rnd(G) * 0.012,
    nextT: rint(G, 6, 90),
    games: 0, best: 0, rev: 0,
  }));
}

// Speltitel på båda språken ur fyra index. Ungefär var tredje titel tar ett substantiv från temat (om det finns).
function titleFrom(a, n, form, sfx, topic) {
  const P = TITLE_PARTS;
  const TN = TOPIC_NOUNS[topic];
  const out = {};
  for (const l of ['sv', 'en']) {
    const adj = P.adj[l][a % P.adj[l].length];
    const noun = TN && n % 3 === 0 ? TN[l][Math.floor(n / 3) % TN[l].length] : P.noun[l][n % P.noun[l].length];
    const noun2 = P.noun[l][(n + 3) % P.noun[l].length];
    if (form === 0) out[l] = `${adj} ${noun}`;
    else if (form === 1) out[l] = l === 'sv' ? `${noun}s ${adj.toLowerCase()} ${adj === 'Hemliga' ? 'gåta' : 'hemlighet'}` : `${adj === 'Secret' ? 'Riddle' : 'Secret'} of the ${adj} ${noun}`;
    else if (form === 2) out[l] = `${adj} ${noun} ${P.suffix[l][sfx % P.suffix[l].length]}`;
    else out[l] = `${noun}: ${adj} ${noun2}`;
  }
  return out;
}
// Slumpad speltitel. Drar alltid exakt fyra slumptal (simuleringen förblir densamma per frö); är titeln redan tagen
// (taken = mängd engelska titlar) prövas närliggande kombinationer utan nya dragningar.
export function randomTitle(rng, topic, taken) {
  const P = TITLE_PARTS;
  const r = (n) => Math.floor(rng() * n);
  const a = r(P.adj.en.length);
  const n = r(P.noun.en.length);
  const form = r(4);
  const sfx = r(P.suffix.en.length);
  let out = titleFrom(a, n, form, sfx, topic);
  for (let k = 1; k < 6 && taken && taken.has(out.en); k++) out = titleFrom(a + k * 5, n + k * 7, (form + k) % 4, sfx + k, topic);
  return out;
}

function compScope(G, year, strength) {
  const opts = ['small'];
  if (year >= 1982) opts.push('medium');
  if (year >= 1986) opts.push('large');
  if (year >= 1998 && strength > 0.9) opts.push('aaa');
  return weighted(G, opts, (s) => ({ small: year < 1990 ? 3 : 1, medium: 2.5, large: 2, aaa: 1.4 })[s]);
}

export function releaseComp(G, c) {
  const year = yearOf(G.t);
  const yf = yfOf(G.t);
  const plats = PLATFORMS.filter((p) => potential(p, yf) > 1);
  const plat = weighted(G, plats, (p) => potential(p, yf));
  // tema och genre bestämdes när släppet planerades (ryktet); gamla sparfiler och första släppet drar dem nu
  const nx = c.next && TOPIC[c.next.topic] && GENRE[c.next.genre] ? c.next : rollNext(G, year);
  const topic = TOPIC[nx.topic];
  const genre = GENRE[nx.genre];
  const strength = c.strength;
  const mean = compMean(c, year);
  let score = clamp(Math.round(gauss(G, mean, 1.15) * 10) / 10, 1.8, 9.7);
  const scope = compScope(G, year, strength);
  let total = unitRev(year) * Math.max(0.4, potential(plat, yf)) * Math.exp(0.62 * (score - 6.5)) * SCOPES[scope].rev * (0.6 + strength * 0.5) * (1 + (c.games > 3 ? 0.2 : 0)) * clamp(gauss(G, 1, 0.2), 0.6, 1.5) * 0.85;
  // ett dotterbolag: personalstyrkan, VD:n och koncernens synergier (efter slumpdragningarna)
  if (c.owned) [score, total] = subRelease(G, c, plat.id, score, total);
  const enOf = (x) => (typeof x === 'string' ? x : x?.en || '');
  const taken = new Set(G.market.releases.map((x) => enOf(x.title)));
  for (const g of G.games) taken.add(enOf(g.title));
  const title = randomTitle(rnd2(G), topic.id, taken);
  const rel = {
    id: G.uid++, t: G.t, comp: c.id, studio: c.name, color: c.color, title, score, total,
    platform: plat.id, genre: genre.id, topic: topic.id, scope, yours: false, price: priceOf(year), tail: SALES_TAIL,
  };
  G.market.releases.push(rel);
  if (G.market.releases.length > 260) G.market.releases.shift();
  c.games++;
  c.best = Math.max(c.best, score);
  c.nextT = G.t + Math.round(rint(G, 36, 90) / (0.6 + strength * 0.6) / Math.min(1.8, 1 + (year - 1980) / 60));
  if (c.owned) c.nextT = subCadence(G, c, c.nextT);
  c.next = rollNext(G, yearOf(c.nextT));
  c.strength = clamp(c.strength + c.growth * (score >= mean ? 1 : 0.4) - 0.004, 0.45, 1.7);
  // krönikan: konkurrenternas allra största spel, högst ett per halvår så att krönikan mest handlar om din studio
  if (score >= 9 && G.t - (G.market.hitT ?? -1e9) >= 24) {
    G.market.hitT = G.t;
    note(G, 'news.rivalHit', { studio: c.name, title, v: score.toFixed(1) }, 'info', true);
  }
  emit('compRelease', rel);
  return rel;
}
// Konkurrentens nästa spel: tema och genre (som rykte i marknadsfönstret innan det släpps).
const COMP_GENRES = ['action', 'adventure', 'strategy', 'rpg', 'simulation', 'casual', 'shooter', 'racing'];
function rollNext(G, year) {
  const topicsAvail = TOPICS.filter((t) => t.start || RESEARCH.some((r) => (r.unlock.topics || []).includes(t.id) && r.year <= year + 1));
  const topic = pick(G, topicsAvail);
  const genre = weighted(G, GENRES.filter((g) => COMP_GENRES.includes(g.id)), (g) => 1 + topic.compat[GENRES.indexOf(g)] * 0.6);
  return { topic: topic.id, genre: genre.id };
}
// Väntat betyg för en konkurrents spel ett visst år.
export const compMean = (c, year) => 5.4 + (c.strength - 0.7) * 2.6 + Math.min(1, (year - 1980) / 40) * 0.3;

// Trängsel vid släpp: konkurrentspel i samma genre (eller tema) som släpptes upp till 8 veckor före, eller ska släppas
// upp till 8 veckor efter, tar en del av köparna. Starkare spel och närmare i tid tar mer. Inga alls = lugnt fönster.
// x = { genre, genre2, topic }, T = släppveckan. Ger { mult, rivals: [{ title?, studio, color, genre, topic, t, score, future, hit }] }.
export const CROWD_WEEKS = 8;
export const CROWD_QUIET = 1.05;
export function crowding(G, x, T = G.t) {
  const rivals = [];
  const add = (r, studio, color, score, t, future, title) => {
    const m = (r.genre === x.genre ? 1 : r.genre === x.genre2 ? 0.5 : 0) + (r.topic === x.topic ? 0.6 : 0);
    if (!m) return;
    const k = 1 - Math.abs(t - T) / (CROWD_WEEKS + 1);
    const hit = 0.09 * m * clamp((score - 4.5) / 3, 0.2, 1.4) * k;
    rivals.push({ title, studio, color, genre: r.genre, topic: r.topic, t, score, future, hit });
  };
  // dina dotterbolag (uppköpta konkurrenter) lägger sina släpp så att de inte krockar med dina
  const own = new Set((G.comps || []).filter((c) => c.owned).map((c) => c.id));
  for (const r of (G.market && G.market.releases) || []) if (r.t <= T && T - r.t <= CROWD_WEEKS && !own.has(r.comp)) add(r, r.studio, r.color, r.score, r.t, false, r.title);
  for (const c of upcomingReleases(G, T - G.t + CROWD_WEEKS)) {
    if (c.owned) continue;
    const w = releaseWeek(c);
    if (Math.abs(w - T) <= CROWD_WEEKS) add(c.next, c.name, c.color, compMean(c, yearOf(w)), w, true, null);
  }
  rivals.sort((a, b) => b.hit - a.hit);
  const sum = rivals.reduce((a, r) => a + r.hit, 0);
  return { mult: rivals.length ? clamp(1 - sum, 0.75, 1) : CROWD_QUIET, rivals };
}
// Konkurrenterna släpper vid månadsskiftet (monthlyMarket), första månadsskiftet från nextT.
export const releaseWeek = (c) => Math.ceil(c.nextT / WEEKS_PER_MONTH) * WEEKS_PER_MONTH;
// Kommande konkurrentsläpp (med känt rykte) inom 'weeks' veckor, närmast först.
export function upcomingReleases(G, weeks = 24) {
  return (G.comps || []).filter((c) => c.next && releaseWeek(c) > G.t && releaseWeek(c) - G.t <= weeks).sort((a, b) => a.nextT - b.nextT);
}
function rnd2(G) {
  return () => rnd(G);
}

export function monthlyMarket(G) {
  for (const c of G.comps) while (c.nextT <= G.t) releaseComp(G, c);
}

// Trender ses över varje halvår, men var och en lever 2–5 halvår (48–120 veckor), så att en trend du ser när du
// startar ett projekt oftast gäller när spelet släpps (då räknas försäljningen). Bara utgångna platser byts, mot id som
// inte redan är trendiga. until = veckan då trenden byts; gamla sparfiler saknar den och byts vid nästa halvår.
export const TREND_STEP = 24;
const TREND_MULT = { genre: [1.28, 1.14, 0.82], topic: [1.3, 1.15, 0.85] };
export function updateTrends(G) {
  const year = yearOf(G.t);
  const topicsAvail = TOPICS.filter((t) => t.start || RESEARCH.some((r) => (r.unlock.topics || []).includes(t.id) && r.year <= year));
  const prev = G.market.trend || {};
  const roll = (kind, pool) => {
    const keep = TREND_MULT[kind].map((_, i) => ((prev[kind] || [])[i]?.until > G.t ? prev[kind][i] : null));
    const used = new Set(keep.filter(Boolean).map((x) => x.id));
    const free = shuffle(G, pool.filter((id) => !used.has(id)));
    return TREND_MULT[kind].map((m, i) => keep[i] || {
      id: free.shift() || pool[0],
      mult: kind === 'topic' && i === 2 && !chance(G, 0.5) ? 1 : m,
      until: G.t + TREND_STEP * rint(G, 2, 5),
    });
  };
  G.market.trend = { genre: roll('genre', GENRES.map((g) => g.id)), topic: roll('topic', topicsAvail.map((t) => t.id)) };
  emit('trends', G.market.trend);
}
// Veckor kvar tills trenden byts (gamla sparfiler: nästa halvår).
export function trendWeeksLeft(G, x) {
  return (x.until ?? (Math.floor(G.t / TREND_STEP) + 1) * TREND_STEP) - G.t;
}

// Veckovis intäkt för en konkurrentrelease (för listor).
export function relWeekly(rel, now) {
  const w = now - rel.t;
  const curve = curveFor(rel.score, rel.tail || 1);
  return w >= 0 && w < curve.length ? rel.total * curve[w] : 0;
}
export function relUnitsTotal(rel, now) {
  const curve = curveFor(rel.score, rel.tail || 1);
  let s = 0;
  for (let w = 0; w <= Math.min(now - rel.t, curve.length - 1); w++) s += rel.total * curve[w];
  return s / rel.price;
}

// Topplista över de senaste veckorna: konkurrenter + dina spel.
export function topSellers(G, weeks = 12, limit = 10) {
  const now = G.t;
  const rows = [];
  for (const r of G.market.releases) {
    if (now - r.t > 80) continue;
    let rev = 0;
    for (let w = Math.max(0, now - r.t - weeks + 1); w <= now - r.t; w++) {
      const c = curveFor(r.score, r.tail || 1)[w];
      if (c) rev += r.total * c;
    }
    if (rev > 0) rows.push({ title: r.title, studio: r.studio, color: r.color, score: r.score, rev, units: rev / r.price, platform: r.platform, genre: r.genre, topic: r.topic, yours: false, id: r.id, mmo: !!r.mmo });
  }
  for (const g of G.games) {
    const w0 = Math.max(0, g.weekly.length - weeks);
    const rev = g.weekly.slice(w0).reduce((a, b) => a + b, 0);
    if (rev > 0) rows.push({ title: g.title, studio: G.studio, color: '#4de1d0', score: g.score, rev, units: rev / g.priceAt, platform: g.platform, genre: g.genre, topic: g.topic, yours: true, id: g.id, game: g, mmo: !!g.live });
  }
  rows.sort((a, b) => b.rev - a.rev);
  return rows.slice(0, limit);
}
