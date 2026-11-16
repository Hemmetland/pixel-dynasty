// Prestationer och statistik: studions historiebok. Allt här läser bara spelet (spel, priser, rankning, prestationer) och ger siffror, rekord,
// årtionden och bakgrundsuppgifter till fönstret Prestationer och statistik. Det enda som sparas är G.achT (veckan varje prestation klarades)
// och G.book (försäljning per år, toppvärden, förra månadens rekord), och ingenting av det påverkar spelet: inga pengar, inga slumptal
// (aldrig G.rng) och inga nya val. bookMonth körs en gång i månaden och ger scenerna händelser (nytt årtionde, nytt rekord, ny pokal).
import { yearOf, START_YEAR } from './const.js';
import { totalUnits, certCounts } from './charts.js';
import { certIndex } from '../data/certs.js';
import { PLATFORMS, launchTime } from '../data/platforms.js';
import { fullGames, decadeOf, ACHIEVEMENTS } from '../data/achievements.js';
import { note } from './news.js';
import { beat } from './life.js';

export { decadeOf, fullGames };
export const DECADES = [1980, 1990, 2000, 2010, 2020];
export const gameYear = (g) => yearOf(g.t);
const seriesLen = (G, g) => {
  let n = 1;
  for (let x = g; x.sequelOf && n < 50; n++) {
    x = G.games.find((y) => y.id === x.sequelOf);
    if (!x) break;
  }
  return n;
};

// Studions bok (G.book): skapas första gången den behövs, och fylls i efter hand ur kassahistoriken (som bara sparar tjugo år)
export function bookOf(G) {
  if (G.book) return G.book;
  const B = (G.book = { dec: decadeOf(yearOf(G.t)), rec: null, awards: G.awards.length, yr: {}, hT: -1, peakFans: G.fans || 0, peakCash: G.money || 0 });
  for (const h of G.hist.revenue) {
    const y = yearOf(h.t);
    B.yr[y] = (B.yr[y] || 0) + h.v;
    B.hT = Math.max(B.hT, h.t);
  }
  for (const h of G.hist.fans) B.peakFans = Math.max(B.peakFans, h.v);
  for (const h of G.hist.cash) B.peakCash = Math.max(B.peakCash, h.v);
  return B;
}

// Siffror för hela studiotiden
export function lifeStats(G) {
  const full = fullGames(G);
  const cc = certCounts(G);
  return {
    years: Math.max(0, yearOf(G.t) - START_YEAR),
    since: START_YEAR,
    games: full.length,
    expansions: G.games.length - full.length,
    units: G.games.reduce((a, g) => a + totalUnits(g), 0),
    revenue: G.stats.revenue || 0,
    hits: G.stats.hits || 0,
    avg: full.length ? full.reduce((a, g) => a + g.score, 0) / full.length : 0,
    best: G.stats.bestScore || 0,
    awards: G.awards.length,
    galas: new Set(G.awards.map((a) => a.year)).size,
    discs: cc.reduce((a, n) => a + n, 0),
    no1: G.stats.no1 || 0,
    topYears: (G.ranks || []).filter((r) => r.pos === 1).length,
    bestRank: G.stats.bestRank || 0,
    fans: G.fans || 0,
    staff: G.staff.length,
    teams: (G.teams || []).length,
    research: G.research.done.length,
    contracts: G.stats.contracts || 0,
    live: G.games.filter((g) => g.live).length,
    trophies: G.ach.length,
  };
}

// En rad per år: försäljning (ur boken), spel som kom ut, bästa betyg, plats i branschen och priser
export function yearRows(G) {
  const B = bookOf(G);
  const y1 = yearOf(G.t);
  const rows = [];
  for (let y = START_YEAR; y <= y1; y++) {
    const gs = fullGames(G).filter((g) => gameYear(g) === y);
    const rk = (G.ranks || []).find((r) => r.y === y);
    rows.push({ y, sales: B.yr[y] || 0, games: gs.length, best: gs.reduce((a, g) => Math.max(a, g.score), 0), pos: rk ? rk.pos : 0, awards: G.awards.filter((a) => a.year === y).length });
  }
  return rows;
}

