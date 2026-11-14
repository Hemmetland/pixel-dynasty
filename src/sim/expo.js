import { clamp, fmtNum } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { yearOf, priceOf, SCOPES } from './const.js';
import { spend, earn } from './studio.js';
import { promoPrice, hypeGain } from './dev.js';
import { note } from './news.js';
import { liveGames } from './live.js';
import { scoreOf } from './hardware.js';

// Spelmässan: varje maj, efter forskningen Mässmonter. Spelaren väljer storlek på monter och vad som ska visas upp (ett
// pågående spel, nyligen släppta spel som ännu säljer, egna hårdvaruprodukter, ett onlinespel). Besökarna avgörs av
// mässans storlek det året, monterns storlek och hur starkt det som visas är; de ger fans och intäkter på plats, hype åt
// det pågående spelet, ett försäljningslyft på visade spel i åtta veckor och efterfrågan på visad hårdvara. All slump
// kommer ur fröet och året (aldrig G.rng), och att hoppa över mässan rör ingenting.
export const BOOTHS = [
  null,
  { id: 1, slots: 1, base: 1500, share: 0.0075, hall: 0.05, hype: 9, show: 0.7 },
  { id: 2, slots: 2, base: 3500, share: 0.012, hall: 0.1, hype: 14, show: 1 },
  { id: 3, slots: 3, base: 6000, share: 0.02, hall: 0.18, hype: 20, show: 1.4 },
];
export const EXPO_LIFT_WEEKS = 8;
// Besökare på hela mässan: 3 000 år 1983, med 7,5 % tillväxt per år
export const expoAttendance = (year) => Math.round(3000 * Math.pow(1.075, Math.max(0, year - 1983)));
export function expoCost(G, level) {
  const B = BOOTHS[level];
  return B ? Math.round(promoPrice(G, B.base, B.share) / 50) * 50 : 0;
}

export function expoOffer(G) {
  if (!G.u.flags.expo) return false;
  G.pending.push({ type: 'expo', id: G.uid++ });
  return true;
}

// Styrkan hos det som visas, 0–1
const gameQ = (g) => clamp((g.score - 5.5) / 4, 0, 1);
function devQ(G, J) {
  const gs = G.games.slice(-3);
  const avg = gs.length ? gs.reduce((s, g) => s + g.score, 0) / gs.length : 6;
  return clamp(0.25 + (0.5 * J.hype) / 100 + (avg - 6) / 10, 0.1, 1);
}
const hwQ = (G, P) => clamp((scoreOf(G, P) - 5.5) / 4, 0, 1);
export const itemKey = (x) => x.k + ':' + x.id;

