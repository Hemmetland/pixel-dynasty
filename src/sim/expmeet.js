// Teammötet: ett team som tar nästa uppdrag på egen hand börjar inte bygga utan frågar först. Det kallar till möte: ett viktigt
// meddelande (G.pending, typ 'expmeet') där teamets ledare lägger fram tre förslag med pris, tid och vad var och ett ger, och
// spelaren väljer vilket som byggs eller skjuter upp. Tre sorters möten (p.kind):
//   expansion  ett onlinespel som ett team sköter året runt får en expansion när innehållet blivit gammalt eller det gått länge
//              sedan senaste stora tillägget (riktningar i expdirs.js: EXP_DIRS)
//   sequel     ett spel som gått riktigt bra får en uppföljare (SEQ_DIRS)
//   new        teamet har inget annat på gång och föreslår tre idéer till ett helt nytt spel (tema och genre)
// Valet startar ett vanligt uppdrag (startMission i autoteam.js) med riktningen eller idén, och släppet läser riktningen
// (live.js för expansioner, dev.js för uppföljare). Ett team utan "fråga först" (askMeet) startar själv som förut.
// Ingen slump: förslagen kommer ur teamets färdigheter, studions kunskap och en hash av fröet.
import { hashStr } from '../core/rng.js';
import { WEEKS_PER_YEAR } from './const.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { rivalMmos } from './live.js';
import { teamsOf, teamById, teamName, membersOf, leadOf } from './teams.js';
import { skillCap } from './people.js';
import { compatOf, focusKnown } from './score.js';
import { EXP_DIRS, SEQ_DIRS, DIRS_OF, DIR_IDS } from './expdirs.js';
import { EXP_GAP, canMission, missionQuote, startMission, conceptsFor } from './autoteam.js';

export const MEET_YEARS = 1.5; // år sedan senaste stora tillägget då det är dags även om innehållet håller sig färskt
export const MEET_LATER = 16; // veckor tills teamet tar upp det igen när spelaren skjutit upp
export const MEET_RETRY = 8; // veckor tills teamet försöker igen när det inte finns någon plan
export const MEET_PROPOSALS = 3;
// Mötenas id räknas för sig (över 1e9) så att G.uid, som spelens och händelsernas id bygger på, är densamma med eller utan möten
const meetId = (G) => 1e9 + (G.meetSeq = (G.meetSeq || 0) + 1);
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
// Ett spel som inte ska tas upp just nu: ett möte väntar på svar eller spelaren har skjutit upp det (på spelets live-data för
// en expansion, på själva spelet för en uppföljare)
export const meetBlocked = (G, g) => !!meetingOf(G, g.id) || ((g.live ? g.live.meetNext : g.meetNext) || 0) > G.t;
// Frågar teamet först? Ja som standard, utom för team som Personalavdelningen satt upp åt dig (de sköter sig själva) och team
// där spelaren stängt av det. Spelaren kan alltid ändra det i fönstret Personal.
export const askMeet = (team) => (team.meet === undefined ? !team.hr : !!team.meet);

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