// De årtionden studion har varit med om (hela, eller så långt det kommit)
export const decadesOf = (G) => DECADES.filter((d) => d <= decadeOf(yearOf(G.t)));

// Ett årtionde i boken
export function decadeBook(G, dec) {
  const to = dec + 9;
  const games = fullGames(G).filter((g) => gameYear(g) >= dec && gameYear(g) <= to);
  const top = (f) => games.reduce((b, g) => (f(g) > (b ? f(b) : -1) ? g : b), null);
  const ranks = (G.ranks || []).filter((r) => r.y >= dec && r.y <= to);
  const rows = yearRows(G).filter((r) => r.y >= dec && r.y <= to);
  return {
    dec,
    to,
    over: yearOf(G.t) > to,
    n: games.length,
    games,
    best: top((g) => g.score),
    seller: top((g) => totalUnits(g)),
    units: games.reduce((a, g) => a + totalUnits(g), 0),
    sales: rows.reduce((a, r) => a + r.sales, 0),
    awards: G.awards.filter((a) => a.year >= dec && a.year <= to).length,
    bestRank: ranks.length ? Math.min(...ranks.map((r) => r.pos)) : 0,
    topYears: ranks.filter((r) => r.pos === 1).length,
    discs: games.filter((g) => certIndex(totalUnits(g)) >= 0).length,
    platforms: PLATFORMS.filter((p) => !p.own && p.id !== 'pc' && Math.floor(launchTime(p)) >= dec && Math.floor(launchTime(p)) <= to && Math.floor(launchTime(p)) <= yearOf(G.t)).map((p) => p.id),
    trophies: ACHIEVEMENTS.filter((a) => G.achT && G.achT[a.id] != null && decadeOf(yearOf(G.achT[a.id])) === dec).map((a) => a.id),
    years: rows,
  };
}

// Prestationer med datum, nyast först, och de utan datum (en sparning från före datumen)
export function trophyLog(G) {
  const T = G.achT || {};
  return ACHIEVEMENTS.filter((a) => G.ach.includes(a.id))
    .map((a) => ({ id: a.id, t: T[a.id] == null ? -1 : T[a.id] }))
    .sort((a, b) => b.t - a.t);
}

// Rekord: id, spelet (eller null), värdet och året
export function studioRecords(G) {
  const B = bookOf(G);
  const full = fullGames(G);
  const by = (f) => full.reduce((b, g) => (f(g) > (b ? f(b) : 0) ? g : b), null);
  const out = [];
  const add = (id, g, v, y) => {
    if (v > 0) out.push({ id, g, v, y: y || (g ? gameYear(g) : 0) });
  };
  const sc = by((g) => g.score);
  add('score', sc, sc ? sc.score : 0);
  const un = by((g) => totalUnits(g));
  add('units', un, un ? totalUnits(un) : 0);
  const rv = by((g) => g.revenue);
  add('revenue', rv, rv ? rv.revenue : 0);
  const wk = by((g) => (g.weekly && g.weekly[0]) || 0);
  add('week', wk, wk ? wk.weekly[0] : 0);
  const tp = by((g) => (g.chart && g.chart.top) || 0);
  add('top', tp, tp ? tp.chart.top : 0);
  const yr = yearRows(G).reduce((b, r) => (r.sales > (b ? b.sales : 0) ? r : b), null);
  add('year', null, yr ? yr.sales : 0, yr ? yr.y : 0);
  const ls = by((g) => (g.live ? g.live.peak : 0));
  add('live', ls, ls ? ls.live.peak : 0);
  const sr = full.reduce((b, g) => (seriesLen(G, g) > (b ? seriesLen(G, b) : 1) ? g : b), null);
  add('series', sr, sr ? seriesLen(G, sr) : 0);
  add('fans', null, Math.max(B.peakFans, G.fans || 0), 0);
  add('cash', null, Math.max(B.peakCash, G.money || 0), 0);
  return out;
}

