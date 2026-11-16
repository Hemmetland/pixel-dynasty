// Driftteam: ett team som sköter ett levande onlinespel (forskningen Driftteam). Medarbetarna är ute på spelet (s.away) och
// arbetar inte med dina projekt, men lär sig av jobbet. Teamets effekt (0–1, L.tm på spelet) beror på hur många de är mot vad
// spelet behöver (fler spelare kräver fler händer), hur skickliga de är, arbetsledaren och rutinen de byggt upp av att ha sköt
// spelet i flera år. Med full effekt blir innehållet gammalt långsammare, avbrotten färre, spelet åldras långsammare och
// uppdateringar, evenemang och säsonger blir billigare (se TM_* i live.js). Teamet startar också uppdateringar, evenemang,
// säsonger och nya regioner på egen hand. När det är dags för en expansion kallar teamet till möte och spelaren väljer
// riktning (expmeet.js); bygget görs sedan som ett uppdrag (autoteam.js).
// Allt är deterministiskt: teamet drar inget ur G.rng, så spel utan driftteam har samma slumpföljd som förut.
import { clamp } from '../core/util.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { skillCap } from './people.js';
import { teamsOf, teamById, teamName, membersOf, leadOf, bestLead, leadScore, endRole, setOut, seatFree, deskFree } from './teams.js';
import { liveGames, payBase, regionsOpen, regionGain, liveRegionCost, startLiveRegion, eventReadyIn, liveEventCost, startLiveEvent, AUTO_BUFFER, RENO_FLOOR, TM_RENO } from './live.js';
import { autoOpen, canMission } from './autoteam.js';
import { expansionDue, meetBlocked, openExpMeeting } from './expmeet.js';

export const OPS_MIN = 2;
export const RUTIN_WEEKS = 24; // veckor på samma spel per steg i rutin
export const RUTIN_MAX = 10;
const REGION_PAYBACK = 18; // en region öppnas av sig själv om den väntas betala sig på så här många månader
const EVENT_BELOW = 85; // och ett evenemang startar när innehållet sjunkit under så här färskt

export const opsOpen = (G) => !!G.u.flags.opsTeams;
export const opsTeamOf = (G, gameId) => teamsOf(G).find((x) => x.role === 'ops' && x.target === gameId) || null;
export const rutin = (team) => Math.min(RUTIN_MAX, Math.floor((team.opsW || 0) / RUTIN_WEEKS));

// Hur många som behövs för att sköta spelet: 3 för ett litet spel upp till 12 för ett jättespel (betalande spelare räknas)
export function opsNeed(G, g) {
  return clamp(Math.round(2 + 3 * Math.log10(1 + payBase(g.live) / 2000)), 3, 12);
}
// Teamets kvalitet: skicklighet, arbetsledare och rutin (0,55 för ett nytt oerfaret team upp mot 1,2)
export function opsQuality(G, team) {
  const mem = membersOf(G, team);
  if (!mem.length) return 0;
  const cap = skillCap(G);
  const avg = mem.reduce((a, s) => a + (s.design + s.tech + s.speed + s.research) / 4, 0) / mem.length / cap;
  const lead = leadOf(G, team);
  const lb = lead ? 0.12 * Math.min(1, leadScore(lead) / (4 * cap)) : 0;
  return 0.55 + 0.35 * Math.min(1, avg) + lb + 0.02 * rutin(team);
}
export function opsEff(G, team, g) {
  const n = membersOf(G, team).length;
  return clamp((n / opsNeed(G, g)) * opsQuality(G, team), 0, 1);
}
// Allt fönstret behöver veta om ett driftteam
export function opsInfo(G, team) {
  const g = G.games.find((x) => x.id === team.target);
  if (!g || !g.live) return null;
  const n = membersOf(G, team).length;
  return { game: g, n, need: opsNeed(G, g), q: opsQuality(G, team), eff: opsEff(G, team, g), rutin: rutin(team) };
}

