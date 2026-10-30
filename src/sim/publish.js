import { clamp } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { INDIES } from '../data/names.js';
import { TOPICS } from '../data/topics.js';
import { GENRES } from '../data/genres.js';
import { PLATFORMS, potential } from '../data/platforms.js';
import { RESEARCH } from '../data/research.js';
import { yearOf, yfOf, priceOf } from './const.js';
import { SALES_TAIL } from './tempo.js';
import { spend, earn } from './studio.js';
import { forecast, curveFor } from './sales.js';
import { randomTitle } from './market.js';
import { note } from './news.js';

// Förlagsverksamhet: små studior skickar in spel (pitchar) som du kan ge ut. Du betalar ett förskott när du skriver
// på och får förlagets andel av försäljningen när spelet släpps. Demon visar bara ett betygsintervall, så varje avtal
// är en chansning: förskottet sätts efter mitten av intervallet, och ett spel i underkant går med förlust. En kampanj
// före släppet ger mer hype. Spelen ligger i G.pub, inte i G.games, och all slump kommer ur fröet (inte G.rng).
export const PUB_SHARE = 0.5; // förlagets andel av försäljningen
export const PUB_SLOTS = 2; // avtal som kan vara på gång samtidigt
const PITCH_EVERY = 8; // veckor mellan nya pitchar
const PITCH_MAX = 3;
const PITCH_LIFE = 12; // veckor en pitch ligger kvar
const ADVANCE = 0.65; // förskottet: andel av förlagets väntade intäkt vid intervallets mitt
const CAMPAIGN = 0.15; // kampanjens pris som andel av förskottet
const CAMPAIGN_HYPE = 25;
const LABEL_FANS = 0.5; // dina fans räknas till hälften för ett spel du bara ger ut

export const canPublish = (G) => !!G.u.flags.publish;
export const pubOf = (G) => G.pub || { pitches: [], deals: [], next: 0 };
export const activeDeals = (G) => pubOf(G).deals.filter((d) => !d.out);

