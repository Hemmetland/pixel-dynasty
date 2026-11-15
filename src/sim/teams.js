// Team: namngivna grupper av medarbetare. Ett helt team kan gå samma kurs på en gång: det tar bara en kursplats och kostar
// TEAM_DISCOUNT av vad kurserna skulle kosta var för sig. Medlemmarna sparas som id i G.teams (ett valfritt fält, så äldre
// sparningar laddar som förut) och rensas när någon slutar. Längre fram kan ett team också arbeta på egen hand (autoteam.js).
import { note } from './news.js';
import { spend } from './studio.js';
import { tr } from './tr.js';
import { SKILL_NAMES, trainCost, trainWeeks, trainingSlots, trainingNow, finishTraining, TRAIN_COOLDOWN, SKILLS } from './people.js';

export const TEAM_MAX = 6;
export const TEAM_SIZE = 12;
export const TEAM_DISCOUNT = 0.75;
export const TEAM_NAMES = [
  { sv: 'Pixelgänget', en: 'The Pixel Crew' },
  { sv: 'Kodkompaniet', en: 'The Code Company' },
  { sv: 'Nattskiftet', en: 'The Night Shift' },
  { sv: 'Idéfabriken', en: 'The Idea Factory' },
  { sv: 'Buggjägarna', en: 'The Bug Hunters' },
  { sv: 'Spelsmederna', en: 'The Game Smiths' },
  { sv: 'Gnistlaget', en: 'The Spark Squad' },
  { sv: 'Tangentbordskrigarna', en: 'The Keyboard Warriors' },
  { sv: 'Kaffekollektivet', en: 'The Coffee Collective' },
  { sv: 'Bitjakten', en: 'The Bit Hunters' },
  { sv: 'Nivåbyggarna', en: 'The Level Builders' },
  { sv: 'Skärmskaparna', en: 'The Screen Makers' },
];

export const teamsOf = (G) => G.teams || [];
export const teamById = (G, id) => teamsOf(G).find((x) => x.id === id) || null;
// Ett namn som {sv,en}-objekt (nyheter och gränssnitt översätter själva); efter tolv namn läggs en siffra till.
export const teamName = (team) => {
  const base = TEAM_NAMES[team.n % TEAM_NAMES.length];
  const k = Math.floor(team.n / TEAM_NAMES.length);
  return k ? { sv: `${base.sv} ${k + 1}`, en: `${base.en} ${k + 1}` } : base;
};
export const membersOf = (G, team) => team.members.map((id) => G.staff.find((s) => s.id === id)).filter(Boolean);
export const teamOfStaff = (G, sid) => teamsOf(G).find((x) => x.members.includes(sid)) || null;
// Teamfliken visas först när studion har några anställda (annars är den bara i vägen).
export const teamsOpen = (G) => G.staff.length >= 4 || teamsOf(G).length > 0;

// Arbetsledare: en medlem som leder teamet. Ledaren gör att kollegorna lär sig lite fortare och ger teamet bättre tempo i uppdrag
// (mer ju skickligare ledaren är). Saknas en ledare när ett uppdrag startar utses teamets skickligaste automatiskt.
export const leadOf = (G, team) => (team.lead && team.members.includes(team.lead) ? G.staff.find((s) => s.id === team.lead) || null : null);
export const leadScore = (s) => s.design + s.tech + s.speed + s.research;
export function bestLead(G, team) {
  return membersOf(G, team).filter((s) => !s.isFounder).sort((a, b) => leadScore(b) - leadScore(a))[0] || null;
}
export function setLead(G, id, sid) {
  const team = teamById(G, id);
  if (!team || !team.members.includes(sid)) return false;
  team.lead = team.lead === sid ? null : sid;
  return true;
}

