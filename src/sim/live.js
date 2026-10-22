// Live-tjänstespel (MMO). Ett onlinespel släpps som vanligt men lever sedan vidare på abonnemang i tre nivåer
// (Standard, Pro, Max) så länge servrarna är igång. Spelarbasen följer en målnivå som beror på spelets betyg,
// hur färskt innehållet är, priserna, driften och hur gammalt spelet är. Innehållsuppdateringar och expansioner
// (egna projekt) håller det vid liv, och evenemang ger en kort knuff. Konkurrenterna släpper egna MMO som drar spelare.
// Kräver forskningen Serverrum och att serverrummet är byggt.
import { clamp } from '../core/util.js';
import { chance, hashStr } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { yearOf, priceOf, moneyScale, WEEKS_PER_MONTH, WEEKS_PER_YEAR } from './const.js';
import { facLevel, earn, spend } from './studio.js';
import { forecast } from './sales.js';
import { note } from './news.js';

// Storlekar som går att göra som onlinespel, och som expansion
export const LIVE_SCOPES = ['large', 'aaa'];
export const EXP_SCOPES = ['small', 'medium', 'large'];
// Onlinespel tar längre tid (servrar, konton, betalning): utvecklingstiden × LIVE_DEV
export const LIVE_DEV = 1.25;
// Abonnemangsnivåer: grundandel av spelarna vid standardpris och pris relativt Standard
export const SUB_TIERS = ['std', 'pro', 'max'];
const TIER_W = [0.7, 0.22, 0.08];
const TIER_X = [1, 1.7, 2.8];
// Hur känsliga spelarna är för prisnivån (k = 1 är standardpris) och för en enskild nivås pris (fördelningen mellan nivåer)
const PRICE_ELAST = 1.5;
const TIER_ELAST = 2.5;
export const PRICE_MIN = 0.5;
export const PRICE_MAX = 2.5;
// Drift: kostnad per spelare, hur många som stannar och risk för avbrott per vecka
export const OPS = [
  { cost: 0.65, mult: 0.9, outage: 0.02 },
  { cost: 1, mult: 1, outage: 0.006 },
  { cost: 1.35, mult: 1.05, outage: 0.0015 },
];
// Innehållet blir gammalt: färskhet −1,1 per vecka (från 100), en uppdatering ger +30 efter 8 veckor
const FRESH_DECAY = 1.1;
export const PATCH_WEEKS = 8;
const PATCH_FRESH = 30;
const MILESTONES = [10000, 100000, 1000000, 5000000, 10000000];
// Evenemang i spelet: pågår EVENT_WEEKS veckor, nästa kan starta EVENT_GAP veckor efter förra starten. Lockar tillbaka
// spelare (målnivån × EVENT_LIFT), ger lite färskhet och halverar dragningen från konkurrenternas MMO medan det pågår.
export const EVENT_WEEKS = 4;
export const EVENT_GAP = 16;
const EVENT_FRESH = 6;
const EVENT_LIFT = 1.08;

const fmtN = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');

// Forskningen är klar (alternativet syns) / serverrummet är byggt (det går att starta)
export const liveUnlocked = (G) => G.u.facs.includes('server');
export const canGoLive = (G) => liveUnlocked(G) && facLevel(G, 'server') >= 1;
export const liveGames = (G) => G.games.filter((g) => g.live && !g.live.closed);

// Standardpriser per månad för året: Standard ungefär en tredjedel av ett boxspel, Pro och Max dyrare.
export function subPrices(year) {
  const std = Math.max(3, Math.round(priceOf(year) * 0.35));
  return TIER_X.map((x) => Math.round(std * x));
}
// Spelarnas fördelning på nivåerna och snittintäkt per spelare och månad. L.price = pris per nivå relativt standard.
export function tierMix(G, L) {
  const def = subPrices(yearOf(G.t));
  const r = L.price.map((x) => clamp(x, PRICE_MIN, PRICE_MAX));
  const w = r.map((x, i) => TIER_W[i] * Math.pow(x, -TIER_ELAST));
  const sw = w.reduce((a, b) => a + b, 0);
  const share = w.map((x) => x / sw);
  const prices = r.map((x, i) => Math.round(def[i] * x));
  const k = r.reduce((a, x, i) => a + TIER_W[i] * x, 0);
  const arpu = share.reduce((a, s, i) => a + s * prices[i], 0);
  return { share, prices, def, k, arpu };
}
// Serverkapacitet (spelare totalt) från serverrummets nivå; billigare hårdvara med åren och dubbelt med molntjänster.
export function serverCap(G) {
  const year = yearOf(G.t);
  return Math.round(facLevel(G, 'server') * 150000 * Math.pow(1.12, Math.max(0, year - 1997)) * (G.research.done.includes('f_cloud') ? 2 : 1));
}
// Driftkostnad per spelare och månad
export const costPerSub = (G, L) => 0.28 * subPrices(yearOf(G.t))[0] * OPS[L.ops].cost;

