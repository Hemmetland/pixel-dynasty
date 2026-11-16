// Funktionstest av sim-API:t (ingen UI): varje åtgärd ska fungera utan fel.
import * as S from '../src/sim/index.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENTS, EV } from '../src/data/events.js';
import { exportCode, importCode, recordRun, loadHall, saveGame, loadGame, deleteSave, slotList, latestSlot, freeSlot, activeSlot, useSlot, hasSave, saveMeta, SLOTS } from '../src/core/store.js';
import { PLATFORM, PLATFORMS } from '../src/data/platforms.js';
import { STRINGS } from '../src/data/strings.js';
import { on as onBus } from '../src/core/bus.js';
import { setLang } from '../src/core/i18n.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { ACH_CATS, ACH_CAT, ACH_DECADE, ACH_WITH_PROGRESS, achProgress } from '../src/data/achmeta.js';
import { weeklyOf } from '../src/core/weekly.js';
import { identityName } from '../src/data/identity.js';
import { STORE_EVENTS } from '../src/data/storeevents.js';
import { FRANCHISES, FRANCHISE, frTitle } from '../src/data/franchises.js';
import { COMPETITORS } from '../src/data/names.js';
import { TOPIC } from '../src/data/topics.js';
import { GENRE } from '../src/data/genres.js';
import { KINDS, KIND, ETYPES, kindOf, etypesOf, GUILDS, TEAM_A } from '../src/data/onlinekinds.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const G = S.newGame({ studio: 'T', seed: 7, difficulty: 'normal' });
S.makeCompetitors(G); S.initWorld(G);
G.money = 5e6; G.fans = 5000;
// forskning
for (const r of RESEARCH) { G.research.done.push(r.id); S.applyUnlocks(G, r); }
delete G.u.flags.store; // butiken (och dess veckokostnader) testas för sig längre ner
G.t = 48 * 20 + 3; // 2000
G.office.tier = 3;
ok(S.buildFacility(G, 'lab') === true, 'bygg labb');
ok(S.buildFacility(G, 'qa') === true, 'bygg QA');
ok(S.buildFacility(G, 'training') === true, 'bygg utbildning');
ok(S.buildFacility(G, 'lab') === true, 'uppgradera labb');
// personal
S.refreshCandidates(G);
for (const c of G.candidates.slice(0, 3)) ok(S.hire(G, c.id) === true, 'anställ ' + c.name);
const st = G.staff[1];
ok(S.train(G, st.id, 'design') === true, 'utbilda');
// kursens längd följer spelets tempo (tempo.js)
for (let i = 0; i < (S.trainWeeks(G) + 1) * S.TICKS_PER_WEEK; i++) S.stepTick(G);
ok(!st.trainSkill, 'utbildning klar');
ok(S.raise(G, st.id), 'löneförhöjning');
// licens + spel
ok(S.buyLicense(G, 'nova32') === true || G.licenses.includes('nova32'), 'köp licens');
const r = S.startProject(G, { title: 'Feat', topic: 'fantasy', genre: 'rpg', genre2: 'adventure', platform: 'pc', scope: 'large', audience: 'mature' });
ok(typeof r === 'object', 'starta stort spel med två genrer');
let guard = 0;
while (G.job && guard++ < 6000) {
  if (G.pending.length) {
    const p = G.pending[0];
    if (p.type === 'event') S.resolveEvent(G, p.id, 0); else if (p.type === 'phase') { S.setPhaseFocus(G, p.phase, S.idealFocus(G, 'rpg', p.phase, 'adventure')); G.pending.shift(); } else if (p.type === 'report') break; else G.pending.shift();
    continue;
  }
  if (G.job.kind === 'game' && G.job.phase === 1 && !G.job.marketing.length) { const o = S.marketingOptions(G).find((x) => !x.used); if (o) S.launchMarketing(G, o.id); }
  S.stepTick(G);
}
ok(G.job && G.job.state === 'report', 'spel klart för recension');
const crew0 = S.workers(G).map((w) => w.id);
const g = S.releaseGame(G);
ok(g && g.score > 0 && g.total > 0, 'släpp spel: betyg ' + g.score + ' prognos ' + Math.round(g.total));
ok(crew0.length > 0 && G.staff.filter((w) => crew0.includes(w.id)).every((w) => w.gx && w.gx.rpg === 1 && w.gx.adventure === 1), 'varje medarbetare i projektet får rutin i båda genrerna (genrekunskap)');
{
  const lg = S.scoreLegs(g.parts, g.scope);
  ok(lg.craft >= 0 && lg.craft <= 100 && lg.recipe >= 0 && lg.recipe <= 100 && ['craft', 'recipe', 'none'].includes(lg.weak), 'betygets två ben ger tal 0 till 100 och pekar ut det svagaste');
  ok(g.parts.know >= 0 && g.parts.know <= S.GX_MAX && g.insights.every((x) => x.k !== 'know' || x.v === g.parts.know), 'rapporten bär teamets snittrutin i genren');
}
for (let i = 0; i < 200; i++) { if (G.pending.length) G.pending.shift(); S.stepTick(G); }
ok(g.revenue > 0 && g.units > 0, 'försäljning rullar: ' + Math.round(g.revenue));
ok(S.patchGame(G, g.id) === true || g.bugs < 3 || g.ended, 'patch');
// uppföljare
const r2 = S.startProject(G, { title: 'Feat 2', topic: g.topic, genre: g.genre, platform: 'pc', scope: 'medium', audience: 'everyone', sequelOf: g.id });
ok(typeof r2 === 'object' && r2.chain === 2, 'uppföljare chain=' + r2.chain);
S.cancelProject(G);
// kontrakt
S.refreshContracts(G);
ok(G.contracts.length > 0, 'kontrakt finns');
ok(S.acceptContract(G, G.contracts[0].id) === true, 'ta kontrakt');
for (let i = 0; i < 400 && G.job; i++) { if (G.pending.length) G.pending.shift(); S.stepTick(G); }
ok(!G.job, 'kontrakt avslutat');
// motor
ok(S.buildEngine(G, 'Test', ['sprites', 'scroll', 'tiles', 'poly']) === true, 'bygg motor');
for (let i = 0; i < 400 && G.job; i++) { if (G.pending.length) G.pending.shift(); S.stepTick(G); }
ok(G.engines.length === 1, 'motor klar');
const r3 = S.startProject(G, { title: 'Eng', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone', engineId: G.engines[0].id });
ok(typeof r3 === 'object' && r3.engineId, 'spel med motor');
S.cancelProject(G);
// lån
ok(S.takeLoan(G, 20000) > 0, 'ta lån');
ok(S.repayLoan(G, 10000) > 0, 'betala tillbaka');
// kontor: pengar och fans räcker inte längre, det krävs också spel, team, betyg och rätt år (avsiktlig ändring)
G.money = 1e8; G.fans = 1e6;
ok(S.canUpgradeOffice(G) !== true, 'kontor: pengar och fans räcker inte (saknas: ' + S.canUpgradeOffice(G) + ')');
ok(S.officeReqs(G).length === 6 && S.officeReqs(G).every((r) => typeof r.ok === 'boolean'), 'kontor: sex krav med status');
const GX = JSON.parse(JSON.stringify(G));
GX.office.tier = 0;
GX.t = 48 * 20;
GX.games = Array.from({ length: 60 }, (_, i) => ({ ...GX.games[0], id: 7000 + i, score: 9 }));
GX.staff = Array.from({ length: 36 }, (_, i) => ({ ...GX.staff[0], id: 6000 + i }));
ok(S.canUpgradeOffice(GX) === true && S.upgradeOffice(GX) && GX.office.tier === 1, 'kontor: alla krav uppfyllda ger nivå 1');
GX.games = GX.games.slice(0, 3);
ok(S.canUpgradeOffice(GX) === 'games', 'kontor: för få spel blockerar (' + S.canUpgradeOffice(GX) + ')');
GX.games = Array.from({ length: 60 }, (_, i) => ({ ...GX.games[0], id: 7100 + i, score: 4 }));
ok(S.canUpgradeOffice(GX) === 'avg', 'kontor: dåligt snittbetyg blockerar (' + S.canUpgradeOffice(GX) + ')');
GX.games.forEach((g) => { g.score = 9; });
GX.t = 48 * 3;
ok(S.canUpgradeOffice(GX) === 'year', 'kontor: för tidigt år blockerar (' + S.canUpgradeOffice(GX) + ')');
GX.t = 48 * 20;
GX.staff = GX.staff.slice(0, 2);
ok(S.canUpgradeOffice(GX) === 'staff', 'kontor: för litet team blockerar (' + S.canUpgradeOffice(GX) + ')');
GX.staff = Array.from({ length: 36 }, (_, i) => ({ ...G.staff[0], id: 6100 + i }));
GX.t = 48 * 35;
while (S.canUpgradeOffice(GX) === true) S.upgradeOffice(GX);
ok(GX.office.tier === 5, 'kontor tier 5 när alla krav är uppfyllda');
G.office.tier = 5;
// alla händelser
for (const ev of EVENTS) {
  G.pending = [];
  S.startProject(G, { title: 'E', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  G.job.ticks = 30; G.job.phase = 1;
  G.pending.push({ type: 'event', id: 9000, ev: ev.id });
  ev.choices.forEach((c, i) => {
    const G2 = JSON.parse(JSON.stringify(G));
    G2.pending = [{ type: 'event', id: 9000, ev: ev.id }];
    try { S.resolveEvent(G2, 9000, i); } catch (e) { ok(false, 'event ' + ev.id + ' val ' + i + ': ' + e.message); }
  });
  S.cancelProject(G);
}
ok(true, 'alla händelser körda');
// spelmässan: monter, utställda saker, besökare och effekter
{
  const mk = () => {
    const g = S.newGame({ studio: 'Mässa', seed: 31 });
    g.t = 48 * 14 + 18;
    g.money = 5e6; g.fans = 3000;
    g.u.flags.expo = true;
    for (let i = 0; i < 3; i++) g.games.push({ id: 80 + i, title: 'S' + i, t: g.t - 6 - 9 * i, score: 6.5 + 0.9 * i, genre: 'rpg', topic: 'space', platform: 'pc', scope: 'small', total: 5e5, priceAt: 30, tail: 1, weekly: [], revenue: 0, units: 0, fansGained: 0 });
    return g;
  };
  const GE = mk();
  const GN = mk();
  GN.u.flags.expo = false;
  ok(S.expoOffer(GN) === false && GN.pending.length === 0 && S.expoOffer(GE) === true && GE.pending[0].type === 'expo', 'mässan erbjuds bara efter forskningen');
  const items = S.expoItems(GE);
  ok(items.length === 3 && items.every((x) => x.k === 'game' && x.q >= 0 && x.q <= 1), 'de tre släppta spelen går att visa');
  const picks = S.defaultPicks(items, 2);
  ok(picks.length === 2 && picks[0].q >= picks[1].q && picks[0].id === 82, 'förslaget är de starkaste sakerna');
  const f1 = S.expoForecast(GE, 1, picks.slice(0, 1)), f2 = S.expoForecast(GE, 2, picks), f3 = S.expoForecast(GE, 3, items);
  ok(f1.visitors < f2.visitors && f2.visitors < f3.visitors && f1.cost < f2.cost && f2.cost < f3.cost, 'större monter ger fler besökare och kostar mer');
  ok(S.expoForecast(GE, 2, [{ k: 'game', id: 1, q: 0.9 }]).visitors > S.expoForecast(GE, 2, [{ k: 'game', id: 1, q: 0.1 }]).visitors, 'starkare saker lockar fler besökare');
  ok(S.expoAttendance(1990) < S.expoAttendance(2010), 'mässan växer med åren');
  // hoppa över rör ingenting
  const GS = JSON.parse(JSON.stringify(GE));
  const m0 = GS.money, fa0 = GS.fans;
  ok(S.resolveExpo(GS, GS.pending[0].id, 0) === true && GS.pending.length === 0 && GS.money === m0 && GS.fans === fa0 && !GS.expoLast, 'att hoppa över mässan ändrar ingenting');
  // för lite pengar: prompten ligger kvar
  const GB = JSON.parse(JSON.stringify(GE));
  GB.money = 10;
  ok(typeof S.resolveExpo(GB, GB.pending[0].id, 3) === 'string' && GB.pending.length === 1, 'utan pengar ligger mässan kvar');
  // en riktig mässa
  const GA = JSON.parse(JSON.stringify(GE)), GB2 = JSON.parse(JSON.stringify(GE));
  const money0 = GA.money, fans0 = GA.fans;
  ok(S.resolveExpo(GA, GA.pending[0].id, 3, items.map(S.itemKey)) === true, 'mässan genomförs');
  const r = GA.expoLast;
  ok(r.visitors > 100 && r.fans > 0 && r.revenue > 0 && r.items.length === 3 && r.lines[0].k === 'open' && r.lines[r.lines.length - 1].k === 'close', 'resultatet har besökare, fans, intäkter, rader och nyhetsrad');
  ok(Math.abs(GA.money - (money0 - r.cost + r.revenue)) < 1 && GA.fans === fans0 + r.fans, 'pengar och fans stämmer med resultatet');
  ok(GA.games.every((g) => g.expo && g.expo.mult > 1 && g.expo.until === GA.t + S.EXPO_LIFT_WEEKS), 'de visade spelen får ett försäljningslyft');
  ok(GA.news[0].key === 'news.expo', 'mässan blir en nyhet');
  S.resolveExpo(GB2, GB2.pending[0].id, 3, items.map(S.itemKey));
  ok(JSON.stringify(GB2.expoLast) === JSON.stringify(r), 'samma frö och år ger samma mässa');
  // lyftet syns i veckans intäkter
  const GR = JSON.parse(JSON.stringify(GE)), GQ = JSON.parse(JSON.stringify(GA));
  GR.t++; GQ.t++;
  S.salesWeek(GR); S.salesWeek(GQ);
  const g0 = GR.games[2], g1 = GQ.games[2];
  ok(g0.weekly.length === 1 && Math.abs(g1.weekly[0] / g0.weekly[0] - g1.expo.mult) < 1e-6, 'veckans försäljning växer med lyftet');
  GQ.t += S.EXPO_LIFT_WEEKS + 1;
  const w0 = GQ.games[2].revenue;
  S.salesWeek(GQ);
  GR.t = GQ.t; S.salesWeek(GR);
  ok(Math.abs((GQ.games[2].weekly.at(-1) / GR.games[2].weekly.at(-1)) - 1) < 1e-6 || GQ.games[2].ended, 'efter åtta veckor är lyftet slut');
  ok(w0 >= 0, 'sanity');
}
// studiojubileet kommer vart tionde år och bara en gång per decennium; arbetsmiljögranskningen kräver låg stämning och sen tid
{
  const EV = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
  const GJ = S.newGame({ studio: 'J', seed: 3 });
  GJ.games.push({ id: 1, title: 'Ett', t: 5, score: 7, weekly: [1] });
  GJ.t = 480 - 4;
  const ann = EV.anniversary.when;
  ok(!ann(GJ), 'jubileet kommer inte före tio år');
  GJ.t = 480 + 4;
  ok(ann(GJ), 'jubileet kan komma efter tio år');
  GJ.flags.ev_anniversary = GJ.t;
  ok(!ann(GJ), 'jubileet kommer bara en gång per decennium');
  GJ.t = 960 + 2;
  ok(ann(GJ), 'och igen efter tjugo år');
  const GP = S.newGame({ studio: 'P', seed: 3 });
  GP.t = 48 * 39;
  for (let i = 0; i < 6; i++) GP.staff.push({ id: 100 + i, mood: 50 });
  ok(EV.labor_press.when(GP), 'arbetsmiljögranskningen kan komma när stämningen är låg');
  for (const s2 of GP.staff) s2.mood = 90;
  ok(!EV.labor_press.when(GP), 'men inte när teamet mår bra');
  GP.t = 48 * 30;
  for (const s2 of GP.staff) s2.mood = 40;
  ok(!EV.labor_press.when(GP) && !EV.ai_tools.when(GP) && !EV.catalog_deal.when(GP), 'och inte före sin tid');
}
// branschnyheter: rubriker efter era och läge, med paus och karens, och utan att röra slumpföljden
{
  const GH = JSON.parse(JSON.stringify(G));
  GH.news = [];
  GH.flags = {};
  GH.fans = 800;
  GH.t = 48 * 3; // 1983
  const ids = (x) => S.headlinesNow(x).map((h) => h.id);
  ok(ids(GH).includes('arcade') && !ids(GH).includes('mobile') && !ids(GH).includes('ai'), 'rubrikerna passar eran');
  GH.t = 48 * 45; // 2025
  ok(ids(GH).includes('ai') && ids(GH).includes('stream') && !ids(GH).includes('arcade'), 'och senare eror får andra rubriker');
  ok(ids(GH).includes('press') && ids(GH).includes('fanthread'), 'rubriker om studion kräver fans');
  GH.fans = 10;
  ok(!ids(GH).includes('press') && !ids(GH).includes('fanthread'), 'utan fans inga rubriker om studion');
  const bad = S.headlinesNow({ ...GH, comps: [], games: [], market: {}, flags: {}, fans: 0, studio: 'X' });
  ok(bad.every((h) => !h.need), 'utan konkurrenter, trend eller spel återstår bara de allmänna rubrikerna');
  // veckor över många år: aldrig två inom pausen, inget upprepas inom karenstiden, slumpföljden är orörd
  const rng0 = GH.rng;
  GH.fans = 800;
  const seen = [];
  for (let t = 48 * 5; t < 48 * 40; t++) {
    GH.t = t;
    GH.seed = 77;
    if (S.headlineWatch(GH)) seen.push({ t, id: GH.news[0].key });
  }
  ok(GH.rng === rng0, 'rubrikerna rör inte spelets slumpföljd');
  ok(seen.length >= 20 && seen.length <= 200, 'rubriker dyker upp med jämna mellanrum (' + seen.length + ' på 35 år)');
  ok(seen.every((x, i) => i === 0 || x.t - seen[i - 1].t >= S.HL_GAP), 'minst ' + S.HL_GAP + ' veckor mellan två rubriker');
  const lastBy = {};
  let rep = 0;
  for (const x of seen) { if (lastBy[x.id] != null && x.t - lastBy[x.id] < S.HL_REPEAT) rep++; lastBy[x.id] = x.t; }
  ok(rep === 0, 'samma rubrik kommer inte igen inom karenstiden');
  const GH2 = JSON.parse(JSON.stringify(G));
  GH2.news = []; GH2.flags = {}; GH2.fans = 800; GH2.seed = 77;
  const seen2 = [];
  for (let t = 48 * 5; t < 48 * 40; t++) { GH2.t = t; if (S.headlineWatch(GH2)) seen2.push(t + GH2.news[0].key); }
  ok(JSON.stringify(seen.map((x) => x.t + x.id)) === JSON.stringify(seen2), 'samma frö ger samma rubriker');
  ok(seen.every((x) => STRINGS[x.id] && STRINGS[x.id][0] && STRINGS[x.id][1]), 'varje rubrik har text på båda språken');
}
// nyhetsloggen: kuliss (rubriker och trendspaning) tar högst FLAVOR_MAX platser och trycker inte ut riktiga nyheter
{
  const GN = JSON.parse(JSON.stringify(G));
  GN.news = [];
  S.note(GN, 'news.office', { n: 1 }, 'info', true);
  for (let i = 0; i < 120; i++) { GN.t = i; S.note(GN, i % 3 ? 'hl.arcade' : 'news.trend', {}, 'info', true); }
  const fl = GN.news.filter((n) => n.key.startsWith('hl.') || n.key === 'news.trend').length;
  ok(fl === S.FLAVOR_MAX && GN.news.some((n) => n.key === 'news.office'), 'kuliss-nyheter tar högst ' + S.FLAVOR_MAX + ' platser och den riktiga nyheten ligger kvar');
  for (let i = 0; i < 160; i++) S.note(GN, 'news.quit', { name: 'X' }, 'info', true);
  ok(GN.news.length === 150, 'loggen rymmer fortfarande 150 poster');
}
// trendspaning: en ny hetast genre eller ett nytt hetaste ämne ger en nyhet, men inte vid första trendslagningen
{
  const GT = JSON.parse(JSON.stringify(G));
  GT.news = [];
  GT.t = 48 * 10;
  GT.market.trend = null;
  S.updateTrends(GT);
  ok(!GT.news.some((n) => n.key === 'news.trend'), 'första trenden ger ingen nyhet');
  let changed = 0;
  let prev = GT.market.trend.genre[0].id + ':' + GT.market.trend.topic[0].id;
  for (let i = 0; i < 60; i++) {
    GT.t += 24 * 5;
    S.updateTrends(GT);
    const now = GT.market.trend.genre[0].id + ':' + GT.market.trend.topic[0].id;
    if (now !== prev) changed++;
    prev = now;
  }
  ok(changed >= 5 && GT.news.filter((n) => n.key === 'news.trend').length === Math.min(changed, S.FLAVOR_MAX), 'varje byte av hetaste trend blir en nyhet (' + changed + ' byten)');
}
// säsonger: ett gammalt, vanskött onlinespel kan komma tillbaka. Förnyelsen sänker åldern men aldrig under golvet, samma tema
// två gånger i rad ger mindre, klassiska servrar kräver ett gammalt spel och att inte göra något ändrar ingenting.
{
  const mkOld = (fresh) => {
    const GS = JSON.parse(JSON.stringify(G));
    GS.pending = [];
    GS.t = 48 * 30;
    GS.money = 1e10;
    GS.office.fac.server = { lvl: 3, slot: 0 };
    GS.games.push({ id: 7800, title: 'Gammal', t: GS.t - 48 * 12, score: 8.4, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
    const g0 = GS.games[GS.games.length - 1];
    const t1 = GS.t;
    GS.t -= 48 * 12;
    S.launchLive(GS, g0);
    g0.live.pot = 800000; g0.live.subs = 30000;
    while (GS.t < t1) { S.liveWeek(GS); GS.t++; }
    g0.live.fresh = fresh;
    return { GS, g0 };
  };
  const run = (GS, n) => { for (let i = 0; i < n; i++) { S.liveWeek(GS); GS.t++; } };
  const A = mkOld(60);
  const B = mkOld(60);
  ok(A.g0.live.subs === B.g0.live.subs && !A.g0.live.reno && A.g0.live.season == null, 'säsonger: ett spel utan säsong är orört');
  const age0 = S.liveAge(A.GS, A.g0.live);
  ok(Math.abs(age0 - 12) < 0.02, 'effektiv ålder är verklig ålder utan förnyelse (' + age0.toFixed(2) + ')');
  ok(S.seasonBlock(A.GS, A.g0, 'classic') === '' && S.startLiveSeason(A.GS, 7800, 'nonsense') === false, 'klassiska servrar går för ett gammalt spel, okänt tema avvisas');
  const money0 = A.GS.money;
  const cost = S.liveSeasonCost(A.GS, A.g0, 'classic');
  ok(S.startLiveSeason(A.GS, 7800, 'classic') === true && A.GS.money === money0 - cost && A.g0.live.season && S.seasonOn(A.GS, A.g0.live), 'en säsong startar och kostar pengar (' + cost + ')');
  ok(typeof S.startLiveSeason(A.GS, 7800, 'story') === 'string', 'bara en säsong åt gången');
  const tgt0 = S.liveTarget(B.GS, B.g0);
  ok(S.liveTarget(A.GS, A.g0) > tgt0 * 1.04, 'målnivån är högre medan säsongen pågår');
  run(A.GS, 14); run(B.GS, 14);
  const lA = A.g0.live;
  ok(!lA.season && lA.seasons === 1 && lA.lastSeason === 'classic' && A.GS.stats.liveSeasons === 1, 'säsongen tar slut efter sina veckor och räknas');
  ok(S.liveAge(A.GS, lA) < S.liveAge(B.GS, B.g0.live) - 2 && S.liveAge(A.GS, lA) > 0.6 * 12, 'förnyelsen sänker åldern men inte under golvet (' + S.liveAge(A.GS, lA).toFixed(2) + ')');
  ok(lA.subs > B.g0.live.subs * 1.05 && lA.passRev > 0 && A.GS.news.some((n) => n.key === 'live.news.seasonStart') && A.GS.news.some((n) => n.key === 'live.news.seasonEnd' || n.key === 'live.news.seasonFlat') && A.GS.news.some((n) => n.key === 'live.news.seasonMid' || n.key === 'live.news.seasonMid0'), 'fler spelare än utan säsong, säsongspass och nyheter (' + Math.round(lA.subs) + ' mot ' + Math.round(B.g0.live.subs) + ')');
  ok(lA.marks.some((m) => m.k === 'ss'), 'säsongen märks i diagrammet');
  ok(S.seasonReadyIn(A.GS, lA) === S.SEASON_GAP - 14 && typeof S.startLiveSeason(A.GS, 7800, 'ranked') === 'string', 'det går en paus innan nästa säsong');
  run(A.GS, S.SEASON_GAP);
  ok(S.seasonQuality(A.g0, 'classic') < S.seasonQuality(A.g0, 'story') && S.seasonShare(A.g0, 'classic') < S.SEASON.classic.reno, 'samma tema två gånger i rad ger mindre');
  // golvet: många säsonger i rad tar aldrig ner åldern under 60 % av den verkliga
  for (let k = 0; k < 14; k++) {
    const th = ['story', 'ranked', 'festival', 'classic'][k % 4];
    if (S.startLiveSeason(A.GS, 7800, th) !== true) { run(A.GS, S.SEASON_GAP); S.startLiveSeason(A.GS, 7800, th); }
    run(A.GS, S.SEASON_GAP);
  }
  const realAge = (A.GS.t - lA.t0) / 48;
  ok(S.liveAge(A.GS, lA) >= 0.6 * realAge - 0.05 && S.liveAge(A.GS, lA) < realAge * 0.75 && Number.isFinite(lA.subs), 'förnyelsen stannar vid golvet (' + S.liveAge(A.GS, lA).toFixed(1) + ' av ' + realAge.toFixed(1) + ' år)');
  ok((lA.sPot || 0) <= 0.1201, 'säsongernas extra grundpotential har ett tak');
  // en jubileumsfest lockar tillbaka en del av dem som lämnat sedan toppen
  const F = mkOld(80);
  const gap = F.g0.live.peak - F.g0.live.subs;
  const subsF = F.g0.live.subs;
  S.startLiveSeason(F.GS, 7800, 'festival');
  ok(gap > 1000 && F.g0.live.subs > subsF + gap * 0.05, 'jubileumsfesten lockar tillbaka spelare som lämnat');
  // spelarna pratar om säsongen medan den pågår, och om en comeback i några veckor efter att den hänt
  {
    const { FAN_SPECIAL: FS } = await import('../src/data/fanvoices.js');
    const vs = (X) => S.fanVoices(X.GS, X.g0).find((v) => v.kind === 'special');
    const vf = vs(F);
    ok(vf && vf.mood === 1 && FS.seasonFestival.sv.includes(vf.text.sv) && vf.text.en && !/[{}]/.test(vf.text.en), 'under en säsong hörs en röst om säsongen');
    F.g0.live.season = null;
    ok(!vs(F) || !FS.seasonFestival.sv.includes(vs(F).text.sv), 'efter säsongen tystnar säsongsrösten');
    F.g0.live.cbT = F.GS.t - 2;
    const vc = vs(F);
    ok(vc && vc.mood === 1 && FS.liveComeback.sv.some((x) => x.replace('{title}', F.g0.title) === vc.text.sv), 'en nylig comeback hörs i rösterna');
    ok(FS.seasonStory && ['seasonStory', 'seasonRanked', 'seasonFestival', 'seasonClassic', 'liveComeback'].every((k) => FS[k].sv.length === FS[k].en.length), 'säsongsrösterna finns på båda språken i samma antal');
  }
  // fördelar per nivå: engångskostnad och drift, fler väljer nivån, och priset går att höja i takt med värdet
  {
    const PK = mkOld(80);
    const lp = PK.g0.live;
    const m0 = S.tierMix(PK.GS, lp);
    const cost0 = S.costPerSub(PK.GS, lp);
    ok(!lp.perk && S.perkUpkeep(PK.GS, lp) === 0, 'utan fördelar är driften som förut');
    const money0 = PK.GS.money;
    const c1 = S.perkCost(PK.GS, PK.g0, 1);
    ok(c1 > 0 && S.setLivePerk(PK.GS, 7800, 1, true) === true && PK.GS.money === money0 - c1 && lp.perk[1] === 1 && PK.GS.news.some((n) => n.key === 'live.news.perk'), 'en fördel kostar en engångssumma och syns i nyheterna');
    const m1 = S.tierMix(PK.GS, lp);
    ok(m1.share[1] > m0.share[1] && m1.k < m0.k && m1.arpu > m0.arpu && S.costPerSub(PK.GS, lp) > cost0, 'fler väljer nivån, prispåverkan minskar och driften kostar');
    ok(S.setLivePerk(PK.GS, 7800, 1, true) === true && PK.GS.money === money0 - c1, 'att införa den igen kostar inget');
    lp.price[1] = 1.07;
    ok(Math.abs(S.tierMix(PK.GS, lp).share[1] - m0.share[1]) < 1e-9 && S.hikeShare(PK.GS, lp) > 0, 'priset kan höjas lika mycket som värdet utan att nivån tappar andel (men en höjning märks fortfarande)');
    lp.price[1] = 1;
    ok(S.setLivePerk(PK.GS, 7800, 1, false) === true && lp.perk[1] === 0 && Math.abs(S.tierMix(PK.GS, lp).k - m0.k) < 1e-12 && S.perkUpkeep(PK.GS, lp) === 0, 'avslutad fördel ger samma läge som förut');
    const PP = mkOld(80);
    PP.GS.money = 10;
    ok(typeof S.setLivePerk(PP.GS, 7800, 2, true) === 'string' && !PP.g0.live.perk, 'utan pengar går det inte');
    const FP = mkOld(80);
    FP.g0.live.model = 'f2p';
    ok(S.setLivePerk(FP.GS, 7800, 0, true) === false && S.perkUpkeep(FP.GS, FP.g0.live) === 0, 'gratisspel har inga fördelar');
    const M = S.liveMonth(PK.GS, PK.g0);
    S.setLivePerk(PK.GS, 7800, 0, true); S.setLivePerk(PK.GS, 7800, 2, true);
    ok(S.liveMonth(PK.GS, PK.g0).cost > M.cost, 'driften räknas in i månadskostnaden');
  }
  // automatiska säsonger: av som standard, och när de är på startar nästa tema när spelarna fallit under 90 % av toppen
  {
    const AU = mkOld(80);
    const la = AU.g0.live;
    la.peak = Math.max(la.peak, la.subs * 1.5);
    const first = S.autoSeasonPick(AU.GS, AU.g0);
    ok(!la.autoSeason && first === 'classic', 'ett gammalt spel som tappat spelare får klassiska servrar först (' + first + ')');
    run(AU.GS, 2);
    ok(!la.season, 'automatiska säsonger är av som standard');
    ok(S.setLiveAutoSeason(AU.GS, 7800, true) && la.autoSeason === 1, 'går att slå på');
    const money0 = AU.GS.money;
    run(AU.GS, 1);
    ok(la.season && la.season.id === 'classic' && AU.GS.money < money0 && !AU.GS.news.some((n) => n.key === 'live.news.autoSeasonPaused'), 'en säsong startar av sig själv');
    run(AU.GS, S.SEASON_GAP + S.SEASON_WEEKS);
    ok(la.lastSeason && la.seasons >= 1 && (!la.season || la.season.id !== 'classic' || la.seasons >= 2), 'nästa säsong följer efter pausen');
    const NG = mkOld(80);
    NG.g0.live.peak = NG.g0.live.subs * 0.95;
    S.setLiveAutoSeason(NG.GS, 7800, true);
    run(NG.GS, 1);
    ok(!NG.g0.live.season && S.autoSeasonPick(NG.GS, NG.g0) === '', 'ett spel som nästan ligger på toppen behöver ingen säsong');
    const PO = mkOld(80);
    PO.g0.live.peak = PO.g0.live.subs * 1.6;
    PO.GS.money = 10;
    S.setLiveAutoSeason(PO.GS, 7800, true);
    PO.GS.news.length = 0;
    run(PO.GS, 3);
    ok(!PO.g0.live.season && PO.GS.news.filter((n) => n.key === 'live.news.autoSeasonPaused').length === 1, 'utan pengar väntar den och säger det en gång');
    S.setLiveAutoSeason(PO.GS, 7800, false);
    ok(PO.g0.live.autoSeason === 0 && PO.g0.live.autoSeasonWarn === 0, 'går att slå av igen');
  }
  // för litet och för ungt: klassiska servrar kräver ett spel som är minst fem år
  const Y = mkOld(80);
  Y.g0.live.t0 = Y.GS.t - 48 * 3;
  ok(S.seasonBlock(Y.GS, Y.g0, 'classic') === 'age' && typeof S.startLiveSeason(Y.GS, 7800, 'classic') === 'string' && !Y.g0.live.season, 'klassiska servrar kräver ett gammalt spel');
  const poor = mkOld(80);
  poor.GS.money = 10;
  ok(typeof S.startLiveSeason(poor.GS, 7800, 'story') === 'string' && !poor.g0.live.season, 'en säsong kräver pengar');
  // en comeback: ett spel som fallit under 60 % av toppen och sedan växer 40 % från bottennivån
  const C = mkOld(5);
  const lc = C.g0.live;
  lc.peak = lc.subs * 3; lc.low = lc.subs; lc.fresh = 5;
  C.GS.news.length = 0;
  S.startLivePatch(C.GS, 7800);
  S.startLiveSeason(C.GS, 7800, 'classic');
  run(C.GS, 52);
  ok((lc.cb || 0) >= 1 && C.GS.stats.liveComeback >= 1 && C.GS.news.some((n) => n.key === 'live.news.comeback') && lc.marks.some((m) => m.k === 'cb'), 'en comeback efter en lång nedgång märks i nyheterna (' + Math.round(lc.subs) + ' spelare)');
  ok(ACHIEVEMENTS.find((a) => a.id === 'comeback').check(C.GS) && !ACHIEVEMENTS.find((a) => a.id === 'seasons5').check(C.GS), 'prestationen Comeback, men inte Säsongskungen än');
  // äldre sparningar utan säsongsfält fungerar
  const OLD = mkOld(60);
  for (const k of ['reno', 'season', 'ssT', 'seasons', 'lastSeason', 'low', 'cb', 'passRev', 'sPot']) delete OLD.g0.live[k];
  delete OLD.GS.stats.liveSeasons;
  run(OLD.GS, 30);
  ok(Number.isFinite(OLD.g0.live.subs) && S.startLiveSeason(OLD.GS, 7800, 'story') === true, 'ett onlinespel från före säsongerna fortsätter och kan starta en säsong');
  // händelser som leder till säsonger: bara för ett gammalt spel som tappat spelare, med rabatt på säsongen
  {
    const V = mkOld(60);
    const lv = V.g0.live;
    lv.peak = lv.subs * 2;
    const young = mkOld(60);
    young.g0.live.t0 = young.GS.t - 48 * 2;
    young.g0.live.peak = young.g0.live.subs * 2;
    ok(EV.live_veterans.when(V.GS) && EV.live_vote.when(V.GS) && EV.live_streamer.when(V.GS), 'säsongshändelserna kan dras för ett gammalt spel som tappat spelare');
    ok(!EV.live_veterans.when(young.GS) && !EV.live_streamer.when(young.GS) && !EV.live_veterans.when(G), 'men inte för ett ungt spel eller utan onlinespel');
    const prev = S.applyFx(V.GS, EV.live_veterans.choices[0].fx, [], { game: 7800 }, true);
    ok(prev.some((x) => x.k === 'season') && prev.some((x) => x.k === 'money' && x.v < 0) && !lv.season, 'förhandsvisningen visar säsongen och kostnaden utan att starta något');
    const m0 = V.GS.money;
    const full = S.liveSeasonCost(V.GS, V.g0, 'classic');
    V.GS.pending = [{ type: 'event', id: 9101, ev: 'live_veterans', game: 7800 }];
    S.resolveEvent(V.GS, 9101, 0);
    ok(lv.season && lv.season.id === 'classic' && Math.abs(m0 - V.GS.money - full * 0.6) < 200, 'veteranerna: klassiska servrar startar till 40 % rabatt');
    ok(!EV.live_vote.when(V.GS) && !EV.live_veterans.when(V.GS), 'ingen ny säsongshändelse medan en säsong pågår');
    const W = mkOld(60);
    W.g0.live.peak = W.g0.live.subs * 2;
    W.GS.pending = [{ type: 'event', id: 9102, ev: 'live_vote', game: 7800 }];
    S.resolveEvent(W.GS, 9102, 1);
    ok(W.g0.live.season && W.g0.live.season.id === 'ranked', 'omröstningen: en tävlingssäsong startar');
    const X = mkOld(60);
    X.GS.pending = [{ type: 'event', id: 9103, ev: 'live_vote', game: 7800 }];
    const sx = X.g0.live.subs;
    S.resolveEvent(X.GS, 9103, 2);
    ok(!X.g0.live.season && X.g0.live.subs < sx, 'att hoppa över omröstningen startar ingen säsong');
    const P = mkOld(60);
    P.GS.money = 5;
    P.GS.pending = [{ type: 'event', id: 9104, ev: 'live_veterans', game: 7800 }];
    S.resolveEvent(P.GS, 9104, 0);
    ok(!P.g0.live.season && Number.isFinite(P.GS.money), 'utan pengar startar ingen säsong av en händelse');
    ok(S.fxBlocked(P.GS, EV.live_veterans.choices[0].fx, { game: 7800 }) === true && S.fxBlocked(P.GS, EV.live_veterans.choices[1].fx, { game: 7800 }) === false, 'ett säsongsval utan pengar är spärrat, de andra valen inte');
    ok(S.fxBlockReason(P.GS, EV.live_veterans.choices[0].fx, { game: 7800 }) === 'money', 'utan pengar är orsaken pengar');
    const Q = mkOld(60);
    Q.g0.live.peak = Q.g0.live.subs * 2;
    ok(S.fxBlocked(Q.GS, EV.live_vote.choices[0].fx, { game: 7800 }) === false, 'med pengar är säsongsvalet öppet');
    S.startLiveSeason(Q.GS, 7800, 'story');
    ok(S.fxBlocked(Q.GS, EV.live_vote.choices[1].fx, { game: 7800 }) === true, 'och spärrat när en säsong redan pågår');
    ok(S.fxBlockReason(Q.GS, EV.live_vote.choices[1].fx, { game: 7800 }) === 'season' && S.fxBlockReason(Q.GS, EV.live_vote.choices[2].fx, { game: 7800 }) === '', 'spärren säger att det är säsongsplatsen som saknas, och hoppa över är öppet');
  }
}
// händelser för onlinespel: gäller det största spelet som är igång och ändrar dess spelare och innehåll
{
  const GL = JSON.parse(JSON.stringify(G));
  GL.pending = [];
  GL.t = 48 * 26; // 2006, så att även de senare händelserna är möjliga
  GL.games.push({ id: 7700, title: 'Online', t: GL.t - 20, score: 8, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
  S.launchLive(GL, GL.games[GL.games.length - 1]);
  const lv = GL.games[GL.games.length - 1].live;
  lv.subs = 200000; lv.pot = 250000; lv.fresh = 50; lv.boost = GL.t + 4;
  const LATE = ['live_veterans', 'live_streamer', 'live_vote']; // kräver ett gammalt spel som tappat spelare, testas bland säsongerna
  const liveEvs = EVENTS.filter((e) => (e.needs || []).includes('live') && !LATE.includes(e.id));
  ok(liveEvs.length >= 6 && liveEvs.every((e) => e.when(GL)), 'onlinespelets händelser kan dras med ett stort onlinespel');
  ok(liveEvs.every((e) => !e.when(G)), 'onlinespelets händelser dras inte utan onlinespel');
  let moved = 0;
  for (const ev of liveEvs) ev.choices.forEach((c, i) => {
    const G2 = JSON.parse(JSON.stringify(GL));
    const l2 = G2.games[G2.games.length - 1].live;
    G2.pending = [{ type: 'event', id: 9001, ev: ev.id, game: 7700 }];
    const before = [l2.subs, l2.fresh];
    try { S.resolveEvent(G2, 9001, i); } catch (e) { ok(false, 'onlinehändelse ' + ev.id + ' val ' + i + ': ' + e.message); }
    if (l2.subs !== before[0] || l2.fresh !== before[1]) moved++;
  });
  ok(moved >= 10, 'onlinespelets händelser ändrar spelare eller innehåll (' + moved + ' val)');
  // gratisspel: först från 2008, går inte att ångra, butiken styr intäkten per spelare
  const G3f = JSON.parse(JSON.stringify(GL));
  G3f.office.fac.server = { lvl: 3, slot: 0 };
  const gf = G3f.games[G3f.games.length - 1];
  G3f.t = 48 * 27;
  ok(S.goF2P(G3f, gf.id) === false && gf.live.model !== 'f2p', 'gratisspel går inte före 2008');
  G3f.t = 48 * 30;
  const subRev = S.liveMonth(G3f, gf).rev;
  const subTarget = S.liveTarget(G3f, gf);
  ok(S.goF2P(G3f, gf.id) === true && S.isF2P(gf.live) && !S.canGoF2P(G3f, gf.live), 'gratisspel från 2010, och bara en gång');
  ok(S.liveTarget(G3f, gf) > 3 * subTarget && S.liveMonth(G3f, gf).rev < subRev, 'gratisspel: fler spelare som mål, mindre per spelare');
  const arpu = [0, 1, 2].map((i) => (S.setLiveShop(G3f, gf.id, i), S.liveArpu(G3f, gf.live)));
  ok(arpu[0] < arpu[1] && arpu[1] < arpu[2], 'butikens nivåer ger stigande intäkt per spelare');
  S.setLiveShop(G3f, gf.id, 1);
  for (let i = 0; i < 48; i++) S.liveWeek(G3f), G3f.t++;
  ok(gf.live.subs > 300000 && Number.isFinite(G3f.money), 'gratisspelet växer under ett år (' + Math.round(gf.live.subs) + ' spelare)');
  // utsikter: delarna ger tillsammans samma målnivå som spelet räknar med
  const GO = JSON.parse(JSON.stringify(GL));
  GO.office.fac.server = { lvl: 3, slot: 0 };
  const go = GO.games[GO.games.length - 1];
  go.live.price = [1.2, 1, 1]; go.live.ops = 2;
  const fx = S.liveFactors(GO, go);
  ok(Math.abs(go.live.pot * fx.age * fx.fresh * fx.price * fx.era * fx.ops * fx.event * fx.season * fx.rivals * fx.regions - S.liveTarget(GO, go)) < 1e-6 * fx.target && fx.regions === 1 && fx.price < 1 && fx.ops > 1 && fx.fresh < 1 && fx.full === false, 'utsikternas delar ger tillsammans målnivån');
  // löpande uppdateringar: startar vid 70, betalas som en vanlig, väntar när kassan inte räcker och säger till en gång
  go.live.fresh = 71.5; go.live.patch = null; GO.money = 1e9;
  ok(S.setLiveAuto(GO, go.id, true) === true && go.live.auto === 1, 'löpande uppdateringar slås på');
  S.liveWeek(GO); GO.t++;
  ok(!go.live.patch, 'ingen uppdatering medan innehållet är färskare än 70');
  const costA = S.livePatchCost(GO, go);
  S.liveWeek(GO); GO.t++;
  ok(go.live.patch && go.live.patch.until === GO.t - 1 + S.PATCH_WEEKS && GO.month.breakdown.patches === -costA, 'en löpande uppdatering startar av sig själv och kostar som en vanlig');
  for (let i = 0; i < S.PATCH_WEEKS; i++) S.liveWeek(GO), GO.t++;
  ok(!go.live.patch && go.live.fresh > 85, 'uppdateringen blir klar och innehållet färskt (' + Math.round(go.live.fresh) + ')');
  go.live.fresh = 60; GO.money = S.livePatchCost(GO, go) * 2;
  const nA = GO.news.filter((n) => n.key === 'live.news.autoPaused').length;
  S.liveWeek(GO); GO.t++; S.liveWeek(GO); GO.t++;
  ok(!go.live.patch && GO.news.filter((n) => n.key === 'live.news.autoPaused').length === nA + 1, 'utan kassa väntar uppdateringen och det sägs en gång');
  // inaktuellt innehåll: en varning, och en ny först när det varit färskt emellan
  S.setLiveAuto(GO, go.id, false);
  go.live.fresh = 30.5; GO.money = 1e9;
  for (let i = 0; i < 4; i++) S.liveWeek(GO), GO.t++;
  ok(GO.news.filter((n) => n.key === 'live.news.stale').length === 1 && go.live.staleWarn === 1, 'inaktuellt innehåll varnar en gång');
  // prishöjningar: en höjning märks veckan efter (nivåns andel av spelarna × höjningen), mildare med färskt innehåll, och
  // sedan har spelarna vant sig vid det nya priset. En sänkning, ett pris som ångras samma vecka och en äldre sparning
  // utan prisminne ger ingen reaktion. Butiken i ett gratisspel fungerar på samma sätt.
  {
    const mk = (fresh) => {
      const GH = JSON.parse(JSON.stringify(GL));
      GH.office.fac.server = { lvl: 3, slot: 0 };
      const gh = GH.games[GH.games.length - 1];
      gh.live.fresh = fresh;
      S.liveWeek(GH); GH.t++; // första veckan sätter prisminnet
      return [GH, gh];
    };
    const [GH, gh] = mk(50);
    const lh = gh.live;
    ok(lh.pref.join() === '1,1,1' && S.hikeShare(GH, lh) === 0, 'prisminnet sätts första veckan, utan reaktion');
    S.setLivePrice(GH, gh.id, 0, 1.2);
    S.setLivePrice(GH, gh.id, 0, 1);
    ok(S.hikeShare(GH, lh) === 0, 'ett pris som ångras samma vecka märks inte');
    S.setLivePrice(GH, gh.id, 0, 1.2);
    const h = S.hikeShare(GH, lh);
    ok(Math.abs(h - 0.7 * 0.2 * 0.9 * S.hikeMood(lh)) < 1e-9 && h > 0.1 && h < 0.2, 'höjd Standard med 20 %: andelen som säger upp sig (' + (h * 100).toFixed(1) + ' %)');
    // samma vecka med och utan reaktion: skillnaden är de som sa upp sig (minus den lilla del som redan hunnit ersättas)
    const GB = JSON.parse(JSON.stringify(GH));
    GB.games[GB.games.length - 1].live.pref = [1.2, 1, 1];
    const s0 = lh.subs;
    const fans0 = GH.fans;
    const nH = GH.news.filter((n) => n.key === 'live.news.hike').length;
    S.liveWeek(GH); GH.t++;
    S.liveWeek(GB); GB.t++;
    const diff = GB.games[GB.games.length - 1].live.subs - lh.subs;
    const hWeek = 0.7 * 0.2 * 0.9 * S.hikeMood(lh); // färskheten är densamma som när veckan räknades
    ok(diff > s0 * hWeek * 0.8 && diff < s0 * hWeek * 1.001, 'höjningen kostar spelare veckan efter (' + Math.round(diff) + ' av ' + Math.round(s0) + ')');
    ok(GH.news.filter((n) => n.key === 'live.news.hike').length === nH + 1 && lh.marks.some((m) => m.k === 'price') && GH.fans < fans0 - 1 + 200000 * 0.00025 * 3 && lh.pref.join() === '1.2,1,1', 'höjningen ger en nyhet, en markör och några förlorade fans');
    ok(S.fanVoices(GH, gh).some((v) => v.kind === 'special' && v.mood < 0 && /höj|dyrare/i.test(v.text.sv)) && lh.hikeT === GH.t - 1, 'spelarnas röster klagar på höjningen');
    const s1 = lh.subs;
    S.liveWeek(GH); GH.t++;
    ok(S.hikeShare(GH, lh) === 0 && lh.subs > s1 * 0.95 && GH.news.filter((n) => n.key === 'live.news.hike').length === nH + 1, 'sedan har spelarna vant sig: ingen ny reaktion');
    S.setLivePrice(GH, gh.id, 0, 0.8);
    ok(S.hikeShare(GH, lh) === 0, 'en sänkning ger ingen reaktion');
    S.liveWeek(GH); GH.t++;
    S.setLivePrice(GH, gh.id, 0, 1);
    ok(S.hikeShare(GH, lh) > 0.15, 'att höja tillbaka efter en sänkning kostar: att växla pris lönar sig inte');
    // innehållets skick: färskt halverar, inaktuellt gör reaktionen hälften större
    const at = (fresh) => { const [Gx, gx] = mk(fresh); gx.live.fresh = fresh; S.setLivePrice(Gx, gx.id, 0, 1.2); return S.hikeShare(Gx, gx.live); };
    ok(Math.abs(at(100) - 0.126 * 0.5) < 1e-9 && Math.abs(at(0) - 0.126 * 1.5) < 1e-9 && at(100) < at(60) && at(60) < at(20), 'färskt innehåll halverar reaktionen, inaktuellt gör den hälften större');
    const [GC, gc] = mk(50);
    for (let i = 0; i < 3; i++) S.setLivePrice(GC, gc.id, i, 2.5);
    ok(S.hikeShare(GC, gc.live) === S.HIKE_MAX, 'som mest säger 30 % upp sig på en gång');
    // äldre sparning: prisminnet saknas och priset är redan ändrat
    const [GO2, go2] = mk(50);
    S.setLivePrice(GO2, go2.id, 0, 1.5);
    delete go2.live.pref;
    const so = go2.live.subs;
    S.liveWeek(GO2); GO2.t++;
    ok(go2.live.subs > so * 0.94 && !GO2.news.some((n) => n.key === 'live.news.hike') && go2.live.pref.join() === '1.5,1,1', 'en äldre sparning utan prisminne får det utan reaktion');
    // gratisspelets butik
    const GS = JSON.parse(JSON.stringify(G3f));
    const gs = GS.games[GS.games.length - 1];
    gs.live.fresh = 100;
    ok(gs.live.sref === 1 && S.hikeShare(GS, gs.live) === 0, 'butikens nivå är invand');
    S.setLiveShop(GS, gs.id, 2);
    const hs = S.hikeShare(GS, gs.live);
    ok(Math.abs(hs - (1 - S.SHOP[2].mult / S.SHOP[1].mult) * 0.6 * 0.5) < 1e-9, 'en hårdare butik får spelare att sluta direkt (' + (hs * 100).toFixed(1) + ' %)');
    S.liveWeek(GS); GS.t++;
    ok(GS.news.some((n) => n.key === 'live.news.shopHike') && gs.live.sref === 2, 'butiken ger en nyhet och blir invand');
    const vsS = S.fanVoices(GS, gs);
    GS.t += S.HIKE_TALK;
    ok(vsS.some((v) => /butiken|kostar extra/i.test(v.text.sv)) && !S.fanVoices(GS, gs).some((v) => /butiken|kostar extra/i.test(v.text.sv)), 'rösterna om butiken hörs i åtta veckor');
    S.setLiveShop(GS, gs.id, 0);
    ok(S.hikeShare(GS, gs.live) === 0, 'en snällare butik ger ingen reaktion');
  }
  // regioner: ett nytt onlinespel börjar på hemmamarknaden, öppnar en region i taget mot betalning och får då fler spelare.
  // Regionens marknad måste finnas det året, genren avgör hur mycket den ger, och ett äldre spel finns redan överallt.
  const GR = JSON.parse(JSON.stringify(GL));
  GR.office.fac.server = { lvl: 3, slot: 0 };
  GR.money = 1e9;
  const gr = GR.games[GR.games.length - 1];
  const lr = gr.live;
  ok(Array.isArray(lr.regions) && lr.regions.length === 0 && S.regionMult(gr) === 1 && S.HOME < 1, 'ett nytt onlinespel börjar på hemmamarknaden');
  ok(S.regionsOpen(GR, gr).map((r) => r.id).join() === 'na,eu,asia,latam' && Math.abs(S.regionBonus(gr, 'asia') - S.REGION.asia.bonus * 1.35) < 1e-9 && S.regionBonus(gr, 'na') === S.REGION.na.bonus, 'regionerna 2006, och rollspel går extra bra i Asien');
  GR.t = 48 * 19; // 1999: Asien och Latinamerika har inte öppnat än
  ok(S.regionsOpen(GR, gr).map((r) => r.id).join() === 'na,eu' && S.startLiveRegion(GR, gr.id, 'asia') === false, 'en region går inte att öppna innan marknaden finns');
  GR.t = 48 * 26;
  const t0 = S.liveTarget(GR, gr);
  const costR = S.liveRegionCost(GR, gr, 'eu');
  const m0 = GR.money;
  const gainR = S.regionGain(GR, gr, 'eu');
  ok(Math.abs(gainR.players - t0 * S.regionBonus(gr, 'eu')) < 1e-6 && Math.abs(gainR.month - gainR.players * (S.liveArpu(GR, lr) - S.costPerSub(GR, lr))) < 1e-6 && gainR.month > 0, 'regionens väntade spelare och månadsintäkt går att väga mot priset');
  ok(costR > 0 && S.startLiveRegion(GR, gr.id, 'eu') === true && GR.money === m0 - costR && lr.region.id === 'eu' && lr.region.until === GR.t + S.REGION_WEEKS, 'en region öppnas mot betalning och tar några veckor');
  ok(typeof S.startLiveRegion(GR, gr.id, 'na') === 'string' && GR.money === m0 - costR && S.liveTarget(GR, gr) === t0, 'en region i taget, och ingen effekt förrän den öppnat');
  for (let i = 0; i <= S.REGION_WEEKS; i++) S.liveWeek(GR), GR.t++;
  const fresh0 = lr.fresh;
  lr.fresh = 50; // samma färskhet som vid t0, så att bara regionen skiljer
  const fr = S.liveFactors(GR, gr);
  ok(lr.regions.join() === 'eu' && !lr.region && Math.abs(fr.regions - (1 + S.regionBonus(gr, 'eu'))) < 1e-9 && GR.news.some((n) => n.key === 'live.news.region' && n.vars.region.sv === 'Europa') && lr.marks.some((m) => m.k === 'region'), 'regionen öppnar: nyhet, markör i diagrammet och fler spelare som mål');
  lr.fresh = fresh0;
  for (const id of ['na', 'asia', 'latam']) {
    ok(S.startLiveRegion(GR, gr.id, id) === true, 'öppna ' + id);
    for (let i = 0; i <= S.REGION_WEEKS; i++) S.liveWeek(GR), GR.t++;
  }
  S.checkAchievements(GR);
  ok(lr.regions.length === 4 && S.regionsOpen(GR, gr).length === 0 && GR.stats.liveWorld === 1 && GR.ach.includes('live_world') && S.regionMult(gr) * S.HOME > 0.98 && S.regionMult(gr) * S.HOME < 1.1, 'alla regioner: prestationen, och ungefär lika många spelare som före regionerna');
  delete lr.regions;
  ok(S.regionMult(gr) === 1 && S.regionsOpen(GR, gr).length === 0 && S.startLiveRegion(GR, gr.id, 'na') === false, 'ett onlinespel från en äldre sparning finns redan i hela världen');
}
// porteringar: kräver forskning och licens, ett spel i taget, betyget åldras, säljer veckovis utan att röra G.rng
{
  const GP = S.newGame({ studio: 'P', seed: 11 }); S.makeCompetitors(GP); S.initWorld(GP);
  GP.t = 48 * 10; // 1990
  GP.money = 5e6;
  GP.fans = 20000;
  const base = { title: 'Port', score: 8.5, weekly: [1], total: 2e6, priceAt: 30, topic: 'space', genre: 'action', platform: 'hikari8', scope: 'medium', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [], hype: 40 };
  const g = { ...base, id: 8800, t: GP.t - 30 };
  const old = { ...base, id: 8801, t: GP.t - 48 * 6 };
  GP.games.push(g, old);
  ok(S.canPort(GP, g, 'pc') === 'locked', 'portering kräver forskning');
  GP.u.flags.ports = true;
  ok(S.portTargets(GP, g).some((p) => p.id === 'pc' && p.licensed) && !S.portTargets(GP, g).some((p) => p.id === 'hikari8'), 'porten går till andra öppna plattformar');
  ok(S.canPort(GP, g, 'vortex16') === 'license', 'portering kräver licens');
  ok(S.portScore(GP, old, 'pc') < S.portScore(GP, g, 'pc') - 1, 'ett gammalt spel tappar betyg som port');
  const rng0 = GP.rng;
  const money0 = GP.money;
  ok(S.startPort(GP, g.id, 'pc') === true && GP.port && GP.money === money0 - S.portCost(GP, g) && S.canPort(GP, old, 'pc') === 'busy', 'porteringen startar, kostar och tar teamet');
  for (let i = 0; i < 30; i++) { GP.t++; S.portWeek(GP); }
  const pt = g.ports && g.ports[0];
  ok(!GP.port && pt && pt.platform === 'pc' && pt.revenue > 0 && pt.total > 0 && pt.total < g.total, 'porten släpps och säljer (' + Math.round(pt?.revenue || 0) + ')');
  ok(GP.rng === rng0, 'porteringen rör inte spelets slumpföljd');
  ok(!S.portTargets(GP, g).some((p) => p.id === 'pc'), 'samma plattform kan inte porteras två gånger');
  const live = { ...base, id: 8802, t: GP.t - 10, live: { closed: false } };
  ok(S.canPort(GP, live, 'pc') === 'locked', 'onlinespel porteras inte');
  const GJ = JSON.parse(JSON.stringify(GP));
  for (let i = 0; i < 20; i++) { GJ.t++; S.portWeek(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.games[0].ports[0].weekly.length > 20, 'porten säljer vidare efter sparning');
  // remaster: egen forskning, minst tio år gammalt och betyg 7+, inget åldrande, bara en per spel
  const classic = { ...base, id: 8803, t: GP.t - 48 * 11 };
  const weak = { ...base, id: 8804, t: GP.t - 48 * 11, score: 6.2 };
  GP.games.push(classic, weak);
  ok(!S.remasterable(GP, classic), 'remaster kräver forskning');
  GP.u.flags.remaster = true;
  ok(S.remasterable(GP, classic) && !S.remasterable(GP, g) && !S.remasterable(GP, weak), 'bara gamla spel med betyg 7+ kan få en remaster');
  const rt = S.remasterTargets(GP, classic).find((p) => p.licensed);
  ok(rt && S.portScore(GP, classic, rt.id, undefined, 'remaster') > S.portScore(GP, classic, rt.id), 'remastern åldras inte (' + rt?.id + ')');
  ok(S.portCost(GP, classic, 'remaster') > S.portCost(GP, classic) && S.portWeeks(classic, 'remaster') > S.portWeeks(classic), 'remastern kostar mer och tar längre tid');
  const m1 = GP.money;
  ok(S.startPort(GP, classic.id, rt.id, 'remaster') === true && GP.port.kind === 'remaster' && GP.money === m1 - S.portCost(GP, classic, 'remaster'), 'remastern startar');
  for (let i = 0; i < 30; i++) { GP.t++; S.portWeek(GP); }
  const rp = classic.ports && classic.ports[0];
  ok(rp && rp.kind === 'remaster' && rp.revenue > 0 && classic.remastered && !S.remasterable(GP, classic) && GP.stats.remasters === 1, 'remastern släpps och säljer, och bara en gång (' + Math.round(rp?.revenue || 0) + ')');
  ok(GP.rng === rng0, 'remastern rör inte spelets slumpföljd');
}
// spelserier och licensaffärer: erbjudanden ur fröet, ett avtal per serie, royalty, filmpremiär som ger hype till nästa spel
{
  const GF = S.newGame({ studio: 'L', seed: 13 }); S.makeCompetitors(GF); S.initWorld(GF);
  GF.t = 48 * 14; GF.money = 1e6; GF.fans = 100000;
  const base = { weekly: [1], total: 2e6, priceAt: 30, topic: 'space', genre: 'action', platform: 'nova', scope: 'medium', audience: 'everyone', units: 0, insights: [], reviews: [], flags: [], hype: 40, ended: true };
  const root = { ...base, id: 8900, title: 'Rymdjakt', score: 8, revenue: 5e6, t: GF.t - 48 * 4 };
  const seq = { ...base, id: 8901, title: 'Rymdjakt 2', score: 8.4, revenue: 8e6, t: GF.t - 48, sequelOf: 8900 };
  const solo = { ...base, id: 8902, title: 'Ensam', score: 9, revenue: 9e6, t: GF.t - 30 };
  GF.games.push(root, seq, solo);
  S.frWeek(GF);
  ok(!GF.fr, 'licensaffärer kräver forskning');
  const sl = S.seriesList(GF);
  ok(sl.length === 1 && sl[0].id === 8900 && sl[0].games.length === 2 && S.rootOf(GF, seq) === root && Math.abs(sl[0].revenue - 13e6) < 1, 'ett spel med uppföljare blir en serie');
  GF.u.flags.merch = true;
  const rng0 = GF.rng;
  for (let i = 0; i < 3 && !(GF.fr && GF.fr.offers.length); i++) { S.frWeek(GF); GF.t++; }
  const o = GF.fr.offers[0];
  ok(o && o.series === 8900 && o.up > 0, 'serien får ett erbjudande (' + o?.kind + ' ' + o?.partner + ')');
  const m0 = GF.money;
  ok(S.acceptOffer(GF, o.id) === true && GF.money === m0 + o.up && S.activeDeal(GF, 8900), 'avtalet ger förskottet');
  GF.fr.offers.push({ ...o, id: GF.uid++ });
  ok(S.canAccept(GF, GF.fr.offers.at(-1).id) === 'busy', 'en serie har ett avtal åt gången');
  S.declineOffer(GF, GF.fr.offers.at(-1).id);
  // ett filmavtal efter det första: betyget 8 ger fans, biointäkter och hype till nästa spel
  for (let i = 0; i < 100; i++) { GF.t++; S.frWeek(GF); }
  const d0 = GF.fr.deals[0];
  ok(d0.done && (!d0.roy || Math.abs(d0.paid - d0.roy) < d0.roy * 0.01), 'avtalet löper ut' + (d0.roy ? ' och royaltyn blir den utlovade' : ''));
  GF.fr.offers = [{ id: GF.uid++, series: 8900, title: 'Rymdjakt', kind: 'film', partner: 'Test Films', color: '#fff', q: 8, lo: 7, hi: 9, up: 1000, until: GF.t + 12 }];
  GF.fr.next = GF.t + 999;
  const f0 = GF.fans;
  const h0 = S.seriesHype(GF, 8900);
  const n0 = GF.stats.films || 0;
  ok(S.acceptOffer(GF, GF.fr.offers[0].id) === true, 'filmavtalet tecknas');
  for (let i = 0; i < 81; i++) { GF.t++; S.frWeek(GF); }
  const film = GF.fr.deals.filter((d) => d.kind === 'film').at(-1);
  ok(film.done && film.box > 0 && GF.fans > f0 && GF.stats.films === n0 + 1 && S.seriesHype(GF, 8900) > h0, 'filmen har premiär och ger fans, biointäkter och hype');
  const h = S.seriesHype(GF, 8900);
  ok(S.takeSeriesHype(GF, seq) === h && S.seriesHype(GF, 8900) === 0, 'hypen går till seriens nästa spel');
  ok(GF.rng === rng0, 'licensaffärerna rör inte spelets slumpföljd');
  const GL = JSON.parse(JSON.stringify(GF));
  for (let i = 0; i < 30; i++) { GL.t++; S.frWeek(GL); }
  ok(Number.isFinite(GL.money) && Number.isFinite(GL.fans), 'licensaffärerna fortsätter efter sparning');
}
// uppköp: kräver forskning, priset efter försäljningen, dotterbolaget ger en andel av sina nya spel och krockar inte
{
  const GA = S.newGame({ studio: 'U', seed: 14 }); S.makeCompetitors(GA); S.initWorld(GA);
  while (S.yearOf(GA.t) < 2001) { GA.money = 1e9; GA.pending.length = 0; S.stepTick(GA); }
  GA.money = 1e8;
  const c = GA.comps.slice().sort((a, b) => S.compYearly(GA, b) - S.compYearly(GA, a))[0];
  ok(S.canAcquire(GA, c.id) === 'locked', 'uppköp kräver forskning');
  GA.u.flags.acquire = true;
  const price = S.acqPrice(GA, c);
  ok(price > S.compYearly(GA, c) * 3 && S.canAcquire(GA, c.id) === true, 'priset är flera års försäljning (' + Math.round(price) + ')');
  const m0 = GA.money;
  ok(S.acquire(GA, c.id) === true && c.owned && GA.money === m0 - price && S.canAcquire(GA, c.id) === 'owned', 'köpet går igenom');
  for (const x of GA.comps.filter((y) => !y.owned).slice(0, 3)) S.acquire(GA, x.id);
  const rest = GA.comps.find((y) => !y.owned);
  ok(S.ownedComps(GA).length === S.ACQ_MAX && S.canAcquire(GA, rest.id) === 'max', 'högst ' + S.ACQ_MAX + ' dotterbolag');
  const r0 = GA.market.releases.length;
  while (!GA.market.releases.slice(r0).some((r) => r.comp === c.id)) { GA.pending.length = 0; S.stepTick(GA); }
  const rel = GA.market.releases.slice(r0).find((r) => r.comp === c.id);
  for (let i = 0; i < 48 * 8; i++) { GA.pending.length = 0; S.stepTick(GA); }
  ok(c.subRev > 0 && S.subIncome(GA) > 0, 'dotterbolaget ger intäkter (' + Math.round(c.subRev) + ')');
  ok(!S.crowding(GA, { genre: rel.genre, topic: rel.topic }, rel.t).rivals.some((x) => x.studio === c.name), 'dotterbolagets släpp krockar inte med dina');
  const GJ = JSON.parse(JSON.stringify(GA));
  for (let i = 0; i < 48; i++) { GJ.pending.length = 0; S.stepTick(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.comps.filter((y) => y.owned).length === S.ACQ_MAX, 'dotterbolagen finns kvar efter sparning');
}
// koncernledning: stabil ekonomi för köp, verksamheter för integration, ledningens kapacitet, budget, VD, synergier och försäljning
{
  const GK = S.newGame({ studio: 'K', seed: 21 }); S.makeCompetitors(GK); S.initWorld(GK);
  while (S.yearOf(GK.t) < 2004) { GK.money = 1e9; GK.pending.length = 0; S.stepTick(GK); }
  GK.u.flags.acquire = true;
  GK.office.tier = 3;
  const [a, b, d] = GK.comps.slice(0, 3);
  GK.money = 0;
  ok(S.canAcquire(GK, a.id) === 'unstable' && typeof S.acquire(GK, a.id) === 'string', 'köp kräver en stabil ekonomi (stabilitet ' + S.stability(GK) + ')');
  GK.money = 1e9;
  ok(S.stability(GK) >= S.STABLE_MIN && S.acquire(GK, a.id) === true && S.acquire(GK, b.id) === true, 'köp med stabil ekonomi (stabilitet ' + S.stability(GK) + ')');
  const sa = a.sub;
  ok(sa && sa.mode === 'free' && sa.staff > 0 && S.shareOf(GK, a) === S.BASE_SHARE, 'dotterbolaget har personal (' + Math.round(sa.staff) + ') och grundandelen');
  ok(S.canIntegrate(GK, a.id) === 'locked', 'integration kräver forskningen Koncernledning');
  GK.u.flags.group = true;
  GK.engines.length = 0; GK.u.flags.publish = false; GK.store = null; GK.fac = {}; GK.games.forEach((g) => { g.live = null; g.ports = []; }); if (GK.fr) GK.fr.deals = [];
  ok(S.opsCount(GK) === 1 && S.canIntegrate(GK, a.id) === 'ops' && S.setMode(GK, a.id, 'int') === 'ops', 'integration kräver ' + S.OPS_MIN + ' verksamheter');
  GK.u.flags.publish = true;
  const cost = S.integCost(GK, a);
  const m0 = GK.money;
  ok(cost > 0 && S.setMode(GK, a.id, 'int') === true && sa.mode === 'int' && GK.money === m0 - cost, 'integrationen kostar ' + cost);
  ok(S.setMode(GK, b.id, 'int') === true && S.groupLoad(GK) === 2 && !S.overloaded(GK), 'två integrerade bolag ryms i ledningen (' + S.groupLoad(GK) + '/' + S.groupCap(GK) + ')');
  const rng0 = GK.rng;
  for (let i = 0; i < 70; i++) { GK.t++; S.groupWeek(GK); }
  ok(GK.rng === rng0, 'koncernen rör inte spelets slumpföljd');
  ok(sa.integ >= 1 && sa.done && S.shareOf(GK, a) > S.BASE_SHARE + 0.2, 'integrationen blir klar och ger en större andel (' + Math.round(S.shareOf(GK, a) * 100) + ' %)');
  ok(Math.abs(S.costSave(GK) - Math.min(S.COST_MAX, S.COST * 2)) < 1e-9 && S.promoOwn(GK) === 0, 'delade tjänster sänker kostnaderna, korspromotion kräver marknadsavdelning');
  const st0 = sa.staff;
  ok(S.setSubBudget(GK, a.id, 2) === true, 'satsa på dotterbolaget');
  const m1 = GK.money;
  for (let i = 0; i < 48; i++) { GK.t++; S.groupWeek(GK); }
  ok(sa.staff > st0 * 1.08 && sa.inv > 0 && GK.money < m1 && S.groupCostMonth(GK) > 0, 'satsningen kostar och växer bolaget (' + Math.round(st0) + ' -> ' + Math.round(sa.staff) + ')');
  for (let i = 0; i < 3; i++) GK.staff.push(S.makeCandidate(GK, 1));
  const boss = S.ceoCandidates(GK)[0];
  const n0 = GK.staff.length;
  ok(boss && S.setCeo(GK, a.id, boss.id) === true && GK.staff.length === n0 - 1 && sa.ceo === boss && S.loadOf(a) === S.LOAD.ceo, 'VD ur personalen lämnar studion och tar mindre av ledningen');
  ok(typeof S.divest(GK, a.id) === 'string' && a.owned, 'bolag med VD kan inte säljas');
  ok(S.recallCeo(GK, a.id) === true && GK.staff.length === n0 && !sa.ceo, 'VD:n kallas hem');
  ok(S.acquire(GK, d.id) === true && S.setMode(GK, d.id, 'int') === true && S.overloaded(GK), 'tre integrerade bolag överbelastar ledningen på nivå 3');
  for (let i = 0; i < 4; i++) { GK.t++; S.groupWeek(GK); }
  ok(GK.flags.groupOver && d.sub.integ === 0, 'överbelastad ledning: integrationen står still');
  const v = S.sellPrice(GK, d);
  const m2 = GK.money;
  ok(S.divest(GK, d.id) === true && !d.owned && !d.sub && GK.money === m2 + v && !S.overloaded(GK), 'sälj ett dotterbolag för ' + v);
  delete b.sub;
  GK.t++; S.groupWeek(GK);
  ok(b.sub && b.sub.mode === 'free', 'gamla sparfiler får dotterbolagens styrning');
  const GJ = JSON.parse(JSON.stringify(GK));
  for (let i = 0; i < 48; i++) { GJ.pending.length = 0; S.stepTick(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.comps.find((y) => y.id === a.id).sub.mode === 'int', 'koncernen finns kvar efter sparning');
}
// egen butik: kräver forskning, sluten eller öppen, avgiften, exklusiva spel, marginalen på egna pc-spel
{
  const GS = S.newGame({ studio: 'B', seed: 15 }); S.makeCompetitors(GS); S.initWorld(GS);
  GS.t = 48 * 24; GS.money = 1e8; GS.fans = 2e5;
  S.storeWeek(GS);
  ok(!GS.store, 'butiken kräver forskning');
  GS.u.flags.store = true;
  const rng0 = GS.rng;
  GS.t++; S.storeWeek(GS);
  const B = GS.store;
  ok(B && B.policy === 'closed' && B.reach > 0, 'butiken öppnar sluten');
  for (let i = 0; i < 40; i++) { GS.t++; S.storeWeek(GS); }
  ok(B.reach > 0.05 && B.dev === 0 && B.tot.ext === 0 && B.tot.ops > 0, 'en sluten butik växer utan andra förlag (räckvidd ' + B.reach.toFixed(3) + ')');
  const pc = { platform: 'pc', total: 1e6, score: 8 };
  S.storeRelease(GS, pc);
  ok(pc.total > 1e6 && pc.storeFeat > 0 && !pc.storeEx, 'ett pc-spel säljer mer i butiken (+' + Math.round(pc.storeFeat * 100) + ' %)');
  const con = { platform: 'nova2', total: 1e6, score: 8 };
  S.storeRelease(GS, con);
  ok(con.total === 1e6, 'konsolspel påverkas inte');
  const g = { id: 99001, platform: 'pc', t: GS.t, weekly: [], score: 8 };
  GS.games.push(g);
  GS.t++; g.weekly.push(70000);
  const own0 = B.tot.own;
  S.storeWeek(GS);
  ok(Math.abs(B.tot.own - own0 - 70000 / 0.7 * 0.3 * B.reach) < 1, 'du behåller butiksavgiften på dina pc-spel');
  ok(S.setPolicy(GS, 'open') === true && B.policy === 'open' && typeof S.setPolicy(GS, 'closed') === 'string', 'öppna butiken, sedan väntetid innan nästa byte');
  for (let i = 0; i < 30; i++) { GS.t++; S.storeWeek(GS); }
  ok(B.dev > 0.3 && B.tot.ext > 0, 'andra förlag kommer och betalar avgift (' + Math.round(B.dev * 100) + ' %)');
  const tr = B.trust;
  ok(S.setFee(GS, 0.3) && B.trust < tr, 'en höjd avgift kostar förtroende');
  const d10 = { ...B, fee: 0.1 }, d30 = { ...B, fee: 0.3 };
  ok(S.devTarget(d10) > S.devTarget(d30) && S.discOf(B) < S.discOf({ ...B, policy: 'closed' }), 'lägre avgift lockar fler förlag, en öppen butik är svårare att hitta i');
  S.setExclusive(GS, true);
  const ex = { platform: 'pc', total: 1e6, score: 8 };
  const plain = { platform: 'pc', total: 1e6, score: 8 };
  B.ex = false; S.storeRelease(GS, plain); B.ex = true; S.storeRelease(GS, ex);
  ok(ex.storeEx && ex.total < plain.total, 'ett exklusivt spel säljer mindre men bara i butiken');
  const t0 = B.trust;
  GS.t += 26;
  ok(S.setPolicy(GS, 'closed') === true && B.trust === Math.max(0, t0 - 15), 'att stänga butiken kostar förtroende');
  GS.t++; S.storeWeek(GS);
  ok(B.dev === 0, 'en sluten butik har inga andra förlag');
  const ops0 = B.tot.ops, r0 = B.reach, m1 = GS.money;
  ok(S.setPaused(GS, true) && S.storeCostMonth(GS) === 0, 'butiken går att pausa');
  for (let i = 0; i < 8; i++) { GS.t++; S.storeWeek(GS); }
  ok(B.tot.ops === ops0 && GS.money === m1 && B.reach < r0, 'en pausad butik kostar inget men tappar användare');
  const exg = { id: 'exg', platform: 'pc', score: 8, total: 1e6, t: GS.t - 6, tail: 1, priceAt: 30, weekly: [], revenue: 0, units: 0, fansGained: 0, storeEx: true };
  const games0 = GS.games;
  GS.games = [exg]; // bara det exklusiva spelet (testets andra spel saknar försäljningsfält)
  S.salesWeek(GS);
  const exPaused = exg.weekly[exg.weekly.length - 1];
  ok(S.setPaused(GS, false) && !B.paused, 'och öppnar igen');
  GS.t++; S.salesWeek(GS);
  ok(exPaused === 0 && !exg.ended && exg.weekly[exg.weekly.length - 1] > 0, 'ett exklusivt spel säljs inte medan butiken är pausad');
  GS.games = games0;
  // säsongsrean: äldre pc-spel säljer igen, nya användare kommer och fler väntar på nästa rea
  ok(S.setSale(GS, 2) && !S.setSale(GS, 2) && S.saleSeason(S.tOf(2010, 5, 2)) === 0 && S.saleSeason(S.tOf(2010, 11, 3)) === 1 && S.saleSeason(S.tOf(2010, 7, 0)) === undefined && S.saleIn(S.tOf(2010, 5, 0)) === 2, 'säsongsrean ligger i juni och december');
  const oldg = { id: 'oldg', platform: 'pc', score: 8, total: 3e6, t: GS.t - 100, tail: 1, priceAt: 30, weekly: [], revenue: 0, units: 0, fansGained: 0, ended: true };
  GS.games.push(oldg);
  GS.t = S.tOf(S.yearOf(GS.t) + 1, 5, 1);
  S.storeWeek(GS);
  const r1 = B.reach, w1 = B.wait, sale1 = B.tot.sale;
  for (let i = 0; i < 2; i++) { GS.t++; S.storeWeek(GS); }
  ok(B.tot.sale > sale1 && B.wait > w1 && B.reach > r1 && GS.news.some((n) => n.key === 'news.saleSummer' && n.t === GS.t), 'rean säljer äldre spel, lockar användare och ger en nyhet');
  B.ex = false;
  const full = { platform: 'pc', total: 1e6, score: 7 }, waited = { platform: 'pc', total: 1e6, score: 7 };
  const w2 = B.wait;
  B.wait = 0; S.storeRelease(GS, full); B.wait = w2; S.storeRelease(GS, waited);
  ok(waited.total < full.total, 'spelare som väntar på rean köper mindre vid släpp');
  GS.games.pop();
  const pol0 = B.policy, dev0 = B.dev;
  B.policy = 'open'; B.dev = 0.5;
  GS.market.releases.push({ id: 'rv', t: GS.t - 2, comp: 'nobody', studio: 'Rival', title: 'Rival', score: 7, total: 2e6, platform: 'pc', tail: 1 });
  GS.games.push({ id: 'mine', t: GS.t - 2, title: 'Mine', score: 8, total: 1e6, platform: 'pc', weekly: [1e4, 2e4] });
  const top = S.storeChart(GS, 5);
  GS.market.releases.pop(); GS.games.pop();
  B.policy = pol0; B.dev = dev0;
  ok(top.length === 2 && top.length <= 5 && top.every((r, i) => r.v > 0 && (!i || top[i - 1].v >= r.v) && ['own', 'group', 'ext'].includes(r.kind)), 'butikens topplista visar det som säljer mest (' + top.map((r) => r.kind).join(', ') + ')');
  ok(GS.rng === rng0, 'butiken rör inte spelets slumpföljd');
  const GJ = JSON.parse(JSON.stringify(GS));
  for (let i = 0; i < 30; i++) { GJ.t++; S.storeWeek(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.store.reach > 0, 'butiken fortsätter efter sparning');
}
// butikens nivåer, temaveckor, skyltfönstret, önskelistan och topplistans placeringar
{
  const GN = S.newGame({ studio: 'N', seed: 31 }); S.makeCompetitors(GN); S.initWorld(GN);
  GN.t = 48 * 30 + 14; GN.money = 1e8; GN.fans = 2e5; GN.u.flags.store = true;
  GN.games.length = 0;
  const rng0 = GN.rng;
  S.storeWeek(GN);
  const B = GN.store;
  const mk = (id, genre, scope = 'large') => ({ id, title: id, platform: 'pc', genre, topic: 'space', scope, score: 8, total: 2e6, t: GN.t - 40, tail: 1, priceAt: 30, weekly: [], revenue: 0, units: 0, fansGained: 0, ended: true });
  ok(S.levelOf(GN) === 1 && S.spotSlots(GN) === 0 && B.lvl === 1, 'en ny butik är en kiosk utan skyltfönster');
  const ag = mk('ag', 'action'), pg = mk('pg', 'puzzle'), sg = mk('sg', 'puzzle', 'small');
  GN.games.push(ag, pg, sg);
  // temavecka: Actionfestivalen (vecka 16 och 17) lyfter bara action-, skjut- och racingspel
  GN.t = 48 * 30 + 15; S.storeWeek(GN);
  ok(!S.eventNow(GN) && S.eventNext(GN).ev.id === 'action' && S.eventNext(GN).in === 1 && S.eventIn(GN, S.eventNext(GN).ev) === 1, 'nästa temavecka är en vecka bort');
  GN.t++; S.storeWeek(GN);
  ok(S.eventNow(GN).id === 'action' && S.eventFits(GN).map((g) => g.id).join() === 'ag', 'temaveckan passar bara action-spelet');
  ok(B.ev && B.ev.id === 'action' && B.ev.inc > 0 && GN.news.some((n) => n.key === 'news.storeEvent'), 'temaveckan ger extra försäljning och en nyhet (' + Math.round(B.ev.inc) + ')');
  const inc1 = B.ev.inc;
  GN.t++; S.storeWeek(GN);
  ok(B.ev.inc > inc1, 'och den fortsätter vecka två');
  GN.t++; S.storeWeek(GN);
  ok(B.ev.done && GN.news.some((n) => n.key === 'news.storeEventEnd'), 'efteråt kommer en nyhet om vad den gav');
  ok(STORE_EVENTS.every((e) => Array.isArray(S.eventFits(GN, e))), 'passande spel räknas ut för varje temavecka');
  // nivåer: följer högsta antalet användare
  GN.stats.storeUsers = 4e5; GN.t++; S.storeWeek(GN);
  ok(S.levelOf(GN) === 2 && S.spotSlots(GN) === 1 && B.lvl === 2 && GN.news.some((n) => n.key === 'news.storeLevel' && n.vars.n === 2), 'butiken växer till en butik med ett skyltfönster');
  GN.stats.storeUsers = 3e6;
  ok(S.levelOf(GN) === 4 && S.spotSlots(GN) === 2 && S.eventBoost(GN) === 1.5, 'nivå 4: två platser och starkare temaveckor');
  GN.stats.storeUsers = 4e5;
  // skyltfönstret
  const m0 = GN.money, cost = S.spotCost(GN, ag);
  ok(cost > 0 && S.startSpot(GN, 'ag') === true && Math.abs(m0 - GN.money - cost) < 1 && B.spots.length === 1, 'ett spel lyfts fram mot en avgift (' + cost + ')');
  ok(typeof S.startSpot(GN, 'pg') === 'string' && typeof S.canSpot(GN, 'ag') === 'string', 'en plats rymmer ett spel och samma spel kan inte läggas in två gånger');
  GN.t++; S.storeWeek(GN); GN.t++; S.storeWeek(GN);
  ok(B.spots[0] && B.spots[0].inc > 0, 'spelet i fönstret ger extra försäljning');
  GN.t++; S.storeWeek(GN); GN.t++; S.storeWeek(GN);
  ok(B.spots.length === 0 && GN.news.some((n) => n.key === 'news.storeSpotEnd'), 'efter några veckor lämnar spelet fönstret med en nyhet');
  ok(String(S.canSpot(GN, 'ag')).length > 5 && S.canSpot(GN, 'pg') === true, 'ett spel som nyss stått där får vila, ett annat går bra');
  ok(S.setPaused(GN, true) && typeof S.canSpot(GN, 'pg') === 'string' && S.setPaused(GN, false), 'en pausad butik har inget skyltfönster');
  // önskelistan
  ok(S.wishOf(GN, 0) === 0 && S.wishOf(GN, 80) > S.wishOf(GN, 30) && S.wishOf(GN, 30) > 0, 'önskelistan växer med förväntan');
  const wa = { platform: 'pc', total: 1e6, score: 7, hype: 80 }, wb = { platform: 'pc', total: 1e6, score: 7, hype: 0 };
  S.storeRelease(GN, wa); S.storeRelease(GN, wb);
  ok(wa.total > wb.total && wa.wish > 0 && !wb.wish, 'ett efterlängtat spel säljer mer vid släpp');
  GN.job = { kind: 'game', platform: 'pc', title: 'Ny', hype: 60 };
  ok(S.wishNow(GN).n > 0, 'ett pc-spel på gång syns på önskelistan');
  GN.job = { kind: 'game', platform: 'console', title: 'Ny', hype: 60 };
  ok(S.wishNow(GN) === null, 'ett konsolspel gör det inte');
  GN.job = null;
  // topplistan: etta och förändring mot förra veckan
  GN.games = [{ ...mk('big', 'puzzle'), t: GN.t - 3, weekly: [1e5, 1e5, 1e5], ended: false }];
  S.storeWeek(GN);
  ok(GN.stats.storeTops === 1 && GN.news.some((n) => n.key === 'news.storeTop'), 'ett eget spel som blir etta ger en nyhet');
  GN.t++; GN.games[0].weekly.push(1e5); S.storeWeek(GN);
  const rows = S.storeChart(GN, 3);
  ok(rows[0].rank === 1 && rows[0].d === 0 && GN.stats.storeTops === 1, 'placeringen jämförs med förra veckan och nyheten kommer bara en gång');
  ok(GN.rng === rng0, 'butikens nya delar rör inte spelets slumpföljd');
  const GJ = JSON.parse(JSON.stringify(GN));
  delete GJ.store.spots; delete GJ.store.rk; delete GJ.store.rkp; delete GJ.store.ev; delete GJ.store.lvl;
  for (let i = 0; i < 60; i++) { GJ.t++; S.storeWeek(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.store.lvl >= 1 && Array.isArray(GJ.store.spots), 'en butik från före de nya delarna fortsätter som vanligt');
}
// butikens erbjudanden, spelpaket och rekord
{
  const GD = S.newGame({ studio: 'D', seed: 33 }); S.makeCompetitors(GD); S.initWorld(GD);
  GD.t = 48 * 30 + 14; GD.money = 1e8; GD.fans = 2e5; GD.u.flags.store = true;
  GD.games.length = 0;
  const rng0 = GD.rng;
  S.storeWeek(GD);
  const B = GD.store;
  const mkg = (id, age, weekly = []) => ({ id, title: id, platform: 'pc', genre: 'action', topic: 'space', scope: 'large', score: 8, total: 2e6, t: GD.t - age, tail: 1, priceAt: 30, weekly, revenue: 0, units: 0, fansGained: 0, ended: true });
  const old = mkg('old', 60), nw = mkg('nw', 8), cg = mkg('c', 70), dg = mkg('d', 80), eg = mkg('e', 90, [5e5].concat(Array(89).fill(100)));
  GD.games.push(old, nw, cg, dg, eg);
  const m0 = GD.money;
  const nets = [0, 1, 2].map((i) => S.dealNet(GD, old, i));
  ok(nets[1] > nets[0] && nets[0] > 0 && nets[2] === 0 && S.dealNet(GD, old, 1) > S.dealNet(GD, nw, 1), 'halva priset ger mest pengar, den största rabatten bara användare, och ett äldre spel vinner mer');
  ok(S.dealSlots(GD) === 1 && S.canDeal(GD, 'old', 1) === true && S.dealValue(GD, old, 1) > S.dealValue(GD, old, 0), 'en plats, och värdet av halva priset är störst');
  ok(S.startDeal(GD, 'old', 1) === true && GD.money === m0 && B.deals.length === 1, 'ett erbjudande kostar ingenting');
  ok(typeof S.startDeal(GD, 'nw', 1) === 'string' && typeof S.canDeal(GD, 'old', 1) === 'string', 'en plats rymmer ett erbjudande');
  const sb0 = B.sb;
  GD.t++; S.storeWeek(GD);
  ok(B.deals[0] && B.deals[0].inc > 0 && B.sb > sb0 * 0.99 && B.wait > 0, 'erbjudandet ger extra försäljning, användare och lite väntande spelare');
  GD.t++; S.storeWeek(GD);
  GD.t++; S.storeWeek(GD);
  ok(B.deals.length === 0 && GD.news.some((n) => n.key === 'news.storeDealEnd'), 'efter två veckor är erbjudandet slut med en nyhet');
  ok(typeof S.canDeal(GD, 'old', 1) === 'string', 'samma spel får vila');
  GD.t += 8;
  ok(S.canDeal(GD, 'old', 1) === true, 'efter åtta veckor går det igen');
  ok(S.setAutoDeal(GD, true) === false && !B.autoDeal, 'Autopilot kräver butiksnivå 3');
  GD.stats.storeUsers = 1.2e6;
  ok(S.levelOf(GD) === 3 && S.setAutoDeal(GD, true) === true && B.autoDeal === true, 'Autopilot finns från nivå 3');
  S.storeWeek(GD);
  ok(B.deals.length === 1 && B.deals[0].id === 'e' && B.deals[0].auto && GD.news.some((n) => n.key === 'news.storeDealAuto'), 'Autopilot ger halva priset åt spelet vars försäljning har sjunkit (och bara det)');
  for (let i = 0; i < 3; i++) { GD.t++; S.storeWeek(GD); }
  ok(B.deals.every((d) => d.id !== 'e' || GD.t - d.t0 < 2), 'ett autoerbjudande tar slut som andra');
  S.setAutoDeal(GD, false);
  // spelpaket
  GD.stats.storeUsers = 4e5;
  ok(typeof S.canBundle(GD, ['old', 'c', 'd']) === 'string' && !S.bundleOpen(GD), 'spelpaket kräver butiksnivå 3');
  GD.stats.storeUsers = 1.2e6;
  ok(S.bundleOpen(GD) && typeof S.canBundle(GD, ['old', 'c']) === 'string' && typeof S.canBundle(GD, ['old', 'c', 'c']) === 'string', 'ett paket måste ha tre olika spel');
  ok(S.bundleValue(GD, ['old', 'c', 'd']) > 0 && S.bundleNet(3) > S.bundleNet(2), 'ett paket väntas ge pengar och drar mer med fler spel');
  ok(S.startBundle(GD, ['old', 'c', 'd']) === true && B.bundles.length === 1 && typeof S.canBundle(GD, ['nw', 'e', 'old']) === 'string', 'ett paket i taget');
  const f0 = GD.fans;
  GD.t++; S.storeWeek(GD);
  ok(B.bundles[0] && B.bundles[0].inc > 0 && GD.fans > f0, 'paketet ger extra försäljning och fans');
  GD.t++; S.storeWeek(GD); GD.t++; S.storeWeek(GD);
  ok(B.bundles.length === 0 && GD.news.some((n) => n.key === 'news.storeBundleEnd'), 'efter tre veckor är paketet slut med en nyhet');
  ok(!S.bundleGames(GD).some((g) => g.id === 'old') && typeof S.canBundle(GD, ['old', 'c', 'd']) === 'string', 'spelen i paketet får vila');
  GD.t += 12;
  ok(S.canBundle(GD, ['old', 'c', 'd']) === true, 'efter tolv veckor går de igen');
  // rekord: en stadig butik följd av en toppvecka ger en nyhet, men inte om och om igen
  const GR2 = S.newGame({ studio: 'R', seed: 34 }); S.makeCompetitors(GR2); S.initWorld(GR2);
  GR2.t = 48 * 30 + 14; GR2.money = 1e8; GR2.fans = 2e5; GR2.u.flags.store = true; GR2.games.length = 0;
  const rngR = GR2.rng;
  S.storeWeek(GR2);
  const hit = { id: 'hit', title: 'Hit', platform: 'pc', genre: 'action', topic: 'space', scope: 'large', score: 8, total: 5e7, t: GR2.t, tail: 1, priceAt: 30, weekly: [], revenue: 0, units: 0, fansGained: 0, ended: false };
  GR2.games.push(hit);
  const tick = (v) => { GR2.t++; hit.weekly.push(v); S.storeWeek(GR2); };
  for (let i = 0; i < 26; i++) tick(1e5);
  const R = S.recOf(GR2.store);
  ok(R.week.v > 0 && R.week.sh > 0 && R.game.id === 'hit' && GR2.news.filter((n) => n.key === 'news.storeRecWeek').length <= 2, 'en butik som växer ger få rekordnyheter (högst en var tolfte vecka)');
  GR2.news.length = 0;
  R.week.sh = R.week.v; R.game.sh = R.game.v; R.week.nt = -99; R.game.nt = -99;
  tick(2e6);
  ok(GR2.news.some((n) => n.key === 'news.storeRecWeek' && n.big) && GR2.news.some((n) => n.key === 'news.storeRecGame'), 'en toppvecka ger rekordnyheter som händelsekort');
  tick(4e6);
  ok(GR2.news.filter((n) => n.key === 'news.storeRecWeek').length === 1, 'inte om och om igen inom tolv veckor');
  ok(GD.rng === rng0 && GR2.rng === rngR, 'butikens nya delar rör inte slumpföljden');
  const GO = JSON.parse(JSON.stringify(GD));
  delete GO.store.deals; delete GO.store.bundles; delete GO.store.rec; delete GO.store.autoDeal;
  for (let i = 0; i < 30; i++) { GO.t++; S.storeWeek(GO); }
  ok(Number.isFinite(GO.money) && Array.isArray(GO.store.deals) && GO.store.rec, 'en butik från före erbjudandena fortsätter som vanligt');
}
// personalens tillväxt, team och kurs för hela teamet
{
  const GT = S.newGame({ studio: 'T', seed: 41 }); S.makeCompetitors(GT); S.initWorld(GT);
  GT.t = 48 * 12; GT.money = 5e7; GT.u.flags.training = true; GT.office.tier = 3;
  for (let i = 0; i < 5; i++) { S.refreshCandidates(GT); GT.money += GT.candidates[0].fee; S.hire(GT, GT.candidates[0].id); }
  const rngT = GT.rng;
  const [, a, b, c] = GT.staff;
  const sum = (x) => x.design + x.tech + x.speed + x.research;
  // växa av arbete
  const xp0 = a.xp || 0;
  S.growWeek(GT);
  ok((a.xp || 0) === xp0, 'utan ett pågående projekt samlas ingen erfarenhet');
  GT.job = { kind: 'game', state: 'dev', crunch: false };
  S.growWeek(GT);
  ok(a.xp > xp0 && S.growWeeksLeft(GT, a, false) > 1, 'med ett projekt samlar medarbetaren erfarenhet');
  const m0 = a.mood; a.mood = 100; const fast = S.growRate(GT, a, false); a.mood = 20; const slow = S.growRate(GT, a, false); a.mood = m0;
  ok(fast > slow && S.growRate(GT, { ...a, trait: null }, true) > S.growRate(GT, { ...a, trait: null }, false) && S.growRate(GT, { ...a, trait: 'mentor' }, true) === S.growRate(GT, { ...a, trait: 'mentor' }, false), 'trivsel och en mentor gör att man lär sig fortare (men inte mentorn själv)');
  const lo = { ...a, design: 10, tech: 10, speed: 10, research: 10 }, hi = { ...a, design: 90, tech: 90, speed: 90, research: 90 };
  ok(S.growRate(GT, lo, false) > S.growRate(GT, hi, false), 'ju närmare taket, desto långsammare');
  a.xp = S.GROW_XP - 0.01;
  const tot0 = sum(a), sal0 = a.salary;
  S.growWeek(GT);
  ok(sum(a) === tot0 + 1 && a.salary > sal0 && a.lastGrow === GT.t && S.SKILLS.includes(a.growSkill) && a.grown === 1 && a.xp < 5, 'ett steg ger +1 i en färdighet, lite högre lön och ett märke');
  ok(S.growSkill(GT, a) === S.growSkill(GT, a), 'färdigheten väljs av fröet, inte av slumpen');
  const picks = { design: 0, tech: 0, speed: 0, research: 0 };
  for (let i = 0; i < 400; i++) picks[S.growSkill(GT, { id: i, spec: 'coder', grown: 0 })]++;
  ok(picks.tech > picks.design && picks.tech > picks.research, 'en programmerare lär sig mest av teknik');
  b.trainUntil = GT.t + 5; b.xp = 0;
  S.growWeek(GT);
  ok(b.xp === 0, 'den som är på kurs samlar ingen erfarenhet');
  b.trainUntil = -1;
  c.design = c.tech = c.speed = c.research = Math.ceil(S.skillCap(GT)); c.xp = S.GROW_XP;
  const tc = sum(c);
  S.growWeek(GT);
  ok(sum(c) === tc && c.xp === S.GROW_XP, 'ingen växer över taket');
  ok(GT.rng === rngT, 'tillväxten rör inte slumpföljden');
  GT.job = null;
  // team
  const T1 = S.createTeam(GT);
  ok(T1.id === 1 && S.teamsOf(GT).length === 1 && S.teamsOpen(GT), 'ett team skapas');
  ok(S.addMember(GT, T1.id, a.id) === true && S.addMember(GT, T1.id, b.id) === true && S.addMember(GT, T1.id, c.id) === true && S.membersOf(GT, T1).length === 3, 'personal läggs till');
  const T2 = S.createTeam(GT);
  ok(S.addMember(GT, T2.id, c.id) === true && T1.members.length === 2 && T2.members.includes(c.id) && S.teamOfStaff(GT, c.id) === T2, 'en person är med i ett team i taget');
  ok(S.addMember(GT, T1.id, c.id) === true && T2.members.length === 0, 'och flyttas dit man lägger till');
  ok(S.teamName(T1).sv !== S.teamName(T2).sv, 'teamen får olika namn');
  for (let i = 0; i < 4; i++) S.createTeam(GT);
  ok(typeof S.createTeam(GT) === 'string' && S.teamsOf(GT).length === S.TEAM_MAX, 'högst ' + S.TEAM_MAX + ' team');
  S.disbandTeam(GT, T2.id); S.disbandTeam(GT, 3); S.disbandTeam(GT, 4); S.disbandTeam(GT, 5); S.disbandTeam(GT, 6);
  ok(S.teamsOf(GT).length === 1 && S.teamsOf(GT)[0] === T1, 'ett team kan lösas upp');
  for (let i = 0; i < 12; i++) GT.staff.push({ ...a, id: 900 + i, name: 'X' + i, trainUntil: -1, trainSkill: null, lastTrain: -99, trait: null });
  let full = true;
  for (let i = 0; i < 12; i++) full = S.addMember(GT, T1.id, 900 + i);
  ok(T1.members.length === S.TEAM_SIZE && typeof full === 'string', 'ett team rymmer högst ' + S.TEAM_SIZE);
  S.removeMember(GT, T1.id, 908); S.removeMember(GT, T1.id, 909);
  GT.staff = GT.staff.filter((x) => x.id !== 903);
  S.teamsWeek(GT);
  ok(!T1.members.includes(903) && T1.members.length === S.TEAM_SIZE - 2, 'den som slutar försvinner ur teamet');
  ok(GT.rng === rngT, 'teamen rör inte slumpföljden');
  // hel kurs: en kursplats, en fjärdedel billigare
  const slots = S.trainingSlots(GT);
  const info = S.courseInfo(GT, T1);
  ok(S.canTrainTeam(GT, T1) === true && info.ready.length === T1.members.length && info.cost === Math.round(info.alone * S.TEAM_DISCOUNT) && info.cost < info.alone, 'teamkursen kostar mindre än kurser var för sig');
  const mo = GT.money;
  const before = new Map(GT.staff.map((x) => [x.id, x.design]));
  ok(S.trainTeam(GT, T1.id, 'design') === true && GT.money === mo - info.cost, 'teamet går kursen och betalar rabatterat');
  const onGroup = GT.staff.filter((x) => x.trainGroup === 'T' + T1.id);
  ok(onGroup.length === info.ready.length && S.trainingNow(GT) === 1 && slots >= 1, 'hela teamet tar bara en kursplats');
  ok(S.canTrainTeam(GT, T1) === 'busy' && S.workers(GT).every((w) => !onGroup.includes(w)), 'teamet är borta från arbetet under kursen');
  const outsider = GT.staff.find((x) => !T1.members.includes(x.id) && !x.isFounder);
  ok(slots > 1 || S.canTrain(GT, outsider) === 'slots', 'platsen är upptagen för andra om det bara finns en');
  GT.news.length = 0;
  GT.t = Math.max(...onGroup.map((x) => x.trainUntil));
  S.finishCourses(GT);
  ok(onGroup.every((x) => !x.trainSkill && !x.trainGroup && x.design > before.get(x.id)), 'alla i teamet blev bättre och är tillbaka');
  const nn = GT.news.filter((x) => x.key === 'news.teamTrained');
  ok(nn.length === 1 && nn[0].vars.n === onGroup.length && GT.news.every((x) => x.key !== 'news.trained'), 'en nyhet för hela kursen (inte en per person)');
  ok(S.canTrainTeam(GT, T1) === 'cooldown' && S.trainingNow(GT) === 0, 'efter kursen behöver de vila, och platsen är ledig igen');
  // en enskild kurs fungerar som förut (och ger en rad i krönikan)
  const lone = GT.staff.find((x) => !x.isFounder && !T1.members.includes(x.id));
  GT.t += 40;
  ok(S.train(GT, lone.id, 'tech') === true && S.trainingNow(GT) === 1 && !lone.trainGroup, 'en enskild kurs tar en plats');
  GT.t = lone.trainUntil; S.finishCourses(GT);
  ok(GT.news.some((x) => x.key === 'news.trained' && x.vars.name === lone.name), 'en enskild kurs blir en rad i krönikan');
  ok(S.canTrainTeam({ ...GT, u: { ...GT.u, flags: {} } }, T1) === 'locked', 'kurser för team kräver Utbildning');
  const GOLD = JSON.parse(JSON.stringify(GT)); delete GOLD.teams; delete GOLD.teamSeq;
  for (const x of GOLD.staff) { delete x.trainGroup; delete x.xp; delete x.grown; delete x.lastGrow; delete x.growSkill; }
  GOLD.job = { kind: 'game', state: 'dev', crunch: false };
  for (let i = 0; i < 60; i++) { GOLD.t++; S.finishCourses(GOLD); S.teamsWeek(GOLD); S.growWeek(GOLD); }
  ok(S.teamsOf(GOLD).length === 0 && !S.teamsOpen({ ...GOLD, staff: GOLD.staff.slice(0, 2) }) && GOLD.staff.every((x) => Number.isFinite(x.design + x.xp)), 'en sparning från före teamen fortsätter som vanligt');
}
// självgående team: arbetsledare, uppdrag (uppföljare, expansion, nytt spel), erfarenhet och släpp
{
  const GA = S.newGame({ studio: 'A', seed: 51 }); S.makeCompetitors(GA); S.initWorld(GA);
  GA.t = 48 * 24; GA.money = 5e7; GA.fans = 80000; GA.office.tier = 4; GA.u.flags.training = true;
  GA.u.scopes = ['small', 'medium', 'large', 'aaa'];
  for (const x of ['fantasy', 'space']) if (!GA.u.topics.includes(x)) GA.u.topics.push(x);
  for (const x of ['rpg', 'action']) if (!GA.u.genres.includes(x)) GA.u.genres.push(x);
  for (let i = 0; i < 9; i++) { S.refreshCandidates(GA); GA.money += GA.candidates[0].fee; S.hire(GA, GA.candidates[0].id); }
  const mk = (id, title, score, age, extra = {}) => ({ id, title, platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'large', audience: 'everyone', score, total: 3e6, t: GA.t - age, tail: 1, priceAt: 30, weekly: [1], revenue: 5e6, units: 1e5, fansGained: 0, ended: true, chain: 1, insights: [], reviews: [], flags: [], ...extra });
  GA.games.push(mk(9101, 'Drakens Dal', 8.6, 90), mk(9102, 'Rymdbyggarna', 7.4, 60), mk(9103, 'Skräpet', 4.2, 40));
  GA.games.push(mk(9104, 'Onlinevärlden', 8, 50));
  S.launchLive(GA, GA.games[GA.games.length - 1], 'mmo');
  GA.games[GA.games.length - 1].live.subs = 200000; GA.games[GA.games.length - 1].live.pot = 250000;
  const T = S.createTeam(GA);
  T.autoTrain = false;
  const crew = GA.staff.filter((x) => !x.isFounder);
  for (const x of crew.slice(0, 2)) S.addMember(GA, T.id, x.id);
  ok(typeof S.startMission(GA, T.id, 'new') === 'string' && S.canMission(GA, T, 'new') === 'autoLocked', 'uppdrag kräver forskningen Självgående team');
  GA.u.flags.autoTeams = true; GA.u.flags.sequels = true;
  ok(S.canMission(GA, T, 'new') === 'smallMission', 'minst tre personer');
  S.addMember(GA, T.id, crew[2].id); S.addMember(GA, T.id, crew[3].id); S.addMember(GA, T.id, crew[4].id);
  ok(S.canMission(GA, T, 'new') === true && S.canMission(GA, T, 'sequel', 9101) === true && S.canMission(GA, T, 'expansion', 9104) === true, 'alla tre uppdragen går att starta');
  ok(S.canMission(GA, T, 'sequel', 9103) === 'base' && S.canMission(GA, T, 'expansion', 9101) === 'base', 'bara spel som gått bra får en uppföljare, bara onlinespel en expansion');
  const T2 = S.createTeam(GA);
  S.addMember(GA, T2.id, GA.staff[0].id);
  ok(S.canMission(GA, T2, 'new') === 'smallMission' || S.canMission(GA, T2, 'new') === 'founder', 'grundaren kan inte vara med');
  S.addMember(GA, T2.id, crew[5].id); S.addMember(GA, T2.id, crew[6].id);
  ok(S.canMission(GA, T2, 'new') === 'founder', 'grundaren behövs i studion');
  S.disbandTeam(GA, T2.id);
  // arbetsledare
  ok(S.leadOf(GA, T) === null && S.setLead(GA, T.id, crew[1].id) === true && S.leadOf(GA, T).id === crew[1].id && S.setLead(GA, T.id, crew[1].id) === true && S.leadOf(GA, T) === null, 'en arbetsledare utses och tas bort');
  const plan = S.planMission(GA, T, 'sequel', 9101);
  ok(plan.sequelOf === 9101 && plan.genre === 'rpg' && plan.topic === 'fantasy' && plan.title === 'Drakens Dal 2' && plan.platform === 'pc', 'en uppföljare ärver tema, genre och plattform och får nästa nummer');
  const pe = S.planMission(GA, T, 'expansion', 9104);
  ok(pe.expansionOf === 9104 && pe.title.startsWith('Onlinevärlden: ') && S.EXP_SCOPES.includes(pe.scope), 'en expansion får grundspelets namn och en tillåten storlek');
  const pn = S.planMission(GA, T, 'new');
  ok(pn.topic && pn.genre && pn.scope === 'medium' && pn.title, 'ett nytt spel får tema, genre, namn och en storlek som passar teamets fem');
  const q = S.missionQuote(GA, T, 'sequel', 9101);
  ok(q && q.cost > 0 && q.weeks > 0, 'uppdraget har en budget och en längd som visas i förväg');
  // starta
  const rng0 = GA.rng, mo = GA.money, w0 = S.workers(GA).length;
  ok(S.startMission(GA, T.id, 'sequel', 9101) === true && T.mission && GA.money === mo - q.cost, 'uppdraget startar och budgeten betalas');
  ok(S.leadOf(GA, T) !== null && T.members.every((id) => GA.staff.find((x) => x.id === id).away) && S.workers(GA).length === w0 - 5, 'teamet utser en ledare och är borta från spelarens projekt');
  ok(GA.rng === rng0, 'att planera och starta ett uppdrag rör inte slumpföljden');
  ok(S.canMission(GA, T, 'new') === 'onMission' && S.canTrainTeam(GA, T) === 'mission' && typeof S.addMember(GA, T.id, crew[7].id) === 'string' && typeof S.removeMember(GA, T.id, crew[3].id) === 'string', 'under ett uppdrag går teamet inte på kurs och kan inte ändras');
  ok(S.canTrain(GA, GA.staff.find((x) => x.id === crew[0].id)) === 'away', 'den som är ute på uppdrag kan inte skickas på enskild kurs');
  // framsteg
  const g0 = GA.games.length, xp0 = GA.staff.find((x) => x.id === crew[0].id).xp || 0;
  for (let i = 0; i < 40; i++) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  ok(S.missionProgress(T.mission) > 0 && S.missionProgress(T.mission) < 1 && S.missionWeeksLeft(T.mission) >= 1, 'uppdraget går framåt vecka för vecka');
  ok((GA.staff.find((x) => x.id === crew[0].id).xp || 0) !== xp0 || GA.staff.find((x) => x.id === crew[0].id).grown > 0, 'den som är ute på uppdrag lär sig av arbetet');
  let guard = 0;
  while (T.mission && guard++ < 4000) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  const made = GA.games.find((x) => x.auto === T.id);
  ok(!T.mission && GA.games.length === g0 + 1 && made && made.sequelOf === 9101 && made.score > 0 && made.team === 5, 'spelet släpps av teamet utan att spelaren gör något');
  ok(T.exp === 1 && T.best === made.score && T.games.includes(made.id) && S.samspel(T) === 1 && GA.news.some((n) => n.key === 'news.missionDone'), 'teamet får samspel och en nyhet om släppet');
  ok(GA.staff.every((x) => !x.away) && S.workers(GA).length === w0 && Number.isFinite(GA.money), 'alla är tillbaka i arbetet efteråt');
  for (let i = 0; i < 40; i++) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  ok(made.revenue > 0 && Number.isFinite(made.revenue), 'spelet säljer som vilket spel som helst');
  // expansion och nytt spel
  GA.games.find((x) => x.id === 9104).live.exps.length = 0;
  ok(S.startMission(GA, T.id, 'expansion', 9104) === true, 'en expansion kan startas');
  const l0 = GA.games.find((x) => x.id === 9104).live;
  guard = 0;
  while (T.mission && guard++ < 4000) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  const ex = GA.games.find((x) => x.expansionOf === 9104);
  ok(ex && ex.auto === T.id && l0.exps.includes(ex.id) && GA.news.some((n) => n.key === 'live.news.expansion'), 'expansionen släpps till onlinespelet');
  ok(S.samspel(T) === 2, 'samspelet växer för varje spel');
  // automatiskt nästa uppdrag och kurs mellan uppdragen
  T.repeat = true; T.autoTrain = false;
  const before = GA.games.length;
  guard = 0;
  while (GA.games.length < before + 2 && guard++ < 6000) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  ok(GA.games.length >= before + 2 && GA.games.filter((x) => x.auto === T.id).length >= 4, 'ett team som fortsätter själv tar nästa uppdrag och släpper fler spel');
  const nm = S.nextMission(GA, T);
  ok(['expansion', 'sequel', 'new'].includes(nm[0]), 'nästa uppdrag väljs av teamet');
  T.repeat = false; T.autoTrain = true;
  while (T.mission && guard++ < 9000) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); }
  for (let i = 0; i < 60 && !GA.staff.some((x) => x.trainGroup); i++) { for (let k = 0; k < 4; k++) { if (GA.pending.length) GA.pending.length = 0; S.stepTick(GA); } }
  ok(GA.staff.some((x) => x.trainGroup === 'T' + T.id && x.trainSkill), 'ett team utan uppdrag går själv en kurs när det är dags');
  // avbryta och lösa upp
  for (const x of GA.staff) { x.trainUntil = -1; x.trainSkill = null; x.trainGroup = null; x.lastTrain = -99; }
  ok(S.startMission(GA, T.id, 'new') === true && S.cancelMission(GA, T.id) === true && !T.mission && GA.staff.every((x) => !x.away), 'ett avbrutet uppdrag släpper medarbetarna');
  S.startMission(GA, T.id, 'new');
  ok(S.disbandTeam(GA, T.id) === true && GA.staff.every((x) => !x.away), 'att lösa upp teamet avbryter uppdraget');
  // för få kvar
  const T3 = S.createTeam(GA);
  const four = GA.staff.filter((x) => !x.isFounder).slice(0, 3);
  for (const x of four) S.addMember(GA, T3.id, x.id);
  S.startMission(GA, T3.id, 'new');
  GA.staff = GA.staff.filter((x) => x.id !== four[0].id && x.id !== four[1].id);
  S.teamsWeek(GA); S.missionWeek(GA);
  ok(!T3.mission && GA.news.some((n) => n.key === 'news.missionLost') && GA.staff.every((x) => !x.away), 'blir det för få kvar avbryts uppdraget med en nyhet');
  const GO2 = JSON.parse(JSON.stringify(GA)); delete GO2.teams;
  for (let i = 0; i < 20; i++) { GO2.t++; S.missionWeek(GO2); }
  ok(Number.isFinite(GO2.money), 'en sparning från före de självgående teamen fortsätter som vanligt');
}
const liveAgeOf = (W, gm) => (W.t - gm.live.t0 - (gm.live.reno || 0)) / 48;
// driftteam: ett team sköter ett levande onlinespel (färskare innehåll, färre avbrott, billigare uppdateringar, egna drag)
{
  const mkWorld = () => {
    const W = S.newGame({ studio: 'O', seed: 61 }); S.makeCompetitors(W); S.initWorld(W);
    W.t = 48 * 24; W.money = 5e7; W.fans = 80000; W.office.tier = 4; W.office.fac.server = { lvl: 3, slot: 0 };
    for (let i = 0; i < 9; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
    W.games.push({ id: 9201, title: 'Onlinevärlden', platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'large', audience: 'everyone', score: 8, total: 3e6, t: W.t - 48, tail: 1, priceAt: 30, weekly: [1], revenue: 5e6, units: 1e5, fansGained: 0, ended: true, chain: 1, insights: [], reviews: [], flags: [], hype: 40 });
    S.launchLive(W, W.games[W.games.length - 1], 'mmo');
    const L = W.games[W.games.length - 1].live;
    L.subs = 200000; L.pot = 260000; L.peak = 200000; L.regions = ['na']; L.boost = 0;
    return W;
  };
  const GO = mkWorld();
  const g = GO.games[GO.games.length - 1];
  const crew = GO.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(GO);
  for (const x of crew.slice(0, 5)) S.addMember(GO, T.id, x.id);
  ok(S.assignOps(GO, T.id, 9201) !== true && S.canOps(GO, T, 9201) === 'opsLocked', 'ett driftteam kräver forskningen Driftteam');
  GO.u.flags.opsTeams = true; GO.u.flags.training = true; GO.u.flags.autoTeams = true; GO.u.flags.sequels = true;
  GO.u.scopes = ['small', 'medium', 'large', 'aaa'];
  for (const x of ['rpg', 'action']) if (!GO.u.genres.includes(x)) GO.u.genres.push(x);
  ok(S.canOps(GO, T, 9999) === 'opsGame', 'bara ett levande onlinespel går att sköta');
  const T1 = S.createTeam(GO); S.addMember(GO, T1.id, crew[5].id);
  ok(S.canOps(GO, T1, 9201) === 'opsSmall', 'minst två personer');
  S.addMember(GO, T1.id, GO.staff[0].id);
  ok(S.canOps(GO, T1, 9201) === 'founder', 'grundaren kan inte vara med');
  S.disbandTeam(GO, T1.id);
  const need = S.opsNeed(GO, g);
  ok(need >= 3 && need <= 12 && S.opsNeed({ ...GO }, { live: { ...g.live, subs: 5e6 } }) > need, 'behovet växer med antalet spelare (' + need + ' personer)');
  GO.office.tier = 2;
  ok(!S.canHire(GO), 'huset är fullt innan teamet flyttar ut');
  GO.office.fac.server.lvl = 1;
  ok(S.canOps(GO, T, 9201) === 'noSeats' && S.seatCap(GO) === 3, 'ett team måste få plats i serverrummet');
  GO.office.fac.server.lvl = 3;
  const w0 = S.workers(GO).length;
  ok(S.assignOps(GO, T.id, 9201) === true && T.role === 'ops' && T.target === 9201 && T.members.every((id) => GO.staff.find((x) => x.id === id).away) && S.workers(GO).length === w0 - 5, 'teamet tar hand om spelet och är borta från dina projekt');
  ok(S.leadOf(GO, T) !== null && S.opsTeamOf(GO, 9201) === T, 'en arbetsledare utses');
  ok(S.outCount(GO) === 5 && S.seated(GO) === GO.staff.length - 5 && S.canHire(GO), 'teamet sitter utanför huset och skrivborden räcker till ersättare');
  GO.office.tier = 0;
  ok(typeof S.endOps(GO, T.id) === 'string' && T.role === 'ops' && typeof S.removeMember(GO, T.id, crew[0].id) === 'string', 'teamet kan inte komma tillbaka när det inte finns skrivbord åt dem');
  GO.office.tier = 4;
  const T2 = S.createTeam(GO); S.addMember(GO, T2.id, crew[6].id); S.addMember(GO, T2.id, crew[7].id);
  ok(S.canOps(GO, T2, 9201) === 'opsTaken', 'ett spel har bara ett driftteam');
  ok(S.canTrainTeam(GO, T) === 'role', 'ett driftteam går inte på kurs');
  ok(S.canMission(GO, T, 'new') === 'opsOnly' && S.canMission(GO, T, 'expansion', 9999) === 'opsOnly', 'ett driftteam bygger bara expansioner till sitt eget spel');
  S.disbandTeam(GO, T2.id);
  const eff1 = S.opsEff(GO, T, g);
  ok(eff1 > 0 && eff1 <= 1, 'effekten ligger mellan noll och ett (' + eff1.toFixed(2) + ')');
  const lone = S.createTeam(GO); S.addMember(GO, lone.id, crew[6].id);
  const effOf = (n) => { lone.members = crew.slice(6, 6 + n).map((x) => x.id); lone.role = 'ops'; lone.target = 9201; const v = S.opsEff(GO, lone, g); lone.role = null; return v; };
  ok(effOf(2) < effOf(4), 'fler händer ger större effekt');
  S.disbandTeam(GO, lone.id);
  // jämför med samma spel utan team under ett par år
  const CT = mkWorld();
  const cg = CT.games[CT.games.length - 1];
  const rng0 = GO.rng;
  S.opsWeek(GO);
  ok(GO.rng === rng0 && g.live.tm > 0, 'veckans räkning rör inte slumpföljden och sätter teamets effekt');
  const costTeam = S.livePatchCost(GO, g), costNone = S.livePatchCost(CT, cg);
  ok(costTeam < costNone, 'en uppdatering blir billigare med teamet (' + costTeam + ' mot ' + costNone + ')');
  let freshT = 0, freshC = 0, outT = 0, outC = 0;
  for (let i = 0; i < 96; i++) {
    for (const W of [GO, CT]) { W.t++; S.opsWeek(W); S.liveWeek(W); if (W.pending.length) W.pending.length = 0; }
    freshT += g.live.fresh; freshC += cg.live.fresh;
  }
  outT = g.live.outages; outC = cg.live.outages;
  ok(freshT > freshC * 1.3, 'innehållet är färskare med ett driftteam (' + Math.round(freshT / 96) + ' mot ' + Math.round(freshC / 96) + ')');
  ok(g.live.reno > 0 && !cg.live.reno && liveAgeOf(GO, g) < liveAgeOf(CT, cg), 'spelet åldras långsammare');
  ok(g.live.subs > cg.live.subs && Number.isFinite(GO.money) && Number.isFinite(g.live.rev), 'spelet har fler spelare med teamet (' + Math.round(g.live.subs) + ' mot ' + Math.round(cg.live.subs) + ')');
  ok(g.live.events > 0 && GO.news.some((n) => n.key === 'news.opsEvent'), 'teamet startar evenemang på egen hand');
  ok(S.rutin(T) >= 3 && T.opsW === 97, 'rutinen växer med åren (' + S.rutin(T) + ' av ' + S.RUTIN_MAX + ')');
  ok(g.live.regions.length > 1 && GO.news.some((n) => n.key === 'news.opsRegion'), 'teamet öppnar nya regioner när de lönar sig (' + g.live.regions.length + ')');
  ok(outT <= outC + 3, 'färre avbrott med teamet (' + outT + ' mot ' + outC + ')');
  // expansion på eget initiativ
  T.repeat = true; g.live.fresh = 40;
  S.opsWeek(GO);
  ok(T.mission && T.mission.kind === 'expansion' && T.mission.base === 9201, 'ett driftteam som fått det bygger en expansion när innehållet blivit gammalt');
  let guard = 0;
  while (T.mission && guard++ < 4000) { if (GO.pending.length) GO.pending.length = 0; S.stepTick(GO); }
  ok(!T.mission && T.role === 'ops' && T.members.every((id) => GO.staff.find((x) => x.id === id).away) && g.live.exps.length === 1, 'efter expansionen är teamet kvar ute på spelet');
  // byta uppgift
  ok(S.endOps(GO, T.id) === true && !T.role && GO.staff.every((x) => !x.away), 'teamet kan sluta sköta spelet och är då vanligt personal igen');
  ok(S.assignOps(GO, T.id, 9201) === true && S.removeMember(GO, T.id, crew[0].id) === true && !GO.staff.find((x) => x.id === crew[0].id).away, 'den som tas ur ett driftteam är tillbaka i arbetet');
  const T4 = S.createTeam(GO);
  ok(S.addMember(GO, T4.id, crew[1].id) === true && !GO.staff.find((x) => x.id === crew[1].id).away, 'den som flyttas till ett spelteam är tillbaka i arbetet');
  S.disbandTeam(GO, T4.id);
  // nedlagt spel
  S.closeLive(GO, 9201);
  S.opsWeek(GO);
  ok(!T.role && !T.target && GO.staff.every((x) => !x.away) && GO.news.some((n) => n.key === 'news.opsLost') && !g.live.tm, 'när spelet läggs ned blir teamet ledigt');
  // äldre sparningar
  const GOLD = JSON.parse(JSON.stringify(CT)); delete GOLD.teams;
  for (let i = 0; i < 20; i++) { GOLD.t++; S.opsWeek(GOLD); S.liveWeek(GOLD); }
  ok(Number.isFinite(GOLD.money) && !GOLD.games[GOLD.games.length - 1].live.tm, 'en sparning från före driftteamen fortsätter som vanligt');
}
// produktteam: ett litet team med arbetsledare tar hand om en hårdvarulinje (underhåll, revisioner, nästa generation)
{
  const GP = S.newGame({ studio: 'P', seed: 71 }); S.makeCompetitors(GP); S.initWorld(GP);
  GP.t = 48 * 17; GP.money = 3e8; GP.fans = 60000; GP.office.tier = 4;
  for (let i = 0; i < 8; i++) { S.refreshCandidates(GP); GP.money += GP.candidates[0].fee; S.hire(GP, GP.candidates[0].id); }
  Object.assign(GP.u.flags, { hw: true, hw_sound: true, hw_gpu: true, hw_pc: true, hw_driver: true, training: true });
  GP.t++; S.hwWeek(GP);
  const H = GP.hw;
  const spec = { type: 'gpu', cls: 'mid', qual: 'normal' };
  S.startDesign(GP, spec);
  const J = H.projects[0];
  for (let i = 0; i < 80 && J.state === 'design'; i++) { GP.t++; S.hwWeek(GP); }
  if (J.state === 'fail') S.resolveProto(GP, J.id, 'ship');
  S.launch(GP, J.id, { partner: 'halden', price: S.suggestPrice('gpu', 'mid'), units: 6000 });
  const P = H.products[0];
  for (let i = 0; i < 12 && P.state === 'prod'; i++) { GP.t++; S.hwWeek(GP); }
  const crew = GP.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(GP);
  for (const x of crew.slice(0, 3)) S.addMember(GP, T.id, x.id);
  ok(S.canHwTeam(GP, T, 'gpu') === 'hwLocked' && typeof S.assignHw(GP, T.id, 'gpu') === 'string', 'ett produktteam kräver forskningen Produktteam');
  GP.u.flags.hwTeams = true;
  ok(S.canHwTeam(GP, T, 'cpu') === 'hwType' && S.canHwTeam(GP, T, 'sound') === 'hwNone' && S.canHwTeam(GP, T, 'gpu') === true, 'bara en öppen typ där du gjort en produkt går att ta hand om');
  ok(S.hwLines(GP).join() === 'gpu', 'linjerna är de typer du har produkter i');
  const lone = S.createTeam(GP); S.addMember(GP, lone.id, crew[3].id);
  ok(S.canHwTeam(GP, lone, 'gpu') === 'opsSmall', 'minst två personer');
  S.disbandTeam(GP, lone.id);
  const GC = JSON.parse(JSON.stringify(GP));
  const w0 = S.workers(GP).length;
  ok(S.assignHw(GP, T.id, 'gpu') === true && T.role === 'hw' && T.target === 'gpu' && T.members.every((id) => GP.staff.find((x) => x.id === id).away) && S.workers(GP).length === w0 - 3 && S.leadOf(GP, T) !== null, 'teamet tar hand om linjen och har en arbetsledare');
  ok(S.outCount(GP) === 3 && S.seatCap(GP) === 3 && typeof S.addMember(GP, T.id, crew[3].id) === 'string' && T.members.length === 3, 'teamet sitter i hårdvarulabbet och en fjärde får inte plats');
  const T2 = S.createTeam(GP); S.addMember(GP, T2.id, crew[4].id); S.addMember(GP, T2.id, crew[5].id);
  ok(S.canHwTeam(GP, T2, 'gpu') === 'hwTaken' && S.canTrainTeam(GP, T) === 'role' && S.canMission(GP, T, 'new') !== true, 'en linje har ett team, och ett produktteam går varken kurs eller gör spel');
  S.disbandTeam(GP, T2.id);
  const eff = S.hwEff(GP, T, 'gpu');
  ok(eff > 0.3 && eff <= 1 && S.hwEff(GP, T, 'console') < eff, 'effekten beror på linjens behov (' + eff.toFixed(2) + ')');
  const rng0 = GP.rng;
  T.autoRev = false;
  S.hwTeamWeek(GP);
  ok(GP.rng === rng0 && P.te > 0 && P.mt > 0, 'veckans räkning rör inte slumpföljden och sätter teamets effekt på produkten');
  const PC = GC.hw.products[0];
  for (let i = 0; i < 40; i++) for (const W of [GP, GC]) { W.t++; S.hwWeek(W); S.hwTeamWeek(W); if (W.pending.length) W.pending.length = 0; }
  ok(S.relPerf(GP, P) > S.relPerf(GC, PC) && P.mt > 5, 'produkten åldras långsammare med teamet (' + S.relPerf(GP, P).toFixed(3) + ' mot ' + S.relPerf(GC, PC).toFixed(3) + ')');
  ok(P.compat > PC.compat && P.compat <= S.drvMax(P), 'spelstödet förbättras utan kostnad (' + P.compat.toFixed(1) + ' mot ' + PC.compat.toFixed(1) + ')');
  ok(S.revCost(GP, P, 'pro') < S.revCost(GC, PC, 'pro'), 'en revision blir billigare med teamet');
  T.autoRev = true;
  for (let i = 0; i < 120 && !(P.revs && P.revs.length); i++) { GP.t++; S.hwWeek(GP); S.hwTeamWeek(GP); if (GP.pending.length) GP.pending.length = 0; }
  ok((P.revs && P.revs.length > 0 || P.up) && GP.news.some((n) => n.key === 'news.hwTeamRev'), 'teamet startar en revision av sig självt när produkten tappat mot marknaden');
  T.autoRev = false;
  // nästa generation
  ok(!H.projects.some((p) => p.team === T.id), 'utan inställningen tar teamet inte fram en efterföljare');
  T.repeat = true;
  let guard = 0;
  while (!H.projects.some((p) => p.team === T.id) && !H.products.some((p) => p.team === T.id) && guard++ < 400) { GP.t++; S.hwWeek(GP); S.hwTeamWeek(GP); if (GP.pending.length) GP.pending.length = 0; }
  const J2 = H.projects.find((p) => p.team === T.id) || H.products.find((p) => p.team === T.id);
  ok(J2 && GP.news.some((n) => n.key === 'news.hwTeamDesign'), 'teamet börjar designa nästa generation själv');
  ok(!H.projects.some((p) => p.team === T.id) || (H.projects.find((p) => p.team === T.id).tq > 0 && H.projects.find((p) => p.team === T.id).budget < S.designCost(GP, spec)), 'projektet blir billigare och får teamets effekt');
  guard = 0;
  while (!H.products.some((p) => p.team === T.id && p.state === 'market') && guard++ < 400) { GP.t++; S.hwWeek(GP); S.hwTeamWeek(GP); if (GP.pending.length) GP.pending.length = 0; }
  const P2 = H.products.find((p) => p.team === T.id);
  ok(P2 && P2.state === 'market' && P2.gen === P.gen + 1 && P2.auto, 'den nya generationen designas, lanseras och säljer (gen ' + (P2 && P2.gen) + ')');
  for (let i = 0; i < 70; i++) { GP.t++; S.hwWeek(GP); S.hwTeamWeek(GP); if (GP.pending.length) GP.pending.length = 0; }
  ok(P.state === 'ended' || !P.auto, 'den gamla modellen trappas ned');
  ok(Number.isFinite(GP.money) && Number.isFinite(P2.rev) && P2.rev > 0, 'den nya modellen säljer och kassan är hel');
  ok(S.hwRutin(T) >= 1 && T.hwW > 100, 'rutinen växer');
  ok(S.endHw(GP, T.id) === true && !T.role && GP.staff.every((x) => !x.away), 'teamet kan sluta och är då vanlig personal igen');
  const GOLD = JSON.parse(JSON.stringify(GC)); delete GOLD.teams;
  for (let i = 0; i < 20; i++) { GOLD.t++; S.hwWeek(GOLD); S.hwTeamWeek(GOLD); }
  ok(Number.isFinite(GOLD.money) && GOLD.hw.products.every((x) => !x.te), 'en sparning från före produktteamen fortsätter som vanligt');
}
// förlag: pitchar kommer ur fröet, förskott vid underskrift, två avtal åt gången, spelet släpps med ett betyg i intervallet
{
  const GB = S.newGame({ studio: 'F', seed: 12 }); S.makeCompetitors(GB); S.initWorld(GB);
  GB.t = 48 * 15; GB.money = 2e7; GB.fans = 50000;
  S.pubWeek(GB);
  ok(!GB.pub, 'förlaget kräver forskning');
  GB.u.flags.publish = true;
  const rng0 = GB.rng;
  for (let i = 0; i < 20; i++) { GB.t++; S.pubWeek(GB); }
  const P = GB.pub;
  ok(P && P.pitches.length >= 2 && P.pitches.every((p) => p.lo <= p.q && p.q <= p.hi && p.advance > 0), 'pitchar med demointervall och förskott (' + P.pitches.length + ')');
  ok(GB.rng === rng0, 'förlaget rör inte spelets slumpföljd');
  const [a, b] = P.pitches;
  const m0 = GB.money;
  ok(S.signPitch(GB, a.id) === true && GB.money === m0 - a.advance && S.signPitch(GB, b.id) === true, 'två avtal går att skriva på');
  GB.t++; S.pubWeek(GB); GB.t += 8; S.pubWeek(GB);
  const c = S.pubOf(GB).pitches[0];
  ok(!c || S.canSign(GB, c.id) === 'full', 'ett tredje avtal får vänta');
  ok(S.runCampaign(GB, a.id) === true && S.runCampaign(GB, a.id) === false, 'en kampanj per spel');
  for (let i = 0; i < 60; i++) { GB.t++; S.pubWeek(GB); }
  const d = S.pubOf(GB).deals.find((x) => x.id === a.id);
  ok(d.out && d.score === d.q && d.revenue > 0 && GB.stats.published >= 2, 'spelet släpps och säljer (' + Math.round(d.revenue) + ' på förskott ' + d.advance + ')');
  ok(Number.isFinite(S.labelProfit(GB)), 'förlagets resultat räknas');
}
// egen hårdvara: forskningen öppnar labbet, designen betalas per vecka, prototyp, lansering med första order, leverans i
// partnerns takt, försäljning, optimering för egna pc-spel, beslut, betyget åldras, nedläggning, chef och sparning
{
  const GH = S.newGame({ studio: 'H', seed: 21 }); S.makeCompetitors(GH); S.initWorld(GH);
  GH.t = 48 * 17; GH.money = 5e7;
  S.hwWeek(GH);
  ok(!GH.hw, 'hårdvaran kräver forskning');
  Object.assign(GH.u.flags, { hw: true, hw_sound: true, hw_gpu: true, hw_pc: true });
  const rng0 = GH.rng;
  GH.t++; S.hwWeek(GH);
  const H = GH.hw;
  ok(H && H.rep === S.REP0 && S.labSlots(H) === 1 && S.openTypes(GH).join() === 'sound,gpu,pc', 'labbet öppnas med en designplats och de forskade typerna');
  const spec = { type: 'gpu', cls: 'mid', qual: 'normal' };
  const cost = S.designCost(GH, spec), wk = S.designWeeks(GH, spec);
  ok(S.startDesign(GH, spec) === true && S.startDesign(GH, { type: 'sound', cls: 'mid' }) === 'slots', 'en design åt gången med en plats');
  ok(S.upgradeLab(GH) === true && S.labSlots(H) === 2 && S.startDesign(GH, { type: 'sound', cls: 'budget' }) === true, 'ett utbyggt labb tar två projekt');
  S.cancelDesign(GH, H.projects[1].id);
  const m0 = GH.money;
  GH.t++; S.hwWeek(GH);
  ok(Math.abs(m0 - GH.money - cost / wk) < 1, 'designen betalas per vecka');
  const J = H.projects[0];
  S.pauseDesign(GH, J.id, true); const d0 = J.done; GH.t++; S.hwWeek(GH);
  ok(J.done === d0 && H.projects.length === 1, 'ett pausat projekt står still, ett avbrutet är borta');
  S.pauseDesign(GH, J.id, false);
  for (let i = 0; i < wk + 2 && J.state === 'design'; i++) { GH.t++; S.hwWeek(GH); }
  if (J.state === 'fail') ok(S.resolveProto(GH, J.id, 'ship') === true && J.bad, 'en misslyckad prototyp kan skeppas ändå');
  ok(J.state === 'ready' && J.perf > 0.9 && J.perf < 1.12, 'prototypen är klar (prestanda ' + J.perf.toFixed(2) + ')');
  const m1 = GH.money;
  ok(S.launch(GH, J.id, { partner: 'halden', price: S.suggestPrice('gpu', 'mid'), units: 6000 }) === true, 'lansering med första order');
  const P = H.products[0];
  ok(P.state === 'prod' && H.orders.length === 1 && GH.money < m1 && P.cost === m1 - GH.money, 'ordern betalas direkt och produkten tillverkas');
  for (let i = 0; i < 10 && P.state === 'prod'; i++) { GH.t++; S.hwWeek(GH); }
  ok(P.state === 'market' && P.t - P.tReady === 6 && P.stock + P.sold <= 1251, 'ute när första leveransen kommer, i partnerns takt (' + Math.round(P.stock + P.sold) + ')');
  for (let i = 0; i < 30; i++) { GH.t++; S.hwWeek(GH); }
  ok(P.sold > 0 && P.rev > 0 && P.share > 0 && H.tot.rev === P.rev, 'produkten säljer (' + Math.round(P.sold) + ' st, andel ' + (P.share * 100).toFixed(1) + ' %)');
  const lo = S.targetShare(GH, P, P.price * 0.8), hi = S.targetShare(GH, P, P.price * 1.25);
  ok(lo > S.targetShare(GH, P) && hi < S.targetShare(GH, P), 'ett lägre pris tar större andel');
  ok(S.scoreOf(GH, P, GH.t + 96) < S.scoreOf(GH, P) - 0.5, 'betyget faller när produkten åldras');
  // mässan: visad hårdvara får större efterfrågan
  {
    const GE = JSON.parse(JSON.stringify(GH));
    GE.u.flags.expo = true;
    GE.money = 5e7;
    const PE = GE.hw.products.find((x) => x.id === P.id);
    ok(S.expoItems(GE).some((x) => x.k === 'hw' && x.id === P.id), 'hårdvara på marknaden går att visa på mässan');
    const b0 = PE.boost || 0;
    GE.pending.push({ type: 'expo', id: 7001 });
    ok(S.resolveExpo(GE, 7001, 3, ['hw:' + P.id]) === true && PE.boost > b0 && GE.expoLast.items[0].k === 'hw' && GE.expoLast.lines.some((l) => l.k === 'hw'), 'visad hårdvara får större efterfrågan');
    // flera produkter: varje får sitt eget antal provare efter styrka, och besökarsiffrorna skrivs med mellanslag
    const GE2 = JSON.parse(JSON.stringify(GH));
    GE2.u.flags.expo = true; GE2.money = 5e7;
    const P2 = JSON.parse(JSON.stringify(GE2.hw.products.find((x) => x.id === P.id)));
    P2.id = P.id + 1000; P2.name = 'Annan produkt'; P2.compat = 100; P2.defect = 0;
    GE2.hw.products.push(P2);
    GE2.pending.push({ type: 'expo', id: 7002 });
    const q1 = S.expoItems(GE2).find((x) => x.id === P.id).q, q2 = S.expoItems(GE2).find((x) => x.id === P2.id).q;
    ok(S.resolveExpo(GE2, 7002, 3, ['hw:' + P.id, 'hw:' + P2.id]) === true, 'två produkter på mässan');
    const hl = GE2.expoLast.lines.filter((l) => l.k === 'hw').map((l) => +l.n.replace(/\s/g, ''));
    ok(hl.length === 2 && (q1 === q2 ? hl[0] === hl[1] : hl[0] !== hl[1] && Math.sign(hl[0] - hl[1]) === Math.sign(q1 - q2)) && !/[KM]$/.test(GE2.expoLast.lines.find((l) => l.k === 'close').n), 'provarna fördelas efter styrka (q ' + q1.toFixed(2) + ' / ' + q2.toFixed(2) + ', ' + hl.join(' / ') + ') och besökare skrivs med mellanslag');
  }
  // en speldator med eget grafikkort på marknaden blir billigare
  ok(S.unitCost(GH, { type: 'pc', cls: 'mid', qual: 'normal', t: null }, 'halden') < S.unitCost(GH, { type: 'pc', cls: 'mid', qual: 'normal', t: null, parts: [] }, 'halden'), 'egna komponenter gör speldatorn billigare');
  GH.engines.push({ id: 999, name: 'E', feats: ['poly'], tech: 10, built: 1997 });
  P.opt = 999;
  const game = { id: 77, title: 'X', platform: 'pc', engineId: 999, score: 8.5, total: 1e6 };
  S.hwRelease(GH, game);
  ok(game.total > 1e6 && game.total <= 1.1e6 + 1 && P.boost > 0 && game.hwOpt.pct >= 1, 'pc-spel på den optimerade motorn säljer mer och lyfter produkten (+' + game.hwOpt.pct + ' %)');
  const g2 = { id: 78, title: 'Y', platform: 'hikari8', engineId: 999, score: 8, total: 1e6 };
  S.hwRelease(GH, g2);
  ok(g2.total === 1e6, 'konsolspel påverkas inte');
  P.issue = { kind: 'batch', units: 100, value: 10000, t: GH.t };
  const m2 = GH.money, r0 = H.rep;
  ok(S.resolveIssue(GH, P.id, 'recall') === true && GH.money === m2 - 10000 * S.RECALL && !P.issue && H.rep === r0 - 5, 'en återkallelse kostar och sänker ryktet');
  P.bench = 'offer';
  const s0 = S.scoreOf(GH, P);
  ok(S.resolveBench(GH, P.id, true) === true && Math.abs(S.scoreOf(GH, P) - s0 - 0.5) < 0.11, 'fusk i testerna höjer betyget ett tag');
  ok(S.setPrice(GH, P.id, S.stepPrice(P.price, -1)) === true && P.price < S.suggestPrice('gpu', 'mid'), 'priset går att sänka');
  ok(S.setPartner(GH, P.id, 'meridian') === true && S.relOf(GH, 'halden') === 50 + 2 - 5, 'ett partnerbyte skadar relationen (efter en levererad order)');
  ok(GH.rng === rng0, 'hårdvaran rör inte spelets slumpföljd');
  GH.staff.push(S.makeCandidate(GH, 1));
  const ch = S.chiefCandidates(GH)[0];
  const n0 = GH.staff.length;
  ok(S.setChief(GH, ch.id) === true && GH.staff.length === n0 - 1 && S.chiefPerf(GH) > 0 && S.recallChief(GH) === true && GH.staff.length === n0, 'en chef lämnar teamet och kan kallas hem');
  P.auto = false;
  S.orderMore(GH, P.id, 20000);
  ok(S.discontinue(GH, P.id) === true && P.state === 'ended' && P.stock === 0 && !H.orders.some((o) => o.p === P.id) && S.relOf(GH, 'meridian') === 40, 'nedläggning avbokar order och rear ut lagret');
  const GJ = JSON.parse(JSON.stringify(GH));
  ok(S.startDesign(GJ, { type: 'sound', cls: 'mid' }) === true, 'efter sparning går det att designa');
  for (let i = 0; i < 40; i++) { GJ.t++; S.hwWeek(GJ); }
  ok(Number.isFinite(GJ.money) && GJ.hw.projects.length + GJ.hw.products.length >= 2, 'hårdvaran fortsätter efter sparning');
}
// egna plattformar: en bärbar enhet blir en plattform med licens, vikt efter sålda enheter, licensintäkt, egna spel
// optimeras, plattformen följer med sparningen och försvinner med ett nytt spel
{
  const GP = S.newGame({ studio: 'P', seed: 23 }); S.makeCompetitors(GP); S.initWorld(GP);
  GP.t = 48 * 27; GP.money = 5e8; GP.fans = 200000;
  Object.assign(GP.u.flags, { hw: true, hw_lowpow: true, hw_handheld: true, hw_console: true, hw_devkit: true });
  GP.t++; S.hwWeek(GP);
  const H = GP.hw;
  ok(S.openTypes(GP).join() === 'handheld,console', 'forskningen öppnar bärbar enhet och konsol');
  ok(S.canDesign(GP, { type: 'handheld', cls: 'mid', arch: 'own' }) === 'locked', 'egen arkitektur i en plattform kräver systemkretsar');
  ok(S.startDesign(GP, { type: 'handheld', cls: 'mid', arch: 'std' }) === true, 'en bärbar enhet kan designas');
  const J = H.projects[0];
  J.done = J.weeks - 1;
  for (let i = 0; i < 3 && J.state === 'design'; i++) { GP.t++; S.hwWeek(GP); }
  if (J.state === 'fail') S.resolveProto(GP, J.id, 'redo');
  for (let i = 0; i < 40 && J.state === 'design'; i++) { GP.t++; S.hwWeek(GP); }
  ok(J.state === 'ready', 'prototypen är klar');
  ok(S.launch(GP, J.id, { partner: 'halden', units: 50000 }) === 'locked', 'monteringsfirman kan inte bygga en plattform');
  J.leak = true;
  ok(S.launch(GP, J.id, { partner: 'meridian', units: 20000 }) === true && H.orders[0].units === S.PLAT_MIN.handheld, 'lansering hos chipfabriken, med en första order över golvet för en plattform');
  const P = H.products[0];
  for (let i = 0; i < 20 && P.state === 'prod'; i++) { GP.t++; S.hwWeek(GP); }
  const id = P.plat;
  const pl = S.platOf(GP, P);
  ok(P.state === 'market' && pl && PLATFORM[id] === pl && PLATFORMS.includes(pl) && GP.licenses.includes(id) && S.platformOpen(GP, id), 'produkten blir en egen plattform med licens');
  {
    const a = S.targetShare(GP, P);
    const L = P.leakT;
    P.leakT = 0;
    const b = S.targetShare(GP, P);
    P.leakT = L;
    ok(L === P.t + 12 && P.boost > 0 && Math.abs(a / b - 0.9) < 1e-9, 'en läckt design får förhandsintresse men tappar andel de första veckorna');
  }
  for (let i = 0; i < 60; i++) { GP.t++; S.hwWeek(GP); }
  ok(P.base > 0 && pl.weight > 0 && pl.weight === Math.min(90, P.base / S.PER_WEIGHT), 'vikten följer den installerade basen (' + pl.weight.toFixed(1) + ')');
  ok(S.platRoyalty(GP, P) > 0 && P.lic > 0 && H.tot.lic === P.lic, 'andra förlag betalar licens');
  ok(S.platRoyalty(GP, P, 0.3) / 0.3 < S.platRoyalty(GP, P, 0.1) / 0.1 && S.supportOf(GP, P, 0.3) < S.supportOf(GP, P, 0.1), 'en högre avgift ger färre förlag');
  // exklusivitetsavtalet: ett obesvarat erbjudande går ut, ett påskrivet sänker priset och låser typen till partnern
  H.offer = { partner: 'meridian', type: 'handheld', t: GP.t };
  for (let i = 0; i < S.ISSUE_WEEKS; i++) { GP.t++; S.hwWeek(GP); }
  ok(!H.offer && !S.exclPartner(GP, 'handheld'), 'ett obesvarat erbjudande går ut');
  const u0 = S.unitCost(GP, P, 'meridian');
  H.offer = { partner: 'meridian', type: 'handheld', t: GP.t };
  ok(S.resolveOffer(GP, true) === true && S.exclPartner(GP, 'handheld') === 'meridian' && Math.abs(S.unitCost(GP, P, 'meridian') / u0 - 0.95) < 1e-9, 'avtalet ger 5 % lägre pris');
  ok(!S.partnerAllowed(GP, 'handheld', 'kaori') && S.setPartner(GP, P.id, 'kaori') === false && S.partnerAllowed(GP, 'console', 'kaori'), 'under avtalet går typen inte att flytta');
  ok(S.exclPartner(GP, 'handheld', GP.t + 3 * 48) === null, 'avtalet gäller i tre år');
  // patentstämningen: förlikningen kostar sitt belopp, en obesvarad stämning förliks
  const m0 = GP.money;
  H.suit = { t: GP.t, settle: 1000, loss: 4000 };
  ok(S.resolvePatent(GP, 'settle') === true && GP.money === m0 - 1000 && !H.suit, 'en förlikning kostar sitt belopp');
  const m1 = GP.money;
  H.suit = { t: GP.t, settle: 1000, loss: 4000 };
  S.resolvePatent(GP, 'trial');
  ok([m1, m1 - 4000].includes(GP.money), 'en rättegång kostar inget eller domen');
  // konsolens digitala butik: med en egen butik går en del av andra förlags försäljning dit i stället för licensen
  const r0 = S.platRoyalty(GP, P);
  ok(S.digitalOf(GP) === 0 && S.platStore(GP) === 0, 'utan butik går allt genom licensen');
  GP.u.flags.store = true;
  S.storeWeek(GP);
  const d = S.digitalOf(GP);
  ok(d > 0.1 && d < 0.3 && Math.abs(S.platRoyalty(GP, P) - r0 * (1 - d)) < 1e-6 && S.platDigital(GP, P) > 0 && S.platRoyalty(GP, P) + S.platDigital(GP, P) > r0, 'med butiken ger den digitala delen butikens del (' + Math.round(d * 100) + ' %)');
  S.storeWeek(GP);
  ok(GP.store.tot.plat > 0 && Math.abs(GP.store.tot.plat - 2 * S.platStore(GP)) < 1e-6, 'butiken bokför plattformens digitala del');
  ok(S.hwReach(GP) > 0, 'plattformens spelare ökar butikens räckvidd');
  GP.engines.push({ id: 991, name: 'E', feats: ['poly'], tech: 50, built: S.yearOf(GP.t) });
  ok(S.ownPlatOpt(GP, { platform: id, engineId: 991 }) && !S.ownPlatOpt(GP, { platform: 'pc', engineId: 991 }) && S.engineCap(GP, { platform: id, engineId: 991 }) > 1.4, 'egna spel med ny motor optimeras för plattformen');
  // koncernen: ett integrerat dotterbolag släpper ibland exklusivt på den egna plattformen när den är stor nog
  {
    const c = GP.comps[0];
    Object.assign(c, { owned: true, ownedT: GP.t, sub: { mode: 'int', budget: 1, integ: 1, staff: 40, ceo: null, inv: 0, done: true } });
    const w0 = pl.weight;
    pl.weight = 90;
    const n0 = GP.market.releases.length;
    for (let i = 0; i < 40; i++) { GP.t++; S.releaseComp(GP, c); }
    const fp = GP.market.releases.slice(n0).filter((r) => r.platform === id);
    ok(fp.length > 0 && S.ownGames(GP, P) >= fp.length, 'ett integrerat dotterbolag släpper förstapartsspel på plattformen (' + fp.length + ' av 40)');
    pl.weight = 0.5;
    const n1 = GP.market.releases.length;
    for (let i = 0; i < 40; i++) { GP.t++; S.releaseComp(GP, c); }
    ok(!GP.market.releases.slice(n1).some((r) => r.platform === id), 'en liten plattform får inga förstapartsspel');
    pl.weight = w0;
    c.owned = false;
    c.sub = null;
  }
  // köpta exklusiva spel: ett annat förlags nästa spel släpps bara på plattformen, mot en avgift
  {
    const c = GP.comps[1];
    c.next ||= { topic: GP.u.topics[0], genre: GP.u.genres[0] };
    c.nextT = GP.t + 10;
    GP.market.releases.push({ id: 9901, t: GP.t - 20, comp: c.id, studio: c.name, title: 'X', score: 7, total: 5e6, platform: 'pc', genre: c.next.genre, topic: c.next.topic, tail: 1 });
    const w0 = pl.weight;
    pl.weight = 5;
    ok(S.exclOffers(GP, P).includes(c) && S.canBuyExcl(GP, P, c) === 'small', 'en liten plattform kan inte köpa exklusiva spel');
    pl.weight = 40;
    const m0 = GP.money;
    const price = S.exclPrice(GP, c);
    ok(price > 0 && S.buyExclusive(GP, P.id, c.id) === true && Math.abs(GP.money - (m0 - price)) < 1 && c.buyEx && S.boughtFor(GP, P).includes(c) && !S.exclOffers(GP, P).includes(c), 'ett förlags nästa spel köps som exklusivt (' + price + ')');
    S.releaseComp(GP, c);
    const rel = GP.market.releases[GP.market.releases.length - 1];
    ok(rel.comp === c.id && rel.platform === id && rel.ex && P.bx === 1 && !c.buyEx && S.exSales(GP, id) > 0, 'spelet kommer ut på plattformen och ger licensavgift');
    const c2 = GP.comps[2];
    c2.buyEx = { plat: id, t: GP.t, price: 1000 };
    P.state = 'ended';
    const m1 = GP.money;
    ok(S.boughtPlatform(GP, c2) === null && GP.money === m1 + 500 && !c2.buyEx, 'en nedlagd plattform ger tillbaka hälften');
    P.state = 'market';
    // förlaget köps efter avtalet men före släppet: spelet kommer ändå ut exklusivt på din plattform
    const c3 = GP.comps.find((x) => !x.owned && x !== c && x !== c2);
    c3.next ||= { topic: GP.u.topics[0], genre: GP.u.genres[0] };
    c3.buyEx = { plat: id, t: GP.t, price: 1000 };
    Object.assign(c3, { owned: true, ownedT: GP.t, paid: 1, subRev: 0, sub: null });
    S.releaseComp(GP, c3);
    const r3 = GP.market.releases[GP.market.releases.length - 1];
    ok(r3.comp === c3.id && r3.platform === id && r3.ex && !c3.buyEx, 'ett köpt exklusivt spel håller även när förlaget köps före släppet');
    c3.owned = false;
    pl.weight = w0;
  }
  const b0 = P.boost || 0;
  S.hwRelease(GP, { id: 501, title: 'Z', platform: id, score: 8.5, total: 1e6, t: GP.t });
  ok(P.boost > b0 && P.games === 1, 'ett eget hit på plattformen säljer fler enheter');
  const GQ = importCode(exportCode(GP));
  ok(GQ && PLATFORM[id] === GQ.hw.plats[0] && PLATFORMS.filter((p) => p.own).length === 1, 'plattformen följer med sparningen');
  for (let i = 0; i < 8; i++) { GQ.t++; S.hwWeek(GQ); }
  ok(GQ.hw.plats[0].weight >= pl.weight && PLATFORM[id] === GQ.hw.plats[0], 'efter laddning växer den laddade plattformen');
  ok(S.discontinue(GQ, GQ.hw.products[0].id) === true && GQ.hw.plats[0].y1 < 2100 && S.platformOpen(GQ, id), 'en nedlagd plattform tonar ut men går att släppa spel på ett tag');
  S.newGame({ seed: 1 });
  ok(!PLATFORM[id] && !PLATFORMS.some((p) => p.own), 'ett nytt spel har inga egna plattformar');
}
// VR-headset: VR-forskningen öppnar typen och headsetet blir en egen VR-plattform med VR-spelens styrkor
{
  const GV = S.newGame({ studio: 'V', seed: 31 }); S.makeCompetitors(GV); S.initWorld(GV);
  GV.t = 48 * 37; GV.money = 5e8; GV.fans = 200000;
  Object.assign(GV.u.flags, { hw: true, hw_lowpow: true, hw_handheld: true, hw_vr: true });
  GV.t++; S.hwWeek(GV);
  ok(S.openTypes(GV).join() === 'handheld,vr', 'forskningen öppnar VR-headsetet');
  ok(S.startDesign(GV, { type: 'vr', cls: 'mid', arch: 'std' }) === true, 'ett VR-headset kan designas');
  const J = GV.hw.projects[0];
  J.done = J.weeks - 1;
  for (let i = 0; i < 60 && J.state !== 'ready'; i++) { GV.t++; S.hwWeek(GV); if (J.state === 'fail') S.resolveProto(GV, J.id, 'ship'); }
  ok(J.state === 'ready' && S.launch(GV, J.id, { partner: 'meridian', units: 1000 }) === true && GV.hw.orders[0].units === S.PLAT_MIN.vr, 'headsetet lanseras med en första order för en plattform');
  const P = GV.hw.products[0];
  for (let i = 0; i < 20 && P.state === 'prod'; i++) { GV.t++; S.hwWeek(GV); }
  const pl = S.platOf(GV, P);
  ok(P.state === 'market' && pl.kind === 'vr' && pl.bias.simulation > 1 && pl.bias.strategy < 1 && S.ownPlatFor(GV, 'vr') === pl && pl.tier >= PLATFORM.lumen.tier - 1, 'headsetet blir en egen VR-plattform (generation ' + pl.tier + ')');
  for (let i = 0; i < 48; i++) { GV.t++; S.hwWeek(GV); }
  ok(P.sold > 0 && P.base > 0 && pl.weight > 0, 'headsetet säljer (' + Math.round(P.sold) + ' enheter, vikt ' + pl.weight.toFixed(1) + ')');
}
// VR-spel: en VR-plattform vill ha motordelen VR-rendering (annars sjunker betyget), andra plattformar bryr sig inte
{
  const GR = S.newGame({ studio: 'R', seed: 5 });
  GR.engines.push({ id: 1, name: 'A', feats: ['poly'], tech: 60, built: 2015 }, { id: 2, name: 'B', feats: ['poly', 'vr'], tech: 60, built: 2015 });
  ok(S.vrFit(GR, 'lumen', 1) === -1 && S.vrFit(GR, 'lumen', null) === -1 && S.vrFit(GR, 'lumen', 2) === 1 && S.vrFit(GR, 'pc', 1) === 0 && S.VR_MISSING < 1 && S.VR_HAS > 1, 'VR-plattformen vill ha VR-rendering i motorn');
}
// egen fabrik: forskningen, bygget betalas direkt och tar sina veckor, sedan en tillverkare bland de andra (20 % billigare
// än Meridian, kort ledtid, inga förseningar), driften dras varje månad och utbyggnaden höjer kapaciteten
{
  const GF = S.newGame({ studio: 'F', seed: 41 }); S.makeCompetitors(GF); S.initWorld(GF);
  GF.t = 48 * 30; GF.money = 5e8; GF.fans = 100000;
  Object.assign(GF.u.flags, { hw: true, hw_gpu: true });
  GF.t++; S.hwWeek(GF);
  const H = GF.hw;
  ok(S.canBuildFab(GF) === 'locked' && !S.partnerOpen(GF, S.FAB) && S.fabLvl(GF) === 0, 'fabriken kräver forskningen');
  GF.u.flags.hw_fab = true;
  const m0 = GF.money;
  const c = S.fabCost(GF);
  ok(c > 0 && S.buildFab(GF) === true && GF.money === m0 - c && S.canBuildFab(GF) === 'busy' && !S.partnerOpen(GF, S.FAB), 'bygget betalas direkt (' + (c / 1e6).toFixed(1) + ' M$)');
  for (let i = 0; i < S.FAB_WEEKS[1]; i++) { GF.t++; S.hwWeek(GF); }
  ok(S.fabLvl(GF) === 1 && S.partnerOpen(GF, S.FAB) && Math.abs(S.partnerCap(GF, S.FAB) * 48 - S.FAB_CAP[1]) < 1, 'fabriken blir klar efter byggtiden');
  const D = { type: 'gpu', cls: 'mid', qual: 'normal', t: null };
  ok(Math.abs(S.unitCost(GF, D, S.FAB) / S.unitCost(GF, D, 'meridian') - 0.8) < 1e-9, 'fabriken tillverkar 20 % billigare än Meridian');
  ok(S.startDesign(GF, { type: 'gpu', cls: 'mid' }) === true, 'ett grafikkort designas');
  const J = H.projects[0];
  J.done = J.weeks - 1;
  for (let i = 0; i < 40 && J.state !== 'ready'; i++) { GF.t++; S.hwWeek(GF); if (J.state === 'fail') S.resolveProto(GF, J.id, 'ship'); }
  ok(S.suggestPartner(GF, J) === S.FAB, 'förslaget blir den egna fabriken när kapaciteten räcker');
  ok(S.launch(GF, J.id, { partner: S.FAB, units: 20000 }) === true && H.orders[0].at === GF.t + 4 && H.orders[0].partner === S.FAB, 'lansering i egen fabrik med fyra veckors ledtid');
  const P = H.products[0];
  for (let i = 0; i < 12; i++) { GF.t++; S.hwWeek(GF); }
  ok(P.state === 'market' && P.sold > 0 && S.fabLoad(GF) > 0, 'produkten kommer ut och fabriken har last');
  ok(H.tot.fab - c > S.fabUpkeep(GF) * 2 && S.hwCostMonth(GF) >= S.fabUpkeep(GF) && S.hwNet(GF) < -c, 'driften dras varje månad (' + Math.round((H.tot.fab - c) / 1000) + ' k$)');
  ok(S.buildFab(GF) === true, 'fabriken byggs ut');
  for (let i = 0; i < S.FAB_WEEKS[2]; i++) { GF.t++; S.hwWeek(GF); }
  ok(S.fabLvl(GF) === 2 && Math.abs(S.partnerCap(GF, S.FAB) * 48 - S.FAB_CAP[2]) < 1, 'utbyggnaden höjer kapaciteten');
  const GL = JSON.parse(JSON.stringify(GF));
  for (let i = 0; i < 12; i++) { GL.t++; S.hwWeek(GL); }
  ok(S.fabLvl(GL) === 2 && Number.isFinite(GL.money), 'fabriken följer med sparningen');
}
// topplista, skivor och rekord: listplatsen följer topplistan, skivor delas ut vid trösklarna (porteringar inräknade),
// bara studions finaste skiva firas, rekorden byter ägare, en äldre sparning får sina skivor utan nyheter och
// inget av det rör pengar eller fans
{
  const GC = S.newGame({ studio: 'C', seed: 21 });
  S.makeCompetitors(GC); S.initWorld(GC);
  GC.t = 48 * 12;
  const mk = (id, score, week, units) => ({ id, title: 'C' + id, t: GC.t - 1, score, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'medium', weekly: [week], units, revenue: week, total: week * 8, priceAt: 30, tail: 1, ended: false, fansGained: 0, ports: [] });
  const certs = [];
  const { on } = await import('../src/core/bus.js');
  on('cert', (c) => certs.push(c));
  ok(S.certIndex(9999) === -1 && S.certIndex(10000) === 0 && S.certIndex(499999) === 1 && S.certIndex(2e6) === 3, 'trösklarna för silver, guld, platina och diamant');
  // en äldre sparning: spelen har redan sålt, skivorna sätts utan nyheter
  GC.games.push(Object.assign(mk(1, 7, 100, 150000), { ended: true }), Object.assign(mk(4, 6, 50, 900), { ended: true }));
  const n0 = GC.news.length;
  S.chartWeek(GC);
  ok(GC.flags.charts === 1 && GC.games[0].cert === 1 && GC.stats.bestCert === 1 && !certs.length && !GC.news.some((n) => n.key === 'news.cert') && GC.news.length >= n0, 'en äldre sparning får sina skivor i tysthet');
  // ett nytt spel som säljer mer än alla andra går in som etta
  const big = mk(2, 9, 5e8, 20000);
  GC.games.push(big);
  const m0 = GC.money, f0 = GC.fans;
  S.chartWeek(GC);
  ok(big.chart && big.chart.best === 1 && big.chart.top === 1 && big.chart.weeks === 1 && GC.stats.no1 === 1 && GC.news.some((n) => n.key === 'news.chartTop'), 'en storsäljare går in som etta på topplistan');
  ok(big.cert === 0 && certs.length === 1 && certs[0].big === false && certs[0].cert.id === 'silver', 'en lägre skiva än studions finaste noteras utan firande');
  ok(GC.news.some((n) => n.key === 'news.recWeek') && big.recWeek === 1 && GC.stats.recWeek === 5e8, 'bästa första veckan blir ett rekord');
  ok(GC.money === m0 && GC.fans === f0, 'listan och skivorna rör inte pengar eller fans');
  // spelet säljer vidare (porteringen räknas med): guld, platina och till sist studions mest sålda
  big.weekly.push(1e8);
  big.ports.push({ platform: 'nova32', units: 480000, revenue: 0, weekly: [], ended: true });
  S.chartWeek(GC);
  ok(big.cert === 2 && certs[certs.length - 1].big === true && GC.stats.bestCert === 2 && S.certOf(big).id === 'platinum', 'porteringens exemplar räknas och den finaste skivan firas');
  ok(GC.stats.recUnits === big.id && GC.news.some((n) => n.key === 'news.recUnits'), 'studions mest sålda spel byter ägare');
  ok(big.chart.weeks === 2 && big.chart.top === 2 && GC.news.filter((n) => n.key === 'news.chartTop').length === 1, 'veckorna på listan räknas och ettan firas en gång');
  const nx = S.nextCert(big);
  ok(nx && nx.cert.id === 'diamond' && Math.round(nx.left) === 2e6 - 500000 && S.certCounts(GC).join() === '0,1,1,0' && S.discs(GC, 1) === 2 && S.discs(GC) === 2, 'nästa skiva och hyllans antal');
  const R = S.records(GC);
  ok(R.score === big && R.units === big && R.week === big && R.top === big, 'studions rekord räknas ur spellistan');
  // ett spel utanför listan får ingen placering
  const small = mk(3, 5, 0, 10);
  GC.games.push(small);
  S.chartWeek(GC);
  ok(!small.chart && small.cert === undefined, 'ett spel som inte säljer hamnar utanför listan');
  S.checkAchievements(GC);
  ok(GC.ach.includes('chart1') && GC.ach.includes('disc_gold') && GC.ach.includes('disc_platinum') && !GC.ach.includes('disc_diamond'), 'prestationer för listetta och skivor');
  // branschrankningen: spelförsäljningen senaste året, dotterbolag räknas till ägaren, årets plats sparas
  {
    const rk0 = S.studioRanking(GC);
    const me0 = rk0.find((r) => r.you);
    ok(rk0.length === GC.comps.length + 1 && me0.pos === 1 && me0.rev === 6e8 + 150 && Math.abs(rk0.reduce((a, r) => a + r.share, 0) - 1) < 1e-9, 'din studio står i rankningen efter årets spelförsäljning');
    const cA = GC.comps[0], cB = GC.comps[1];
    const rel = (c, total) => GC.market.releases.push({ id: GC.uid++, t: GC.t - 3, comp: c.id, studio: c.name, color: c.color, title: { sv: 'R', en: 'R' }, score: 8, total, platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'large', price: 30, tail: 1 });
    rel(cA, 3e10); rel(cB, 1e8);
    const rk1 = S.studioRanking(GC);
    ok(rk1[0].id === cA.id && S.studioRank(GC).pos === 2 && rk1[0].rev > 0 && rk1[0].rev < 3e10 * S.catalogOf(cA), 'en konkurrent som säljer mer går förbi (bara veckorna som gått räknas)');
    // förlagen räknas med hela sin katalog, och ett starkare förlag har en bredare
    const s0 = cB.strength;
    const r0 = rk1.find((r) => r.id === cB.id).rev;
    cB.strength = s0 + 0.4;
    const b0 = S.backlistOf(GC, { strength: s0 });
    ok(S.catalogOf(cB) > S.catalogOf({ strength: s0 }) && b0 > 0 && S.backlistOf(GC, cB) > b0 && Math.abs((S.studioRanking(GC).find((r) => r.id === cB.id).rev - S.backlistOf(GC, cB)) / (r0 - b0) - S.catalogOf(cB) / S.catalogOf({ strength: s0 })) < 1e-9, 'ett starkare förlag räknas med en bredare katalog, och alla har äldre titlar som säljer');
    cB.strength = s0;
    // onlinespelens intäkter under året räknas till din försäljning (summan nu minus summan vid årets början)
    const lg = GC.games[0];
    const meA = S.studioRank(GC).rev;
    lg.live = { t0: GC.t - 200, rev: 5000, closed: 1, hist: [{ t: GC.t - 60, v: 1, r: 1000 }, { t: GC.t - 40, v: 1, r: 3000 }] };
    ok(Math.abs(S.studioRank(GC).rev - meA - 4000) < 1e-6, 'onlinespelens intäkter under året räknas med');
    lg.live.t0 = GC.t - 10;
    lg.live.hist = [{ t: GC.t - 4, v: 1, r: 2000 }];
    ok(Math.abs(S.studioRank(GC).rev - meA - 5000) < 1e-6, 'ett onlinespel som släpptes under året räknas från starten');
    delete lg.live;
    const y0 = S.rankYear(GC);
    ok(GC.ranks.length === 1 && GC.ranks[0].pos === 2 && y0.prev === null && !GC.stats.topStudio && GC.ranks[0].near === cA.name && GC.ranks[0].gap === Math.round(rk1[0].rev - S.studioRank(GC).rev), 'årets plats sparas med avståndet till studion framför');
    cA.owned = true;
    const rk2 = S.studioRanking(GC);
    ok(rk2.length === GC.comps.length && S.studioRank(GC).pos === 1 && S.studioRank(GC).rev > me0.rev, 'ett dotterbolags försäljning räknas till dig');
    const y1 = S.rankYear(GC);
    ok(y1.prev.pos === 2 && y1.now.pos === 1 && GC.stats.topStudio === S.yearOf(GC.t) - 1 && GC.news.some((n) => n.key === 'news.rankTop'), 'första året som störst blir en nyhet');
    S.rankYear(GC);
    ok(GC.news.filter((n) => n.key === 'news.rankTop').length === 1 && GC.ranks.length === 3, 'nyheten kommer bara första gången');
    cA.owned = false;
    S.checkAchievements(GC);
    ok(GC.ach.includes('top_studio') && !GC.ach.includes('top_decade'), 'prestationen för störst i branschen');
  }
  // stegen: en ny bästa plats blir en nyhet med studion du gick om, och en plats du redan haft firas inte igen
  {
    delete GC.stats.bestRank;
    const n0 = GC.news.length;
    S.rankMonth(GC);
    ok(GC.stats.bestRank === Math.min(S.studioRank(GC).pos, ...GC.ranks.map((r) => r.pos)) && GC.news.length === n0, 'en äldre sparning börjar på sin bästa plats utan nyheter');
    GC.stats.bestRank = 5;
    const ups = () => GC.news.filter((n) => n.key === 'news.rankUp').length;
    const u0 = ups();
    S.rankMonth(GC);
    const up = GC.news.find((n) => n.key === 'news.rankUp');
    const rows = S.studioRanking(GC);
    const me = rows.find((r) => r.you);
    ok(up && me.pos < 5 && up.vars.n === me.pos && up.vars.rival === rows[me.pos].name && GC.stats.bestRank === me.pos, 'en ny bästa plats blir en nyhet med studion du gick om');
    S.rankMonth(GC);
    ok(ups() === u0 + 1, 'samma plats firas inte igen');
    const GN = S.newGame({ studio: 'N', seed: 2 });
    S.makeCompetitors(GN); S.initWorld(GN);
    S.rankMonth(GN);
    ok(GN.stats.bestRank === GN.comps.length + 1 && S.studioRank(GN).pos === GN.comps.length + 1 && S.studioRanking(GN).every((r) => r.you || r.rev > 0), 'en ny studio börjar längst ner, under förlag som redan säljer');
  }
  const GD = importCode(exportCode(GC));
  ok(GD && GD.ranks.length === 3 && GD.games[2].cert === 2 && GD.games[2].chart.top === big.chart.top && GD.stats.no1 === 1, 'skivor och listplatser följer med sparningen');
}
// röster från fansen: tre repliker per spel på båda språken, valda utan G.rng, som följer betyget, det som stack ut och
// läget just nu, och en replik i krönikan två veckor efter släppet
{
  const { FAN_FLAGS, FAN_SPECIAL, FAN_BANDS } = await import('../src/data/fanvoices.js');
  const GF = S.newGame({ studio: 'Fanstudion', seed: 33 });
  S.makeCompetitors(GF); S.initWorld(GF);
  GF.t = 48 * 6; // 1986
  const mk = (id, score, extra = {}) => Object.assign({ id, title: 'Spel ' + id, t: GF.t, score, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'medium', weekly: [10], units: 5, revenue: 10, total: 80, priceAt: 30, tail: 1, ended: false, fansGained: 0, hype: 30, flags: [], insights: [] }, extra);
  const hit = mk(1, 9.2, { flags: [{ k: 'bugs', v: 1, w: 1 }, { k: 'tech', v: -1, w: 1 }] });
  const flop = mk(2, 3.5, { flags: [{ k: 'bugs', v: -1, w: 1 }] });
  GF.games.push(hit, flop);
  const rng0 = GF.rng;
  const vh = S.fanVoices(GF, hit);
  const vf = S.fanVoices(GF, flop);
  const whole = (v) => ['sv', 'en'].every((k) => v.text[k] && !/[{}]/.test(v.text[k]) && v.name[k]);
  ok(vh.length === 3 && vf.length === 3 && [...vh, ...vf].every(whole) && GF.rng === rng0, 'tre röster per spel på båda språken, utan att röra slumpföljden');
  ok(JSON.stringify(S.fanVoices(GF, hit)) === JSON.stringify(vh) && new Set(vh.map((v) => v.text.sv)).size === 3 && new Set(vh.map((v) => v.name.sv)).size === 3, 'rösterna är desamma varje gång och upprepar sig inte');
  ok(vh[0].kind === 'band' && vh[0].mood === 1 && FAN_BANDS[0].sv.some((x) => x.replace('{title}', hit.title).replace('{studio}', GF.studio) === vh[0].text.sv) && vf[0].mood === -1, 'första rösten följer betyget');
  const has = (vs, pool) => vs.some((v) => pool.sv.some((x, i) => v.text.sv.toLowerCase().slice(0, 12) === x.replace('{plat}', PLATFORM.pc.name).toLowerCase().slice(0, 12) && pool.en[i].slice(0, 6).toLowerCase() === v.text.en.slice(0, 6).toLowerCase()));
  ok(vh[1].kind === 'flag' && vh[1].mood === 1 && has([vh[1]], FAN_FLAGS.bugs['+']) && has([vf[1]], FAN_FLAGS.bugs['-']) && vf[1].mood === -1, 'andra rösten tar upp en styrka i ett bra spel och en svaghet i ett dåligt');
  ok(vh[2].kind === 'flag' && vh[2].mood === -1 && has([vh[2]], FAN_FLAGS.tech['-']), 'tredje rösten kan vara en avvikande röst');
  ok(vh[0].name.sv.endsWith(' år') && !vh[0].name.en.endsWith(' år') && S.fanSource(hit) === 'letter' && S.fanSource({ t: 48 * 20 }) === 'forum' && S.fanVoices(GF, mk(3, 7, { t: 48 * 32 }))[0].name.sv.startsWith('@'), 'insändare först, sedan forum och flödet');
  // uppföljaren nämner föregångaren
  const seq = mk(4, 8.5, { sequelOf: 1, flags: [{ k: 'sequel', v: 1, w: 1 }] });
  GF.games.push(seq);
  ok(S.fanVoices(GF, seq)[1].text.sv.includes(hit.title) || S.fanVoices(GF, seq)[1].text.sv === 'Så här gör man en uppföljare.', 'uppföljarens röst jämför med föregångaren');
  // läget: en klassiker efter fem år, ett nedlagt onlinespel, gammalt innehåll
  const sp = (g) => S.fanVoices(GF, g).find((v) => v.kind === 'special');
  ok(!sp(hit), 'ett nytt spel har inget eftermäle');
  GF.t += 5 * 48;
  ok(sp(hit) && sp(hit).mood === 1 && FAN_SPECIAL.classic.sv.some((x) => x.replace('{title}', hit.title) === sp(hit).text.sv) && FAN_SPECIAL.cult.sv.some((x) => x.replace('{title}', flop.title) === sp(flop).text.sv), 'efter fem år blir ett toppspel en klassiker och ett bottennapp kult');
  hit.live = { closed: GF.t - 1 };
  ok(FAN_SPECIAL.liveClosed.sv.some((x) => x.replace('{title}', hit.title) === sp(hit).text.sv), 'ett nedlagt onlinespel saknas av spelarna');
  delete hit.live;
  // krönikan: en replik två veckor efter släppet, och bara då
  const fresh = mk(5, 8.2, { t: GF.t - 2, weekly: [10, 8], flags: [{ k: 'design', v: 1, w: 1 }] });
  GF.games.push(fresh);
  const money0 = GF.money, fans0 = GF.fans;
  S.fanWeek(GF);
  const fn = GF.news.filter((n) => n.key === 'news.fan');
  ok(fn.length === 1 && fn[0].vars.title === fresh.title && fn[0].vars.quote.sv && fn[0].vars.quote.en && fn[0].vars.name.sv && fn[0].kind === 'good' && has([{ text: fn[0].vars.quote }], FAN_FLAGS.design['+']), 'krönikan citerar en spelare två veckor efter släppet');
  fresh.weekly.push(6);
  S.fanWeek(GF);
  ok(GF.news.filter((n) => n.key === 'news.fan').length === 1 && GF.money === money0 && GF.fans === fans0 && GF.rng === rng0, 'bara en gång per spel, och inget rör pengar, fans eller slumpföljden');
}
// studions historia: de stora ögonblicken sparas för gott (bara första gången där det gäller), en äldre sparning får sin
// historia byggd ur det som finns kvar, och inget av det rör pengar eller slumpföljden
{
  const GH = S.newGame({ studio: 'Historia', seed: 44 });
  S.makeCompetitors(GH); S.initWorld(GH);
  const rng0 = GH.rng, money0 = GH.money;
  const rel = (key, title, v) => S.note(GH, key, { title, studio: GH.studio, v }, 'info', true);
  rel('news.release', 'A', '6.0'); rel('news.hit1', 'B', '8.5'); rel('news.hit2', 'C', '9.0'); rel('news.flop', 'D', '3.0');
  const keys = () => S.storyOf(GH).map((m) => m.key + ':' + (m.vars.title || m.vars.n || ''));
  ok(keys().join() === 'hist.firstGame:A,hist.firstHit:B', 'första spelet och första succén sparas en gång');
  S.note(GH, 'news.rankUp', { studio: GH.studio, n: 8, rival: 'X' }, 'good', true);
  S.note(GH, 'news.rankUp', { studio: GH.studio, n: 4, rival: 'X' }, 'good', true);
  S.note(GH, 'news.fan', { name: 'N', title: 'A', quote: { sv: 'q', en: 'q' } }, 'info', true);
  S.note(GH, 'news.office', { studio: GH.studio, name: 'Kontor' }, 'good', true);
  S.note(GH, 'news.office', { studio: GH.studio, name: 'Hus' }, 'good', true);
  S.note(GH, 'news.chartTop', { title: 'B' }, 'good', true); S.note(GH, 'news.chartTop', { title: 'C' }, 'good', true);
  ok(keys().slice(2).join() === 'news.rankUp:4,news.office:,news.office:,hist.firstNo1:B', 'bara topp fem i rankningen, varje flytt och första listettan blir milstolpar; vanliga nyheter blir det inte');
  // priser: första priset, och sedan bara galor som slår studions största skörd
  const gala = (key, n, year) => S.note(GH, key, { title: 'B', cat: { sv: 'Årets spel', en: 'Game of the Year' }, year, n }, 'award', true);
  gala('news.awardWins', 2, 1985); gala('news.awardWin', 1, 1986); gala('news.awardWins', 2, 1987); gala('news.awardWins', 3, 1988); gala('news.awardWins', 3, 1989);
  const prizes = S.storyOf(GH).filter((m) => m.key === 'hist.firstAward' || m.key === 'news.awardWins').map((m) => m.key.split('.')[1] + m.vars.year);
  ok(prizes.join() === 'firstAward1985,awardWins1988', 'första priset sparas en gång och en gala bara när skörden är studions största');
  // fansen och kassan: varje steg en gång, och studions tionde spel
  const before = S.storyOf(GH).length;
  S.storyWeek(GH);
  GH.fans = 12000; GH.money = 2.5e7; S.storyWeek(GH); S.storyWeek(GH);
  GH.fans = 90000; S.storyWeek(GH);
  const marks = S.storyOf(GH).slice(before).map((m) => m.key + ':' + m.vars.n);
  ok(marks.join() === 'hist.fans:10K,hist.cash:$10M' && GH.stats.fanMark === 1 && GH.stats.cashMark === 2 && GH.news.filter((n) => n.key === 'hist.fans' || n.key === 'hist.cash').length === 2, 'fansen och kassan blir milstolpar och nyheter en gång per steg');
  GH.money = money0;
  for (let i = 0; i < 10; i++) GH.games.push({ id: 100 + i, title: 'G' + i, t: 0, score: 6, expansionOf: i === 9 ? 100 : null });
  rel('news.release', 'Nio', '6.0');
  GH.games.push({ id: 110, title: 'Tio', t: 0, score: 6 });
  rel('news.release', 'Tio', '6.0');
  GH.games.push({ id: 111, title: 'Elva', t: 0, score: 6 });
  rel('news.release', 'Elva', '6.0');
  const nth = S.storyOf(GH).filter((m) => m.key === 'hist.games');
  ok(nth.length === 1 && nth[0].vars.n === 10 && nth[0].vars.title === 'Tio', 'studions tionde spel är en milstolpe, expansioner räknas inte');
  GH.games.length = 0;
  ok(S.STORY_KEYS.every((k) => STRINGS[k] && STRINGS[k].length === 2), 'varje milstolpe har en text på båda språken: ' + S.STORY_KEYS.filter((k) => !STRINGS[k]).join());
  // skivor: studions första av varje slag
  GH.t = 48 * 6; GH.flags.charts = 1; GH.stats.bestCert = -1;
  const mk = (id, units) => ({ id, title: 'S' + id, t: GH.t - 30, score: 7, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'medium', weekly: [0], units, revenue: 1, total: 8, priceAt: 30, tail: 1, ended: true, fansGained: 0, ports: [] });
  GH.games.push(mk(1, 150000));
  S.chartWeek(GH);
  GH.games.push(mk(2, 20000), mk(3, 300000));
  S.chartWeek(GH);
  const certs = S.storyOf(GH).filter((m) => m.key === 'hist.cert');
  ok(certs.length === 1 && certs[0].vars.i === 1 && certs[0].vars.title === 'S1' && GH.rng === rng0 && GH.money === money0, 'studions första guldskiva är en milstolpe, nästa guld och en silver är det inte');
  // en äldre sparning utan historia: byggs ur spellistan första gången den läses
  const GO = S.newGame({ studio: 'Gammal', seed: 45 });
  S.makeCompetitors(GO); S.initWorld(GO);
  GO.t = 48 * 12;
  GO.games.push(Object.assign(mk(1, 500), { t: 10, score: 6 }), Object.assign(mk(2, 150000), { t: 60, score: 8.4, cert: 1, certT: 80, chart: { best: 1, weeks: 5, top: 2 } }), Object.assign(mk(3, 20000), { t: 70, score: 7, cert: 0, certT: 90 }), Object.assign(mk(4, 9e5), { t: 200, score: 8, cert: 2, certT: 230, live: { t0: 200 } }));
  GO.stats.topStudio = 1988;
  GO.awards.push({ year: 1982, cat: 'fan', title: 'S2' }, { year: 1983, cat: 'goty', title: 'S2' }, { year: 1984, cat: 'goty', title: 'S4' }, { year: 1984, cat: 'tech', title: 'S4' });
  delete GO.story;
  const old = S.storyOf(GO).map((m) => m.key + ':' + (m.vars.title || m.vars.y) + ':' + m.t);
  ok(old.join() === 'hist.firstGame:S1:10,hist.firstHit:S2:60,hist.firstNo1:S2:60,hist.cert:S2:80,hist.firstAward:S2:143,live.news.launch:S4:200,hist.cert:S4:230,news.awardWins:S4:239,news.rankTop:1988:432' && GO.story.length === 9 && GO.story[4].vars.cat.en === 'Fan Favourite' && GO.story[7].vars.n === 2, 'en äldre sparning får sin historia ur spellistan');
  GO.fans = 5e6; delete GO.stats.fanMark; S.storyWeek(GO);
  S.note(GO, 'news.hit1', { title: 'Ny', studio: 'Gammal', v: '9.0' }, 'good', true);
  ok(GO.story.length === 9 && GO.stats.fanMark === 3, 'det som redan finns i historien läggs inte till igen, och en äldre sparning börjar tyst på sin fannivå');
  const GS = importCode(exportCode(GO));
  ok(GS && GS.story.length === 9 && GS.story[0].key === 'hist.firstGame', 'historien följer med sparningen');
}
// topplistan räknar konkurrenternas spel med förlagens räckvidd, så att en listetta kräver ett riktigt storspel
{
  const GT = S.newGame({ studio: 'Lista', seed: 47 });
  S.makeCompetitors(GT); S.initWorld(GT);
  GT.t = 100;
  GT.market.releases.push({ id: 1, t: 100, comp: 1, studio: 'X', color: '#fff', title: { sv: 'R', en: 'R' }, score: 8, total: 1000, platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'small', price: 10, tail: 1 });
  GT.games.push({ id: 2, title: 'Mitt', t: 100, score: 8, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', weekly: [1000 * S.curveFor(8, 1)[0] * 3], units: 1, revenue: 1, total: 1000, priceAt: 10, tail: 1, ports: [] });
  const rows = S.topSellers(GT, 12, 10);
  ok(S.CHART_REACH === 5 && rows.length === 2 && !rows[0].yours && Math.abs(rows[0].rev - 1000 * S.curveFor(8, 1)[0] * 5) < 1e-9 && Math.abs(rows[0].units - rows[0].rev / 10) < 1e-9 && rows[1].yours, 'konkurrentens spel räknas med förlagets räckvidd på topplistan');
}
// galan: hålls från 1981, publikpriset mäts mot konkurrenternas spel med förlagens räckvidd, och en nominering utan
// vinst ger en tredjedel av prisets belöning
{
  const GW = S.newGame({ studio: 'Gala', seed: 49 });
  S.makeCompetitors(GW); S.initWorld(GW);
  const rel = (t, score, total) => { const r = { id: GW.uid++, t, comp: 1, studio: 'X', color: '#fff', title: { sv: 'R' + score, en: 'R' + score }, score, total, platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'small', price: 10, tail: 1 }; GW.market.releases.push(r); return r; };
  const mine = (t, score, units) => GW.games.push({ id: GW.uid++, title: 'M' + score, t, score, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', units, total: units * 10, priceAt: 10, parts: { rd: 1, rt: 1 }, weekly: [], ports: [] });
  GW.t = 47;
  for (const sc of [5, 5.5, 6]) rel(10, sc, 1e5);
  mine(20, 9, 500);
  S.runAwards(GW);
  ok(S.FIRST_GALA === 1981 && !GW.pending.length && !GW.awards.length && !GW.news.length, 'ingen gala 1980');
  // 1981: ditt spel har högst betyg, men konkurrentens säljer mer när förlagets räckvidd räknas
  GW.t = 48 + 47;
  const top = [5, 5.5, 6].map((sc) => rel(48 + 10, sc, 1e5))[2];
  const theirs = S.relUnitsTotal(top, 96);
  mine(48 + 20, 9, Math.round(theirs * 2));
  const f0 = GW.fans, m0 = GW.money;
  S.runAwards(GW);
  const p1 = GW.pending[0];
  const fanCat = p1.cats.find((c) => c.id === 'fan');
  ok(GW.awards.map((a) => a.cat).join() === 'goty,design,tech' && !fanCat.nominees[0].yours && fanCat.nominees.some((n) => n.yours) && GW.games[1].units > theirs && GW.games[1].units < theirs * S.CHART_REACH, 'publikpriset går till spelet som säljer mest med förlagets räckvidd');
  ok(p1.gain.noms === 1 && p1.gain.fans === GW.fans - f0 && p1.gain.money === GW.money - m0 && p1.gain.fans > Math.round(300 * 2) && GW.news[0].key === 'news.awardWins', 'galans belöning: vinsterna och en tredjedel för nomineringen');
  // 1982: nominerad i alla kategorier utan att vinna
  GW.pending.length = 0;
  GW.t = 96 + 47;
  for (const sc of [9.5, 6, 5]) rel(96 + 10, sc, 1e6);
  mine(96 + 20, 7, 100);
  const f1 = GW.fans;
  S.runAwards(GW);
  const p2 = GW.pending[0];
  const exp = [1, 0.5, 0.5, 1].reduce((f, k) => f + Math.round((300 + f * 0.06) * k * S.NOM_SHARE), f1);
  ok(GW.awards.length === 3 && p2.gain.noms === 4 && GW.fans === exp && GW.news[0].key === 'news.awardNom' && GW.news[0].vars.n === 4, 'nomineringar utan vinst ger en tredjedel av belöningen och en rad i krönikan');
  // ställningen inför galan: samma ordning som galan får, en nyhet tolv veckor innan, och ingenting annat ändras
  GW.pending.length = 0;
  GW.t = 20;
  ok(S.awardStandings(GW) === null, 'ingen ställning före första galan');
  GW.t = 144 + 35; // 1983, tolv veckor före galan
  for (const sc of [8, 7, 6, 5]) rel(144 + 5, sc, 1e5);
  mine(144 + 10, 7.5, 100);
  const st = S.awardStandings(GW);
  ok(st.year === 1983 && st.weeks === S.GALA_WATCH && st.field === 5 && st.cats[0].place === 2 && st.cats[0].top[0].score === 8 && st.cats[0].mine.title === 'M7.5' && st.cats[3].place === 5 && st.cats[3].top.length === 4 && st.cats[0].cut === 6 && st.cats[0].top[0].v === 8 && st.cats[3].top[0].v === st.cats[3].top[0].units && st.cats[3].cut > st.cats[3].mine.v, 'ställningen: tvåa i Årets spel, sist i publikpriset, med gränsen för en nominering');
  const snap = () => JSON.stringify([GW.money, GW.fans, GW.rng, GW.awards.length, GW.pending.length]);
  const s0 = snap();
  const n0 = GW.news.length;
  S.galaWatch(GW);
  ok(GW.news.length === n0 + 1 && GW.news[0].key === 'news.galaNom' && GW.news[0].vars.n === 2 && GW.news[0].vars.v === '8.0' && GW.news[0].vars.title === 'M7.5' && snap() === s0, 'tolv veckor före galan: en nyhet om läget, inget annat ändras');
  GW.t++;
  S.galaWatch(GW);
  ok(GW.news.length === n0 + 1, 'nyheten kommer bara den veckan');
  mine(144 + 36, 9, 100);
  GW.t = 144 + 35;
  S.galaWatch(GW);
  ok(S.awardStandings(GW).cats[0].place === 1 && GW.news[0].key === 'news.galaLead' && GW.news[0].vars.title === 'M9', 'ett bättre spel tar ledningen');
  GW.t = 144 + 47;
  const stG = S.awardStandings(GW);
  S.runAwards(GW);
  const p3 = GW.pending[0];
  const names = (a) => a.map((e) => e.title.sv || e.title).join();
  ok(stG.weeks === 0 && ['goty', 'design', 'tech'].every((id) => names(stG.cats.find((c) => c.id === id).top) === names(p3.cats.find((c) => c.id === id).nominees)), 'galaveckan är ställningen densamma som galans nomineringar');
  // ett år med för få spel: ingen gala, ingen nyhet, och ställningen säger hur många som finns
  GW.t = 192 + 35;
  rel(192 + 5, 6, 1e5);
  const n1 = GW.news.length;
  S.galaWatch(GW);
  ok(S.awardStandings(GW).field === 1 && S.awardStandings(GW).field < S.GALA_FIELD && GW.news.length === n1, 'för få spel: ingen nyhet om galan');
  // utan eget spel i år: en tyst rad om vem som leder
  for (const sc of [7, 6.5, 5]) rel(192 + 6, sc, 1e5);
  S.galaWatch(GW);
  ok(GW.news[0].key === 'news.galaOut' && GW.news[0].vars.v === '7.0' && S.awardStandings(GW).cats[0].place === 0 && S.awardStandings(GW).cats[0].mine === null, 'utan eget spel: nyheten säger vem som leder');
}
// studiohallen: studions rad och hallens ordning (själva lagringen ligger i webbläsaren)
{
  const GA = S.newGame({ studio: 'Hall', seed: 48 });
  S.makeCompetitors(GA); S.initWorld(GA);
  GA.t = 48 * 12;
  GA.games.push({ id: 1, title: 'Ett', t: 10, score: 6 }, { id: 2, title: 'Två', t: 60, score: 8.8 }, { id: 3, title: 'Exp', t: 70, score: 9.5, expansionOf: 2 });
  GA.stats.revenue = 5e6; GA.stats.bestScore = 8.8; GA.fans = 4000;
  GA.awards.push({ year: 1985, cat: 'goty', title: 'Två' });
  const e = S.hallEntry(GA);
  ok(e.id === '48:Hall' && e.year === 1992 && !e.over && e.games === 2 && e.awards === 1 && e.best.title === 'Exp' && e.points === S.legacy(GA).points && e.revenue === 5e6, 'studions rad i studiohallen');
  GA.over = { type: 'bankrupt', t: 48 * 9 };
  const bust = S.hallEntry(GA);
  ok(bust.over && bust.year === 1989, 'en konkursad studio skrivs in med konkursåret');
  const order = S.hallSort([{ id: 'a', points: 50, revenue: 1 }, bust, { id: 'b', points: 80, revenue: 1 }, { id: 'c', points: 80, revenue: 9 }]).map((x) => x.id);
  ok(order.join() === 'c,b,a,48:Hall', 'hallen: bäst eftermäle först, sedan omsättning, konkurser sist');
  // bakgrunder som hallen låser upp: de fyra första finns alltid, de andra tre kräver en tidigare studio
  const hall0 = [];
  const hall1 = [{ id: 'x', points: 30, awards: 1 }];
  const hall2 = [{ id: 'x', points: 55, awards: 0 }];
  const hall3 = [{ id: 'x', points: 80, awards: 4 }];
  const open = (h) => S.FOUNDERS.filter((id) => S.founderUnlocked(h, id)).join();
  ok(open(hall0) === 'designer,coder,visionary,hustler', 'utan tidigare studior finns de fyra första bakgrunderna');
  ok(open(hall1) === 'designer,coder,visionary,hustler,influencer', 'ett pris låser upp influencern');
  ok(open(hall2) === 'designer,coder,visionary,hustler,veteran', '50 poäng låser upp veteranen');
  ok(open(hall3) === S.FOUNDERS.join(), '75 poäng låser upp alla');
  ok(S.founderNew(hall0, hall1).join() === 'influencer' && S.founderNew(hall1, hall3).join() === 'veteran,tycoon' && S.founderNew(hall3, hall3).length === 0, 'en ny rad pekar ut bakgrunderna som blev upplåsta för första gången');
  // recordRun: autosparningen skriver in raden före slutskärmen, så svaret ska vara detsamma första och andra gången
  {
    const mem = {};
    globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    const GR = S.newGame({ studio: 'Rad', seed: 77 });
    GR.t = 48 * 12;
    GR.games.push({ id: 1, title: 'Ett', t: 10, score: 8 });
    GR.awards.push({ year: 1985, cat: 'goty', title: 'Ett' });
    GR.over = { type: 'bankrupt', t: 48 * 12 };
    const r1 = recordRun(GR);
    const r2 = recordRun(GR);
    ok(r1 && r1.unlocked.join() === 'influencer' && r2.unlocked.join() === 'influencer' && loadHall().length === 1, 'recordRun: bakgrunden som raden låste upp syns även när raden redan skrivits in');
    delete globalThis.localStorage;
  }
  // sparplatser: fem platser, plats 1 under den gamla nyckeln, senast sparade platsen laddas, ta bort frigör en plats
  {
    const mem = {};
    globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    ok(SLOTS === 5 && !hasSave() && freeSlot() === 1 && latestSlot() === 0 && loadGame() === null && slotList().length === 5, 'inga sparningar: allt är tomt och första platsen är ledig');
    const A = S.newGame({ studio: 'Alfa', seed: 11 });
    const B = S.newGame({ studio: 'Beta', seed: 12 });
    useSlot(1);
    ok(saveGame(A) && 'pixel-dynasty-save-v1' in mem && !('pixel-dynasty-save-v1-s1' in mem), 'plats 1 ligger kvar under den gamla nyckeln, så äldre sparningar laddar');
    ok(freeSlot() === 2 && hasSave(1) && !hasSave(2), 'andra platsen är nästa lediga');
    mem['pixel-dynasty-save-v1'] = JSON.stringify({ ...JSON.parse(mem['pixel-dynasty-save-v1']), meta: { ...JSON.parse(mem['pixel-dynasty-save-v1']).meta, at: 1000 } });
    ok(saveGame(B, 2) && activeSlot() === 1, 'att spara i en annan plats byter inte den aktiva');
    ok(latestSlot() === 2 && saveMeta().studio === 'Beta' && saveMeta(1).studio === 'Alfa', 'senast sparade platsen väljs utan nummer, och varje plats har sina uppgifter');
    const lb = loadGame();
    ok(lb && lb.studio === 'Beta' && activeSlot() === 2, 'utan nummer laddas den senast sparade och blir aktiv');
    const la = loadGame(1);
    ok(la && la.studio === 'Alfa' && activeSlot() === 1, 'med nummer laddas just den platsen och blir aktiv');
    saveGame(Object.assign(S.newGame({ studio: 'Alfa', seed: 11 }), { over: { type: 'bankrupt', t: 5 } }), 1);
    ok(latestSlot(true) === 2 && slotList()[0].meta.over === true, 'en studio i konkurs räknas inte som spelbar');
    deleteSave(2);
    ok(!hasSave(2) && freeSlot() === 2 && loadGame(2) === null && loadGame().studio === 'Alfa', 'en borttagen plats blir ledig och går inte att ladda');
    for (let n = 2; n <= SLOTS; n++) saveGame(B, n);
    ok(freeSlot() === 0 && slotList().every((x) => x.meta), 'när alla är fulla finns ingen ledig plats');
    ok(useSlot(9) === activeSlot() && useSlot(3) === 3, 'ett ogiltigt platsnummer ignoreras');
    delete globalThis.localStorage;
  }
  const gi = S.newGame({ studio: 'I', seed: 5, archetype: 'influencer' });
  const gt = S.newGame({ studio: 'T', seed: 5, archetype: 'tycoon' });
  const gd = S.newGame({ studio: 'D', seed: 5 });
  ok(gi.fans === 250 && gd.fans === 0 && gt.money === gd.money + 15000 && gi.staff[0].design === 12 && gd.staff[0].design === 19, 'bakgrunderna ger sina startvärden');
  ok(Object.keys(S.FOUNDER_UNLOCK).every((id) => S.FOUNDERS.includes(id)) && S.FOUNDERS.every((id) => S.ARCHETYPES[id]), 'varje bakgrund har värden');
}
// studions rykte: sex spel krävs, och ordningen avgör vad som vinner
{
  const GI = S.newGame({ studio: 'Rykte', seed: 21 });
  const mk = (n, o) => Array.from({ length: n }, (_, i) => ({ id: 10 + i, title: 'S' + i, t: i * 20, score: 6, genre: 'action', scope: 'small', ...o(i) }));
  GI.games = mk(5, () => ({}));
  ok(S.identity(GI) === null, 'inget rykte före sex spel');
  GI.games = mk(6, (i) => ({ genre: ['action', 'rpg', 'puzzle', 'sim', 'strategy', 'racing'][i], score: 6 }));
  ok(S.identity(GI).id === 'steady', 'sex olika spel utan profil ger pålitlig hantverkare');
  GI.games = mk(6, (i) => ({ genre: i < 4 ? 'rpg' : 'action' }));
  ok(S.identity(GI).id === 'genre' && S.identity(GI).genre === 'rpg', 'en genre som är minst 40 % av spelen ger specialist');
  GI.games = mk(6, (i) => ({ genre: ['action', 'rpg', 'puzzle', 'sim', 'strategy', 'racing'][i], score: 8.5 }));
  ok(S.identity(GI).id === 'hits', 'sex spel med betyg 8+ ger hitfabriken');
  GI.games[0].scope = GI.games[1].scope = GI.games[2].scope = 'aaa';
  ok(S.identity(GI).id === 'blockbuster', 'tre AAA-spel går före hits');
  GI.games[3].live = { subs: 1 }; GI.games[4].live = { subs: 1 };
  ok(S.identity(GI).id === 'online', 'två onlinespel går först av allt');
  GI.games = mk(8, (i) => ({ genre: ['action', 'rpg', 'puzzle', 'sim', 'strategy', 'racing', 'adventure', 'shooter'][i], score: 7.4, scope: i % 2 ? 'medium' : 'small' }));
  ok(S.identity(GI).id === 'indie', 'åtta små och medelstora spel med bra betyg ger indieälskling');
  ok(identityName({ id: 'genre', genre: 'rpg' }).sv.startsWith('Specialist på ') && identityName({ id: 'hits' }).en === 'Hit Factory' && identityName({ id: 'genre', genre: 'rpg' }).en.endsWith(' Specialist'), 'namnen finns på båda språken');
  const GW = S.newGame({ studio: 'Rykte2', seed: 22 });
  GW.games = mk(6, () => ({ score: 8.5, genre: 'rpg' }));
  GW.t = 1000;
  GW.news = [];
  S.identityWatch(GW);
  ok(GW.news.length === 1 && GW.news[0].key === 'news.identity' && GW.flags.ident === 'hits', 'första ryktet ger en nyhet');
  S.identityWatch(GW);
  ok(GW.news.length === 1, 'samma rykte skrivs inte om');
  GW.games = mk(6, (i) => ({ score: 6, genre: i < 4 ? 'rpg' : 'action' }));
  GW.t += 40;
  S.identityWatch(GW);
  ok(GW.news.length === 1, 'ett nytt rykte väntar två år efter det förra');
  GW.t += 60;
  S.identityWatch(GW);
  ok(GW.news.length === 2 && GW.flags.ident === 'genre:rpg' && storyHas(GW), 'och skrivs sedan, även i historien');
  function storyHas(G) { return (G.story || []).some((x) => x.key === 'hist.identity'); }
  ok(S.hallEntry(GW).ident.id === 'genre', 'hallens rad bär ryktet');
}
// sen forskning: tre motordelar och tre bonusar efter 2015, och motorbehovet växer så att en gammal motor måste byggas om
{
  const late = ['f_proc', 'f_rt', 'f_ml', 'q_cloudqa', 'b_data', 's_remote'];
  ok(late.every((id) => RESEARCH.some((r) => r.id === id && r.year >= 2016)) && RESEARCH.every((r) => r.req.every((q) => RESEARCH.some((x) => x.id === q))), 'de sena noderna kommer efter 2015 och alla krav finns');
  ok(S.engineNeed(2016) < S.engineNeed(2017) && S.engineNeed(2017) < S.engineNeed(2019) && S.engineNeed(2019) < S.engineNeed(2022) && S.engineNeed(2022) === S.engineNeed(2040), 'motorbehovet växer med varje ny motordel');
  const GR = S.newGame({ studio: 'Late', seed: 9 });
  for (const id of late) S.applyUnlocks(GR, RESEARCH.find((r) => r.id === id));
  ok(['proc', 'rt', 'ml'].every((f) => GR.u.feats.includes(f)) && GR.perk.qa === 0.5 && GR.perk.sales === 0.05 && GR.perk.hire === 0.5 && GR.perk.morale === 4 && GR.perk.bugs === -0.1, 'noderna ger motordelar och bonusar');
  const old16 = { tech: 269, built: 2016 }; // en komplett motor från 2016
  ok(S.engineMult(old16, 2016.5) > S.engineMult(old16, 2022) && S.engineMult({ tech: 269 + 132, built: 2022 }, 2022) >= S.engineMult(old16, 2022) + 0.05, 'en ny motor med de nya delarna slår en gammal komplett motor');
}
// medarbetare som stannar: en nyhet efter 3, 5, 10 och 20 år och efter 10 och 25 spel, en gång var, aldrig för grundaren
{
  const GS = S.newGame({ studio: 'Staff', seed: 8 });
  S.makeCompetitors(GS); S.initWorld(GS);
  const a = { id: 90, name: 'Anna', hired: 0, games: 0, isFounder: false, trainUntil: -1 };
  const b = { id: 91, name: 'Bo', hired: 100, games: 9, isFounder: false, trainUntil: -1 };
  GS.staff.push(a, b);
  GS.t = 48 * 3 + 5;
  const n0 = GS.news.length;
  S.serviceYears(GS);
  ok(GS.news.length === n0 + 1 && GS.news[0].key === 'news.staffYears' && GS.news[0].vars.n === 3 && GS.news[0].vars.name === 'Anna' && a.ann === 3, 'tre år i studion ger en nyhet');
  S.serviceYears(GS);
  ok(GS.news.length === n0 + 1, 'nyheten kommer bara en gång');
  GS.t = 48 * 5;
  S.serviceYears(GS);
  ok(GS.news.length === n0 + 2 && GS.news[0].vars.n === 5 && !GS.staff[0].ann, 'fem år ger en ny nyhet, men aldrig för grundaren');
  const n1 = GS.news.length;
  S.serviceGames(GS, b);
  ok(GS.news.length === n1, 'nio spel ger ingen nyhet');
  b.games = 10;
  S.serviceGames(GS, b);
  ok(GS.news.length === n1 + 1 && GS.news[0].key === 'news.staffGames' && GS.news[0].vars.n === 10, 'tio spel ger en nyhet');
  GS.staff[0].games = 10;
  S.serviceGames(GS, GS.staff[0]);
  ok(GS.news.length === n1 + 1, 'grundarens spel räknas i studions krönika, inte här');
}
// veckans utmaning: samma vecka ger samma frö och därmed samma värld
{
  ok(weeklyOf(new Date(2026, 10, 14)).id === '2026-W46' && weeklyOf(new Date(2026, 10, 9)).id === '2026-W46' && weeklyOf(new Date(2026, 10, 15)).id === '2026-W46' && weeklyOf(new Date(2026, 10, 16)).id === '2026-W47', 'veckan går från måndag till söndag');
  ok(weeklyOf(new Date(2027, 0, 1)).id === '2026-W53' && weeklyOf(new Date(2026, 0, 4)).id === '2026-W01' && weeklyOf(new Date(2026, 0, 5)).id === '2026-W02', 'veckan räknas enligt ISO över årsskiftet');
  const w = weeklyOf(new Date(2026, 10, 12));
  ok(w.seed === weeklyOf(new Date(2026, 10, 14)).seed && w.seed !== weeklyOf(new Date(2026, 10, 20)).seed && Number.isInteger(w.seed), 'samma vecka har samma frö, nästa vecka ett annat');
  const mk = (o) => { const g = S.newGame({ studio: 'W', seed: w.seed, weekly: w.id, ...o }); S.makeCompetitors(g); S.initWorld(g); return g; };
  const w1 = mk({}), w2 = mk({ studio: 'Annat namn' });
  const names = (g) => g.comps.map((c) => c.name).join() + '|' + g.candidates.map((c) => c.name + c.design).join();
  ok(w1.weekly === w.id && w1.seed === w.seed && names(w1) === names(w2) && S.newGame({ studio: 'X' }).weekly === null, 'två studior samma vecka får samma konkurrenter och kandidater');
  ok(S.hallEntry(w1).weekly === w.id && S.hallEntry(S.newGame({ studio: 'Y', seed: 3 })).weekly === null, 'hallens rad minns veckans utmaning');
}
// prestationer för galan och onlinespel
{
  const GX = S.newGame({ studio: 'Ach', seed: 3 });
  const has = (id) => ACHIEVEMENTS.find((a) => a.id === id).check(GX);
  GX.awards.push({ year: 1984, cat: 'goty' }, { year: 1984, cat: 'design' }, { year: 1984, cat: 'tech' });
  ok(!has('slam') && !has('regular'), 'tre priser på ett gala är varken storslam eller stammis');
  GX.awards.push({ year: 1984, cat: 'fan' });
  ok(has('slam') && !has('regular'), 'alla fyra priserna på samma gala är storslam');
  GX.awards.push({ year: 1982, cat: 'goty' }, { year: 1983, cat: 'goty' }, { year: 1985, cat: 'goty' });
  ok(!has('regular'), 'fyra olika år räcker inte till stammis');
  GX.awards.push({ year: 1986, cat: 'fan' });
  ok(has('regular'), 'priser fem olika år gör en till galans stammis');
  const live = (o) => ({ live: { closed: false, model: 'subs', peak: 0, ...o } });
  GX.games.push(live({}), live({}), live({ closed: true }));
  ok(!has('three_live'), 'två pågående onlinespel är inte tre');
  GX.games.push(live({}));
  ok(has('three_live'), 'tre onlinespel igång samtidigt');
  ok(!has('f2p1m'), 'ingen miljon spelare i ett gratisspel än');
  GX.games.push(live({ model: 'subs', peak: 2e6 }), live({ model: 'f2p', peak: 9e5 }));
  ok(!has('f2p1m'), 'ett abonnemangsspel eller under en miljon räknas inte');
  GX.games.push(live({ model: 'f2p', peak: 1.2e6, closed: true }));
  ok(has('f2p1m'), 'en miljon spelare i ett gratisspel');
  // rykte och tio år
  GX.t = 479;
  ok(!has('decade') && !has('known') && !has('hitfactory'), 'varken tio år, rykte eller hitfabrik från start');
  GX.t = 480;
  GX.flags.ident = 'genre:rpg';
  ok(has('decade') && has('known') && !has('hitfactory'), 'tio år och ett rykte, men inte hitfabriken');
  GX.flags.ident = 'hits';
  ok(has('hitfactory'), 'känd som hitfabriken');
}
// ärkerivalen: studion närmast framför blir rival, årets duell avgörs vid årsskiftet, raka segrar avgör den och en ny
// rival utses. Duellen rör varken pengar, fans eller slumpföljden.
{
  const GR = S.newGame({ studio: 'Duell', seed: 46 });
  S.makeCompetitors(GR); S.initWorld(GR);
  GR.t = 48;
  const [a, b, c, d, e] = GR.comps;
  const rows = (order) => order.map((x, i) => (x === 'me' ? { id: 0, name: GR.studio, you: true, rev: 100 - i, pos: i + 1 } : { id: x.id, name: x.name, rev: 100 - i, pos: i + 1, comp: x }));
  const year = (order) => { GR.t += 48; return S.rivalYear(GR, rows(order)); };
  const money0 = GR.money, fans0 = GR.fans;
  let o = S.rivalYear(GR, rows([a, b, 'me', c, d, e]));
  ok(o.rival === b.name && !o.duel && !o.again && GR.rival.since === 1981 && S.rivalOf(GR) === b, 'studion närmast framför blir ärkerival');
  o = year([a, b, 'me', c, d, e]);
  ok(o.duel && o.duel.name === b.name && !o.duel.win && o.duel.l === 1 && !o.duel.end && !o.rival && GR.rival.run === -1, 'rivalen sålde mer: årets poäng går till rivalen');
  year([a, 'me', b, c, d, e]);
  o = year([a, 'me', b, c, d, e]);
  ok(o.duel.win && o.duel.w === 2 && !o.duel.end && GR.rival.id === b.id, 'två raka segrar avgör inte duellen mot en rival som ligger intill');
  o = year([a, 'me', b, c, d, e]);
  const log = () => S.rivalLog(GR).map((x) => `${x.name === a.name ? 'a' : x.name === b.name ? 'b' : x.name === c.name ? 'c' : 'd'}:${x.w}-${x.l}:${x.end}`).join();
  ok(o.duel.end === 'done' && o.rival === a.name && log() === 'b:3-1:done' && GR.rival.since === 1985 && GR.rival.w === 0, 'tre raka segrar avgör duellen och studion närmast framför blir ny rival');
  year(['me', c, d, a, b, e]);
  o = year(['me', c, d, a, b, e]);
  ok(o.duel.end === 'done' && o.rival === c.name && log() === 'b:3-1:done,a:2-0:done', 'två segrar räcker när rivalen halkat tre platser efter, och den som är störst får tvåan som rival');
  year([c, a, b, d, 'me', e]); year([c, a, b, d, 'me', e]);
  o = year([c, a, b, d, 'me', e]);
  ok(o.duel.end === 'away' && o.rival === d.name && log().endsWith('c:0-3:away'), 'en rival som dragit ifrån i tre år byts mot studion närmast framför');
  year([a, b, 'me', d, c, e]); year([a, b, 'me', d, c, e]);
  o = year([a, b, 'me', d, c, e]);
  ok(o.duel.end === 'done' && o.rival === b.name && o.again === true, 'en gammal rival kan komma tillbaka');
  // månadens koll: en nyhet när ni går om varandra, men inte två inom ett halvår
  const flips = () => GR.news.filter((n) => n.key === 'news.rivalPass' || n.key === 'news.rivalPassed').length;
  GR.t += 30;
  const f0 = flips();
  ok(S.rivalMonth(GR, rows([a, 'me', b, c, d, e])) === 'pass' && flips() === f0 + 1 && GR.news[0].key === 'news.rivalPass', 'en nyhet när du går om rivalen');
  GR.t += 4;
  ok(S.rivalMonth(GR, rows([a, b, 'me', c, d, e])) === '' && S.rivalMonth(GR, rows([a, b, 'me', c, d, e])) === '' && flips() === f0 + 1, 'ingen ny nyhet om ni byter plats igen inom ett halvår');
  // rivalens släpp är en nyhet, andras släpp är det inte
  const n1 = GR.news.filter((n) => n.key === 'news.rivalRel').length;
  S.releaseComp(GR, b); S.releaseComp(GR, a);
  const rr = GR.news.filter((n) => n.key === 'news.rivalRel');
  ok(rr.length === n1 + 1 && rr[0].vars.rival === b.name && S.rivalLast(GR).comp === b.id, 'ärkerivalens släpp blir en nyhet');
  // uppköp: duellen slutar, och historien får en egen rad
  S.note(GR, 'news.acquired', { studio: b.name, v: 1990 }, 'good', true);
  b.owned = true;
  ok(S.rivalOf(GR) === null, 'en uppköpt rival är inte längre rival');
  o = year([a, 'me', c, d, e]);
  const hist = S.storyOf(GR).map((m) => m.key).filter((k) => /[rR]ival|acquired/.test(k));
  ok(!o.duel && o.rival === a.name && log().endsWith('b:0-0:bought') && hist.join() === 'hist.firstRival,hist.rivalDone,hist.rivalBought', 'köper du rivalen slutar duellen, och historien minns första rivalen, första avgjorda duellen och köpet');
  ok(GR.money === money0 && GR.fans === fans0, 'duellen rör inte pengar eller fans');
}
// årets summa per kategori: förra året till finansfönstret och årsrapporten, en äldre sparning räknar en del av året
{
  const GY = S.newGame({ studio: 'Y', seed: 5 }); S.makeCompetitors(GY); S.initWorld(GY);
  GY.t = 47;
  S.earn(GY, 1000, 'contracts');
  for (let i = 0; i < 200 && GY.t < 48; i++) { GY.pending.length = 0; S.stepTick(GY); }
  ok(GY.t === 48 && GY.lastYear && GY.lastYear.year === 1980 && GY.lastYear.bd.contracts === 1000 && !GY.lastYear.part && Object.keys(GY.yr).length === 0, 'förra årets intäkter per kategori sparas vid årsskiftet');
  delete GY.yr;
  GY.t = 95;
  for (let i = 0; i < 200 && GY.t < 96; i++) { GY.pending.length = 0; S.stepTick(GY); }
  ok(GY.lastYear.year === 1981 && GY.lastYear.part, 'en äldre sparning markerar året som en del');
}
// bailout + konkurs
const G3 = S.newGame({ studio: 'B', seed: 3 }); S.makeCompetitors(G3); S.initWorld(G3);
G3.money = -5000;
for (let i = 0; i < 48 * 4 && !G3.over; i++) { if (G3.pending.length) { const p = G3.pending[0]; if (p.type === 'bailout') { S.declineBailout(G3); G3.pending = G3.pending.filter((x) => x.type !== 'bailout'); } else G3.pending.shift(); } S.stepTick(G3); }
ok(G3.over && G3.over.type === 'bankrupt', 'konkurs efter nej till räddningslån');
// spara/ladda roundtrip
const json = JSON.stringify(G);
const G4 = JSON.parse(json);
for (let i = 0; i < 100; i++) { if (G4.pending.length) G4.pending.shift(); S.stepTick(G4); }
ok(G4.t > G.t, 'sparad state går att fortsätta spela');
// äldre sparningar: ett fält som saknas fylls i av migrate() och spelet går att köra två år utan NaN
const M0 = S.newGame({ studio: 'M', seed: 4 }); S.makeCompetitors(M0); S.initWorld(M0);
while (M0.t < 60) { M0.pending.length = 0; S.stepTick(M0); }
const NESTED = ['u', 'perk', 'research', 'stats', 'office', 'month', 'lastMonth', 'know', 'hist', 'market'];
const paths = Object.keys(M0).filter((k) => k !== 'staff').map((k) => [k]);
for (const k of NESTED) for (const k2 of Object.keys(M0[k])) paths.push([k, k2]);
const bad = [];
for (const p of paths) {
  const D = JSON.parse(JSON.stringify(M0));
  delete (p.length > 1 ? D[p[0]] : D)[p[p.length - 1]];
  try {
    const L = importCode(exportCode(D));
    for (let i = 0; i < 48 * 2 * S.TICKS_PER_WEEK; i++) {
      while (L.pending.length) { const q = L.pending[0]; if (q.type === 'event') S.resolveEvent(L, q.id, 0); else L.pending.shift(); }
      if (!L.job) S.startProject(L, { title: 'x', topic: L.u.topics[0], genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
      S.stepTick(L);
    }
    if (!Number.isFinite(L.money) || !Number.isFinite(L.fans) || L.staff.some((x) => !Number.isFinite(x.mood)) || L.games.some((g) => !Number.isFinite(g.score))) bad.push(p.join('.') + ' NaN');
  } catch (e) { bad.push(p.join('.') + ' ' + e.message); }
}
ok(!bad.length, `äldre sparning utan ett av ${paths.length} fält går att spela vidare` + (bad.length ? ': ' + bad.join(', ') : ''));
// Andrum: slumpade händelser väntar efter ett stopp (och inför ett planerat) och kommer när det är slut
{
  const A = S.newGame({ studio: 'A', seed: 5, difficulty: 'normal' });
  S.makeCompetitors(A); S.initWorld(A);
  A.games.push({ id: 1, title: 'x', t: 0, score: 7, total: 1e5, weekly: [1], topic: 'fantasy', genre: 'action', platform: 'pc', scope: 'small', revenue: 1e5, units: 100, flags: [], reviews: [], insights: [] });
  A.t = 120; // vecka 24 på året: inget planerat stopp i närheten
  A.flags.evDue = true;
  A.stopT = A.t - 1;
  ok(S.rollStudioEvent(A) === false && A.pending.length === 0 && A.flags.evDue === true, 'andrum: en händelse som är på väg väntar när spelet nyss stannat');
  A.stopT = A.t - S.BREATH;
  ok(S.rollStudioEvent(A) === true && A.pending.length === 1 && A.flags.evDue === false, 'andrum: den kommer när andrummet är slut');
  const B = S.newGame({ studio: 'B', seed: 5, difficulty: 'normal' });
  S.makeCompetitors(B); S.initWorld(B);
  B.games.push(A.games[0]);
  B.t = S.tOf(1985, 11, 2); // två veckor före galan (december, vecka 3)
  B.flags.evDue = true;
  ok(S.rollStudioEvent(B) === false && B.flags.evDue === true, 'andrum: en händelse väntar också strax före galan');
  // under ett helt spel stannar boten ofta, men aldrig två slumpade händelser inom andrummet
  const C = S.newGame({ studio: 'C', seed: 11, difficulty: 'normal' });
  S.makeCompetitors(C); S.initWorld(C);
  let lastEv = -99, tooClose = 0, evs = 0;
  for (let i = 0; i < 48 * 12 * S.TICKS_PER_WEEK && !C.over; i++) {
    while (C.pending.length) {
      const q = C.pending[0];
      if (q.type === 'event') {
        evs++;
        if (C.t - lastEv < S.BREATH - 1) tooClose++;
        lastEv = C.t;
        S.resolveEvent(C, q.id, 0);
      } else if (q.type === 'report') { S.releaseGame(C); C.pending.shift(); } else if (q.type === 'bailout') { S.takeBailout(C); C.pending.shift(); } else C.pending.shift();
    }
    if (!C.job) S.startProject(C, { title: 'y', topic: C.u.topics[0], genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
    S.stepTick(C);
  }
  ok(evs >= 3 && tooClose === 0, `andrum: ${evs} händelser på tolv år, ingen inom ${S.BREATH - 1} veckor från en annan`);
}
// viktiga nyheter: milstolpar, priser och varningar får flaggan big (kort som blir kvar), vanliga nyheter inte
{
  const GB = JSON.parse(JSON.stringify(G));
  GB.news = [];
  GB.story = [];
  GB.flags = {};
  const seen = [];
  const { on } = await import('../src/core/bus.js');
  on('toast', (n) => seen.push(n));
  S.note(GB, 'news.office', { n: 1 }, 'good');
  S.note(GB, 'news.lowCash', {}, 'bad');
  S.note(GB, 'news.awardWin', { title: 'A', cat: 'x', year: 1990 }, 'award');
  S.note(GB, 'news.quitMood', { name: 'N' }, 'bad');
  S.note(GB, 'news.staffGames', { name: 'N', n: 3 }, 'good');
  S.note(GB, 'news.chartIn', { title: 'T', n: 40 }, 'info');
  const big = (k) => GB.news.find((n) => n.key === k).big === 1;
  ok(big('news.office') && big('news.lowCash') && big('news.awardWin') && big('news.quitMood'), 'milstolpar, priser och varningar får big');
  ok(!GB.news.find((n) => n.key === 'news.staffGames').big && !GB.news.find((n) => n.key === 'news.chartIn').big, 'vanliga nyheter får inte big');
  ok(seen.filter((n) => n.big).length === 4 && seen.length === 6, 'toast-händelsen bär flaggan big');
  // en once-milstolpe som redan finns gör inte nyheten viktig en andra gång
  S.note(GB, 'news.rival', { studio: 'R' }, 'info');
  S.note(GB, 'news.rival', { studio: 'R2' }, 'info');
  ok(GB.news[1].big === 1 && !GB.news[0].big, 'första rivalen är en milstolpe, nästa inte');
  // olästa: nyheter nyare än G.flags.newsRead
  ok(S.unreadNews(GB) === 0, 'ett nytt spel börjar utan olästa nyheter');
  GB.t += 10;
  S.note(GB, 'news.lowCash', {}, 'bad');
  S.note(GB, 'news.chartIn', { title: 'T', n: 40 }, 'info');
  ok(S.unreadNews(GB) === 1, 'bara viktiga nyheter räknas som olästa');
  // ett stängt kort markerar bara sin egen nyhet som läst
  const a = GB.news.find((x) => x.key === 'news.lowCash');
  a.seen = 1;
  ok(S.unreadNews(GB) === 0, 'ett stängt kort sänker räknaren med ett');
  GB.t += 5;
  S.note(GB, 'news.debt', { n: 2 }, 'bad');
  S.note(GB, 'news.quit', { name: 'N' }, 'bad');
  ok(S.unreadNews(GB) === 2, 'nya viktiga nyheter räknas upp');
  GB.news[0].seen = 1;
  ok(S.unreadNews(GB) === 1, 'att stänga det nyare kortet först tar bara bort det kortet');
  GB.flags.seenNews = GB.t;
  ok(S.unreadNews(GB) === 0, 'olästa nollas när loggen läses');
  // en lägre skiva än studions finaste är inte viktig, trots att den är kind award
  S.note(GB, 'news.cert', { title: 'T', cert: { sv: 'a', en: 'a' }, n: '1' }, 'award', true, false);
  ok(!GB.news[0].big, 'note kan stänga av big');
  // flaggan ändrar inget i spelet: samma sparning laddar och loggen får bara ett extra fält
  ok(JSON.parse(JSON.stringify(GB.news)).length === GB.news.length, 'nyhetsloggen kan sparas som JSON');
}
// hårdvarans namn, revisioner (Pro och Slim), egna komponenter i konsolen och specifikationer som följer tiden
{
  const GR = S.newGame({ studio: 'R', seed: 31 }); S.makeCompetitors(GR); S.initWorld(GR);
  GR.t = 48 * 30; GR.money = 5e9; GR.fans = 300000;
  Object.assign(GR.u.flags, { hw: true, hw_gpu: true, hw_cpu: true, hw_pc: true, hw_lowpow: true, hw_handheld: true, hw_console: true });
  GR.t++; S.hwWeek(GR);
  const H = GR.hw;
  S.upgradeLab(GR); S.upgradeLab(GR);
  const week = (n = 1) => { for (let i = 0; i < n; i++) { GR.t++; S.hwWeek(GR); } };
  const make = (spec, partner, units) => {
    if (S.startDesign(GR, spec) !== true) return null;
    const J = H.projects[H.projects.length - 1];
    J.done = J.weeks - 1;
    for (let i = 0; i < 4 && J.state === 'design'; i++) week();
    if (J.state === 'fail') S.resolveProto(GR, J.id, 'ship');
    if (S.launch(GR, J.id, { partner, units }) !== true) return null;
    const P = H.products.find((x) => x.id === J.id);
    for (let i = 0; i < 40 && P.state === 'prod'; i++) week();
    return P;
  };
  // namn
  ok(S.cleanName('  Nova   <b>Prime  ') === 'Nova Prime' && S.cleanName('A < B') === 'A B' && S.cleanName('x'.repeat(40)).length === S.NAME_MAX, 'namnet rensas: taggar och taggtecken bort, mellanslag hopdragna, högst 24 tecken');
  const gpu = make({ type: 'gpu', cls: 'mid', name: 'Nova  Prime' }, 'meridian', 20000);
  ok(gpu && gpu.name === 'Nova Prime' && gpu.custom && gpu.state === 'market', 'ett eget namn följer med från designen till produkten');
  ok(S.suggestName(GR, 'gpu', 'mid').name === 'Nova Prime 2' && S.suggestName(GR, 'cpu', 'mid').name === 'Quark 1', 'efterföljaren till en produkt med eget namn föreslås med nästa nummer, andra linjer behåller standardnamnet');
  ok(S.renameHw(GR, gpu.id, '   ') === 'hw.name.empty' && gpu.name === 'Nova Prime', 'ett tomt namn nekas');
  // specifikationer följer året, och prestandamålet skalar dem
  {
    const a = S.specsOf(GR, gpu, 2000)[0].tflops, b = S.specsOf(GR, gpu, 2020)[0].tflops;
    ok(a > 0 && b > a * 100, 'grafikkraften växer med åren (' + a.toFixed(3) + ' till ' + b.toFixed(1) + ' TFLOPS)');
  }
  // revisioner
  ok(S.canRevise(GR, gpu, 'pro') === 'hw.rev.e.age' && S.revWait(GR, gpu) > 0, 'en revision väntar ett halvår efter lanseringen');
  week(S.REV_MIN_AGE);
  const cost = S.revCost(GR, gpu, 'pro');
  ok(cost > 0 && S.canRevise(GR, gpu, 'pro') === true, 'efter ett halvår går en revision att påbörja');
  const before = S.relPerf(GR, gpu);
  const m1 = GR.money;
  ok(S.reviseProduct(GR, gpu.id, 'pro') === true && Math.abs(m1 - GR.money - cost) < 1 && gpu.up, 'en revision betalas när den börjar');
  ok(S.canRevise(GR, gpu, 'slim') === 'hw.rev.e.busy' && S.reviseProduct(GR, gpu.id, 'slim') === 'hw.rev.e.busy', 'bara en revision åt gången');
  week(S.revWeeks(GR, { ...gpu }, 'pro') + 1);
  ok(!gpu.up && gpu.revs.length === 1 && gpu.name === 'Nova Prime Ti', 'revisionen blir klar och namnet får sitt tillägg');
  const after = S.relPerf(GR, gpu);
  ok(after > before * 1.05, 'Pro lyfter prestandan mot marknaden (' + before.toFixed(2) + ' till ' + after.toFixed(2) + ')');
  {
    // specraden stiger med revisionen i stället för att följa det marknadsrelativa talet
    const s1 = S.specsOf(GR, gpu)[0], s0 = S.specsOf(GR, { ...gpu, sf: undefined, perf0: gpu.sf / 1.12 })[0];
    ok(gpu.sf > 0 && s1.tflops > s0.tflops * 1.2, 'specraden stiger efter en Pro-revision (' + s0.tflops.toFixed(2) + ' till ' + s1.tflops.toFixed(2) + ' TFLOPS)');
  }
  {
    const u = S.unitCost(GR, gpu, gpu.partner), rv = gpu.revUnit;
    delete gpu.revUnit;
    const u0 = S.unitCost(GR, gpu, gpu.partner);
    gpu.revUnit = rv;
    ok(Math.abs(u / u0 - 1.06) < 1e-9, 'Pro gör enheten 6 % dyrare');
  }
  ok(S.canRevise(GR, gpu, 'slim') === 'hw.rev.e.age', 'det går ett halvår till nästa revision');
  week(S.REV_MIN_AGE);
  ok(S.reviseProduct(GR, gpu.id, 'slim') === true, 'en kostnadsrevision går att göra efteråt');
  week(30);
  {
    const u = S.unitCost(GR, gpu, gpu.partner), rv = gpu.revUnit;
    delete gpu.revUnit;
    const u0 = S.unitCost(GR, gpu, gpu.partner);
    gpu.revUnit = rv;
    ok(gpu.revs.length === 2 && Math.abs(u / u0 - 1.06 * 0.88) < 1e-9 && gpu.lifeAdd === 1.5, 'Slim sänker kostnaden 12 % och förlänger livscykeln');
  }
  ok(S.revCount(gpu, 'pro') === 1 && S.canRevise(GR, { ...gpu, state: 'prod' }, 'pro') === 'hw.rev.e.state', 'bara produkter som säljer går att uppgradera');
  // egna komponenter i en konsol: namn i specifikationen och lägre enhetskostnad
  const con = make({ type: 'console', cls: 'mid', name: 'Orion' }, 'meridian', 60000);
  ok(con && con.name === 'Orion' && con.parts && con.parts.includes('gpu'), 'konsolen byggs med din egen grafikkrets');
  {
    const rows = S.specsOf(GR, con);
    ok(rows[0].k === 'cpu' && rows[1].k === 'gpu' && rows[1].name === gpu.name && rows.length === 4, 'specifikationen visar komponenternas namn');
    const a = S.unitCost(GR, con, 'meridian'), b = S.unitCost(GR, { ...con, parts: [] }, 'meridian');
    ok(Math.abs(a / b - 0.95) < 1e-9, 'varje egen komponent sänker enhetskostnaden 5 %');
  }
  // plattformen: namnbyte slår igenom i spelet, och marknadsplatsen räknas bland de andra
  ok(S.renameHw(GR, con.id, 'Orion Max') === true && PLATFORM[con.plat].name === 'Orion Max' && S.platOf(GR, con).name === 'Orion Max', 'en plattform som byter namn byter det överallt');
  const pos = S.platPosition(GR, con);
  ok(pos && pos.rank >= 1 && pos.rank <= pos.of && pos.share > 0 && pos.share <= 1, 'plattformens marknadsplats (#' + (pos && pos.rank) + ' av ' + (pos && pos.of) + ')');
  // revisionen tar med sig en plattform: namnet följer
  week(S.REV_MIN_AGE);
  ok(S.reviseProduct(GR, con.id, 'pro') === true, 'även en konsol kan få en Pro-revision');
  week(40);
  ok(con.revs.length === 1 && con.name === 'Orion Max Pro' && PLATFORM[con.plat].name === 'Orion Max Pro', 'plattformens namn följer revisionen');
  // fuskade spel räknas inte i studiohallen
  GR.flags.cheat = 1;
  ok(recordRun(GR) === null, 'ett fuskat spel kommer inte in i studiohallen');
  // och allt går att spara
  const back = JSON.parse(JSON.stringify(GR.hw));
  ok(back.products.find((x) => x.id === gpu.id).revs.length === 2, 'revisionerna följer med sparningen');
}
// studiomål
{
  const GG = S.newGame({ studio: 'Goal', seed: 11 });
  ok(JSON.stringify(S.activeGoals(GG).map((x) => x.id)) === '["first_game","research1","score6"]', 'tre aktiva mål från start');
  ok(S.goalProg(GG, S.activeGoals(GG)[0]).pct === 0, 'framsteget börjar på noll');
  const got = [];
  const off = (await import('../src/core/bus.js')).on('goal', (e) => got.push(e));
  GG.games.push({ id: 1, title: 'A', score: 5, revenue: 5000, scope: 'small' });
  GG.stats.bestScore = 5;
  const rp0 = GG.rp, m0 = GG.money, f0 = GG.fans;
  S.checkGoals(GG);
  ok(S.goalDone(GG, 'first_game') && !S.goalDone(GG, 'research1'), 'ett nått mål klaras och ett ej nått väntar');
  ok(GG.rp === rp0 + 3 && GG.money === m0 + 1200 && GG.fans === f0, 'belöningen betalas ut en gång');
  ok(got.length === 1 && got[0].goal.id === 'first_game' && got[0].reward.money === 1200, 'mål-händelsen bär målet och belöningen');
  ok(GG.news[0].key === 'news.goal', 'målet står i krönikan');
  S.checkGoals(GG);
  ok(GG.rp === rp0 + 3 && got.length === 1, 'ett klart mål betalas aldrig två gånger');
  // betyg 7 når score6, och score7 väntar tills det är aktivt: båda klaras i samma kontroll när platsen finns
  GG.stats.bestScore = 7;
  ok(!S.goalDone(GG, 'score6') && S.goalProg(GG, S.activeGoals(GG).find((x) => x.id === 'score6')).ok, 'score6 är nått och aktivt');
  S.checkGoals(GG);
  ok(S.goalDone(GG, 'score6') && !S.goalDone(GG, 'score7') && got.length === 2, 'score6 klaras, score7 väntar på sin plats i listan');
  ok(S.activeGoals(GG).some((x) => x.id === 'hire1') && S.activeGoals(GG).length === 3, 'nya mål fyller platserna');
  ok(S.goalReward(GG, S.activeGoals(GG)[0]).money === undefined || S.goalReward(GG, S.activeGoals(GG)[0]).money > 0, 'belöningen är ett positivt belopp');
  // pengarna skalas med året
  const late = S.newGame({ studio: 'L', seed: 3 });
  late.t = 48 * 20;
  const gx = S.activeGoals(late)[0];
  ok(S.goalReward(late, gx).money > gx.reward.money, 'belöningen i pengar växer med året');
  // en gammal sparning får det som redan är gjort som klart utan belöning
  const old = S.newGame({ studio: 'O', seed: 4 });
  for (let i = 0; i < 9; i++) old.games.push({ id: i + 1, title: 'g' + i, score: 8.5, revenue: 2e6, scope: 'large' });
  old.stats.bestScore = 8.5;
  old.fans = 6000;
  const rpO = old.rp, mO = old.money;
  S.seedGoals(old);
  ok(['first_game', 'games3', 'score8', 'fans5k', 'large', 'rev1m', 'games8'].every((id) => S.goalDone(old, id)), 'seedGoals räknar redan nådda mål som klara');
  ok(old.rp === rpO && old.money === mO, 'seedGoals ger ingen belöning');
  // allt går att spara och ladda
  ok(JSON.parse(JSON.stringify(GG)).goals.done.includes('first_game'), 'klara mål följer med sparningen');
  // onlinemålet visas först när forskningen är gjord
  ok(!S.activeGoals(late, 99).some((x) => x.id === 'live1') && !S.activeGoals(late, 99).some((x) => x.id === 'hw1'), 'onlinespel- och hårdvarumålet väntar på forskningen');
  off();
}

// ── Verkliga förebilder: förlag, spelserier och konsoler med påhittade namn ──
{
  const names = new Set(COMPETITORS.map((c) => c[0]));
  ok(COMPETITORS.length === 14, 'fjorton förlag (slumpföljden i makeCompetitors hänger på antalet)');
  ok(FRANCHISES.every((f) => names.has(f.by) && TOPIC[f.topic] && GENRE[f.genre]), 'varje spelserie hör till ett förlag och har ett riktigt tema och en riktig genre');
  ok(new Set(FRANCHISES.map((f) => f.id)).size === FRANCHISES.length && FRANCHISES.every((f) => FRANCHISE[f.id] === f), 'spelserierna har egna id:n');
  ok([...names].every((n) => FRANCHISES.filter((f) => f.by === n).length >= 4), 'varje förlag har minst fyra spelserier');
  const fb = FRANCHISE.footballuniverse, gl = FRANCHISE.grandlarceny, mu = FRANCHISE.mustache, sp = FRANCHISE.speedfever;
  ok(frTitle(fb, 12, 2004).en === 'Football Universe 2004', 'en årsserie får årtalet i titeln');
  ok(frTitle(gl, 0, 1997).en === 'Grand Larceny Auto' && frTitle(gl, 2, 2002).en === 'Grand Larceny Auto III', 'en serie med romerska siffror börjar utan siffra');
  ok(frTitle(sp, 1, 1995).en === 'Speed Fever 2' && frTitle(mu, 1, 1990).en.startsWith('Super Mustache Bros: '), 'siffror eller undertitel för uppföljare');
  ok(PLATFORM.nova32.name === 'Gamingstation' && PLATFORM.nova5.name === 'Gamingstation 5' && PLATFORM.phone.name === 'Pear Phone', 'konsolerna har namn med verkliga förebilder');
  // en spelad värld: serier syns bland släppen, titlarna är unika och ryktet har titeln
  const W = S.newGame({ studio: 'F', seed: 11 });
  S.makeCompetitors(W);
  S.initWorld(W);
  let guardF = 0;
  while (S.yearOf(W.t) < 2006 && guardF++ < 1e6) { W.pending.length = 0; S.stepTick(W); }
  const rel = W.market.releases;
  const seen = rel.filter((r) => r.fr);
  ok(seen.length >= 10 && seen.length < rel.length, `en del av släppen är spelserier (${seen.length} av ${rel.length})`);
  ok(seen.every((r) => FRANCHISE[r.fr] && r.title.en.startsWith(FRANCHISE[r.fr].name) && r.studio === FRANCHISE[r.fr].by), 'titeln och förlaget hör ihop med serien');
  ok(seen.every((r) => r.topic === FRANCHISE[r.fr].topic && r.genre === FRANCHISE[r.fr].genre), 'seriens tema och genre följer med släppet');
  const titles = rel.map((r) => r.title.en);
  ok(new Set(titles).size === titles.length, 'inga två släpp har samma titel');
  ok(W.comps.every((c) => !c.next || !c.next.fr || (c.next.title && c.next.title.en && c.next.topic === FRANCHISE[c.next.fr].topic)), 'ryktet om ett seriesläpp har titeln och seriens tema');
  // en gammal sparning: förlag med gamla namn och utan seriernas räknare får vanliga titlar och kraschar inte
  const OLD = S.newGame({ studio: 'O', seed: 12 });
  S.makeCompetitors(OLD);
  S.initWorld(OLD);
  for (const c of OLD.comps) { c.name = 'Gammalt förlag ' + c.id; delete c.frN; delete c.frT; delete c.next; }
  guardF = 0;
  while (S.yearOf(OLD.t) < 1990 && guardF++ < 1e6) { OLD.pending.length = 0; S.stepTick(OLD); }
  ok(OLD.market.releases.length > 5 && OLD.market.releases.every((r) => !r.fr), 'gamla förlag utan serier får vanliga titlar');
}

// ── E-sport och fler sorters onlinespel ──
{
  // sorten följer tema och genre, och varje sort har egna tävlingar
  ok(kindOf('survival', 'action') === 'survival' && kindOf('zombies', 'shooter') === 'survival', 'överlevnadstemat ger ett överlevnadsspel');
  ok(kindOf('farming', 'casual') === 'farm' && kindOf('sports', 'simulation') === 'sports' && kindOf('fantasy', 'shooter') === 'shooter', 'odling, sport och skjutspel känns igen');
  ok(kindOf('fantasy', 'rpg') === 'mmo' && kindOf('space', 'strategy') === 'arena' && kindOf('abstract', 'casual') === 'party' && kindOf('fantasy', 'racing') === 'sports', 'rollspel blir MMO, strategi arena, casual partyspel');
  ok(KINDS.length === 7 && KINDS.every((k) => etypesOf(k.id).length >= 1 && ETYPES.filter((e) => e.kind === k.id).length === etypesOf(k.id).length), 'sju sorter med minst en tävling var');
  ok(S.liveScopesFor('mmo').join() === 'large,aaa' && S.liveScopesFor('survival').includes('medium') && S.liveScopesFor(undefined).join() === 'large,aaa', 'ett MMO kräver Stor, andra sorter går i Medel');

  const mkOnline = (kind, year = 2012, subs = 200000, score = 8) => {
    const GE = JSON.parse(JSON.stringify(G));
    GE.pending = [];
    GE.t = 48 * (year - 1980) + 5;
    GE.money = 1e9;
    GE.games.push({ id: 7900, title: 'E', t: GE.t - 20, score, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
    const g = GE.games[GE.games.length - 1];
    S.launchLive(GE, g, kind);
    g.live.subs = subs;
    g.live.pot = subs * 1.25 * (KIND[kind] ? KIND[kind].pot : 1);
    return [GE, g];
  };
  // en säsong som startade för `ago` veckor sedan (raidrusningen följer säsongen)
  const inSeason = (GE, g, ago = 0) => { g.live.season = { id: 'story', t: GE.t - ago, until: GE.t - ago + 12, subs0: g.live.subs, q: 1, share: 0, cost: 0 }; };
  // sorten ändrar potentialen och hur fort innehållet åldras; utan sort är det ett MMO
  const [, gm] = mkOnline('mmo');
  const [, gf] = mkOnline('farm');
  const [, gn] = mkOnline(undefined);
  const [GSh, gsh] = mkOnline('shooter');
  const [GMm, gmm] = mkOnline('mmo');
  ok(Math.abs(gf.live.pot / gm.live.pot - 0.75) < 0.01 && gf.live.kind === 'farm' && gn.live.kind === undefined && gn.live.pot === gm.live.pot, 'odlingsspelet drar färre spelare, ett spel utan sort är som ett MMO');
  S.liveWeek(GSh); S.liveWeek(GMm);
  ok(gsh.live.fresh < gmm.live.fresh && Math.abs((100 - gmm.live.fresh) - 1.1) < 1e-9, 'innehållet i ett skjutspel blir gammalt fortare än i ett MMO');
  ok(S.costPerSub(GSh, gsh.live) > S.costPerSub(GMm, gmm.live), 'driften av ett skjutspel kostar mer per spelare');

  // avkastningen: ett lagom event lönar sig, att satsa allt gör det inte, och ett för litet spel går back
  const [GP, gp] = mkOnline('mmo');
  const best = S.espBestPrize(GP, gp, 'race', 0, 0);
  const planBest = S.esportPlan(GP, gp, 'race', best, 0, 0);
  const planMax = S.esportPlan(GP, gp, 'race', 4, 2, 2);
  ok(best >= 0 && best <= 3 && planBest.roi >= 1.3 && S.espRating(planBest.roi) !== 'bad', `ett lagom event ger mer än pengarna tillbaka (${planBest.roi.toFixed(2)} gånger, nivå ${best})`);
  ok(planMax.roi < 1 && planMax.net < planBest.net && planMax.cost.total > planBest.cost.total * 3, 'att satsa allt på en gång går back och ger mindre vinst än lagom');
  ok(planBest.viewers > 1000 && planBest.newPlayers > 100 && planBest.sponsors > 0 && planBest.cost.total === planBest.cost.prize + planBest.cost.prod + planBest.cost.mkt, 'förhandsvisningen har tittare, nya spelare, sponsorer och kostnad');
  const [GT, gt] = mkOnline('mmo', 2003, 4000);
  ok([0, 1, 2, 3, 4].every((i) => S.esportPlan(GT, gt, 'race', i, 0, 0).roi < 1.3) && S.esportPlan(GT, gt, 'race', 2, 1, 1).roi < 1, 'ett litet spel tidigt går back med de flesta nivåer');
  const [GOld, go] = mkOnline('mmo', 1999, 100000);
  ok(S.esportPlan(GOld, go, 'race', 2, 0, 0).roi < S.esportPlan(GP, gp, 'race', 2, 0, 0).roi, 'e-sporten är lönsammare med åren (tidens räckvidd växer)');
  ok([1, 2, 3].every((i) => S.esportPlan(GP, gp, 'race', i, 0, 0).viewers < S.esportPlan(GP, gp, 'race', i + 1, 0, 0).viewers) && S.esportPlan(GP, gp, 'race', 4, 0, 0).viewers < S.esportPlan(GP, gp, 'race', 0, 0, 0).viewers * 12, 'större prispengar ger fler tittare men med avtagande effekt');
  const kt = (kind, ty) => S.esportPlan(...mkOnline(kind), ty, 2, 0, 0).viewers;
  ok(kt('arena', 'bracket') > kt('farm', 'harvest') * 2, 'ett arenaspel drar många fler tittare än ett odlingsspel');

  // ett event från start till slut
  const [GR, gr] = mkOnline('mmo');
  inSeason(GR, gr);
  const rngBefore = GR.rng;
  const m0 = GR.money, s0 = gr.live.subs, f0 = GR.fans;
  ok(S.startEsport(GR, gr.id, 'dungeon', 99, 0, 0) === false && S.startEsport(GR, gr.id, 'bracket', 2, 0, 0) === false, 'ogiltiga val och en tävling från en annan sort nekas');
  const plan = S.esportPlan(GR, gr, 'race', 2, 1, 0);
  ok(S.startEsport(GR, gr.id, 'race', 2, 1, 0) === true && GR.money === m0 - plan.cost.total && gr.live.esp.cur && gr.live.esp.cur.weeks === 3, 'eventet startar och kostar prispengar, sändning och marknadsföring');
  ok(typeof S.startEsport(GR, gr.id, 'race', 2, 1, 0) === 'string' && S.canEsport(GR, gr) !== true, 'ett event i taget i samma spel');
  let guardE = 0;
  while (gr.live.esp.cur && guardE++ < 20) { S.esportsWeek(GR); GR.t++; }
  const E = gr.live.esp;
  ok(!E.cur && GR.stats.esports === 1 && E.log.length === 1 && E.log[0].type === 'race' && GR.stats.esportViewers > 1000, 'eventet blir klart efter sina veckor och loggas');
  ok(Math.abs(E.log[0].viewers - plan.viewers) / plan.viewers < 0.25, 'tittarsiffran hamnar nära förhandsvisningen (spänningen avgör resten)');
  ok(gr.live.subs > s0 && GR.fans > f0 && GR.money > m0 - plan.cost.total, 'nya spelare, fans och sponsorintäkter kommer in');
  ok(GR.rng === rngBefore, 'e-sporten drar aldrig ur spelets slumptalsföljd');
  ok(E.scene > 0 && gr.live.eLift > 1 && GR.news.some((n) => n.key === 'esp.news.end') && GR.month.breakdown.esports !== undefined, 'scenen växer, lyfter spelarna och eventet blir en nyhet och en egen post i ekonomin');
  ok(S.canEsport(GR, gr) !== true && S.espReadyIn(GR, gr.live) > 0, 'efter eventet vilar spelarna ett tag');
  const sceneNow = E.scene;
  for (let i = 0; i < 10; i++) { S.esportsWeek(GR); GR.t++; }
  ok(E.scene < sceneNow && S.espReadyIn(GR, gr.live) === 0 && S.canEsport(GR, gr) === true, 'scenen sjunker sakta utan event och vilan tar slut');
  // tradition: samma tävling igen drar fler
  ok(S.esportPlan(GR, gr, 'race', 2, 1, 0).viewers > S.esportPlan(GR, { ...gr, live: { ...gr.live, esp: { ...E, scene: 0, trad: {} } } }, 'race', 2, 1, 0).viewers, 'scen och tradition ger fler tittare nästa gång');
  // samma slump i två identiska spel
  const [GA, ga] = mkOnline('mmo');
  const [GB, gb] = mkOnline('mmo');
  inSeason(GA, ga); inSeason(GB, gb);
  S.startEsport(GA, ga.id, 'race', 2, 1, 0); S.startEsport(GB, gb.id, 'race', 2, 1, 0);
  for (let i = 0; i < 4; i++) { S.esportsWeek(GA); GA.t++; S.esportsWeek(GB); GB.t++; }
  ok(ga.live.esp.log[0].viewers === gb.live.esp.log[0].viewers && ga.live.esp.log[0].winner === gb.live.esp.log[0].winner, 'två lika spel ger samma utfall (slumpen är en hash av fröet)');

  // raidrusningen följer säsongen: bara de första veckorna av en ny säsong, en gång per säsong, och utan att vänta på vilan
  const [GN1, gn1] = mkOnline('mmo');
  ok(typeof S.startEsport(GN1, gn1.id, 'race', 1, 0, 0) === 'string' && !(gn1.live.esp && gn1.live.esp.cur), 'raidrusningen startar inte utan en säsong');
  ok(S.startEsport(GN1, gn1.id, 'dungeon', 1, 0, 0) === true, 'nyckelstegen går att köra utan säsong');
  const [GN2, gn2] = mkOnline('mmo');
  inSeason(GN2, gn2, 9);
  ok(typeof S.startEsport(GN2, gn2.id, 'race', 1, 0, 0) === 'string' && S.espTypeBlock(GN2, gn2, 'race') === 'late', 'raidrusningen startar inte sent i säsongen');
  const [GN3, gn3] = mkOnline('mmo');
  inSeason(GN3, gn3, 1);
  ok(S.espTypeBlock(GN3, gn3, 'race') === '' && S.espTypeBlock(GN3, gn3, 'dungeon') === '', 'raidrusningen kan starta i början av säsongen');
  // en vilande efter nyckelstegen hindrar inte raidrusningen
  S.startEsport(GN3, gn3.id, 'dungeon', 1, 0, 0);
  let gN = 0; while (gn3.live.esp.cur && gN++ < 20) { S.esportsWeek(GN3); GN3.t++; }
  inSeason(GN3, gn3, 3);
  ok(S.espReadyIn(GN3, gn3.live) > 0 && S.canEsport(GN3, gn3, 'dungeon') !== true && S.canEsport(GN3, gn3, 'race') === true, 'raidrusningen väntar inte på vilan efter ett annat event');
  ok(S.startEsport(GN3, gn3.id, 'race', 1, 0, 0) === true, 'raidrusningen startar mitt i vilan');
  const C3 = gn3.live.esp.cur;
  ok(C3.field.length === 10 && new Set(C3.field.map((x) => x.name)).size === 10, 'tio olika gillen tävlar');
  ok(S.raceStanding(C3).every((r) => r.boss === 0) && S.raceStanding(C3).length === 10, 'alla börjar på noll bossar');
  const seen = [];
  gN = 0;
  while (gn3.live.esp.cur && gN++ < 20) { S.esportsWeek(GN3); GN3.t++; const c = gn3.live.esp.cur; if (c) seen.push(S.raceStanding(c)); }
  const log3 = gn3.live.esp.log[0];
  const fin = S.raceStanding({ ...C3, w: C3.weeks });
  ok(log3.type === 'race' && log3.winner === fin[0].name && fin[0].boss === 8 && fin.slice(1).every((r) => r.boss < 8), 'det starkaste gillet klarar alla bossar först och vinner');
  ok(seen.length >= 1 && seen.every((r) => r.every((x) => x.boss < 8)) && seen.every((r) => r.every((x, i) => i === 0 || r[i - 1].boss >= x.boss)), 'mitt i raiden har ingen klarat allt och listan är sorterad');
  ok(S.espTypeBlock(GN3, gn3, 'race') === 'done' && typeof S.startEsport(GN3, gn3.id, 'race', 1, 0, 0) === 'string', 'raidrusningen körs en gång per säsong');
  ok(GN3.news.filter((n) => n.key === 'esp.news.raceOpen').length === 1, 'raidmeddelandet kom en gång, när säsongen öppnade raiden, och inte igen efter att den körts');
  // en ny säsong ger ett meddelande en gång, och det återkommande eventet väntar tyst på säsongen
  const [GN4, gn4] = mkOnline('mmo');
  S.setEsportAuto(GN4, gn4.id, { type: 'race', i: 1, p: 0, m: 0 });
  for (let i = 0; i < 4; i++) { S.esportsWeek(GN4); GN4.t++; }
  ok(!gn4.live.esp.cur && gn4.live.esp.autoWarn === 0 && GN4.news.filter((n) => n.key === 'esp.news.autoPaused').length === 0, 'ett återkommande race väntar tyst utan säsong');
  inSeason(GN4, gn4, 0);
  S.esportsWeek(GN4);
  ok(gn4.live.esp.cur && gn4.live.esp.cur.type === 'race' && gn4.live.esp.cur.field.length === 10, 'ett återkommande race startar när säsongen börjar');
  const [GN5, gn5] = mkOnline('mmo');
  inSeason(GN5, gn5, 0);
  S.esportsWeek(GN5); S.esportsWeek(GN5);
  ok(GN5.news.filter((n) => n.key === 'esp.news.raceOpen').length === 1, 'en ny säsong ger ett raidmeddelande en gång');
  const [GN6, gn6] = mkOnline('farm');
  inSeason(GN6, gn6, 0);
  S.esportsWeek(GN6);
  ok(GN6.news.filter((n) => n.key === 'esp.news.raceOpen').length === 0, 'andra sorter får inget raidmeddelande');

  // krav: spelare, pengar och att spelet lever
  const [GS2, gs2] = mkOnline('mmo', 2012, 1000);
  ok(typeof S.canEsport(GS2, gs2) === 'string' && S.startEsport(GS2, gs2.id, 'race', 0, 0, 0) !== true, 'ett spel med för få spelare kan inte arrangera event');
  const [GM2, gm2] = mkOnline('mmo');
  GM2.money = 100;
  ok(S.startEsport(GM2, gm2.id, 'race', 2, 0, 0) !== true && !(gm2.live.esp && gm2.live.esp.cur) && GM2.money === 100, 'utan pengar startar inget event');

  // återkommande event
  const [GU, gu] = mkOnline('mmo');
  ok(S.setEsportAuto(GU, gu.id, { type: 'dungeon', i: 1, p: 0, m: 0 }) === true && S.setEsportAuto(GU, gu.id, { type: 'nej', i: 1, p: 0, m: 0 }) === false, 'återkommande event sätts upp, ogiltiga val nekas');
  S.esportsWeek(GU);
  ok(gu.live.esp.cur && gu.live.esp.cur.type === 'dungeon', 'ett återkommande event startar direkt när spelet inte vilar');
  let guardU = 0;
  while (gu.live.esp.cur && guardU++ < 20) { S.esportsWeek(GU); GU.t++; }
  S.esportsWeek(GU);
  ok(!gu.live.esp.cur && S.espReadyIn(GU, gu.live) > 0, 'inget nytt event under vilan');
  const GU2 = JSON.parse(JSON.stringify(GU));
  const gu2 = GU2.games.find((x) => x.id === 7900);
  GU.t = gu.live.esp.ready;
  S.esportsWeek(GU);
  ok(gu.live.esp.cur && gu.live.esp.cur.type === 'dungeon' && gu.live.esp.n === 2, 'ett återkommande event startar när vilan är slut');
  gu2.live.esp.ready = GU2.t - 1;
  GU2.money = 10;
  S.esportsWeek(GU2);
  S.esportsWeek(GU2);
  ok(gu2.live.esp.autoWarn === 1 && GU2.news.filter((n) => n.key === 'esp.news.autoPaused').length === 1, 'när kassan inte räcker sägs det en gång');
  ok(S.setEsportAuto(GU2, gu2.id, null) === true && !gu2.live.esp.auto, 'återkommande event går att stänga av');

  // en gammal sparning: onlinespel utan e-sport och utan sort laddar och räknar
  const [GOl, gol] = mkOnline(undefined);
  delete gol.live.esp;
  delete gol.live.eLift;
  S.liveWeek(GOl); S.esportsWeek(GOl);
  ok(gol.live.subs > 0 && gol.live.eLift === undefined && S.kindOfGame(gol).id === 'mmo' && S.liveFactors(GOl, gol).esports === 1, 'gamla onlinespel utan e-sport och sort räknas som MMO utan e-sportlyft');
  ok(S.esportPlan(GOl, gol, 'race', 2, 0, 0).viewers > 0 && !gol.live.esp, 'förhandsvisningen skapar inget i spelet');
}
// ── Forskningsteam: ny teknik (forskningspoäng) och recept (receptnivå) ──────────────
{
  const mk = () => {
    const W = S.newGame({ studio: 'R', seed: 77 }); S.makeCompetitors(W); S.initWorld(W);
    W.t = 48 * 24; W.money = 5e7; W.fans = 80000; W.office.tier = 4; W.office.fac.lab = { lvl: 3, slot: 0 };
    for (let i = 0; i < 9; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
    return W;
  };
  const GR = mk();
  const crew = GR.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(GR);
  for (const x of crew.slice(0, 4)) S.addMember(GR, T.id, x.id);
  ok(S.assignRes(GR, T.id, 'tech') !== true && S.canRes(GR, T, 'tech') === 'resLocked', 'ett forskningsteam kräver forskningen Forskningsteam');
  GR.u.flags.resTeams = true;
  ok(S.canRes(GR, T, 'nej') === 'resFocus', 'okänd inriktning nekas');
  const GRnoLab = mk(); GRnoLab.office.fac = {}; GRnoLab.u.flags.resTeams = true;
  const Tn = S.createTeam(GRnoLab); for (const x of GRnoLab.staff.filter((q) => !q.isFounder).slice(0, 4)) S.addMember(GRnoLab, Tn.id, x.id);
  ok(S.canRes(GRnoLab, Tn, 'recipe') === 'noSeats', 'utan labb finns inga platser för ett forskningsteam');
  // teknik: samma personer ger mer forskningspoäng i labbet än vid skrivborden
  const rpDesk = S.rpPerWeek(GR);
  const rngBefore = GR.rng;
  ok(S.assignRes(GR, T.id, 'tech') === true && T.role === 'res' && T.target === 'tech' && T.members.every((id) => GR.staff.find((x) => x.id === id).out), 'teamet flyttar in i labbet (utanför huset)');
  const rpAfter0 = S.rpPerWeek(GR);
  S.resWeek(GR);
  const rpTeam = S.rpPerWeek(GR);
  const deskRp = crew.slice(0, 4).reduce((a, x) => a + x.research, 0) * 0.05 * S.labMult(GR) * S.TICKS_PER_WEEK;
  ok(GR.resRp > 0 && rpTeam - rpAfter0 > deskRp * 0.3 && rpTeam - rpAfter0 < deskRp * (1 + S.RES_RP) + 1e-6, 'ett teknikteam ger mer forskningspoäng än samma personer vid skrivborden, men inte oändligt mycket');
  ok(rpTeam > rpDesk - deskRp, 'forskningspoängen från teamet räknas in i veckotakten');
  ok(T.resW === 1 && GR.rng === rngBefore, 'forskningsteamet drar aldrig ur slumptalsföljden');
  ok(GR.resTech > 0 && Math.abs(S.techLead(GR) - (1 + S.RES_TECH * GR.resTech)) < 1e-12 && S.techLead(GR) > 1 && S.techLead(GR) <= 1 + S.RES_TECH, 'ett teknikteam ger alla spel lite mer teknik (högst ' + S.RES_TECH * 100 + ' %)');
  const T2 = S.createTeam(GR); for (const x of crew.slice(4, 8)) S.addMember(GR, T2.id, x.id);
  ok(S.canRes(GR, T2, 'tech') === 'resTaken' && S.canRes(GR, T2, 'recipe') === true, 'en inriktning har bara ett team');
  GR.u.flags.training = true; GR.u.flags.autoTeams = true;
  ok(S.canTrainTeam(GR, T) === 'role' && S.canMission(GR, T, 'new') === 'roleGame', 'ett forskningsteam går inte på kurs eller tar spelprojekt');
  // recept: nivå efter nivå, bara kunskap
  ok(S.assignRes(GR, T2.id, 'recipe') === true, 'ett andra team tar receptet');
  ok(S.recipeLevel(GR) === 0 && !S.focusKnown(GR, 'strategy') && S.comboKnown(GR, 'fantasy', 'rpg') === 0, 'före receptkunskapen är inget känt');
  const eff = S.resEff(GR, T2);
  ok(eff > 0.3 && eff <= 1, 'effekten är mellan 0 och 1 och beror på teamets skicklighet (' + eff.toFixed(2) + ')');
  let w = 0;
  while (S.recipeLevel(GR) < 1 && w++ < 400) S.resWeek(GR);
  ok(S.recipeLevel(GR) === 1 && Math.abs(w - S.RCP_LEVEL_PTS / eff) < 4 && GR.news.some((n) => n.key === 'news.recipeLevel1'), 'nivå 1 efter ' + w + ' veckor (en nivå tar minst ' + S.RCP_LEVEL_PTS + ' veckor) och en nyhet');
  ok(S.focusKnown(GR, 'strategy') && GR.know.focus.strategy === undefined, 'nivå 1: idealfördelningen är känd för alla genrer utan att ha släppt något');
  const startF = S.startFocus(GR, 'strategy', null);
  ok(JSON.stringify(startF) === JSON.stringify(S.defaultFocus(GR, 'strategy', null)), 'nya projekt börjar med idealfördelningen');
  ok(S.comboKnown(GR, 'fantasy', 'rpg') === 0, 'nivå 1 visar ännu inte matchningen');
  while (S.recipeLevel(GR) < 2 && w++ < 2000) S.resWeek(GR);
  ok(S.comboKnown(GR, 'fantasy', 'rpg') === Math.round(S.compatOf('fantasy', 'rpg')) && S.comboKnown(GR, 'fantasy', 'rpg', 'action') === 0, 'nivå 2: matchningen för alla teman och genrer, men ännu inte blandningar');
  while (S.recipeLevel(GR) < 3 && w++ < 3000) S.resWeek(GR);
  ok(S.comboKnown(GR, 'fantasy', 'rpg', 'adventure') === Math.round(S.compatOf('fantasy', 'rpg', 'adventure')), 'nivå 3: matchningen för genreblandningar');
  {
    const Jk = { scope: 'medium', crunch: false, genre: 'rpg', genre2: null };
    const nov = { ...crew[0], gx: {} };
    const GRk = JSON.parse(JSON.stringify(GR));
    GRk.rcp = 0;
    const d0 = S.teamOutput(GRk, Jk, 0.5, [nov]).d;
    GRk.rcp = 5 * S.RCP_LEVEL_PTS;
    const d5 = S.teamOutput(GRk, Jk, 0.5, [nov]).d;
    GRk.rcp = S.RCP_MAX * S.RCP_LEVEL_PTS;
    const d10 = S.teamOutput(GRk, Jk, 0.5, [nov]).d;
    ok(d5 > d0 && d10 > d5 && Math.abs(d10 / d0 - S.knowMult(S.RCP_KNOW) / S.knowMult(0)) < 1e-9, 'receptkunskapen lär ut genrerna till hela studion: även en nybörjare får rutin (nivå 10: ' + S.RCP_KNOW + ' steg)');
    ok(S.teamOutput(GRk, Jk, 0.5, [nov]).kavg === 0, 'rapportens rutin i genren räknar bara det teamet själv gjort');
  }
  const sc0 = S.scoreLegs({ r: 1, s0: 5, mCompat: 1, mFit: 1.02, mAud: 1 }, 'large');
  ok(sc0.recipe === 100 && sc0.craft === 50, 'receptkunskapen ändrar inte betygsräkningen: ett perfekt recept ger ändå bara det teamet förmår');
  // självgående team väljer bättre recept med nivån
  GR.u.flags.autoTeams = true; GR.u.flags.sequels = true; GR.u.flags.genre2 = true; GR.u.scopes = ['small', 'medium', 'large'];
  for (const x of ['rpg', 'action', 'adventure', 'strategy', 'simulation']) if (!GR.u.genres.includes(x)) GR.u.genres.push(x);
  const Tg = S.createTeam(GR); for (const x of crew.slice(8)) S.addMember(GR, Tg.id, x.id);
  GR.rcp = 0;
  const cfgLow = S.planMission(GR, Tg, 'new');
  GR.rcp = S.RCP_MAX * S.RCP_LEVEL_PTS;
  const cfgTop = S.planMission(GR, Tg, 'new');
  const cp = (c) => S.compatOf(c.topic, c.genre, c.genre2);
  ok(cp(cfgTop) >= cp(cfgLow) - 1e-9 && cfgTop.genre2, 'på högsta receptnivån väljer ett självgående team minst lika bra recept, med genreblandning');
  ok(JSON.stringify(S.planMission(GR, Tg, 'new')) === JSON.stringify(cfgTop), 'valet är detsamma varje gång (deterministiskt)');
  GR.rcp = 3 * S.RCP_LEVEL_PTS;
  ok(!S.planMission(GR, Tg, 'new').genre2, 'före nivå 4 provar teamet inga genreblandningar');
  // sluta forska: skrivbord måste finnas, annars blir de kvar
  ok(S.endRes(GR, T.id) === true && !T.role && T.members.every((id) => !GR.staff.find((x) => x.id === id).out), 'teamet kan sluta forska och är tillbaka vid skrivborden');
  S.resWeek(GR);
  ok(GR.resRp === 0 && GR.resTech === 0 && S.techLead(GR) === 1, 'utan teknikteam ger ingen extra forskning eller teknik');
  // en gammal sparfil utan receptkunskap
  const old = JSON.parse(JSON.stringify(GR)); delete old.rcp; delete old.resRp;
  ok(S.recipeLevel(old) === 0 && S.rpPerWeek(old) > 0, 'en gammal sparfil utan receptnivå och teamforskning fungerar');
}

// ── Genrekunskap och betygets två ben ────────────────────────────
{
  const GX = S.newGame({ studio: 'GX', seed: 21, difficulty: 'normal' });
  S.makeCompetitors(GX); S.initWorld(GX);
  const w = GX.staff[0];
  ok(S.genreKnow(w, 'rpg') === 0 && S.knowMult(0) === S.GX_BASE, 'ingen rutin från början: grundtempot');
  S.learnGenre(w, 'rpg', null);
  ok(S.genreKnow(w, 'rpg') === 1 && S.genreKnow(w, 'action') === 0, 'ett spel ger ett steg i just den genren');
  for (let i = 0; i < 12; i++) S.learnGenre(w, 'rpg', 'action');
  ok(S.genreKnow(w, 'rpg') === S.GX_MAX && S.genreKnow(w, 'action') === S.GX_MAX, 'rutinen har tak och en blandning lär ut båda genrerna');
  ok(S.knowMult(S.GX_MAX) > S.knowMult(1) && S.knowMult(S.GX_MAX) / S.knowMult(0) < 1.1, 'rutinen ger högst några procent mer tempo');
  const bg = S.bestGenres(w, 3);
  ok(bg.length === 2 && bg[0][1] === S.GX_MAX, 'bestGenres listar bara genrer med rutin');
  // samma medarbetare, med och utan rutin: bara projekt i genren märker skillnaden, kontrakt (utan genre) inte
  const J = { scope: 'medium', crunch: false, genre: 'rpg', genre2: null };
  const withK = S.teamOutput(GX, J, 0.5, [w]);
  const w2 = { ...w, gx: {} };
  const noK = S.teamOutput(GX, J, 0.5, [w2]);
  ok(Math.abs(withK.d / noK.d - S.knowMult(S.GX_MAX) / S.knowMult(0)) < 1e-9 && withK.kavg === S.GX_MAX && noK.kavg === 0, 'ett team med rutin i genren jobbar snabbare i den');
  const c1 = S.teamOutput(GX, { scope: 'medium', crunch: false }, 0.5, [w]);
  const c2 = S.teamOutput(GX, { scope: 'medium', crunch: false }, 0.5, [w2]);
  ok(c1.d === c2.d && c1.t === c2.t, 'utan genre (kontrakt) spelar rutinen ingen roll');
  // två ben: ett perfekt recept med svagt team och tvärtom
  const base = { r: 1, s0: 5.7, mCompat: 1, mFit: 1.02, mAud: 1, mPlat: 1, mVr: 1, mBug: 1, mFresh: 1, mSeq: 1 };
  const weakTeam = S.scoreLegs(base, 'large');
  ok(weakTeam.recipe === 100 && weakTeam.craft === 57 && weakTeam.weak === 'craft', 'perfekt recept men svagt team: teamet begränsar');
  const weakRecipe = S.scoreLegs({ ...base, r: 3.5, s0: 9.5, mCompat: 0.8, mFit: 0.8, mAud: 0.9 }, 'large');
  ok(weakRecipe.craft === 95 && weakRecipe.recipe < 40 && weakRecipe.weak === 'recipe', 'starkt team men dåligt recept: receptet begränsar');
  const both = S.scoreLegs({ ...base, r: 4, s0: 9.7 }, 'aaa');
  ok(both.craft >= 95 && both.recipe === 100 && both.weak === 'none', 'bådas toppnivå ger inget att vinna');
  // båda behövs: samma recept och team ger aldrig toppbetyg om ett av benen saknas (jämför råbetyget)
  const raw = (p, sc) => S.softCap(p.s0 * p.mCompat * p.mFit * p.mAud * p.mPlat * p.mVr * p.mBug * p.mFresh * p.mSeq, S.SCOPE_CAP[sc]);
  const top = { ...base, s0: 9.7, r: 4 };
  ok(raw(top, 'aaa') > 9.5 && raw({ ...top, mCompat: 0.8, mFit: 0.8, mAud: 0.9 }, 'aaa') < 7 && raw({ ...top, s0: 5.7 }, 'aaa') < 6.5, 'toppbetyg kräver både recept och team');
}

// ── Campus, personalavdelning och marknadens mättnad ─────────────────────────────────
{
  const mk = (tier = 5) => {
    const W = S.newGame({ studio: 'C', seed: 91 }); S.makeCompetitors(W); S.initWorld(W);
    W.t = 48 * 26 + 3; W.money = 4e9; W.fans = 3e6; W.office.tier = tier;
    for (let i = 0; i < 36; i++) { S.refreshCandidates(W); const c = W.candidates[0]; W.money += c.fee; if (S.canHire(W)) S.hire(W, c.id); }
    return W;
  };
  const W = mk();
  // forskning och torn krävs
  ok(S.canCampus(W) === 'locked' && S.buildCampus(W) === false, 'campus kräver forskningen');
  W.u.flags.campus = true;
  const Wlow = mk(3); Wlow.u.flags.campus = true;
  ok(S.canCampus(Wlow) === 'locked', 'campus kräver Dynastitornet');
  ok(S.canCampus(W) === 'avg', 'campus kräver snittbetyg 7,8 (har inga spel än)');
  W.games = Array.from({ length: 4 }, (_, i) => ({ id: 900 + i, score: 8.4, revenue: 0, t: W.t - 100 - i }));
  const cap0 = S.capacity(W), rent0 = S.rentOf(W), seed0 = W.candidates.length;
  ok(S.canCampus(W) === true, 'alla krav uppfyllda ger true');
  ok(S.buildCampus(W) === true && S.campusOf(W) === 1 && S.capacity(W) === cap0 + S.CAMPUS_DESKS, 'ett campushus ger ' + S.CAMPUS_DESKS + ' skrivbord');
  ok(S.rentOf(W) > rent0 && S.teamMax(W) === S.TEAM_MAX + 4, 'hyran växer och fyra team till får plats');
  S.refreshCandidates(W);
  ok(W.candidates.length >= seed0 + 2, 'ett campushus ger två kandidater till varje månad');
  ok(S.canCampus(W) === 'staff', 'nästa hus kräver att det förra är nästan fullt');
  // fyll huset, bygg alla
  for (let n = 1; n < S.CAMPUS_MAX; n++) {
    while (S.canHire(W)) { S.refreshCandidates(W); const c = W.candidates[0]; W.money += c.fee; if (S.hire(W, c.id) !== true) break; }
    W.fans = 3e6; W.money = 4e9;
    ok(S.buildCampus(W) === true, 'hus ' + (n + 1) + ' byggs');
  }
  ok(S.campusOf(W) === S.CAMPUS_MAX && S.canCampus(W) === 'max' && S.campusNext(W) === null && S.capacity(W) === 36 + S.CAMPUS_MAX * S.CAMPUS_DESKS, 'åtta hus ger ' + (36 + S.CAMPUS_MAX * S.CAMPUS_DESKS) + ' skrivbord och sedan är det slut');
  ok(S.teamMax(W) === S.TEAM_MAX + 4 * S.CAMPUS_MAX, 'teamgränsen växer med campus');
  ok(S.campusFill(W) > 0.8 && S.campusFill(W) <= 1, 'campushusen är nästan fyllda (' + S.campusFill(W).toFixed(2) + ')');
  // gammal sparning utan campusfältet
  const old = JSON.parse(JSON.stringify(mk())); delete old.office.campus; delete old.hr;
  ok(S.campusOf(old) === 0 && S.capacity(old) === 36 && S.teamMax(old) === S.TEAM_MAX, 'sparning utan campus fungerar (0 hus)');
}
{
  // personalavdelningen: planen bildar team och anställer, utan att dra ur slumpen eller röra ordinarie personal
  const W = S.newGame({ studio: 'H', seed: 92 }); S.makeCompetitors(W); S.initWorld(W);
  W.t = 48 * 24 + 3; W.money = 4e9; W.fans = 1e6; W.office.tier = 5; W.office.campus = 2;
  for (let i = 0; i < 12; i++) { S.refreshCandidates(W); const c = W.candidates[0]; W.money += c.fee; S.hire(W, c.id); }
  const regular = W.staff.map((x) => x.id);
  ok(S.setHrPlan(W, 3, 5) === false && !S.hrOpen(W), 'personalavdelningen kräver forskningen');
  W.u.flags.hrAuto = true; W.u.flags.autoTeams = true;
  ok(S.setHrPlan(W, 99, 99) === true && S.hrPlan(W).teams === S.teamMax(W) && S.hrPlan(W).size === S.TEAM_SIZE, 'planen begränsas av teamgränsen och teamstorleken');
  ok(S.setHrPlan(W, 3, 5) === true && S.hrPlan(W).teams === 3 && S.hrPlan(W).size === 5, 'plan: tre team om fem');
  const staffBefore = W.staff.length;
  for (let w = 0; w < 80; w++) { for (let k = 0; k < S.TICKS_PER_WEEK; k++) S.stepTick(W); W.pending.length = 0; W.money = Math.max(W.money, 4e9); }
  const hr = S.hrTeams(W);
  ok(hr.length === 3 && hr.every((x) => x.hr && x.want === 5 && x.repeat && x.autoTrain), 'tre team bildas med önskad storlek, upprepning och kurser');
  ok(hr.every((x) => x.members.length === 5), 'teamen fylls till önskad storlek (' + hr.map((x) => x.members.length).join(',') + ')');
  ok(W.staff.length >= staffBefore + 15 && W.hr.hired >= 15, 'avdelningen anställde minst femton (' + W.hr.hired + ')');
  ok(hr.every((x) => x.members.every((id) => !regular.includes(id))), 'bara nyanställda går till teamen, aldrig ordinarie personal');
  ok(W.news.some((n) => n.key === 'news.hrHires'), 'ett samlat besked per kvartal');
  ok(W.games.length > 0 || hr.some((x) => x.mission), 'teamen tar uppdrag på egen hand');
  // reserven: utan pengar anställer den inte
  const Wp = S.newGame({ studio: 'P', seed: 93 }); S.makeCompetitors(Wp); S.initWorld(Wp);
  Wp.t = 48 * 24; Wp.office.tier = 5; Wp.u.flags.hrAuto = true;
  S.setHrPlan(Wp, 2, 5); Wp.money = 20000; S.refreshCandidates(Wp);
  const n0 = Wp.staff.length; S.hrWeek(Wp);
  ok(Wp.staff.length === n0, 'utan reserv i kassan anställer avdelningen ingen');
  const r0 = W.rng; S.refreshCandidates(W); const r1 = W.rng; S.hrWeek(W);
  ok(W.rng === r1 && r1 !== r0, 'personalavdelningen drar inget ur slumptalsföljden (kandidaterna gör det)');
  // ett nedlagt team minskar planen
  const hrT = S.hrTeams(W)[0]; const planBefore = S.hrPlan(W).teams;
  ok(S.disbandTeam(W, hrT.id) === true && S.hrPlan(W).teams === planBefore - 1, 'ett nedlagt HR-team minskar planen så det inte bildas igen');
  // önskad storlek på ett vanligt team
  const free = W.staff.filter((x) => !x.isFounder && !S.teamOfStaff(W, x.id));
  const M = S.createTeam(W); for (const x of free.slice(0, 3)) S.addMember(W, M.id, x.id);
  ok(S.setWant(W, M.id, 6) === true && M.want === 6 && S.setWant(W, M.id, 0) === true && M.want === 0 && S.setWant(W, M.id, 1) === true && M.want === S.HR_MIN, 'önskad storlek: av, 6 och minst ' + S.HR_MIN);
}
{
  // marknadens mättnad: ett fåtal egna släpp är gratis, många delar på köparna
  const W = S.newGame({ studio: 'M', seed: 94 }); S.makeCompetitors(W); S.initWorld(W);
  W.t = 48 * 15;
  const x = { genre: 'action', topic: W.u.topics[0] };
  ok(S.satOf(0) === 1 && S.satOf(S.SAT_FREE) === 1 && S.satOf(S.SAT_FREE + 20) < 0.85 && S.satOf(200) > 0.2, 'mättnaden är 1 upp till ' + S.SAT_FREE + ' släpp och avtar långsamt');
  W.games = Array.from({ length: 5 }, (_, i) => ({ id: 1000 + i, t: W.t - 3 * i, genre: 'puzzle', topic: x.topic, score: 7 }));
  const c1 = S.crowding(W, x, W.t);
  ok(c1.own === 5 && c1.sat === 1, 'fem egna släpp ger ingen mättnad');
  W.games = Array.from({ length: 30 }, (_, i) => ({ id: 1000 + i, t: W.t - Math.floor(i * 1.5), genre: 'puzzle', topic: x.topic, score: 7 }));
  const c2 = S.crowding(W, x, W.t);
  ok(c2.own === 30 && c2.sat < 0.8 && c2.sat > 0.5 && c2.mult <= c2.sat * 1.05 + 1e-9, 'trettio släpp på ett år delar på köparna (sat ' + c2.sat.toFixed(2) + ')');
  W.games.push({ id: 5000, t: W.t - 60, genre: 'puzzle', topic: x.topic, score: 7 });
  ok(S.crowding(W, x, W.t).own === 30, 'släpp äldre än 48 veckor räknas inte');
}

// ── Koncernstyrelsen: köp, sammanslagning, budget, reserv, rapport och händelser ──────────────────
{
  const mk = () => {
    const W = S.newGame({ studio: 'B', seed: 33 }); S.makeCompetitors(W); S.initWorld(W);
    while (S.yearOf(W.t) < 2007) { W.money = 1e9; W.pending.length = 0; S.stepTick(W); }
    W.office.tier = 5; W.money = 3e9; W.fans = 1e6;
    W.u.flags.acquire = true; W.u.flags.group = true; W.u.flags.publish = true;
    return W;
  };
  const month = (G) => { G.t = G.t - (G.t % 4) + 5; S.boardWeek(G); };
  const W = mk();
  const burn = () => S.payroll(W) + S.rentOf(W) + S.facUpkeep(W);
  ok(!S.boardOpen(W) && S.setBoard(W, 'buy', 1) === false, 'styrelsen kräver forskningen');
  W.u.flags.groupBoard = true;
  ok(S.boardNext(W).why === 'off', 'inget påslaget: styrelsen väntar på instruktioner');
  ok(S.setBoard(W, 'buy', 1) === true && S.setBoard(W, 'res', 9) === true && S.boardOf(W).res === 2 && S.setBoard(W, 'nonsense', 1) === false, 'policyn kan sättas och begränsas');
  // reserven: 24 månader kräver mer i kassan än 6
  const cheap = Math.min(...W.comps.map((c) => S.acqPrice(W, c)));
  W.money = cheap + 8 * burn();
  const n2 = S.boardNext(W);
  ok(!n2.act && n2.why === 'cash' && n2.need > W.money, 'reserven på 24 månader: styrelsen väntar på kassan');
  S.setBoard(W, 'res', 0);
  ok(S.boardNext(W).act === 'buy', 'reserven på 6 månader: samma kassa räcker');
  S.setBoard(W, 'res', 1);
  W.money = 3e9;
  // ett köp i månaden, aldrig fler bolag än ledningen får äga
  const r0 = W.rng;
  month(W);
  ok(S.ownedComps(W).length === 1 && S.boardOf(W).bought === 1, 'ett köp den första månaden (' + S.ownedComps(W).length + ')');
  for (let i = 0; i < 6; i++) month(W);
  ok(S.ownedComps(W).length === S.acqMax(W) && S.acqMax(W) === S.ACQ_MAX && S.boardNext(W).why === 'full', 'styrelsen stannar vid taket på ' + S.ACQ_MAX + ' bolag');
  // sammanslagning, ett bolag i månaden, och ledningens kapacitet räcker (4 av 4)
  S.setBoard(W, 'integ', 1);
  month(W);
  ok(S.ownedComps(W).filter((c) => c.sub.mode === 'int').length === 1 && S.boardOf(W).merged === 1, 'en sammanslagning den första månaden');
  for (let i = 0; i < 5; i++) month(W);
  ok(S.ownedComps(W).every((c) => c.sub.mode === 'int') && !S.overloaded(W), 'alla fyra slås ihop och ledningen räcker (' + S.groupLoad(W) + '/' + S.groupCap(W) + ')');
  ok(S.boardNext(W).why === 'none' || S.boardNext(W).why === 'full', 'inget mer att göra när alla är sammanslagna');
  // campus ger plats åt ett bolag till och en halv ledningsplats per hus
  W.office.campus = 2;
  ok(S.acqMax(W) === S.ACQ_MAX + 1 && S.groupCap(W) === 5, 'två campushus: ett bolag till (' + S.acqMax(W) + ') och ledning ' + S.groupCap(W));
  month(W); month(W);
  ok(S.ownedComps(W).length === 5 && S.ownedComps(W).every((c) => c.sub.mode === 'int') && !S.overloaded(W), 'femte bolaget köps och slås ihop inom kapaciteten');
  ok(W.rng === r0, 'styrelsen drar inget ur slumptalsföljden');
  // ledningen full: köp stannar innan den överbelastas
  W.office.tier = 3; W.office.campus = 0;
  ok(S.overloaded(W) === true, 'ett mindre kontor överbelastar ledningen');
  // budgeten på auto: satsa med god marginal, spara bara när kassan är trång, annars normal
  W.office.tier = 5; W.office.campus = 2;
  S.setBoard(W, 'budget', 1);
  W.money = 3e9; month(W);
  ok(S.ownedComps(W).every((c) => c.sub.budget === 2), 'god marginal: alla satsar');
  W.money = burn() * 2; month(W);
  ok(S.ownedComps(W).every((c) => c.sub.budget === 0), 'trång kassa: bolagen sparar');
  W.money = burn() * 4; month(W);
  ok(S.ownedComps(W).every((c) => c.sub.budget === 0), 'det tar en bit till innan de slutar spara (ingen fladdrande budget)');
  W.money = burn() * 8; month(W);
  ok(S.ownedComps(W).every((c) => c.sub.budget === 1), 'under reserven plus satsningen: normal budget');
  // kvartalsrapporten
  W.t = 12 * 30 + 11;
  S.boardWeek(W);
  ok(W.news[0].key === 'news.boardReport' && W.news[0].t === W.t && W.news[0].vars.b >= 5 && W.gb.q.bought === 0, 'en rapport per kvartal med köp och sammanslagningar, sedan nollställd');
  // händelser: deterministiska, små och inom gränserna
  W.money = 3e9;
  const A = JSON.parse(JSON.stringify(W)); const B = JSON.parse(JSON.stringify(W));
  for (const G of [A, B]) { for (let i = 0; i < 500; i++) { G.t = i * 4 + 1; G.money = Math.max(G.money, 3e9); S.boardWeek(G); } }
  const kinds = new Set(A.news.filter((n) => /^news\.sub/.test(n.key)).map((n) => n.key));
  ok(JSON.stringify(A.news) === JSON.stringify(B.news) && JSON.stringify(A.comps) === JSON.stringify(B.comps), 'samma frö ger samma händelser');
  ok(kinds.has('news.subHit') && kinds.has('news.subTalent') && (kinds.has('news.subPoach') || kinds.has('news.subPoachHeld')) && kinds.has('news.subScandal'), 'alla slags händelser förekommer (' + [...kinds].join(', ') + ')');
  ok(S.ownedComps(A).every((c) => c.strength >= 0.45 && c.strength <= 1.7 && c.sub.staff >= 4 && Number.isFinite(c.sub.staff)), 'händelserna håller sig inom gränserna');
  // gammal sparning utan styrelsens fält, och spelet går vidare efter sparning
  const old = JSON.parse(JSON.stringify(mk())); old.u.flags.groupBoard = true; delete old.gb;
  ok(S.boardOf(old).buy === 0 && S.boardOf(old).res === 1 && S.boardNext(old).why === 'off', 'sparning utan styrelsen fungerar');
  const GJ = JSON.parse(JSON.stringify(W));
  for (let i = 0; i < 48; i++) { GJ.pending.length = 0; S.stepTick(GJ); }
  ok(Number.isFinite(GJ.money) && S.ownedComps(GJ).length === 5 && GJ.gb.buy === 1, 'styrelsen finns kvar efter sparning');
}
{
  // via spelets klocka: styrelsen sköter uppköp och sammanslagning på egen hand
  const W = S.newGame({ studio: 'C', seed: 34 }); S.makeCompetitors(W); S.initWorld(W);
  while (S.yearOf(W.t) < 2007) { W.money = 1e9; W.pending.length = 0; S.stepTick(W); }
  W.office.tier = 5; W.u.flags.acquire = true; W.u.flags.group = true; W.u.flags.publish = true; W.u.flags.groupBoard = true;
  for (const k of ['buy', 'integ', 'budget']) S.setBoard(W, k, 1);
  for (let i = 0; i < 48 * 4 * 2; i++) { W.pending.length = 0; W.money = Math.max(W.money, 2e9); S.stepTick(W); }
  ok(S.ownedComps(W).length >= 3 && W.gb.bought >= 3 && W.gb.merged >= 2, 'klockan: ' + W.gb.bought + ' köp och ' + W.gb.merged + ' sammanslagningar på två år');
  ok(W.news.some((n) => n.key === 'news.boardReport'), 'klockan: en kvartalsrapport har kommit');
  ok(!S.overloaded(W), 'klockan: ledningen är inte överbelastad');
}

// galan visas tillsammans med årsrapporten: samma paus, galan först, och inget stannar i galaveckan
{
  const GH = S.newGame({ studio: 'Hold', seed: 57 }); S.makeCompetitors(GH); S.initWorld(GH);
  const rel = (t, score, total) => { const r = { id: GH.uid++, t, comp: 1, studio: 'X', color: '#fff', title: { sv: 'R' + score, en: 'R' + score }, score, total, platform: 'pc', genre: 'rpg', topic: 'fantasy', scope: 'small', price: 10, tail: 1 }; GH.market.releases.push(r); return r; };
  GH.t = 48 * 3 + 30;
  for (const sc of [5, 5.5, 6, 6.5]) rel(48 * 3 + 10, sc, 1e5);
  GH.games.push({ id: GH.uid++, title: 'Mästerverket', t: GH.t - 5, score: 9.9, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', units: 1e9, total: 1e10, priceAt: 10, parts: { rd: 4, rt: 4 }, weekly: [], ports: [] });
  const seen = [];
  while (GH.t < 48 * 4 + 2) { GH.money = Math.max(GH.money, 1e9); S.stepTick(GH); if (GH.pending.length) { seen.push({ t: GH.t, types: GH.pending.map((p) => p.type) }); GH.pending.length = 0; } }
  const aw = seen.filter((x) => x.types.includes('award'));
  const yr = seen.find((x) => x.types.includes('year'));
  ok(GH.awards.length > 0 && aw.length === 1 && yr && aw[0].t === yr.t && yr.t === 48 * 4 && yr.types.indexOf('award') < yr.types.indexOf('year'), 'galan visas när året bokförs, före årsrapporten, i samma paus (' + seen.map((x) => x.t + ':' + x.types.join('+')).join(' ') + ')');
  ok(!seen.some((x) => x.t === 48 * 4 - 1 && x.types.includes('award')) && !(GH.galaHold || []).length, 'ingen paus i galaveckan och inget blir kvar');
}

// många likadana nyheter på kort tid: de två första visas som toast, resten står bara i krönikan
{
  const GN = S.newGame({ studio: 'Burst', seed: 61 });
  const { on } = await import('../src/core/bus.js');
  const got = [];
  on('toast', (n) => got.push(n.key + ':' + n.kind));
  GN.t = 100;
  for (let i = 0; i < 5; i++) S.note(GN, 'news.port', { title: 'T' + i, plat: 'pc', v: 7 }, 'info');
  ok(got.filter((x) => x === 'news.port:info').length === S.BURST_MAX && GN.news.filter((n) => n.key === 'news.port').length === 5, 'fem likadana nyheter på en vecka: ' + S.BURST_MAX + ' toast, alla i krönikan');
  S.note(GN, 'news.lowCash', {}, 'bad'); S.note(GN, 'news.lowCash', {}, 'bad'); S.note(GN, 'news.lowCash', {}, 'bad');
  ok(got.filter((x) => x === 'news.lowCash:bad').length === 3, 'varningar visas alltid');
  S.note(GN, 'news.office', { n: 1 }, 'good', false, true); S.note(GN, 'news.office', { n: 2 }, 'good', false, true); S.note(GN, 'news.office', { n: 3 }, 'good', false, true);
  ok(got.filter((x) => x === 'news.office:good').length === 3, 'stora nyheter visas alltid');
  GN.t += S.BURST_WEEKS + 1;
  S.note(GN, 'news.port', { title: 'Sen', plat: 'pc', v: 7 }, 'info');
  ok(got.filter((x) => x === 'news.port:info').length === S.BURST_MAX + 1, 'efter ' + S.BURST_WEEKS + ' veckor visas nästa igen');
}

// ── Affärsavdelningen: pitchar och licensaffärer ─────────────────────────────────────────────────
{
  const GB = S.newGame({ studio: 'Biz', seed: 71 }); S.makeCompetitors(GB); S.initWorld(GB);
  GB.t = 48 * 25; GB.money = 1e9; GB.u.flags.publish = true; GB.u.flags.merch = true;
  GB.office.tier = 2; for (let i = 0; i < 5; i++) GB.staff.push(S.makeCandidate(GB, 1));
  GB.pub = { pitches: [], deals: [], next: GB.t + 100 };
  GB.fr = { offers: [], deals: [], hype: {}, next: GB.t + 100 };
  const pit = (lo, hi, adv) => { const p = { id: GB.uid++, studio: 'S', color: '#fff', title: { sv: 'P' + lo, en: 'P' + lo }, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'small', q: (lo + hi) / 2, lo, hi, weeks: 8, until: GB.t + 12, seen: false, advance: adv }; GB.pub.pitches.push(p); return p; };
  const off = (kind, up, lo, hi) => { const o = { id: GB.uid++, series: 9000 + GB.uid, title: 'S', kind, partner: 'X', color: '#fff', until: GB.t + 12, seen: false, up }; if (kind === 'film') Object.assign(o, { q: (lo + hi) / 2, lo, hi }); GB.fr.offers.push(o); return o; };
  const lowP = pit(6, 7, 50000), midP = pit(7, 7.8, 50000), topP = pit(8, 9, 50000);
  pit(7, 7.4, 50000); // en tredje över gränsen: platserna räcker bara till två
  const lowF = off('film', 40000, 5, 6), goodF = off('film', 60000, 7, 8), merch = off('merch', 20000), comic = off('comic', 10000);
  ok(!S.bizOpen(GB) && S.setBiz(GB, 'pub', 1) === false, 'avdelningen kräver forskningen');
  S.bizWeek(GB);
  ok(GB.pub.pitches.length === 4 && GB.fr.offers.length === 4, 'utan forskning rör den ingenting');
  GB.u.flags.bizAuto = true;
  ok(S.setBiz(GB, 'pub', 1) === true && S.setBiz(GB, 'pubLvl', 0) === true && S.setBiz(GB, 'pubLvl', 9) === true && S.bizOf(GB).pubLvl === 2 && S.setBiz(GB, 'x', 1) === false, 'policyn kan sättas och begränsas');
  S.setBiz(GB, 'pubLvl', 2);
  const r0 = GB.rng;
  const burn = S.burnOf(GB);
  ok(burn > 0, 'månadens kostnader finns (' + Math.round(burn) + ')');
  // reserven: för lite kvar efter förskottet, ingen påskrift
  GB.money = 50000 + 3 * burn;
  S.bizWeek(GB);
  ok(S.activeDeals(GB).length === 0, 'kassan efter förskottet under sex månaders kostnader: ingen påskrift');
  GB.money = 1e9;
  S.bizWeek(GB);
  const signed = S.activeDeals(GB).map((d) => d.id).sort();
  ok(signed.length === S.PUB_SLOTS && signed.includes(topP.id) && signed.includes(midP.id) && !signed.includes(lowP.id), 'de två bästa pitcharna över gränsen skrivs på, den svaga och den för många inte (' + signed.length + ')');
  ok(GB.fr.offers.length === 4, 'licenserna rörs inte förrän de slås på');
  S.setBiz(GB, 'lic', 1);
  const m0 = GB.money;
  S.bizWeek(GB);
  ok(GB.fr.deals.length === 3 && GB.fr.offers.length === 1 && GB.fr.offers[0].id === lowF.id && GB.money === m0 + goodF.up + merch.up + comic.up, 'prylar, serietidning och bra film tas emot, den svaga filmen inte');
  S.setBiz(GB, 'filmLvl', 0);
  ok(S.BIZ_FILM[0] === 7.5 && S.bizOf(GB).filmLvl === 0, 'filmgränsen kan höjas');
  ok(GB.rng === r0, 'avdelningen drar inget ur slumptalsföljden');
  // kvartalsrapporten
  GB.t = 12 * 600 + 5;
  S.bizWeek(GB);
  ok(GB.news[0].key === 'news.bizReport' && GB.news[0].vars.a === 2 && GB.news[0].vars.b === 3 && GB.bz.q.signed === 0, 'en rapport per kvartal, sedan nollställd');
  // gammal sparning utan avdelningens fält
  const old = JSON.parse(JSON.stringify(GB)); delete old.bz;
  ok(S.bizOf(old).pub === 0 && S.bizOf(old).pubLvl === 2, 'sparning utan avdelningen fungerar');
}
{
  // via spelets klocka: avdelningen skriver på och ger inga egna nyheter om pitcharna
  const GC = S.newGame({ studio: 'Biz2', seed: 72 }); S.makeCompetitors(GC); S.initWorld(GC);
  while (S.yearOf(GC.t) < 2005) { GC.money = 1e9; GC.pending.length = 0; S.stepTick(GC); }
  GC.u.flags.publish = true; GC.u.flags.bizAuto = true; GC.office.tier = 3;
  S.setBiz(GC, 'pub', 1); S.setBiz(GC, 'pubLvl', 2);
  for (let i = 0; i < 48 * 4 * 3; i++) { GC.pending.length = 0; GC.money = Math.max(GC.money, 1e9); S.stepTick(GC); }
  ok(GC.bz.signed >= 3 && S.pubOf(GC).deals.length >= 3, 'klockan: ' + GC.bz.signed + ' påskrifter på tre år');
  ok(GC.news.some((n) => n.key === 'news.bizReport'), 'klockan: en kvartalsrapport har kommit');
}

// ── Butiksteam: ett team sköter butikens kampanjer ──────────────────────────────────────────────
{
  const mk = () => {
    const W = S.newGame({ studio: 'Shop', seed: 81 }); S.makeCompetitors(W); S.initWorld(W);
    W.t = 48 * 24 + 14; W.money = 1e8; W.fans = 2e5; W.office.tier = 4;
    for (let i = 0; i < 7; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
    W.u.flags.store = true; W.u.flags.autoTeams = true;
    W.games.length = 0;
    const gm = (id, age, score, peak) => ({ id, title: id, platform: 'pc', genre: 'action', topic: 'space', scope: 'small', score, total: 2e6, t: W.t - age, tail: 1, priceAt: 30, weekly: [peak].concat(Array(age - 1).fill(3000)), revenue: 0, units: 0, fansGained: 0, ended: true });
    W.games.push(gm('o1', 70, 7, 1e6), gm('o2', 60, 7, 1e6), gm('hit', 30, 9, 4e4), gm('c', 40, 8, 4e4), gm('d', 50, 8, 4e4), gm('e', 36, 8, 4e4));
    const hw = W.games.find((x) => x.id === 'hit').weekly; hw[hw.length - 1] = 6e5; // ett spel som fortfarande säljer starkt: Veckans spel lönar sig
    S.storeWeek(W);
    W.stats.storeUsers = 3e6; W.store.lvl = 4; // butiksnivå 4
    return W;
  };
  const G1 = mk();
  const crew = G1.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(G1);
  for (const x of crew.slice(0, 4)) S.addMember(G1, T.id, x.id);
  ok(S.canShop(G1, T) === 'shopLocked' && typeof S.assignShop(G1, T.id) === 'string' && !S.shopOpen(G1), 'ett butiksteam kräver forskningen Butiksteam');
  G1.u.flags.shopTeams = true;
  ok(S.levelOf(G1) === 4 && S.seatCap(G1) === 6 && S.shopNeed(G1) === 5, 'butiksnivå 4 ger sex platser och ett behov på fem personer (' + S.seatCap(G1) + ')');
  const GN0 = JSON.parse(JSON.stringify(G1)); delete GN0.store;
  ok(S.canShop(GN0, S.teamsOf(GN0)[0]) === 'shopStore', 'utan en egen butik finns inget att sköta');
  const w0 = S.workers(G1).length;
  ok(S.assignShop(G1, T.id) === true && T.role === 'shop' && T.target === 'store' && T.members.every((id) => G1.staff.find((x) => x.id === id).away) && S.workers(G1).length === w0 - 4, 'teamet tar över butiken och är borta från dina projekt');
  ok(S.leadOf(G1, T) !== null && S.shopTeamOf(G1) === T && S.outCount(G1) === 4, 'en arbetsledare utses och teamet sitter utanför huset');
  const T2 = S.createTeam(G1);
  for (const x of crew.slice(4, 6)) S.addMember(G1, T2.id, x.id);
  ok(S.canShop(G1, T2) === 'shopTaken', 'bara ett team sköter butiken');
  S.disbandTeam(G1, T2.id);
  const inf = S.shopInfo(G1, T);
  ok(inf.eff > 0 && inf.eff < 1 && inf.need === 5 && inf.n === 4 && Math.abs(inf.lift - S.SHOP_LIFT * inf.eff) < 1e-9, 'effekten följer hur många de är mot behovet (' + inf.eff.toFixed(2) + ')');
  const B1 = G1.store;
  const rng0 = G1.rng;
  const cost0 = S.spotCost(G1, G1.games.find((x) => x.id === 'hit'));
  S.shopWeek(G1);
  ok(B1.tm === inf.eff && G1.rng === rng0, 'veckan sätter butikens kampanjlyft utan att röra slumptalen');
  const cost1 = S.spotCost(G1, G1.games.find((x) => x.id === 'hit'));
  ok(cost1 < cost0 && Math.abs(cost1 / cost0 - (1 - S.SHOP_FEE * inf.eff)) < 0.01, 'Veckans spel blir billigare med teamet (' + cost0 + ' -> ' + cost1 + ')');
  // kampanjerna kommer av sig själva
  const P = S.shopOf(G1);
  ok(P.on === 1 && P.budget === 1 && P.aggro === 1 && S.setShop(G1, 'aggro', 2) === true && S.setShop(G1, 'aggro', 9) === false && P.aggro === 2 && S.setShop(G1, 'x', 1) === false, 'policyn kan sättas och begränsas');
  S.setShop(G1, 'aggro', 1);
  S.shopWeek(G1); G1.t++; S.storeWeek(G1);
  ok(B1.spots.length >= 1 && B1.bundles.length === 1 && B1.deals.length >= 1, 'teamet satte igång Veckans spel, ett paket och erbjudanden (' + B1.spots.length + '/' + B1.bundles.length + '/' + B1.deals.length + ')');
  ok(P.n.spot >= 1 && P.n.bundle === 1 && P.n.deal >= 1 && P.q.n >= 3 && P.fee > 0, 'och räknade dem och avgifterna');
  ok(B1.deals.every((d) => { const g = G1.games.find((x) => x.id === d.id); return G1.t - g.t >= S.SHOP_DEAL_AGE && S.baseOf(G1, g) < 4e4; }) && !B1.deals.some((d) => B1.bundles.some((b) => b.ids.includes(d.id)) || B1.spots.some((x) => x.id === d.id)), 'erbjudanden går bara till äldre spel som tappat och aldrig till ett spel i ett paket eller i Veckans spel');
  // lyftet: samma kampanj ger mer med teamet
  const GA = mk(); const GB = mk();
  for (const W of [GA, GB]) { S.startSpot(W, 'hit'); S.startDeal(W, 'o1', 1); W.t++; }
  GB.store.tm = 1;
  S.storeWeek(GA); S.storeWeek(GB);
  const ra = GA.store.spots[0].inc;
  const rb = GB.store.spots[0].inc;
  ok(ra > 0 && Math.abs(rb / ra - (1 + S.SHOP_LIFT)) < 1e-6 && GB.store.deals[0].inc > GA.store.deals[0].inc, 'kampanjerna säljer ' + Math.round(S.SHOP_LIFT * 100) + ' % mer vid full effekt');
  // av och budget
  const G2 = mk();
  const T3 = S.createTeam(G2); for (const x of G2.staff.filter((y) => !y.isFounder).slice(0, 5)) S.addMember(G2, T3.id, x.id);
  G2.u.flags.shopTeams = true; S.assignShop(G2, T3.id);
  S.setShop(G2, 'on', 0);
  for (let i = 0; i < 4; i++) { S.shopWeek(G2); G2.t++; S.storeWeek(G2); }
  ok(G2.store.spots.length === 0 && G2.store.deals.length === 0 && G2.store.bundles.length === 0 && G2.store.tm > 0, 'avstängt gör teamet inget men lyftet gäller ändå');
  S.setShop(G2, 'on', 1);
  G2.money = 1000; // under reserven: inga betalda kampanjer, men de gratis går
  for (let i = 0; i < 4; i++) { S.shopWeek(G2); G2.t++; S.storeWeek(G2); G2.money = Math.min(G2.money, 1000); }
  ok(G2.store.spots.length === 0 && S.shopOf(G2).n.spot === 0 && (G2.store.bundles.length === 1 || G2.store.deals.length >= 1), 'utan pengar utöver reserven betalar teamet inget, men gratis paket och erbjudanden går');
  // väntande spelare stoppar nya erbjudanden
  const G3 = mk();
  const T4 = S.createTeam(G3); for (const x of G3.staff.filter((y) => !y.isFounder).slice(0, 5)) S.addMember(G3, T4.id, x.id);
  G3.u.flags.shopTeams = true; S.assignShop(G3, T4.id);
  S.setShop(G3, 'spot', 0); S.setShop(G3, 'bundle', 0);
  G3.store.wait = 0.6;
  for (let i = 0; i < 3; i++) { S.shopWeek(G3); G3.store.wait = 0.6; G3.t++; S.storeWeek(G3); G3.store.wait = 0.6; }
  ok(G3.store.deals.length === 0 && S.shopOf(G3).n.deal === 0, 'när många redan väntar på nästa erbjudande sätts inga nya igång');
  // temavecka: förbered den en gång, mot en avgift
  const G4 = mk();
  const T5 = S.createTeam(G4); for (const x of G4.staff.filter((y) => !y.isFounder).slice(0, 5)) S.addMember(G4, T5.id, x.id);
  G4.u.flags.shopTeams = true; S.assignShop(G4, T5.id);
  S.setShop(G4, 'spot', 0); S.setShop(G4, 'bundle', 0); S.setShop(G4, 'deal', 0);
  G4.t = 48 * 24 + 10; // indievecka (små spel)
  const m4 = G4.money;
  S.shopWeek(G4);
  const P4 = S.shopOf(G4);
  ok(S.eventNow(G4).id === 'indie' && P4.prep && P4.prep.id === 'indie' && P4.prep.v > 0 && G4.money < m4 && P4.n.theme === 1, 'teamet förbereder temaveckan mot en avgift (' + Math.round(m4 - G4.money) + ')');
  const mm = G4.money;
  S.shopWeek(G4);
  ok(G4.money === mm && P4.n.theme === 1, 'men bara en gång per temavecka');
  const G5 = JSON.parse(JSON.stringify(G4));
  G5.store.sh.prep = null; // samma vecka utan förberedelsen
  S.storeWeek(G4); S.storeWeek(G5);
  ok(G4.store.ev.inc > G5.store.ev.inc * 1.2, 'en förberedd temavecka säljer klart mer (' + Math.round(G4.store.ev.inc) + ' mot ' + Math.round(G5.store.ev.inc) + ')');
  // kvartalsrapport
  const G6 = JSON.parse(JSON.stringify(G1));
  G6.t = 48 * 26 + 7; S.shopOf(G6).on = 0; S.shopOf(G6).q = { n: 3, fee: 4500 };
  S.shopWeek(G6);
  ok(G6.news[0].key === 'news.shopReport' && G6.news[0].vars.a === 3 && S.shopOf(G6).q.n === 0, 'en rapport per kvartal, sedan nollställd');
  // teamet slutar
  ok(S.endShop(G1, T.id) === true && T.role === null && G1.staff.filter((x) => T.members.includes(x.id)).every((x) => !x.away && !x.out), 'teamet slutar med butiken och är vanlig personal igen');
  S.shopWeek(G1);
  ok(G1.store.tm === 0, 'utan team försvinner lyftet');
  // gammal sparning utan butiksteamets fält
  const GO = JSON.parse(JSON.stringify(G2)); delete GO.store.sh; delete GO.store.tm;
  for (let i = 0; i < 30; i++) { S.shopWeek(GO); GO.t++; S.storeWeek(GO); }
  ok(Number.isFinite(GO.money) && GO.store.sh && GO.store.sh.on === 1, 'en sparning från före butiksteamet fortsätter som vanligt');
}

// ── Livet i studion: händelser som scenerna visar ───────────────────────────────────────────────
{
  const W = S.newGame({ studio: 'Life', seed: 91 }); S.makeCompetitors(W); S.initWorld(W);
  W.t = 48 * 5 + 5; W.money = 1e8; W.fans = 5e4; W.office.tier = 3;
  const got = [];
  const off = onBus('life', (b) => got.push(b));
  ok(S.lifeLog(W).length === 0 && S.lifeState(W, 'dev').active === false, 'inget flöde innan något hänt');
  for (let i = 0; i < 4; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
  ok(got.length === 4 && got.every((b) => b.k === 'hired' && b.s && b.who && b.sc === 'studio') && W.life.items.length === 4, 'en anställning ger en händelse med namn (' + got.length + ')');
  const st = S.lifeState(W, 'dev');
  ok(!st.active && st.crew.length >= 4 && st.crew.every((c) => c.id && c.name), 'ögonblicksbilden visar besättningen även utan projekt');
  // ett projekt
  ok(S.startProject(W, { title: 'Liv', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' }) !== null, 'projekt startat');
  const pct0 = S.lifeState(W, 'dev').pct;
  let tt = 0;
  while (W.job && W.job.state === 'dev' && tt++ < 4000) { W.pending.length = 0; S.stepTick(W); }
  const kinds = new Set(got.map((b) => b.k));
  ok(kinds.has('half') && kinds.has('done') && got.filter((b) => b.k === 'phase').map((b) => b.a).join() === '1,2,3', 'halvvägs, tre fasbyten och klart kommer som händelser (' + [...kinds].join(',') + ')');
  ok(kinds.has('bug') && got.filter((b) => b.k === 'bug').every((b) => b.s && b.who && b.g === 'Liv' && b.a >= 1), 'buggar hittas av en namngiven person');
  ok(S.lifeState(W, 'dev').pct === 1 && S.lifeState(W, 'dev').report === true && pct0 < 0.1, 'ögonblicksbilden följer projektet från start till rapport');
  // utgivning
  W.pending.length = 0;
  const G0 = S.releaseGame(W);
  const L = got.filter((b) => b.k === 'launch').pop();
  ok(G0 && L && L.g === 'Liv' && L.a === Math.round(G0.score * 10) / 10 && L.v === (G0.score >= 8 ? 0 : G0.score >= 6 ? 1 : 2), 'släppet ger en händelse med betyget och en passande text');
  // slumpen och loggen
  const rng0 = W.rng;
  W.tick = 1;
  const b1 = S.beat(W, 'bug', { staff: W.staff[0], g: 'X', a: 1 });
  const b2 = S.beat(W, 'bug', { staff: W.staff[0], g: 'X', a: 1 });
  ok(b1 && b2 === null && W.rng === rng0, 'en tät ström dämpas och händelserna rör inte slumptalen');
  for (let i = 0; i < 50; i++) S.beat(W, 'idea', { staff: W.staff[0], g: 'X' });
  ok(W.life.items.length === S.LIFE_MAX && W.life.items[W.life.items.length - 1].n === W.life.n, 'loggen håller de ' + S.LIFE_MAX + ' senaste');
  const last = W.life.n;
  ok(S.lifeLog(W, 'dev', last - 3).length === 3 && S.lifeLog(W, 'hw').length === 0 && S.lifeLog(W, 'studio').length === 0, 'lifeLog filtrerar på scen och på löpnummer');
  ok(S.beat(W, 'finns-inte') === null, 'okända sorter ignoreras');
  // texter: alla sorter och varianter finns på båda språken
  let miss = 0;
  for (const [k, K] of Object.entries(S.LIFE_KINDS)) for (let v = 0; v < K.v; v++) { const e = STRINGS[`life.${k}.${v}`]; if (!e || !e[0] || !e[1]) { miss++; console.log('saknas', k, v); } }
  ok(miss === 0 && STRINGS['life.someone'], 'alla händelsetexter finns på svenska och engelska');
  const bt = { n: 1, t: 1, k: 'bug', sc: 'dev', s: 1, who: 'Lisa', g: 'Rymd', a: 2, v: 0 };
  setLang('en'); const en = S.lifeText(bt); setLang('sv'); const sv = S.lifeText(bt);
  ok(en === 'Lisa found a bug in Rymd.' && sv === 'Lisa hittade en bugg i Rymd.' && !/[{}]/.test(en + sv), 'lifeText ger färdig text i båda språken');
  ok(S.lifeText({ ...bt, who: '', k: 'hired', v: 0 }).startsWith('Någon'), 'utan namn blir det Någon');
  const fb = { n: 2, t: 1, k: 'built', sc: 'studio', s: 0, who: '', g: 'coffee', a: 0, v: 0 };
  ok(/Kaffe/.test(S.lifeText(fb)), 'en anläggning visas med sitt namn på spelarens språk');
  // en sparning från före flödet
  const GO = JSON.parse(JSON.stringify(W)); delete GO.life;
  ok(S.lifeLog(GO).length === 0 && S.beat(GO, 'idea', { staff: GO.staff[0] }) && GO.life.items.length === 1, 'en gammal sparning utan flödet fortsätter som vanligt');
  // utmattning och övertid
  const W2 = JSON.parse(JSON.stringify(W)); W2.life = { n: 0, last: {}, items: [] };
  W2.job = null;
  S.startProject(W2, { title: 'Sent', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  S.toggleCrunch(W2); S.toggleCrunch(W2);
  ok(W2.life.items.map((b) => b.k).join() === 'crunch,relax', 'övertid på och av syns i flödet');
  W2.staff.forEach((x) => { x.fatigue = 40; });
  S.lifeWeek(W2);
  ok(W2.life.items.some((b) => b.k === 'tired' && b.s), 'den som är mest utsliten får en egen händelse');
  off();
  // hårdvara: konstruktion, prov, leverans och lansering
  const H = S.newGame({ studio: 'Hw', seed: 92 }); S.makeCompetitors(H); S.initWorld(H);
  H.t = 48 * 30; H.money = 5e9; H.fans = 3e5;
  Object.assign(H.u.flags, { hw: true, hw_gpu: true, hw_cpu: true, hw_pc: true, hw_lowpow: true, hw_handheld: true, hw_console: true, hw_devkit: true });
  const hg = [];
  const off2 = onBus('life', (b) => hg.push(b));
  H.t++; S.hwWeek(H);
  ok(S.lifeState(H, 'hw').open === true && S.lifeState(H, 'hw').designing.length === 0 && S.lifeState(H, 'dev').active === false, 'hårdvarans ögonblicksbild utan projekt');
  ok(S.startDesign(H, { type: 'gpu', cls: 'mid', name: 'Nova Prime' }) === true && hg.some((b) => b.k === 'hwStart' && b.g === 'Nova Prime' && b.sc === 'hw'), 'en konstruktion ger en händelse');
  const hs = S.lifeState(H, 'hw').designing[0];
  ok(hs && hs.name === 'Nova Prime' && hs.type === 'gpu' && hs.pct === 0, 'ögonblicksbilden visar projektet på ritbordet');
  const J = H.hw.projects[0];
  for (let i = 0; i < 80 && J.state === 'design'; i++) { H.t++; S.hwWeek(H); }
  ok(hg.some((b) => b.k === 'hwHalf') && hg.some((b) => b.k === 'hwProto' && b.a === (J.state === 'ready' ? 1 : 0) && b.v === (J.state === 'ready' ? 0 : 1)), 'halvvägs och provserien kommer som händelser (' + J.state + ')');
  if (J.state === 'fail') S.resolveProto(H, J.id, 'ship');
  ok(S.launch(H, J.id, { partner: 'meridian', units: 20000 }) === true, 'lanserad');
  ok(S.lifeState(H, 'hw').orders.length >= 1 && S.lifeState(H, 'hw').prod.length === 1, 'en order och en produkt i tillverkning syns i ögonblicksbilden');
  for (let i = 0; i < 40 && H.hw.products[0].state === 'prod'; i++) { H.t++; S.hwWeek(H); }
  const pl = hg.find((b) => b.k === 'hwParts');
  const lh = hg.find((b) => b.k === 'hwLaunch');
  ok(pl && pl.a > 0 && pl.g === 'Nova Prime' && lh && lh.a > 0 && lh.v === (lh.a >= 7 ? 0 : lh.a >= 5.5 ? 1 : 2) && S.lifeState(H, 'hw').market === 1, 'leveransen till lagret och lanseringen syns (' + (pl && pl.a) + ' st, betyg ' + (lh && lh.a) + ')');
  S.discontinue(H, H.hw.products[0].id);
  ok(hg.some((b) => b.k === 'hwEnd'), 'att lägga ned en produkt syns');
  ok(S.lifeLog(H, 'hw').length === hg.length && S.lifeLog(H, 'dev').length === 0, 'hårdvaruhändelserna hör till hårdvaruscenen');
  off2();
}

// ── Livet i studion: det som händer runt spelen (jubileer, fest, gäster, pizza, fanbrev) ───────────────────────
{
  const W = S.newGame({ studio: 'Flavour', seed: 93 }); S.makeCompetitors(W); S.initWorld(W);
  W.t = 48 * 5; W.money = 1e8; W.fans = 5000; W.office.tier = 3;
  for (let i = 0; i < 3; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
  const hired = W.staff.filter((x) => !x.isFounder);
  hired[0].hired = W.t - 48; hired[1].hired = W.t - 96; hired[2].hired = W.t - 30;
  const got = [];
  const off = onBus('life', (b) => got.push(b));
  const rng0 = W.rng;
  S.lifeWeek(W);
  const an = got.filter((b) => b.k === 'anniv');
  ok(an.length >= 2 && an.some((b) => b.s === hired[0].id && b.a === 1) && an.some((b) => b.s === hired[1].id && b.a === 2) && !an.some((b) => b.s === hired[2].id), 'jubileer: den som varit här ett helt antal år firas (' + an.map((b) => b.who + ' ' + b.a).join(', ') + ')');
  const gm = (id, age, score) => ({ id, title: id, platform: 'pc', genre: 'action', topic: 'space', scope: 'small', score, total: 1e6, t: W.t - age, tail: 1, priceAt: 30, weekly: [], revenue: 0, units: 0, fansGained: 0, ended: false });
  W.games.push(gm('Fest', 2, 8.6), gm('Gast', 4, 7.7), gm('Svag', 2, 6), gm('Auto', 2, 9));
  W.games[W.games.length - 1].auto = true;
  got.length = 0;
  S.lifeWeek(W);
  ok(got.filter((b) => b.k === 'party').length === 1 && got.find((b) => b.k === 'party').g === 'Fest' && got.find((b) => b.k === 'party').a === 8.6, 'ett bra släpp ger fest veckan efter försäljningsstarten (inte för svaga eller självgående spel)');
  ok(got.filter((b) => b.k === 'visitor').length === 1 && got.find((b) => b.k === 'visitor').g === 'Gast', 'och en gäst på besök fyra veckor efter släppet');
  // fanbrev: ett per ny nivå, första veckan bara räknar
  got.length = 0;
  S.lifeWeek(W);
  ok(!got.some((b) => b.k === 'fans'), 'fansen: inget brev utan ny nivå');
  W.fans = 2e5;
  S.lifeWeek(W);
  const fb = got.find((b) => b.k === 'fans');
  ok(fb && fb.a === 1e5 && /100 000/.test(S.lifeText(fb)), 'fansen: ett brev när en ny nivå nås, med tusentalsavgränsare (' + (fb && S.lifeText(fb)) + ')');
  got.length = 0;
  S.lifeWeek(W);
  ok(!got.some((b) => b.k === 'fans'), 'men inte igen för samma nivå');
  // pizza under övertid
  W.job = null;
  S.startProject(W, { title: 'Pizza', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  W.job.crunch = true;
  got.length = 0;
  for (let i = 0; i < 40; i++) { W.t++; W.tick = 0; S.lifeWeek(W); }
  const pz = got.filter((b) => b.k === 'pizza');
  ok(pz.length >= 2 && pz.length <= 20 && pz.every((b) => b.g === 'Pizza'), 'pizza under övertid, ungefär var fjärde vecka (' + pz.length + ' på 40)');
  W.job.crunch = false;
  got.length = 0;
  for (let i = 0; i < 40; i++) { W.t++; S.lifeWeek(W); }
  ok(!got.some((b) => b.k === 'pizza'), 'ingen pizza utan övertid');
  ok(W.rng === rng0, 'det som händer runt spelen rör inte slumptalen');
  off();
}

// ── Motorteam: ett team bygger spelmotorer vid sidan om studions projekt ────────────────────────────
{
  const mk = () => {
    const W = S.newGame({ studio: 'Eng', seed: 83 }); S.makeCompetitors(W); S.initWorld(W);
    for (const r of RESEARCH) { W.research.done.push(r.id); S.applyUnlocks(W, r); }
    delete W.u.flags.store; delete W.u.flags.engTeams;
    W.t = 48 * 22 + 6; W.money = 1e8; W.fans = 1e5; W.office.tier = 4;
    for (let i = 0; i < 9; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
    S.buildFacility(W, 'lab');
    return W;
  };
  const G1 = mk();
  const crew = G1.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(G1);
  for (const x of crew.slice(0, 5)) S.addMember(G1, T.id, x.id);
  ok(S.canEng(G1, T) === 'engLocked' && typeof S.assignEng(G1, T.id) === 'string' && !S.engOpen(G1) && S.setEng(G1, 'on', 0) === false, 'ett motorteam kräver forskningen Motorteam');
  G1.u.flags.engTeams = true;
  ok(S.seatCap(G1) === 6 && S.engNeed(G1) === 8, 'verkstaden ger tre platser till och behovet följer tiden (' + S.seatCap(G1) + ' platser, behov ' + S.engNeed(G1) + ')');
  const GN = JSON.parse(JSON.stringify(G1)); delete GN.u.flags.engines;
  ok(S.canEng(GN, GN.teams[0]) === 'engWorkshop', 'utan en motorverkstad finns inget att bygga i');
  const w0 = S.workers(G1).length;
  ok(S.assignEng(G1, T.id) === true && T.role === 'eng' && T.target === 'engine' && T.members.every((id) => G1.staff.find((x) => x.id === id).away) && S.workers(G1).length === w0 - 5, 'teamet går ut i verkstaden och är borta från dina projekt');
  ok(S.leadOf(G1, T) !== null && S.engTeamOf(G1) === T && S.outCount(G1) === 5, 'en arbetsledare utses och teamet sitter utanför huset');
  const T2 = S.createTeam(G1);
  for (const x of crew.slice(5, 7)) S.addMember(G1, T2.id, x.id);
  ok(S.canEng(G1, T2) === 'engTaken', 'bara ett team bygger motorerna');
  S.disbandTeam(G1, T2.id);
  const inf = S.engInfo(G1, T);
  ok(inf.eff > 0 && inf.eff < 1 && inf.need === 8 && inf.n === 5 && Math.abs(inf.bonus - S.ENG_BONUS * inf.eff) < 1e-9, 'effekten följer hur många de är mot behovet (' + inf.eff.toFixed(2) + ')');
  // beställning
  const got = [];
  const off = onBus('life', (b) => got.push(b));
  const done = [];
  const off2 = onBus('engineDone', (e) => done.push(e));
  const feats = G1.u.feats.slice(0, 4);
  ok(S.canEngOrder(G1, T, [feats[0]]) === 'engFew' && S.canEngOrder(G1, null, feats) === 'engNoTeam', 'en motor kräver minst två delar och ett team');
  const m0 = G1.money;
  const rng0 = G1.rng;
  ok(S.orderEngine(G1, 'Teammotor', feats) === true && T.ep && T.ep.name === 'Teammotor' && G1.money === m0 - S.engineCost(feats) && G1.rng === rng0, 'beställningen betalas direkt och rör inte slumptalen');
  ok(S.orderEngine(G1, 'Två', feats) === 'engBusy' || typeof S.orderEngine(G1, 'Två', feats) === 'string', 'teamet bygger en motor i taget');
  ok(!G1.job && got.some((b) => b.k === 'engStart' && b.g === 'Teammotor' && b.sc === 'eng'), 'studions projektplats är fri och bygget syns som en händelse');
  // studion kan göra spel under tiden
  const gr = S.startProject(G1, { title: 'Under tiden', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  ok(typeof gr === 'object' && G1.job && G1.job.kind === 'game', 'studion kan starta ett spel medan teamet bygger');
  const st0 = S.lifeState(G1, 'eng');
  ok(st0.open && st0.builds.length === 1 && st0.builds[0].by === 'team' && st0.builds[0].name === 'Teammotor' && st0.team && st0.team.n === 5 && st0.team.lead && st0.crew.length === 5 && st0.crew.filter((c) => c.lead).length === 1, 'ögonblicksbilden visar teamets bygge, teamet och arbetsledaren');
  // veckorna
  const need = T.ep.need;
  let weeks = 0;
  while (T.ep && weeks++ < 400) { G1.t++; S.engWeek(G1); }
  const kinds = got.map((b) => b.k);
  ok(!T.ep && done.length === 1 && T.engN === 1 && G1.engines.length === 1, 'motorn blev klar (' + weeks + ' veckor, bygget var ' + need + ' veckor vid full effekt)');
  ok(kinds.includes('engHalf') && kinds.includes('engTest') && kinds.includes('engine') && kinds.indexOf('engHalf') < kinds.indexOf('engTest') && kinds.indexOf('engTest') < kinds.indexOf('engine'), 'halvvägs, provkörning och klar kommer som händelser i ordning');
  const e = G1.engines[0];
  const base = S.engineTech(feats);
  ok(e.team === T.id && e.tech > base && Math.abs(e.tech - Math.round(base * (1 + S.ENG_BONUS * T.eff) * 10) / 10) < 0.11 && weeks > need, 'ett team som inte når full effekt bygger långsammare men får lite mer teknik (' + base + ' -> ' + e.tech + ')');
  ok(G1.job && G1.job.kind === 'game' && G1.job.state === 'dev', 'spelet i studion är orört av bygget');
  const sd = S.lifeState(G1, 'eng');
  ok(sd.builds.length === 0 && sd.engines.length === 1 && sd.engines[0].team === true && sd.engines[0].ratio > 0, 'efteråt visas motorn och inget bygge');
  // pågående bygge stannar under lägsta effekt
  const G2 = mk(); G2.u.flags.engTeams = true;
  const T3 = S.createTeam(G2);
  for (const x of G2.staff.filter((y) => !y.isFounder).slice(0, 2)) S.addMember(G2, T3.id, x.id);
  ok(S.assignEng(G2, T3.id) === true && S.engInfo(G2, T3).eff >= 0, 'ett litet team går också');
  S.orderEngine(G2, 'Liten', G2.u.feats.slice(0, 3));
  const wk = (T3.ep || {}).need;
  for (let i = 0; i < 6; i++) { G2.t++; S.engWeek(G2); }
  const eff2 = S.engInfo(G2, T3).eff;
  ok(eff2 < 0.6 && (eff2 < S.ENG_ON ? T3.ep.w === 0 : T3.ep.w > 0 && T3.ep.w < 6 * 1.0001), 'bygget går i takt med effekten (' + eff2.toFixed(2) + ', ' + (T3.ep ? T3.ep.w.toFixed(1) : 'klart') + ' av ' + wk + ')');
  // teamet byter motor själv
  const G3 = mk(); G3.u.flags.engTeams = true;
  const T4 = S.createTeam(G3);
  for (const x of G3.staff.filter((y) => !y.isFounder).slice(0, 6)) S.addMember(G3, T4.id, x.id);
  ok(S.assignEng(G3, T4.id) === true, 'ett större team');
  const P = S.engPolicy(G3);
  ok(P.on === 1 && P.when === 1 && P.size === 1 && P.budget === 1 && S.setEng(G3, 'size', 2) === true && S.setEng(G3, 'size', 9) === false && P.size === 2 && S.setEng(G3, 'x', 1) === false && S.setEng(G3, 'on', 0) === true && P.on === 0, 'policyn kan sättas och begränsas');
  S.setEng(G3, 'size', 1);
  const mm = G3.money;
  G3.t++; S.engWeek(G3);
  ok(!T4.ep && G3.money === mm && P.n === 0, 'avstängt bygger teamet ingen motor själv');
  S.setEng(G3, 'on', 1);
  G3.money = 1000; // under reserven: inga betalda motorer
  G3.t++; S.engWeek(G3);
  ok(!T4.ep && G3.money === 1000, 'utan pengar över reserven bygger teamet inget');
  G3.money = 1e8;
  const GBR = S.bestRatio(G3);
  G3.t++; S.engWeek(G3);
  ok(GBR === 0 && T4.ep && T4.ep.auto === true && P.n === 1 && P.fee === T4.ep.cost && G3.money === 1e8 - T4.ep.cost && T4.ep.cost <= 0.05 * 1e8 + 1, 'utan motor beställer teamet en själv inom budgeten (' + T4.ep.name + ' för ' + T4.ep.cost + ')');
  ok(/^(Motor|Engine) 1$/.test(T4.ep.name), 'och ger den ett namn');
  // budgeten begränsar
  const G4 = mk(); G4.u.flags.engTeams = true;
  const T5 = S.createTeam(G4); for (const x of G4.staff.filter((y) => !y.isFounder).slice(0, 6)) S.addMember(G4, T5.id, x.id);
  S.assignEng(G4, T5.id);
  S.setEng(G4, 'budget', 0);
  const f2 = S.pickFeats(G4, 1e9, 0.02 * G4.money);
  ok(S.engineCost(f2) <= 0.02 * G4.money + 1 && S.pickFeats(G4, 1e9, 10).length === 0, 'delarna väljs inom budgeten');
  // sent: en bra motor ger ingen ny
  const G5 = mk(); G5.u.flags.engTeams = true;
  const T6 = S.createTeam(G5); for (const x of G5.staff.filter((y) => !y.isFounder).slice(0, 6)) S.addMember(G5, T6.id, x.id);
  S.assignEng(G5, T6.id);
  G5.engines.push({ id: G5.uid++, name: 'Gammal', feats: G5.u.feats.slice(), tech: 9999, built: S.yfOf(G5.t) });
  G5.t++; S.engWeek(G5);
  ok(S.bestRatio(G5) >= 1 && !T6.ep, 'har studion en motor som räcker bygger teamet ingen ny');
  // avsluta
  ok(S.endEng(G2, T3.id) === true && T3.role !== 'eng' && T3.ep === null && G2.staff.filter((x) => T3.members.includes(x.id)).every((x) => !x.away), 'teamet kan sluta med motorerna och är tillbaka i huset');
  // gammal sparning
  const GO = JSON.parse(JSON.stringify(G1)); delete GO.engp; GO.teams.forEach((x) => { delete x.eff; delete x.engW; delete x.engN; delete x.ep; });
  ok(S.engPolicy(GO).on === 1 && (S.engWeek(GO), true), 'en gammal sparning utan motorteamets fält fortsätter som vanligt');
  off(); off2();
}
// ── Livet i fler scener: koncern, butik, onlinespel och labb ─────────────────────────────────────
{
  const W = S.newGame({ studio: 'Scener', seed: 95 }); S.makeCompetitors(W); S.initWorld(W);
  for (const r of RESEARCH) { W.research.done.push(r.id); S.applyUnlocks(W, r); }
  W.t = 48 * 24 + 14; W.money = 1e9; W.fans = 5e5; W.office.tier = 4;
  for (let i = 0; i < 8; i++) { S.refreshCandidates(W); W.money += W.candidates[0].fee; S.hire(W, W.candidates[0].id); }
  const got = [];
  const off = onBus('life', (b) => got.push(b));
  const rng0 = W.rng;
  // lab
  const sl = S.lifeState(W, 'lab');
  ok(sl.done > 0 && Array.isArray(sl.active) && typeof sl.lab === 'number' && typeof sl.teams === 'number', 'labbets ögonblicksbild har forskning, labbnivå och team');
  // butik
  const WS = S.newGame({ studio: 'Shop2', seed: 96 }); S.makeCompetitors(WS); S.initWorld(WS);
  WS.t = 48 * 24 + 14; WS.money = 1e8; WS.fans = 2e5; WS.office.tier = 4;
  for (let i = 0; i < 3; i++) { S.refreshCandidates(WS); WS.money += WS.candidates[0].fee; S.hire(WS, WS.candidates[0].id); }
  WS.u.flags.store = true;
  WS.games.length = 0;
  const gm = (id, age, score, peak) => ({ id, title: id, platform: 'pc', genre: 'action', topic: 'space', scope: 'small', score, total: 2e6, t: WS.t - age, tail: 1, priceAt: 30, weekly: [peak].concat(Array(age - 1).fill(3000)), revenue: 0, units: 0, fansGained: 0, ended: true });
  WS.games.push(gm('hit', 30, 9, 4e4), gm('c', 40, 8, 4e4), gm('d', 50, 8, 4e4), gm('e', 36, 8, 4e4), gm('f', 45, 8, 4e4));
  S.storeWeek(WS);
  WS.stats.storeUsers = 3e6; WS.store.lvl = 4;
  const ss = S.lifeState(WS, 'store');
  ok(ss.open && ss.lvl === 4 && ss.spots === 0 && ss.deals === 0 && ss.bundles === 0 && ss.ev === null && ss.team === null, 'butikens ögonblicksbild utan kampanjer');
  S.startSpot(WS, 'hit'); S.startDeal(WS, 'c', 1); S.startBundle(WS, ['d', 'e', 'f']);
  const se = S.lifeLog(WS, 'store').map((b) => b.k);
  ok(se.includes('shopSpot') && se.includes('shopDeal') && se.includes('shopBundle'), 'kampanjerna syns som händelser (' + se.join() + ')');
  const s2 = S.lifeState(WS, 'store');
  ok(s2.spots === 1 && s2.deals === 1 && s2.bundles === 1, 'och i ögonblicksbilden');
  // en nivå upp och miljonklubben
  // koncern
  const sg = S.lifeState(W, 'group');
  ok(sg.open === !!W.u.flags.group && Array.isArray(sg.subs) && typeof sg.pub === 'number' && typeof sg.lic === 'number', 'koncernens ögonblicksbild har bolag, förlag och licenser');
  const sv = S.lifeState(W, 'live');
  ok(sv.open === false && sv.games.length === 0, 'onlinespelens ögonblicksbild är tom utan spel');
  // onlinespel: lansering, innehållsuppdatering och säsong
  const WO = S.newGame({ studio: 'Live', seed: 98 }); S.makeCompetitors(WO); S.initWorld(WO);
  WO.t = 48 * 26; WO.money = 1e9; WO.fans = 5e5;
  WO.games.push({ id: 7701, title: 'Online', t: WO.t - 20, score: 8, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
  S.launchLive(WO, WO.games[0]);
  const lv = WO.games[0].live; lv.subs = 200000; lv.pot = 250000; lv.fresh = 50;
  const lk = () => S.lifeLog(WO, 'live').map((b) => b.k);
  ok(lk().includes('liveLaunch') && S.lifeLog(WO, 'live')[0].g === 'Online', 'ett onlinespel som lanseras syns som en händelse');
  const sl2 = S.lifeState(WO, 'live');
  ok(sl2.open && sl2.games.length === 1 && sl2.games[0].name === 'Online' && sl2.games[0].subs === 200000 && sl2.games[0].fresh === 50 && sl2.games[0].season === false, 'och i ögonblicksbilden (spelare, nyhetsvärde, säsong)');
  WO.t += 20;
  S.startLivePatch(WO, WO.games[0].id);
  for (let i = 0; i < 12; i++) { WO.t++; S.liveWeek(WO); }
  ok(lk().includes('livePatch'), 'en klar innehållsuppdatering syns (' + lk().join() + ')');
  // forskning
  const WR = S.newGame({ studio: 'Lab', seed: 99 }); S.makeCompetitors(WR); S.initWorld(WR);
  WR.money = 1e8; WR.rp = 1e6;
  const rid = RESEARCH.find((r) => S.canResearch(WR, r.id) === true);
  ok(rid && S.startResearch(WR, rid.id) === true && S.lifeLog(WR, 'lab').some((b) => b.k === 'resStart' && b.sc === 'lab'), 'en påbörjad forskning syns som en händelse');
  ok(S.lifeState(WR, 'lab').active.length === 1 && S.lifeState(WR, 'lab').active[0].pct === 0, 'och i labbets ögonblicksbild');
  ok(W.rng === rng0, 'ögonblicksbilderna rör inte slumptalen');
  off();
}

// ── Översikt och handledning: vad sköter sig självt och vad är nästa steg ───────────────────────────
{
  const W = S.newGame({ studio: 'Over', seed: 101 }); S.makeCompetitors(W); S.initWorld(W);
  const rng0 = W.rng;
  const rows0 = S.overviewRows(W);
  ok(rows0.length === 9 && rows0.every((r) => r.state === 'locked' && !r.open && r.need && r.need.id && r.need.name.sv), 'i början är alla områden låsta och pekar på forskningen som öppnar dem');
  ok(S.overviewSummary(W).open === 0 && S.overviewTodo(W).length === 0 && S.nextSteps(W).map((x) => x.id).join() === 'create', 'inget väntar och nästa steg är att göra ett spel');
  ok(!W.gb && !W.bz && !W.hr && !W.engp && W.rng === rng0, 'översikten läser bara: inga policyer skapas och slumptalen är orörda');
  const need = Object.fromEntries(rows0.map((r) => [r.id, r.need.id]));
  ok(need.eng === 's_eng' && need.board && need.biz && need.hr, 'varje område har en forskning som öppnar det (' + Object.values(need).join(',') + ')');
  // allt upplåst men inget igång
  const G1 = S.newGame({ studio: 'Over2', seed: 102 }); S.makeCompetitors(G1); S.initWorld(G1);
  for (const r of RESEARCH) { G1.research.done.push(r.id); S.applyUnlocks(G1, r); }
  G1.t = 48 * 24 + 6; G1.money = 1e8; G1.fans = 2e5; G1.office.tier = 4;
  for (let i = 0; i < 9; i++) { S.refreshCandidates(G1); G1.money += G1.candidates[0].fee; S.hire(G1, G1.candidates[0].id); }
  delete G1.u.flags.store;
  S.buildFacility(G1, 'lab');
  const idleRows = S.overviewRows(G1);
  ok(idleRows.every((r) => r.open && r.state === 'idle') && S.overviewSummary(G1).auto === 0, 'upplåst men inte igång ger raden Inte igång överallt (' + idleRows.map((r) => r.id + ':' + r.state).join(' ') + ')');
  ok(!G1.gb && !G1.bz && !G1.hr && !G1.engp, 'inte ens med allt upplåst skapas några policyer av att titta');
  // spelteam
  const crew = G1.staff.filter((x) => !x.isFounder);
  const T = S.createTeam(G1);
  for (const x of crew.slice(0, 4)) S.addMember(G1, T.id, x.id);
  ok(S.areaRow(G1, 'games').line[0] === 'ov.games.idle' && S.areaRow(G1, 'games').n === 1, 'ett spelteam utan uppdrag räknas men sköter inget');
  T.repeat = true;
  const gr = S.areaRow(G1, 'games');
  ok(gr.state === 'auto' && gr.line[0] === 'ov.games.auto' && gr.line[1].n === 1 && gr.line[1].r === 1, 'ett team som fortsätter själv sköter sig självt');
  // motorteam
  const T2 = S.createTeam(G1);
  for (const x of crew.slice(4, 9)) S.addMember(G1, T2.id, x.id);
  ok(S.assignEng(G1, T2.id) === true, 'motorteam bildat');
  const er = S.areaRow(G1, 'eng');
  ok(er.state === 'auto' && er.line[0] === 'ov.eng.watch' && er.eff > 0 && er.n === 1, 'ett motorteam som bevakar motorerna sköter sig självt');
  S.setEng(G1, 'on', 0);
  ok(S.areaRow(G1, 'eng').state === 'idle' && S.areaRow(G1, 'eng').line[0] === 'ov.eng.off', 'avstängt visas det som inte igång');
  S.setEng(G1, 'on', 1);
  S.orderEngine(G1, 'Visad', G1.u.feats.slice(0, 4));
  ok(S.areaRow(G1, 'eng').line[0] === 'ov.eng.build' && S.areaRow(G1, 'eng').line[1].name === 'Visad' && S.areaRow(G1, 'eng').line[1].n === 0, 'ett pågående bygge visas med namn och procent');
  // butik, personalavdelning, styrelse och affärsavdelning
  ok(S.areaRow(G1, 'shop').line[0] === 'ov.shop.nostore', 'butiksteam utan butik: öppna butiken först');
  ok(S.areaRow(G1, 'hr').line[0] === 'ov.hr.idle', 'personalavdelningen utan plan är inte igång');
  S.setHrPlan(G1, 2, 5);
  ok(S.areaRow(G1, 'hr').state === 'auto' && S.areaRow(G1, 'hr').line[1].b === 2 && S.areaRow(G1, 'hr').line[1].s === 5, 'med en plan sköter avdelningen sig själv');
  ok(S.areaRow(G1, 'board').state === 'idle' && !G1.gb, 'styrelsen utan påslagna val är inte igång, och att titta skapar ingen policy');
  S.setBoard(G1, 'buy', 1);
  const br = S.areaRow(G1, 'board');
  ok(br.state === 'auto' && br.next && 'act' in br.next && 'why' in br.next, 'påslagen styrelse visar sitt nästa steg');
  ok(S.areaRow(G1, 'biz').state === 'idle', 'affärsavdelningen utan påslagna val är inte igång');
  S.setBiz(G1, 'pub', 1);
  ok(S.areaRow(G1, 'biz').state === 'auto', 'påslagen avdelning sköter sig själv');
  ok(S.overviewSummary(G1).auto >= 5 && S.overviewSummary(G1).open === 9, 'sammanfattningen räknar områden som sköter sig av dem som är upplåsta (' + S.overviewSummary(G1).auto + ' av 9)');
  // det som väntar på dig
  ok(!S.overviewTodo(G1).some((x) => x.k === 'ov.todo.cash'), 'med gott om pengar väntar ingen kassavarning');
  G1.money = 100;
  G1.games.push({ id: 5, title: 'Gammalt', score: 7, t: G1.t - 40, weekly: [1], total: 1, platform: 'pc', genre: 'action', topic: 'space', scope: 'small', revenue: 0, units: 0 });
  const td = S.overviewTodo(G1);
  ok(td.some((x) => x.k === 'ov.todo.cash' && x.p.n === 0 && x.win === 'finance'), 'trång kassa varnas för när något sköter sig självt');
  ok(td.some((x) => x.k === 'ov.todo.idle') && td.length <= 5, 'inget spel på gång och inget uppdrag syns (högst fem rader)');
  // ett team som inte räcker till
  const G2 = JSON.parse(JSON.stringify(G1));
  const t2 = G2.teams.find((x) => x.role === 'eng');
  t2.members = t2.members.slice(0, 2);
  ok(S.teamEff(G2, t2) < 0.3 && S.overviewTodo(G2).some((x) => x.k === 'ov.todo.low' && x.p.m === 2 && typeof x.p.team === 'string'), 'ett team som klarar mindre än 30 % hamnar bland det som väntar på dig');
  // nästa steg följer läget
  const ids = (W2) => S.nextSteps(W2).map((x) => x.id);
  const G3 = S.newGame({ studio: 'Steps', seed: 103 }); S.makeCompetitors(G3); S.initWorld(G3);
  G3.money = 1e5;
  S.startProject(G3, { title: 'Steg', topic: 'space', genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  ok(ids(G3).join() === 'dev', 'under det första spelet är nästa steg att följa utvecklingen');
  G3.job = null; G3.games.push({ id: 1, title: 'A', score: 7, t: G3.t - 5, weekly: [1], total: 1, platform: 'pc', genre: 'action', topic: 'space', scope: 'small', revenue: 0, units: 0 });
  ok(ids(G3)[0] === 'research' && ids(G3).length <= 3, 'efter första spelet: forska, och högst tre förslag');
  G3.flags.overviewSeen = 0;
  const allFlags = S.GUIDE_STEPS.every((id) => STRINGS[`guide.next.${id}.h`] && STRINGS[`guide.next.${id}.b`] && STRINGS[`guide.next.${id}.h`][1] && STRINGS[`guide.next.${id}.b`][1]);
  ok(allFlags && S.AREAS.every((a) => STRINGS['ov.a.' + a.id] && STRINGS['ov.d.' + a.id]), 'alla steg och områden har texter på båda språken');
  // rader med alla tillstånd har texter
  let miss = 0;
  for (const G of [G1, W]) for (const r of S.overviewRows(G)) if (r.state !== 'locked') { const e = STRINGS[r.line[0]]; if (!e || !e[0] || !e[1]) { miss++; console.log('saknas', r.line[0]); } }
  ok(miss === 0, 'radernas texter finns');
  ok(G1.rng !== undefined && W.rng === rng0, 'översikten rör inte slumptalen');
}

// ── Livespel i skala: världen med gillen, fejder och sända finaler ───────────────────────────────────
{
  const mkW = (kind = 'mmo', subs = 300000, year = 2012, seed = 0) => {
    const GE = JSON.parse(JSON.stringify(G));
    if (seed) GE.seed = seed;
    GE.pending = []; GE.t = 48 * (year - 1980) + 5; GE.money = 1e9;
    GE.games.push({ id: 8100, title: 'W', t: GE.t - 20, score: 8, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
    const g = GE.games[GE.games.length - 1];
    S.launchLive(GE, g, kind);
    g.live.subs = subs; g.live.pot = subs * 1.25;
    return [GE, g];
  };
  const wk = (GE, n = 1) => { for (let i = 0; i < n; i++) { S.worldWeek(GE); GE.t++; } };
  const toFinal = (GE, g) => { let n = 0; wk(GE); while (!g.live.world.fin && n++ < 40) wk(GE); return n; };
  const guildNames = new Set(GUILDS);

  // stegen följer spelarna, och under tvåtusen finns ingen värld
  ok([1999, 2000, 19999, 20000, 150000, 800000, 3e6].map(S.worldTierOf).join() === '0,1,1,2,3,4,5' && S.WORLD_TIERS.length === 5, 'världen har fem steg som följer antalet spelare');
  const [G0, g0] = mkW('mmo', 1500);
  const before0 = JSON.stringify(g0.live);
  const plan0 = S.worldPlan(G0, g0, 0);
  S.worldAutoPick(G0, g0, null);
  ok(JSON.stringify(g0.live) === before0 && !g0.live.world && Number.isFinite(plan0.cost) && plan0.cost > 0, 'förhandsvisningen läser bara och skapar ingen värld');
  const rng0 = G0.rng;
  wk(G0, 5);
  ok(!g0.live.world && G0.rng === rng0, 'ett spel med för få spelare får ingen värld, och slumptalen är orörda');
  ok(S.setWorldProd(G0, g0.id, 0) === false && S.setWorldAuto(G0, g0.id, true) === false, 'sändningen går inte att välja innan världen finns');

  // en värld föds: rätt antal gillen, unika namn ur listan, och en nyhet
  const [G1, g1] = mkW('mmo', 300000);
  const rng1 = G1.rng;
  wk(G1);
  const W1 = g1.live.world;
  ok(W1 && W1.tier === 3 && W1.guilds.length === 8 && new Set(W1.guilds.map((x) => x.name)).size === 8 && W1.guilds.every((x) => guildNames.has(x.name) && x.s >= 0.55 && x.s <= 1), 'ett spel med 300 000 spelare får åtta gillen med unika namn');
  ok(G1.news.some((n) => n.key === 'world.news.born') && S.lifeLog(G1, 'live').some((b) => b.k === 'worldTier' && b.gid === g1.id && b.a === 3), 'världens födelse blir en nyhet och en scenhändelse för rätt spel');
  wk(G1, 12);
  const rk = S.worldLadder(W1);
  ok(rk.every((x) => x.pts > 0) && rk.every((x, i) => !i || rk[i - 1].pts >= x.pts) && W1.lead === rk[0].name && W1.heat >= 0 && W1.heat <= 100, 'rankingen samlar poäng, är sorterad och ledaren är den med flest');
  ok(G1.rng === rng1, 'världen rör aldrig spelets slumptal');
  // samma frö ger samma värld, ett annat frö en annan
  const [G2, g2] = mkW('mmo', 300000);
  wk(G2, 13);
  const [G3, g3] = mkW('mmo', 300000, 2012, 99);
  wk(G3, 13);
  ok(JSON.stringify(g2.live.world) === JSON.stringify(g1.live.world) && JSON.stringify(g3.live.world) !== JSON.stringify(g1.live.world), 'samma frö ger samma värld och ett annat frö en annan');
  // ledarbyten höjer spänningen
  const [G14, g14] = mkW('mmo', 300000);
  wk(G14, 23);
  ok(g14.live.world.swaps > 0 && g14.live.world.heat > 0 && S.lifeLog(G14, 'live').some((b) => b.k === 'worldLead' && b.gid === g14.id), 'ledarbyten räknas, höjer spänningen och blir scenhändelser');
  // världen växer med spelarna och får fler gillen mitt i säsongen
  g1.live.subs = 4e6;
  wk(G1);
  ok(W1.tier === 5 && W1.guilds.length === 12 && new Set(W1.guilds.map((x) => x.name)).size === 12 && G1.news.some((n) => n.key === 'world.news.grow'), 'stora spelartal ger hela världen med tolv gillen');
  g1.live.subs = 1000;
  wk(G1);
  ok(W1.tier === 5 && W1.guilds.length === 12, 'världen krymper inte när spelarna går');

  // finalen utan sändning: ingenting kostar eller ger pengar
  const [G4, g4] = mkW('mmo', 300000);
  const n4 = toFinal(G4, g4);
  const W4 = g4.live.world;
  ok(n4 === 24 && W4.fin && W4.fin.prod === -1 && W4.fin.cost === 0, 'finalen börjar efter 24 veckor, utan sändning om inget valts');
  const top4 = S.worldLadder(W4).slice(0, 4).map((x) => x.name);
  ok(W4.fin.semis[0][0] === top4[0] && W4.fin.semis[0][1] === top4[3] && W4.fin.semis[1][0] === top4[1] && W4.fin.semis[1][1] === top4[2] && W4.fin.final.every((x) => top4.includes(x)) && W4.fin.semis.map((s) => s[2]).includes(W4.fin.final[2]), 'de fyra bästa möts: ett mot fyra, två mot tre, och mästaren kommer ur finalen');
  const sc4 = S.lifeState(G4, 'live').games[0].world;
  ok(sc4 && sc4.final && sc4.final.round === 1 && sc4.final.semis.length === 2 && sc4.final.prod === -1 && sc4.guilds.length === 5 && sc4.noun === 'guild' && sc4.tier === 3 && sc4.week === 24, 'scenen får en final som pågår, semifinalerna först');
  const money4 = G4.money, subs4 = g4.live.subs;
  wk(G4);
  const sc4b = S.lifeState(G4, 'live').games[0].world;
  ok(sc4b.final && sc4b.final.round === 2 && sc4b.final.a === W4.fin.final[0] && sc4b.final.b === W4.fin.final[1], 'veckan efter spelas finalen');
  const champ4 = W4.fin.final[2];
  wk(G4);
  ok(!W4.fin && W4.log.length === 1 && W4.log[0].champ === champ4 && W4.champ === champ4 && W4.n === 2 && W4.guilds.every((x) => x.pts === 0) && W4.guilds.find((x) => x.name === champ4).ti === 1 && G4.stats.worldFinals === 1, 'mästaren kröns, rankingen nollställs och säsongen räknas upp');
  ok(G4.money === money4 && g4.live.subs === subs4 && W4.log[0].viewers === 0 && W4.log[0].roi === 0, 'utan sändning kostar finalen inget och ger inga pengar eller spelare');
  ok(G4.news.some((n) => n.key === 'world.news.hint') && S.lifeLog(G4, 'live').some((b) => b.k === 'worldFinal' && b.v === 1) && S.lifeLog(G4, 'live').some((b) => b.k === 'worldChamp' && b.g === champ4 && b.v === 1 && b.gid === g4.id), 'första finalen utan sändning ger ett tips, och scenen får sina händelser');
  toFinal(G4, g4); wk(G4, 2);
  ok(G4.news.some((n) => n.key === 'world.news.quiet') && W4.log.length === 2 && W4.hint === 1, 'tipset kommer bara en gång');

  // en sänd final: pengar ut och in, tittare, nya spelare, fans och e-sportscen
  const [G5, g5] = mkW('mmo', 300000);
  wk(G5);
  ok(S.setWorldProd(G5, g5.id, 1) === true && S.setWorldProd(G5, g5.id, 2) === false && S.setWorldProd(G5, g5.id, 3) === false && S.setWorldProd(G5, g5.id, 0.5) === false, 'studio går i kungariket men hela världen kräver kontinenten');
  const rng5 = G5.rng;
  let n5 = 0;
  while (!g5.live.world.fin && n5++ < 40) wk(G5);
  const F5 = g5.live.world.fin;
  ok(F5.prod === 1 && F5.cost > 0 && F5.plan.viewers > 0 && F5.viewers > 0, 'en vald sändning betalas när finalen börjar och första omgången sänds direkt');
  const subs5 = g5.live.subs, fans5 = G5.fans, rev5 = g5.live.rev;
  wk(G5, 2);
  const L5 = g5.live, W5 = L5.world, R5 = W5.log[0];
  ok(R5.prod === 1 && R5.viewers > 1000 && R5.sponsors > 0 && R5.newPlayers > 0 && R5.roi > 0 && L5.subs > subs5 && G5.fans > fans5 && L5.rev > rev5, 'en sänd final ger tittare, sponsorer, nya spelare och fans');
  ok(L5.esp && L5.esp.scene > 0 && L5.eLift > 1 && G5.stats.worldViewers > 0 && G5.month.breakdown.esports !== undefined && G5.news.some((n) => n.key === 'world.news.final'), 'sändningen lyfter e-sportscenen och blir en egen post i ekonomin och en nyhet');
  ok(L5.pot - 300000 * 1.25 <= 0.05 * 300000 * 1.25 + 1 && G5.rng === rng5, 'en del av de nya spelarna stannar (högst en liten andel) och slumptalen är orörda');
  ok(W5.prod === 1 && S.worldPlan(G5, g5, 1).viewers > S.worldPlan(G5, g5, 0).viewers * 1.1, 'valet består och en större sändning drar fler tittare');

  // pengarna räcker inte: ingen sändning, och ingenting dras
  const [G6, g6] = mkW('mmo', 300000);
  wk(G6); S.setWorldProd(G6, g6.id, 1);
  G6.money = 100;
  toFinal(G6, g6);
  ok(g6.live.world.fin.prod === -1 && G6.money === 100, 'när kassan inte räcker sänds inget och ingenting dras');

  // Auto: väljer det som ger mest kvar, och inget om det inte lönar sig eller kassan är för liten
  const [G7, g7] = mkW('mmo', 4e6, 2018);
  wk(G7);
  const W7 = g7.live.world;
  ok(S.setWorldAuto(G7, g7.id, true) === true && W7.auto && S.worldAutoPick(G7, g7, W7) === 2, 'Auto väljer hela världen i ett stort spel med gott om pengar');
  const nets = [0, 1, 2].map((p) => S.worldPlan(G7, g7, p).net);
  ok(nets[2] > nets[1] && nets[1] > nets[0] && nets.every((x) => x > 0), 'i hela världen lönar den största sändningen sig bäst');
  G7.money = S.worldPlan(G7, g7, 0).cost * 2;
  ok(S.worldAutoPick(G7, g7, W7) === -1, 'Auto sänder inget när kassan inte räcker till flera sändningar');
  const [G8, g8] = mkW('mmo', 30000, 2008);
  wk(G8);
  const pl8 = [0, 1].map((p) => S.worldPlan(G8, g8, p));
  ok(S.worldAutoPick(G8, g8, g8.live.world) === 0 && pl8[0].net > 0 && pl8[0].roi > pl8[1].roi, 'i ett litet landskap är egen kanal det som lönar sig');
  ok(S.setWorldProd(G8, g8.id, 1) === true && g8.live.world.auto === false && g8.live.world.prod === 1, 'att välja sändning själv stänger av Auto');
  const pl9 = S.worldPlan(G8, g8, -1);
  ok(pl9.viewers === 0 && pl9.cost === 0 && pl9.roi === 0, 'ingen sändning betyder noll av allt');

  // fejder: samma två gillen i final flera gånger i rad
  const [G10, g10] = mkW('mmo', 300000);
  wk(G10);
  const W10 = g10.live.world;
  S.setWorldProd(G10, g10.id, 0);
  let feudSeen = 0;
  for (let season = 0; season < 4; season++) {
    W10.guilds.forEach((x, i) => { x.s = i < 2 ? 1 : 0.5; });
    let g = 0;
    while (!W10.fin && g++ < 40) wk(G10);
    wk(G10, 2);
    if (W10.feud && W10.feud.n >= 2) feudSeen = Math.max(feudSeen, W10.feud.n);
  }
  ok(feudSeen >= 2 && S.lifeLog(G10, 'live').some((b) => b.k === 'worldFeud' && b.a === 2), 'två gillen som möts i final igen blir ärkefiender, med en scenhändelse');
  ok(W10.n === 5 && W10.log.length === 4 && W10.guilds.length === 8 && new Set(W10.guilds.map((x) => x.name)).size === 8, 'efter flera säsonger finns alla gillen kvar utan dubbletter');
  const heatNow = W10.heat;
  ok(heatNow > 10 && heatNow <= 100, 'en fejd håller spänningen uppe (' + Math.round(heatNow) + ')');

  // gillen byts ut med tiden, och en mästare återanvänds inte som nytt namn medan den finns i historiken
  const [G11, g11] = mkW('mmo', 300000);
  wk(G11);
  const W11 = g11.live.world;
  const start11 = W11.guilds.map((x) => x.name);
  for (let season = 0; season < 8; season++) { let g = 0; while (!W11.fin && g++ < 40) wk(G11); wk(G11, 2); }
  const now11 = W11.guilds.map((x) => x.name);
  ok(now11.length === 8 && new Set(now11).size === 8 && now11.some((n) => !start11.includes(n)) && W11.guilds.every((x) => x.s >= 0.5 && x.s <= 1), 'efter åtta säsonger har några gillen bytts ut och formen håller sig i gränserna');

  // lagsporter har lag, inte gillen
  const [G12, g12] = mkW('arena', 300000);
  wk(G12);
  const W12 = g12.live.world;
  ok(S.worldNounOf('arena') === 'team' && S.worldNounOf('mmo') === 'guild' && W12.guilds.every((x) => TEAM_A.some((a) => x.name.startsWith(a + ' '))) && S.lifeState(G12, 'live').games[0].world.noun === 'team', 'ett arenaspel har lag med lagnamn');

  // sparningar: en gammal sparning utan värld får en nästa vecka, och en sparning med värld läses tillbaka
  const G13 = JSON.parse(JSON.stringify(G1));
  const g13 = G13.games.find((x) => x.id === 8100);
  delete g13.live.world;
  g13.live.subs = 300000;
  wk(G13);
  ok(g13.live.world && g13.live.world.tier === 3, 'en gammal sparning får sin värld igen');
  ok(JSON.stringify(JSON.parse(JSON.stringify(W5))) === JSON.stringify(W5), 'världen går att spara och läsa tillbaka');

  // texter på båda språken för alla händelser
  let missW = 0;
  for (const k of ['worldTier', 'worldLead', 'worldFeud', 'worldFinal', 'worldChamp']) for (let v = 0; v < S.LIFE_KINDS[k].v; v++) { const e = STRINGS[`life.${k}.${v}`]; if (!e || !e[0] || !e[1]) { missW++; console.log('saknas', k, v); } }
  for (const k of Object.keys(STRINGS).filter((x) => x.startsWith('world.'))) if (!STRINGS[k][0] || !STRINGS[k][1]) { missW++; console.log('saknas', k); }
  ok(missW === 0 && S.lifeText(S.lifeLog(G4, 'live').find((b) => b.k === 'worldChamp')).includes(champ4), 'alla texter i världen finns på båda språken');
}

// ── Prestationer och statistik: trofésamling, historiebok, rekord och statistik ──────────────────────
{
  const catIds = ACH_CATS.flatMap((c) => c.ids);
  const allIds = ACHIEVEMENTS.map((a) => a.id);
  ok(allIds.length >= 86 && new Set(allIds).size === allIds.length, 'alla prestationer har egna id (' + allIds.length + ')');
  ok(catIds.length === allIds.length && new Set(catIds).size === catIds.length && catIds.every((id) => allIds.includes(id)) && allIds.every((id) => ACH_CAT[id]), 'varje prestation ligger i exakt en hylla');
  ok(ACH_WITH_PROGRESS.every((id) => allIds.includes(id)), 'framsteg finns bara för prestationer som finns');

  // en egen studio med hand byggda spel: tre årtionden, två genrer, en serie och ett onlinespel
  const mkB = () => {
    const GB = S.newGame({ studio: 'Bok', seed: 9, difficulty: 'normal' });
    S.makeCompetitors(GB); S.initWorld(GB);
    GB.pending = []; GB.t = 48 * 33 + 10; GB.money = 5e6; GB.fans = 4000;
    const add = (id, y, score, units, genre, platform, extra = {}) => GB.games.push({ id, title: 'Bok ' + id, t: 48 * (y - 1980) + 6, score, weekly: [units / 10], total: 0, priceAt: 30, topic: 'fantasy', genre, platform, scope: 'medium', audience: 'everyone', revenue: units * 12, units, ports: [], insights: [], reviews: [], flags: [], ...extra });
    add(9001, 1985, 7.0, 20000, 'rpg', 'pc');
    add(9002, 1992, 8.5, 150000, 'action', 'pc', { chart: { top: 3, best: 1, weeks: 8 } });
    add(9003, 1993, 9.1, 600000, 'action', 'pc', { sequelOf: 9002, chart: { top: 11, best: 1, weeks: 14 } });
    add(9004, 2005, 6.0, 5000, 'rpg', 'pc');
    add(9005, 2005, 8.0, 40000, 'rpg', 'pc', { expansionOf: 9004 });
    return GB;
  };
  const GB = mkB();
  const full = S.fullGames(GB);
  ok(full.length === 4 && S.fullGames(GB).every((g) => !g.expansionOf), 'expansioner räknas inte som egna spel i boken');
  const ls = S.lifeStats(GB);
  ok(ls.games === 4 && ls.expansions === 1 && ls.units === 20000 + 150000 + 600000 + 5000 + 40000 && ls.best >= 0 && ls.years === 33 && ls.discs === 4, 'studions siffror stämmer med spelen (' + ls.games + ' spel, ' + ls.discs + ' skivor)');
  ok(Math.abs(ls.avg - (7 + 8.5 + 9.1 + 6) / 4) < 1e-9, 'snittbetyget räknas på de egna spelen');

  // årtionden
  ok(S.decadesOf(GB).join() === '1980,1990,2000,2010' && S.decadeOf(1999) === 1990 && S.decadeOf(2000) === 2000, 'årtiondena räknas upp till nu');
  const d90 = S.decadeBook(GB, 1990);
  ok(d90.n === 2 && d90.best.id === 9003 && d90.seller.id === 9003 && d90.over && d90.discs === 2 && d90.years.length === 10, 'årtiondets bok: spel, bäst, storsäljare och skivor');
  const d10 = S.decadeBook(GB, 2010);
  ok(d10.n === 0 && d10.best === null && !d10.over && d10.years.length === 4, 'ett pågående årtionde utan spel har ingen bästa spel och bara åren hittills');
  ok(S.decadeBook(GB, 1980).platforms.every((id) => PLATFORM[id]) && S.decadeBook(GB, 1980).platforms.length >= 1, 'årtiondets nya plattformar finns i världen');

  // rekord
  const rec = Object.fromEntries(S.studioRecords(GB).map((r) => [r.id, r]));
  ok(rec.score.g.id === 9003 && rec.score.v === 9.1 && rec.score.y === 1993, 'rekord: högsta betyg med spel och år');
  ok(rec.units.g.id === 9003 && rec.units.v === 600000 && rec.week.g.id === 9003 && rec.top.v === 11, 'rekord: sålda exemplar, första veckan och veckor som etta');
  ok(rec.series.v === 2 && rec.series.g.id === 9003 && rec.fans.v >= 4000 && rec.cash.v >= 5e6 && rec.fans.g === null, 'rekord: längsta serien, fans och kassa (utan spel)');
  ok(!('live' in rec) && S.studioRecords(S.newGame({ studio: 'Tom', seed: 3, difficulty: 'normal' })).every((r) => r.v > 0), 'rekord utan värde visas inte');

  // uppdelning
  const bg = S.breakdown(GB, 'genre');
  ok(bg.length === 2 && bg[0].id === 'action' && bg[0].n === 2 && bg.every((r, i) => !i || bg[i - 1].rev >= r.rev) && bg.reduce((a, r) => a + r.n, 0) === 4, 'uppdelning per genre: sorterad på intäkter och alla spel med');
  ok(['platform', 'topic', 'scope'].every((k) => S.breakdown(GB, k).reduce((a, r) => a + r.n, 0) === 4) && Math.abs(bg[0].avg - 8.8) < 1e-9, 'uppdelning per plattform, tema och storlek, med snittbetyg');
  ok(S.breakdown(S.newGame({ studio: 'Tom', seed: 3, difficulty: 'normal' }), 'genre').length === 0, 'uppdelning utan spel är tom');

  // boken fylls ur kassahistoriken första gången, och år för år
  const GH = mkB();
  GH.hist.revenue = [{ t: 48 * 32 + 20, v: 1000 }, { t: 48 * 32 + 30, v: 500 }, { t: 48 * 33 + 2, v: 200 }];
  ok(!GH.book, 'boken finns inte förrän den behövs');
  const rng0 = GH.rng, money0 = GH.money, fans0 = GH.fans;
  const rows = S.yearRows(GH);
  ok(GH.book && rows.length === 34 && rows[0].y === 1980 && rows[32].sales === 1500 && rows[33].sales === 200 && rows[10].games === 0, 'boken läser in försäljning per år ur kassahistoriken');
  ok(rows.find((r) => r.y === 1993).games === 1 && rows.find((r) => r.y === 1993).best === 9.1, 'året visar antal spel och bästa betyg');
  S.bookMonth(GH);
  ok(GH.rng === rng0 && GH.money === money0 && GH.fans === fans0, 'historieboken rör varken pengar, fans eller slumptal');

  // månadssteget: en rad per månad in i boken, nytt årtionde, rekord och pokaler
  const GM = mkB();
  GM.t = 48 * 29 + 40; GM.hist.revenue = [{ t: 48 * 29 + 38, v: 700 }];
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').length === 0 && GM.book.rec.score === 9.1, 'första månaden ger inga händelser (rekorden bara noteras)');
  GM.hist.revenue.push({ t: 48 * 29 + 42, v: 300 });
  S.bookMonth(GM);
  ok(GM.book.yr[2009] === 1000 && S.lifeLog(GM, 'hall').length === 0, 'varje månad läggs en rad in i året, och bara en gång');
  const nBeats = GM.news.length;
  GM.t = 48 * 30 + 2;
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallEra' && b.a === 2010).length === 1 && GM.news.length === nBeats + 1, 'ett nytt årtionde ger en nyhet och en scenhändelse');
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallEra').length === 1, 'årtiondet firas bara en gång');
  GM.games.push({ ...GM.games[2], id: 9100, title: 'Rekordspelet', score: 9.6, weekly: [9e6], units: 9e6, chart: { top: 30, best: 1, weeks: 30 }, sequelOf: 0 });
  S.bookMonth(GM);
  const recs = S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallRecord');
  ok(recs.length === 4 && [0, 1, 2, 3].every((v) => recs.some((b) => b.v === v && b.g === 'Rekordspelet')), 'nya rekord ger en scenhändelse var (betyg, exemplar, första veckan, veckor som etta)');
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallRecord').length === 4, 'samma rekord kommer inte igen');
  GM.awards.push({ year: 2010, cat: 'goty', title: 'Rekordspelet' });
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallAward' && b.g === 'Rekordspelet' && b.a === 2010).length === 1, 'en ny pokal ger en scenhändelse');
  S.bookMonth(GM);
  ok(S.lifeLog(GM, 'hall').filter((b) => b.k === 'hallAward').length === 1, 'pokalen kommer bara en gång');

  // prestationer med datum
  const GA = mkB();
  GA.ach = []; delete GA.achT;
  S.checkAchievements(GA);
  ok(GA.ach.includes('first_game') && GA.achT && GA.achT.first_game === GA.t && GA.ach.every((id) => GA.achT[id] === GA.t), 'en klarad prestation får veckan den klarades');
  ok(S.lifeLog(GA, 'hall').filter((b) => b.k === 'hallAch').length === GA.ach.length, 'varje klarad prestation blir en scenhändelse');
  const log = S.trophyLog(GA);
  ok(log.length === GA.ach.length && log.every((x, i) => !i || log[i - 1].t >= x.t), 'trofélistan är sorterad med nyast först');
  const GO = JSON.parse(JSON.stringify(GA)); delete GO.achT; delete GO.book;
  ok(S.trophyLog(GO).every((x) => x.t === -1) && S.lifeStats(GO).trophies === GA.ach.length && S.decadeBook(GO, 1990).trophies.length === 0, 'en gammal sparning utan datum går att läsa (prestationerna saknar bara datum)');
  const achBeats = S.lifeLog(GO, 'hall').length;
  S.bookMonth(GO);
  ok(GO.book && GO.book.dec === S.decadeOf(S.yearOf(GO.t)) && S.lifeLog(GO, 'hall').length === achBeats, 'en gammal sparning får sin bok utan ett ras av händelser');

  // epokpriserna: plats i branschen per årtionde
  const GR2 = mkB();
  GR2.ranks = [{ y: 1985, pos: 2 }, { y: 1995, pos: 4 }, { y: 2003, pos: 1 }];
  const chk = (id) => ACHIEVEMENTS.find((a) => a.id === id).check(GR2);
  ok(chk('top3_80') && !chk('top3_90') && chk('top3_00') && !chk('top3_10'), 'epokpriserna kräver topp tre ett år under rätt årtionde');
  ok(ACH_DECADE.top3_80 === 1980 && ACH_DECADE.top3_10 === 2010 && Object.keys(ACH_DECADE).every((id) => allIds.includes(id)), 'epokpriserna har sina årtionden');
  GR2.stats.bestScore = 9.1;
  const pr = S.decadeTrophies(GR2);
  ok(pr.length === 3 && pr[0].dec === 1980 && pr[1].best.id === 9003 && pr[1].over && pr[2].over && pr[2].best.id === 9004, 'årtiondets troféer finns för varje årtionde med spel');

  // framsteg
  const progBad = [];
  for (const GX of [G, GB, S.newGame({ studio: 'Tom', seed: 3, difficulty: 'normal' })]) {
    for (const id of ACH_WITH_PROGRESS) {
      const p = achProgress(GX, id);
      if (!p || !Number.isFinite(p.cur) || !(p.max > 0) || !(p.pct >= 0 && p.pct <= 100) || !['n', 'money', 'score', 'yr'].includes(p.fmt)) progBad.push(id);
    }
  }
  ok(progBad.length === 0 && achProgress(GB, 'first_game') === null, 'framsteget är ett ändligt tal med mål över noll för alla som går att räkna upp ' + progBad.join());
  const p5 = achProgress(GB, 'five_games');
  ok(p5.cur === 4 && p5.max === 5 && Math.round(p5.pct) === 80 && achProgress(GB, 'rich2').pct === 100, 'framsteget räknar spel och pengar');

  // scenens tillstånd
  const hs = S.lifeState(GA, 'hall');
  ok(hs.open && hs.ach === GA.ach.length && hs.total === ACHIEVEMENTS.length && hs.recent.length === Math.min(6, GA.ach.length) && hs.discs.length === 4 && hs.discs.reduce((a, n) => a + n, 0) === 4 && hs.best && hs.best.title === 'Bok 9003', 'lifeState(hall) ger trofésalens läge');
  ok(!S.lifeState(S.newGame({ studio: 'Tom', seed: 3, difficulty: 'normal' }), 'hall').open, 'en tom studio har en tom trofésal');

  // texter på båda språken
  let missB = 0;
  const need = (k) => { const e = STRINGS[k]; if (!e || !e[0] || !e[1]) { missB++; console.log('saknas', k); } };
  for (const k of ['hallAch', 'hallAward', 'hallRecord', 'hallEra']) for (let v = 0; v < S.LIFE_KINDS[k].v; v++) need(`life.${k}.${v}`);
  for (const c of ACH_CATS) need('ach.cat.' + c.id);
  for (const d of S.DECADES) need('book.era.' + d);
  for (const id of ['score', 'units', 'revenue', 'week', 'top', 'year', 'live', 'series', 'fans', 'cash']) need('rec.' + id);
  for (const k of ['genre', 'platform', 'topic', 'scope']) need('stat.by.' + k);
  for (let i = 0; i < 4; i++) need('ach.level.' + i);
  for (const k of Object.keys(STRINGS).filter((x) => /^(ach|book|rec|stat)\./.test(x))) need(k);
  setLang('en');
  const tx = [S.lifeLog(GM, 'hall').find((b) => b.k === 'hallRecord' && b.v === 1), S.lifeLog(GA, 'hall').find((b) => b.k === 'hallAch')].map((b) => S.lifeText(b));
  setLang('sv');
  const tz = [S.lifeLog(GM, 'hall').find((b) => b.k === 'hallEra'), S.lifeLog(GA, 'hall').find((b) => b.k === 'hallAch')].map((b) => S.lifeText(b));
  ok(missB === 0 && tx[0].includes('Rekordspelet') && tx[0].includes('9 000 000') && !/[{}]|\[object/.test(tx.join() + tz.join()) && tz[0].includes('2010'), 'alla texter finns på båda språken och fylls i rätt: ' + tx[0] + ' | ' + tz[1]);

  // det som sparas är litet och går att spara och läsa tillbaka
  ok(JSON.stringify(JSON.parse(JSON.stringify(GM.book))) === JSON.stringify(GM.book) && Object.keys(GM.book).length <= 8 && JSON.stringify(GM.book).length < 2000, 'boken är liten och går att spara och läsa tillbaka');
}

// ── Rivaler och kriser: rivalens jakt, kriser, krisberedskap och livsflödet ─────────────────────────────
{
  const hunt = EVENTS.filter((e) => e.kind === 'hunt');
  const crisis = EVENTS.filter((e) => e.kind === 'crisis');
  ok(hunt.length === 5 && crisis.length === 3 && S.CRISIS_IDS.length === 8 && S.CRISIS_IDS.every((id) => EV[id]), 'fem drag från rivalen och tre kriser finns som händelser');
  ok([...hunt, ...crisis].every((e) => e.choices.length >= 2 && e.choices.length <= 3 && e.choices.every((c) => c.label.sv && c.label.en && c.fx)), 'varje händelse har två eller tre val med text på båda språken');
  ok(EVENTS.filter((e) => e.kind === 'studio' || e.kind === 'dev').every((e) => !S.CRISIS_IDS.includes(e.id)), 'månadsslumpen drar aldrig rivalens drag eller kriser');
  // texterna: bara kända {variabler}
  const known = new Set(['rival', 'rtitle', 'name', 'title']);
  const vars = (o) => [...(o.sv + o.en).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const fxTexts = (fx) => [fx.res, ...(fx.rand || []).map(([, f]) => f.res)].filter(Boolean);
  ok([...hunt, ...crisis].every((e) => vars(e.title).concat(vars(e.body)).every((v) => known.has(v)) && e.choices.every((c) => fxTexts(c.fx).every((r) => r.sv && r.en && vars(r).every((v) => known.has(v))))), 'händelsetexterna använder bara kända variabler');
  ok(hunt.every((e) => !(e.title.sv + e.body.sv).includes('{title}') || (e.needs || []).includes('game')) && crisis.every((e) => !(e.title.sv + e.body.sv).includes('{name}') || (e.needs || []).includes('staff')), 'texter som nämner en person eller ett spel har rätt behov');

  // en studio med rival, folk och spel
  const mkR = (seed = 31) => {
    const W = S.newGame({ studio: 'Jakt', seed, difficulty: 'normal' });
    S.makeCompetitors(W); S.initWorld(W);
    W.pending = []; W.t = 48 * 12; W.money = 5e7; W.fans = 6000;
    for (let i = 0; i < 4; i++) { S.refreshCandidates(W); S.hire(W, W.candidates[0].id); }
    const add = (id, tt, score, genre) => W.games.push({ id, title: 'Jaktspel ' + id, t: tt, score, weekly: [100], total: 0, priceAt: 30, topic: 'fantasy', genre, platform: 'pc', scope: 'medium', audience: 'everyone', revenue: 5e5, units: 2e4, ports: [], insights: [], reviews: [], flags: [] });
    add(8001, W.t - 90, 7.5, 'rpg'); add(8002, W.t - 6, 8.0, 'action');
    const c = W.comps.find((x) => !x.owned);
    W.rival = { id: c.id, name: c.name, since: 1985, w: 1, l: 2, run: -1, lead: true, flipT: 0 };
    W.market.releases.push({ id: W.uid++, t: W.t - 4, comp: c.id, studio: c.name, color: c.color, title: { sv: 'Rivalspelet', en: 'The Rival Game' }, score: 5.4, platform: 'pc', genre: 'action', topic: 'fantasy', scope: 'medium', yours: false });
    W.job = S.buildJob(W, { topic: W.u.topics[0], genre: W.u.genres[0], platform: W.licenses[0], scope: W.u.scopes[0], audience: W.u.aud[0], title: 'Nästa bygge' }, W.staff.length);
    W.job.phase = 2;
    return W;
  };
  const W = mkR();
  ok(S.rivalOf(W) && !W.crisis, 'rivalen finns och krisboken skapas först när den behövs');
  const cs0 = S.crisisState(W);
  ok(W.crisis && cs0.rival && cs0.rival.name === W.rival.name && cs0.heat === 0 && cs0.level === 0 && cs0.handled === 0 && cs0.recent.length === 0 && cs0.open === '', 'crisisState ger rivalen, jaktens läge och en tom logg');

  // mätaren och beredskapen
  ok(S.heatLevel(0) === 0 && S.heatLevel(24.9) === 0 && S.heatLevel(25) === 1 && S.heatLevel(55) === 2 && S.heatLevel(80) === 3 && S.heatLevel(100) === 3, 'jaktens fyra lägen: Lugnt, Spänt, Het och Krig');
  const sh0 = S.crisisShield(W);
  ok(sh0.parts.length === 5 && sh0.parts.every((p) => typeof p.on === 'boolean') && Math.abs(sh0.total - sh0.parts.reduce((a, p) => a + (p.on ? p.v : 0), 0)) < 1e-9 && sh0.total <= 0.5, 'krisberedskapen är fem delar och högst femtio procent');
  const WS = mkR(32);
  WS.money = 0;
  WS.staff.forEach((x) => (x.mood = 20));
  WS.fans = 100;
  const shNone = S.crisisShield(WS);
  WS.money = 1e12; WS.staff.forEach((x) => (x.mood = 90)); WS.fans = 6000; WS.u.flags.hrAuto = 1; WS.facilities = WS.facilities || {};
  const shAll = S.crisisShield(WS);
  ok(shNone.parts.filter((p) => p.id !== 'qa').every((p) => !p.on) && shAll.parts.filter((p) => p.id !== 'qa').every((p) => p.on) && shAll.total >= shNone.total + 0.4, 'varje del slår på sin egen sak (kassa, stämning, personalavdelning, fans)');
  ok(S.SHIELD_PARTS.reduce((a, p) => a + p.v, 0) === 0.5 || Math.abs(S.SHIELD_PARTS.reduce((a, p) => a + p.v, 0) - 0.5) < 1e-9, 'alla delar tillsammans är exakt taket');

  // månaden: temperaturen, utan slump från spelet
  const H = mkR(33);
  S.crisisMonth(H); // t är 0 mod 4 → värmen justeras
  ok(S.crisisOf(H).heat === 3, 'jakten stiger tre per månad när du leder över rivalen (' + S.crisisOf(H).heat + ')');
  H.rival.lead = false;
  const h1 = S.crisisOf(H).heat;
  H.pending.push({ type: 'event', id: 999, ev: 'fan_mail' }); // en ruta väntar: ingen ny händelse, bara temperaturen
  S.crisisMonth(H);
  ok(Math.abs(S.crisisOf(H).heat - (h1 * 0.92 + 1)) < 1e-9, 'jakten stiger bara ett per månad när rivalen leder, och tiden lugnar den');
  S.crisisOf(H).heat = 100; H.rival.lead = true; S.crisisMonth(H);
  ok(S.crisisOf(H).heat <= 100, 'jakten går aldrig över hundra');
  const NR = mkR(34); NR.rival = null; S.crisisOf(NR).heat = 50; S.crisisMonth(NR);
  ok(Math.abs(S.crisisOf(NR).heat - 46) < 1e-9, 'utan rival bara lugnas jakten');

  // en lång sträcka: händelser kommer, deterministiskt, utan G.rng, med vila mellan likadana
  const run = (W0, months, pick = 0, hook = null) => {
    const X = structuredClone(W0);
    let moved = false;
    const got = [];
    for (let i = 0; i < months; i++) {
      X.t += 4;
      X.staff.forEach((x) => (x.mood = 70));
      X.money = Math.max(X.money, 1e7);
      if (X.job) X.job.phase = 2;
      const r0 = X.rng;
      const id = S.crisisMonth(X);
      if (X.rng !== r0) moved = true;
      if (id) {
        got.push({ id, t: X.t, ev: X.pending[0] });
        if (hook) hook(X, id);
        S.resolveEvent(X, X.pending[0].id, Math.min(pick, EV[id].choices.length - 1));
      }
      X.pending.length = 0;
    }
    return { X, got, rngSame: !moved };
  };
  const A = run(W, 400), B = run(W, 400);
  const noRngRun = run(W, 100, 2);
  ok(A.got.length >= 20 && JSON.stringify(A.got.map((x) => [x.id, x.t])) === JSON.stringify(B.got.map((x) => [x.id, x.t])), 'samma start ger samma händelser (' + A.got.length + ' på 400 månader)');
  ok(A.rngSame && noRngRun.rngSame, 'att en händelse dras rör inte spelets slumptal');
  let gapOk = true;
  const lastAt = {};
  for (const e of A.got) { if (lastAt[e.id] != null && e.t - lastAt[e.id] <= S.CRISIS_COOLDOWN) gapOk = false; lastAt[e.id] = e.t; }
  ok(gapOk, 'samma händelse kommer inte oftare än vart ' + S.CRISIS_COOLDOWN + ':e vecka');
  ok(new Set(A.got.map((x) => x.id)).size >= 3 && A.got.some((x) => EV[x.id].kind === 'hunt') && A.got.some((x) => EV[x.id].kind === 'crisis'), 'både rivalens drag och kriser dyker upp, i många sorter (' + [...new Set(A.got.map((x) => x.id))].join(',') + ')');
  ok(A.got.every((x) => x.ev && x.ev.ev === x.id && (!(EV[x.id].needs || []).includes('staff') || x.ev.who)), 'händelsen får sin person eller sitt spel när den behöver det');
  const C = S.crisisOf(A.X);
  ok(C.log.length === Math.min(24, A.got.length) && C.n === A.got.length && C.log.every((e) => EV[e.ev] && typeof e.c === 'number'), 'loggen håller de senaste ' + C.log.length + ' och räknaren de ' + C.n + ' hanterade');
  ok(S.crisisState(A.X).recent.length === 6 && S.crisisState(A.X).recent[0].t >= S.crisisState(A.X).recent[5].t, 'de sex senaste visas med nyast först');
  ok(JSON.stringify(JSON.parse(JSON.stringify(A.X.crisis))) === JSON.stringify(A.X.crisis) && JSON.stringify(A.X.crisis).length < 6000, 'krisboken är liten och går att spara och läsa tillbaka');

  // alla val fungerar, och beredskapen skyddar
  const early = structuredClone(W); early.t = 48 * 1 + 4; early.pending = [];
  ok(S.crisisMonth(early) === '' && early.pending.length === 0, 'inga kriser förrän studion funnits i två år');
  const noGame = structuredClone(W); noGame.games = []; noGame.pending = [];
  ok(S.crisisMonth(noGame) === '', 'inga kriser utan släppta spel');
  const WN = structuredClone(W); WN.rival = null; WN.comps.forEach((c) => (c.owned = false));
  const noRival = run(WN, 400);
  ok(noRival.got.length > 0 && noRival.got.every((x) => EV[x.id].kind === 'crisis') && noRival.got.length < A.got.length, 'utan rival kommer bara kriser, och färre');
  const shielded = structuredClone(W); shielded.u.flags.hrAuto = 1;
  const calmRun = run(shielded, 400, 0, null);
  const cnt = (r) => r.got.length;
  ok(cnt(calmRun) <= cnt(A), 'en bättre krisberedskap ger färre händelser (' + cnt(calmRun) + ' mot ' + cnt(A) + ')');

  // varje val i varje händelse går att göra och ger rätt spår i boken och livsflödet
  let allOk = true, beats = 0;
  for (const ev of [...hunt, ...crisis]) {
    ev.choices.forEach((ch, i) => {
      const X = mkR(40 + i);
      X.pending.push({ type: 'event', id: X.uid++, ev: ev.id, who: X.staff.find((s) => !s.isFounder).id, game: X.games[X.games.length - 1].id });
      const m0 = X.money, st0 = X.staff.length;
      let out;
      try { out = S.resolveEvent(X, X.pending[0].id, i); } catch (e) { allOk = false; console.log('kastade', ev.id, i, e.message); return; }
      const Cx = S.crisisOf(X);
      if (!out || Cx.n !== 1 || Cx.log.length !== 1 || Cx.log[0].ev !== ev.id || Cx.log[0].c !== i || X.money > m0 + 1e9 || X.staff.length > st0) { allOk = false; console.log('fel', ev.id, i); }
      const sol = S.lifeLog(X, 'crisis').filter((b) => b.k === 'crisisSolved');
      if (sol.length === 1) beats++;
      if (!(Cx.heat >= 0 && Cx.heat <= 100)) allOk = false;
    });
  }
  ok(allOk && beats === [...hunt, ...crisis].reduce((a, e) => a + e.choices.length, 0), 'alla val går att göra och varje ger en händelse i livsflödet (' + beats + ')');

  // pengar och jakt i effekterna
  const F = mkR(50);
  const rev0 = S.monthRev(F);
  const mb = F.money;
  const o1 = S.applyFx(F, { rev: -0.1 }, [], {});
  ok(o1.some((o) => o.k === 'money' && Math.abs(o.v + Math.round(rev0 * 0.1 / 10) * 10) <= 10) && Math.abs(mb - F.money - rev0 * 0.1) <= 10, 'rev kostar en andel av en vanlig månads intäkter');
  ok(rev0 >= 1500, 'en vanlig månad är aldrig noll, så kostnaden finns även för en ny studio');
  const mp = F.money;
  S.applyFx(F, { payroll: -0.5 }, [], {});
  ok(mp - F.money > 0 && Math.abs(mp - F.money - Math.round(S.payroll(F) * 0.5 / 10) * 10) <= 10, 'payroll kostar en andel av en månadslön för alla');
  S.crisisOf(F).heat = 4;
  S.applyFx(F, { heat: -10 }, [], {});
  ok(S.crisisOf(F).heat === 0, 'jakten går inte under noll');
  const dry = S.previewFx(F, { heat: 6, rev: -0.05 }, {});
  ok(dry.some((o) => o.k === 'heat' && o.v === 6) && S.crisisOf(F).heat === 0, 'förhandsvisningen visar jakten utan att ändra den');

  // livsflödet
  const lbeat = S.lifeLog(A.X, 'crisis');
  ok(lbeat.length > 0 && lbeat.every((b) => b.sc === 'crisis') && lbeat.some((b) => b.k === 'huntMove') && lbeat.some((b) => b.k === 'crisisHit') && lbeat.some((b) => b.k === 'crisisSolved'), 'livsflödet har drag, kriser och lösningar i scenen crisis');
  ok(lbeat.filter((b) => b.k === 'huntMove').every((b) => b.g === A.X.rival.name && b.v >= 0 && b.v < 5) && lbeat.filter((b) => b.k === 'crisisHit').every((b) => b.v >= 0 && b.v < 3 && b.g), 'dragen bär rivalens namn och kriserna spelets titel');
  const ls = S.lifeState(A.X, 'crisis');
  ok(ls.rival && ls.rival.id === A.X.rival.id && ls.rival.color && typeof ls.heat === 'number' && ls.level >= 0 && ls.level <= 3 && ls.shield >= 0 && ls.shield <= 50 && ls.handled === C.n && Array.isArray(ls.recent), 'lifeState(crisis) ger rivalen, jakten, beredskapen och de senaste');
  const noRv = S.lifeState(WN, 'crisis');
  ok(noRv.rival === null && noRv.open === '', 'utan rival är rivalen tom i scenens läge');
  const leakG = mkR(60); leakG.pending.push({ type: 'event', id: leakG.uid++, ev: 'crisis_leak' });
  ok(S.crisisState(leakG).open === 'crisis_leak', 'ett öppet beslut syns i scenens läge');
  S.resolveEvent(leakG, leakG.pending[0].id, 0);
  ok(S.crisisOf(leakG).log[0].title === 'Nästa bygge', 'läckan gäller bygget som är under arbete');

  // texter
  setLang('en');
  const txE = S.lifeText(lbeat.find((b) => b.k === 'huntMove'));
  setLang('sv');
  const txS = S.lifeText(lbeat.find((b) => b.k === 'huntMove'));
  ok(txE.includes(A.X.rival.name) && txS.includes(A.X.rival.name) && txE !== txS && !/[{}]/.test(txE + txS), 'rivalens drag får färdig text på båda språken: ' + txE);
  let missR = 0;
  const needR = (k) => { const e = STRINGS[k]; if (!e || !e[0] || !e[1]) { missR++; console.log('saknas', k); } };
  for (const k of ['huntMove', 'crisisHit', 'crisisSolved']) for (let v = 0; v < S.LIFE_KINDS[k].v; v++) needR(`life.${k}.${v}`);
  for (const k of ['rv.heat.0', 'rv.heat.1', 'rv.heat.2', 'rv.heat.3', 'rv.heat.d.0', 'rv.heat.d.1', 'rv.heat.d.2', 'rv.heat.d.3', 'rv.shield.cash', 'rv.shield.mood', 'rv.shield.hr', 'rv.shield.qa', 'rv.shield.fans']) needR(k);
  for (const k of Object.keys(STRINGS).filter((x) => /^(rv\.|menu\.rivals)/.test(x))) needR(k);
  ok(missR === 0, 'alla texter för rivaler och kriser finns på båda språken');

  // gamla sparfiler utan krisbok
  const old = structuredClone(W); delete old.crisis;
  ok(S.crisisMonth(old) === '' || true, 'en gammal sparfil utan krisbok kan köras');
  ok(old.crisis && old.crisis.heat >= 0 && S.crisisState(old).handled === 0, 'krisboken skapas när den behövs');
}

console.log(fails ? `\n${fails} FEL` : '\nAlla tester gick bra');
process.exit(fails ? 1 : 0);
