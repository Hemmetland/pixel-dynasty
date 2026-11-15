import { rnd, rint, gauss, pick, chance, seeded, hashStr } from '../core/rng.js';
import { clamp } from '../core/util.js';
import { FIRST, LAST } from '../data/names.js';
import { emit } from '../core/bus.js';
import { yearOf, wageIndex, WEEKS_PER_YEAR } from './const.js';
import { TRAIN_TEMPO } from './tempo.js';
import { DIFFICULTY, nextId } from './state.js';
import { tr } from './tr.js';
import { capacity, seated, facLevel, spend, campusOf } from './studio.js';
import { note } from './news.js';

export const SPECS = {
  designer: { d: 1.45, t: 0.75, s: 1, r: 0.9, name: { sv: 'Speldesigner', en: 'Game Designer' } },
  coder: { d: 0.75, t: 1.45, s: 1, r: 0.9, name: { sv: 'Programmerare', en: 'Programmer' } },
  allround: { d: 1.05, t: 1.05, s: 1.05, r: 1, name: { sv: 'Allrounder', en: 'All-rounder' } },
  researcher: { d: 0.9, t: 0.9, s: 0.9, r: 1.9, name: { sv: 'Forskare', en: 'Researcher' } },
  fast: { d: 0.95, t: 0.95, s: 1.5, r: 0.85, name: { sv: 'Snabbarbetare', en: 'Fast Worker' } },
};
export const TRAITS = {
  perfectionist: { name: { sv: 'Perfektionist', en: 'Perfectionist' }, desc: { sv: 'Färre buggar, något långsammare.', en: 'Fewer bugs, a bit slower.' } },
  nightowl: { name: { sv: 'Nattuggla', en: 'Night Owl' }, desc: { sv: 'Jobbar bäst under crunch.', en: 'Thrives in crunch.' } },
  mentor: { name: { sv: 'Mentor', en: 'Mentor' }, desc: { sv: 'Gör kollegorna lite bättre.', en: 'Makes coworkers a little better.' } },
  spark: { name: { sv: 'Gnistan', en: 'The Spark' }, desc: { sv: 'Ger ibland geniala idéer.', en: 'Sometimes has brilliant ideas.' } },
  steady: { name: { sv: 'Stadig', en: 'Steady' }, desc: { sv: 'Trivs och stannar länge.', en: 'Happy and loyal.' } },
};
const TRAIT_IDS = Object.keys(TRAITS);

export function wageOf(G, st) {
  const sum = (st.design + st.tech) * 0.9 + st.speed * 0.5 + st.research * 0.5;
  const w = wageIndex(yearOf(G.t)) * DIFFICULTY[G.difficulty].wage;
  return Math.max(250, Math.round((sum * 32 * w) / 10) * 10);
}

// Antal val per utseendefält (samma som paletterna i render/pal.js och frisyrerna i render/people.js).
export const LOOK_N = { skin: 7, hair: 14, hairColor: 14, shirt: 18, pants: 8 };
const FANTASY_HAIR = [7, 8, 9, 10, 11, 12, 13]; // blått, rosa, platina, ingefära, turkos, violett, midnatt

// Nya, valfria utseendefält: hat 0-3, glasses 0-3, beard 0-2, headphones/backpack/hoodie 0/1, pattern 0-3.
// Saknas de räknas de som 0 (gamla sparfiler). Hänger ihop med det gamla acc-fältet så att ett utseende inte får
// två mössor. remix=true blandar också in de nya frisyrerna, hårfärgerna, tröjorna, byxorna och hudtonerna.
function dress(look, r, remix) {
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const acc = look.acc | 0;
  if (remix) {
    // grundslumpen drar hårfärg 0-7, där 7 är blått: det ska vara en ovanlig färgning, så den blir en naturlig färg här
    if (look.hairColor === 7) look.hairColor = ri(0, 6);
    if (r() < 0.5) look.hair = ri(7, LOOK_N.hair - 1);
    if (r() < 0.16) look.hairColor = FANTASY_HAIR[ri(0, FANTASY_HAIR.length - 1)];
    if (r() < 0.4) look.shirt = ri(12, LOOK_N.shirt - 1);
    if (r() < 0.4) look.pants = ri(4, LOOK_N.pants - 1);
    if (r() < 0.2) look.skin = ri(5, LOOK_N.skin - 1);
  }
  look.hat = acc === 3 ? 2 : acc === 4 ? 3 : r() < 0.14 ? ri(1, 3) : 0;
  look.glasses = acc === 1 ? (r() < 0.5 ? 1 : ri(1, 3)) : r() < 0.1 ? ri(1, 3) : 0;
  look.headphones = acc === 2 || r() < 0.07 ? 1 : 0;
  look.beard = r() < 0.27 ? (r() < 0.55 ? 1 : 2) : 0;
  look.backpack = r() < 0.14 ? 1 : 0;
  look.hoodie = r() < 0.3 ? 1 : 0;
  look.pattern = look.hoodie ? (r() < 0.2 ? 2 : 0) : r() < 0.4 ? ri(1, 3) : 0;
  return look;
}