// Vilken spelarbas spelet drar mot just nu
export function liveTarget(G, g) {
  const L = g.live;
  const years = Math.max(0, G.t - L.t0) / WEEKS_PER_YEAR;
  const age = Math.exp(-0.06 * years);
  const fresh = 0.4 + (0.6 * L.fresh) / 100;
  const price = Math.exp(-PRICE_ELAST * (tierMix(G, L).k - 1));
  const ev = eventOn(G, L) ? EVENT_LIFT : 1;
  return L.pot * age * fresh * price * OPS[L.ops].mult * ev * rivalFactor(G, g);
}
// Intäkt och kostnad per månad med nuvarande spelare
export function liveMonth(G, g) {
  const L = g.live;
  if (!L || L.closed) return { rev: 0, cost: 0 };
  return { rev: L.subs * tierMix(G, L).arpu, cost: L.subs * costPerSub(G, L) };
}
export const liveCostMonth = (G) => liveGames(G).reduce((a, g) => a + liveMonth(G, g).cost, 0);

// När onlinespelet släpps (efter startSales): spelarpotentialen från samma prognos som boxförsäljningen.
// Boxen säljer mindre (många väntar på abonnemanget) men abonnemangen fortsätter så länge spelet lever.
export function launchLive(G, game) {
  const units = forecast(G, game, { noise: false }) / priceOf(yearOf(G.t));
  game.total *= 0.55;
  game.live = {
    t0: G.t, pot: units * 0.18 * Math.exp(0.3 * (game.score - 7)), subs: 0, peak: 0, fresh: 100,
    price: [1, 1, 1], ops: 1, patch: null, closed: 0, rev: 0, cost: 0, hist: [], outages: 0, ms: 0, exps: [],
    boost: G.t + 10, hype: game.hype || 0,
  };
  G.stats.liveLaunched = (G.stats.liveLaunched || 0) + 1;
  note(G, 'live.news.launch', { title: game.title }, 'good');
  emit('liveLaunch', game);
}

// En expansion släpps: köps av en del av spelarna (fler om den är bra), gör innehållet färskt och lockar nya spelare.
export function releaseExpansion(G, game) {
  const base = G.games.find((x) => x.id === game.expansionOf);
  if (!base || !base.live || base.live.closed) {
    game.total *= 0.2;
    return;
  }
  const L = base.live;
  const buy = clamp(0.3 + 0.1 * (game.score - 6), 0.1, 0.7);
  game.total = (L.subs * buy + (game.total / game.priceAt) * 0.15) * game.priceAt * 0.75;
  L.fresh = 100;
  L.pot *= 1 + clamp(0.06 * (game.score - 5.5), -0.1, 0.25);
  L.exps.push(game.id);
  L.boost = G.t + 8;
  note(G, 'live.news.expansion', { title: game.title, base: base.title }, game.score >= 7 ? 'good' : 'info');
}

// ── Konkurrenternas onlinespel ────────────────────────────────────
// Från 1997 gör starka konkurrenter ibland sitt stora rollspel, actionspel, skjutspel eller strategispel som MMO. Det drar
// spelare från dina onlinespel (mest i samma genre och de första månaderna) tills det stänger efter några år. Om ett släpp
// blir MMO avgörs av en hash av fröet och släppet, så att konkurrenternas vanliga slumpföljd inte ändras.
const RIVAL_P = { rpg: 0.3, action: 0.12, shooter: 0.12, strategy: 0.12 };
const RIVAL_YEAR = 1997;
const RIVAL_MAX = 3;
const RIVAL_GAP = 96;
export const SURGE_WEEKS = 16;
const hash01 = (G, s) => hashStr((G.seed || 0) + ':' + s) / 4294967296;

export const rivalMmos = (G) => ((G.market && G.market.mmos) || []).filter((m) => !m.closed);
// Evenemanget gäller veckouppdateringarna till och med veckan 'until' (EVENT_WEEKS stycken)
export const eventOn = (G, L) => !!(L.ev && G.t <= L.ev.until);
// Hur stor andel av spelarna konkurrentens MMO lockar från spelet g just nu
export function rivalPull(G, m, g) {
  if (m.closed) return 0;
  const age = G.t - m.t0;
  const base = clamp(0.06 + 0.045 * (m.score - 7), 0.02, 0.16);
  const surge = age < SURGE_WEEKS ? 1 + 0.6 * (1 - age / SURGE_WEEKS) : 1;
  const fade = clamp((m.end - G.t) / (2 * WEEKS_PER_YEAR), 0.3, 1);
  const sim = (m.genre === g.genre ? 1 : m.genre === g.genre2 ? 0.7 : 0.45) + (m.topic === g.topic ? 0.25 : 0);
  const q = clamp(1 + 0.3 * (m.score - g.score), 0.4, 1.8);
  return base * surge * fade * sim * q * (g.live && eventOn(G, g.live) ? 0.5 : 1);
}
export const rivalFactor = (G, g) => clamp(1 - rivalMmos(G).reduce((a, m) => a + rivalPull(G, m, g), 0), 0.55, 1);

