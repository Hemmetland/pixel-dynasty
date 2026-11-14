import { clamp, fmtMoney, fmtNum } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { PLATFORM, potential } from '../data/platforms.js';
import { yearOf, yfOf, WEEKS_PER_YEAR } from './const.js';
import { spend, earn } from './studio.js';
import { curveFor, unitRev } from './sales.js';
import { PUB_SHARE } from './publish.js';
import { note } from './news.js';
import { hwReach, digitalOf, platStore, PLAT_CUT } from './hardware.js';
import { STORE_EVENTS, EVENT_BY_ID, LEVEL_NAMES } from '../data/storeevents.js';

// Egen butik (distribution): med forskningen Digital butik bygger studion en butik och launcher för pc-spel. Den del av
// pc-spelarna som använder butiken (räckvidden) köper dina pc-spel där, så du behåller avgiften som andra butiker annars
// tar. Koncernens spel (dotterbolag och förlagets spel) säljs alltid där och betalar butiksavgiften till dig. Det
// strategiska valet: en sluten butik visar bara koncernens spel (de syns mer och säljer mer, och driften är billigare),
// en öppen butik tar in andra förlag mot en avgift du sätter (intäkter av deras försäljning och fler kunder, men dina spel
// syns mindre). Användarbasen växer med utbudet, förtroendet, upptäckbarheten och marknadsföringen, och exklusiva spel
// drar nya användare men kostar förtroende och försäljning. Drift, betalningar, support och marknadsföring kostar varje
// vecka. På en egen konsol eller bärbar enhet säljs den digitala delen av spelen genom butiken: du behåller avgiften på
// dina spel och tar butikens del av andra förlags (hardware.js räknar ut den). Allt ligger i G.store och all slump kommer
// ur fröet (inte G.rng).
export const OTHER_CUT = 0.3; // det andra butiker tar av försäljningen
export const PAY_FEE = 0.03; // betalningar: andel av allt som säljs i butiken
export const FEES = [0.1, 0.15, 0.2, 0.25, 0.3]; // avgifter du kan ta av andra förlag
export const SUPPORT = [
  { base: 500, per: 3000, trust: -15, outage: 0.012 },
  { base: 2500, per: 12000, trust: 0, outage: 0.004 },
  { base: 6000, per: 26000, trust: 12, outage: 0.0012 },
];
export const ADS = [0, 6000, 15000, 32000]; // marknadsföring per vecka
const ADS_REACH = 0.15; // varje nivå höjer målet för räckvidden så mycket (relativt)
const OPS_BASE = 2500;
const OPS_REACH = 30000;
const DEVREL = 4000; // en öppen butik: utvecklarrelationer och granskning
const FEAT = { closed: 1, open: 0.15 }; // dina pc-spel säljer så mycket mer per räckvidd (och upptäckbarhet i en öppen butik)
const EX_LOSS = 0.5; // ett exklusivt spel tappar den andelen av köparna som inte har butiken
const EX_PULL = 1.8;
const EX_TRUST = 6;
const CATALOG_WEEKS = 3 * WEEKS_PER_YEAR;
const SWITCH_WEEKS = 26;
const CLOSE_TRUST = 15;
const REACH_MAX = 0.85;
const MILESTONES = [1e6, 5e6, 10e6, 25e6, 50e6];
const LOYAL = 2; // i en sluten butik är alla där för koncernens spel: utbudet drar mer per spel
const MARKET = 30; // andra förlags pc-försäljning per vecka, i enheter av årets pris gånger pc:ns storlek
// Säsongsrea: två veckor i slutet av juni och två före jul. Rabatten väcker de äldre pc-spelen (äldre än ett halvår) till
// liv och lockar nya användare som stannar (S.sb, höjer räckviddens mål och avtar sakta), men spelare som lär sig vänta på
// rean köper mindre till fullpris, både dina nya spel och de andra förlagens (S.wait, ungefär hälften kvar efter ett år).
// rev är försäljningens lyft mot en vanlig vecka (fler exemplar gånger lägre pris), traffic hur mycket mer de andra
// spelen i butiken säljer under rean.
export const SALES = [
  { cut: 0, rev: 0, users: 0, wait: 0, traffic: 0 },
  { cut: 0.25, rev: 1.6, users: 0.002, wait: 0.004, traffic: 0.1 },
  { cut: 0.5, rev: 2.2, users: 0.004, wait: 0.01, traffic: 0.2 },
  { cut: 0.75, rev: 2.3, users: 0.006, wait: 0.022, traffic: 0.25 },
];
const WAIT_FULL = 0.5; // så mycket av väntandet märks i de andra förlagens försäljning utanför rean
const SALE_WEEKS = { 22: 0, 23: 0, 46: 1, 47: 1 }; // vecka i året: sommarrea (0) eller julrea (1)
const SALE_BASE = 0.006; // en reavecka säljer den andelen av ett äldre spels totala försäljning (före rabattens lyft)
const SALE_AGE = 26;
const WAIT_DECAY = 0.985;
const WISH_LIFT = 0.25; // ett pc-spel som väntats på i butiken säljer så mycket mer per förväntan (0 till 1) och räckvidd
const BOOST_DECAY = 0.99;