// Slumpat utseende från en vanlig slumpfunktion (0..1): karaktärsskaparen och fotgängare.
export function randomLook(r = Math.random) {
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  return dress({ skin: ri(0, 4), hair: ri(0, 6), hairColor: ri(0, 7), shirt: ri(0, 11), pants: ri(0, 3), acc: r() < 0.45 ? ri(1, 4) : 0, body: ri(0, 1) }, r, true);
}

// De gamla fälten slumpas exakt som förut. De nya härleds ur slumptillståndet efteråt utan att flytta fram det,
// så att allt annat i en körning med samma frö förblir identiskt.
export function makeLook(G) {
  const look = {
    skin: rint(G, 0, 4), hair: rint(G, 0, 6), hairColor: rint(G, 0, 7), shirt: rint(G, 0, 11),
    pants: rint(G, 0, 3), acc: chance(G, 0.45) ? rint(G, 1, 4) : 0, body: rint(G, 0, 1),
  };
  return dress(look, seeded(G.rng ^ 0x9e3779b9), true);
}

// Gamla sparfiler: ge personal och kandidater utan nya fält ett utseende (fast per person, rör inga gamla fält).
export function migrateLooks(G) {
  for (const p of [...(G.staff || []), ...(G.candidates || [])]) {
    if (p.look && !p.isFounder && p.look.hat === undefined) dress(p.look, seeded(hashStr(p.name + ':' + p.id)), false);
  }
}

// Förinställda "extra"-kombinationer för karaktärsskaparens knapp.
const EXTRAS = [
  {}, { glasses: 1 }, { hat: 1 }, { hat: 2 }, { headphones: 1 }, { beard: 1 }, { beard: 2, glasses: 2 }, { hoodie: 1 },
  { hoodie: 1, hat: 1, backpack: 1 }, { glasses: 3, pattern: 1 }, { hat: 3, pattern: 2 }, { backpack: 1, pattern: 3 },
];
export const EXTRA_N = EXTRAS.length;
export function extraLook(look, i) {
  return { ...look, acc: 0, hat: 0, glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0, ...EXTRAS[i % EXTRAS.length] };
}

// Förnamn som ingen i teamet eller bland kandidaterna redan har: samma slumptal som pick(), men närmaste lediga namn i listan
function freshFirst(G) {
  const used = new Set([...(G.staff || []), ...(G.candidates || [])].map((p) => p.name.split(' ')[0]));
  let i = Math.floor(rnd(G) * FIRST.length);
  for (let k = 0; k < FIRST.length && used.has(FIRST[i]); k++) i = (i + 1) % FIRST.length;
  return FIRST[i];
}
export function makeCandidate(G, q = 0) {
  const year = yearOf(G.t);
  const spec = pick(G, Object.keys(SPECS));
  const sp = SPECS[spec];
  const base = 9 + (year - 1980) * 1.45 + q * 5 + G.perk.hire * 3;
  const sk = (m) => Math.max(3, Math.round(base * m * gauss(G, 1, 0.17)));
  const c = {
    id: nextId(G),
    name: freshFirst(G) + ' ' + pick(G, LAST),
    look: makeLook(G),
    spec,
    design: sk(sp.d), tech: sk(sp.t), speed: sk(sp.s * 0.9), research: sk(sp.r * 0.8),
    mood: 70, xp: 0, trait: chance(G, 0.5) ? pick(G, TRAIT_IDS) : null,
    trainUntil: -1, trainSkill: null, lastTrain: -99, hired: 0, games: 0,
  };
  c.salary = wageOf(G, c);
  c.fee = Math.round(c.salary * 1.5);
  return c;
}

export function refreshCandidates(G) {
  const n = 3 + (G.u.flags.hr1 ? 1 : 0) + (G.u.flags.hr2 ? 1 : 0) + 2 * campusOf(G); // varje campushus har en egen rekryteringsavdelning
  G.candidates = [];
  for (let i = 0; i < n; i++) {
    const elite = G.u.flags.hr2 && i === n - 1 && chance(G, 0.6);
    G.candidates.push(makeCandidate(G, elite ? 3 : G.u.flags.hr1 ? rint(G, 0, 1) : 0));
  }
}

