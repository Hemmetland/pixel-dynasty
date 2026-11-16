// Livet i studion: ett flöde av små, synliga händelser som scenerna (studion, Skapa spel, hårdvarulabbet och fabriken) kan visa.
// Varje händelse ("beat") kommer ur en verklig ändring i simen: en bugg som hittas, en idé, ett kickoff-möte, en leverans till lagret.
// Inget här påverkar spelets utfall: händelserna läser bara, och alla val görs med hashStr (aldrig G.rng), så betyg, pengar och
// balans är desamma med eller utan flödet. Flödet sparas som de senaste händelserna i G.life (en äldre sparning får det vid behov).
//
// Bussen: emit('life', beat) för varje ny händelse. Scenerna lyssnar på den medan de är öppna och läser lifeState(G, 'dev' | 'hw')
// för att visa rätt läge när de öppnas mitt i ett projekt. lifeLog(G, sc, sedanN) ger loggen och lifeText(beat) färdig text.
//
// beat = { n, t (G.t), k (sort), sc ('dev' | 'studio' | 'hw' | 'eng' | ...), gid (onlinespelets id, annars 0), s (personalens id, 0 om ingen), who (förnamn), g (spelets eller
// produktens namn), a (ett tal: antal, betyg eller enheter), v (textvariant) }
import { emit } from '../core/bus.js';
import { t, L } from '../core/i18n.js';
import { hashStr } from '../core/rng.js';
import { fmtFull } from '../core/util.js';
import { workers, fatigueOver } from './people.js';
import { TICKS_PER_WEEK, WEEKS_PER_YEAR, yfOf, yearOf, engineNeed, engineEff } from './const.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { CERTS, certIndex, totalUnits } from '../data/certs.js';
import { membersOf, leadOf, teamName } from './teams.js';
import { crisisState } from './crisis.js'; // bara i lifeState (vid anrop)
import { FACILITIES } from './studio.js'; // bara i lifeText (vid anrop), så importcykeln gör inget

