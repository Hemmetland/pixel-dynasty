import { clamp } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { PLATFORM } from '../data/platforms.js';
import { yearOf, wageIndex, WEEKS_PER_YEAR } from './const.js';
import { spend, capacity, facLevel, rentOf, facUpkeep, loanInterest } from './studio.js';
import { payroll } from './people.js';
import { note } from './news.js';

// Koncernledning: dotterbolagen (uppköpta konkurrenter, se acquire.js) har en personalstyrka som avgör hur ofta och hur
// stort de släpper. Ett självständigt dotterbolag sköter sig självt: du får BASE_SHARE av försäljningen och det tar lite
// av ledningens tid. Med forskningen Koncernledning kan du integrera ett bolag (kräver minst två verksamheter): det kostar
// en engångssumma och tar ungefär tio månader, med risk för kulturkrockar, men ger en större andel och synergier genom
// koncernens verksamheter (egen motor, förlag, butik, marknadsavdelning och delade tjänster). Ett integrerat bolag får en
// budget (spara, normal eller satsa) och kan ledas av en VD ur din egen personal. Ledningens kapacitet räcker till ett
// visst antal bolag; överskrids den stannar integrationen och bolagen tappar. Nya uppköp kräver en stabil ekonomi.
// All slump kommer ur fröet (inte G.rng), så spelets slumpföljd är densamma.
export const BASE_SHARE = 0.35;
export const SHARE_INT = 0.2; // fullt integrerat: så mycket större andel
export const SHARE_PUB = 0.1; // ... och så mycket till när ditt förlag ger ut deras spel
export const BUDGETS = [
  { id: 'save', grow: -0.1, str: -0.02, div: 0.08, cost: 0 }, // spara: större utdelning, men folk slutar
  { id: 'normal', grow: 0.03, str: 0, div: 0, cost: 0 },
  { id: 'invest', grow: 0.15, str: 0.04, div: 0, cost: 1 }, // satsa: du betalar för fler anställda och bättre spel
];
const INVEST = 175; // satsningen per anställd och vecka, gånger lönenivån
const INTEG_PER = 15000; // engångskostnad för integrationen per anställd, gånger lönenivån
export const INTEG_WEEKS = 40;
const CLASH = 0.012; // risk per vecka för en kulturkrock under integrationen (hälften med en egen VD)
export const LOAD = { free: 0.25, int: 1, ceo: 0.5 };
export const OPS_MIN = 2;
export const STABLE_MIN = 50;
export const TECH = 0.3; // egen motor: betyg
export const STORE = 0.25; // butiken: deras pc-spel säljer mer, gånger butikens räckvidd
export const PROMO = 0.1; // marknadsavdelningen: deras spel säljer mer
export const PROMO_OWN = 0.015; // ... och dina, per integrerat bolag (högst PROMO_OWN_MAX)
export const PROMO_OWN_MAX = 0.06;
export const COST = 0.06; // delade tjänster: lägre hyra och drift per integrerat bolag (högst COST_MAX)
export const COST_MAX = 0.25;

