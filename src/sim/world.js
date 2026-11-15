// Livespel i skala: ett onlinespel som blivit stort får en egen värld med en topplista av rivaliserande gillen (i lagsporter lag), en
// säsong på 24 veckor och en final som kan sändas. Världen växer med spelarna i fem steg (liten by, landskap, kungarike, kontinent, hela
// världen): fler gillen, mer tittare och dyrare sändningar att välja bland.
//
// Gillena lever sitt eget liv oavsett vad spelaren gör: de samlar poäng varje vecka, ledningen byter hand, spänningen (heat) stiger när
// det är jämnt och vid ledarbyten, och två gillen som möts i final flera gånger i rad blir ärkefiender (fejd). I veckan då säsongen är
// slut spelar de fyra bästa semifinal och final (två veckor), och mästaren kröns. Gillen tappar och vinner styrka mellan säsongerna,
// och ett gille som stannat längst ner läggs ibland ner så att ett nytt tar dess plats.
//
// Spelaren väljer bara om finalen ska sändas (Ingen, Egen kanal, Studio eller Hela världen, eller Auto som väljer det bästa som lönar sig
// och som kassan klarar) och betalar sändningen. Ingenting kostar eller ger pengar om sändningen är av: då är världen bara en historia
// att följa. Sändningen ger tittare, sponsorintäkter, nya spelare, fans och lyfter e-sportscenen (esports.js). Allt som slumpas görs
// med en hash av fröet (aldrig G.rng), så slumpföljden i resten av spelet är densamma med eller utan världen. En äldre sparning saknar
// L.world och får den första veckan spelet har tillräckligt många spelare.
import { clamp } from '../core/util.js';
import { hashStr } from '../core/rng.js';
import { yearOf } from './const.js';
import { earn, spend } from './studio.js';
import { note } from './news.js';
import { beat } from './life.js';
import { liveGames, liveArpu, costPerSub, subPrices, liveTarget } from './live.js';
import { espOf, kindOfGame, refReturn, eraReach, scaleOf, OUT0, OUT_REF, SPONSOR, CONV_SCALE, RETAIN, RETAIN_MAX, VALUE_MONTHS, FAN_PER_VIEWER } from './esports.js';
import { GUILDS, TEAM_A, TEAM_B } from '../data/onlinekinds.js';

export const WORLD_SEASON = 24; // veckor från säsongens start till finalen
export const WORLD_FINAL_WEEKS = 2; // semifinal en vecka, final en vecka, och sedan kröns mästaren
export const WORLD_MIN = 2000; // spelare som behövs för att världen ska få en topplista
// Världens steg: min = spelare, guilds = så många gillen på topplistan, prod = högsta sändning (0 egen kanal, 1 studio, 2 hela världen)
export const WORLD_TIERS = [
  { id: 'village', min: 2000, guilds: 4, prod: 0, name: { sv: 'Liten by', en: 'Small village' } },
  { id: 'land', min: 20000, guilds: 6, prod: 1, name: { sv: 'Landskap', en: 'Countryside' } },
  { id: 'kingdom', min: 150000, guilds: 8, prod: 1, name: { sv: 'Kungarike', en: 'Kingdom' } },
  { id: 'continent', min: 800000, guilds: 10, prod: 2, name: { sv: 'Kontinent', en: 'Continent' } },
  { id: 'globe', min: 3000000, guilds: 12, prod: 2, name: { sv: 'Hela världen', en: 'Whole world' } },
];
export const worldTierOf = (subs) => WORLD_TIERS.filter((x) => subs >= x.min).length; // 0 = ingen värld än, annars 1-5
// Sändningens nivåer: kostnaden är det största av ett grundbelopp (i år-2000-dollar, följer prisnivån) och en andel av vad ett normalt
// event ger spelet (refReturn i esports.js), så att ett stort spel satsar i samma mått som ett litet. mult kommer från PRODS.
export const WORLD_PROD = [
  { cost: 6000, share: 0.35 },
  { cost: 30000, share: 0.9 },
  { cost: 125000, share: 2.5 },
];
// Hur många fler utomstående en sändning drar i ett visst steg (1-5): en stor värld har mer att visa upp, så en dyr sändning lönar sig först när
// världen är stor (studio från kungariket, hela världen från kontinenten)
export const worldReach = (p, tier) => [1, 1.1 + 0.2 * tier, 0.1 + 0.8 * tier][p];
export const WORLD_AUTO_ROI = 1.2; // Auto sänder bara när affären väntas ge minst så här mycket tillbaka
export const WORLD_AUTO_BUFFER = 3; // och när kassan räcker till så här många sändningar
const VIEW = 1.1; // så många av dem som följer ett vanligt event följer en final
const OUT_MULT = 0.8;
const SCENE_BUMP = 5;
const FINAL_SHARE = [0.4, 0.6]; // semifinalveckan och finalveckan
const LOG_MAX = 8;
const HEAT_SWAP = 12;
const HEAT_DECAY = 0.96;