export function canHire(G) {
  return seated(G) < capacity(G);
}
export function hire(G, id) {
  const c = G.candidates.find((x) => x.id === id);
  if (!c) return false;
  if (!canHire(G)) return tr(G, 'err.capacity');
  if (G.money < c.fee) return tr(G, 'err.money');
  spend(G, c.fee, 'hiring');
  G.candidates = G.candidates.filter((x) => x.id !== id);
  c.hired = G.t;
  const st = { ...c };
  delete st.fee;
  G.staff.push(st);
  G.stats.hires++;
  emit('hired', st);
  return true;
}
export function fire(G, id) {
  const st = G.staff.find((s) => s.id === id);
  if (!st || st.isFounder) return false;
  const sev = st.salary;
  spend(G, sev, 'severance');
  G.staff = G.staff.filter((s) => s.id !== id);
  emit('fired', st);
  return true;
}
export function raise(G, id) {
  const st = G.staff.find((s) => s.id === id);
  if (!st || st.isFounder) return false;
  st.salary = Math.round(st.salary * 1.12 / 10) * 10;
  st.mood = clamp(st.mood + 18, 0, 100);
  return true;
}

// ── Utbildning ───────────────────────────────────────────────────
export const SKILLS = ['design', 'tech', 'speed', 'research'];

// Genrekunskap: varje spel en medarbetare varit med om i en genre ger mer rutin i just den genren (s.gx[genre], högst GX_MAX).
// Rutinen syns som tempo i projekt i samma genre: den som aldrig gjort genren jobbar med GX_BASE, den som gjort fem spel i den med
// GX_BASE + GX_STEP × 5. Det kommer ovanpå färdigheterna, så skicklighet och erfarenhet behövs båda. Går medarbetaren tar rutinen med sig.
export const GX_MAX = 5;
export const GX_BASE = 0.978;
export const GX_STEP = 0.016;
export const genreKnow = (s, genre) => Math.min(GX_MAX, (s.gx && s.gx[genre]) || 0);
// Rutin i spelets genrer (en genreblandning kräver båda: 62 % första genren, 38 % andra)
export const knowOf = (s, genre, genre2) => (genre2 ? 0.62 * genreKnow(s, genre) + 0.38 * genreKnow(s, genre2) : genreKnow(s, genre));
export const knowMult = (k) => GX_BASE + GX_STEP * k;
export function learnGenre(s, genre, genre2) {
  s.gx = s.gx || {};
  for (const g of genre2 ? [genre, genre2] : [genre]) s.gx[g] = Math.min(GX_MAX, (s.gx[g] || 0) + 1);
}
// Genrerna en medarbetare kan bäst, störst först: [[genre, nivå 1..GX_MAX], ...]
export const bestGenres = (s, n = 2) =>
  Object.entries(s.gx || {})
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n);
export const skillCap = (G) => 60 + G.perk.skillCap + (yearOf(G.t) - 1980) * 2.2;
export function trainCost(G, st) {
  return Math.round((350 + (st.design + st.tech + st.speed + st.research) * 4) * wageIndex(yearOf(G.t)));
}
export function trainingSlots(G) {
  return 1 + facLevel(G, 'training');
}
// Kursens längd i veckor (utbildningsrum gör den kortare) och minsta tid mellan två kurser för samma person.
export function trainWeeks(G) {
  return Math.max(2, 4 - facLevel(G, 'training')) * TRAIN_TEMPO;
}
export const TRAIN_COOLDOWN = 8 * TRAIN_TEMPO;
// Antal kursplatser som används: ett helt team på samma kurs (trainGroup) tar bara en plats.
export function trainingNow(G) {
  return new Set(G.staff.filter((s) => s.trainUntil > G.t).map((s) => s.trainGroup || 's' + s.id)).size;
}
export function canTrain(G, st) {
  if (!G.u.flags.training) return 'locked';
  if (st.trainUntil > G.t) return 'busy';
  if (st.away) return 'away';
  if (G.t - st.lastTrain < TRAIN_COOLDOWN) return 'cooldown';
  if (trainingNow(G) >= trainingSlots(G)) return 'slots';
  return true;
}
export function train(G, id, skill) {
  const st = G.staff.find((s) => s.id === id);
  if (!st || !SKILLS.includes(skill)) return false;
  const ok = canTrain(G, st);
  if (ok !== true) return false;
  const cost = trainCost(G, st);
  if (G.money < cost) return tr(G, 'err.money');
  spend(G, cost, 'training');
  const weeks = trainWeeks(G);
  st.trainUntil = G.t + weeks;
  st.trainSkill = skill;
  st.lastTrain = G.t;
  return true;
}
export function finishTraining(G, st) {
  const lvl = facLevel(G, 'training');
  let gain = rint(G, 3, 6) + (lvl >= 2 ? 2 : 0) + (G.u.flags.training2 ? 2 : 0);
  const cap = skillCap(G);
  const cur = st[st.trainSkill];
  gain = Math.max(1, Math.min(gain, Math.round(cap - cur)));
  st[st.trainSkill] = cur + gain;
  const sk = st.trainSkill;
  st.trainSkill = null;
  st.salary = wageOf(G, st) * (st.isFounder ? 0 : 1);
  emit('trained', { st, skill: sk, gain });
}

