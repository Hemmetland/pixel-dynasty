import { clamp } from '../core/util.js';
import { FEATURES } from '../data/research.js';
import { RES } from '../data/research.js';
import { SCOPE_TEMPO, REVENUE_PER_TEMPO } from './tempo.js';

export const START_YEAR = 1980;
export const TICKS_PER_WEEK = 4;
export const WEEKS_PER_MONTH = 4;
export const WEEKS_PER_YEAR = 48;

// Projektens längd i veckor och intäkt per spel följer tempot (se tempo.js). Ett litet första spel blir 27 veckor = ca 65 s i hastighet 1.
const dw = (weeks, id) => Math.round(weeks * SCOPE_TEMPO[id]);
// Intäktsmultiplikator per storlek, kompenserad för projektets längd (se tempo.js).
const rv = (rev, id) => Math.round(rev * SCOPE_TEMPO[id] * REVENUE_PER_TEMPO[id] * 100) / 100;

export const SCOPES = {
  small: { id: 'small', idx: 0, minTier: 1, weeks: dw(12, 'small'), polish: dw(3, 'small'), par: 7.5, team: 2, rev: rv(1, 'small'), bugs: 12, name: { sv: 'Liten', en: 'Small' },
    desc: { sv: 'Snabbt, billigt och lagom för en liten grupp.', en: 'Quick, cheap and right-sized for a tiny crew.' } },
  medium: { id: 'medium', idx: 1, minTier: 1, weeks: dw(20, 'medium'), polish: dw(4, 'medium'), par: 36, team: 5, rev: rv(3.2, 'medium'), bugs: 30, name: { sv: 'Medel', en: 'Medium' },
    desc: { sv: 'Ett riktigt spel med lite mer ambition.', en: 'A proper game with some ambition.' } },
  large: { id: 'large', idx: 2, minTier: 2, weeks: dw(32, 'large'), polish: dw(6, 'large'), par: 160, team: 12, rev: rv(11, 'large'), bugs: 80, name: { sv: 'Stor', en: 'Large' },
    desc: { sv: 'Kräver ett riktigt team men kan sälja i massor.', en: 'Needs a real team but can sell by the millions.' } },
  aaa: { id: 'aaa', idx: 3, minTier: 3, weeks: dw(52, 'aaa'), polish: dw(10, 'aaa'), par: 450, team: 36, rev: rv(38, 'aaa'), bugs: 220, name: { sv: 'AAA', en: 'AAA' },
    desc: { sv: 'Branschens största satsning. Stort team, stor risk.', en: 'The industry\'s biggest bet. Big team, big risk.' } },
};
export const SCOPE_IDS = ['small', 'medium', 'large', 'aaa'];

export const AUDIENCES = [
  { id: 'young', v: -1, reach: 0.82, name: { sv: 'Barn & unga', en: 'Kids & Teens' } },
  { id: 'everyone', v: 0, reach: 1.0, name: { sv: 'Alla', en: 'Everyone' } },
  { id: 'mature', v: 1, reach: 0.9, name: { sv: 'Vuxna', en: 'Mature' } },
];
export const AUD = Object.fromEntries(AUDIENCES.map((a) => [a.id, a]));

// Datum
export function dateOf(t) {
  const year = START_YEAR + Math.floor(t / WEEKS_PER_YEAR);
  const w = t % WEEKS_PER_YEAR;
  return { year, month: Math.floor(w / WEEKS_PER_MONTH), week: w % WEEKS_PER_MONTH, yf: year + w / WEEKS_PER_YEAR };
}
export const yearOf = (t) => START_YEAR + Math.floor(t / WEEKS_PER_YEAR);
export const yfOf = (t) => START_YEAR + t / WEEKS_PER_YEAR;
export const tOf = (year, month = 0, week = 0) => (year - START_YEAR) * WEEKS_PER_YEAR + month * WEEKS_PER_MONTH + week;

// Ekonomi: allt som kostar följer löneinflationen.
export const wageIndex = (year) => Math.pow(1.052, year - START_YEAR);
export const priceOf = (year) => 22 + (year - START_YEAR) * 0.85;
// Hur mycket "ett bra spel" kostar att göra, i nuvarande pengar (för marknadsföring m.m.).
export const moneyScale = (year) => Math.pow(1.058, year - START_YEAR);

// Motorbehov: summa av teknikvärdet som en "modern" motor ungefär bör ha.
const FEAT_YEAR = {};
for (const r of Object.values(RES)) for (const f of r.unlock.feats || []) FEAT_YEAR[f] = r.year;
export function engineNeed(year) {
  let s = 0;
  for (const f of FEATURES) {
    const y = f.start ? START_YEAR : FEAT_YEAR[f.id] ?? 2100;
    if (y <= year) s += f.tech;
  }
  return Math.max(4, s * 0.65);
}
export function engineEff(engine, yf) {
  if (!engine) return 0;
  const age = Math.max(0, yf - engine.built);
  return engine.tech * clamp(1 - age * 0.06, 0.35, 1);
}
// cap: taket för hur mycket bättre än behovet motorn räknas (högre för ett eget spel på den egna plattformen)
export function engineMult(engine, yf, cap = 1.4) {
  if (!engine) return 1;
  const ratio = clamp(engineEff(engine, yf) / engineNeed(Math.floor(yf)), 0, cap);
  return 1 + ratio * 0.3;
}
