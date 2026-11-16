// Självgående team: ett team med minst tre medarbetare kan ta ett eget uppdrag (en uppföljare, en expansion till ett onlinespel
// eller ett helt nytt spel) och sköter det från idé till släpp medan spelaren gör annat. Projektet räknas som ett vanligt
// spelprojekt (samma formler, samma betygsättning och försäljning, se stepJob och releaseGame i dev.js), men utan spelarens val:
// teamet följer genrens ideal när det vet vad det gör (studion har gjort genren förut, eller teamet har några spel bakom sig),
// kör ingen crunch och köper ingen marknadsföring. Varje avslutat spel ger teamet samspel (högst nivå SAMSPEL_MAX): lite mer
// tempo och färre buggar. Medlemmarna jobbar inte med spelarens projekt under uppdraget (s.away) men lär sig av arbetet.
// Planeringen (vad teamet väljer) kommer ur en hash av fröet. Bara betygsättningen och försäljningen drar ur G.rng, som vid
// vilket släpp som helst, så spel utan självgående team har samma slumpföljd som förut.
import { hashStr, seeded } from '../core/rng.js';
import { L as pick } from '../core/i18n.js';
import { PLATFORM, platTier, potential } from '../data/platforms.js';
import { SCOPES, SCOPE_IDS, yearOf, yfOf, TICKS_PER_WEEK } from './const.js';
import { SCOPE_TEMPO } from './tempo.js';
import { buildJob, stepJob, releaseGame, platformOpen, expectedRevenue } from './dev.js';
import { evaluate, compatOf, defaultFocus, recipeLevel, focusKnown } from './score.js';
import { labMult, spend } from './studio.js';
import { randomTitle } from './market.js';
import { liveGames, EXP_SCOPES } from './live.js';
import { note } from './news.js';
import { holds, teamsOf, teamById, teamName, membersOf, canTrainTeam, courseInfo, trainTeam, leadOf, bestLead, leadScore } from './teams.js';
import { SKILLS, skillCap } from './people.js';
import { tr } from './tr.js';
import { logBuild } from './builds.js';
import { addTalk } from './hype.js';
import { dirFor, dirOf, LOG_DIRS } from './expdirs.js';
import { expansionDue, meetBlocked, openMeeting, teamMeeting, askMeet } from './expmeet.js';

export const MISSION_MIN = 3;
export const SAMSPEL_MAX = 10;
export const MISSION_KINDS = ['sequel', 'expansion', 'new'];
const SEQ_MAX_CHAIN = 3; // en serie fortsätter till och med del fyra av teamets egna val
export const EXP_GAP = 24; // veckor mellan två expansioner (automatiskt val)
// Ett uppdrag har en egen budget (verktyg, testare, ljud och grafik utifrån): BUDGET_SHARE av vad spelet väntas dra in utan hype.
export const BUDGET_SHARE = 0.2;

export const autoOpen = (G) => !!G.u.flags.autoTeams;
export const samspel = (team) => Math.min(SAMSPEL_MAX, team.exp || 0);
const hash01 = (G, s) => hashStr((G.seed || 0) + ':auto:' + s) / 4294967296;

// Spel som redan har en uppföljare eller en expansion på gång (hos spelaren eller något annat team)
function claimed(G, id) {
  if (G.job && (G.job.sequelOf === id || G.job.expansionOf === id)) return true;
  return teamsOf(G).some((x) => x.mission && (x.mission.base === id));
}
// Spel som ett team kan göra något med: uppföljare till spel som gått bra, expansioner till onlinespel
export function eligibleBases(G, kind) {
  if (kind === 'sequel') {
    if (!G.u.flags.sequels) return [];
    return G.games.filter((g) => !g.expansionOf && !g.live && g.score >= 5 && !claimed(G, g.id)).slice(-8).reverse();
  }
  if (kind === 'expansion') return liveGames(G).filter((g) => !claimed(G, g.id));
  return [];
}

export function canMission(G, team, kind, baseId) {
  if (!autoOpen(G)) return 'autoLocked';
  if (team.mission) return 'onMission';
  const mem = membersOf(G, team);
  if (mem.length < MISSION_MIN) return 'smallMission';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  // ett driftteam bygger bara expansioner till sitt eget spel
  if (team.role === 'ops' && (kind !== 'expansion' || baseId !== team.target)) return 'opsOnly';
  if (team.role === 'hw' || team.role === 'res' || team.role === 'shop' || team.role === 'eng') return 'roleGame';
  if (kind === 'new') return true;
  if (!eligibleBases(G, kind).some((g) => g.id === baseId)) return kind === 'sequel' && !G.u.flags.sequels ? 'noSequels' : 'base';
  return true;
}