// Kalla till möte om en expansion till onlinespelet g (en gång tills spelaren svarat)
export function openExpMeeting(G, team, g, due) {
  if (meetBlocked(G, g) || teamMeeting(G, team.id)) return null;
  due = due || expansionDue(G, g);
  if (!due) return null;
  // finns ingen plan alls (spelets plattform har gått ur tiden) finns inget att mötas om: samma fråga ställs om en tid
  if (!missionQuote(G, team, 'expansion', g.id)) {
    g.live.meetNext = G.t + MEET_RETRY;
    return null;
  }
  const p = { type: 'expmeet', kind: 'expansion', id: meetId(G), game: g.id, team: team.id, reason: due.reason, fresh: due.fresh, gap: due.gap, props: proposalsFor(G, team, g), t: G.t };
  G.pending.push(p);
  g.live.meetNext = G.t + MEET_LATER; // om mötet av någon anledning inte besvaras tas frågan upp igen först då
  note(G, 'news.expMeet', { team: teamName(team), title: g.title }, 'info', true);
  return p;
}
// Möte om en uppföljare till spelet g (ett spel som gått bra)
function openSeqMeeting(G, team, g) {
  if (!g || g.live || meetBlocked(G, g) || teamMeeting(G, team.id)) return null;
  if (!missionQuote(G, team, 'sequel', g.id)) {
    g.meetNext = G.t + MEET_RETRY;
    return null;
  }
  const p = { type: 'expmeet', kind: 'sequel', id: meetId(G), game: g.id, team: team.id, reason: 'hit', score: g.score, props: seqProposalsFor(G, team, g), t: G.t };
  G.pending.push(p);
  g.meetNext = G.t + MEET_LATER;
  note(G, 'news.seqMeet', { team: teamName(team), title: g.title }, 'info', true);
  return p;
}
// Möte om ett helt nytt spel: tre idéer (tema och genre) att välja mellan
function openNewMeeting(G, team) {
  if (teamMeeting(G, team.id) || (team.meetNext || 0) > G.t) return null;
  if (!missionQuote(G, team, 'new')) {
    team.meetNext = G.t + MEET_RETRY;
    return null;
  }
  const p = { type: 'expmeet', kind: 'new', id: meetId(G), game: null, team: team.id, reason: 'next', combos: conceptsFor(G, team, MEET_PROPOSALS), t: G.t };
  G.pending.push(p);
  team.meetNext = G.t + MEET_LATER;
  note(G, 'news.newMeet', { team: teamName(team) }, 'info', true);
  return p;
}
// Kalla till möte om nästa uppdrag: kind är 'expansion' eller 'sequel' (med spelet g) eller 'new'
export function openMeeting(G, team, kind, g) {
  if (kind === 'expansion') return g && g.live ? openExpMeeting(G, team, g) : null;
  if (kind === 'sequel') return openSeqMeeting(G, team, g);
  if (kind === 'new') return openNewMeeting(G, team);
  return null;
}