export function canOps(G, team, gameId) {
  if (!opsOpen(G)) return 'opsLocked';
  if (team.mission) return 'mission';
  const mem = membersOf(G, team);
  if (mem.length < OPS_MIN) return 'opsSmall';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  if (!liveGames(G).some((x) => x.id === gameId)) return 'opsGame';
  const other = opsTeamOf(G, gameId);
  if (other && other !== team) return 'opsTaken';
  if (!seatFree(G, mem.filter((s) => !s.out).length)) return 'noSeats';
  return true;
}
export function assignOps(G, id, gameId) {
  const team = teamById(G, id);
  if (!team) return false;
  const ok = canOps(G, team, gameId);
  if (ok !== true) return tr(G, 'tm.err.' + ok);
  const g = G.games.find((x) => x.id === gameId);
  team.role = 'ops';
  team.target = gameId;
  if (team.repeat === undefined) team.repeat = true; // teamet tar upp expansioner på möte (kan stängas av)
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  setOut(membersOf(G, team), true);
  note(G, 'news.opsStart', { team: teamName(team), title: g.title }, 'info', true);
  return true;
}
// Teamet slutar sköta spelet och är vanlig personal igen (inte mitt i en expansion)
export function endOps(G, id) {
  const team = teamById(G, id);
  return team && team.role === 'ops' ? endRole(G, id) : false;
}

// Spelet har lagts ned: teamet blir ledigt (men en expansion som är på gång får bli klar först)
function drop(G, team, g) {
  if (team.mission) return;
  const title = g ? g.title : '';
  if (g && g.live) g.live.tm = 0;
  team.target = null;
  // finns inga skrivbord åt dem väntar de kvar i serverrummet på ett nytt spel
  if (deskFree(G, membersOf(G, team).filter((s) => s.out).length)) {
    team.role = null;
    setOut(membersOf(G, team), false);
  }
  note(G, 'news.opsLost', { team: teamName(team), title }, 'info');
}

// Vad ett team på egen hand gör med spelet den här veckan
function autoOps(G, team, g) {
  const L = g.live;
  if (!L.ev && eventReadyIn(G, L) === 0 && L.fresh <= EVENT_BELOW && G.money >= liveEventCost(G, g) * AUTO_BUFFER && startLiveEvent(G, g.id) === true) {
    note(G, 'news.opsEvent', { team: teamName(team), title: g.title }, 'info', true);
  }
  if (!L.region) {
    let best = null;
    let bv = 0;
    for (const r of regionsOpen(G, g)) {
      const cost = liveRegionCost(G, g, r.id);
      const gain = regionGain(G, g, r.id).month;
      if (gain * REGION_PAYBACK < cost || G.money < cost * AUTO_BUFFER) continue;
      if (gain / cost > bv) {
        bv = gain / cost;
        best = r.id;
      }
    }
    if (best && startLiveRegion(G, g.id, best) === true) note(G, 'news.opsRegion', { team: teamName(team), title: g.title }, 'info', true);
  }
  // en expansion när innehållet blivit gammalt eller det gått länge sedan senaste: teamet börjar inte bygga själv utan kallar
  // till möte, där spelaren väljer riktning (expmeet.js)
  if (team.repeat && !team.mission && autoOpen(G) && membersOf(G, team).length >= 3) {
    const due = expansionDue(G, g);
    if (due && !meetBlocked(G, g) && canMission(G, team, 'expansion', g.id) === true) openExpMeeting(G, team, g, due);
  }
}

// Varje vecka före liveWeek: räkna om teamets effekt (L.tm), förnya spelets ålder och låt teamet göra sina egna drag
export function opsWeek(G) {
  for (const g of liveGames(G)) g.live.tm = 0;
  for (const team of teamsOf(G)) {
    if (team.role !== 'ops' || team.target == null) continue;
    const g = G.games.find((x) => x.id === team.target);
    if (!g || !g.live || g.live.closed) {
      drop(G, team, g);
      continue;
    }
    const L = g.live;
    const eff = opsEff(G, team, g);
    L.tm = eff;
    team.opsW = (team.opsW || 0) + 1;
    const age = Math.max(0, G.t - L.t0);
    L.reno = Math.max(L.reno || 0, Math.min((L.reno || 0) + TM_RENO * eff, age * (1 - RENO_FLOOR)));
    if (eff >= 0.15) autoOps(G, team, g);
  }
}
