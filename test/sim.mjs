// Autospelande bot som kör hela simulatorn i Node för att balansera ekonomin.
import * as S from '../src/sim/index.js';
import { PLATFORMS, potential, techMult, platTier } from '../src/data/platforms.js';
import { TOPICS } from '../src/data/topics.js';
import { RESEARCH, REFINES } from '../src/data/research.js';
import { EV } from '../src/data/events.js';
import { HW_TYPES, HW_PARTNER } from '../src/data/hardware.js';

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
// --ports: porterar spel med betyg 7+ till den licensierade plattform som väntas ge bäst betyg
const ports = args.includes('--ports');
// --publish: ger ut andra studiors spel när demons intervall har mitten 7 eller mer
const publish = args.includes('--publish');
// --lic: gör uppföljare till spel med betyg 7+ och tar licensaffärer (prylar och serietidningar, film med rykte 6.5+)
const lic = args.includes('--lic');
// --acq: köper upp konkurrenter (bäst försäljning per krona) när pengarna räcker fyra gånger om
const acq = args.includes('--acq');
// --group: integrerar dotterbolagen när ledningen har plats och kassan räcker tre gånger om, satsar när kassan räcker till
// fyra års satsning, och gör den skickligaste anställda till VD när kontoret är fullt
const group = args.includes('--group');
// --store: bygger en egen butik och öppnar den för andra förlag (--store=closed håller den sluten och gör bara pc-spel,
// --store=ex med exklusiva spel, --pc bara pc-spel när butiken finns, --fee=0.1 avgiften, --sale=0..3 reans rabattnivå)
const storeArg = args.find((x) => x === '--store' || x.startsWith('--store='));
const store = storeArg ? storeArg.split('=')[1] || 'open' : null;
const saleArg = args.find((x) => x.startsWith('--sale='));
// --hw: forskar egen hårdvara, designar Mellan-produkter när kassan räcker och lanserar dem med förslagspriset hos den
// partner vars minsta order passar efterfrågan (--hwq=high hög kvalitet, --hwcls=top/budget ett annat prestandamål)
const hw = args.includes('--hw');
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
  // en sluten butik bara lönar sig med egna pc-spel: den boten gör bara pc-spel när butiken finns
  if ((store === 'closed' || args.includes('--pc')) && G.store) return PLATFORMS.find((x) => x.id === 'pc');
  const yf = S.yfOf(G.t);
  let best = null;
  let bv = -1;
  for (const id of G.licenses) {
    if (!S.platformOpen(G, id)) continue;
    const p = PLATFORMS.find((x) => x.id === id);
    const v = (potential(p, yf) / Math.pow(techMult(p, S.yearOf(G.t)), 0.55)) * (store && G.store && S.isPcPlat(p.id) ? 1 + G.store.reach * (store === 'closed' ? 2.5 : 1) : 1);
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
  const prev = lic && G.u.flags.sequels ? G.games.filter((g) => g.topic === best[0] && g.genre === best[1] && !g.expansionOf && !g.live && g.score >= 7).pop() : null;
  return { title: 'Game ' + (G.games.length + 1), topic: best[0], genre: best[1], platform: plat.id, scope, audience: aud, sequelOf: prev ? prev.id : null };
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

// Egen hårdvara: en produkt av varje öppen typ (den nyaste typen först) när kassan räcker till designen sex gånger om och
// linjen saknar en produkt yngre än halva livscykeln, optimerad för den nyaste motorn. Lanseras hos den billigaste
// partnern vars minsta order räcker högst ett halvår och vars kapacitet räcker, med förslagspriset och autobeställning.
// Priset sänks 15 % när betyget fallit en och två poäng. Felbatcher återkallas, inget fusk, drivrutinsteam när det finns.
function hwBot(G) {
  const H = G.hw;
  const cls = opt('hwcls', 'mid');
  const qual = opt('hwq', 'normal');
  const year = S.yearOf(G.t);
  if (S.labCost(G) && G.money > S.labCost(G) * 10) S.upgradeLab(G);
  if (!H.chief && G.staff.length >= S.capacity(G) && G.staff.length >= 12) {
    const c = S.chiefCandidates(G)[0];
    if (c) S.setChief(G, c.id);
  }
  const eng = G.engines.length ? G.engines[G.engines.length - 1].id : null;
  for (const type of S.openTypes(G).slice().reverse()) {
    if (H.projects.length >= S.labSlots(H)) break;
    if (H.projects.some((p) => p.type === type)) continue;
    const life = HW_TYPES[type].life;
    // en linje vars senaste avslutade produkt gick med förlust läggs ned
    const last = H.products.filter((p) => p.type === type && p.state === 'ended').pop();
    if (last && S.productProfit(last) < 0) continue;
    if (H.products.some((p) => p.type === type && (p.state === 'prod' || (p.state === 'market' && (G.t - p.t) / 48 < life * 0.5)))) continue;
    const spec = { type, cls, qual, arch: 'std', opt: eng };
    if (G.money < (S.designCost(G, spec) + S.protoCost(G, spec)) * 6) continue;
    if (S.startDesign(G, spec) === true && verbose) console.log(`  hw design ${year}: ${H.projects[H.projects.length - 1].name} $${S.designCost(G, spec)} ${S.designWeeks(G, spec)}w`);
  }
  for (const J of H.projects.slice()) {
    if (J.state === 'fail') S.resolveProto(G, J.id, G.money > J.budget * 3 ? 'redo' : 'ship');
    if (J.state !== 'ready') continue;
    const price = S.suggestPrice(J.type, J.cls);
    const pid = S.suggestPartner(G, J, price);
    const pick = { p: HW_PARTNER[pid], d: S.weeklyDemand(G, S.draftOf(G, J, pid, price), price) };
    const units = Math.max(pick.p.min, Math.round(pick.d * (pick.p.lead + 6)));
    const r = S.launch(G, J.id, { partner: pick.p.id, price, units, auto: true });
    if (verbose) console.log(`  hw launch ${year}: ${J.name} ${pick.p.id} $${price} ${units}u (~${Math.round(pick.d)}/w) ${r}`);
  }
  for (const P of H.products) {
    if (P.state === 'ended') continue;
    if (P.issue) S.resolveIssue(G, P.id, 'recall');
    if (P.bench === 'offer') S.resolveBench(G, P.id, false);
    if (G.u.flags.hw_driver && P.state === 'market' && P.drv !== (P.compat < 90 && P.share >= 0.04 && P.dem * P.price * 48 > S.driverCost(G, P) * 48 * 8)) S.setDriver(G, P.id, !P.drv);
    if (P.state === 'market') {
      const drop = P.score0 - S.scoreOf(G, P);
      const cuts = drop >= 2 ? 2 : drop >= 1 ? 1 : 0;
      if (cuts > (P.cuts || 0) && P.price * 0.85 > S.unitCost(G, P, P.partner) * 1.15) {
        S.setPrice(G, P.id, P.price * 0.85);
        P.cuts = cuts;
      }
    }
  }
}

function manage(G) {
  const year = S.yearOf(G.t);
  // forskning
  if (!casual || G.t % 16 === 0) for (const r of RESEARCH.slice().sort((a, b) => a.rp - b.rp)) {
    if (G.research.active.length >= S.researchSlots(G)) break;
    if ((r.id === 'b_port' && !ports) || (r.id === 'b_publish' && !publish) || (r.id === 'b_merch' && !lic) || (r.id === 'b_acq' && !acq) || (r.id === 'b_group' && !group) || (r.id === 'b_store' && !store) || (r.cat === 'hw' && !hw)) continue;
    if (S.canResearch(G, r.id) === true && r.rp <= G.rp) S.startResearch(G, r.id);
  }
  // förfiningar när det finns plats över och råd (pengarna med marginal)
  if (!casual) for (const r of REFINES) {
    if (G.research.active.length >= S.researchSlots(G)) break;
    if (r.cat === 'hw' && !hw) continue;
    if (S.canResearch(G, r.id) === true && G.money > S.researchCost(G, r.id).money * 5) S.startResearch(G, r.id);
  }
  // porteringar: bästa väntade betyg gånger plattformens storlek, bara för spel med betyg 7+
  if (ports && G.u.flags.ports && !G.port) {
    let best = null;
    for (const g of G.games) {
      if (g.score < 7 || !S.portable(G, g)) continue;
      for (const p of S.portTargets(G, g)) {
        const s = S.portScore(G, g, p.id);
        const v = Math.exp(0.62 * (s - 6.5)) * potential(PLATFORMS.find((x) => x.id === p.id), S.yfOf(G.t));
        if (p.licensed && s >= 6.5 && (!best || v > best.v)) best = { g, p: p.id, s, v };
      }
    }
    // remaster först om någon väntas ge minst dubbla kostnaden tillbaka
    let rem = null;
    for (const g of G.games) {
      if (!S.remasterable(G, g)) continue;
      const c = S.portCost(G, g, 'remaster');
      for (const p of S.remasterTargets(G, g)) {
        const v = p.licensed ? S.portForecast(G, g, p.id, undefined, 'remaster') / c : 0;
        if (v >= 2 && (!rem || v > rem.v)) rem = { g, p: p.id, v, c };
      }
      if (process.env.REMDBG && !g.remSeen) {
        g.remSeen = true;
        const best = Math.max(0, ...S.remasterTargets(G, g).filter((p) => p.licensed).map((p) => S.portForecast(G, g, p.id, undefined, 'remaster') / c));
        console.log(`   cand ${year} ${g.scope} score ${g.score} best x${best.toFixed(2)}`);
      }
    }
    if (rem && G.money > rem.c * 3) {
      if (S.startPort(G, rem.g.id, rem.p, 'remaster') === true && verbose) console.log(`  remaster ${year}: ${rem.g.title} ${rem.g.platform} -> ${rem.p} x${rem.v.toFixed(1)} cost $${rem.c}`);
    } else if (best && G.money > S.portCost(G, best.g) * 3 && S.startPort(G, best.g.id, best.p) === true && verbose) console.log(`  port ${year}: ${best.g.title} ${best.g.platform} -> ${best.p} score ${best.s} cost $${S.portCost(G, best.g)}`);
  }
  // förlag: skriv på pitchar med intervallmitt 7+ när det finns plats och pengar med marginal
  if (publish && S.canPublish(G)) for (const p of S.pubOf(G).pitches.slice()) if ((p.lo + p.hi) / 2 >= 7 && G.money > p.advance * 4 && S.signPitch(G, p.id) === true && verbose) console.log(`  sign ${year}: ${p.studio} ${p.scope} demo ${p.lo}-${p.hi} advance $${p.advance}`);
  // licensaffärer: prylar och serietidningar alltid, film när ryktets mitt är 6.5 eller mer
  if (lic && S.canFranchise(G)) for (const o of S.frOf(G).offers.slice()) if ((o.kind !== 'film' || (o.lo + o.hi) / 2 >= 6.5) && S.acceptOffer(G, o.id) === true && verbose) console.log(`  deal ${year}: ${o.kind} ${o.partner} up $${o.up}${o.roy ? ' roy $' + o.roy : ''}${o.q ? ' film ' + o.lo + '-' + o.hi + ' (' + o.q + ')' : ''}`);
  // uppköp: den konkurrent som säljer mest per krona
  if (acq && S.canAcquireAny(G)) {
    const c = G.comps.filter((x) => S.canAcquire(G, x.id) === true).sort((a, b) => S.compYearly(G, b) / S.acqPrice(G, b) - S.compYearly(G, a) / S.acqPrice(G, a))[0];
    if (c && G.money > S.acqPrice(G, c) * 4) {
      const price = S.acqPrice(G, c);
      if (S.acquire(G, c.id) === true && verbose) console.log(`  acquire ${year}: ${c.name} $${price} yearly $${Math.round(S.compYearly(G, c))}`);
    }
  }
  // koncernledning
  if (group && S.canGroup(G)) {
    for (const c of S.ownedComps(G)) {
      const s = S.subOf(G, c);
      if (s.mode === 'free' && S.canIntegrate(G, c.id) === true && G.money > S.integCost(G, c) * 3 && S.groupLoad(G) + 0.75 <= S.groupCap(G)) {
        if (S.setMode(G, c.id, 'int') === true && verbose) console.log(`  integrate ${year}: ${c.name} $${S.integCost(G, c)} ops ${S.opsCount(G)} load ${S.groupLoad(G)}/${S.groupCap(G)}`);
      }
      if (s.mode !== 'int') continue;
      S.setSubBudget(G, c.id, opt('grpb', null) !== null ? +opt('grpb') : G.money > S.investWeek(G, c) * 48 * 4 ? 2 : 1);
      const st = S.ceoCandidates(G)[0];
      if (!args.includes('--noceo') && !s.ceo && st && G.staff.length >= S.capacity(G) && S.setCeo(G, c.id, st.id) && verbose) console.log(`  ceo ${year}: ${st.name} -> ${c.name} rating ${S.ceoRating(G, st)}`);
    }
  }
  // egen butik: öppen (eller sluten) med avgift 20 %, normal support och mer marknadsföring när kassan räcker
  if (store && G.store) {
    const B = G.store;
    if (B.policy === 'closed' && store !== 'closed') S.setPolicy(G, 'open');
    S.setExclusive(G, store === 'ex');
    if (saleArg) S.setSale(G, +saleArg.split('=')[1]);
    S.setFee(G, +opt('fee', 0.2));
    const ads = S.storeCosts(G).ads / Math.max(1, S.ADS[B.ads]);
    S.setAds(G, store !== 'closed' && G.money > 15000 * ads * 40 ? 2 : 1);
  }
  if (hw && G.hw) hwBot(G);
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
let hwPrev = { rev: 0, net: 0 };
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
    let hwy = '';
    if (hw && G.hw) {
      const cur = { rev: G.hw.tot.rev, net: S.hwNet(G) };
      hwy = ` hw rev $${Math.round(cur.rev - hwPrev.rev).toLocaleString()} net $${Math.round(cur.net - hwPrev.net).toLocaleString()} rep ${Math.round(G.hw.rep)}`;
      hwPrev = cur;
    }
    console.log(`${y} $${Math.round(G.money).toLocaleString()} fans ${Math.round(G.fans).toLocaleString()} staff ${G.staff.length} tier ${G.office.tier} games ${G.games.length} avg(6) ${avg} yrRev $${Math.round(rev).toLocaleString()} res ${G.research.done.length}+${Object.values(G.research.levels || {}).reduce((a, b) => a + b, 0)} rp ${Math.round(G.rp)} loans ${Math.round(S.loanTotal(G))}${hwy}${gate}${lv ? ' ' + lv : ''}`);
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
if (publish) {
  const ds = S.pubOf(G).deals.filter((d) => d.out);
  const done = ds.filter((d) => d.ended);
  console.log(`published ${G.stats.published || 0}; label profit $${Math.round(S.labelProfit(G)).toLocaleString()} on $${Math.round(G.stats.pubCost || 0).toLocaleString()}; of last ${done.length} finished ${done.filter((d) => d.revenue < d.advance + (d.cost || 0)).length} lost money`);
}
if (store && G.store) {
  const B = G.store;
  const T = B.tot;
  const m = (v) => '$' + Math.round(v / 1e6) + 'M';
  console.log(`store ${S.yearOf(B.t0)} ${B.policy} reach ${(B.reach * 100).toFixed(0)}% users ${(S.storeUsers(G) / 1e6).toFixed(1)}M trust ${B.trust.toFixed(0)} dev ${(B.dev * 100).toFixed(0)}%; own ${m(T.own)} feat ${m(T.feat)} group ${m(T.group)} ext ${m(T.ext)} sale ${m(T.sale || 0)} (wait ${Math.round((B.wait || 0) * 100)}%); ops ${m(T.ops)} sup ${m(T.sup)} ads ${m(T.ads)} pay ${m(T.pay)}; net ${m(S.storeNet(G))}; pc games ${G.games.filter((g) => S.isPcPlat(g.platform) && g.t >= B.t0).length}/${G.games.filter((g) => g.t >= B.t0).length}`);
}
if (hw && G.hw) {
  const H = G.hw;
  const T = H.tot;
  const m = (v) => '$' + (v / 1e6).toFixed(1) + 'M';
  console.log(`hw ${S.yearOf(H.t0)} rep ${Math.round(H.rep)} lab ${H.lab}${H.chief ? ' chief' : ''}; rev ${m(T.rev)} design ${m(T.design)} proto ${m(T.proto)} make ${m(T.make)} war ${m(T.war)} roy ${m(T.roy)} drv ${m(T.drv)} lab ${m(T.lab)} issue ${m(T.issue)}; net ${m(S.hwNet(G))}`);
  for (const P of H.products) console.log(`  ${P.name} ${P.type} ${S.yearOf(P.tReady)}${P.t != null ? '/' + S.yearOf(P.t) : ''}${P.endT ? '-' + S.yearOf(P.endT) : ''} ${P.partner} score ${P.score0 ?? '-'} $${P.price} sold ${Math.round(P.sold).toLocaleString()} peak ${Math.round(P.peak)}/w rev ${m(P.rev)} dev ${m(P.dev)} make ${m(P.cost)} profit ${m(S.productProfit(P))}`);
}
if (group) console.log(`group: stab ${S.stability(G)}; ops ${S.opsCount(G)}; load ${S.groupLoad(G)}/${S.groupCap(G)}; costSave ${Math.round(S.costSave(G) * 100)}%; promo ${(S.promoOwn(G) * 100).toFixed(1)}%; invested $${Math.round(G.stats.groupInv || 0).toLocaleString()}; ${S.ownedComps(G).map((c) => `${c.name} ${c.sub.mode}${c.sub.mode === 'int' ? ' ' + Math.round(c.sub.integ * 100) + '% b' + c.sub.budget : ''} staff ${Math.round(c.sub.staff)} share ${Math.round(S.shareOf(G, c) * 100)}%${c.sub.ceo ? ' ceo' : ''}`).join(', ')}`);
if (acq) console.log(`owned ${S.ownedComps(G).length}; paid $${Math.round(S.ownedComps(G).reduce((a, c) => a + c.paid, 0)).toLocaleString()}; earned $${Math.round(S.subIncome(G)).toLocaleString()}; ${S.ownedComps(G).map((c) => `${c.name} ${S.yearOf(c.ownedT)} $${Math.round(c.paid / 1e6)}M -> $${Math.round(c.subRev / 1e6)}M`).join(', ')}`);
if (lic) {
  const F = S.frOf(G);
  const films = F.deals.filter((d) => d.kind === 'film' && d.done);
  console.log(`series ${S.seriesList(G).length}; licensing $${Math.round(S.licIncome(G)).toLocaleString()}; deals ${F.deals.length} (${['merch', 'comic', 'film'].map((k) => k + ' ' + F.deals.filter((d) => d.kind === k).length).join(', ')}); films ${films.map((d) => d.q).join(' ')}`);
}
if (ports) {
  const pr = G.games.flatMap((g) => g.ports || []);
  const rm = pr.filter((p) => p.kind === 'remaster');
  if (process.env.REMDBG) for (const g of G.games) for (const p of (g.ports || []).filter((x) => x.kind === 'remaster')) console.log(`   ${S.yearOf(g.t)}->${S.yearOf(p.t)} ${g.scope} ${g.platform}->${p.platform} ${g.score}->${p.score} orig $${Math.round(g.revenue / 1e6)}M rem $${Math.round(p.revenue / 1e6)}M cost $${Math.round(p.cost / 1e6)}M`);
  if (rm.length) console.log(`remasters ${rm.length}; revenue $${Math.round(rm.reduce((a, p) => a + p.revenue, 0)).toLocaleString()}; cost $${Math.round(rm.reduce((a, p) => a + p.cost, 0)).toLocaleString()}; scores ${rm.map((p) => p.score).join(' ')}`);
  console.log(`ports ${pr.length}; revenue $${Math.round(pr.reduce((a, p) => a + p.revenue, 0)).toLocaleString()}; cost $${Math.round(pr.reduce((a, p) => a + p.cost, 0)).toLocaleString()}`);
}
console.log(G.over ? `GAME OVER ${S.yearOf(G.over.t)} (bankrupt) after ${G.games.length} games` : `Finished ${S.yearOf(G.t)}; money $${Math.round(G.money).toLocaleString()}; games ${G.games.length}; best ${G.stats.bestScore}; ach ${G.ach.length}; ${dt}ms`);
if (args.includes('--parts')) {
  for (const g of G.games.filter((_, i) => i % 3 === 0)) {
    const p = g.parts;
    console.log(`${S.yearOf(g.t)} ${g.scope.padEnd(6)} ${g.platform.padEnd(9)} team ${g.team} rd ${p.rd.toFixed(2)} rt ${p.rt.toFixed(2)} r ${p.r.toFixed(2)} s0 ${p.s0.toFixed(1)} compat ${p.compat} mFit ${p.mFit.toFixed(2)} mBug ${p.mBug.toFixed(2)} => ${g.score}`);
  }
}