// Hur väl en riktning passar teamet, 0 till ungefär 1: teamets färdighet i det riktningen kräver, plus en hash så att
// två team inte alltid föreslår samma
function fit(G, team, id, g, table = EXP_DIRS) {
  const d = table[id];
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

// De tre riktningar teamet föreslår för en uppföljare (av fyra)
export function seqProposalsFor(G, team, g) {
  const ids = Object.keys(SEQ_DIRS).map((id) => ({ id, f: fit(G, team, id, g, SEQ_DIRS) })).sort((a, b) => b.f - a.f || (a.id < b.id ? -1 : 1));
  return ids.slice(0, MEET_PROPOSALS).map((x) => x.id);
}

export const meetKind = (p) => p.kind || 'expansion';
// Var 'skjut upp' sparas: på spelets live-data (expansion), på spelet (uppföljare) eller på teamet (nytt spel)
const holderOf = (p, g, team) => (meetKind(p) === 'new' ? team : meetKind(p) === 'sequel' ? g : g && g.live);
// Gäller mötet fortfarande? (spelet finns kvar, lever och teamet finns)
function validMeet(G, p) {
  const team = teamById(G, p.team);
  const g = p.game == null ? null : G.games.find((x) => x.id === p.game) || null;
  const k = meetKind(p);
  if (!team) return null;
  if (k === 'expansion' && (!g || !g.live || g.live.closed)) return null;
  if (k === 'sequel' && (!g || g.live)) return null;
  return { team, g, k };
}

// Allt rutan behöver veta om ett möte. Varje förslag: { key (svaret), dir eller combo, quote, ok (true eller felkod), rec }
export function expMeetOptions(G, p) {
  const V = validMeet(G, p);
  if (!V) return null;
  const { team, g, k } = V;
  const mem = membersOf(G, team);
  let opts;
  if (k === 'new') {
    opts = (p.combos || []).map((combo, i) => {
      const quote = missionQuote(G, team, 'new', null, { combo });
      const ok = !quote ? 'plan' : canMission(G, team, 'new', null) !== true ? canMission(G, team, 'new', null) : G.money < quote.cost ? 'money' : true;
      return { key: 'n' + i, combo, compat: Math.round(compatOf(combo.topic, combo.genre, combo.genre2 || undefined)), known: focusKnown(G, combo.genre), novel: !G.know.combos[combo.topic + '|' + combo.genre], quote, ok, rec: i === 0 };
    });
  } else {
    const props = p.props || (k === 'sequel' ? seqProposalsFor(G, team, g) : proposalsFor(G, team, g));
    opts = props.map((id, i) => {
      const quote = missionQuote(G, team, k, g.id, { dir: id });
      const ok = !quote ? 'plan' : canMission(G, team, k, g.id) !== true ? canMission(G, team, k, g.id) : G.money < quote.cost ? 'money' : true;
      return { key: id, dir: id, quote, ok, rec: i === 0 };
    });
  }
  return {
    kind: k, game: g, team, lead: leadOf(G, team) || mem[0] || null, name: teamName(team), reason: p.reason,
    // texten visar läget när mötet kallades, inte det som hunnit ändras sedan
    gap: p.gap ?? (g && g.live ? G.t - lastContent(G, g) : g ? G.t - g.t : 0), fresh: p.fresh ?? (g && g.live ? Math.round(g.live.fresh) : 0), score: p.score ?? (g ? g.score : 0),
    subs: g && g.live ? Math.round(g.live.subs || 0) : 0, due: k === 'expansion' ? !!expansionDue(G, g) : true, opts, later: MEET_LATER,
  };
}

function drop(G, p) {
  const i = G.pending.findIndex((x) => x.id === p.id);
  if (i >= 0) G.pending.splice(i, 1);
}
// Spelarens svar: ett förslags nyckel (en riktning eller en idé) startar uppdraget, 'later' skjuter upp mötet. true, eller ett
// felmeddelande (mötet ligger kvar, till exempel om pengarna inte räcker).
export function resolveExpMeet(G, id, choice) {
  const p = G.pending.find((x) => x.id === id && x.type === 'expmeet');
  if (!p) return false;
  const V = validMeet(G, p);
  if (!V) {
    drop(G, p);
    return tr(G, 'tm.err.opsGame');
  }
  const { team, g, k } = V;
  const hold = holderOf(p, g, team);
  if (choice === 'later') {
    // spelaren sa nej tack: teamet väntar med allt, inte bara med just det här, så att nästa fråga inte kommer direkt
    hold.meetNext = team.meetNext = G.t + MEET_LATER;
    drop(G, p);
    return true;
  }
  let r;
  if (k === 'new') {
    const combo = /^n\d$/.test(choice) ? (p.combos || [])[+choice.slice(1)] : null;
    if (!combo) return false;
    r = startMission(G, team.id, 'new', null, { combo });
  } else {
    if (!DIRS_OF[k][choice]) return false;
    r = startMission(G, team.id, k, g.id, { dir: choice });
  }
  if (r !== true) {
    // ett team som inte längre kan bygga (för få, tränar, upptaget) får mötet att falla: det tas upp igen senare
    if (canMission(G, team, k, g ? g.id : null) !== true) {
      hold.meetNext = team.meetNext = G.t + MEET_LATER;
      drop(G, p);
    }
    return r;
  }
  hold.meetNext = 0;
  team.meetNext = 0;
  drop(G, p);
  const J = team.mission.J;
  if (k === 'new') note(G, 'news.newGo', { team: teamName(team), title: J.title }, 'info');
  else note(G, (k === 'sequel' ? 'news.seqGo.' : 'news.expGo.') + choice, { team: teamName(team), title: J.title, base: g.title }, 'info');
  return true;
}