export const LIFE_MAX = 30; // så många händelser sparas
// Sorterna. sc: vilken scen de hör till. v: antal textvarianter (life.<sort>.<0..v-1> i strings.js). gap: minsta antal tick mellan två av
// samma sort (en fjärdedels vecka per tick), så att en tät ström som buggar inte fyller loggen.
export const LIFE_KINDS = {
  // spelutveckling
  idea: { sc: 'dev', v: 3, gap: 0 }, // en snilleblixt (a = poäng)
  bug: { sc: 'dev', v: 3, gap: 6 }, // en bugg hittades (a = antal)
  fix: { sc: 'dev', v: 3, gap: 6 }, // buggar rättades i slutputsen (a = antal)
  phase: { sc: 'dev', v: 2, gap: 0 }, // kickoff för en ny fas (a = 1-3)
  quarter: { sc: 'dev', v: 2, gap: 0 }, // en fjärdedel av utvecklingen klar
  half: { sc: 'dev', v: 2, gap: 0 }, // halvvägs i utvecklingen
  almost: { sc: 'dev', v: 2, gap: 0 }, // tre fjärdedelar klara
  ad: { sc: 'dev', v: 2, gap: 0 }, // en reklamkampanj rullar ut
  tired: { sc: 'dev', v: 3, gap: 8 }, // någon är slut
  crunch: { sc: 'dev', v: 2, gap: 0 }, // övertid på
  relax: { sc: 'dev', v: 2, gap: 0 }, // övertid av
  done: { sc: 'dev', v: 2, gap: 0 }, // utvecklingen klar (a = buggar kvar)
  launch: { sc: 'dev', v: 3, gap: 0 }, // släpp (a = betyg)
  chart: { sc: 'dev', v: 2, gap: 0 }, // ett spel i toppen av listan
  sold: { sc: 'dev', v: 3, gap: 0 }, // första försäljningsveckan är klar (a = sålda exemplar)
  disc: { sc: 'dev', v: 2, gap: 0 }, // guld- eller platinaskiva
  contract: { sc: 'dev', v: 2, gap: 0 }, // ett uppdrag åt någon annan är klart (a = 1 lyckat, 0 misslyckat)
  // motorverkstaden
  engStart: { sc: 'eng', v: 2, gap: 0 }, // bygget av en motor börjar (g = namnet)
  engHalf: { sc: 'eng', v: 2, gap: 0 }, // motorn halvvägs
  engTest: { sc: 'eng', v: 2, gap: 0 }, // testkörning av motorn
  engine: { sc: 'eng', v: 2, gap: 0 }, // en egen spelmotor är klar
  research: { sc: 'lab', v: 2, gap: 0 }, // labbet har klarat en forskning (g = namnet)
  // koncernen: köp, integration, styrelse, förlag och licenser
  grpBuy: { sc: 'group', v: 2, gap: 0 }, // ett bolag köps (g = namnet)
  grpSell: { sc: 'group', v: 2, gap: 0 }, // ett bolag säljs
  grpInteg: { sc: 'group', v: 2, gap: 0 }, // integrationen av ett bolag börjar
  grpDone: { sc: 'group', v: 2, gap: 0 }, // integrationen är klar
  grpClash: { sc: 'group', v: 2, gap: 0 }, // kulturkrock under integrationen
  grpCeo: { sc: 'group', v: 2, gap: 0 }, // en chef utses för ett bolag (who = chefen)
  grpReport: { sc: 'group', v: 2, gap: 0 }, // styrelsemöte med kvartalsrapport (a = antal köp)
  grpBiz: { sc: 'group', v: 2, gap: 0 }, // affärsavdelningens kvartal (a = antal avtal)
  pubSign: { sc: 'group', v: 2, gap: 0 }, // avtal med ett förlag skrivs på (g = spelet)
  pubOut: { sc: 'group', v: 3, gap: 0 }, // ett förlagsspel släpps (a = betyg)
  licDeal: { sc: 'group', v: 2, gap: 0 }, // ett licensavtal skrivs på
  film: { sc: 'group', v: 3, gap: 0 }, // filmpremiär (a = betyg)
  // butiken
  shopOpen: { sc: 'store', v: 2, gap: 0 },
  shopDown: { sc: 'store', v: 2, gap: 0 }, // butiken ligger nere
  shopUsers: { sc: 'store', v: 2, gap: 0 }, // en miljonmilstolpe (a = miljoner kunder)
  shopLevel: { sc: 'store', v: 2, gap: 0 }, // en ny butiksnivå (a = nivån)
  shopSpot: { sc: 'store', v: 2, gap: 0 }, // Veckans spel (g = spelet)
  shopDeal: { sc: 'store', v: 2, gap: 0 }, // ett erbjudande (g = spelet, a = rabatt i procent)
  shopBundle: { sc: 'store', v: 2, gap: 0 }, // ett spelpaket (a = antal spel)
  shopTheme: { sc: 'store', v: 2, gap: 0 }, // en temavecka börjar (g = namnet)
  shopRecord: { sc: 'store', v: 2, gap: 0 }, // rekord (v 0 ett spel, 1 en vecka)
  shopTop: { sc: 'store', v: 2, gap: 0 }, // ett eget spel är etta i butiken
  // onlinespel
  liveLaunch: { sc: 'live', v: 2, gap: 0 }, // ett onlinespel går live (g = spelet)
  livePatch: { sc: 'live', v: 2, gap: 0 }, // en uppdatering är ute
  liveDown: { sc: 'live', v: 2, gap: 0 }, // avbrott (v 0 driftstopp, 1 överbelastning)
  liveSeason: { sc: 'live', v: 2, gap: 0 }, // en säsong börjar
  liveSeasonEnd: { sc: 'live', v: 2, gap: 0 }, // en säsong är slut (a = nya spelare, v 0 fler, 1 oförändrat)
  liveExp: { sc: 'live', v: 2, gap: 0 }, // en expansion släpps
  liveEvent: { sc: 'live', v: 2, gap: 0 }, // ett evenemang börjar
  liveRegion: { sc: 'live', v: 2, gap: 0 }, // en ny region öppnas
  // onlinevärlden (world.js): gillen på topplistan, fejder och sända finaler. gid = onlinespelets id
  worldTier: { sc: 'live', v: 2, gap: 0 }, // världen växer ett steg (g = stegets namn, a = 1-5)
  worldLead: { sc: 'live', v: 2, gap: 8 }, // ett gille tar ledningen på topplistan (g = gillet, a = veckor in i säsongen)
  worldFeud: { sc: 'live', v: 2, gap: 0 }, // två gillen möts i final igen: en fejd (g = "A – B", a = antal finaler)
  worldFinal: { sc: 'live', v: 2, gap: 0 }, // finalen börjar (g = spelet, a = sändningen -1 ingen, 0 egen kanal, 1 studio, 2 hela världen, v 0 sänds, 1 sänds inte)
  worldChamp: { sc: 'live', v: 2, gap: 0 }, // mästaren kröns (g = gillet, a = tittare, v 0 sänds, 1 sänds inte)
  // trofésalen (book.js): prestationer, pokaler, rekord och nya årtionden
  hallAch: { sc: 'hall', v: 2, gap: 0 }, // en ny prestation (g = namnet, a = antal klara)
  hallAward: { sc: 'hall', v: 2, gap: 0 }, // en ny pokal från galan (g = spelet, a = året)
  hallRecord: { sc: 'hall', v: 4, gap: 0 }, // ett nytt rekord (v 0 betyg, 1 sålda exemplar, 2 första veckan, 3 veckor som etta; g = spelet, a = värdet)
  hallEra: { sc: 'hall', v: 2, gap: 0 }, // ett nytt årtionde börjar (g = årtalet, a = årtalet)
  // rivaler och kriser (crisis.js)
  huntMove: { sc: 'crisis', v: 5, gap: 0 }, // rivalen gör ett drag mot dig (g = rivalen, v 0 släpp på ditt släpp, 1 värvning, 2 rykten, 3 kopia, 4 rivalen floppar)
  crisisHit: { sc: 'crisis', v: 3, gap: 0 }, // en kris (g = spelet, v 0 läcka, 1 strejk, 2 flopp)
  crisisSolved: { sc: 'crisis', v: 2, gap: 0 }, // krisen eller draget är hanterat (g = rivalen eller spelet, a = vilket val, v 0 skonsamt, 1 dyrt eller illa)
  // labbet
  resStart: { sc: 'lab', v: 2, gap: 0 }, // en forskning börjar (g = namnet)
  pizza: { sc: 'dev', v: 2, gap: 12 }, // pizza till teamet under övertid
  // studion
  hired: { sc: 'studio', v: 3, gap: 0 },
  anniv: { sc: 'studio', v: 2, gap: 0 }, // en medarbetare firar år i studion (a = antal år)
  party: { sc: 'studio', v: 2, gap: 0 }, // fest efter ett riktigt bra släpp
  visitor: { sc: 'studio', v: 2, gap: 0 }, // en journalist eller gäst hälsar på efter ett bra spel
  fans: { sc: 'studio', v: 2, gap: 0 }, // fansen skickar brev när fansen nått en ny nivå (a = antal fans)
  left: { sc: 'studio', v: 2, gap: 0 },
  built: { sc: 'studio', v: 2, gap: 0 },
  // hårdvara
  hwStart: { sc: 'hw', v: 2, gap: 0 }, // en konstruktion påbörjas
  hwHalf: { sc: 'hw', v: 2, gap: 0 }, // ritningarna halvvägs
  hwProto: { sc: 'hw', v: 2, gap: 0 }, // provserien klar (a = 1 godkänd, 0 misslyckad)
  hwLeak: { sc: 'hw', v: 2, gap: 0 }, // ritningarna läcker
  hwParts: { sc: 'hw', v: 3, gap: 0 }, // en leverans till lagret (a = enheter)
  hwShort: { sc: 'hw', v: 2, gap: 0 }, // komponentbrist hos en partner (g = partnern)
  hwBatch: { sc: 'hw', v: 2, gap: 0 }, // en felaktig serie
  hwLaunch: { sc: 'hw', v: 3, gap: 0 }, // produkten når butikerna (a = betyg)
  hwRev: { sc: 'hw', v: 2, gap: 0 }, // en starkare version klar
  hwEnd: { sc: 'hw', v: 2, gap: 0 }, // en produkt läggs ned
};