const owned = (G) => (G.comps || []).filter((c) => c.owned);
const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:group:${key}`));
export const canGroup = (G) => !!G.u.flags.group;

// Hur många som arbetar i ett genomsnittligt bolag ett visst år, och en nivå för personalens färdigheter
export const avgStaff = (year) => Math.round(28 * (1 + Math.max(0, year - 1980) / 25));
const skillBase = (year) => 9 + (year - 1980) * 1.45;

// Dotterbolagets styrning (skapas vid köpet; gamla sparfiler får den första veckan)
export function subOf(G, c) {
  if (!c.sub) c.sub = { mode: 'free', budget: 1, integ: 0, staff: Math.round(avgStaff(yearOf(c.ownedT ?? G.t)) * (0.6 + 0.4 * c.strength)), ceo: null, inv: 0, done: false };
  return c.sub;
}

// ── Beroenden ──
// Finansiell stabilitet 0–100: marginal (kassan mot månadens kostnader), kassans utveckling det senaste året, lån och skuld
export function stabilityParts(G) {
  const burn = Math.max(1, payroll(G) + rentOf(G) + facUpkeep(G) + loanInterest(G));
  const h = G.hist.cash;
  const past = h.length >= 13 ? h[h.length - 13].v : h.length ? h[0].v : G.money;
  const debt = G.loans.reduce((a, l) => a + l.amount, 0);
  const run = clamp(G.money / burn / 12, 0, 1) * 50;
  const trend = clamp((G.money - past) / (burn * 6), -1, 1) * 25;
  const loans = 15 * (1 - clamp(debt / Math.max(1, G.money + debt), 0, 1));
  const ok = G.debtMonths > 0 || G.money < 0 ? 0 : 10;
  return { run, trend, loans, ok, total: Math.round(clamp(run + trend + loans + ok, 0, 100)) };
}
export const stability = (G) => stabilityParts(G).total;

// Koncernens verksamheter (spelutvecklingen och det studion har byggt upp vid sidan av)
export function operations(G) {
  return [
    ['dev', true],
    ['engine', G.engines.length > 0],
    ['pub', !!G.u.flags.publish],
    ['store', !!G.store && !G.store.paused],
    ['live', G.games.some((g) => g.live && !g.live.closed)],
    ['ports', G.games.some((g) => (g.ports || []).length > 0)],
    ['lic', !!(G.fr && G.fr.deals.length)],
    ['mkt', facLevel(G, 'marketing') > 0],
  ].map(([id, on]) => ({ id, on }));
}
export const opsCount = (G) => operations(G).filter((o) => o.on).length;

// Synergierna ett integrerat bolag kan ge, och om verksamheten som behövs finns
export function synergies(G) {
  return [
    { id: 'tech', on: G.engines.length > 0 },
    { id: 'pub', on: !!G.u.flags.publish },
    { id: 'store', on: !!G.store && !G.store.paused },
    { id: 'mkt', on: facLevel(G, 'marketing') > 0 },
    { id: 'cost', on: true },
  ];
}

// ── Ledningens kapacitet ──
export const groupCap = (G) => Math.max(1, G.office.tier - 2) + (canGroup(G) ? 1 : 0);
export const loadOf = (c) => (!c.sub || c.sub.mode === 'free' ? LOAD.free : c.sub.ceo ? LOAD.ceo : LOAD.int);
export const groupLoad = (G) => owned(G).reduce((a, c) => a + loadOf(c), 0);
export const overloaded = (G) => groupLoad(G) > groupCap(G) + 1e-9;
const integSum = (G) => owned(G).reduce((a, c) => a + (c.sub && c.sub.mode === 'int' ? c.sub.integ : 0), 0);

// Din andel av dotterbolagets försäljning
export function shareOf(G, c) {
  const s = c.sub;
  if (!s) return BASE_SHARE;
  if (s.mode !== 'int') return BASE_SHARE;
  return BASE_SHARE + BUDGETS[s.budget].div + s.integ * (SHARE_INT + (G.u.flags.publish ? SHARE_PUB : 0));
}
// Personalstyrkans inverkan: fler anställda släpper större spel och oftare
export const staffF = (G, c) => (c.sub ? clamp(Math.sqrt(c.sub.staff / avgStaff(yearOf(G.t))), 0.5, 2.2) : 1);
// VD:ns ledarskap 0–1: färdigheterna mot årets nivå för nyanställda (tre gånger den nivån räcker hela vägen)
const ceoLevel = (G, st) => clamp((st.design + st.tech) / 2 / skillBase(yearOf(G.t)) / 3, 0, 1);
// ... en skickligare VD ger bättre spel
export const ceoBonus = (G, s) => (s.ceo ? 0.25 * ceoLevel(G, s.ceo) - 0.05 : 0);
// Engångskostnaden för att integrera bolaget: omorganisationen per anställd
export const integCost = (G, c) => Math.round((subOf(G, c).staff * INTEG_PER * wageIndex(yearOf(G.t))) / 1000) * 1000;
// Satsningens kostnad per vecka
export const investWeek = (G, c) => Math.round(subOf(G, c).staff * INVEST * wageIndex(yearOf(G.t)));
// Satsningarna per månad (för finansfönstrets kostnader)
export const groupCostMonth = (G) => owned(G).reduce((a, c) => a + (c.sub && c.sub.mode === 'int' && BUDGETS[c.sub.budget].cost ? investWeek(G, c) * 4 : 0), 0);
// Delade tjänster: andelen av hyra och drift som koncernen sparar
export const costSave = (G) => Math.min(COST_MAX, COST * integSum(G));
// Korspromotion: så mycket mer dina nya spel säljer
export const promoOwn = (G) => (facLevel(G, 'marketing') > 0 ? Math.min(PROMO_OWN_MAX, PROMO_OWN * integSum(G)) : 0);

// Dotterbolagets släpp (från market.js, efter slumpdragningarna): personalen, VD:n och synergierna. Ger [betyg, total].
export function subRelease(G, c, plat, score, total) {
  const s = c.sub;
  if (!s) return [score, total];
  let sc = score + ceoBonus(G, s);
  let tot = total * staffF(G, c);
  if (s.mode === 'int') {
    const k = s.integ;
    if (G.engines.length) sc += TECH * k;
    if (G.store && !G.store.paused && PLATFORM[plat]?.kind === 'pc') tot *= 1 + STORE * G.store.reach * k;
    if (facLevel(G, 'marketing') > 0) tot *= 1 + PROMO * k;
  }
  sc = clamp(Math.round(sc * 10) / 10, 1.8, 9.8);
  return [sc, tot * Math.exp(0.62 * (sc - score))];
}
// ... och när nästa spel kommer: fler anställda släpper oftare
export const subCadence = (G, c, nextT) => G.t + Math.round((nextT - G.t) / clamp(Math.sqrt(staffF(G, c)), 0.75, 1.5));
// Dina egna släpp: korspromotion genom de integrerade bolagen
export function groupRelease(G, game) {
  const p = promoOwn(G);
  if (p <= 0) return;
  game.total *= 1 + p;
  game.groupFeat = p;
}

// ── Veckovis ──
export function groupWeek(G) {
  const subs = owned(G);
  if (!subs.length) return;
  const over = overloaded(G);
  if (over && !G.flags.groupOver) note(G, 'news.groupOver', { studio: G.studio }, 'bad');
  G.flags.groupOver = over;
  for (const c of subs) {
    const s = subOf(G, c);
    const B = BUDGETS[s.mode === 'int' ? s.budget : 1];
    // en satsning växer bolaget mot ungefär fem gånger ett genomsnittligt bolag, sedan planar det ut
    const grow = B.grow > 0 ? B.grow * clamp(1 - s.staff / (avgStaff(yearOf(G.t)) * 5), 0, 1) : B.grow;
    s.staff = clamp(s.staff * Math.pow(1 + grow, 1 / WEEKS_PER_YEAR), 4, 800);
    c.strength = clamp(c.strength + B.str / WEEKS_PER_YEAR - (over ? 0.0015 : 0), 0.45, 1.7);
    if (s.mode !== 'int') continue;
    if (B.cost) {
      const v = investWeek(G, c);
      spend(G, v, 'groupInvest');
      s.inv += v;
      G.stats.groupInv = (G.stats.groupInv || 0) + v;
    }
    if (s.integ >= 1) continue;
    s.integ = over ? Math.max(0, s.integ - 0.01) : Math.min(1, s.integ + 1 / INTEG_WEEKS);
    if (s.integ >= 1 && !s.done) {
      s.done = true;
      note(G, 'news.integrated', { studio: c.name }, 'good');
    }
    // kulturkrock under integrationen: folk slutar och arbetet tar längre tid
    if (s.integ < 1 && rngFor(G, `clash:${c.id}:${G.t}`)() < CLASH * (s.ceo ? 0.5 : 1)) {
      s.staff *= 0.9;
      c.strength = clamp(c.strength - 0.05, 0.45, 1.7);
      s.integ = Math.max(0, s.integ - 0.15);
      note(G, 'news.clash', { studio: c.name }, 'bad');
    }
  }
}

// ── Spelarens val ──
const subById = (G, id) => owned(G).find((c) => c.id === id);
export function canIntegrate(G, id) {
  const c = subById(G, id);
  if (!c || !canGroup(G)) return 'locked';
  if (subOf(G, c).mode === 'int') return 'done';
  if (opsCount(G) < OPS_MIN) return 'ops';
  if (G.money < integCost(G, c)) return 'money';
  return true;
}
export function setMode(G, id, mode) {
  const c = subById(G, id);
  if (!c || !['free', 'int'].includes(mode)) return false;
  const s = subOf(G, c);
  if (s.mode === mode) return false;
  if (mode === 'int') {
    const ok = canIntegrate(G, id);
    if (ok !== true) return ok;
    spend(G, integCost(G, c), 'integration');
    s.mode = 'int';
    note(G, 'news.integrating', { studio: c.name }, 'info');
  } else {
    // tillbaka till självständigt: integrationen och budgeten släpps
    s.mode = 'free';
    s.integ = 0;
    s.done = false;
    s.budget = 1;
  }
  emit('groupMode', c);
  return true;
}
export function setSubBudget(G, id, i) {
  const c = subById(G, id);
  if (!c || !BUDGETS[i] || subOf(G, c).mode !== 'int' || c.sub.budget === i) return false;
  c.sub.budget = i;
  return true;
}
// VD: en av dina anställda (inte grundaren) leder bolaget. Personen lämnar din studio (och lönelistan) tills du kallar hem den.
export const ceoRating = (G, st) => Math.round(ceoLevel(G, st) * 100);
export const ceoCandidates = (G) => G.staff.filter((s) => !s.isFounder).sort((a, b) => b.design + b.tech - (a.design + a.tech));
export function setCeo(G, id, staffId) {
  const c = subById(G, id);
  if (!c || !canGroup(G)) return false;
  const s = subOf(G, c);
  const st = G.staff.find((x) => x.id === staffId);
  if (s.mode !== 'int' || s.ceo || !st || st.isFounder) return false;
  G.staff = G.staff.filter((x) => x.id !== staffId);
  s.ceo = st;
  s.staff += 1;
  note(G, 'news.ceo', { name: st.name, studio: c.name }, 'info');
  emit('staffMoved', st);
  return true;
}
export function recallCeo(G, id) {
  const c = subById(G, id);
  const s = c && c.sub;
  if (!s || !s.ceo) return false;
  if (G.staff.length >= capacity(G)) return 'capacity';
  G.staff.push(s.ceo);
  s.ceo = null;
  s.staff = Math.max(4, s.staff - 1);
  emit('staffMoved', null);
  return true;
}