const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:pub:${key}`));

// Förlagets väntade intäkt för ett spel med betyget score och hypen hype, släppt i dag
function expectedShare(G, p, score, hype) {
  const game = { t: G.t, platform: p.platform, score, scope: p.scope, hype, audience: 'everyone', topic: p.topic, genre: p.genre, crowd: 1, salesMult: 1 };
  return PUB_SHARE * forecast(G, game, { noise: false, fans: G.fans * LABEL_FANS });
}

function makePitch(G) {
  const r = rngFor(G, 'pitch:' + G.t);
  const ri = (n) => Math.floor(r() * n);
  const year = yearOf(G.t);
  const yf = yfOf(G.t);
  const plats = PLATFORMS.filter((p) => !p.own && potential(p, yf) > 6);
  let w = r() * plats.reduce((a, p) => a + potential(p, yf), 0);
  const plat = plats.find((p) => (w -= potential(p, yf)) <= 0) || plats[0];
  const topics = TOPICS.filter((x) => x.start || RESEARCH.some((q) => (q.unlock.topics || []).includes(x.id) && q.year <= year));
  const topic = topics[ri(topics.length)];
  const genre = GENRES[ri(GENRES.length)];
  const scopes = year >= 1996 ? ['small', 'medium', 'medium', 'large'] : ['small', 'medium', 'medium'];
  const scope = scopes[ri(scopes.length)];
  const [studio, color] = INDIES[ri(INDIES.length)];
  // sant betyg, och ett demointervall runt det: smalare för en studio som verkar ha koll
  const q = Math.round(clamp(4.2 + r() * 3 + r() * 2.4, 3, 9.6) * 10) / 10;
  const u = [0.6, 1, 1.4][ri(3)];
  const mid = clamp(q + (r() * 2 - 1) * u * 0.8, 2, 9.8);
  const lo = Math.round(clamp(mid - u, 1, 10) * 10) / 10;
  const hi = Math.round(clamp(mid + u, 1, 10) * 10) / 10;
  const weeks = { small: 8, medium: 14, large: 24 }[scope] + ri(8);
  const taken = new Set(pubOf(G).deals.map((d) => d.title?.en || d.title));
  const title = randomTitle(r, topic.id, taken);
  const p = { id: G.uid++, studio, color, title, topic: topic.id, genre: genre.id, platform: plat.id, scope, q, lo, hi, weeks, until: G.t + PITCH_LIFE, seen: false };
  p.advance = Math.max(1000, Math.round((expectedShare(G, p, (lo + hi) / 2, 15) * ADVANCE) / 100) * 100);
  return p;
}

export function canSign(G, id) {
  if (!canPublish(G)) return 'locked';
  const p = pubOf(G).pitches.find((x) => x.id === id);
  if (!p) return 'gone';
  if (activeDeals(G).length >= PUB_SLOTS) return 'full';
  if (G.money < p.advance) return 'money';
  return true;
}
export function signPitch(G, id) {
  const ok = canSign(G, id);
  if (ok !== true) return ok === 'money' ? t('err.money') : ok === 'full' ? t('pub.full') : false;
  const P = G.pub;
  const i = P.pitches.findIndex((x) => x.id === id);
  const p = P.pitches.splice(i, 1)[0];
  spend(G, p.advance, 'publishing');
  P.deals.push({ ...p, t0: G.t, rel: G.t + p.weeks, hype: 15, campaign: false, out: false });
  emit('pubSign', p);
  return true;
}

export const campaignCost = (d) => Math.round((d.advance * CAMPAIGN) / 100) * 100;
export function runCampaign(G, id) {
  const d = activeDeals(G).find((x) => x.id === id);
  if (!d || d.campaign) return false;
  const c = campaignCost(d);
  if (G.money < c) return t('err.money');
  spend(G, c, 'publishing');
  d.campaign = true;
  d.cost = (d.cost || 0) + c;
  d.hype += CAMPAIGN_HYPE;
  return true;
}

function release(G, d) {
  const r = rngFor(G, 'rel:' + d.id);
  d.out = true;
  d.t = G.t;
  d.score = d.q;
  d.total = expectedShare(G, d, d.score, d.hype) * clamp(0.85 + r() * 0.3, 0.85, 1.15);
  d.priceAt = priceOf(yearOf(G.t));
  d.tail = SALES_TAIL;
  Object.assign(d, { revenue: 0, units: 0, weekly: [], ended: false });
  G.stats.published = (G.stats.published || 0) + 1;
  G.stats.pubCost = (G.stats.pubCost || 0) + d.advance + (d.cost || 0);
  note(G, 'news.pubRelease', { title: d.title, studio: d.studio, v: d.score.toFixed(1) }, d.score >= 7.5 ? 'good' : d.score < 5.5 ? 'bad' : 'info');
  emit('pubRelease', d);
}

// Veckovis: nya pitchar, gamla försvinner, avtal släpps och de utgivna spelen säljer (förlagets andel).
export function pubWeek(G) {
  if (!canPublish(G)) return;
  const P = G.pub || (G.pub = { pitches: [], deals: [], next: G.t });
  P.pitches = P.pitches.filter((p) => p.until > G.t);
  if (G.t >= P.next) {
    P.next = G.t + PITCH_EVERY;
    if (P.pitches.length < PITCH_MAX) {
      const p = makePitch(G);
      P.pitches.push(p);
      if (p.hi >= 8.5) note(G, 'news.pitch', { studio: p.studio, title: p.title }, 'info');
    }
  }
  for (const d of P.deals) {
    if (!d.out) {
      if (G.t >= d.rel) release(G, d);
      continue;
    }
    if (d.ended) continue;
    const w = G.t - d.t - 1;
    const curve = curveFor(d.score, d.tail || 1);
    if (w < 0) continue;
    if (w >= curve.length) {
      d.ended = true;
      continue;
    }
    const rev = d.total * curve[w];
    d.weekly.push(rev);
    d.revenue += rev;
    const units = rev / PUB_SHARE / d.priceAt;
    d.units += units;
    earn(G, rev, 'publishing');
    G.stats.pubRev = (G.stats.pubRev || 0) + rev;
    G.stats.revenue += rev;
    const df = units * (d.score - 5.2) * 0.003;
    G.fans = Math.max(0, G.fans + (df < 0 ? Math.max(df, -G.fans * 0.003) : df));
    if (w > 14 && rev < d.total * 0.0012) d.ended = true;
  }
  // historiken: bara de 30 senaste utgivna spelen sparas
  const out = P.deals.filter((d) => d.out);
  if (out.length > 30) P.deals.splice(P.deals.indexOf(out[0]), 1);
}

// Förlagets resultat hittills för de utgivna spelen: deras intäkter minus deras förskott och kampanjer
export const labelProfit = (G) => (G.stats.pubRev || 0) - (G.stats.pubCost || 0);