function bestPlatform(G) {
  const yf = yfOf(G.t);
  let best = null;
  let bv = -1;
  for (const id of G.licenses) {
    if (!PLATFORM[id] || !platformOpen(G, id)) continue;
    const v = potential(PLATFORM[id], yf);
    if (v > bv) {
      bv = v;
      best = id;
    }
  }
  return best;
}
// Största storleken vars idealteam inte är mer än en person större än teamet (och som plattformen klarar). step flyttar valet
// ett steg upp eller ner bland de storlekar som går (expansionens riktning, se expdirs.js).
function pickScope(G, n, platId, kind, step = 0) {
  const tier = platTier(PLATFORM[platId], yearOf(G.t));
  const opts = SCOPE_IDS.filter((id) => id !== 'aaa' && G.u.scopes.includes(id) && SCOPES[id].minTier <= tier && (kind !== 'expansion' || EXP_SCOPES.includes(id)));
  let best = opts[0];
  for (const id of opts) if (SCOPES[id].team <= n + 1) best = id;
  if (step && best) best = opts[Math.max(0, Math.min(opts.length - 1, opts.indexOf(best) + step))];
  return best;
}
// Nytt spel: den kombination av tema och genre som passar bäst och inte upprepar de senaste spelen. Utan receptkunskap väljer teamet
// med ett visst slarv (en slumpad del, men ur en hash och inte ur G.rng) som minskar för varje receptnivå (forskningsteamet) och
// är borta på nivå 10. Från nivå 4 provar teamet också genreblandningar, som kan ge bättre matchning än en ensam genre.
function rankCombos(G, team) {
  const list = [];
  const recent = G.games.slice(-8);
  const lvl = recipeLevel(G);
  const slop = 0.5 * (1 - lvl / 10);
  const blend = lvl >= 4 && G.u.flags.genre2;
  const noise = (topic, genre, genre2) => slop * hash01(G, `combo:${topic}:${genre}${genre2 ? ':' + genre2 : ''}:${team.id}:${team.exp || 0}`);
  for (const topic of G.u.topics) {
    for (const genre of G.u.genres) {
      const rep = recent.filter((g) => g.topic === topic && g.genre === genre).length;
      const base = -0.7 * rep + (focusKnown(G, genre) ? 0.3 : 0);
      list.push({ topic, genre, v: compatOf(topic, genre) + base + noise(topic, genre) });
      if (!blend) continue;
      for (const genre2 of G.u.genres) {
        if (genre2 === genre) continue;
        list.push({ topic, genre, genre2, v: compatOf(topic, genre, genre2) + base + noise(topic, genre, genre2) });
      }
    }
  }
  // fallande, och vid lika värde den som kom först (stabil sortering), som när bara den bästa letades fram
  return list.sort((a, b) => b.v - a.v);
}
function pickCombo(G, team) {
  const best = rankCombos(G, team)[0];
  if (!best) return null;
  const c = { topic: best.topic, genre: best.genre };
  if (best.genre2) c.genre2 = best.genre2;
  return c;
}
// De tre idéer teamet lägger fram på ett möte om ett nytt spel: den bästa först, och helst olika genrer
export function conceptsFor(G, team, n = 3) {
  const ranked = rankCombos(G, team);
  const out = [];
  const seen = new Set();
  for (const c of ranked) {
    if (out.length >= n) break;
    if (seen.has(c.genre)) continue;
    seen.add(c.genre);
    out.push(c);
  }
  for (const c of ranked) {
    if (out.length >= n) break;
    if (!out.includes(c)) out.push(c);
  }
  return out.map((c) => ({ topic: c.topic, genre: c.genre, genre2: c.genre2 || null }));
}
const sequelTitle = (g) => {
  const n = g.chain >= 2 ? g.chain : 1;
  const base = n >= 2 ? g.title.replace(new RegExp('\\s+' + n + '$'), '') : g.title;
  return base + ' ' + (n + 1);
};