export const lifeOf = (G) => G.life || (G.life = { n: 0, last: {}, items: [] });
const nowTick = (G) => G.t * TICKS_PER_WEEK + (G.tick || 0);
export const lifeName = (s) => (s && s.name ? String(s.name).split(' ')[0] : '');

// Välj en av flera (personal, projekt) utan slump ur G.rng: samma tillstånd ger samma val.
export function lifePick(G, arr, key) {
  if (!arr || !arr.length) return null;
  return arr[hashStr(`${G.seed || 0}:life:${key}:${nowTick(G)}`) % arr.length];
}

// Skapa en händelse. d: { staff (personalens objekt), g, a, v (textvariant; annars väljs den med hashStr) }. Returnerar händelsen, eller null om den dämpades eller sorten är okänd.
export function beat(G, k, d = {}) {
  const K = LIFE_KINDS[k];
  if (!K) return null;
  const LF = lifeOf(G);
  const now = nowTick(G);
  if (K.gap && now - (LF.last[k] ?? -1e9) < K.gap) return null;
  LF.last[k] = now;
  const n = ++LF.n;
  const s = d.staff || null;
  const item = { n, t: G.t, k, sc: K.sc, gid: d.gid || 0, s: s ? s.id : 0, who: lifeName(s), g: d.g ? (typeof d.g === 'object' ? L(d.g) : String(d.g)) : '', a: d.a == null ? 0 : d.a, v: d.v != null ? Math.max(0, Math.min(K.v - 1, d.v)) : hashStr(`${G.seed || 0}:life:${k}:${n}`) % K.v };
  LF.items.push(item);
  if (LF.items.length > LIFE_MAX) LF.items.shift();
  emit('life', item);
  return item;
}

