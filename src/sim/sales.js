import { clamp } from '../core/util.js';
import { gauss } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { PLATFORM, PLATFORMS, potential, platTier } from '../data/platforms.js';
import { SCOPES, AUD, yearOf, yfOf, priceOf } from './const.js';
import { SALES_TAIL } from './tempo.js';
import { DIFFICULTY } from './state.js';
import { earn } from './studio.js';
import { platFit } from './score.js';

// Försäljning per enhet och år. Bas och årlig tillväxt är de två reglagen för hur snabbt kassan växer.
export const UNIT_REV_BASE = 400;
export const UNIT_REV_GROWTH = 1.04;
export const unitRev = (year) => UNIT_REV_BASE * Math.pow(UNIT_REV_GROWTH, year - 1980);

export function trendMult(G, topic, genre) {
  const tr = G.market.trend;
  const g = tr.genre.find((x) => x.id === genre);
  const t = tr.topic.find((x) => x.id === topic);
  return (g ? g.mult : 1) * (t ? t.mult : 1);
}

// Fördelning över veckor efter lansering.
const curveCache = new Map();
export function curveFor(score, tail = 1) {
  const key = Math.round(score * 2) + ':' + tail;
  if (curveCache.has(key)) return curveCache.get(key);
  const tau = (4.5 + score * 1.15) * tail;
  const N = Math.ceil(96 * tail);
  const fast = [];
  const slow = [];
  let sf = 0;
  let ss = 0;
  for (let w = 0; w < N; w++) {
    const f = (1 - Math.exp(-(w + 1) / (1.3 * Math.sqrt(tail)))) * Math.exp(-w / tau);
    const s = Math.exp(-w / (34 * tail));
    fast.push(f);
    slow.push(s);
    sf += f;
    ss += s;
  }
  const arr = fast.map((f, i) => (0.9 * f) / sf + (0.1 * slow[i]) / ss);
  curveCache.set(key, arr);
  return arr;
}

export function forecast(G, game, opts = {}) {
  const yf = yfOf(game.t);
  const plat = PLATFORM[game.platform];
  const pot = Math.max(0.4, potential(plat, yf));
  const scoreMult = Math.exp(0.62 * (game.score - 6.5));
  const scope = SCOPES[game.scope].rev;
  const hype = 1 + (clamp(game.hype, 0, 100) / 100) * 1.25;
  const fans = 1 + Math.log10(1 + (opts.fans ?? G.fans) / 150) * 0.55;
  const trend = trendMult(G, game.topic, game.genre);
  const aud = AUD[game.audience].reach;
  const pf = clamp(Math.pow(platFit(game.platform, game.genre, game.genre2), 0.7), 0.7, 1.4);
  const seq = game.chain >= 2 ? 1.08 : 1;
  const bugs = 1 - Math.min(0.3, (game.parts?.bugRatio ?? 0) * 0.12);
  const mult = (game.salesMult ?? 1) * (opts.crowd ?? game.crowd ?? 1);
  // Äldre hårdvarugenerationer säljer sämre när nyare finns.
  const year = yearOf(game.t);
  let best = 1;
  for (const p of PLATFORMS) if (potential(p, yf) > 12) best = Math.max(best, platTier(p, year));
  const appeal = Math.pow(0.82, Math.max(0, best - platTier(plat, year)));
  const noise = opts.noise === false ? 1 : clamp(gauss(G, 1, 0.1), 0.78, 1.25);
  const diff = DIFFICULTY[G.difficulty].sales;
  return unitRev(yearOf(game.t)) * pot * scoreMult * scope * hype * fans * trend * aud * pf * seq * bugs * appeal * mult * noise * diff;
}

export function startSales(G, game) {
  game.salesMult = (G.flags.salesQ || []).reduce((a, b) => a * b, 1);
  G.flags.salesQ = [];
  game.total = forecast(G, game);
  game.priceAt = priceOf(yearOf(game.t));
  game.tail = SALES_TAIL;
}

// Veckovis: intäkter för alla spel på marknaden.
export function salesWeek(G) {
  let weekRev = 0;
  for (const g of G.games) {
    if (g.ended) continue;
    const w = G.t - g.t - 1;
    const curve = curveFor(g.score, g.tail || 1);
    if (w >= curve.length) {
      g.ended = true;
      continue;
    }
    let rev = g.total * curve[w];
    if (g.patched) rev *= 1 + (g.patchBoost ?? 0.12);
    g.weekly.push(rev);
    g.revenue += rev;
    weekRev += rev;
    const units = rev / g.priceAt;
    g.units += units;
    earn(G, rev, 'sales');
    G.stats.revenue += rev;
    const df = units * (g.score - 5.2) * 0.012;
    const dfans = df < 0 ? Math.max(df, -G.fans * 0.01) : df;
    G.fans = Math.max(0, G.fans + dfans);
    g.fansGained += dfans;
    if (w === 0) emit('sales', { game: g, rev });
    if (w > 14 && rev < g.total * 0.0012) g.ended = true;
  }
  if (weekRev > 0) emit('revenue', { amount: weekRev });
}

export function patchCost(G, g) {
  return Math.round(g.total * 0.012 + 800);
}