function rivalWeek(G) {
  const M = G.market;
  if (!M) return;
  if (!M.mmos) M.mmos = [];
  // nya konkurrentsläpp sedan förra veckan (bara färska, så att en gammal sparfil inte får en hel hög på en gång)
  const seen = M.mmoSeen || 0;
  for (const r of M.releases) {
    if (r.id <= seen) continue;
    M.mmoSeen = Math.max(M.mmoSeen || 0, r.id);
    const p = RIVAL_P[r.genre];
    if (!p || r.t < G.t - 4 || yearOf(r.t) < RIVAL_YEAR || r.score < 6 || (r.scope !== 'large' && r.scope !== 'aaa')) continue;
    if (rivalMmos(G).length >= RIVAL_MAX || G.t - (M.mmoT ?? -1e9) < RIVAL_GAP) continue;
    if (hash01(G, 'mmo' + r.id) >= p * (r.scope === 'aaa' ? 1.5 : 1)) continue;
    const years = clamp(3 + 1.6 * (r.score - 6) + 4 * hash01(G, 'life' + r.id), 3, 12);
    r.mmo = true;
    M.mmoT = G.t;
    M.mmos.push({ id: r.id, studio: r.studio, color: r.color, title: r.title, genre: r.genre, topic: r.topic, score: r.score, t0: G.t, end: G.t + Math.round(years * WEEKS_PER_YEAR), closed: 0 });
    if (liveGames(G).length) note(G, 'live.news.rival', { studio: r.studio, title: r.title }, 'bad');
    else note(G, 'live.news.rivalInfo', { studio: r.studio, title: r.title }, 'info');
  }
  // gamla konkurrent-MMO stänger; deras spelare letar nytt och kommer snabbare till dina onlinespel
  for (const m of M.mmos) {
    if (m.closed || G.t < m.end) continue;
    m.closed = G.t;
    for (const g of liveGames(G)) g.live.boost = Math.max(g.live.boost, G.t + 8);
    if (liveGames(G).length) {
      G.stats.outlasted = (G.stats.outlasted || 0) + 1;
      note(G, 'live.news.rivalClosed', { studio: m.studio, title: m.title }, 'good');
    } else note(G, 'live.news.rivalGone', { studio: m.studio, title: m.title }, 'info');
  }
  while (M.mmos.length > 12 && M.mmos[0].closed) M.mmos.shift();
}

// Varje vecka: spelarna rör sig mot målnivån, abonnemangen betalas, servrarna kostar och ibland går de ner.
export function liveWeek(G) {
  rivalWeek(G);
  const games = liveGames(G);
  if (!games.length) return;
  const cap = serverCap(G);
  const total = games.reduce((a, g) => a + g.live.subs, 0);
  const over = cap > 0 ? Math.max(0, total / cap - 1) : 1;
  let weekRev = 0;
  for (const g of games) {
    const L = g.live;
    L.fresh = Math.max(0, L.fresh - FRESH_DECAY);
    if (L.patch && G.t >= L.patch.until) {
      L.fresh = Math.min(100, L.fresh + PATCH_FRESH);
      L.patch = null;
      note(G, 'live.news.patch', { title: g.title }, 'good');
    }
    let target = liveTarget(G, g);
    // fullt på servrarna: nya spelare kommer inte in och några tröttnar på köerna
    if (over > 0) target = Math.min(target, L.subs * (1 - Math.min(0.05, over * 0.1)));
    const d = target - L.subs;
    const grow = 0.09 + (G.t < L.boost ? 0.06 + (L.hype / 100) * 0.12 : 0);
    L.subs = Math.max(0, L.subs + d * (d > 0 ? grow : 0.05));
    L.peak = Math.max(L.peak, L.subs);
    // evenemangets sista vecka har räknats: summera vad det gav
    if (L.ev && G.t >= L.ev.until) {
      const back = Math.round(L.subs - L.ev.subs0);
      if (back > 0) note(G, 'live.news.eventEnd', { title: g.title, n: fmtN(back) }, 'good');
      else note(G, 'live.news.eventFlat', { title: g.title }, 'info');
      L.ev = null;
    }
    const mix = tierMix(G, L);
    const rev = (L.subs * mix.arpu) / WEEKS_PER_MONTH;
    const cost = (L.subs * costPerSub(G, L)) / WEEKS_PER_MONTH;
    if (rev > 0) {
      earn(G, rev, 'subs');
      G.stats.revenue += rev;
      L.rev += rev;
      weekRev += rev;
    }
    if (cost > 0) {
      spend(G, cost, 'servers');
      L.cost += cost;
    }
    // nöjda spelare blir fans, ett dåligt spel tappar dem
    G.fans = Math.max(0, G.fans + L.subs * 0.00025 * (g.score - 5));
    if (L.subs > 500 && chance(G, OPS[L.ops].outage + over * 0.08)) {
      L.subs *= 0.96;
      L.fresh = Math.max(0, L.fresh - 4);
      L.outages++;
      note(G, over > 0 ? 'live.news.overload' : 'live.news.outage', { title: g.title }, 'bad');
    }
    for (const m of MILESTONES) {
      if (L.subs >= m && L.ms < m) {
        L.ms = m;
        note(G, 'live.news.subs', { title: g.title, n: fmtN(m) }, 'good');
      }
    }
    if (G.t % WEEKS_PER_MONTH === 0) {
      L.hist.push({ t: G.t, v: Math.round(L.subs) });
      if (L.hist.length > 120) L.hist.shift();
    }
  }
  if (weekRev > 0) emit('revenue', { amount: weekRev });
}

