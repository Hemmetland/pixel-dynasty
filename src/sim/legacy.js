// Studions eftermäle när de fyrtio åren är slut: poäng (0–100) av total omsättning, priser, bästa betyg, fans och kontor.
// Rangen avgör titeln på slutskärmen (end.rank0–3).
import { clamp } from '../core/util.js';

// Gränser för Kultstudio, Branschnamn, Spelgigant och Dynasti. En stark studio landar kring 80–90, Dynasti kräver toppspel.
export const LEGACY_RANKS = [0, 50, 75, 90];

export function legacy(G) {
  const parts = {
    revenue: clamp(12 * Math.log10(Math.max(1, G.stats.revenue) / 1e6), 0, 36),
    awards: clamp(0.25 * G.awards.length, 0, 20),
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
