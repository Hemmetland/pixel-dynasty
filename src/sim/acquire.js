import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { yearOf, WEEKS_PER_YEAR } from './const.js';
import { spend, earn } from './studio.js';
import { curveFor } from './sales.js';
import { note } from './news.js';

// Uppköp: med forskningen Uppköp kan studion köpa en konkurrent. Den fortsätter släppa spel som förut (samma slumpföljd),
// men som dotterbolag: du får SUB_SHARE av försäljningen av spelen den släpper efter köpet, och dess släpp krockar inte
// längre med dina (se crowding i market.js). Priset sätts efter studions försäljning de senaste åren och dess styrka.
// Några konkurrenter blir alltid kvar (ACQ_MAX).
export const ACQ_MAX = 4;
export const SUB_SHARE = 0.35;
const PRICE_YEARS = 4; // år av försäljning som värderas
const PRICE_MULT = 7; // gånger årsförsäljningen

export const canAcquireAny = (G) => !!G.u.flags.acquire;
export const ownedComps = (G) => (G.comps || []).filter((c) => c.owned);

// Konkurrentens försäljning per år de senaste PRICE_YEARS åren (spelens väntade totalförsäljning)
export function compYearly(G, c) {
  const from = G.t - PRICE_YEARS * WEEKS_PER_YEAR;
  return G.market.releases.filter((r) => r.comp === c.id && r.t >= from).reduce((a, r) => a + r.total, 0) / PRICE_YEARS;
}

// Priset: årsförsäljningen (minst hälften av snittet bland konkurrenterna) gånger PRICE_MULT, mer för en stark studio
export function acqPrice(G, c) {
  const all = (G.comps || []).map((x) => compYearly(G, x));
  const avg = all.length ? all.reduce((a, v) => a + v, 0) / all.length : 0;
  const v = Math.max(compYearly(G, c), avg * 0.5) * PRICE_MULT * (0.7 + 0.3 * c.strength);
  return Math.max(10000, Math.round(v / 1000) * 1000);
}

export function canAcquire(G, id) {
  if (!canAcquireAny(G)) return 'locked';
  const c = (G.comps || []).find((x) => x.id === id);
  if (!c) return 'gone';
  if (c.owned) return 'owned';
  if (ownedComps(G).length >= ACQ_MAX) return 'max';
  if (G.money < acqPrice(G, c)) return 'money';
  return true;
}

export function acquire(G, id) {
  const ok = canAcquire(G, id);
  if (ok !== true) return ok === 'money' ? t('err.money') : ok === 'max' ? t('acq.max', { n: ACQ_MAX }) : false;
  const c = G.comps.find((x) => x.id === id);
  const price = acqPrice(G, c);
  spend(G, price, 'acquisitions');
  Object.assign(c, { owned: true, ownedT: G.t, paid: price, subRev: 0 });
  G.stats.acquired = (G.stats.acquired || 0) + 1;
  note(G, 'news.acquired', { studio: c.name, v: yearOf(G.t) }, 'good');
  emit('acquired', c);
  return true;
}

// Veckovis: dotterbolagens spel (släppta efter köpet) säljer med samma kurva som på topplistan, och du får din andel
export function subWeek(G) {
  if (!ownedComps(G).length) return;
  const own = new Map(ownedComps(G).map((c) => [c.id, c]));
  for (const r of G.market.releases) {
    const c = own.get(r.comp);
    if (!c || r.t < c.ownedT) continue;
    const w = G.t - r.t;
    const curve = curveFor(r.score, r.tail || 1);
    if (w < 0 || w >= curve.length) continue;
    const rev = r.total * curve[w] * SUB_SHARE;
    c.subRev += rev;
    earn(G, rev, 'subsidiaries');
    G.stats.subRev = (G.stats.subRev || 0) + rev;
    G.stats.revenue += rev;
  }
}

// Dotterbolagens samlade intäkter och vad de har kostat
export const subIncome = (G) => G.stats.subRev || 0;