export function createTeam(G) {
  const list = (G.teams = G.teams || []);
  if (list.length >= TEAM_MAX) return tr(G, 'err.teamMax');
  let n = 0;
  while (list.some((x) => x.n === n)) n++;
  G.teamSeq = (G.teamSeq || 0) + 1;
  const team = { id: G.teamSeq, n, members: [], t0: G.t };
  list.push(team);
  return team;
}
export function disbandTeam(G, id) {
  const team = teamById(G, id);
  if (!team) return false;
  // ett pågående uppdrag avbryts: medarbetarna är tillbaka i arbetet
  if (team.mission) for (const s of G.staff) if (team.mission.J.crew.includes(s.id)) s.away = false;
  G.teams = G.teams.filter((x) => x !== team);
  return true;
}
export function addMember(G, id, sid) {
  const team = teamById(G, id);
  const st = G.staff.find((s) => s.id === sid);
  if (!team || !st) return false;
  if (team.members.includes(sid)) return true;
  if (team.mission || teamOfStaff(G, sid)?.mission) return tr(G, 'err.teamBusy');
  if (team.members.length >= TEAM_SIZE) return tr(G, 'err.teamFull');
  for (const x of G.teams) {
    x.members = x.members.filter((m) => m !== sid);
    if (x.lead === sid) x.lead = null;
  }
  team.members.push(sid);
  return true;
}
export function removeMember(G, id, sid) {
  const team = teamById(G, id);
  if (!team) return false;
  if (team.mission) return tr(G, 'err.teamBusy');
  team.members = team.members.filter((m) => m !== sid);
  if (team.lead === sid) team.lead = null;
  return true;
}

// ── Kurs för hela teamet ─────────────────────────────────────────
// De som är redo (inte på kurs och utom vilotiden) går kursen tillsammans; de andra är kvar i arbetet.
export function courseInfo(G, team) {
  const mem = membersOf(G, team);
  const ready = mem.filter((s) => s.trainUntil <= G.t && !s.away && G.t - s.lastTrain >= TRAIN_COOLDOWN);
  const busy = mem.filter((s) => s.trainUntil > G.t || s.away);
  const sum = ready.reduce((a, s) => a + trainCost(G, s), 0);
  return { mem, ready, busy, alone: sum, cost: Math.round(sum * TEAM_DISCOUNT), weeks: trainWeeks(G) };
}
export function canTrainTeam(G, team) {
  if (!G.u.flags.training) return 'locked';
  if (team.mission) return 'mission';
  const c = courseInfo(G, team);
  if (c.mem.length < 2) return 'small';
  if (c.busy.length === c.mem.length) return 'busy';
  if (c.ready.length < 2) return 'cooldown';
  if (trainingNow(G) >= trainingSlots(G)) return 'slots';
  return true;
}
export function trainTeam(G, id, skill) {
  const team = teamById(G, id);
  if (!team || !SKILLS.includes(skill)) return false;
  if (canTrainTeam(G, team) !== true) return false;
  const c = courseInfo(G, team);
  if (G.money < c.cost) return tr(G, 'err.money');
  spend(G, c.cost, 'training');
  for (const s of c.ready) {
    s.trainUntil = G.t + c.weeks;
    s.trainSkill = skill;
    s.lastTrain = G.t;
    s.trainGroup = 'T' + team.id;
  }
  return true;
}

// Veckan då kurserna tar slut: den enskildes kurs blir en rad i krönikan, ett helt teams kurs en nyhet.
export function finishCourses(G) {
  const groups = new Map();
  for (const s of G.staff) {
    if (!s.trainSkill || s.trainUntil > G.t) continue;
    const sk = s.trainSkill;
    const before = s[sk];
    const grp = s.trainGroup;
    finishTraining(G, s);
    s.trainGroup = null;
    const gain = s[sk] - before;
    if (!grp) {
      note(G, 'news.trained', { name: s.name, skill: SKILL_NAMES[sk], v: gain }, 'good', true);
      continue;
    }
    if (!groups.has(grp)) groups.set(grp, { sk, n: 0, sum: 0 });
    const r = groups.get(grp);
    r.n++;
    r.sum += gain;
  }
  for (const [grp, r] of groups) {
    const team = teamById(G, +grp.slice(1));
    note(G, 'news.teamTrained', { team: team ? teamName(team) : { sv: 'Teamet', en: 'The team' }, skill: SKILL_NAMES[r.sk], n: r.n, v: (r.sum / r.n).toFixed(1) }, 'good');
  }
}

// Varje vecka: ta bort dem som slutat ur sina team.
export function teamsWeek(G) {
  if (!G.teams) return;
  for (const team of G.teams) {
    if (team.members.some((id) => !G.staff.some((s) => s.id === id))) team.members = team.members.filter((id) => G.staff.some((s) => s.id === id));
    if (team.lead && !team.members.includes(team.lead)) team.lead = null;
  }
}

// Teamets snitt i varje färdighet (för visning).
export function teamAvg(G, team) {
  const mem = membersOf(G, team);
  const r = {};
  for (const k of SKILLS) r[k] = mem.length ? Math.round(mem.reduce((a, s) => a + s[k], 0) / mem.length) : 0;
  return r;
}
