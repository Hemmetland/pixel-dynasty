// Funktionstest av sim-API:t (ingen UI): varje åtgärd ska fungera utan fel.
import * as S from '../src/sim/index.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENTS } from '../src/data/events.js';
import { exportCode, importCode, recordRun, loadHall } from '../src/core/store.js';
import { PLATFORM, PLATFORMS } from '../src/data/platforms.js';
import { STRINGS } from '../src/data/strings.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { weeklyOf } from '../src/core/weekly.js';
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
  // utsikter: delarna ger tillsammans samma målnivå som spelet räknar med
  const GO = JSON.parse(JSON.stringify(GL));
  GO.office.fac.server = { lvl: 3, slot: 0 };
  const go = GO.games[GO.games.length - 1];
  go.live.price = [1.2, 1, 1]; go.live.ops = 2;
  const fx = S.liveFactors(GO, go);
  ok(Math.abs(go.live.pot * fx.age * fx.fresh * fx.price * fx.era * fx.ops * fx.event * fx.rivals * fx.regions - S.liveTarget(GO, go)) < 1e-6 * fx.target && fx.regions === 1 && fx.price < 1 && fx.ops > 1 && fx.fresh < 1 && fx.full === false, 'utsikternas delar ger tillsammans målnivån');
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
  const gi = S.newGame({ studio: 'I', seed: 5, archetype: 'influencer' });
  const gt = S.newGame({ studio: 'T', seed: 5, archetype: 'tycoon' });
  const gd = S.newGame({ studio: 'D', seed: 5 });
  ok(gi.fans === 250 && gd.fans === 0 && gt.money === gd.money + 15000 && gi.staff[0].design === 12 && gd.staff[0].design === 19, 'bakgrunderna ger sina startvärden');
  ok(Object.keys(S.FOUNDER_UNLOCK).every((id) => S.FOUNDERS.includes(id)) && S.FOUNDERS.every((id) => S.ARCHETYPES[id]), 'varje bakgrund har värden');
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
console.log(fails ? `\n${fails} FEL` : '\nAlla tester gick bra');
process.exit(fails ? 1 : 0);
