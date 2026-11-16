// Expansionsmötet: ett onlinespel som ett team sköter året runt (uppdateringar, patchar, säsonger) får en expansion när
// innehållet blivit gammalt eller det gått länge sedan senaste stora tillägget. Teamet börjar inte bygga på egen hand. I
// stället kallar det till möte: ett viktigt meddelande (G.pending, typ 'expmeet') där teamets ledare lägger fram några förslag
// på riktning (expdirs.js) med pris, tid och vad var och en ger, och spelaren väljer vilken som byggs eller skjuter upp.
// Valet startar ett vanligt uppdrag (startMission i autoteam.js) med riktningen på bygget, och släppet läser den (live.js).
// Ingen slump: förslagen kommer ur teamets färdigheter och en hash av fröet.
import { hashStr } from '../core/rng.js';
import { WEEKS_PER_YEAR } from './const.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { rivalMmos } from './live.js';
import { teamsOf, teamById, teamName, membersOf, leadOf } from './teams.js';
import { skillCap } from './people.js';
import { EXP_DIRS, DIR_IDS } from './expdirs.js';
import { EXP_GAP, canMission, missionQuote, startMission } from './autoteam.js';

export const MEET_YEARS = 1.5; // år sedan senaste stora tillägget då det är dags även om innehållet håller sig färskt
export const MEET_LATER = 16; // veckor tills teamet tar upp det igen när spelaren skjutit upp
export const MEET_RETRY = 8; // veckor tills teamet försöker igen när det inte finns någon plan
export const MEET_PROPOSALS = 3;
const hash01 = (G, s) => hashStr((G.seed || 0) + ':meet:' + s) / 4294967296;

// Senaste stora innehållet: spelets lansering eller den senaste expansionen
export const lastContent = (G, g) => Math.max(g.t, ...g.live.exps.map((id) => (G.games.find((x) => x.id === id) || { t: 0 }).t));

// Är det dags för en expansion? null, eller varför: 'fresh' (innehållet har blivit gammalt) eller 'years' (det har gått länge)
export function expansionDue(G, g) {
  const L = g.live;
  if (!L || L.closed) return null;
  const gap = G.t - lastContent(G, g);
  if (gap < EXP_GAP) return null;
  if (L.fresh <= 70) return { reason: 'fresh', gap, fresh: Math.round(L.fresh) };
  if (gap >= MEET_YEARS * WEEKS_PER_YEAR) return { reason: 'years', gap, fresh: Math.round(L.fresh) };
  return null;
}

export const meetingOf = (G, gameId) => G.pending.find((p) => p.type === 'expmeet' && p.game === gameId) || null;
export const teamMeeting = (G, teamId) => G.pending.find((p) => p.type === 'expmeet' && p.team === teamId) || null;
// Ett spel som inte ska tas upp just nu: ett möte väntar på svar eller spelaren har skjutit upp det
export const meetBlocked = (G, g) => !!meetingOf(G, g.id) || (g.live && (g.live.meetNext || 0) > G.t);

// Var ett onlinespel står i fråga om expansioner, till fönstret Bygge: { k, ... } där k är 'meeting' (ett möte väntar på svar),
// 'building' (en expansion byggs), 'later' (uppskjutet, n veckor kvar), 'due' (dags, teamet kallar snart), 'dueNoTeam' (dags men
// inget driftteam kallar till möte) eller 'wait' (innehållet är färskt, n veckor tills det är dags även utan att det blivit gammalt)
export function expansionStatus(G, g) {
  const L = g.live;
  if (meetingOf(G, g.id)) return { k: 'meeting' };
  const m = teamsOf(G).find((x) => x.mission && x.mission.kind === 'expansion' && x.mission.base === g.id);
  if (m || (G.job && G.job.expansionOf === g.id)) return { k: 'building', team: m ? teamName(m) : null };
  if ((L.meetNext || 0) > G.t) return { k: 'later', n: L.meetNext - G.t };
  if (expansionDue(G, g)) {
    const ops = teamsOf(G).find((x) => x.role === 'ops' && x.target === g.id);
    return { k: ops && ops.repeat ? 'due' : 'dueNoTeam' };
  }
  return { k: 'wait', n: Math.max(1, Math.ceil(MEET_YEARS * WEEKS_PER_YEAR - (G.t - lastContent(G, g)))), fresh: Math.round(L.fresh) };
}