// De senaste händelserna för en scen (sc utelämnad = alla), nyast sist. since: bara de med högre löpnummer än så.
export function lifeLog(G, sc, since = 0) {
  const LF = G.life;
  if (!LF) return [];
  return LF.items.filter((b) => b.n > since && (!sc || b.sc === sc));
}
// Färdig text på spelarens språk
const NUM_KINDS = new Set(['sold', 'hwParts', 'fans', 'liveSeasonEnd', 'worldChamp', 'hallRecord']); // stora tal skrivs med tusentalsavgränsare
export const lifeText = (b) => t(`life.${b.k}.${b.v}`, { who: b.who || t('life.someone'), g: b.k === 'built' && FACILITIES[b.g] ? L(FACILITIES[b.g].name) : b.g, a: NUM_KINDS.has(b.k) ? fmtFull(b.a) : b.a });

// Veckovis: den som är mest utsliten under ett pågående projekt. (De andra händelserna skapas där de sker: dev.js, hardware.js,
// people.js, studio.js och charts.js.)
const FAN_STEPS = [1e4, 5e4, 1e5, 5e5, 1e6, 5e6, 1e7];
export function lifeWeek(G) {
  const J = G.job;
  if (J && J.kind === 'game' && J.state === 'dev') {
    let worst = null;
    for (const w of workers(G)) if (fatigueOver(w) > 0 && (!worst || (w.fatigue || 0) > (worst.fatigue || 0))) worst = w;
    if (worst) beat(G, 'tired', { staff: worst, g: J.title });
    // pizza till teamet: under övertid var fjärde vecka i snitt, valt med hashStr
    if (J.crunch && hashStr(`${G.seed || 0}:life:pizza:${G.t}`) % 4 === 0) beat(G, 'pizza', { g: J.title });
  }
  // jubileer: den som varit i studion ett helt antal år (grundaren räknas från start)
  for (const s of G.staff) {
    const yrs = Math.floor((G.t - (s.hired || 0)) / WEEKS_PER_YEAR);
    if (yrs >= 1 && (G.t - (s.hired || 0)) % WEEKS_PER_YEAR === 0 && !s.away) beat(G, 'anniv', { staff: s, a: yrs });
  }
  // efter ett bra släpp: fest veckan efter försäljningsstarten, en gäst på besök veckan därpå
  for (const g of G.games) {
    if (g.auto || g.expansionOf) continue;
    const age = G.t - g.t;
    if (age === 2 && g.score >= 8) beat(G, 'party', { g: g.title, a: Math.round(g.score * 10) / 10 });
    if (age === 4 && g.score >= 7.5) beat(G, 'visitor', { g: g.title });
  }
  // fansen: ett brev för varje ny nivå
  const LF = lifeOf(G);
  const fi = FAN_STEPS.filter((x) => G.fans >= x).length;
  if (LF.fa === undefined) LF.fa = fi; // en sparning eller ett nytt spel börjar räkna nu
  else if (fi > LF.fa) {
    LF.fa = fi;
    beat(G, 'fans', { a: FAN_STEPS[fi - 1] });
  }
}

