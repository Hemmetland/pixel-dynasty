// Autospelande bot som kör hela simulatorn i Node för att balansera ekonomin.
import * as S from '../src/sim/index.js';
import { PLATFORMS, potential, techMult, platTier } from '../src/data/platforms.js';
import { TOPICS } from '../src/data/topics.js';
import { RESEARCH, REFINES } from '../src/data/research.js';
import { EV } from '../src/data/events.js';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith('--' + k + '='));
  return a ? a.split('=')[1] : d;
};
const seed = +opt('seed', 1);
const endYear = +opt('end', 2020);
const diff = opt('diff', 'normal');
const verbose = args.includes('-v');
const quiet = args.includes('-q');
const casual = args.includes('--casual');
// --mid: en genomsnittlig spelare som ibland väljer bra tema/genre och ibland chansar.
const mid = args.includes('--mid');
// --mmo: gör onlinespel när serverrummet finns, håller dem vid liv med uppdateringar och expansioner
const mmo = args.includes('--mmo');
const events = mmo && !args.includes('--no-events');
// --f2p: gör onlinespelen till gratisspel från 2010
const f2p = mmo && args.includes('--f2p');
// --bd: skriv ut årets pengar per kategori (för balansarbete)
const bd = args.includes('--bd');
const acc = {};
let lastMonthRef = null;

function skillSum(G) {
  let d = 0, t = 0;
  for (const w of S.workers(G)) { d += w.design; t += w.tech; }
  return { d, t };
}

function pickPlatform(G) {
  const yf = S.yfOf(G.t);
  let best = null;
  let bv = -1;
  for (const id of G.licenses) {
    if (!S.platformOpen(G, id)) continue;
    const p = PLATFORMS.find((x) => x.id === id);
    const v = potential(p, yf) / Math.pow(techMult(p, S.yearOf(G.t)), 0.55);
    if (v > bv) { bv = v; best = p; }
  }
  return best;
}

function chooseProject(G) {
  const plat = pickPlatform(G);
  const year = S.yearOf(G.t);
  const sk = skillSum(G);
  const tm = techMult(plat, year);
  let scope = 'small';
  for (const id of ['medium', 'large', 'aaa']) {
    if (!G.u.scopes.includes(id)) continue;
    if (platTier(plat, year) < S.SCOPES[id].minTier) continue;
    const par = S.SCOPES[id].par * tm;
    const have = Math.min(sk.d, sk.t) * 0.8;
    if (have >= par * 0.95) scope = id;
  }
  if (mmo) {
    const live = S.liveGames(G)[0];
    if (live && live.live.fresh < 70 && G.t - Math.max(live.live.t0, ...live.live.exps.map((id) => G.games.find((x) => x.id === id).t)) > 96) return { title: live.title + ': Exp', topic: live.topic, genre: live.genre, platform: live.platform, scope: 'medium', audience: live.audience, expansionOf: live.id };
    if (!live && S.canGoLive(G) && S.LIVE_SCOPES.includes(scope)) {
      const cfg = chooseBest(G, plat, scope);
      return { ...cfg, live: true };
    }
  }
  if (casual || (mid && Math.random() < 0.5)) {
    const tp = G.u.topics[Math.floor(Math.random() * G.u.topics.length)];
    const ge = G.u.genres[Math.floor(Math.random() * G.u.genres.length)];
    return { title: 'Game ' + (G.games.length + 1), topic: tp, genre: ge, platform: plat.id, scope: casual ? (G.u.scopes.includes('medium') && sk.d > 25 ? 'medium' : 'small') : scope, audience: 'everyone' };
  }
  return chooseBest(G, plat, scope);
}
function chooseBest(G, plat, scope) {
  // bästa kända tema/genre
  let best = null;
  let bv = -1;
  for (const tp of G.u.topics) {
    for (const ge of G.u.genres) {
      const known = G.know.combos[tp + '|' + ge];
      const comp = known ?? TOPICS.find((t) => t.id === tp).compat[S.genreIdx(ge)];
      const rep = G.games.slice(-4).filter((g) => g.topic === tp && g.genre === ge).length;
      const v = comp - rep * 0.8 + Math.random() * 0.6;
      if (v > bv) { bv = v; best = [tp, ge]; }
    }
  }
  const aud = G.u.aud.includes('everyone') ? 'everyone' : G.u.aud[0];
  return { title: 'Game ' + (G.games.length + 1), topic: best[0], genre: best[1], platform: plat.id, scope, audience: aud };
}

function handlePending(G) {
  while (G.pending.length) {
    const p = G.pending[0];
    if (p.type === 'phase') {
      const J = G.job;
      // Idealfördelningen är bara känd för genrer man redan har släppt spel i (annars ligger den jämna kvar).
      if (!casual && S.focusKnown(G, J.genre) && (!mid || Math.random() < 0.6)) S.setPhaseFocus(G, p.phase, S.idealFocus(G, J.genre, p.phase, J.genre2));
      G.pending.shift();
    } else if (p.type === 'report') {
      const g = S.releaseGame(G);
      G.pending.shift();
      if (verbose) console.log(`  release ${S.dateOf(G.t).year}: ${g.title} ${g.scope} on ${g.platform} ${g.topic}/${g.genre} score ${g.score} total $${Math.round(g.total)} crowd ${g.crowd?.toFixed(2)} (${(g.crowdBy || []).length})`);
    } else if (p.type === 'event') {
      const ev = EV[p.ev];
      S.resolveEvent(G, p.id, Math.floor(Math.random() * ev.choices.length));
    } else if (p.type === 'bailout') { S.takeBailout(G); G.pending.shift(); } else if (p.type === 'expo') S.resolveExpo(G, p.id, 0);
    else G.pending.shift();
  }
}

