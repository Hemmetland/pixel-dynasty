// E-sport: ett onlinespel kan arrangera turneringar med prispengar. Spelaren väljer vad som står på spel (prispengar,
// sändning och marknadsföring) och får tillbaka tittare, sponsorintäkter, nya spelare, fans och en e-sportscen som växer
// med varje event. Satsa lite på ett litet spel och mycket på ett stort: avkastningen räknas ut i förväg (esportPlan) och
// visas som ett betyg, och efteråt redovisas vad eventet gav (L.esp.log). Allt som slumpas görs med en hash av fröet
// (aldrig G.rng), så slumpföljden i resten av spelet är densamma som utan e-sport.
//
// Tittare = spelarna som följer (spelare × sortens andel) + utomstående (hur känt spelet är × tidens räckvidd × prispengarna^0,45).
// Prispengar ger alltså fler utomstående men med avtagande effekt, och sändningen och marknadsföringen förstärker dem: därför
// finns det en lagom nivå som beror på hur stort spelet är. Utomstående blir spelare med en viss chans (sorten och spelets betyg),
// och en del av dem stannar. Sponsorerna betalar per tittare.
import { clamp } from '../core/util.js';
import { hashStr } from '../core/rng.js';
import { t, L as pick } from '../core/i18n.js';
import { yearOf, moneyScale } from './const.js';
import { earn, spend } from './studio.js';
import { note } from './news.js';
import { liveGames, liveArpu, costPerSub, subPrices, liveTarget, seasonOn } from './live.js';
import { KIND, ETYPE, etypesOf, TEAM_A, TEAM_B, GUILDS, RAID_GUILDS, RAID_BOSSES } from '../data/onlinekinds.js';

// Spelare som behövs för att ett event ska vara värt att visa, och veckor av vila efter ett event
export const ESP_MIN = 3000;
export const ESP_REST = 6;
// Raidrusningen (en tävling som följer säsongen) kan bara starta de första RACE_WINDOW veckorna av en ny säsong, en gång per säsong,
// och väntar inte på vilan efter ett annat event: den nya raiden kommer när säsongen kommer.
export const RACE_WINDOW = 8;
// Automatiska event startar när kassan räcker till AUTO_BUFFER event
export const ESP_AUTO_BUFFER = 3;
// Prispengar, sändning och marknadsföring: fem, tre och tre nivåer. Kostnaden är det största av ett grundbelopp (i år-2000-dollar,
// följer prisnivån) och en andel (share) av vad ett normalt event ger spelet (R0, se refReturn). Ett stort spel får alltså
// satsa i samma mått som ett litet, och ett litet spel kan inte satsa billigt: därför är ett event alltid ett verkligt val.
// mult = hur mycket mer utomstående det drar. Sändningen kostar per tre veckor (ett längre event kostar mer).
export const PRIZES = [10000, 30000, 100000, 300000, 1000000];
const PRIZE_SHARE = [0.2, 0.5, 1.1, 2.2, 4.4];
export const PRODS = [
  { id: 'own', cost: 2000, share: 0.03, mult: 1, ic: 'user' },
  { id: 'studio', cost: 18000, share: 0.3, mult: 1.45, ic: 'film' },
  { id: 'world', cost: 80000, share: 1.0, mult: 2.2, ic: 'globe' },
];
export const MKTS = [
  { id: 'none', cost: 0, share: 0, mult: 1, ic: 'minus' },
  { id: 'campaign', cost: 6000, share: 0.2, mult: 1.2, ic: 'megaphone' },
  { id: 'global', cost: 30000, share: 0.7, mult: 1.5, ic: 'rocket' },
];
const OUT0 = 20000; // utomstående som ett medelstort event drar i en modern tid, med ett spel på 50 000 spelare
const OUT_REF = 50000;
// Utomstående når ett tak: dubbelt så mycket satsat ger långt ifrån dubbelt så många. x = satsningen i förhållande till en
// normal (1 = Prispeng 2, egen sändning, ingen marknadsföring); taket är SAT_MAX gånger det normala.
const SAT_C = 2.2;

