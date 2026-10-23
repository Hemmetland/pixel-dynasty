import { clamp } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { PARTNERS } from '../data/names.js';
import { yearOf, WEEKS_PER_YEAR } from './const.js';
import { earn } from './studio.js';
import { portRevenue } from './ports.js';
import { note } from './news.js';

// Spelserier och licensaffärer: ett spel med minst en uppföljare är en serie. Med forskningen Licensavdelning kommer
// erbjudanden från andra branscher för de serier som går bra: leksaker och prylar (förskott och royalty i två år),
// serietidningar och böcker (litet förskott, fler fans och hype till nästa spel) och från 1993 film (stort förskott;
// filmbolaget har ett rykte men ingen vet hur bra filmen blir, och den påverkar fansen och seriens nästa spel åt båda
// hållen). En serie har ett avtal åt gången. Allt ligger i G.fr och all slump kommer ur fröet (inte G.rng).
export const FR_KINDS = {
  merch: { year: 1984, up: 0.025, roy: 0.07, weeks: 96, hype: 3, ic: 'sparkle' },
  comic: { year: 1984, up: 0.012, weeks: 48, fans: 0.03, hype: 6, ic: 'book' },
  film: { year: 1993, up: 0.05, weeks: 80, ic: 'film' },
};
const OFFER_EVERY = 14; // veckor mellan nya erbjudanden
const OFFER_MAX = 2;
const OFFER_LIFE = 12;
const RECENT = 6; // år: en serie vars senaste spel är äldre än så lockar inga erbjudanden
const ROY_DECAY = 0.97; // royaltyn avtar vecka för vecka
const HYPE_CAP = 30;
const OFFER_NEWS = { merch: 'news.frOffer.merch', comic: 'news.frOffer.comic', film: 'news.frOffer.film' };

