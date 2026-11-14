import { hashStr, seeded } from '../core/rng.js';
import { yearOf } from './const.js';
import { note } from './news.js';
import { GENRE } from '../data/genres.js';
import { HEADLINES } from '../data/headlines.js';

// Branschnyheter: varje månad är det en chans att en rubrik dyker upp, högst en var åttonde vecka, och samma rubrik
// kommer inte igen på två år. Bara uppvisning: slumpen kommer ur fröet och veckan (aldrig G.rng) och inget i spelet läser
// nyheterna, så pengar, fans och försäljning påverkas inte.
export const HL_CHANCE = 0.3;
export const HL_GAP = 8;
export const HL_REPEAT = 96;

// Vad som finns att prata om just nu (för headlines.need)
function ctxOf(G) {
  const rivals = (G.comps || []).filter((c) => !c.owned);
  const hot = G.market && G.market.trend && G.market.trend.genre && G.market.trend.genre[0];
  const recent = G.games.filter((g) => !g.expansionOf && G.t - g.t <= 26 && g.score >= 7.5).slice(-1)[0];
  return { rivals, hot: hot && GENRE[hot.id] ? GENRE[hot.id] : null, recent: recent || null };
}
export function headlinesNow(G) {
  const year = yearOf(G.t);
  const c = ctxOf(G);
  const has = { '': true, rival: c.rivals.length > 0, trend: !!c.hot, game: !!c.recent, fans: G.fans >= 500 };
  const used = (G.flags.hl || {});
  return HEADLINES.filter((h) => year >= h.from && year <= h.to && has[h.need] && !(used[h.id] != null && G.t - used[h.id] < HL_REPEAT));
}

export function headlineWatch(G) {
  const rng = seeded(hashStr(`${G.seed || 0}:hl:${G.t}`));
  if (rng() > HL_CHANCE || G.t - (G.flags.hlT ?? -999) < HL_GAP) return false;
  const pool = headlinesNow(G);
  if (!pool.length) return false;
  const h = pool[Math.floor(rng() * pool.length)];
  const c = ctxOf(G);
  const rival = c.rivals.length ? c.rivals[Math.floor(rng() * c.rivals.length)] : null;
  const vars = { studio: G.studio };
  if (rival) vars.rival = rival.name;
  if (c.hot) vars.genre = c.hot.name;
  if (c.recent) vars.title = c.recent.title;
  (G.flags.hl || (G.flags.hl = {}))[h.id] = G.t;
  G.flags.hlT = G.t;
  note(G, 'hl.' + h.id, vars, 'info');
  return true;
}
