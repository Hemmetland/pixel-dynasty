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