// Teamets plan som underlag för buildJob (eller null om det inte går). o.dir är expansionens riktning (expdirs.js).
export function planMission(G, team, kind, baseId, o = {}) {
  const n = membersOf(G, team).length;
  const dir = dirFor(kind, o.dir);
  const base = baseId ? G.games.find((g) => g.id === baseId) : null;
  const seed = `${team.id}:${team.exp || 0}:${G.t}`;
  const rng = seeded(hashStr(`${G.seed || 0}:auto:title:${seed}`));
  if (kind !== 'new' && !base) return null;
  let plat = base && G.licenses.includes(base.platform) && platformOpen(G, base.platform) ? base.platform : bestPlatform(G);
  if (!plat) return null;
  if (kind === 'expansion') plat = base.platform;
  const scope = pickScope(G, n, plat, kind, dir ? dir.step : 0);
  if (!scope) return null;
  const cfg = { scope, audience: base && base.audience && G.u.aud.includes(base.audience) ? base.audience : 'everyone', platform: plat, live: false };
  if (kind === 'new') {
    const combo = o.combo && G.u.topics.includes(o.combo.topic) && G.u.genres.includes(o.combo.genre) ? o.combo : pickCombo(G, team);
    Object.assign(cfg, { topic: combo.topic, genre: combo.genre }, combo.genre2 ? { genre2: combo.genre2 } : {}, { title: pick(randomTitle(rng, combo.topic)) });
  } else if (kind === 'sequel') {
    Object.assign(cfg, { topic: base.topic, genre: base.genre, genre2: base.genre2, sequelOf: base.id, title: sequelTitle(base), engineId: G.engines.some((e) => e.id === base.engineId) ? base.engineId : null });
  } else {
    const sub = pick(randomTitle(rng, base.topic));
    Object.assign(cfg, { topic: base.topic, genre: base.genre, genre2: base.genre2, expansionOf: base.id, title: `${base.title.split(':')[0].trim()}: ${sub}` });
  }
  return cfg;
}

export const missionCost = (G, J) => Math.round((BUDGET_SHARE * expectedRevenue(G, J) * (J.dirCost || 1)) / 50) * 50;
// Riktningen sätts på bygget (en expansion eller en uppföljare): kostnaden, buggarna, Förväntan och Snacket om beskedet (se
// expdirs.js). Släppet läser J.dir.
function setDir(J, kind, dir) {
  const d = dirFor(kind, dir);
  if (!d || !(J.expansionOf || J.sequelOf)) return;
  J.dir = dir;
  J.dirCost = d.cost;
}
// Vad ett uppdrag skulle kosta (för visning innan det startas), eller null om teamet inte kan planera något
export function missionQuote(G, team, kind, baseId, o = {}) {
  const cfg = planMission(G, team, kind, baseId, o);
  const uid = G.uid;
  const J = cfg ? buildJob(G, cfg, membersOf(G, team).length) : null;
  G.uid = uid; // ett pris är bara en uträkning: det får inte flytta nästa id
  if (!J || typeof J === 'string') return null;
  setDir(J, kind, o.dir);
  return { cost: missionCost(G, J), scope: J.scope, weeks: Math.round((J.devTicks + J.polishTicks) / TICKS_PER_WEEK) };
}

export function startMission(G, id, kind, baseId, o = {}) {
  const team = teamById(G, id);
  if (!team || !MISSION_KINDS.includes(kind)) return false;
  const ok = canMission(G, team, kind, baseId);
  if (ok !== true) return tOf(G, ok);
  const cfg = planMission(G, team, kind, baseId, o);
  const mem = membersOf(G, team);
  const J = cfg ? buildJob(G, cfg, mem.length) : 'plan';
  if (typeof J === 'string') return tOf(G, 'plan');
  setDir(J, kind, o.dir);
  const cost = missionCost(G, J);
  if (G.money < cost) return tr(G, 'err.money');
  spend(G, cost, 'autoteam');
  J.cost = cost;
  const sp = samspel(team);
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  const lead = leadOf(G, team);
  J.auto = team.id;
  J.crew = mem.map((s) => s.id);
  // arbetsledaren ger upp till 12 % mer tempo (efter hur skicklig ledaren är i förhållande till taket)
  J.autoMult = 0.82 + 0.02 * sp + 0.12 * Math.min(1, leadScore(lead) / (4 * skillCap(G)));
  J.autoBug = (1 - 0.02 * sp) * (J.dir ? dirOf(J.dir).bug : 1);
  if (J.dir && dirOf(J.dir).hype) J.hype += dirOf(J.dir).hype;
  J.crunch = false;
  if (sp >= 2 && !focusKnown(G, J.genre)) J.focus = defaultFocus(G, J.genre, J.genre2);
  team.mission = { kind, base: baseId || null, J, t0: G.t };
  logBuild(G, J, 'start');
  if (J.dir) {
    logBuild(G, J, 'dir', LOG_DIRS.indexOf(J.dir));
    addTalk(J, 'dir', dirOf(J.dir).talk);
  }
  for (const s of mem) s.away = true;
  return true;
}

// Felmeddelanden: texten 'tm.err.' + kod
const tOf = (G, code) => tr(G, 'tm.err.' + code);

function release(G, team, reason) {
  const m = team.mission;
  // ett driftteam är kvar ute på sitt spel också efter uppdraget
  for (const s of G.staff) if (m.J.crew.includes(s.id)) s.away = holds(team);
  team.mission = null;
  return reason;
}
export function cancelMission(G, id) {
  const team = teamById(G, id);
  if (!team || !team.mission) return false;
  release(G, team, 'cancel');
  return true;
}