const reachGain = (x) => (1 - Math.exp(-x / SAT_C)) / (1 - Math.exp(-1 / SAT_C));
const PRIZE_EXP = 0.6;
const SPONSOR = 0.12; // sponsorintäkt per tittare, andel av ett månadspris
const CONV_SCALE = 0.7; // sortens chans att göra en utomstående till spelare, justerad så att e-sport är en bra men inte dominerande affär
const RETAIN = 0.15; // andel av de nya spelarna som stannar (höjer spelarpotentialen)
const RETAIN_MAX = 0.05; // så mycket kan e-sporten höja spelets potential i sammanlagt
const VALUE_MONTHS = 4; // så många månader räknas en ny spelare in i förväntad avkastning
const SCENE_GAIN = 10;
const SCENE_DECAY = 0.25;
const SCENE_LIFT = 0.03; // e-sportscenen på 100 ger så mycket fler spelare i grunden
const TRAD_STEP = 0.05;
const TRAD_MAX = 0.25;
const FAN_PER_VIEWER = 0.004;
const LOG_MAX = 12;
export const eraReach = (year) => clamp(0.15 + 0.1 * (year - 2000), 0.15, 2.6);
// Prisnivån jämfört med år 2000 (kostnaderna ovan är i år-2000-dollar)
const scaleOf = (year) => moneyScale(year) / moneyScale(2000);
const hash01 = (G, s) => hashStr((G.seed || 0) + ':esp:' + s) / 4294967296;
const fmtN = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');

// Spelets e-sportstillstånd skapas när det behövs (äldre sparningar saknar det)
export const espOf = (L) => L.esp || (L.esp = { scene: 0, n: 0, ready: 0, cur: null, log: [], trad: {}, auto: null, autoWarn: 0 });
export const kindOfGame = (g) => KIND[g.live && g.live.kind] || KIND.mmo;
const liveOf = (G, id) => {
  const g = G.games.find((x) => x.id === id);
  return g && g.live && !g.live.closed ? g : null;
};
const round100 = (x) => Math.round(x / 100) * 100;
// Vad ett normalt event ger spelet i dag (sponsorer och nya spelare, utan prisnivå, sändning, marknadsföring eller scen): måttet
// som kostnaderna räknas i. Beror på spelarna, tiden, sorten och spelets betyg, men inte på vad spelaren väljer.
export function refReturn(G, g) {
  const L = g.live;
  const kind = kindOfGame(g);
  const year = yearOf(G.t);
  const own = L.subs * kind.watch;
  const out = OUT0 * eraReach(year) * Math.sqrt(Math.max(L.subs, 1) / OUT_REF) * kind.out;
  const q = Math.exp(0.25 * (g.score - 7));
  const margin = Math.max(0, liveArpu(G, L) - costPerSub(G, L));
  return (own + out) * subPrices(year)[0] * SPONSOR + out * kind.conv * CONV_SCALE * q * margin * VALUE_MONTHS;
}
export const prizeOf = (G, i, g) => round100(Math.max(PRIZES[i] * scaleOf(yearOf(G.t)), g ? PRIZE_SHARE[i] * refReturn(G, g) : 0));
const prodCost = (G, i, type, g) => round100(((Math.max(PRODS[i].cost * scaleOf(yearOf(G.t)), PRODS[i].share * refReturn(G, g))) * type.weeks) / 3);
const mktCost = (G, i, g) => round100(Math.max(MKTS[i].cost * scaleOf(yearOf(G.t)), MKTS[i].share * refReturn(G, g)));
// Veckor tills nästa event får starta (0 = nu)
export const espReadyIn = (G, L) => Math.max(0, espOf(L).ready - G.t);
export const espRunning = (L) => !!(L.esp && L.esp.cur);

// Utfallets spänning (0,9–1,3 av tittarsiffran) avgörs av en hash av spelet och eventets nummer
const dramaOf = (G, g, type, n) => {
  const d = type.drama;
  return 1 + d * (hash01(G, `d${g.id}:${n}`) - 0.35);
};

