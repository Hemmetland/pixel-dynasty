import { clamp } from '../core/util.js';
import { gauss, hashStr } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { PLATFORM, PLATFORMS, platTier } from '../data/platforms.js';
import { yearOf, priceOf, WEEKS_PER_YEAR } from './const.js';
import { SALES_TAIL } from './tempo.js';
import { spend, earn } from './studio.js';
import { platformOpen } from './dev.js';
import { platFit } from './score.js';
import { forecast, curveFor } from './sales.js';
import { note } from './news.js';

// Porteringar: ett externt team för över ett släppt spel till en annan plattform som studion har licens för. Teamet
// jobbar vid sidan av studions eget projekt, ett spel i taget. Porten säljer till den nya plattformens publik, men spelet
// är redan känt (ingen ny hype, inga uppföljarfans) och åldras: grafiken ser daterad ut några år senare, och en svagare
// maskin kräver nedskärningar. Porterna ligger på originalet (g.ports), inte i G.games, så de räknas inte som nya spel.
export const PORT_WEEKS = { small: 6, medium: 10, large: 16, aaa: 24 };
const PORT_COST = { small: 4000, medium: 35000, large: 240000, aaa: 800000 };
// Andelen av ett nytt spels försäljning; varje tidigare port av samma spel tar 20 % till (köparna har redan spelet).
export const PORT_MULT = 0.25;
const AGE_LOSS = 0.3; // betyg per år efter det första
const DOWN_LOSS = 0.7; // betyg per teknisk generation nedåt

export const portsOf = (g) => g.ports || [];
export const portable = (G, g) => !!g && !g.live && !g.expansionOf && G.u.flags.ports;

export function portCost(G, g) {
  return Math.round((PORT_COST[g.scope] * Math.pow(1.07, yearOf(G.t) - 1980)) / 100) * 100;
}

// Betyget porten väntas få (utan slump) när den släpps vid tiden at (i förväg: nu plus porteringstiden): originalets
// betyg, minus ålder och nedskärningar, plus eller minus hur väl genren passar den nya plattformen.
export function portScore(G, g, pid, at = G.t + PORT_WEEKS[g.scope]) {
  const fit = platFit(pid, g.genre, g.genre2) - platFit(g.platform, g.genre, g.genre2);
  const down = Math.max(0, platTier(PLATFORM[g.platform], yearOf(g.t)) - platTier(PLATFORM[pid], yearOf(at)));
  const age = Math.max(0, (at - g.t) / WEEKS_PER_YEAR - 1);
  const s = g.score - AGE_LOSS * age - DOWN_LOSS * down + clamp(fit * 2.5, -1, 0.6);
  return Math.round(clamp(s, 1, 10) * 10) / 10;
}

// Plattformar spelet kan porteras till: öppna, inte originalets och inte redan porterade. licensed = studion har licens.
export function portTargets(G, g) {
  const done = new Set(portsOf(g).map((p) => p.platform));
  if (G.port && G.port.game === g.id) done.add(G.port.platform);
  return PLATFORMS.filter((p) => p.id !== g.platform && !done.has(p.id) && platformOpen(G, p.id)).map((p) => ({ id: p.id, licensed: G.licenses.includes(p.id) }));
}

export function canPort(G, g, pid) {
  if (!portable(G, g)) return 'locked';
  if (G.port) return 'busy';
  if (!portTargets(G, g).some((p) => p.id === pid)) return 'done';
  if (!G.licenses.includes(pid)) return 'license';
  if (G.money < portCost(G, g)) return 'money';
  return true;
}

export function startPort(G, id, pid) {
  const g = G.games.find((x) => x.id === id);
  const ok = canPort(G, g, pid);
  if (ok !== true) return ok === 'money' ? t('err.money') : ok === 'busy' ? t('port.busy') : ok === 'license' ? t('port.needLicense') : false;
  const cost = portCost(G, g);
  spend(G, cost, 'ports');
  G.port = { game: g.id, platform: pid, t0: G.t, until: G.t + PORT_WEEKS[g.scope], cost };
  emit('portStart', { game: g, platform: pid });
  return true;
}

// Portens försäljning utan slump om den släpps vid tiden at: som ett nytt spel på den nya plattformen då, men utan
// uppföljarbonus, nyhetsvärde och trängsel, och med PORT_MULT (mindre för varje tidigare port av spelet).
export function portForecast(G, g, pid, at = G.t + PORT_WEEKS[g.scope]) {
  const copy = {
    ...g, platform: pid, t: at, score: portScore(G, g, pid, at), sequelOf: null, novel: false, crowd: 1,
    hype: 15 + 0.2 * (g.hype || 0),
    parts: { bugRatio: (g.parts?.bugRatio ?? 0) * (g.patched ? 0.2 : 1) },
    salesMult: PORT_MULT * Math.pow(0.8, portsOf(g).length),
  };
  return forecast(G, copy, { noise: false });
}

function finishPort(G) {
  const P = G.port;
  G.port = null;
  const g = G.games.find((x) => x.id === P.game);
  if (!g) return;
  const score = portScore(G, g, P.platform, G.t);
  // egen slump ur fröet, så att en portering inte flyttar resten av spelets slumpföljd
  const R = { rng: hashStr(`${G.seed || 0}:port:${g.id}:${P.platform}`) | 0 };
  const noise = clamp(gauss(R, 1, 0.1), 0.78, 1.25);
  const port = { platform: P.platform, t: G.t, score, cost: P.cost, total: portForecast(G, g, P.platform, G.t) * noise, priceAt: priceOf(yearOf(G.t)), tail: SALES_TAIL, revenue: 0, units: 0, weekly: [], ended: false };
  g.ports = [...portsOf(g), port];
  G.stats.ports = (G.stats.ports || 0) + 1;
  note(G, 'news.port', { title: g.title, plat: PLATFORM[P.platform].name, v: score.toFixed(1) }, score >= 7 ? 'good' : 'info');
  emit('ported', { game: g, port });
}

// Veckovis: färdiga porteringar släpps och porternas försäljning (samma kurva som ett spel med portens betyg).
export function portWeek(G) {
  if (G.port && G.t >= G.port.until) finishPort(G);
  for (const g of G.games) {
    if (!g.ports) continue;
    for (const p of g.ports) {
      if (p.ended) continue;
      const w = G.t - p.t - 1;
      const curve = curveFor(p.score, p.tail || 1);
      if (w < 0) continue;
      if (w >= curve.length) {
        p.ended = true;
        continue;
      }
      const rev = p.total * curve[w];
      p.weekly.push(rev);
      p.revenue += rev;
      const units = rev / p.priceAt;
      p.units += units;
      earn(G, rev, 'ports');
      G.stats.revenue += rev;
      // en port ger hälften så många nya (eller förlorade) fans per såld enhet som ett nytt spel
      const df = units * (p.score - 5.2) * 0.006;
      G.fans = Math.max(0, G.fans + (df < 0 ? Math.max(df, -G.fans * 0.005) : df));
      if (w > 14 && rev < p.total * 0.0012) p.ended = true;
    }
  }
}

// Samlat för biblioteket: originalets och porternas intäkter.
export const portRevenue = (g) => portsOf(g).reduce((a, p) => a + p.revenue, 0);