// ── Ögonblicksbilder för scenerna ──
// dev: spelutvecklingen nu. active = ett projekt pågår; phase 0-3 (3 = slutputs); pct 0-1 av hela utvecklingen (slutputsen räknas som
// de sista 15 procenten av stapeln); crew = de som arbetar.
export function lifeState(G, sc) {
  if (sc === 'hw') return hwState(G);
  if (sc === 'eng') return engState(G);
  if (sc === 'group') return groupState(G);
  if (sc === 'store') return storeState(G);
  if (sc === 'live') return liveState(G);
  if (sc === 'lab') return labState(G);
  if (sc === 'hall') return hallState(G);
  if (sc === 'crisis') return crisisState(G);
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  const crew = workers(G).map((w) => ({ id: w.id, name: lifeName(w), mood: Math.round(w.mood), fatigue: Math.round((w.fatigue || 0) * 10) / 10, trait: w.trait || null, away: !!w.away }));
  if (!J) return { active: false, phase: 0, pct: 0, bugs: 0, crunch: false, title: '', crew };
  const dev = J.state === 'dev';
  const build = Math.min(1, J.ticks / Math.max(1, J.devTicks));
  const pct = J.phase >= 3 ? 0.85 + 0.15 * Math.min(1, J.polishDone / Math.max(1, J.polishTicks)) : 0.85 * build;
  return { active: dev, phase: J.phase, pct: dev ? pct : 1, bugs: Math.round(J.bugs), crunch: !!J.crunch, title: J.title || '', hype: Math.round(J.hype || 0), report: J.state === 'report', crew };
}
function hwState(G) {
  const H = G.hw;
  if (!H) return { open: false, designing: [], testing: [], prod: [], orders: [], market: 0, fab: 0, lab: 0, crew: [] };
  const crew = H.chief ? [{ id: H.chief.id, name: lifeName(H.chief), chief: true }] : [];
  return {
    open: true,
    designing: H.projects.filter((p) => p.state === 'design').map((p) => ({ id: p.id, name: p.name, type: p.type, pct: Math.min(1, p.done / Math.max(1, p.weeks)), paused: !!p.paused })),
    testing: H.projects.filter((p) => p.state === 'fail' || p.state === 'ready').map((p) => ({ id: p.id, name: p.name, type: p.type, state: p.state })),
    prod: H.products.filter((p) => p.state === 'prod').map((p) => ({ id: p.id, name: p.name, type: p.type, stock: p.stock || 0, sold: p.sold || 0 })),
    orders: H.orders.map((o) => ({ p: o.p, units: o.units, left: o.left, partner: o.partner })),
    market: H.products.filter((p) => p.state === 'market').length,
    fab: (H.fab && H.fab.lvl) || 0,
    lab: H.lab || 0,
    crew,
  };
}

