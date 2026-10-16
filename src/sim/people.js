import { rint, gauss, pick, chance } from '../core/rng.js';
import { clamp } from '../core/util.js';
import { FIRST, LAST } from '../data/names.js';
import { emit } from '../core/bus.js';
import { yearOf, wageIndex } from './const.js';
import { DIFFICULTY, nextId } from './state.js';
import { tr } from './tr.js';
import { capacity, facLevel } from './studio.js';

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

export function makeLook(G) {
  return {
    skin: rint(G, 0, 4), hair: rint(G, 0, 6), hairColor: rint(G, 0, 7), shirt: rint(G, 0, 11),
    pants: rint(G, 0, 3), acc: chance(G, 0.45) ? rint(G, 1, 4) : 0, body: rint(G, 0, 1),
  };
}

export function makeCandidate(G, q = 0) {
  const year = yearOf(G.t);
  const spec = pick(G, Object.keys(SPECS));
  const sp = SPECS[spec];
  const base = 9 + (year - 1980) * 1.45 + q * 5 + G.perk.hire * 3;
  const sk = (m) => Math.max(3, Math.round(base * m * gauss(G, 1, 0.17)));
  const c = {
    id: nextId(G),
    name: pick(G, FIRST) + ' ' + pick(G, LAST),
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
  const n = 3 + (G.u.flags.hr1 ? 1 : 0) + (G.u.flags.hr2 ? 1 : 0);
  G.candidates = [];
  for (let i = 0; i < n; i++) {
    const elite = G.u.flags.hr2 && i === n - 1 && chance(G, 0.6);
    G.candidates.push(makeCandidate(G, elite ? 3 : G.u.flags.hr1 ? rint(G, 0, 1) : 0));
  }
}

export function canHire(G) {
  return G.staff.length < capacity(G);
}
export function hire(G, id) {
  const c = G.candidates.find((x) => x.id === id);
  if (!c) return false;
  if (!canHire(G)) return tr(G, 'err.capacity');
  if (G.money < c.fee) return tr(G, 'err.money');
  G.money -= c.fee;
  G.month.expense += c.fee;
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
  G.money -= sev;
  G.month.expense += sev;
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
export const skillCap = (G) => 60 + G.perk.skillCap + (yearOf(G.t) - 1980) * 2.2;
export function trainCost(G, st) {
  return Math.round((350 + (st.design + st.tech + st.speed + st.research) * 4) * wageIndex(yearOf(G.t)));
}
export function trainingSlots(G) {
  return 1 + facLevel(G, 'training');
}
export function trainingNow(G) {
  return G.staff.filter((s) => s.trainUntil > G.t).length;
}
export function canTrain(G, st) {
  if (!G.u.flags.training) return 'locked';
  if (st.trainUntil > G.t) return 'busy';
  if (G.t - st.lastTrain < 8) return 'cooldown';
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
  G.money -= cost;
  G.month.expense += cost;
  const weeks = Math.max(2, 4 - facLevel(G, 'training'));
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

// ── Humör ────────────────────────────────────────────────────────
export function moodTarget(G) {
  const fac = facLevel(G, 'coffee') * 4 + facLevel(G, 'gameroom') * 6;
  return clamp(58 + G.perk.morale + fac, 20, 98);
}
export function updateMood(G) {
  const target = moodTarget(G);
  const crunch = G.job && G.job.crunch ? 12 : 0;
  for (const s of G.staff) {
    const tr_ = s.trait === 'steady' ? 6 : 0;
    s.mood = clamp(s.mood + (target + tr_ - crunch - s.mood) * 0.12, 5, 100);
  }
}
export const moodMult = (st) => 0.85 + (0.3 * st.mood) / 100;

// Aktiva arbetare: alla som inte är på kurs.
export function workers(G) {
  return G.staff.filter((s) => s.trainUntil <= G.t);
}

// Månadslön
export function payroll(G) {
  return G.staff.reduce((s, x) => s + (x.isFounder ? 0 : x.salary), 0);
}
