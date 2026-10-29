import { clamp } from '../core/util.js';
import { gauss, hashStr } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { PLATFORM, PLATFORMS, platTier, potential } from '../data/platforms.js';
import { yearOf, yfOf, priceOf, WEEKS_PER_YEAR } from './const.js';
import { SALES_TAIL } from './tempo.js';
import { spend, earn } from './studio.js';
import { platformOpen } from './dev.js';
import { platFit } from './score.js';
import { forecast, curveFor } from './sales.js';
import { note } from './news.js';
import { storeRelease } from './store.js';

// Porteringar: ett externt team för över ett släppt spel till en annan plattform som studion har licens för. Teamet
// jobbar vid sidan av studions eget projekt, ett spel i taget. Porten säljer till den nya plattformens publik, men spelet
// är redan känt (ingen ny hype, inga uppföljarfans) och åldras: grafiken ser daterad ut några år senare, och en svagare
// maskin kräver nedskärningar. Porterna ligger på originalet (g.ports), inte i G.games, så de räknas inte som nya spel.
// En remaster (kind 'remaster', egen forskning) är en större omgörning av en gammal klassiker för dagens maskiner: inget
// åldrande, lite nostalgi på betyget och mer hype, men dyrare och bara en per spel.
export const PORT_WEEKS = { small: 6, medium: 10, large: 16, aaa: 24 };
export const REMASTER_AGE = 10; // år
export const REMASTER_MIN = 7; // originalets betyg
// cost: gånger en vanlig ports pris, högre för små spel som annars blir ett givet köp
const REMASTER = { cost: { small: 10, medium: 7, large: 4.5, aaa: 4.5 }, weeks: 1.5, mult: 0.3, bonus: 0.2, fit: 0.3 };
const PORT_COST = { small: 4000, medium: 35000, large: 240000, aaa: 800000 };
// Andelen av ett nytt spels försäljning; varje tidigare port av samma spel tar 20 % till (köparna har redan spelet).
export const PORT_MULT = 0.25;
const AGE_LOSS = 0.3; // betyg per år efter det första
const DOWN_LOSS = 0.7; // betyg per teknisk generation nedåt

export const portsOf = (g) => g.ports || [];
export const portable = (G, g) => !!g && !g.live && !g.expansionOf && G.u.flags.ports;
// Remaster: forskningen, minst tio år gammalt, betyg 7+ och ingen remaster förut
export const remasterable = (G, g) => portable(G, g) && G.u.flags.remaster && !g.remastered && g.score >= REMASTER_MIN && G.t - g.t >= REMASTER_AGE * WEEKS_PER_YEAR;

export function portCost(G, g, kind = 'port') {
  return Math.round((PORT_COST[g.scope] * Math.pow(1.07, yearOf(G.t) - 1980) * (kind === 'remaster' ? REMASTER.cost[g.scope] : 1)) / 100) * 100;
}
export const portWeeks = (g, kind = 'port') => Math.round(PORT_WEEKS[g.scope] * (kind === 'remaster' ? REMASTER.weeks : 1));

// Betyget porten väntas få (utan slump) när den släpps vid tiden at (i förväg: nu plus porteringstiden): originalets
// betyg, minus ålder och nedskärningar, plus eller minus hur väl genren passar den nya plattformen. En remaster åldras
// inte och får lite nostalgi i stället.
export function portScore(G, g, pid, at, kind = 'port') {
  at ??= G.t + portWeeks(g, kind);
  const fit = clamp((platFit(pid, g.genre, g.genre2) - platFit(g.platform, g.genre, g.genre2)) * 2.5, -1, kind === 'remaster' ? REMASTER.fit : 0.6);
  if (kind === 'remaster') return Math.round(clamp(g.score + REMASTER.bonus + fit, 1, 10) * 10) / 10;
  const down = Math.max(0, platTier(PLATFORM[g.platform], yearOf(g.t)) - platTier(PLATFORM[pid], yearOf(at)));
  const age = Math.max(0, (at - g.t) / WEEKS_PER_YEAR - 1);
  const s = g.score - AGE_LOSS * age - DOWN_LOSS * down + fit;
  return Math.round(clamp(s, 1, 10) * 10) / 10;
}

// Plattformar spelet kan porteras till: öppna, inte originalets och inte redan porterade. licensed = studion har licens.
export function portTargets(G, g) {
  const done = new Set(portsOf(g).map((p) => p.platform));
  if (G.port && G.port.game === g.id) done.add(G.port.platform);
  return PLATFORMS.filter((p) => p.id !== g.platform && !done.has(p.id) && platformOpen(G, p.id)).map((p) => ({ id: p.id, licensed: G.licenses.includes(p.id) }));
}