// eng: motorverkstaden. builds = pågående bygge (by 'studio' tar hela studions projektplats, by 'team' är motorteamets); team = motorteamet
// (eff 0-1, lead = arbetsledarens förnamn); engines = studions motorer med teknik och hur nära tidens behov de är (ratio, 1 = precis nog)
function engState(G) {
  const J = G.job && G.job.kind === 'engine' ? G.job : null;
  const team = G.teams ? G.teams.find((x) => x.role === 'eng') : null;
  const mem = team ? membersOf(G, team) : [];
  const lead = team ? leadOf(G, team) : null;
  const yf = yfOf(G.t);
  const need = engineNeed(Math.floor(yf));
  const builds = [];
  if (J) builds.push({ by: 'studio', name: J.name, pct: Math.min(1, J.ticks / Math.max(1, J.total)), feats: J.feats.length, cost: J.cost });
  if (team && team.ep) builds.push({ by: 'team', name: team.ep.name, pct: Math.min(1, team.ep.w / Math.max(1, team.ep.need)), feats: team.ep.feats.length, cost: team.ep.cost });
  return {
    open: !!G.u.flags.engines,
    builds,
    team: team ? { id: team.id, name: L(teamName(team)), n: mem.length, eff: Math.round((team.eff || 0) * 100) / 100, lead: lead ? lifeName(lead) : '' } : null,
    engines: G.engines.map((e) => ({ id: e.id, name: e.name, tech: e.tech, built: e.built, ratio: Math.round((engineEff(e, yf) / need) * 100) / 100, team: !!e.team })),
    crew: mem.map((s) => ({ id: s.id, name: lifeName(s), lead: !!lead && lead.id === s.id })),
  };
}
// group: koncernen. subs = ägda bolag (mode 'free' eller 'int', integ 0-1, ceo = chefens förnamn), pub = förlagsavtal på gång, lic = licensavtal på gång
function groupState(G) {
  const subs = (G.comps || []).filter((c) => c.owned).map((c) => ({ id: c.id, name: c.name, mode: c.sub ? c.sub.mode : 'free', integ: c.sub ? Math.round((c.sub.integ || 0) * 100) / 100 : 0, ceo: c.sub && c.sub.ceo ? lifeName(c.sub.ceo) : '' }));
  return {
    open: !!G.u.flags.group,
    board: !!G.u.flags.groupBoard,
    subs,
    pub: G.pub ? G.pub.deals.filter((d) => !d.out).length : 0,
    lic: G.fr ? G.fr.deals.filter((d) => !d.done).length : 0,
  };
}
// store: den egna butiken. lvl 1-6, spots/deals/bundles = pågående kampanjer, ev = temavecka just nu (namn eller null), team = butiksteamets effekt (0-1) eller null
function storeState(G) {
  const S = G.store;
  if (!S) return { open: false, lvl: 0, spots: 0, deals: 0, bundles: 0, ev: null, team: null, paused: false };
  const shop = G.teams ? G.teams.find((x) => x.role === 'shop') : null;
  return {
    open: true,
    lvl: S.lvl || 1,
    spots: (S.spots || []).length,
    deals: (S.deals || []).length,
    bundles: (S.bundles || []).length,
    ev: S.ev && !S.ev.done ? L(S.ev.name) || S.ev.id : null,
    team: shop ? Math.round((S.tm || 0) * 100) / 100 : null,
    paused: !!S.paused,
  };
}
// live: onlinespelen. games = levande spel (subs = spelare, fresh 0-100 hur nytt innehållet är, down = avbrott på senare tid, season/patch/event/region pågår,
// world = onlinevärlden eller null innan den har en topplista, se worldScene)
function liveState(G) {
  const games = G.games.filter((g) => g.live && !g.live.closed).map((g) => ({ id: g.id, name: L(g.title), subs: Math.round(g.live.subs || 0), fresh: Math.round(g.live.fresh || 0), season: !!g.live.season, patch: !!g.live.patch, event: !!(g.live.ev && g.live.ev.until > G.t), region: !!g.live.region, ops: !!G.teams && G.teams.some((x) => x.role === 'ops' && x.target === g.id), world: worldScene(G, g) }));
  return { open: games.length > 0, games, server: (G.office && G.office.fac && G.office.fac.server && G.office.fac.server.lvl) || 0 };
}
// Onlinevärlden för en scen (world.js): tier 1-5 (liten by ... hela världen), week/weeks = hur långt säsongen kommit, heat 0-100 (spänningen),
// lead = gillet som leder, count = antal gillen, guilds = de fem främsta (name, pts, fame, ti = titlar), noun 'guild' eller 'team' (lagsporter),
// feud = två gillen som mött varandra i final flera gånger i rad ({a, b, n}) eller null, champ = senaste mästaren, prod = vald sändning (-1 av,
// 0 egen kanal, 1 studio, 2 hela världen, auto = Auto väljer). final = null eller en final som pågår: round 1 (semifinaler: semis = [[a, b, vinnare], ...])
// eller 2 (finalen: a, b), prod = sändningen finalen har (-1 sänds inte), viewers = tittare hittills.
function worldScene(G, g) {
  const W = g.live.world;
  if (!W || !W.tier) return null;
  const rank = [...W.guilds].sort((a, b) => b.pts - a.pts || b.fame - a.fame || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const F = W.fin;
  return {
    tier: W.tier,
    n: W.n,
    week: Math.min(24, G.t - W.t0),
    weeks: 24,
    heat: Math.round(W.heat),
    lead: W.lead,
    count: W.guilds.length,
    noun: ['sports', 'shooter', 'arena'].includes(g.live.kind) ? 'team' : 'guild',
    guilds: rank.slice(0, 5).map((x) => ({ name: x.name, pts: Math.round(x.pts), fame: x.fame, ti: x.ti })),
    feud: W.feud && W.feud.n >= 2 ? { a: W.feud.a, b: W.feud.b, n: W.feud.n } : null,
    champ: W.champ,
    prod: W.auto ? 'auto' : W.prod,
    final: F ? { round: F.w >= 2 ? 2 : 1, prod: F.prod, a: F.final[0], b: F.final[1], semis: F.semis.map((x) => [...x]), viewers: Math.round(F.viewers) } : null,
  };
}
// hall: trofésalen. ach/total = klara prestationer, recent = de sex senaste (id, name, t = veckan, -1 om datum saknas), awards = pokaler från galan, galas = år med pokal,
// discs = antal skivor per nivå (silver, guld, platina, diamant), decade = årtiondets första år, best/seller = bästa spel och storsäljare (title, v) eller null, no1 = listettor
function hallState(G) {
  const T = G.achT || {};
  const recent = ACHIEVEMENTS.filter((a) => G.ach.includes(a.id))
    .map((a) => ({ id: a.id, name: L(a.name), t: T[a.id] == null ? -1 : T[a.id] }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 6);
  const discs = CERTS.map(() => 0);
  for (const g of G.games) {
    const i = g.cert ?? certIndex(totalUnits(g));
    if (i >= 0) discs[i]++;
  }
  const full = G.games.filter((g) => !g.expansionOf);
  const top = (f) => full.reduce((b, g) => (f(g) > (b ? f(b) : 0) ? g : b), null);
  const bs = top((g) => g.score);
  const sl = top((g) => totalUnits(g));
  return {
    open: G.games.length > 0,
    ach: G.ach.length,
    total: ACHIEVEMENTS.length,
    recent,
    awards: G.awards.length,
    galas: new Set(G.awards.map((a) => a.year)).size,
    discs,
    decade: Math.floor(yearOf(G.t) / 10) * 10,
    best: bs ? { title: L(bs.title), v: Math.round(bs.score * 10) / 10 } : null,
    seller: sl ? { title: L(sl.title), v: Math.round(totalUnits(sl)) } : null,
    no1: G.stats.no1 || 0,
  };
}
// lab: forskningen. active = pågående forskning (pct 0-1), done = antal klara, team = forskningsteamen
function labState(G) {
  const active = (G.research ? G.research.active : []).map((a) => ({ id: a.id, pct: Math.min(1, a.progress / Math.max(1, a.total)) }));
  const lab = G.office && G.office.fac && G.office.fac.lab ? G.office.fac.lab.lvl : 0;
  return { lab, active, done: G.research ? G.research.done.length : 0, teams: G.teams ? G.teams.filter((x) => x.role === 'res').length : 0 };
}