// Allt ett event ger, räknat i förväg med den spänning som är normal. g = onlinespelet, i = prispeng, p = sändning, m = marknadsföring.
export function esportPlan(G, g, typeId, i, p, m, dramaMult = 1.045) {
  const L = g.live;
  const E = L.esp || { scene: 0, trad: {} }; // läser bara: förhandsvisningen ska inte skapa något i spelet
  const kind = kindOfGame(g);
  const type = ETYPE[typeId];
  const year = yearOf(G.t);
  const prize = prizeOf(G, i, g);
  const scene = 1 + (0.5 * E.scene) / 100;
  const trad = 1 + Math.min(TRAD_MAX, TRAD_STEP * ((E.trad && E.trad[typeId]) || 0));
  const players = L.subs;
  const quality = Math.exp(0.25 * (g.score - 7));
  const own = players * kind.watch * type.view * (1 + 0.25 * (PRODS[p].mult - 1));
  const fame = Math.sqrt(Math.max(players, 1) / OUT_REF);
  const out = OUT0 * eraReach(year) * fame * reachGain(Math.pow(prize / prizeOf(G, 1, g), PRIZE_EXP) * PRODS[p].mult * MKTS[m].mult) * kind.out * type.out;
  const viewers = (own + out) * scene * trad * dramaMult;
  const outsiders = out * scene * trad * dramaMult;
  const newPlayers = outsiders * kind.conv * CONV_SCALE * quality;
  const std = subPrices(year)[0];
  const sponsors = viewers * std * SPONSOR;
  const margin = Math.max(0, liveArpu(G, L) - costPerSub(G, L));
  const value = newPlayers * margin * VALUE_MONTHS;
  const cost = { prize, prod: prodCost(G, p, type, g), mkt: mktCost(G, m, g) };
  cost.total = cost.prize + cost.prod + cost.mkt;
  const back = sponsors + value;
  const roi = cost.total > 0 ? back / cost.total : 0;
  return { type, kind, own, out, viewers, newPlayers, sponsors, value, cost, back, net: back - cost.total, roi, weeks: type.weeks, fans: viewers * FAN_PER_VIEWER };
}
// Betyget på affären: hur mycket av satsningen som kommer tillbaka
export const espRating = (roi) => (roi >= 2 ? 'great' : roi >= 1.3 ? 'good' : roi >= 0.9 ? 'even' : roi >= 0.5 ? 'poor' : 'bad');
// Vilken prisnivå som ger mest pengar kvar efter eventet med vald sändning och marknadsföring (-1 om ingen lönar sig)
export function espBestPrize(G, g, typeId, p, m) {
  let best = -1;
  let bv = 0;
  PRIZES.forEach((_, i) => {
    const net = esportPlan(G, g, typeId, i, p, m).net;
    if (net > bv) {
      bv = net;
      best = i;
    }
  });
  return best;
}