// Hur långt uppdraget kommit, 0..1 (utveckling och finputs)
export function missionProgress(m) {
  const J = m.J;
  return Math.min(1, (J.ticks + J.polishDone) / (J.devTicks + J.polishTicks));
}
export const missionWeeksLeft = (m) => Math.max(1, Math.ceil((m.J.devTicks + m.J.polishTicks - m.J.ticks - m.J.polishDone) / TICKS_PER_WEEK));

function finishMission(G, team) {
  const m = team.mission;
  const J = m.J;
  J.state = 'report';
  J.report = evaluate(G, J);
  J.rpGained = Math.round(((J.D + J.T) / (SCOPE_TEMPO[J.scope] || 1) / 45) * labMult(G) * 0.5);
  G.rp += J.rpGained;
  const saved = G.job;
  G.job = J;
  let game;
  try {
    game = releaseGame(G);
  } finally {
    G.job = saved;
  }
  release(G, team, 'done');
  if (!game) return;
  team.exp = (team.exp || 0) + 1;
  team.best = Math.max(team.best || 0, game.score);
  team.games = (team.games || []).concat(game.id);
  note(G, 'news.missionDone', { team: teamName(team), title: game.title, v: game.score.toFixed(1) }, game.score >= 7.5 ? 'good' : game.score < 5 ? 'bad' : 'info');
}

// Vad ett team som fortsätter på egen hand tar sig an härnäst: en expansion, en uppföljare till ett spel som gått bra
// (serien får inte bli för lång) eller ett nytt spel. Ett team som frågar först (askMeet) hoppar över det spelaren just
// skjutit upp eller som det redan hållit möte om.
export function nextMission(G, team) {
  const ask = askMeet(team);
  const free = (g) => !ask || !meetBlocked(G, g);
  const exp = eligibleBases(G, 'expansion').filter((g) => expansionDue(G, g) && free(g));
  if (exp.length) return ['expansion', exp.sort((a, b) => a.live.fresh - b.live.fresh)[0].id];
  const seq = eligibleBases(G, 'sequel').filter((g) => g.score >= 7 && G.t - g.t >= 30 && (g.chain || 0) < SEQ_MAX_CHAIN && free(g));
  if (seq.length) return ['sequel', seq.sort((a, b) => b.score - a.score)[0].id];
  return ['new', null];
}

// Ett team utan uppdrag: går en kurs om det är dags (om det är påslaget) och tar annars nästa uppdrag (om det är påslaget)
function idle(G, team) {
  if (!autoOpen(G)) return;
  if (team.autoTrain !== false && (team.exp || 0) > 0 && canTrainTeam(G, team) === true) {
    const info = courseInfo(G, team);
    if (info.ready.length === info.mem.length && G.money > info.cost * 10) {
      const cap = skillCap(G);
      const avg = (k) => info.mem.reduce((a, s) => a + s[k], 0) / info.mem.length;
      const weakest = SKILLS.filter((k) => avg(k) < cap).sort((a, b) => avg(a) - avg(b))[0];
      if (weakest && trainTeam(G, team.id, weakest) === true) return;
    }
  }
  if (!team.repeat || teamMeeting(G, team.id)) return;
  const [kind, base] = nextMission(G, team);
  // ett team som frågar först startar inget av sig självt: det kallar till möte med förslag och spelaren väljer (expmeet.js)
  if (askMeet(team)) {
    if ((team.meetNext || 0) > G.t) return; // spelaren har skjutit upp: teamet väntar
    if (kind !== 'new' && canMission(G, team, kind, base) !== true) return;
    openMeeting(G, team, kind, base ? G.games.find((x) => x.id === base) : null);
    return;
  }
  startMission(G, team.id, kind, base);
}

// Varje vecka: uppdragen går framåt, klara spel släpps och lediga team tar nästa steg.
export function missionWeek(G) {
  for (const team of teamsOf(G)) {
    const m = team.mission;
    if (!m) {
      if (!holds(team) && membersOf(G, team).length >= MISSION_MIN) idle(G, team);
      continue;
    }
    const ws = membersOf(G, team).filter((s) => m.J.crew.includes(s.id));
    if (ws.length < 2) {
      release(G, team, 'lost');
      note(G, 'news.missionLost', { team: teamName(team) }, 'bad');
      continue;
    }
    let done = false;
    for (let i = 0; i < TICKS_PER_WEEK && !done; i++) done = stepJob(G, m.J, ws, true);
    if (done) finishMission(G, team);
  }
}
