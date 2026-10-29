// Funktionstest av sim-API:t (ingen UI): varje åtgärd ska fungera utan fel.
import * as S from '../src/sim/index.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENTS } from '../src/data/events.js';
import { exportCode, importCode } from '../src/core/store.js';
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
const g = S.releaseGame(G);
ok(g && g.score > 0 && g.total > 0, 'släpp spel: betyg ' + g.score + ' prognos ' + Math.round(g.total));
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
// händelser för onlinespel: gäller det största spelet som är igång och ändrar dess spelare och innehåll
{
  const GL = JSON.parse(JSON.stringify(G));
  GL.pending = [];
  GL.t = 48 * 26; // 2006, så att även de senare händelserna är möjliga
  GL.games.push({ id: 7700, title: 'Online', t: GL.t - 20, score: 8, weekly: [1], total: 1e6, priceAt: 50, topic: 'fantasy', genre: 'rpg', platform: 'pc', scope: 'aaa', audience: 'everyone', revenue: 0, units: 0, insights: [], reviews: [], flags: [] });
  S.launchLive(GL, GL.games[GL.games.length - 1]);
  const lv = GL.games[GL.games.length - 1].live;
  lv.subs = 200000; lv.pot = 250000; lv.fresh = 50; lv.boost = GL.t + 4;
  const liveEvs = EVENTS.filter((e) => (e.needs || []).includes('live'));
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
console.log(fails ? `\n${fails} FEL` : '\nAlla tester gick bra');
process.exit(fails ? 1 : 0);