function manage(G) {
  const year = S.yearOf(G.t);
  // forskning
  if (!casual || G.t % 16 === 0) for (const r of RESEARCH.slice().sort((a, b) => a.rp - b.rp)) {
    if (G.research.active.length >= S.researchSlots(G)) break;
    if (S.canResearch(G, r.id) === true && r.rp <= G.rp) S.startResearch(G, r.id);
  }
  // förfiningar när det finns plats över och råd (pengarna med marginal)
  if (!casual) for (const r of REFINES) {
    if (G.research.active.length >= S.researchSlots(G)) break;
    if (S.canResearch(G, r.id) === true && G.money > S.researchCost(G, r.id).money * 5) S.startResearch(G, r.id);
  }
  // licenser
  for (const p of PLATFORMS) {
    if (S.canLicense(G, p.id) === true && true) {
      const cost = S.licenseCost(G, p.id);
      const worth = potential(p, S.yfOf(G.t)) > 25;
      if (worth && G.money > cost * 3) S.buyLicense(G, p.id);
    }
  }
  // personal
  const burn = S.payroll(G) + S.rentOf(G);
  for (const c of G.candidates.slice().sort((a, b) => (b.design + b.tech) - (a.design + a.tech))) {
    if (!S.canHire(G)) break;
    if (G.money > c.fee + (burn + c.salary) * (casual ? 14 : 8) + 5000) { S.hire(G, c.id); break; }
  }
  // kontor
  const n = S.nextTier(G);
  if (n && S.canUpgradeOffice(G) === true && G.money > n.cost * 1.8) S.upgradeOffice(G);
  // anläggningar
  for (const id of S.FAC_IDS) {
    if (!G.u.facs.includes(id)) continue;
    const lvl = S.facLevel(G, id);
    if (lvl < 2 && G.money > S.facCost(G, id) * 6) S.buildFacility(G, id);
  }
  // träning
  for (const st of G.staff) {
    if (S.canTrain(G, st) === true && G.money > S.trainCost(G, st) * 8) {
      S.train(G, st.id, st.design <= st.tech ? 'design' : 'tech');
    }
  }
  // kontrakt när pengarna är slut
  if (!G.job && G.money < 6000 && G.contracts.length) S.acceptContract(G, G.contracts[0].id);
  // marknadsföring
  if (G.job && G.job.kind === 'game' && G.job.state === 'dev' && G.job.phase >= 1) {
    for (const m of S.marketingOptions(G)) if (!m.used && G.money > m.cost * 6) S.launchMarketing(G, m.id);
  }
  // onlinespel: innehållsuppdatering när innehållet börjar bli gammalt, och servrar när det blir fullt
  if (mmo) for (const g of S.liveGames(G)) {
    if (g.live.fresh < 50 && !g.live.patch && G.money > S.livePatchCost(G, g) * 3) S.startLivePatch(G, g.id);
    if (f2p && year >= 2010 && S.canGoF2P(G, g.live)) S.goF2P(G, g.id);
    // evenemang när en konkurrent drar spelare eller innehållet börjar bli gammalt (om --events)
    if (events && !S.eventReadyIn(G, g.live) && (S.rivalFactor(G, g) < 0.92) && G.money > S.liveEventCost(G, g) * 4) S.startLiveEvent(G, g.id);
    if (S.liveLoad(G) > S.serverCap(G) * 0.85 && S.facLevel(G, 'server') < 3 && G.money > S.facCost(G, 'server') * 2) S.buildFacility(G, 'server');
  }
  if (mmo && S.liveUnlocked(G) && S.facLevel(G, 'server') < 1 && G.money > S.facCost(G, 'server') * 3) S.buildFacility(G, 'server');
  // lån vid behov
  if (G.money < 2000 && S.loanTotal(G) < S.loanLimit(G) * 0.6) S.takeLoan(G, S.loanLimit(G) - S.loanTotal(G));
  if (G.money > 200000 * S.moneyScale(year) && S.loanTotal(G) > 0) S.repayLoan(G, S.loanTotal(G));
  // starta spel
  if (!G.job) {
    const cfg = chooseProject(G);
    const r = S.startProject(G, cfg);
    if (typeof r === 'string' && verbose) console.log('start fail', r);
  }
}