export const canFranchise = (G) => !!G.u.flags.merch;
export const frOf = (G) => G.fr || { offers: [], deals: [], hype: {}, next: 0 };
const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:fr:${key}`));
const gameRev = (g) => g.revenue + (g.live ? g.live.rev || 0 : 0) + portRevenue(g);

// Seriens första spel (följ uppföljarna bakåt)
export function rootOf(G, g) {
  let r = g;
  for (let i = 0; i < 60 && r && r.sequelOf; i++) {
    const p = G.games.find((x) => x.id === r.sequelOf);
    if (!p) break;
    r = p;
  }
  return r;
}

// Alla serier (minst två spel), störst först: spelen i ordning, intäkter, snittbetyg, bästa och senaste spelet
export function seriesList(G) {
  const byRoot = new Map();
  for (const g of G.games) {
    if (g.expansionOf) continue;
    const r = rootOf(G, g);
    if (!byRoot.has(r.id)) byRoot.set(r.id, []);
    byRoot.get(r.id).push(g);
  }
  const out = [];
  for (const [id, games] of byRoot) {
    if (games.length < 2) continue;
    games.sort((a, b) => a.t - b.t);
    const revenue = games.reduce((a, g) => a + gameRev(g), 0);
    const avg = games.reduce((a, g) => a + g.score, 0) / games.length;
    out.push({ id, root: games[0], games, revenue, avg, best: Math.max(...games.map((g) => g.score)), last: games[games.length - 1] });
  }
  return out.sort((a, b) => b.revenue - a.revenue);
}

// Det avtalet räknas på: seriens intäkter, mindre värda ju längre sedan det senaste spelet kom
function base(G, s) {
  const age = (G.t - s.last.t) / WEEKS_PER_YEAR;
  return s.revenue * clamp(1 - age / RECENT, 0.3, 1);
}

export const activeDeal = (G, sid) => frOf(G).deals.find((d) => d.series === sid && !d.done);
export const seriesHype = (G, sid) => frOf(G).hype[sid] || 0;

// Seriens sparade hype (från serietidningar, prylar och filmer) går till nästa spel i serien när det startar
export function takeSeriesHype(G, prev) {
  if (!G.fr || !prev) return 0;
  const sid = rootOf(G, prev).id;
  const h = G.fr.hype[sid] || 0;
  delete G.fr.hype[sid];
  return h;
}
// Ett spel i serien som redan är på gång får hypen direkt, annars sparas den till nästa
function addHype(G, sid, h) {
  const J = G.job;
  const prev = J && J.sequelOf ? G.games.find((g) => g.id === J.sequelOf) : null;
  if (prev && rootOf(G, prev).id === sid) J.hype = clamp(J.hype + h, 0, 100);
  else G.fr.hype[sid] = clamp((G.fr.hype[sid] || 0) + h, -HYPE_CAP, HYPE_CAP);
}

function makeOffer(G, list) {
  const r = rngFor(G, 'offer:' + G.t);
  const year = yearOf(G.t);
  const open = new Set(G.fr.offers.map((o) => o.series));
  const ok = list.filter((s) => s.best >= 7 && G.t - s.last.t <= RECENT * WEEKS_PER_YEAR && !activeDeal(G, s.id) && !open.has(s.id));
  if (!ok.length) return null;
  let w = r() * ok.reduce((a, s) => a + Math.sqrt(s.revenue), 0);
  const s = ok.find((x) => (w -= Math.sqrt(x.revenue)) <= 0) || ok[0];
  // film för de bästa serierna, annars prylar eller serietidning
  const kinds = Object.keys(FR_KINDS).filter((k) => FR_KINDS[k].year <= year);
  const kind = kinds.includes('film') && s.avg >= 7.5 && r() < 0.45 ? 'film' : r() < 0.6 ? 'merch' : 'comic';
  const K = FR_KINDS[kind];
  const [partner, color, q0] = PARTNERS[kind][Math.floor(r() * PARTNERS[kind].length)];
  const b = base(G, s);
  const o = { id: G.uid++, series: s.id, title: s.root.title, kind, partner, color, until: G.t + OFFER_LIFE, seen: false };
  o.up = Math.max(1000, Math.round((b * K.up * (0.85 + r() * 0.3)) / 100) * 100);
  if (K.roy) o.roy = Math.round((b * K.roy * (0.85 + r() * 0.3)) / 100) * 100;
  if (kind === 'film') {
    // filmens sanna betyg och bolagets rykte runt det, som förlagets demointervall
    const q = Math.round(clamp(q0 + (r() * 2 - 1) * 1.6 + (s.avg - 7.5) * 0.4, 2, 9.6) * 10) / 10;
    const u = [0.8, 1.2, 1.6][Math.floor(r() * 3)];
    const mid = clamp(q + (r() * 2 - 1) * u * 0.8, 2, 9.6);
    Object.assign(o, { q, lo: Math.round(clamp(mid - u, 1, 10) * 10) / 10, hi: Math.round(clamp(mid + u, 1, 10) * 10) / 10 });
  }
  return o;
}

export function canAccept(G, id) {
  if (!canFranchise(G)) return 'locked';
  const o = frOf(G).offers.find((x) => x.id === id);
  if (!o) return 'gone';
  if (activeDeal(G, o.series)) return 'busy';
  return true;
}
export function acceptOffer(G, id) {
  const ok = canAccept(G, id);
  if (ok !== true) return ok === 'busy' ? t('fr.busy') : false;
  const F = G.fr;
  const o = F.offers.splice(F.offers.findIndex((x) => x.id === id), 1)[0];
  const K = FR_KINDS[o.kind];
  // ett erbjudande för samma serie kan inte tas samtidigt: de andra försvinner
  F.offers = F.offers.filter((x) => x.series !== o.series);
  const d = { ...o, t0: G.t, until: G.t + K.weeks, paid: 0, done: false };
  earn(G, o.up, 'licensing');
  G.stats.licRev = (G.stats.licRev || 0) + o.up;
  G.stats.revenue += o.up;
  if (K.fans) G.fans += G.fans * K.fans;
  if (K.hype) addHype(G, o.series, K.hype);
  F.deals.push(d);
  emit('frDeal', d);
  return true;
}
export function declineOffer(G, id) {
  const F = G.fr;
  if (!F) return false;
  F.offers = F.offers.filter((x) => x.id !== id);
  return true;
}

// Filmen har premiär: betyget avgör biointäkter, fans och hype till seriens nästa spel
function premiere(G, d, s) {
  const q = d.q;
  const box = q > 5 && s ? Math.round((base(G, s) * 0.04 * (q - 5)) / 3) : 0;
  if (box > 0) {
    earn(G, box, 'licensing');
    G.stats.licRev = (G.stats.licRev || 0) + box;
    G.stats.revenue += box;
  }
  const df = G.fans * clamp(0.02 * (q - 5.5), -0.06, 0.08);
  G.fans = Math.max(0, G.fans + df);
  addHype(G, d.series, clamp((q - 5.5) * 6, -15, 24));
  Object.assign(d, { box, fans: Math.round(df) });
  G.stats.films = (G.stats.films || 0) + 1;
  G.stats.bestFilm = Math.max(G.stats.bestFilm || 0, q);
  note(G, q >= 7 ? 'news.filmGood' : q < 5 ? 'news.filmBad' : 'news.filmOk', { title: d.title, studio: d.partner, v: q.toFixed(1) }, q >= 7 ? 'good' : q < 5 ? 'bad' : 'info');
  emit('frFilm', d);
}

// Veckovis: nya erbjudanden, gamla försvinner, royalty från prylarna och filmpremiärer
export function frWeek(G) {
  if (!canFranchise(G)) return;
  const F = G.fr || (G.fr = { offers: [], deals: [], hype: {}, next: G.t });
  F.offers = F.offers.filter((o) => o.until > G.t && G.games.some((g) => g.id === o.series));
  const list = F.deals.some((d) => !d.done) || G.t >= F.next ? seriesList(G) : [];
  if (G.t >= F.next) {
    F.next = G.t + OFFER_EVERY;
    const o = F.offers.length < OFFER_MAX ? makeOffer(G, list) : null;
    if (o) {
      F.offers.push(o);
      note(G, OFFER_NEWS[o.kind], { studio: o.partner, title: o.title }, 'info');
    }
  }
  for (const d of F.deals) {
    if (d.done) continue;
    if (d.roy) {
      // royaltyn avtar: summan över avtalets veckor blir d.roy
      const w = G.t - d.t0;
      const K = FR_KINDS[d.kind];
      const v = (d.roy * (1 - ROY_DECAY) * Math.pow(ROY_DECAY, w - 1)) / (1 - Math.pow(ROY_DECAY, K.weeks));
      d.paid += v;
      earn(G, v, 'licensing');
      G.stats.licRev = (G.stats.licRev || 0) + v;
      G.stats.revenue += v;
    }
    if (G.t >= d.until) {
      d.done = true;
      if (d.kind === 'film') premiere(G, d, list.find((s) => s.id === d.series));
    }
  }
  // historiken: bara de 20 senaste avslutade avtalen sparas
  const done = F.deals.filter((d) => d.done);
  if (done.length > 20) F.deals.splice(F.deals.indexOf(done[0]), 1);
}

// Licensaffärernas samlade intäkter
export const licIncome = (G) => G.stats.licRev || 0;
