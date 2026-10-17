import { RES } from '../data/research.js';
import { CATEGORIES } from '../data/categories.js';
import { TOPICS } from '../data/topics.js';
import { GENRES } from '../data/genres.js';
import { FEATURES } from '../data/research.js';
import { hashStr } from '../core/rng.js';

export const SAVE_VERSION = 3;

export const DIFFICULTY = {
  relaxed: { money: 90000, sales: 1.15, bugs: 0.8, wage: 0.9 },
  normal: { money: 60000, sales: 1.0, bugs: 1.0, wage: 1.0 },
  hardcore: { money: 40000, sales: 0.93, bugs: 1.2, wage: 1.06 },
};
export const ARCHETYPES = {
  designer: { d: 19, t: 10, s: 10, r: 9, money: 0, hype: 0 },
  coder: { d: 11, t: 19, s: 11, r: 8, money: 0, hype: 0 },
  visionary: { d: 14, t: 13, s: 9, r: 15, money: 0, hype: 0 },
  hustler: { d: 13, t: 12, s: 14, r: 8, money: 12000, hype: 0 },
};

export function newGame(opts = {}) {
  const diff = opts.difficulty || 'normal';
  const seed = opts.seed ?? hashStr(String(Date.now()) + (opts.studio || ''));
  const arch = ARCHETYPES[opts.archetype] || ARCHETYPES.designer;
  const G = {
    v: SAVE_VERSION,
    rng: seed | 0,
    seed,
    studio: opts.studio || 'Nordlys Games',
    difficulty: diff,
    archetype: opts.archetype || 'designer',
    logo: opts.logo ?? 0,
    t: 0,
    tick: 0,
    money: DIFFICULTY[diff].money + arch.money,
    money0: DIFFICULTY[diff].money + arch.money,
    rp: 0,
    fans: 0,
    nextId: 2,
    staff: [],
    candidates: [],
    office: { tier: 0, fac: {} },
    u: {
      topics: TOPICS.filter((t) => t.start).map((t) => t.id),
      genres: ['action', 'adventure', 'strategy'],
      cats: CATEGORIES.filter((c) => c.start).map((c) => c.id),
      scopes: ['small', 'medium'],
      aud: ['everyone'],
      feats: FEATURES.filter((f) => f.start).map((f) => f.id),
      facs: ['coffee', 'lab'],
      mkt: [],
      flags: {},
    },
    perk: { qa: 0, bugs: 0, skillCap: 0, hire: 0, morale: 0 },
    research: { done: [], active: [], bonusRp: 0 },
    licenses: ['pc'],
    games: [],
    job: null,
    contracts: [],
    engines: [],
    know: { combos: {}, focus: {} },
    comps: [],
    market: { releases: [], trend: { genre: [], topic: [] } },
    loans: [],
    hist: { cash: [], revenue: [], fans: [] },
    month: { income: 0, expense: 0, breakdown: {} },
    lastMonth: { income: 0, expense: 0, breakdown: {} },
    awards: [],
    ach: [],
    stats: { gamesMade: 0, revenue: 0, bestScore: 0, hits: 0, contracts: 0, hires: 0, researched: 0, events: 0 },
    flags: {},
    news: [],
    pending: [],
    debtMonths: 0,
    over: null,
    uid: 1,
  };
  G.staff.push({
    id: 1,
    isFounder: true,
    name: opts.founderName || 'Founder',
    look: opts.look || { skin: 1, hair: 1, hairColor: 2, shirt: 3, pants: 0, acc: 0, body: 0 },
    design: arch.d,
    tech: arch.t,
    speed: arch.s,
    research: arch.r,
    salary: 0,
    mood: 80,
    xp: 0,
    spec: 'founder',
    trait: null,
    trainUntil: -1,
    trainSkill: null,
    lastTrain: -99,
    hired: 0,
    games: 0,
  });
  return G;
}

export function isDone(G, id) {
  return G.research.done.includes(id);
}
export function hasUnlock(G, kind, id) {
  return (G.u[kind] || []).includes(id);
}
export function flag(G, f) {
  return !!G.u.flags[f];
}
export const getGenre = (id) => GENRES.find((g) => g.id === id);

// Ge ut en unik id.
export function nextId(G) {
  return G.nextId++;
}

// Tillämpa en forskningsnods upplåsningar.
export function applyUnlocks(G, r) {
  const u = r.unlock || {};
  for (const [k, arr] of Object.entries(u)) {
    if (k === 'flags') for (const f of arr) G.u.flags[f] = true;
    else {
      G.u[k] = G.u[k] || [];
      for (const id of arr) if (!G.u[k].includes(id)) G.u[k].push(id);
    }
  }
  for (const [k, v] of Object.entries(r.perk || {})) G.perk[k] = (G.perk[k] || 0) + v;
}
export function rebuildUnlocks(G) {
  for (const id of G.research.done) if (RES[id]) applyUnlocks(G, RES[id]);
}