// Plattformar för en remaster: dagens generation (högst en generation under den bästa som säljer nu), även originalets
// egen plattform om den fortfarande är aktuell
export function remasterTargets(G, g) {
  const year = yearOf(G.t);
  const yf = yfOf(G.t);
  let best = 1;
  for (const p of PLATFORMS) if (potential(p, yf) > 12) best = Math.max(best, platTier(p, year));
  return PLATFORMS.filter((p) => platformOpen(G, p.id) && potential(p, yf) > 6 && platTier(p, year) >= best - 1).map((p) => ({ id: p.id, licensed: G.licenses.includes(p.id) }));
}

export function canPort(G, g, pid, kind = 'port') {
  if (kind === 'remaster' ? !remasterable(G, g) : !portable(G, g)) return 'locked';
  if (G.port) return 'busy';
  if (!(kind === 'remaster' ? remasterTargets : portTargets)(G, g).some((p) => p.id === pid)) return 'done';
  if (!G.licenses.includes(pid)) return 'license';
  if (G.money < portCost(G, g, kind)) return 'money';
  return true;
}

export function startPort(G, id, pid, kind = 'port') {
  const g = G.games.find((x) => x.id === id);
  const ok = canPort(G, g, pid, kind);
  if (ok !== true) return ok === 'money' ? t('err.money') : ok === 'busy' ? t('port.busy') : ok === 'license' ? t('port.needLicense') : false;
  const cost = portCost(G, g, kind);
  spend(G, cost, 'ports');
  G.port = { game: g.id, platform: pid, t0: G.t, until: G.t + portWeeks(g, kind), cost, kind };
  emit('portStart', { game: g, platform: pid, kind });
  return true;
}

// Portens försäljning utan slump om den släpps vid tiden at: som ett nytt spel på den nya plattformen då, men utan
// uppföljarbonus, nyhetsvärde och trängsel, och med PORT_MULT (mindre för varje tidigare port av spelet). En remaster
// säljer som ett halvt nytt spel med mer hype, utan buggar.
export function portForecast(G, g, pid, at, kind = 'port') {
  at ??= G.t + portWeeks(g, kind);
  const rem = kind === 'remaster';
  const copy = {
    ...g, platform: pid, t: at, score: portScore(G, g, pid, at, kind), sequelOf: null, novel: false, crowd: 1,
    hype: (rem ? 20 : 15) + (rem ? 0.25 : 0.2) * (g.hype || 0),
    parts: { bugRatio: rem ? 0 : (g.parts?.bugRatio ?? 0) * (g.patched ? 0.2 : 1) },
    salesMult: rem ? REMASTER.mult : PORT_MULT * Math.pow(0.8, portsOf(g).filter((p) => p.kind !== 'remaster').length),
  };
  return forecast(G, copy, { noise: false });
}

function finishPort(G) {
  const P = G.port;
  G.port = null;
  const g = G.games.find((x) => x.id === P.game);
  if (!g) return;
  const kind = P.kind || 'port';
  const score = portScore(G, g, P.platform, G.t, kind);
  // egen slump ur fröet, så att en portering inte flyttar resten av spelets slumpföljd
  const R = { rng: hashStr(`${G.seed || 0}:${kind}:${g.id}:${P.platform}`) | 0 };
  const noise = clamp(gauss(R, 1, 0.1), 0.78, 1.25);
  const port = { platform: P.platform, kind, t: G.t, score, cost: P.cost, total: portForecast(G, g, P.platform, G.t, kind) * noise, priceAt: priceOf(yearOf(G.t)), tail: SALES_TAIL, revenue: 0, units: 0, weekly: [], ended: false };
  storeRelease(G, port);
  g.ports = [...portsOf(g), port];
  if (kind === 'remaster') {
    g.remastered = true;
    G.stats.remasters = (G.stats.remasters || 0) + 1;
  } else G.stats.ports = (G.stats.ports || 0) + 1;
  note(G, kind === 'remaster' ? 'news.remaster' : 'news.port', { title: g.title, plat: PLATFORM[P.platform].name, v: score.toFixed(1) }, score >= 7 ? 'good' : 'info');
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
      const shut = p.storeEx && G.store?.paused; // exklusiv i den pausade butiken
      const rev = shut ? 0 : p.total * curve[w];
      p.weekly.push(rev);
      p.revenue += rev;
      const units = rev / p.priceAt;
      p.units += units;
      earn(G, rev, 'ports');
      G.stats.revenue += rev;
      // en port ger hälften så många nya (eller förlorade) fans per såld enhet som ett nytt spel
      const df = units * (p.score - 5.2) * 0.006;
      G.fans = Math.max(0, G.fans + (df < 0 ? Math.max(df, -G.fans * 0.005) : df));
      if (w > 14 && rev < p.total * 0.0012 && !shut) p.ended = true;
    }
  }
}

// Samlat för biblioteket: originalets och porternas intäkter.
export const portRevenue = (g) => portsOf(g).reduce((a, p) => a + p.revenue, 0);