// Spelen uppdelade på genre, plattform, tema eller storlek: antal, snittbetyg, intäkter, sålda exemplar och bästa spel (störst intäkter först)
const KEY = { genre: (g) => g.genre, platform: (g) => g.platform, topic: (g) => g.topic, scope: (g) => g.scope };
export function breakdown(G, key) {
  const f = KEY[key];
  const m = new Map();
  for (const g of fullGames(G)) {
    const id = f(g);
    const r = m.get(id) || { id, n: 0, score: 0, rev: 0, units: 0, best: null };
    r.n++;
    r.score += g.score;
    r.rev += g.revenue || 0;
    r.units += totalUnits(g);
    if (!r.best || g.score > r.best.score) r.best = g;
    m.set(id, r);
  }
  return [...m.values()].map((r) => ({ ...r, avg: r.score / r.n })).sort((a, b) => b.rev - a.rev || b.n - a.n || (a.id < b.id ? -1 : 1));
}

// Årtiondets troféer: årtiondets spel (bäst betyg) och årtiondets storsäljare, för varje årtionde med minst ett spel
export function decadeTrophies(G) {
  return decadesOf(G)
    .map((d) => decadeBook(G, d))
    .filter((b) => b.n > 0)
    .map((b) => ({ dec: b.dec, over: b.over, best: b.best, seller: b.seller }));
}

// Mätvärdena för rekordhändelserna (betyg, sålda exemplar, första veckan, veckor som etta)
const REC_KINDS = ['score', 'units', 'week', 'top'];
const recOf = (g, k) => (k === 'score' ? g.score : k === 'units' ? totalUnits(g) : k === 'week' ? (g.weekly && g.weekly[0]) || 0 : (g.chart && g.chart.top) || 0);
const recVals = (G) => Object.fromEntries(REC_KINDS.map((k) => [k, fullGames(G).reduce((a, g) => Math.max(a, recOf(g, k)), 0)]));

// Varje månad: ny försäljning in i boken, toppvärden, nytt årtionde, nya rekord och nya pokaler (nyheter och scenhändelser, ingenting annat)
export function bookMonth(G) {
  const B = bookOf(G);
  const last = G.hist.revenue[G.hist.revenue.length - 1];
  if (last && last.t > B.hT) {
    const y = yearOf(last.t);
    B.yr[y] = (B.yr[y] || 0) + last.v;
    B.hT = last.t;
  }
  B.peakFans = Math.max(B.peakFans, G.fans || 0);
  B.peakCash = Math.max(B.peakCash, G.money || 0);
  const dec = decadeOf(yearOf(G.t));
  if (dec > B.dec) {
    B.dec = dec;
    note(G, 'book.news.decade', { y: dec }, 'info', true);
    beat(G, 'hallEra', { g: String(dec), a: dec });
  }
  const r = recVals(G);
  if (!B.rec) B.rec = r;
  else {
    REC_KINDS.forEach((k, i) => {
      if (r[k] > B.rec[k]) {
        if (B.rec[k] > 0) {
          const holder = fullGames(G).reduce((b, g) => (recOf(g, k) > (b ? recOf(b, k) : -1) ? g : b), null);
          beat(G, 'hallRecord', { g: holder ? holder.title : '', a: Math.round(r[k]), v: i });
        }
        B.rec[k] = r[k];
      }
    });
  }
  if (G.awards.length > B.awards) {
    for (const a of G.awards.slice(B.awards)) beat(G, 'hallAward', { g: a.title, a: a.year });
    B.awards = G.awards.length;
  }
}