export const canStore = (G) => !!G.u.flags.store;
export const isPcPlat = (id) => PLATFORM[id]?.kind === 'pc';
const isOwnPlat = (id) => !!PLATFORM[id]?.own;
const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:store:${key}`));
// kostnaderna följer prisnivån (räknat från butikens första år)
export const storeScale = (G) => unitRev(yearOf(G.t)) / unitRev(2003);
const yscale = storeScale;

// Butiken byggs första veckan efter forskningen: sluten, normal support och lite marknadsföring
function openStore(G) {
  G.store = { t0: G.t, reach: 0.01, trust: 50, dev: 0, policy: 'closed', fee: 0.2, support: 1, ads: 1, ex: false, sale: 1, wait: 0, sb: 0, polT: -1e9, ms: 0, lvl: 1, spots: [], rk: {}, rkp: {}, ev: null, m: blank(), lm: blank(), tot: blank() };
  note(G, 'news.storeOpen', { studio: G.studio }, 'good');
  emit('storeOpen', G.store);
  return G.store;
}
function blank() {
  return { own: 0, group: 0, ext: 0, sale: 0, feat: 0, ops: 0, pay: 0, sup: 0, ads: 0 };
}

// Rean: vilken säsong veckan t hör till (undefined utanför rean), veckor kvar till nästa och butikens rabattnivå
export const saleSeason = (t) => SALE_WEEKS[t % WEEKS_PER_YEAR];
export function saleIn(t) {
  for (let k = 0; k < WEEKS_PER_YEAR; k++) if (saleSeason(t + k) !== undefined) return k;
  return 0;
}
export const saleOf = (S) => S.sale ?? 1;

// Antal pc-spelare i världen (för att visa räckvidden som användare)
export const pcPlayers = (year) => 6e6 * Math.pow(1.085, year - 2003);
export const storeUsers = (G, S = G.store) => (S ? S.reach * pcPlayers(yearOf(G.t)) : 0);
// Andra förlags pc-försäljning i världen per vecka (alla, inte bara de namngivna konkurrenterna); den digitala delen växer
export function pcMarket(G) {
  const year = yearOf(G.t);
  return unitRev(year) * potential(PLATFORM.pc, yfOf(G.t)) * MARKET * clamp(0.7 + 0.03 * (year - 2003), 0.7, 1.5);
}

// Upptäckbarhet: lätt att hitta rätt i en sluten butik, svårare ju fler förlag som säljer i en öppen
export const discOf = (S) => (S.policy === 'closed' ? 0.85 : 0.85 - 0.35 * S.dev);
// Andelen av de andra förlagen som vill sälja i butiken: lägre avgift och högre förtroende lockar fler
export const devTarget = (S) => (S.policy === 'open' ? clamp(1.25 - S.fee * 2.5, 0.3, 1) * (0.6 + (0.4 * S.trust) / 100) : 0);

// Koncernens pc-spel de senaste åren: varje bra spel drar användare (ett exklusivt mer), och studions fans
function catalogPull(G) {
  const from = G.t - CATALOG_WEEKS;
  const pull = (score) => clamp((score - 5) / 4, 0, 1.25) * 0.035;
  let v = 0;
  for (const g of G.games) {
    if (g.t >= from && !g.expansionOf && isPcPlat(g.platform)) v += pull(g.score) * (g.storeEx ? EX_PULL : 1);
    for (const p of g.ports || []) if (p.t >= from && isPcPlat(p.platform)) v += pull(p.score) * (p.storeEx ? EX_PULL : 1) * 0.6;
  }
  const own = new Map((G.comps || []).filter((c) => c.owned).map((c) => [c.id, c]));
  for (const r of G.market.releases) if (r.t >= from && own.has(r.comp) && r.t >= own.get(r.comp).ownedT && isPcPlat(r.platform)) v += pull(r.score) * 0.8;
  for (const d of G.pub ? G.pub.deals : []) if (d.out && d.t >= from && isPcPlat(d.platform)) v += pull(d.score) * 0.8;
  // fansen installerar studions launcher
  return v + 0.05 * Math.log10(1 + G.fans / 5e4);
}

// Målet för räckvidden: utbud gånger förtroende, upptäckbarhet och marknadsföring
export function reachTarget(G, S = G.store) {
  const ext = S.policy === 'open' ? 0.4 * S.dev : 0;
  const trustF = 0.6 + (0.8 * S.trust) / 100;
  const discF = 0.75 + 0.5 * discOf(S);
  const adsF = 1 + ADS_REACH * S.ads;
  const cat = catalogPull(G) * (S.policy === 'closed' ? LOYAL : 1);
  return clamp((0.03 + cat + ext) * trustF * discF * adsF + (S.sb || 0) + hwReach(G), 0, REACH_MAX);
}

// Förtroendets jämviktsläge: avgiften, supporten och exklusiva spel det senaste året
function trustAnchor(G, S) {
  const exs = G.games.filter((g) => g.storeEx && G.t - g.t < WEEKS_PER_YEAR).length;
  const fee = S.policy === 'open' ? 8 - (S.fee - 0.15) * 120 : 0;
  return clamp(52 + fee + SUPPORT[S.support].trust - EX_TRUST * Math.min(4, exs), 5, 95);
}

// Veckans kostnader (före betalningarna, som beror på försäljningen)
export function storeCosts(G, S = G.store) {
  const y = yscale(G);
  const sp = SUPPORT[S.support];
  return {
    ops: Math.round((OPS_BASE + OPS_REACH * S.reach + (S.policy === 'open' ? DEVREL * S.dev : 0)) * y),
    sup: Math.round((sp.base + sp.per * S.reach) * y),
    ads: Math.round(ADS[S.ads] * y),
  };
}

// Hur mycket mer ett nytt pc-spel säljer av att synas i butiken just nu
export const featOf = (S) => (S.policy === 'closed' ? FEAT.closed * S.reach : FEAT.open * S.reach * discOf(S));

// Släpp: ett pc-spel säljer mer av att synas i butiken, och ett exklusivt spel säljs bara där
export function storeRelease(G, g) {
  const S = G.store;
  if (!S || S.paused || !isPcPlat(g.platform)) return;
  const feat = featOf(S);
  g.total *= 1 + feat;
  g.storeFeat = feat;
  if (S.ex) {
    g.storeEx = true;
    g.total *= 1 - EX_LOSS * (1 - S.reach);
    S.reach = clamp(S.reach + 0.01 * clamp((g.score - 5) / 4, 0, 1.25), 0, REACH_MAX);
  }
  // spelare som väntar på rean köper mindre till fullpris: mest i butiken, men de vet att spelet blir billigare överallt
  if (S.wait) g.total *= 1 - S.wait * (0.5 + 0.5 * via(S, g));
  // önskelistan: spelet fanns i butiken innan det släpptes, och de som väntat köper direkt
  const wish = wishOf(G, g.hype || 0);
  if (wish > 0) {
    g.total *= 1 + WISH_LIFT * (clamp(g.hype, 0, 100) / 100) * S.reach;
    g.wish = wish;
    if (wish >= 1000) note(G, 'news.storeWish', { title: g.title, n: fmtNum(Math.round(wish / 100) * 100) }, 'good');
  }
  if (g.score >= 8) S.trust = clamp(S.trust + 3, 0, 100);
  else if (g.score < 5) S.trust = clamp(S.trust - 3, 0, 100);
}

// Var fjärde vecka blir de senaste fyra veckorna butikens månad
function rollMonth(G, S) {
  if ((G.t - S.t0) % 4 !== 3) return;
  S.lm = S.m;
  S.m = blank();
}

// Andelen av ett spels pc-försäljning som går genom butiken
const via = (S, x) => (x.storeEx ? 1 : S.reach);

// Reans försäljning av äldre pc-spel och portar en vecka, före rabattnivåns lyft: nyare spel säljer mer
function saleBase(G, S) {
  let v = 0;
  const one = (x) => {
    const age = G.t - x.t;
    if (age >= SALE_AGE && x.total > 0 && isPcPlat(x.platform)) v += (x.total * SALE_BASE * via(S, x)) / (1 + age / (3 * WEEKS_PER_YEAR));
  };
  for (const g of G.games) {
    one(g);
    for (const p of g.ports || []) one(p);
  }
  return v;
}

// Veckovis: räckvidd, förtroende, intäkter och kostnader
export function storeWeek(G) {
  if (!canStore(G)) return;
  const S = G.store || openStore(G);
  S.wait = (S.wait || 0) * WAIT_DECAY;
  S.sb = (S.sb || 0) * BOOST_DECAY;
  if (S.paused) {
    // pausad: inga intäkter eller kostnader, men användarna och förlagen försvinner och förtroendet sjunker
    S.dev = 0;
    S.reach *= 0.97;
    S.trust = clamp(S.trust - 0.3, 0, 100);
    rollMonth(G, S);
    return;
  }
  // utvecklarna kommer och går långsamt, förtroendet söker sitt jämviktsläge och räckvidden sitt mål
  S.dev += clamp(devTarget(S) - S.dev, -0.05, 0.03);
  if (S.policy === 'closed') S.dev = 0;
  S.trust = clamp(S.trust + (trustAnchor(G, S) - S.trust) * 0.02, 0, 100);
  const tgt = reachTarget(G, S);
  S.reach = clamp(S.reach + (tgt - S.reach) * (tgt > S.reach ? 0.01 * (1 + 0.4 * S.ads) : 0.015), 0, REACH_MAX);
  // driftstopp: oftare med liten support
  if (rngFor(G, 'out:' + G.t)() < SUPPORT[S.support].outage) {
    S.trust = clamp(S.trust - 10, 0, 100);
    note(G, 'news.storeDown', { studio: G.studio }, 'bad');
  }
  // rean: äldre spel säljer igen, nya användare kommer och fler väntar på nästa rea
  const season = saleSeason(G.t);
  const L = SALES[season === undefined ? 0 : saleOf(S)] || SALES[0];
  let sale = 0;
  if (L.cut > 0) {
    if (season !== saleSeason(G.t - 1)) S.sr = { rev: 0, reach: S.reach };
    sale = saleBase(G, S) * L.rev;
    S.sb += L.users;
    S.reach = clamp(S.reach + L.users, 0, REACH_MAX);
    S.wait += L.wait;
  }
  const traffic = L.cut > 0 ? 1 + L.traffic : 1 - S.wait * WAIT_FULL;
  // intäkter: dina pc-spel (avgiften du slipper), koncernens spel (butiksavgiften) och andra förlag (din avgift)
  let own = 0;
  let group = 0;
  let ext = 0;
  let gross = 0;
  let feat = 0; // dina spels extra försäljning av att synas i butiken (redan med i försäljningen)
  // egna plattformar: den digitala delen av dina spel, och butikens del av andra förlags digitala försäljning
  const dig = digitalOf(G);
  const plat = platStore(G);
  const onPlat = (x) => {
    if (!dig || !isOwnPlat(x.platform) || x.weekly.length !== G.t - x.t || !x.weekly.length) return;
    const v = (x.weekly[x.weekly.length - 1] / (1 - OTHER_CUT)) * dig;
    own += v * OTHER_CUT;
    gross += v;
  };
  gross += plat / PLAT_CUT;
  for (const g of G.games) {
    onPlat(g);
    for (const p of g.ports || []) onPlat(p);
    if (isPcPlat(g.platform) && g.weekly.length === G.t - g.t && g.weekly.length) {
      const w = g.weekly[g.weekly.length - 1];
      const v = (w / (1 - OTHER_CUT)) * via(S, g);
      own += v * OTHER_CUT;
      gross += v;
      if (g.storeFeat) feat += (w * g.storeFeat) / (1 + g.storeFeat);
    }
    for (const p of g.ports || []) {
      if (isPcPlat(p.platform) && p.weekly.length === G.t - p.t && p.weekly.length) {
        const w = p.weekly[p.weekly.length - 1];
        const v = (w / (1 - OTHER_CUT)) * via(S, p);
        own += v * OTHER_CUT;
        gross += v;
        if (p.storeFeat) feat += (w * p.storeFeat) / (1 + p.storeFeat);
      }
    }
  }
  const owned = new Map((G.comps || []).filter((c) => c.owned).map((c) => [c.id, c]));
  for (const r of G.market.releases) {
    const c = owned.get(r.comp);
    if (!c || r.t < c.ownedT || !isPcPlat(r.platform)) continue;
    const w = G.t - r.t;
    const curve = curveFor(r.score, r.tail || 1);
    if (w < 0 || w >= curve.length) continue;
    const v = r.total * curve[w] * S.reach * traffic;
    group += v * OTHER_CUT;
    gross += v;
  }
  if (S.policy === 'open' && S.dev > 0) {
    const v = pcMarket(G) * S.reach * S.dev * traffic;
    ext += v * S.fee;
    gross += v;
  }
  for (const d of G.pub ? G.pub.deals : []) {
    if (!d.out || !isPcPlat(d.platform) || d.weekly.length !== G.t - d.t || !d.weekly.length) continue;
    const v = (d.weekly[d.weekly.length - 1] / PUB_SHARE) * S.reach;
    group += v * OTHER_CUT;
    gross += v;
  }
  // temaveckor och Veckans spel: extra försäljning av dina pc-spel
  const ex = extraWeek(G, S);
  own += ex.evt + ex.spot;
  gross += ex.evt + ex.spot;
  const c = storeCosts(G, S);
  gross += sale;
  const pay = gross * PAY_FEE;
  const inc = own + group + ext + sale + plat;
  if (inc > 0) {
    earn(G, inc, 'store');
    G.stats.revenue += inc;
  }
  spend(G, c.ops + c.sup + c.ads + pay, 'storeOps');
  const add = (o) => {
    o.own += own;
    o.group += group;
    o.ext += ext;
    o.sale = (o.sale || 0) + sale;
    o.plat = (o.plat || 0) + plat;
    o.feat += feat;
    o.ops += c.ops;
    o.sup += c.sup;
    o.ads += c.ads;
    o.pay += pay;
  };
  add(S.m);
  add(S.tot);
  rollMonth(G, S);
  G.stats.storeNet = (G.stats.storeNet || 0) + inc - c.ops - c.sup - c.ads - pay;
  // reans sista vecka: vad den gav
  if (L.cut > 0 && S.sr) {
    S.sr.rev += sale;
    if (saleSeason(G.t + 1) !== season) {
      const n = Math.max(0, (S.reach - S.sr.reach) * pcPlayers(yearOf(G.t)));
      note(G, season ? 'news.saleWinter' : 'news.saleSummer', { v: fmtMoney(S.sr.rev), n: fmtNum(Math.round(n / 1000) * 1000) }, 'good');
      S.sr = null;
    }
  }
  // milstolpar i användarbasen
  const users = storeUsers(G, S);
  G.stats.storeUsers = Math.max(G.stats.storeUsers || 0, users);
  levelWatch(G, S);
  rankWatch(G, S);
  while (S.ms < MILESTONES.length && users >= MILESTONES[S.ms]) {
    note(G, 'news.storeUsers', { studio: G.studio, n: MILESTONES[S.ms] / 1e6 }, 'good');
    S.ms++;
  }
}

// ── Butiksnivå ──
// Butiken växer med användarna (högsta antalet hittills): varje nivå öppnar något nytt.
export const LEVELS = [0, 3e5, 1e6, 3e6, 8e6, 20e6];
export const levelOf = (G) => {
  const u = G.stats.storeUsers || 0;
  let l = 1;
  LEVELS.forEach((v, i) => {
    if (u >= v) l = i + 1;
  });
  return l;
};
export const levelNext = (G) => LEVELS[levelOf(G)] ?? null;
// Veckans spel: en plats från nivå 2, en till från nivå 4; kostar hälften från nivå 5 och varar sex veckor från nivå 6
export const spotSlots = (G) => (levelOf(G) >= 2 ? 1 : 0) + (levelOf(G) >= 4 ? 1 : 0);
export const spotWeeks = (G) => (levelOf(G) >= 6 ? 6 : 4);
const EVENT_BOOST = 1.5; // från nivå 3 lyfter temaveckorna så mycket mer
export const eventBoost = (G) => (levelOf(G) >= 3 ? EVENT_BOOST : 1);
function levelWatch(G, S) {
  const l = levelOf(G);
  if (S.lvl === undefined) S.lvl = l; // en butik från före nivåerna räknas som redan på sin nivå
  if (l > S.lvl) {
    S.lvl = l;
    note(G, 'news.storeLevel', { n: l, name: LEVEL_NAMES[l - 1] }, 'good', false, true);
    emit('storeLevel', { level: l });
  }
}

// ── Veckans spel ──
// Du lyfter fram ett av dina pc-spel i skyltfönstret i några veckor mot en avgift: spelet säljer extra (mer ju bättre det är) och
// ett bra spel drar nya användare. Äldre spel får en bas som i rean, så att även en klassiker går att väcka.
export const SPOT = { cost: 3000, share: 0.33, lift: 0.4, liftScore: 0.1, users: 0.0015, again: 12 };
const spotLift = (g) => SPOT.lift + SPOT.liftScore * clamp(g.score - 5, 0, 4);
// Vad en plats i skyltfönstret väntas ge i extra försäljning om spelet säljer som nu hela tiden (i verkligheten avtar det)
export const spotValue = (G, g) => (baseOf(G, g) * spotLift(g) * via(G.store, g) * spotWeeks(G)) / (1 - OTHER_CUT);
// Avgiften följer vad spelet säljer: en tredjedel av det väntade, aldrig under en grundavgift (från nivå 5 hälften)
export const spotCost = (G, g) => Math.round((Math.max(SPOT.cost * yscale(G), SPOT.share * spotValue(G, g)) * (levelOf(G) >= 5 ? 0.5 : 1)) / 10) * 10;
const pcGame = (g) => isPcPlat(g.platform) && !g.expansionOf;
export const spotsOf = (S) => S.spots || (S.spots = []);
export function spotGames(G) {
  const S = G.store;
  const on = new Set(spotsOf(S).map((x) => x.id));
  return G.games.filter((g) => pcGame(g) && G.t - g.t >= 1 && !on.has(g.id)).sort((a, b) => b.score - a.score || b.t - a.t);
}
export function canSpot(G, id) {
  const S = G.store;
  if (!S || S.paused) return t('dist.err.paused');
  if (spotSlots(G) < 1) return t('dist.err.spotLvl');
  if (spotsOf(S).length >= spotSlots(G)) return t('dist.err.spotFull');
  const g = G.games.find((x) => x.id === id);
  if (!g || !pcGame(g) || G.t - g.t < 1) return t('dist.err.spotGame');
  if (spotsOf(S).some((x) => x.id === id)) return t('dist.err.spotGame');
  if (g.spotT !== undefined && G.t - g.spotT < SPOT.again) return t('dist.err.spotAgain', { n: SPOT.again - (G.t - g.spotT) });
  if (G.money < spotCost(G, g)) return t('err.money');
  return true;
}
export function startSpot(G, id) {
  const r = canSpot(G, id);
  if (r !== true) return r;
  const S = G.store;
  const g = G.games.find((x) => x.id === id);
  spend(G, spotCost(G, g), 'storeOps');
  g.spotT = G.t;
  spotsOf(S).push({ id, t0: G.t, inc: 0 });
  S.spotN = (S.spotN || 0) + 1;
  note(G, 'news.storeSpotStart', { title: g.title }, 'info', true);
  emit('storeSpot', { game: g });
  return true;
}

// ── Temaveckor ──
export const eventWeek = (t) => t % WEEKS_PER_YEAR;
export function eventNow(G) {
  const w = eventWeek(G.t);
  return STORE_EVENTS.find((e) => w >= e.weeks[0] && w <= e.weeks[1]) || null;
}
// Veckor tills temaveckan börjar (0 = pågår nu)
export function eventIn(G, ev) {
  const w = eventWeek(G.t);
  if (w >= ev.weeks[0] && w <= ev.weeks[1]) return 0;
  return (ev.weeks[0] - w + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
}
// Nästa temavecka: { ev, in } där in är veckor kvar (0 = pågår nu)
export function eventNext(G) {
  for (let k = 0; k < WEEKS_PER_YEAR; k++) {
    const w = eventWeek(G.t + k);
    const ev = STORE_EVENTS.find((e) => w >= e.weeks[0] && w <= e.weeks[1]);
    if (ev) return { ev, in: k };
  }
  return null;
}
// Dina pc-spel som passar temat just nu
export function eventFits(G, ev = eventNow(G)) {
  return ev ? G.games.filter((g) => isPcPlat(g.platform) && !g.expansionOf && ev.fit(g)) : [];
}

// Vad ett spel säljer en vanlig vecka nu (senaste veckan, eller en bas för äldre spel som i rean)
function baseOf(G, g) {
  const age = G.t - g.t;
  const w = g.weekly && g.weekly.length === age && age > 0 ? g.weekly[age - 1] : 0;
  const tail = age >= SALE_AGE && g.total > 0 ? (g.total * SALE_BASE) / (1 + age / (3 * WEEKS_PER_YEAR)) : 0;
  return Math.max(w, tail);
}

// Veckans extra försäljning: temaveckans lyft för passande spel och Veckans spel. Båda går in i dina spels intäkter i butiken.
function extraWeek(G, S) {
  const out = { evt: 0, spot: 0 };
  const ev = eventNow(G);
  if (ev) {
    if (!S.ev || S.ev.id !== ev.id || G.t - S.ev.t0 > 3) S.ev = { id: ev.id, t0: G.t, inc: 0, n: 0 };
    const boost = eventBoost(G);
    let v = 0;
    for (const g of eventFits(G, ev)) v += (baseOf(G, g) * ev.lift * boost * via(S, g)) / (1 - OTHER_CUT);
    out.evt = v;
    S.ev.inc += v;
    S.ev.n = Math.max(S.ev.n, eventFits(G, ev).length);
    if (G.t === S.ev.t0) note(G, 'news.storeEvent', { name: ev.name }, 'info');
  } else if (S.ev && !S.ev.done) {
    S.ev.done = 1;
    if (S.ev.n > 0 && S.ev.inc >= 1) note(G, 'news.storeEventEnd', { name: EVENT_BY_ID[S.ev.id].name, v: fmtMoney(S.ev.inc) }, 'good');
  }
  const keep = [];
  for (const sp of spotsOf(S)) {
    const g = G.games.find((x) => x.id === sp.id);
    if (!g) continue;
    const age = G.t - sp.t0;
    if (age >= spotWeeks(G)) {
      note(G, 'news.storeSpotEnd', { title: g.title, v: fmtMoney(sp.inc) }, 'good');
      continue;
    }
    const v = (baseOf(G, g) * spotLift(g) * via(S, g)) / (1 - OTHER_CUT);
    sp.inc += v;
    out.spot += v;
    S.sb = (S.sb || 0) + SPOT.users * clamp((g.score - 5) / 4, 0, 1.25);
    keep.push(sp);
  }
  S.spots = keep;
  return out;
}

// ── Önskelista ──
// Ett pc-spel i utveckling syns i butiken som "kommer snart": förväntan (hype) och butikens användare ger en önskelista.
export const wishOf = (G, hype) => {
  const S = G.store;
  if (!S || S.paused) return 0;
  return Math.round(storeUsers(G, S) * Math.pow(clamp(hype, 0, 100) / 100, 1.5) * 0.06);
};
export function wishNow(G) {
  const J = G.job;
  if (!G.store || !J || J.kind !== 'game' || !isPcPlat(J.platform)) return null;
  return { title: J.title, hype: J.hype, n: wishOf(G, J.hype) };
}

// ── Topplistan: plats och förra veckans plats ──
const rankKey = (r) => r.kind + ':' + r.id + ':' + r.platform;
function rankWatch(G, S) {
  const rows = storeChart(G, 10);
  S.rkp = S.rk || {};
  S.rk = {};
  rows.forEach((r, i) => {
    S.rk[rankKey(r)] = i + 1;
  });
  const top = rows[0];
  if (top && top.kind === 'own') {
    const g = G.games.find((x) => x.id === top.id);
    if (g && !g.storeTop) {
      g.storeTop = G.t;
      G.stats.storeTops = (G.stats.storeTops || 0) + 1;
      note(G, 'news.storeTop', { title: g.title }, 'good', false, true);
      emit('storeTop', { game: g });
    }
  }
}

// ── Spelarens val ──
export const canSwitch = (G, S = G.store) => !!S && G.t - S.polT >= SWITCH_WEEKS;
export const switchLeft = (G, S = G.store) => (S ? Math.max(0, SWITCH_WEEKS - (G.t - S.polT)) : 0);
export function setPolicy(G, policy) {
  const S = G.store;
  if (!S || S.policy === policy || !['closed', 'open'].includes(policy)) return false;
  if (!canSwitch(G, S)) return t('dist.switchWait', { n: switchLeft(G, S) });
  // att stänga en öppen butik sviker förlagen och kunderna som kom för deras spel
  if (policy === 'closed') S.trust = clamp(S.trust - CLOSE_TRUST, 0, 100);
  S.policy = policy;
  S.polT = G.t;
  note(G, policy === 'open' ? 'news.storeOpened' : 'news.storeClosed', { studio: G.studio }, 'info');
  emit('storePolicy', S);
  return true;
}
export function setFee(G, fee) {
  const S = G.store;
  if (!S || !FEES.includes(fee) || S.fee === fee) return false;
  // en höjd avgift märks direkt i förtroendet
  if (fee > S.fee) S.trust = clamp(S.trust - (fee - S.fee) * 80, 0, 100);
  S.fee = fee;
  return true;
}
export function setSupport(G, i) {
  const S = G.store;
  if (!S || !SUPPORT[i]) return false;
  S.support = i;
  return true;
}
export function setAds(G, i) {
  const S = G.store;
  if (!S || ADS[i] === undefined) return false;
  S.ads = i;
  return true;
}
// Pausa butiken (eller öppna den igen): ett sätt ut för en studio där butiken inte bär sig
export function setPaused(G, on) {
  const S = G.store;
  if (!S || !!S.paused === !!on) return false;
  S.paused = !!on;
  note(G, on ? 'news.storePaused' : 'news.storeResumed', { studio: G.studio }, 'info');
  return true;
}
export function setSale(G, i) {
  const S = G.store;
  if (!S || !SALES[i] || saleOf(S) === i) return false;
  S.sale = i;
  return true;
}
export function setExclusive(G, on) {
  const S = G.store;
  if (!S) return false;
  S.ex = !!on;
  return true;
}

// Butikens topplista den här veckan: dina spel och portar, koncernens spel och (i en öppen butik) andra förlags pc-spel.
// De andra förlagens del av butikens försäljning (pcMarket, som i storeWeek) fördelas på deras pc-spel som säljer just nu.
export function storeChart(G, n = 5) {
  const S = G.store;
  if (!S || S.paused) return [];
  const rows = [];
  const traffic = saleSeason(G.t) !== undefined && saleOf(S) > 0 ? 1 + SALES[saleOf(S)].traffic : 1 - (S.wait || 0) * WAIT_FULL;
  const now = (x) => isPcPlat(x.platform) && x.weekly.length === G.t - x.t && x.weekly.length;
  const row = (x, title, studio, kind, v) => v >= 1 && rows.push({ id: x.id, title, studio, kind, v, score: x.score, platform: x.platform, genre: x.genre, topic: x.topic });
  for (const g of G.games) {
    if (now(g)) row(g, g.title, G.studio, 'own', (g.weekly[g.weekly.length - 1] / (1 - OTHER_CUT)) * via(S, g));
    for (const p of g.ports || []) if (now(p)) row({ ...g, ...p, id: g.id }, g.title, G.studio, 'own', (p.weekly[p.weekly.length - 1] / (1 - OTHER_CUT)) * via(S, p));
  }
  const owned = new Map((G.comps || []).filter((c) => c.owned).map((c) => [c.id, c]));
  const ext = [];
  for (const r of G.market.releases) {
    if (!isPcPlat(r.platform)) continue;
    const w = G.t - r.t;
    const c = curveFor(r.score, r.tail || 1)[w];
    if (w < 0 || !c) continue;
    const o = owned.get(r.comp);
    if (o && r.t >= o.ownedT) row(r, r.title, r.studio, 'group', r.total * c * S.reach * traffic);
    else if (!o) ext.push([r, r.total * c]);
  }
  for (const d of G.pub ? G.pub.deals : []) if (d.out && now(d)) row(d, d.title, d.studio, 'group', (d.weekly[d.weekly.length - 1] / PUB_SHARE) * S.reach);
  if (S.policy === 'open' && S.dev > 0 && ext.length) {
    const all = pcMarket(G) * S.reach * S.dev * traffic;
    const sum = ext.reduce((a, [, w]) => a + w, 0);
    for (const [r, w] of ext) row(r, r.title, r.studio, 'ext', (all * w) / sum);
  }
  rows.sort((a, b) => b.v - a.v);
  // förändring mot förra veckan: positivt = uppåt, null = ny på listan
  const prev = S.rkp || {};
  const known = Object.keys(prev).length > 0; // förra veckans lista saknas i en ny butik och i äldre sparningar
  rows.forEach((r, i) => {
    const p = prev[rankKey(r)];
    r.rank = i + 1;
    r.d = !known ? 0 : p ? p - (i + 1) : null;
    r.spot = r.kind === 'own' && spotsOf(S).some((x) => x.id === r.id);
  });
  return rows.slice(0, n);
}

// Månadens fasta kostnader (för finansfönstrets utgiftstakt)
export function storeCostMonth(G) {
  if (!G.store || G.store.paused) return 0;
  const c = storeCosts(G);
  return (c.ops + c.sup + c.ads) * 4;
}

// Butikens samlade resultat (intäkter minus kostnader)
export const storeNet = (G) => G.stats.storeNet || 0;