// Det som går att visa upp just nu, med styrka (q)
export function expoItems(G) {
  const out = [];
  const J = G.job;
  if (J && J.kind === 'game' && J.state === 'dev') out.push({ k: 'dev', id: J.id, q: devQ(G, J), name: J.title });
  const selling = G.games.filter((g) => !g.ended && !g.live && !g.expansionOf).sort((a, b) => b.t - a.t).slice(0, 4);
  for (const g of selling) out.push({ k: 'game', id: g.id, q: gameQ(g), name: g.title });
  const ps = ((G.hw && G.hw.products) || []).filter((p) => p.state === 'market').slice(0, 3);
  for (const P of ps) out.push({ k: 'hw', id: P.id, q: hwQ(G, P), name: P.name, type: P.type });
  const lg = liveGames(G).sort((a, b) => b.live.subs - a.live.subs)[0];
  if (lg) out.push({ k: 'live', id: lg.id, q: clamp(lg.live.fresh / 100, 0, 1), name: lg.title });
  return out;
}
// Förslag: de starkaste sakerna (det pågående spelet väger lite extra, det bygger hype)
export function defaultPicks(items, slots) {
  return items
    .map((x) => ({ x, v: x.q + (x.k === 'dev' ? 0.3 : 0) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, slots)
    .map((e) => e.x);
}
export function expoBuzz(G, picks) {
  const q = picks.length ? picks.reduce((a, x) => a + x.q, 0) / picks.length : 0.3;
  return 0.6 + 0.9 * q + 0.14 * Math.log10(1 + G.fans / 150);
}
// Väntade besökare och kostnad för en monter och ett urval (för planeringsvyn)
export function expoForecast(G, level, picks) {
  const B = BOOTHS[level];
  const att = expoAttendance(yearOf(G.t));
  const buzz = expoBuzz(G, picks);
  return { attendance: att, buzz, visitors: Math.round(att * B.hall * buzz), cost: expoCost(G, level) };
}

// Genomför mässan. ids = nycklar (itemKey) för det som visas, annars förslaget. Resultatet läggs i G.expoLast.
export function resolveExpo(G, promptId, level, ids) {
  const i = G.pending.findIndex((p) => p.id === promptId && p.type === 'expo');
  if (i < 0) return false;
  const B = BOOTHS[level];
  if (!B) {
    G.pending.splice(i, 1);
    return true;
  }
  const cost = expoCost(G, level);
  if (G.money < cost) return t('err.money'); // prompten ligger kvar så att ett annat val går att göra
  const all = expoItems(G);
  const picks = (ids ? ids.map((k) => all.find((x) => itemKey(x) === k)).filter(Boolean) : defaultPicks(all, B.slots)).slice(0, B.slots);
  G.pending.splice(i, 1);
  spend(G, cost, 'marketing');
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  if (J) J.cost += cost;
  G.expoLast = runExpo(G, B, picks, cost);
  const r = G.expoLast;
  note(G, 'news.expo', { year: r.year, n: fmtNum(r.visitors), fans: fmtNum(r.fans) }, 'good', true);
  emit('expoDone', { level, visitors: r.visitors });
  return true;
}

function runExpo(G, B, picks, cost) {
  const year = yearOf(G.t);
  const rng = seeded(hashStr(`${G.seed || 0}:expo:${year}`));
  const att = expoAttendance(year);
  const buzz = expoBuzz(G, picks);
  const visitors = Math.max(20, Math.round(att * B.hall * buzz * (0.88 + 0.24 * rng())));
  const q = picks.length ? picks.reduce((a, x) => a + x.q, 0) / picks.length : 0.3;
  const lines = [{ k: 'open', n: fmtNum(att) }];
  const items = [];
  let fanBonus = 0;
  let fanLoss = 0;
  for (const x of picks) {
    const row = { k: x.k, id: x.id, name: x.name, q: x.q };
    if (x.k === 'dev') {
      const J = G.job;
      const ratio = J ? J.bugs / SCOPES[J.scope].bugs : 0;
      if (J && rng() < clamp((ratio - 0.5) * 0.8, 0, 0.5)) {
        J.hype = Math.max(0, J.hype - 5);
        row.crash = true;
        fanLoss += 0.3;
        lines.push({ k: 'crash', title: x.name });
      } else if (J) {
        row.hype = hypeGain(J.hype, B.hype * clamp(buzz, 0.8, 1.4));
        J.hype = Math.min(100, J.hype + row.hype);
        lines.push({ k: 'demo', title: x.name });
      }
    } else if (x.k === 'game') {
      const g = G.games.find((y) => y.id === x.id);
      if (g) {
        let lift = (0.05 + 0.12 * x.q) * B.show * clamp(buzz, 0.7, 1.5);
        if (rng() < 0.12 + 0.2 * x.q) {
          row.viral = true;
          lift *= 2;
          fanBonus += 0.5;
          lines.push({ k: 'viral', title: x.name });
        } else lines.push({ k: 'sold', title: x.name });
        row.lift = lift;
        g.expo = { until: G.t + EXPO_LIFT_WEEKS, mult: 1 + lift };
      }
    } else if (x.k === 'hw') {
      const P = ((G.hw && G.hw.products) || []).find((y) => y.id === x.id);
      if (P) {
        row.lift = 0.07 * B.show * clamp(buzz, 0.8, 1.4);
        P.boost = Math.min(0.3, (P.boost || 0) + row.lift);
        lines.push({ k: 'hw', name: x.name, n: fmtNum(Math.round(visitors * 0.6)) });
      }
    } else if (x.k === 'live') {
      const g = G.games.find((y) => y.id === x.id);
      if (g && g.live) {
        row.fresh = Math.round(6 * B.show);
        g.live.fresh = Math.min(100, g.live.fresh + row.fresh);
        lines.push({ k: 'live', title: x.name });
      }
    }
    items.push(row);
  }
  // rivalernas montrar: namn till hallens vy och en rad om vad en av dem visar
  const comps = (G.comps || []).filter((c) => !c.owned);
  const rival = comps.length ? comps[Math.floor(rng() * comps.length)] : null;
  const last = rival ? G.market.releases.filter((r) => r.comp === rival.id && r.t <= G.t).slice(-1)[0] : null;
  if (rival) lines.push(last && last.title ? { k: 'rival', studio: rival.name, title: last.title } : { k: 'rival0', studio: rival.name });
  if (visitors > att * B.hall * 1.25) lines.splice(1, 0, { k: 'queue' });
  if (year >= 2010 && G.fans > 20000 && rng() < 0.5) lines.push({ k: 'streamer' });
  if (buzz > 1.5) lines.push({ k: 'press' });
  lines.push({ k: 'close', n: fmtNum(visitors) });
  const fans = Math.round(visitors * 0.1 * (0.6 + 0.8 * q) * (1 + fanBonus) * (1 - Math.min(0.6, fanLoss)));
  const revenue = Math.round(visitors * priceOf(year) * 0.2 * (0.5 + q));
  G.fans += fans;
  earn(G, revenue, 'events');
  return { year, level: B.id, cost, attendance: att, visitors, fans, revenue, buzz, items, lines, rivals: comps.slice(0, 6).map((c) => ({ name: c.name, color: c.color })), t: G.t };
}
