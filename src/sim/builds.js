// Flera bygge samtidigt: ordinarie teamet bygger spelarens projekt (G.job) medan självgående team (autoteam.js) bygger sina
// uppdrag (team.mission.J), ett nytt spel, en uppföljare eller en expansion. Alla räknas som vanliga spelprojekt med egen
// förväntan, eget Snack (hype.js) och eget släpp. Här finns den gemensamma vyn över dem och loggen över vad som hänt med varje
// bygge under byggtiden (kampanjer, mässan, faser, milstolpar). Ingen slump, bara läsning och logg: simmen ändras inte av den.
import { TICKS_PER_WEEK } from './const.js';
import { teamsOf, teamName } from './teams.js';
import { hypeDrift } from './hype.js';

export const LOG_MAX = 14;

// Alla spelbygge som pågår: [{ key, J, team }]. key 'p' är spelarens, 't<id>' ett teams uppdrag. Spelarens projekt ligger först.
export function buildsOf(G) {
  const out = [];
  if (G.job && G.job.kind === 'game') out.push({ key: 'p', J: G.job, team: null });
  for (const team of teamsOf(G)) {
    const J = team.mission && team.mission.J;
    if (J && J.kind === 'game') out.push({ key: 't' + team.id, J, team });
  }
  return out;
}
export const buildOf = (G, key) => buildsOf(G).find((b) => b.key === key) || null;
// Bygget som hör till ett projekt-id (J.id)
export const buildById = (G, id) => buildsOf(G).find((b) => b.J.id === id) || null;

export const buildKind = (J) => (J.expansionOf ? 'expansion' : J.sequelOf ? 'sequel' : J.live ? 'live' : 'new');
export const buildWho = (b) => (b.team ? teamName(b.team) : null);
// Hur långt bygget kommit, 0 till 1 (utveckling 85 procent, finputsen resten), och veckor kvar
export function buildPct(J) {
  const dev = Math.min(1, J.ticks / Math.max(1, J.devTicks));
  return J.phase >= 3 ? 0.85 + 0.15 * Math.min(1, J.polishDone / Math.max(1, J.polishTicks)) : 0.85 * dev;
}
export const buildWeeksLeft = (J) => Math.max(1, Math.ceil((J.devTicks + J.polishTicks - J.ticks - J.polishDone) / TICKS_PER_WEEK));

// Det som visas om ett bygge i en ruta eller en scen
export function buildInfo(G, b) {
  const J = b.J;
  return {
    key: b.key, id: J.id, title: J.title, kind: buildKind(J), team: b.team ? { id: b.team.id, name: teamName(b.team) } : null,
    state: J.state, phase: J.phase, pct: buildPct(J), weeks: buildWeeksLeft(J), hype: Math.round(J.hype || 0), drift: hypeDrift(G, J),
    bugs: Math.round(J.bugs), crew: b.team ? (J.crew || []).length : J.team || 0, dir: J.dir || null,
  };
}

// Loggen per bygge: { t (spelets tid), k (sort), a, v } med de senaste LOG_MAX. Sorter: start, phase (a = fas 1-3), camp (a = kampanjens id),
// demo (v 0 demon visades, 1 kraschade, 2 smygsläpp slog, 3 floppade), stage (v 0-2 publikens reaktion), press (a = pressens dom 0-4,
// v = antal priser), hype1/hype2 (milstolpar), event (a = ändring av förväntan), crunch (v 1 på, 0 av).
export function logBuild(G, J, k, a, v) {
  if (!J) return;
  const L = J.log || (J.log = []);
  L.push({ t: G.t, k, a: a ?? 0, v: v ?? 0 });
  if (L.length > LOG_MAX) L.shift();
}
