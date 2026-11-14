// Studions eftermäle när de fyrtio åren är slut: poäng (0–100) av total omsättning, priser, bästa betyg, fans och kontor.
// Rangen avgör titeln på slutskärmen (end.rank0–3).
import { clamp } from '../core/util.js';
import { yearOf } from './const.js';
import { note } from './news.js';
import { identityName } from '../data/identity.js';

// Gränser för Kultstudio, Branschnamn, Spelgigant och Dynasti. En stark studio landar kring 80–90, Dynasti kräver toppspel.
export const LEGACY_RANKS = [0, 50, 75, 90];

export function legacy(G) {
  const parts = {
    revenue: clamp(12 * Math.log10(Math.max(1, G.stats.revenue) / 1e6), 0, 36),
    awards: clamp(0.35 * G.awards.length, 0, 20),
    best: clamp(5 * (G.stats.bestScore - 6), 0, 20),
    fans: clamp(4 * Math.log10(Math.max(1, G.fans) / 1000), 0, 16),
    office: 2 * G.office.tier,
  };
  for (const k of Object.keys(parts)) parts[k] = Math.round(parts[k]);
  const points = Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0));
  let rank = 0;
  for (let i = 0; i < LEGACY_RANKS.length; i++) if (points >= LEGACY_RANKS[i]) rank = i;
  return { points, parts, rank };
}

// Studions rykte av spelen: först när det finns sex spel. Ordningen avgör när flera passar: onlinespel, blockbusters,
// hits, en genre som är minst 40 % av spelen, indie (små och medelstora spel med bra betyg), bredd, annars pålitlig.
export const IDENT_MIN = 6;
export function identity(G) {
  const gs = G.games.filter((g) => !g.expansionOf);
  const n = gs.length;
  if (n < IDENT_MIN) return null;
  if (gs.filter((g) => g.live).length >= 2) return { id: 'online' };
  if (gs.filter((g) => g.scope === 'aaa').length >= 3) return { id: 'blockbuster' };
  const hits = gs.filter((g) => g.score >= 8).length;
  if (hits >= 6 && hits / n >= 0.5) return { id: 'hits' };
  const by = {};
  for (const g of gs) by[g.genre] = (by[g.genre] || 0) + 1;
  const [top, cnt] = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  if (cnt >= 4 && cnt / n >= 0.4) return { id: 'genre', genre: top };
  const avg = gs.reduce((a, g) => a + g.score, 0) / n;
  if (n >= 8 && avg >= 7 && gs.every((g) => g.scope === 'small' || g.scope === 'medium')) return { id: 'indie' };
  if (Object.values(by).filter((c) => c >= 2).length >= 5) return { id: 'allround' };
  return { id: 'steady' };
}
// Varje månad: när rykte byts (tidigast två år efter förra gången) skrivs en nyhet, som också hamnar i historien
export function identityWatch(G) {
  const idn = identity(G);
  if (!idn) return;
  const key = idn.id + (idn.genre ? ':' + idn.genre : '');
  if (G.flags.ident === key) return;
  if (G.flags.ident && G.t - (G.flags.identT || 0) < 96) return;
  G.flags.ident = key;
  G.flags.identT = G.t;
  note(G, 'news.identity', { label: identityName(idn) }, 'info');
}

// Grundarens bakgrunder: de fyra första finns från start, de tre andra låses upp av en tidigare studio i studiohallen.
// k = fältet på hallens rad, n = värdet som minst en studio ska ha nått.
export const FOUNDERS = ['designer', 'coder', 'visionary', 'hustler', 'influencer', 'veteran', 'tycoon'];
export const FOUNDER_UNLOCK = {
  influencer: { k: 'awards', n: 1 },
  veteran: { k: 'points', n: 50 },
  tycoon: { k: 'points', n: 75 },
};
export const founderUnlocked = (hall, id) => !FOUNDER_UNLOCK[id] || hall.some((e) => e[FOUNDER_UNLOCK[id].k] >= FOUNDER_UNLOCK[id].n);
// Bakgrunder som en ny rad i hallen låser upp för första gången
export const founderNew = (before, after) => FOUNDERS.filter((id) => !founderUnlocked(before, id) && founderUnlocked(after, id));

// Studions rad i studiohallen (sparas utanför sparfilen, så att tidigare studior finns kvar när en ny börjar): namn,
// år, eftermäle och det bästa spelet. id skiljer studiorna åt, så en studio som spelar vidare uppdaterar sin egen rad.
export function hallEntry(G) {
  const lg = legacy(G);
  const best = G.games.slice().sort((a, b) => b.score - a.score || a.t - b.t)[0];
  return {
    id: G.seed + ':' + G.studio,
    studio: G.studio,
    year: yearOf(G.over ? G.over.t : G.t),
    over: !!G.over,
    diff: G.difficulty,
    weekly: G.weekly || null,
    points: lg.points,
    rank: lg.rank,
    revenue: Math.round(G.stats.revenue),
    fans: Math.round(G.fans),
    games: G.games.filter((g) => !g.expansionOf).length,
    awards: G.awards.length,
    ident: identity(G),
    best: best ? { title: best.title, score: best.score } : null,
  };
}
// Hallens ordning: högst eftermäle först, sedan störst omsättning. En konkursad studio står efter dem som klarade sig.
export function hallSort(list) {
  return list.slice().sort((a, b) => (a.over ? 1 : 0) - (b.over ? 1 : 0) || b.points - a.points || b.revenue - a.revenue);
}