// ── Spelarens åtgärder ────────────────────────────────────────────
const liveOf = (G, id) => {
  const g = G.games.find((x) => x.id === id);
  return g && g.live && !g.live.closed ? g : null;
};
// Innehållsuppdatering: ungefär en halv månads standardintäkter plus en grundkostnad, klar efter PATCH_WEEKS veckor
export function livePatchCost(G, g) {
  const year = yearOf(G.t);
  return Math.round((g.live.subs * subPrices(year)[0] * 0.5 + 20000 * moneyScale(year)) / 100) * 100;
}
export function startLivePatch(G, id) {
  const g = liveOf(G, id);
  if (!g) return false;
  if (g.live.patch) return t('err.livePatch');
  const cost = livePatchCost(G, g);
  if (G.money < cost) return t('err.money');
  spend(G, cost, 'patches');
  g.live.patch = { t: G.t, until: G.t + PATCH_WEEKS };
  return true;
}
// Evenemang: ungefär en åttondel av en månads standardintäkter plus en grundkostnad, startar direkt
export function liveEventCost(G, g) {
  const year = yearOf(G.t);
  return Math.round((g.live.subs * subPrices(year)[0] * 0.12 + 8000 * moneyScale(year)) / 100) * 100;
}
// Veckor tills nästa evenemang kan starta (0 = nu)
export const eventReadyIn = (G, L) => (L.evT == null ? 0 : Math.max(0, L.evT + EVENT_GAP - G.t));
export function startLiveEvent(G, id) {
  const g = liveOf(G, id);
  if (!g) return false;
  const L = g.live;
  if (eventReadyIn(G, L) > 0) return t('err.liveEvent');
  const cost = liveEventCost(G, g);
  if (G.money < cost) return t('err.money');
  spend(G, cost, 'liveEvents');
  L.evT = G.t;
  L.ev = { until: G.t + EVENT_WEEKS, subs0: L.subs };
  L.events = (L.events || 0) + 1;
  L.evCost = (L.evCost || 0) + cost;
  L.fresh = Math.min(100, L.fresh + EVENT_FRESH);
  L.boost = Math.max(L.boost, G.t + EVENT_WEEKS + 1);
  return true;
}
// Pris för en nivå relativt standardpriset, i steg om 5 %
export function setLivePrice(G, id, tier, ratio) {
  const g = liveOf(G, id);
  if (!g || tier < 0 || tier > 2) return false;
  g.live.price[tier] = Math.round(clamp(ratio, PRICE_MIN, PRICE_MAX) * 20) / 20;
  return true;
}
export function setLiveOps(G, id, ops) {
  const g = liveOf(G, id);
  if (!g || !OPS[ops]) return false;
  g.live.ops = ops;
  return true;
}
// Stäng servrarna: intäkterna och kostnaderna upphör, och några av spelarna blir besvikna.
export function closeLive(G, id) {
  const g = liveOf(G, id);
  if (!g) return false;
  G.fans = Math.max(0, G.fans - Math.min(G.fans * 0.03, g.live.subs * 0.05));
  g.live.closed = G.t;
  g.live.subs = 0;
  note(G, 'live.news.closed', { title: g.title }, 'info');
  return true;
}
