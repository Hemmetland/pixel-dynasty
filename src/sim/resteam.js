// Forskningsteam: ett team som forskar på heltid (forskningen Forskningsteam). Medarbetarna sitter i labbet (s.away och s.out) och
// arbetar inte med dina projekt. Teamet har en inriktning (team.target):
//  - 'tech' (Ny teknik): alla studions spel får mer teknik (techLead i studio.js, G.resTech) och forskningspoängen växer. Teamet ger
//    upp till RES_RP gånger mer poäng än samma personer gav vid sina skrivbord.
//  - 'recipe' (Recept): studions receptkunskap (G.rcp) växer, ett steg (receptnivå, 1 till 10) var RCP_LEVEL_PTS veckor med full effekt.
//    Receptkunskapen är bara kunskap om vad som passar ihop: idealfördelning av fokus för alla genrer (nivå 1), matchning för alla
//    teman och genrer (2) och för genreblandningar (3), och självgående team väljer allt bättre recept (4 till 10). Dessutom lär den
//    ut genrerna till hela studion (rutin i alla genrer, se recipeKnow i score.js). Den lyfter inte betyget av sig själv: betyget
//    kräver också ett team som kan sitt hantverk (se scoreLegs i score.js).
// Teamets effekt (0–1) räknas som hos driftteamen: hur många de är mot vad uppgiften kräver, hur skickliga de är, arbetsledaren och
// rutinen. Allt är deterministiskt: teamet drar inget ur G.rng, så spel utan forskningsteam har samma slumpföljd som förut.
import { clamp } from '../core/util.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { skillCap } from './people.js';
import { TICKS_PER_WEEK } from './const.js';
import { labMult } from './studio.js';
import { RP_RATE } from './research.js';
import { recipeLevel, RCP_MAX, RCP_LEVEL_PTS } from './score.js';
import { teamsOf, teamById, teamName, membersOf, leadOf, bestLead, leadScore, endRole, setOut, seatFree } from './teams.js';
import { RUTIN_WEEKS, RUTIN_MAX, OPS_MIN } from './opsteam.js';

export const RES_FOCUS = ['tech', 'recipe'];
export const RES_NEED = { tech: 3, recipe: 4 }; // personer för full effekt
export const RES_RP = 0.8; // teknikteamet ger så här mycket mer forskningspoäng än samma personer vid skrivborden (vid full effekt)

export const resOpen = (G) => !!G.u.flags.resTeams;
export const resTeamOf = (G, focus) => teamsOf(G).find((x) => x.role === 'res' && x.target === focus) || null;
export const resRutin = (team) => Math.min(RUTIN_MAX, Math.floor((team.resW || 0) / RUTIN_WEEKS));

export function resQuality(G, team) {
  const mem = membersOf(G, team);
  if (!mem.length) return 0;
  const cap = skillCap(G);
  const avg = mem.reduce((a, s) => a + 0.6 * s.research + 0.2 * s.design + 0.2 * s.tech, 0) / mem.length / cap;
  const lead = leadOf(G, team);
  const lb = lead ? 0.12 * Math.min(1, leadScore(lead) / (4 * cap)) : 0;
  return 0.55 + 0.35 * Math.min(1, avg) + lb + 0.02 * resRutin(team);
}
export const resEff = (G, team) => clamp((membersOf(G, team).length / (RES_NEED[team.target] || 3)) * resQuality(G, team), 0, 1);

// Forskningspoäng per vecka som ett teknikteam ger (de som sitter i labbet räknas inte som vanliga arbetare)
export function techRpWeek(G, team) {
  const rp = membersOf(G, team).reduce((a, s) => a + s.research, 0);
  return rp * RP_RATE * TICKS_PER_WEEK * labMult(G) * (1 + RES_RP * resEff(G, team));
}
// Veckor kvar till nästa receptnivå vid dagens takt (null på högsta nivån eller utan effekt)
export function recipeWeeksLeft(G, team) {
  const eff = resEff(G, team);
  if (recipeLevel(G) >= RCP_MAX || eff <= 0) return null;
  const into = (G.rcp || 0) - recipeLevel(G) * RCP_LEVEL_PTS;
  return Math.max(1, Math.ceil((RCP_LEVEL_PTS - into) / eff));
}
// Allt fönstret behöver veta om ett forskningsteam
export function resInfo(G, team) {
  const focus = team.target;
  if (!RES_FOCUS.includes(focus)) return null;
  return {
    focus,
    n: membersOf(G, team).length,
    need: RES_NEED[focus],
    q: resQuality(G, team),
    eff: resEff(G, team),
    rutin: resRutin(team),
    rp: focus === 'tech' ? techRpWeek(G, team) : 0,
    level: recipeLevel(G),
    weeksLeft: focus === 'recipe' ? recipeWeeksLeft(G, team) : null,
  };
}

export function canRes(G, team, focus) {
  if (!resOpen(G)) return 'resLocked';
  if (!RES_FOCUS.includes(focus)) return 'resFocus';
  if (team.mission) return 'mission';
  const mem = membersOf(G, team);
  if (mem.length < OPS_MIN) return 'opsSmall';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  const other = resTeamOf(G, focus);
  if (other && other !== team) return 'resTaken';
  if (team.role === 'res') return true; // byte av inriktning: platserna är redan tagna
  if (!seatFree(G, mem.filter((s) => !s.out).length)) return 'noSeats';
  return true;
}
export function assignRes(G, id, focus) {
  const team = teamById(G, id);
  if (!team) return false;
  const ok = canRes(G, team, focus);
  if (ok !== true) return tr(G, 'tm.err.' + ok);
  const fresh = team.role !== 'res';
  team.role = 'res';
  team.target = focus;
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  setOut(membersOf(G, team), true);
  if (fresh) note(G, 'news.resStart', { team: teamName(team), focus: { sv: focus === 'tech' ? 'ny teknik' : 'recept', en: focus === 'tech' ? 'new technology' : 'recipes' } }, 'info', true);
  return true;
}
export function endRes(G, id) {
  const team = teamById(G, id);
  return team && team.role === 'res' ? endRole(G, id) : false;
}

// Varje vecka: räkna om teamens effekt, lägg till receptkunskap och ge forskningspoängen till researchTick (G.resRp, per tick)
export function resWeek(G) {
  let rp = 0;
  let tech = 0;
  const before = recipeLevel(G);
  for (const team of teamsOf(G)) {
    if (team.role !== 'res' || !RES_FOCUS.includes(team.target)) continue;
    const eff = resEff(G, team);
    team.resW = (team.resW || 0) + 1;
    if (team.target === 'tech') {
      rp += techRpWeek(G, team) / TICKS_PER_WEEK;
      tech = Math.max(tech, eff);
    }
    else if (recipeLevel(G) < RCP_MAX) G.rcp = Math.min(RCP_MAX * RCP_LEVEL_PTS, (G.rcp || 0) + eff);
  }
  G.resRp = rp;
  G.resTech = tech;
  const now = recipeLevel(G);
  if (now > before) note(G, 'news.recipeLevel' + (now <= 4 ? now : 'M'), { n: now }, 'good');
}