const h = (G, s) => hashStr((G.seed || 0) + ':wld:' + s) / 4294967296;
const round100 = (x) => Math.round(x / 100) * 100;
const fmtN = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');

// Sorter med lag i stället för gillen (för namn och ord)
export const WORLD_TEAM_KINDS = ['sports', 'shooter', 'arena'];
export const worldNounOf = (kind) => (WORLD_TEAM_KINDS.includes(kind) ? 'team' : 'guild');
export const WORLD_NOUN = {
  guild: { s: { sv: 'gille', en: 'guild' }, p: { sv: 'gillen', en: 'guilds' } },
  team: { s: { sv: 'lag', en: 'team' }, p: { sv: 'lag', en: 'teams' } },
};
const poolOf = (noun) => (noun === 'team' ? TEAM_A.flatMap((a) => TEAM_B.map((b) => `${a} ${b}`)) : GUILDS);

// Topplistan: flest poäng först (lika: störst ryktbarhet, sedan namnet)
export const worldLadder = (W) => [...W.guilds].sort((a, b) => b.pts - a.pts || b.fame - a.fame || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
export const worldOf = (g) => (g && g.live && g.live.world) || null;
// Högsta sändning världen har nått upp till (0-2)
export const worldProdCap = (W) => (W && W.tier ? WORLD_TIERS[W.tier - 1].prod : 0);

function freshName(G, g, W, salt) {
  const used = new Set([...W.guilds.map((x) => x.name), ...W.log.map((r) => r.champ)]);
  const noun = worldNounOf(g.live.kind);
  const ranked = poolOf(noun)
    .map((n) => ({ n, k: h(G, `nm${g.id}:${salt}:${n}`) }))
    .sort((a, b) => a.k - b.k);
  return (ranked.find((x) => !used.has(x.n)) || ranked[0]).n;
}
const newGuild = (G, g, W, salt) => ({ name: freshName(G, g, W, salt), s: 0.55 + 0.45 * h(G, `s${g.id}:${salt}`), fame: 0, pts: 0, ti: 0, age: 0 });

function newWorld(G) {
  return { n: 1, t0: G.t, tier: 0, guilds: [], heat: 0, lead: '', swaps: 0, fin: null, log: [], prod: -1, auto: false, champ: '', feud: null, hint: 0, pot: 0 };
}

// Vad en final väntas ge med vald sändning p (-1 = ingen sändning: allt noll). Läser bara. drama = spänningen i matcherna (1,045 är normalt).
export function worldPlan(G, g, p, drama = 1.045) {
  const L = g.live;
  const W = L.world;
  const none = { p, viewers: 0, own: 0, out: 0, newPlayers: 0, sponsors: 0, value: 0, cost: 0, back: 0, net: 0, roi: 0, fans: 0 };
  if (p < 0) return none;
  const kind = kindOfGame(g);
  const year = yearOf(G.t);
  const heat = W ? W.heat : 0;
  const lift = (1 + (0.5 * heat) / 100) * (1 + 0.05 * ((W ? W.guilds.length : 4) - 4));
  const players = L.subs;
  const quality = Math.exp(0.25 * (g.score - 7));
  const own = players * kind.watch * VIEW * (1 + 0.25 * (worldReach(p, W ? W.tier : 1) - 1)) * lift * drama;
  const out = OUT0 * eraReach(year) * Math.sqrt(Math.max(players, 1) / OUT_REF) * OUT_MULT * worldReach(p, W ? W.tier : 1) * lift * kind.out * drama;
  const viewers = own + out;
  const newPlayers = out * kind.conv * CONV_SCALE * quality;
  const sponsors = viewers * subPrices(year)[0] * SPONSOR;
  const margin = Math.max(0, liveArpu(G, L) - costPerSub(G, L));
  const value = newPlayers * margin * VALUE_MONTHS;
  const cost = round100(Math.max(WORLD_PROD[p].cost * scaleOf(year), WORLD_PROD[p].share * refReturn(G, g)));
  const back = sponsors + value;
  return { p, viewers, own, out, newPlayers, sponsors, value, cost, back, net: back - cost, roi: cost > 0 ? back / cost : 0, fans: viewers * FAN_PER_VIEWER };
}

// Vilken sändning Auto väljer: den som ger mest pengar kvar bland dem som väntas ge minst WORLD_AUTO_ROI tillbaka och som kassan klarar (-1 = ingen)
export function worldAutoPick(G, g, W) {
  let best = -1;
  let bv = 0;
  for (let p = 0; p <= worldProdCap(W); p++) {
    const pl = worldPlan(G, g, p);
    if (pl.roi >= WORLD_AUTO_ROI && G.money >= pl.cost * WORLD_AUTO_BUFFER && pl.net > bv) {
      bv = pl.net;
      best = p;
    }
  }
  return best;
}

// Spelarens val: sändning -1 (ingen), 0 (egen kanal), 1 (studio) eller 2 (hela världen). Går bara när världen har en topplista och steget räcker.
export function setWorldProd(G, id, p) {
  const g = liveGames(G).find((x) => x.id === id);
  const W = worldOf(g);
  if (!W || !(p >= -1 && p <= 2) || p !== Math.floor(p)) return false;
  if (p > worldProdCap(W)) return false;
  W.prod = p;
  W.auto = false;
  return true;
}
export function setWorldAuto(G, id, on) {
  const g = liveGames(G).find((x) => x.id === id);
  const W = worldOf(g);
  if (!W) return false;
  W.auto = !!on;
  return true;
}

// ── Veckan ──
export function worldWeek(G) {
  for (const g of liveGames(G)) {
    const L = g.live;
    const tier = worldTierOf(L.subs);
    let W = L.world;
    if (!W) {
      if (!tier) continue;
      W = L.world = newWorld(G);
    }
    if (tier > W.tier) grow(G, g, W, tier);
    if (!W.tier) continue;
    if (W.fin) finalWeek(G, g, W);
    else {
      ladderWeek(G, g, W);
      if (G.t - W.t0 >= WORLD_SEASON) startFinal(G, g, W);
    }
  }
}

// Världen växer ett eller flera steg: nya gillen kommer in mitt i säsongen med en del av fältets poäng
function grow(G, g, W, tier) {
  const first = W.tier === 0;
  const want = WORLD_TIERS[tier - 1].guilds;
  const avg = W.guilds.length ? W.guilds.reduce((a, x) => a + x.pts, 0) / W.guilds.length : 0;
  while (W.guilds.length < want) {
    const x = newGuild(G, g, W, `g${W.guilds.length}:${W.n}`);
    x.pts = avg * 0.6;
    W.guilds.push(x);
  }
  W.tier = tier;
  const noun = WORLD_NOUN[worldNounOf(g.live.kind)];
  note(G, first ? 'world.news.born' : 'world.news.grow', { title: g.title, name: WORLD_TIERS[tier - 1].name, n: want, gs: noun.p }, 'good');
  beat(G, 'worldTier', { g: WORLD_TIERS[tier - 1].name, a: tier, gid: g.id });
}

function ladderWeek(G, g, W) {
  // veckans poäng: gillets styrka, dagsformen och ibland en het period på tre veckor (ett gille som går på högvarv)
  const block = Math.floor(G.t / 3);
  for (const x of W.guilds) x.pts += 10 * x.s * (0.35 + 1.3 * h(G, `p${g.id}:${G.t}:${x.name}`)) * (h(G, `hot${g.id}:${block}:${x.name}`) < 0.12 ? 1.6 : 1);
  const rank = worldLadder(W);
  const lead = rank[0].name;
  const age = G.t - W.t0;
  if (W.lead && W.lead !== lead) {
    W.swaps++;
    W.heat += HEAT_SWAP;
    if (age >= 4) beat(G, 'worldLead', { g: lead, a: age, gid: g.id });
  }
  W.lead = lead;
  const gap = rank.length > 1 ? (rank[0].pts - rank[1].pts) / Math.max(1, rank[0].pts) : 1;
  if (gap < 0.04 && age >= WORLD_SEASON / 2) W.heat += 3;
  W.heat = clamp(W.heat * HEAT_DECAY, 0, 100);
}

// Finalen: fyra bästa spelar semifinal (1 mot 4, 2 mot 3) och final. Hela utslagningen avgörs med en hash när finalen startar (starkare gille
// och bättre placering vinner oftare), men visas vecka för vecka.
function startFinal(G, g, W) {
  const top = worldLadder(W).slice(0, 4);
  const win = (a, b, key) => (h(G, `m${g.id}:${W.n}:${key}`) * (a.s ** 4 * 1.15 + b.s ** 4) < a.s ** 4 * 1.15 ? a : b);
  const w1 = win(top[0], top[3], 's1');
  const w2 = win(top[1], top[2], 's2');
  const champ = win(w1, w2, 'f');
  const cap = worldProdCap(W);
  let p = W.auto ? worldAutoPick(G, g, W) : Math.min(W.prod, cap);
  const drama = 1 + 0.3 * (h(G, `dr${g.id}:${W.n}`) - 0.35);
  let plan = worldPlan(G, g, p, drama);
  if (p >= 0 && G.money < plan.cost) {
    p = -1;
    plan = worldPlan(G, g, -1);
  }
  if (p >= 0) spend(G, plan.cost, 'esports');
  W.fin = {
    t0: G.t,
    n: W.n,
    w: 0,
    prod: p,
    heat: Math.round(W.heat),
    semis: [
      [top[0].name, top[3].name, w1.name],
      [top[1].name, top[2].name, w2.name],
    ],
    final: [w1.name, w2.name, champ.name],
    plan,
    cost: p >= 0 ? plan.cost : 0,
    viewers: 0,
    sponsors: 0,
    newPlayers: 0,
  };
  beat(G, 'worldFinal', { g: g.title, a: p, v: p >= 0 ? 0 : 1, gid: g.id });
  airRound(G, g, W, 0);
  W.fin.w = 1;
}

// En sänd omgång (0 semifinal, 1 final): tittare, sponsorer och nya spelare i förhållande till omgångens andel
function airRound(G, g, W, round) {
  const F = W.fin;
  if (F.prod < 0) return;
  const L = g.live;
  const sh = FINAL_SHARE[round];
  const pl = F.plan;
  const v = pl.viewers * sh;
  const newP = pl.newPlayers * sh;
  const spon = pl.sponsors * sh;
  F.viewers += v;
  F.sponsors += spon;
  F.newPlayers += newP;
  earn(G, spon, 'esports');
  G.stats.revenue += spon;
  L.rev += spon;
  L.subs += newP;
  L.peak = Math.max(L.peak, L.subs);
  G.fans += v * FAN_PER_VIEWER;
  // en del av de nya spelarna stannar: potentialen höjs så att målnivån följer med (högst RETAIN_MAX av grunden, för världens finaler)
  const Fm = L.pot > 0 ? liveTarget(G, g) / L.pot : 1;
  const room = Math.max(0, RETAIN_MAX * Math.max(1, L.pot - (L.ePot || 0) - W.pot) - W.pot);
  const add = Math.min((RETAIN * newP) / Math.max(0.2, Fm), room);
  if (add > 0) {
    L.pot += add;
    W.pot += add;
  }
}

function finalWeek(G, g, W) {
  const F = W.fin;
  if (F.w === 1) {
    airRound(G, g, W, 1);
    F.w = 2;
    return;
  }
  finishFinal(G, g, W);
}

function finishFinal(G, g, W) {
  const L = g.live;
  const F = W.fin;
  const rank = worldLadder(W);
  const byName = Object.fromEntries(W.guilds.map((x) => [x.name, x]));
  const champName = F.final[2];
  const runName = F.final[0] === champName ? F.final[1] : F.final[0];
  const semiNames = F.semis.map((s) => (s[2] === s[0] ? s[1] : s[0]));
  // ryktbarhet: mästare 10, tvåa 6, semifinalförlorare 3, de andra 1
  for (const x of W.guilds) x.fame += x.name === champName ? 10 : x.name === runName ? 6 : semiNames.includes(x.name) ? 3 : 1;
  byName[champName].ti++;
  // fejd: samma två gillen i final flera gånger i rad
  const pair = [F.final[0], F.final[1]].sort();
  W.feud = W.feud && [W.feud.a, W.feud.b].sort().join('|') === pair.join('|') ? { a: W.feud.a, b: W.feud.b, n: W.feud.n + 1 } : { a: F.final[0], b: F.final[1], n: 1 };
  if (W.feud.n === 2) beat(G, 'worldFeud', { g: `${W.feud.a} – ${W.feud.b}`, a: W.feud.n, gid: g.id });
  // utfallet i pengar
  const margin = Math.max(0, liveArpu(G, L) - costPerSub(G, L));
  const value = F.newPlayers * margin * VALUE_MONTHS;
  const back = F.sponsors + value;
  const roi = F.cost > 0 ? back / F.cost : 0;
  const rec = { t: G.t, n: F.n, champ: champName, runner: runName, prod: F.prod, tier: W.tier, viewers: Math.round(F.viewers), sponsors: Math.round(F.sponsors), newPlayers: Math.round(F.newPlayers), cost: Math.round(F.cost), value: Math.round(value), roi, heat: F.heat, feud: W.feud.n };
  W.log.unshift(rec);
  if (W.log.length > LOG_MAX) W.log.pop();
  W.champ = champName;
  G.stats.worldFinals = (G.stats.worldFinals || 0) + 1;
  if (F.prod >= 0) {
    G.stats.worldViewers = (G.stats.worldViewers || 0) + F.viewers;
    const E = espOf(L);
    E.scene = Math.min(100, E.scene + SCENE_BUMP * clamp(F.viewers / (Math.max(L.subs, 1) * 0.3 + 5000), 0.3, 1.5) * (1 - E.scene / 130));
    L.eLift = 1 + (0.03 * E.scene) / 100;
    note(G, 'world.news.final', { title: g.title, team: champName, v: fmtN(F.viewers), n: fmtN(F.newPlayers), roi: Math.round(roi * 100) }, roi >= 0.8 ? 'good' : 'info', false, true);
  } else {
    note(G, W.hint ? 'world.news.quiet' : 'world.news.hint', { title: g.title, team: champName }, 'info', true);
    W.hint = 1;
  }
  beat(G, 'worldChamp', { g: champName, a: Math.round(F.viewers), v: F.prod >= 0 ? 0 : 1, gid: g.id });
  // nästa säsong: poängen nollställs, gillens form ändras, och ett gille som hamnat längst ner efter minst två säsonger kan läggas ner
  const drop = [...rank].reverse().find((x) => x.age >= 2);
  const swap = drop && W.guilds.length >= 6 && h(G, `ch${g.id}:${W.n}`) < 0.6 ? drop.name : '';
  for (const x of W.guilds) {
    x.pts = 0;
    x.age++;
    x.s = clamp(x.s + 0.14 * (h(G, `fm${g.id}:${W.n}:${x.name}`) - 0.5) + (x.name === champName ? 0.01 : 0), 0.5, 1);
  }
  if (swap) {
    const i = W.guilds.findIndex((x) => x.name === swap);
    W.guilds[i] = newGuild(G, g, W, `r${W.n}`);
  }
  W.heat = W.heat * 0.4 + (W.feud.n >= 2 ? 12 * Math.min(W.feud.n, 4) : 0);
  W.n++;
  W.t0 = G.t;
  W.lead = '';
  W.fin = null;
}