const G = S.newGame({ studio: 'Bot', seed, difficulty: diff });
S.makeCompetitors(G);
S.initWorld(G);
let lastYear = 1979;
const t0 = Date.now();
while (S.yearOf(G.t) < endYear && !G.over) {
  handlePending(G);
  if (G.t % 2 === 0 && G.tick === 0) manage(G);
  S.stepTick(G);
  if (bd && G.lastMonth !== lastMonthRef) {
    lastMonthRef = G.lastMonth;
    for (const [k, v] of Object.entries(G.lastMonth.breakdown)) acc[k] = (acc[k] || 0) + v;
  }
  const y = S.yearOf(G.t);
  if (y !== lastYear && G.t % 48 === 0 && !quiet) {
    lastYear = y;
    if (bd) {
      console.log('   bd ' + Object.entries(acc).map(([k, v]) => k + ' ' + Math.round(v / 1000) + 'k').join(' | '));
      for (const k of Object.keys(acc)) delete acc[k];
    }
    const last = G.games.slice(-6);
    const avg = last.length ? (last.reduce((a, g) => a + g.score, 0) / last.length).toFixed(1) : '-';
    const rev = G.games.reduce((a, g) => a + (g.weekly.slice(-48).reduce((x, y2) => x + y2, 0)), 0);
    let gate = '';
    if (verbose) {
      const n = S.nextTier(G);
      if (n) gate = ' | next: ' + S.officeReqs(G, n).map((r) => (r.ok ? '+' : '-') + r.id + ' ' + (r.id === 'avg' ? r.have.toFixed(1) : Math.round(r.have)) + '/' + r.need).join(' ');
    }
    const lv = S.liveGames(G).map((g) => `[${g.title} subs ${Math.round(g.live.subs).toLocaleString()} fresh ${Math.round(g.live.fresh)} rev/m ${Math.round(S.liveMonth(G, g).rev).toLocaleString()} cost/m ${Math.round(S.liveMonth(G, g).cost).toLocaleString()} cap ${S.serverCap(G).toLocaleString()} rivals ${S.rivalFactor(G, g).toFixed(2)}]`).join(' ');
    console.log(`${y} $${Math.round(G.money).toLocaleString()} fans ${Math.round(G.fans).toLocaleString()} staff ${G.staff.length} tier ${G.office.tier} games ${G.games.length} avg(6) ${avg} yrRev $${Math.round(rev).toLocaleString()} res ${G.research.done.length}+${Object.values(G.research.levels || {}).reduce((a, b) => a + b, 0)} rp ${Math.round(G.rp)} loans ${Math.round(S.loanTotal(G))}${gate}${lv ? ' ' + lv : ''}`);
  }
}
const dt = Date.now() - t0;
if (args.includes('--legacy')) {
  const L = S.legacy(G);
  console.log(`legacy ${L.points} rank ${L.rank} ${JSON.stringify(L.parts)} rev $${Math.round(G.stats.revenue / 1e6)}M cash $${Math.round(G.money / 1e6)}M awards ${G.awards.length} best ${G.stats.bestScore} fans ${Math.round(G.fans)} tier ${G.office.tier}`);
}
// --live: onlinespelen och konkurrenternas MMO i slutet
if (args.includes('--live')) {
  for (const g of G.games.filter((x) => x.live)) {
    const L = g.live;
    console.log(`live ${S.yearOf(L.t0)}${L.closed ? '-' + S.yearOf(L.closed) : ''} ${g.title.en || g.title} score ${g.score}${L.model === 'f2p' ? ' f2p' : ''} peak ${Math.round(L.peak).toLocaleString()} subs ${Math.round(L.subs).toLocaleString()} exps ${L.exps.length} events ${L.events || 0} evcost $${Math.round((L.evCost || 0) / 1e6)}M rev $${Math.round(L.rev / 1e6)}M cost $${Math.round(L.cost / 1e6)}M`);
  }
  for (const m of (G.market.mmos || [])) console.log(`rival ${S.yearOf(m.t0)}${m.closed ? '-' + S.yearOf(m.closed) : ''} ${m.studio} ${m.title.en} ${m.genre} score ${m.score}`);
}
if (args.includes('--ach')) console.log('ach ' + G.ach.join(' '));
// --news: krönikans rader per nyckel (de senaste 150)
if (args.includes('--news')) {
  const n = {};
  for (const x of G.news) n[x.key] = (n[x.key] || 0) + 1;
  console.log('news ' + Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
}
console.log(G.over ? `GAME OVER ${S.yearOf(G.over.t)} (bankrupt) after ${G.games.length} games` : `Finished ${S.yearOf(G.t)}; money $${Math.round(G.money).toLocaleString()}; games ${G.games.length}; best ${G.stats.bestScore}; ach ${G.ach.length}; ${dt}ms`);
if (args.includes('--parts')) {
  for (const g of G.games.filter((_, i) => i % 3 === 0)) {
    const p = g.parts;
    console.log(`${S.yearOf(g.t)} ${g.scope.padEnd(6)} ${g.platform.padEnd(9)} team ${g.team} rd ${p.rd.toFixed(2)} rt ${p.rt.toFixed(2)} r ${p.r.toFixed(2)} s0 ${p.s0.toFixed(1)} compat ${p.compat} mFit ${p.mFit.toFixed(2)} mBug ${p.mBug.toFixed(2)} => ${g.score}`);
  }
}