// Varför en tävling som följer säsongen inte kan starta nu ('' = går bra, eller tävlingen följer inte säsongen)
export function espTypeBlock(G, g, typeId) {
  const type = ETYPE[typeId];
  if (!type || !type.season || !g || !g.live) return '';
  const L = g.live;
  if (!seasonOn(G, L)) return 'noSeason';
  if (G.t - L.season.t > RACE_WINDOW) return 'late';
  if (espOf(L).raceT === L.season.t) return 'done';
  return '';
}
const blockText = (G, g, typeId, why) => t(why === 'noSeason' ? 'err.esNoSeason' : why === 'late' ? 'err.esLate' : 'err.esDone', { name: pick(ETYPE[typeId].name), n: RACE_WINDOW });
export function canEsport(G, g, typeId) {
  if (!g || !g.live || g.live.closed) return 'gone';
  const E = espOf(g.live);
  if (E.cur) return t('err.esRunning');
  if (g.live.subs < ESP_MIN) return t('err.esSmall', { n: fmtN(ESP_MIN) });
  const why = espTypeBlock(G, g, typeId);
  if (why) return blockText(G, g, typeId, why);
  if (!(ETYPE[typeId] && ETYPE[typeId].season) && espReadyIn(G, g.live) > 0) return t('err.esRest', { n: espReadyIn(G, g.live) });
  return true;
}
// Tio toppgillen i en raidrusning: valda och rangordnade med en hash av fröet (aldrig G.rng). s = styrka, den starkaste klarar raiden först.
function raidField(G, g, n) {
  return GUILDS.map((name) => ({ name, k: hash01(G, `f${g.id}:${n}:${name}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, RAID_GUILDS)
    .map((x) => ({ name: x.name, k: x.k, s: 0.6 + 0.4 * hash01(G, `s${g.id}:${n}:${x.name}`) }));
}
// Läget i raiden efter de veckor som gått: hur många av RAID_BOSSES bossar varje gille lagt ner (bästa först). Veckorna räknas som
// eventets egna (weekShare), så det mesta händer mot slutet. Mitt i raiden får ett gille en dag som går bättre eller sämre (jit),
// så ordningen skiftar, men efter sista veckan har det starkaste gillet klarat alla och de andra färre.
const jit = (k, w) => ((Math.floor(k * 1e6) * 9301 + (w + 1) * 49297) % 233280) / 233280 * 2 - 1;
export function raceStanding(C) {
  if (!C || !C.field) return [];
  const n = C.weeks;
  const w = Math.min(C.w, n);
  const done = w >= n;
  const cum = (w * (w + 1)) / (n * (n + 1));
  const top = Math.max(...C.field.map((x) => x.s));
  return C.field
    .map((x) => {
      const f = Math.pow(x.s / top, 3) * (done ? 1 : 1 + 0.35 * (1 - cum) * jit(x.k, w));
      return { name: x.name, s: x.s, k: x.k, boss: Math.max(0, Math.min(done ? RAID_BOSSES : RAID_BOSSES - 1, Math.floor(RAID_BOSSES * cum * f + 1e-9))) };
    })
    .sort((a, b) => b.boss - a.boss || (done ? b.s - a.s : a.k - b.k));
}
export function startEsport(G, id, typeId, i, p, m) {
  const g = liveOf(G, id);
  const type = ETYPE[typeId];
  if (!g || !type || !PRIZES[i] || !PRODS[p] || !MKTS[m]) return false;
  if (!etypesOf(kindOfGame(g).id).some((x) => x.id === typeId)) return false;
  const ok = canEsport(G, g, typeId);
  if (ok !== true) return ok;
  const L = g.live;
  const E = espOf(L);
  const plan = esportPlan(G, g, typeId, i, p, m, dramaOf(G, g, type, E.n));
  if (G.money < plan.cost.total) return t('err.money');
  spend(G, plan.cost.total, 'esports');
  E.cur = { type: typeId, i, p, m, t0: G.t, until: G.t + type.weeks, weeks: type.weeks, plan, cost: plan.cost.total, viewers: 0, sponsors: 0, newPlayers: 0, w: 0 };
  if (type.season) {
    E.raceT = L.season.t;
    E.cur.field = raidField(G, g, E.n + 1);
  }
  E.n++;
  L.boost = Math.max(L.boost, G.t + type.weeks);
  note(G, 'esp.news.start', { title: g.title, name: type.name, prize: fmtN(plan.cost.prize) }, 'good', true);
  return true;
}
// Automatiska event: samma val varje gång, nästa startar när vilan är slut och kassan räcker
export function setEsportAuto(G, id, cfg) {
  const g = liveOf(G, id);
  if (!g) return false;
  const E = espOf(g.live);
  E.autoWarn = 0;
  if (!cfg) {
    E.auto = null;
    return true;
  }
  if (!ETYPE[cfg.type] || !PRIZES[cfg.i] || !PRODS[cfg.p] || !MKTS[cfg.m]) return false;
  E.auto = { type: cfg.type, i: cfg.i, p: cfg.p, m: cfg.m };
  return true;
}

// Veckans vikt: eventet bygger upp mot en final, och sista veckan har flest tittare
const weekShare = (k, n) => (k + 1) / ((n * (n + 1)) / 2);

// En ny säsong i ett MMO öppnar raidrusningen: ett meddelande en gång per säsong, om spelet är stort nog för e-sport
function raceNotice(G, g) {
  const L = g.live;
  if (!seasonOn(G, L) || L.subs < ESP_MIN || G.t - L.season.t > RACE_WINDOW) return;
  const race = etypesOf(kindOfGame(g).id).find((x) => x.season);
  if (!race) return;
  const E = espOf(L);
  if (E.seenT === L.season.t) return;
  E.seenT = L.season.t;
  if (E.raceT !== L.season.t) note(G, 'esp.news.raceOpen', { title: g.title, name: pick(race.name) }, 'good');
}

export function esportsWeek(G) {
  for (const g of liveGames(G)) {
    const L = g.live;
    raceNotice(G, g);
    if (!L.esp) continue;
    const E = L.esp;
    if (E.cur) {
      stepEvent(G, g, E);
      continue;
    }
    E.scene = Math.max(0, E.scene - SCENE_DECAY);
    L.eLift = 1 + (SCENE_LIFT * E.scene) / 100;
    const a = E.auto;
    // en tävling som följer säsongen väntar tyst på nästa säsong, de andra på att vilan tar slut
    if (a && L.subs >= ESP_MIN && (ETYPE[a.type].season ? !espTypeBlock(G, g, a.type) : G.t >= E.ready)) {
      const plan = esportPlan(G, g, a.type, a.i, a.p, a.m);
      if (G.money >= plan.cost.total * ESP_AUTO_BUFFER && startEsport(G, g.id, a.type, a.i, a.p, a.m) === true) E.autoWarn = 0;
      else if (!E.autoWarn) {
        E.autoWarn = 1;
        note(G, 'esp.news.autoPaused', { title: g.title }, 'bad');
      }
    }
  }
}

function stepEvent(G, g, E) {
  const L = g.live;
  const C = E.cur;
  const type = ETYPE[C.type];
  const plan = C.plan;
  const sh = weekShare(C.w, C.weeks);
  C.w++;
  const v = plan.viewers * sh;
  const newP = plan.newPlayers * sh;
  const spon = plan.sponsors * sh;
  C.viewers += v;
  C.sponsors += spon;
  C.newPlayers += newP;
  earn(G, spon, 'esports');
  G.stats.revenue += spon;
  L.rev += spon;
  L.subs += newP;
  L.peak = Math.max(L.peak, L.subs);
  G.fans += v * FAN_PER_VIEWER;
  // en del av de nya spelarna stannar: potentialen höjs så att målnivån följer med (högst RETAIN_MAX av grunden)
  const F = L.pot > 0 ? liveTarget(G, g) / L.pot : 1;
  const room = Math.max(0, RETAIN_MAX * Math.max(1, L.pot - (L.ePot || 0)) - (L.ePot || 0));
  const add = Math.min((RETAIN * newP) / Math.max(0.2, F), room);
  if (add > 0) {
    L.pot += add;
    L.ePot = (L.ePot || 0) + add;
  }
  L.eLift = 1 + (SCENE_LIFT * E.scene) / 100;
  if (C.w >= C.weeks) finishEvent(G, g, E, type);
}

function finishEvent(G, g, E, type) {
  const L = g.live;
  const C = E.cur;
  const winner = C.field ? raceStanding({ ...C, w: C.weeks })[0].name : `${TEAM_A[Math.floor(hash01(G, `a${g.id}:${E.n}`) * TEAM_A.length)]} ${TEAM_B[Math.floor(hash01(G, `b${g.id}:${E.n}`) * TEAM_B.length)]}`;
  const margin = Math.max(0, liveArpu(G, L) - costPerSub(G, L));
  const value = C.newPlayers * margin * VALUE_MONTHS;
  const back = C.sponsors + value;
  const roi = C.cost > 0 ? back / C.cost : 0;
  const quality = clamp(C.viewers / (Math.max(L.subs, 1) * 0.3 + 5000), 0.3, 1.5);
  E.scene = Math.min(100, E.scene + SCENE_GAIN * quality * (1 - E.scene / 130));
  E.trad[C.type] = (E.trad[C.type] || 0) + 1;
  E.ready = G.t + ESP_REST;
  L.eLift = 1 + (SCENE_LIFT * E.scene) / 100;
  G.stats.esports = (G.stats.esports || 0) + 1;
  G.stats.esportViewers = (G.stats.esportViewers || 0) + C.viewers;
  const rec = { t: G.t, type: C.type, prize: C.plan.cost.prize, cost: C.cost, viewers: Math.round(C.viewers), sponsors: Math.round(C.sponsors), newPlayers: Math.round(C.newPlayers), value: Math.round(value), roi, winner, forecast: Math.round(C.plan.viewers) };
  E.log.unshift(rec);
  if (E.log.length > LOG_MAX) E.log.pop();
  E.cur = null;
  note(G, 'esp.news.end', { title: g.title, name: type.name, team: winner, prize: fmtN(C.plan.cost.prize), v: fmtN(C.viewers), n: fmtN(C.newPlayers), roi: Math.round(roi * 100) }, roi >= 0.8 ? 'good' : 'info', false, true);
}