// ── Växa av arbete ───────────────────────────────────────────────
// Den som arbetar blir bättre av det: varje vecka med ett pågående projekt samlar en medarbetare erfarenhet (xp), och för varje
// GROW_XP blir en färdighet ett steg högre. Färdigheten väljs efter yrkesrollen (en programmerare lär sig mest av teknik), farten
// beror på humör, på om en mentor finns i teamet och på hur nära taket personen redan är (ju mer man kan, desto långsammare går det).
// Lönen följer med uppåt. Slumpen kommer från en hash av fröet, aldrig från G.rng.
export const SKILL_NAMES = { design: { sv: 'Design', en: 'Design' }, tech: { sv: 'Teknik', en: 'Tech' }, speed: { sv: 'Tempo', en: 'Speed' }, research: { sv: 'Forskning', en: 'Research' } };
export const GROW_XP = 60;
export function growRate(G, st, mentor) {
  const cap = skillCap(G);
  const room = clamp(1 - Math.max(st.design, st.tech, st.speed, st.research) / cap, 0, 1);
  return (0.4 + 0.9 * room) * moodMult(st) * (mentor && st.trait !== 'mentor' ? 1.15 : 1);
}
// Veckor av arbete till nästa steg, med dagens fart (för visning).
export function growWeeksLeft(G, st, mentor) {
  return Math.max(1, Math.ceil((GROW_XP - (st.xp || 0)) / Math.max(0.05, growRate(G, st, mentor))));
}
export function growSkill(G, st) {
  const sp = SPECS[st.spec] || SPECS.allround;
  const w = [sp.d, sp.t, sp.s * 0.9, sp.r * 0.8];
  const sum = w.reduce((a, b) => a + b, 0);
  let x = (hashStr(`${G.seed || 0}:grow:${st.id}:${st.grown || 0}`) / 4294967296) * sum;
  for (let i = 0; i < 4; i++) {
    x -= w[i];
    if (x < 0) return SKILLS[i];
  }
  return SKILLS[0];
}
export function growWeek(G) {
  // den som är ute på uppdrag med ett självgående team arbetar också (och lär sig av det)
  const ws = G.staff.filter((s) => s.trainUntil <= G.t && (G.job || s.away));
  if (!ws.length) return;
  const mentor = ws.some((w) => w.trait === 'mentor');
  // kollegor till en arbetsledare lär sig som om det fanns en mentor
  const led = new Set();
  for (const tm of G.teams || []) if (tm.lead && tm.members.includes(tm.lead)) for (const id of tm.members) if (id !== tm.lead) led.add(id);
  const cap = skillCap(G);
  for (const st of ws) {
    st.xp = (st.xp || 0) + growRate(G, st, mentor || led.has(st.id));
    if (st.xp < GROW_XP) continue;
    const sk = growSkill(G, st);
    if (st[sk] >= cap) {
      st.xp = GROW_XP;
      continue;
    }
    st.xp -= GROW_XP;
    const before = wageOf(G, st);
    st[sk]++;
    st.grown = (st.grown || 0) + 1;
    st.lastGrow = G.t;
    st.growSkill = sk;
    if (!st.isFounder) st.salary += wageOf(G, st) - before;
    if (st[sk] >= 50 && st[sk] % 25 === 0) note(G, 'news.staffGrow', { name: st.name, skill: SKILL_NAMES[sk], v: st[sk] }, 'good', true);
  }
}