// Teamet kallar till möte om spelet (en gång tills spelaren svarat)
export function openExpMeeting(G, team, g, due) {
  if (meetBlocked(G, g) || teamMeeting(G, team.id)) return null;
  due = due || expansionDue(G, g);
  if (!due) return null;
  // finns ingen plan alls (spelets plattform har gått ur tiden) finns inget att mötas om: samma fråga ställs om en tid
  if (!missionQuote(G, team, 'expansion', g.id)) {
    g.live.meetNext = G.t + MEET_RETRY;
    return null;
  }
  const p = { type: 'expmeet', id: G.uid++, game: g.id, team: team.id, reason: due.reason, fresh: due.fresh, gap: due.gap, t: G.t };
  G.pending.push(p);
  g.live.meetNext = G.t + MEET_LATER; // om mötet av någon anledning inte besvaras tas frågan upp igen först då
  note(G, 'news.expMeet', { team: teamName(team), title: g.title }, 'info', true);
  return p;
}

// Hur väl en riktning passar teamet, 0 till ungefär 1: teamets färdighet i det riktningen kräver, plus en hash så att
// två team inte alltid föreslår samma
function fit(G, team, id, g) {
  const d = EXP_DIRS[id];
  const mem = membersOf(G, team);
  const cap = skillCap(G);
  const sk = d.skill && mem.length ? mem.reduce((a, s) => a + s[d.skill], 0) / mem.length / cap : 0.5;
  return sk + 0.35 * hash01(G, `${team.id}:${g.id}:${id}:${team.opsW || team.exp || 0}`) + (d.needs === 'rival' ? 2 : 0);
}
// Riktningarna som är aktuella för spelet (en riktning mot konkurrenten kräver en konkurrent i samma genre)
function eligibleDirs(G, g) {
  return DIR_IDS.filter((id) => {
    if (EXP_DIRS[id].needs !== 'rival') return true;
    return rivalMmos(G).some((m) => m.genre === g.genre || m.topic === g.topic);
  });
}
export function proposalsFor(G, team, g) {
  const ids = eligibleDirs(G, g).map((id) => ({ id, f: fit(G, team, id, g) })).sort((a, b) => b.f - a.f || (a.id < b.id ? -1 : 1));
  return ids.slice(0, MEET_PROPOSALS).map((x) => x.id);
}

// Allt rutan behöver veta om ett möte
export function expMeetOptions(G, p) {
  const g = G.games.find((x) => x.id === p.game);
  const team = teamById(G, p.team);
  if (!g || !g.live || g.live.closed || !team) return null;
  const mem = membersOf(G, team);
  const due = expansionDue(G, g);
  const props = proposalsFor(G, team, g);
  const opts = props.map((id, i) => {
    const quote = missionQuote(G, team, 'expansion', g.id, { dir: id });
    const ok = !quote ? 'plan' : canMission(G, team, 'expansion', g.id) !== true ? canMission(G, team, 'expansion', g.id) : G.money < quote.cost ? 'money' : true;
    return { dir: id, quote, ok, rec: i === 0 };
  });
  return {
    game: g, team, lead: leadOf(G, team) || mem[0] || null, name: teamName(team), reason: p.reason,
    // texten visar läget när mötet kallades, inte det som hunnit ändras sedan
    gap: p.gap ?? G.t - lastContent(G, g), fresh: p.fresh ?? Math.round(g.live.fresh), subs: Math.round(g.live.subs || 0), due: !!due, opts, later: MEET_LATER,
  };
}

function drop(G, p) {
  const i = G.pending.findIndex((x) => x.id === p.id);
  if (i >= 0) G.pending.splice(i, 1);
}
// Spelarens svar: en riktning (expdirs.js) startar expansionen, 'later' skjuter upp mötet. true, eller ett felmeddelande
// (mötet ligger kvar, till exempel om pengarna inte räcker).
export function resolveExpMeet(G, id, choice) {
  const p = G.pending.find((x) => x.id === id && x.type === 'expmeet');
  if (!p) return false;
  const g = G.games.find((x) => x.id === p.game);
  const team = teamById(G, p.team);
  if (!g || !g.live || g.live.closed || !team) {
    drop(G, p);
    return tr(G, 'tm.err.opsGame');
  }
  if (choice === 'later') {
    g.live.meetNext = G.t + MEET_LATER;
    drop(G, p);
    return true;
  }
  if (!EXP_DIRS[choice]) return false;
  const r = startMission(G, team.id, 'expansion', g.id, { dir: choice });
  if (r !== true) {
    // ett team som inte längre kan bygga (för få, tränar, upptaget) får mötet att falla: det tas upp igen senare
    if (canMission(G, team, 'expansion', g.id) !== true) {
      g.live.meetNext = G.t + MEET_LATER;
      drop(G, p);
    }
    return r;
  }
  g.live.meetNext = 0;
  drop(G, p);
  note(G, 'news.expGo.' + choice, { team: teamName(team), title: team.mission.J.title, base: g.title }, 'info');
  return true;
}
