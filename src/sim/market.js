import { clamp } from '../core/util.js';
import { rnd, rint, gauss, pick, chance, weighted, shuffle } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { COMPETITORS, TITLE_PARTS } from '../data/names.js';
import { TOPICS } from '../data/topics.js';
import { GENRES } from '../data/genres.js';
import { PLATFORMS, potential } from '../data/platforms.js';
import { SCOPES, yearOf, yfOf, priceOf } from './const.js';
import { unitRev, curveFor } from './sales.js';
import { RESEARCH } from '../data/research.js';

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

// Slumpad speltitel på båda språken.
export function randomTitle(rng) {
  const P = TITLE_PARTS;
  const r = (n) => Math.floor(rng() * n);
  const a = r(P.adj.en.length);
  const n = r(P.noun.en.length);
  const form = r(4);
  const sfx = r(P.suffix.en.length);
  const out = {};
  for (const l of ['sv', 'en']) {
    const adj = P.adj[l][a];
    const noun = P.noun[l][n];
    if (form === 0) out[l] = `${adj} ${noun}`;
    else if (form === 1) out[l] = l === 'sv' ? `${noun}s ${P.adj[l][a].toLowerCase()} hemlighet` : `${noun} of the ${adj}`;
    else if (form === 2) out[l] = `${adj} ${noun} ${P.suffix[l][sfx]}`;
    else out[l] = l === 'sv' ? `${noun}: ${adj} ${P.noun.sv[(n + 3) % P.noun.sv.length]}` : `${noun}: ${adj} ${P.noun.en[(n + 3) % P.noun.en.length]}`;
  }
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
  const topicsAvail = TOPICS.filter((t) => t.start || RESEARCH.some((r) => (r.unlock.topics || []).includes(t.id) && r.year <= year + 1));
  const topic = pick(G, topicsAvail);
  const genre = weighted(G, GENRES.filter((g) => ['action', 'adventure', 'strategy', 'rpg', 'simulation', 'casual', 'shooter', 'racing'].includes(g.id)), (g) => 1 + topic.compat[GENRES.indexOf(g)] * 0.6);
  const strength = c.strength;
  const mean = 5.4 + (strength - 0.7) * 2.6 + Math.min(1, (year - 1980) / 40) * 0.3;
  const score = clamp(Math.round(gauss(G, mean, 1.15) * 10) / 10, 1.8, 9.7);
  const scope = compScope(G, year, strength);
  const total = unitRev(year) * Math.max(0.4, potential(plat, yf)) * Math.exp(0.62 * (score - 6.5)) * SCOPES[scope].rev * (0.6 + strength * 0.5) * (1 + (c.games > 3 ? 0.2 : 0)) * clamp(gauss(G, 1, 0.2), 0.6, 1.5) * 0.85;
  const title = randomTitle(rnd2(G));
  const rel = {
    id: G.uid++, t: G.t, comp: c.id, studio: c.name, color: c.color, title, score, total,
    platform: plat.id, genre: genre.id, topic: topic.id, scope, yours: false, price: priceOf(year),
  };
  G.market.releases.push(rel);
  if (G.market.releases.length > 260) G.market.releases.shift();
  c.games++;
  c.best = Math.max(c.best, score);
  c.nextT = G.t + Math.round(rint(G, 36, 90) / (0.6 + strength * 0.6) / Math.min(1.8, 1 + (year - 1980) / 60));
  c.strength = clamp(c.strength + c.growth * (score >= mean ? 1 : 0.4) - 0.004, 0.45, 1.7);
  emit('compRelease', rel);
  return rel;
}
function rnd2(G) {
  return () => rnd(G);
}

export function monthlyMarket(G) {
  for (const c of G.comps) while (c.nextT <= G.t) releaseComp(G, c);
}

// Trender uppdateras varje halvår.
export function updateTrends(G) {
  const year = yearOf(G.t);
  const genres = shuffle(G, GENRES.map((g) => g.id));
  const topicsAvail = TOPICS.filter((t) => t.start || RESEARCH.some((r) => (r.unlock.topics || []).includes(t.id) && r.year <= year));
  const topics = shuffle(G, topicsAvail.map((t) => t.id));
  G.market.trend = {
    genre: [{ id: genres[0], mult: 1.28 }, { id: genres[1], mult: 1.14 }, { id: genres[2], mult: 0.82 }],
    topic: [{ id: topics[0], mult: 1.3 }, { id: topics[1], mult: 1.15 }, { id: topics[2] || topics[0], mult: chance(G, 0.5) ? 0.85 : 1 }],
  };
  emit('trends', G.market.trend);
}

// Veckovis intäkt för en konkurrentrelease (för listor).
export function relWeekly(rel, now) {
  const w = now - rel.t;
  const curve = curveFor(rel.score);
  return w >= 0 && w < curve.length ? rel.total * curve[w] : 0;
}
export function relUnitsTotal(rel, now) {
  const curve = curveFor(rel.score);
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
      const c = curveFor(r.score)[w];
      if (c) rev += r.total * c;
    }
    if (rev > 0) rows.push({ title: r.title, studio: r.studio, color: r.color, score: r.score, rev, units: rev / r.price, platform: r.platform, genre: r.genre, topic: r.topic, yours: false, id: r.id });
  }
  for (const g of G.games) {
    const w0 = Math.max(0, g.weekly.length - weeks);
    const rev = g.weekly.slice(w0).reduce((a, b) => a + b, 0);
    if (rev > 0) rows.push({ title: g.title, studio: G.studio, color: '#4de1d0', score: g.score, rev, units: rev / g.priceAt, platform: g.platform, genre: g.genre, topic: g.topic, yours: true, id: g.id, game: g });
  }
  rows.sort((a, b) => b.rev - a.rev);
  return rows.slice(0, limit);
}
