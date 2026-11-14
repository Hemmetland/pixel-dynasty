// Studions eftermäle när de fyrtio åren är slut: poäng (0–100) av total omsättning, priser, bästa betyg, fans och kontor.
// Rangen avgör titeln på slutskärmen (end.rank0–3).
import { clamp } from '../core/util.js';
import { yearOf } from './const.js';

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
    best: best ? { title: best.title, score: best.score } : null,
  };
}
// Hallens ordning: högst eftermäle först, sedan störst omsättning. En konkursad studio står efter dem som klarade sig.
export function hallSort(list) {
  return list.slice().sort((a, b) => (a.over ? 1 : 0) - (b.over ? 1 : 0) || b.points - a.points || b.revenue - a.revenue);
}