// ── Humör ────────────────────────────────────────────────────────
export function moodTarget(G) {
  const fac = facLevel(G, 'coffee') * 4 + facLevel(G, 'gameroom') * 6;
  return clamp(58 + G.perk.morale + fac, 20, 98);
}
export function updateMood(G) {
  const target = moodTarget(G);
  const crunching = crunchActive(G);
  const crunch = crunching ? 12 : 0;
  for (const s of G.staff) {
    const tr_ = s.trait === 'steady' ? 6 : 0;
    const busy = crunching && s.trainUntil <= G.t && !s.away;
    if (busy || s.fatigue) s.fatigue = clamp((s.fatigue || 0) + (busy ? (s.trait === 'nightowl' ? 0.6 : 1) : -FATIGUE_REST), 0, FATIGUE_MAX);
    s.mood = clamp(s.mood + (target + tr_ - crunch - 2 * fatigueOver(s) - s.mood) * 0.12, 5, 100);
  }
}
export const moodMult = (st) => 0.85 + (0.3 * st.mood) / 100;
// Crunch gäller bara medan ett spel utvecklas (inte under rapporten, kontrakt eller motorbyggen).
export const crunchActive = (G) => !!(G.job && G.job.crunch && G.job.kind === 'game' && G.job.state === 'dev');

// ── Crunch och trötthet ──────────────────────────────────────────
// Trötthet (valfritt fält, saknas = 0) byggs upp med 1 per crunchvecka (nattugglor 0,6) och klingar av med
// FATIGUE_REST per vecka annars. De första FATIGUE_GRACE veckorna är gratis: bara tröttheten över gränsen sänker
// tempo (2,5 % per vecka) och humör, så en kort crunch (händelsen Deadline, sex veckor) lönar sig medan ständig
// crunch bränner ut folk. Den som mår riktigt dåligt kan säga upp sig (burnoutQuits, varje månad).
export const FATIGUE_GRACE = 4;
export const FATIGUE_MAX = 20;
export const FATIGUE_REST = 0.5;
export const fatigueOver = (st) => Math.max(0, (st.fatigue || 0) - FATIGUE_GRACE);
export const fatigueMult = (st) => 1 - 0.025 * fatigueOver(st);
// Teamets snittrötthet (0..FATIGUE_MAX) och hur mycket långsammare det jobbar (0..1).
export function teamFatigue(G) {
  const ws = workers(G);
  if (!ws.length) return { avg: 0, slow: 0 };
  return { avg: ws.reduce((a, w) => a + (w.fatigue || 0), 0) / ws.length, slow: ws.reduce((a, w) => a + 1 - fatigueMult(w), 0) / ws.length };
}
export function burnoutQuits(G) {
  for (const s of G.staff.slice()) {
    if (s.isFounder || s.mood >= 35) continue;
    const p = ((35 - s.mood) / 100) * (s.trait === 'steady' ? 0.3 : 1) * (G.perk.morale ? 0.6 : 1);
    if (!chance(G, p)) continue;
    G.staff = G.staff.filter((x) => x !== s);
    G.stats.quits = (G.stats.quits || 0) + 1;
    // utbränd av crunch, eller bara missnöjd (för lite trivsel)
    if (fatigueOver(s) > 0 || crunchActive(G)) note(G, 'news.quit', { name: s.name }, 'bad');
    else note(G, 'news.quitMood', { name: s.name }, 'bad');
  }
}

// Aktiva arbetare: alla som inte är på kurs.
// (de som är ute på ett uppdrag med ett självgående team, s.away, jobbar inte med spelarens projekt)
export function workers(G) {
  return G.staff.filter((s) => s.trainUntil <= G.t && !s.away);
}

// Medarbetare som stannar: en nyhet efter 3, 5, 10 och 20 år i studion (varje månad kollas det) och efter 10 och 25 spel
// (när ett spel släpps). Bara visning, och de små siffrorna kommer tyst i krönikan så att det inte blir brus.
export const SERVICE_YEARS = [3, 5, 10, 20];
export const SERVICE_GAMES = [10, 25];
export function serviceYears(G) {
  for (const s of G.staff) {
    if (s.isFounder) continue;
    const y = Math.floor((G.t - s.hired) / WEEKS_PER_YEAR);
    if (SERVICE_YEARS.includes(y) && (s.ann || 0) < y) {
      s.ann = y;
      note(G, 'news.staffYears', { name: s.name, n: y }, 'good', y < 5);
    }
  }
}
export function serviceGames(G, s) {
  if (!s.isFounder && SERVICE_GAMES.includes(s.games)) note(G, 'news.staffGames', { name: s.name, n: s.games }, 'good', s.games < 25);
}

// Månadslön
export function payroll(G) {
  return G.staff.reduce((s, x) => s + (x.isFounder ? 0 : x.salary), 0);
}
