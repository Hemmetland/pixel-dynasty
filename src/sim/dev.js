import { clamp } from '../core/util.js';
import { rnd, rint, chance } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { CAT } from '../data/categories.js';
import { PLATFORM, lifecycle, platTier } from '../data/platforms.js';
import { MKT } from '../data/research.js';
import { SCOPES, yearOf, yfOf, moneyScale, engineMult, TICKS_PER_WEEK } from './const.js';
import { SCOPE_TEMPO } from './tempo.js';
import { DIFFICULTY } from './state.js';
import { workers, moodMult, fatigueMult } from './people.js';
import { bugMult, qaFixMult, mktCostMult, mktHypeMult, serverMult, labMult, spend } from './studio.js';
import { phaseCats, normFocus, startFocus, evaluate, compatOf, parPerTick } from './score.js';
import { startSales, forecast } from './sales.js';

export const RP_RATE = 0.05;
// Satser som beskriver "per projekt" skalas mot projektets längd (tempo) så att ett längre projekt inte tappar mer hype
// eller fixar fler buggar än ett kort.
const tempoOf = (J) => SCOPE_TEMPO[J.scope] || 1;

export function platformOpen(G, id) {
  const p = PLATFORM[id];
  const yf = yfOf(G.t);
  return lifecycle(p, yf) > 0 && yf < (p.y1 >= 2100 ? 9999 : p.y1 + 1.5);
}
export function baseHype(G) {
  return clamp(Math.log10(1 + G.fans) * 4.5, 0, 28);
}

export function startProject(G, cfg) {
  if (G.job) return t('err.busy');
  const { topic, genre, platform, scope, audience } = cfg;
  if (!G.u.topics.includes(topic) || !G.u.genres.includes(genre)) return 'invalid';
  if (cfg.genre2 && (!G.u.flags.genre2 || !G.u.genres.includes(cfg.genre2) || cfg.genre2 === genre)) return 'invalid';
  if (!G.licenses.includes(platform) || !platformOpen(G, platform)) return 'invalid';
  if (!G.u.scopes.includes(scope) || !G.u.aud.includes(audience)) return 'invalid';
  if (platTier(PLATFORM[platform], yearOf(G.t)) < SCOPES[scope].minTier) return 'tier';
  const sc = SCOPES[scope];
  const sequel = cfg.sequelOf ? G.games.find((g) => g.id === cfg.sequelOf) : null;
  const engine = cfg.engineId ? G.engines.find((e) => e.id === cfg.engineId) : null;
  const f0 = startFocus(G, genre, cfg.genre2);
  const job = {
    kind: 'game',
    id: G.uid++,
    title: (cfg.title || '').trim() || t('misc.untitled'),
    topic, genre, genre2: cfg.genre2 || null, platform, audience, scope,
    engineId: engine ? engine.id : null,
    sequelOf: sequel ? sequel.id : null,
    chain: sequel ? (sequel.chain || 1) + 1 : 0,
    t0: G.t,
    ticks: 0,
    devTicks: sc.weeks * TICKS_PER_WEEK,
    polishTicks: sc.polish * TICKS_PER_WEEK,
    polishDone: 0,
    phase: 0,
    focus: [normFocus(phaseCats(G, 0), cfg.focus0 || f0[0]), normFocus(phaseCats(G, 1), f0[1]), normFocus(phaseCats(G, 2), f0[2])],
    D: 0, T: 0, bugs: 0, hype: baseHype(G) + (sequel ? Math.min(18, sequel.score * 1.6) : 0),
    marketing: [],
    crunch: false,
    cost: 0,
    rpGained: 0,
    team: workers(G).length,
    log: [],
    events: 0,
    state: 'dev',
  };
  G.job = job;
  emit('jobStart', job);
  return job;
}

export function setPhaseFocus(G, phase, raw) {
  const J = G.job;
  if (!J || J.kind !== 'game') return;
  J.focus[phase] = normFocus(phaseCats(G, phase), raw);
}

export function toggleCrunch(G) {
  if (G.job) G.job.crunch = !G.job.crunch;
}

// ── Marknadsföring ───────────────────────────────────────────────
// Vad projektet väntas dra in utan hype: prognosen för plattform, storlek och trend med de senaste spelens snittbetyg.
export function expectedRevenue(G, J) {
  const gs = G.games.slice(-3);
  const score = gs.length ? gs.reduce((s, g) => s + g.score, 0) / gs.length : 6;
  return forecast(G, { t: G.t, platform: J.platform, scope: J.scope, score, hype: 0, topic: J.topic, genre: J.genre, genre2: J.genre2, audience: J.audience, chain: J.chain }, { noise: false });
}
// Kampanjer och mässmontrar kostar minst sin andel av den väntade intäkten (annars betalade de sig hundratals gånger
// om när försäljningen växer snabbare än penningvärdet). Alla fem kostar ungefär en tiondel av vad spelet drar in och
// betalar sig 6–9 gånger om, så länge hypen inte redan slår i taket (100): det som går över är bortkastat.
const MKT_SHARE = { press: 0.01, ads: 0.02, tv: 0.04, online: 0.06, influencer: 0.09 };
export function promoPrice(G, base, share) {
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  return Math.max(base * moneyScale(yearOf(G.t)), J ? share * expectedRevenue(G, J) : 0);
}
export const hypeGain = (hype, add) => Math.max(0, Math.min(add, 100 - hype));
export function marketingCost(G, id) {
  return Math.round((promoPrice(G, MKT[id].cost, MKT_SHARE[id] || 0) * mktCostMult(G)) / 50) * 50;
}
export function marketingOptions(G) {
  const hype = G.job?.hype ?? 0;
  return G.u.mkt.map((id) => ({ ...MKT[id], cost: marketingCost(G, id), gain: hypeGain(hype, MKT[id].hype * mktHypeMult(G)), used: !!G.job?.marketing.includes(id) }));
}
export function launchMarketing(G, id) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.state !== 'dev' || J.marketing.includes(id)) return false;
  if (J.ticks < J.devTicks * 0.2) return t('err.tooEarly');
  const cost = marketingCost(G, id);
  if (G.money < cost) return t('err.money');
  spend(G, cost, 'marketing');
  J.cost += cost;
  J.marketing.push(id);
  const add = hypeGain(J.hype, MKT[id].hype * mktHypeMult(G));
  J.hype = Math.min(100, J.hype + add);
  emit('marketing', { id, add });
  return true;
}

// ── Utvecklingstick ──────────────────────────────────────────────
function engineOf(G, J) {
  return J.engineId ? G.engines.find((e) => e.id === J.engineId) : null;
}
export function teamOutput(G, J, mixD) {
  const sc = SCOPES[J.scope];
  const ws = workers(G).slice().sort((a, b) => b.design + b.tech - (a.design + a.tech));
  let d = 0;
  let t_ = 0;
  let fix = 0;
  const hasMentor = ws.some((w) => w.trait === 'mentor');
  ws.forEach((w, i) => {
    // Fler händer ger avtagande nytta (samordning) och mindre utanför projektets idealstorlek.
    const coord = 1 / (1 + 0.035 * i);
    const over = i >= sc.team ? 0.6 : 1;
    let eff = (0.6 + (0.4 * w.speed) / 25) * moodMult(w) * fatigueMult(w) * over * coord;
    if (w.trait === 'perfectionist') eff *= 0.93;
    if (w.trait === 'nightowl' && J.crunch) eff *= 1.15;
    if (hasMentor && w.trait !== 'mentor') eff *= 1.05;
    if (J.crunch) eff *= 1.25;
    d += w.design * eff * (0.35 + 1.3 * mixD);
    t_ += w.tech * eff * (0.35 + 1.3 * (1 - mixD));
    fix += w.tech * eff;
  });
  return { d, t: t_, fix, n: ws.length, ws };
}

export function devTick(G) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.state !== 'dev') return;
  const diff = DIFFICULTY[G.difficulty];
  const yf = yfOf(G.t);
  const eng = engineOf(G, J);
  const em = engineMult(eng, yf) * serverMult(G);
  if (J.phase < 3) {
    const cats = phaseCats(G, J.phase);
    const foc = J.focus[J.phase];
    let mixD = 0;
    for (const c of cats) mixD += ((foc[c] || 0) / 100) * CAT[c].dMix;
    if (!cats.length) mixD = 0.5;
    const out = teamOutput(G, J, mixD);
    J.D += out.d;
    J.T += out.t * em;
    // buggar
    const engShare = J.phase === 0 ? (foc.engine || 0) / 100 : 0;
    const bugBase = (SCOPES[J.scope].bugs / J.devTicks) * 1.05 * diff.bugs * bugMult(G) * Math.pow(Math.max(1, out.n) / SCOPES[J.scope].team, 0.35);
    const perfect = out.ws.filter((w) => w.trait === 'perfectionist').length / Math.max(1, out.n);
    const crunchB = J.crunch ? 1.35 : 1;
    const rate = bugBase * (1.15 - 0.5 * engShare) * (1 - 0.3 * perfect) * crunchB * (0.8 + 0.4 * (1 - mixD)) * (eng ? 1 - 0.08 * Math.min(1.3, engineMult(eng, yf) - 1) : 1);
    let nb = 0;
    const whole = Math.floor(rate);
    nb += whole;
    if (rnd(G) < rate - whole) nb++;
    J.bugs += nb;
    // flytande poäng
    if (out.ws.length) {
      const nF = Math.min(out.ws.length, 1 + (rnd(G) < 0.5 ? 1 : 0));
      for (let i = 0; i < nF; i++) {
        const w = out.ws[rint(G, 0, out.ws.length - 1)];
        const isD = rnd(G) < (0.35 + 1.3 * mixD) / 2;
        emit('float', { staff: w.id, kind: isD ? 'design' : 'tech', amount: Math.max(1, Math.round((isD ? out.d : out.t) / out.n)) });
      }
      if (nb > 0) emit('float', { staff: out.ws[rint(G, 0, out.ws.length - 1)].id, kind: 'bug', amount: nb });
    }
    // gnistan
    for (const w of out.ws) {
      if (w.trait === 'spark' && chance(G, 0.006)) {
        const bonus = Math.round(w.design * 1.5);
        J.D += bonus;
        emit('float', { staff: w.id, kind: 'spark', amount: bonus });
        emit('toast', { kind: 'good', text: t('toast.spark', { name: w.name.split(' ')[0] }) });
      }
    }
    J.ticks++;
    J.hype *= Math.pow(0.9988, 1 / tempoOf(J));
    // fasbyte
    const phaseLen = J.devTicks / 3;
    if (J.ticks >= J.devTicks) {
      J.phase = 3;
      emit('phase', { phase: 3, job: J });
    } else if (J.ticks >= phaseLen * (J.phase + 1)) {
      J.phase++;
      if (phaseCats(G, J.phase).length >= 2) G.pending.push({ type: 'phase', phase: J.phase, id: G.uid++ });
      emit('phase', { phase: J.phase, job: J });
    }
    // Slumphändelser under utveckling hanteras av clock (veckovis).
  } else {
    // Polish / QA
    const out = teamOutput(G, J, 0.2);
    const par = parPerTick(G, J);
    const lambda = (0.05 / tempoOf(J)) * Math.sqrt(clamp(out.fix / par, 0.2, 6)) * qaFixMult(G);
    const before = J.bugs;
    J.bugs = Math.max(0, J.bugs * Math.exp(-lambda) - (0.02 / tempoOf(J)) * out.n);
    const fixed = before - J.bugs;
    if (fixed > 0.2 && out.ws.length && rnd(G) < 0.5) emit('float', { staff: out.ws[rint(G, 0, out.ws.length - 1)].id, kind: 'fix', amount: Math.max(1, Math.round(fixed)) });
    J.polishDone++;
    if (J.polishDone >= J.polishTicks || J.bugs < 0.5) finishDev(G);
  }
}

export function shipNow(G) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.phase !== 3 || J.state !== 'dev') return false;
  finishDev(G);
  return true;
}
export function extendPolish(G) {
  const J = G.job;
  if (!J || J.phase !== 3 || J.state !== 'dev' || J.extended) return false;
  J.polishTicks += Math.round(4 * tempoOf(J)) * TICKS_PER_WEEK;
  J.extended = true;
  return true;
}

function finishDev(G) {
  const J = G.job;
  J.state = 'report';
  const rep = evaluate(G, J);
  J.report = rep;
  // Ett längre projekt ger mer arbete, men samma forskningspoäng per spel som förut: färre spel per år = långsammare forskning.
  const rpBonus = Math.round(((J.D + J.T) / tempoOf(J) / 45) * labMult(G));
  J.rpGained += rpBonus;
  G.rp += rpBonus;
  G.pending.push({ type: 'report', id: G.uid++ });
  emit('devDone', J);
}

export function cancelProject(G) {
  const J = G.job;
  if (!J || J.kind !== 'game' || J.state !== 'dev') return false;
  G.job = null;
  return true;
}

// ── Utgivning ────────────────────────────────────────────────────
export function releaseGame(G) {
  const J = G.job;
  if (!J || J.state !== 'report') return null;
  const rep = J.report;
  const game = {
    id: J.id,
    title: J.title,
    topic: J.topic, genre: J.genre, genre2: J.genre2, platform: J.platform, audience: J.audience, scope: J.scope,
    engineId: J.engineId, sequelOf: J.sequelOf, chain: J.chain,
    t: G.t,
    score: rep.score,
    reviews: rep.reviews,
    flags: rep.flags,
    insights: rep.insights,
    parts: rep.parts,
    ff: { over: rep.ff.over, under: rep.ff.under, fit: rep.ff.fit },
    D: Math.round(J.D), T: Math.round(J.T), bugs: Math.round(J.bugs),
    hype: J.hype, weeks: Math.round(J.ticks / TICKS_PER_WEEK) + Math.round(J.polishDone / TICKS_PER_WEEK),
    team: J.team, marketing: J.marketing.slice(), rp: J.rpGained,
    revenue: 0, units: 0, weekly: [], ended: false, fansGained: 0, patched: false,
  };
  G.games.push(game);
  G.know.combos[J.topic + '|' + J.genre] = Math.round(compatOf(J.topic, J.genre));
  G.know.focus[J.genre] = true;
  G.stats.gamesMade++;
  G.stats.bestScore = Math.max(G.stats.bestScore, game.score);
  if (game.score >= 8) G.stats.hits++;
  startSales(G, game);
  // erfarenhet till teamet
  for (const w of workers(G)) {
    const skill = ['design', 'tech', 'speed', 'research'][rint(G, 0, 3)];
    w[skill] += rnd(G) < 0.55 ? 1 : 0;
    if (rnd(G) < 0.5) w[w.spec === 'coder' ? 'tech' : 'design'] += 1;
    w.games++;
  }
  G.job = null;
  emit('released', game);
  return game;
}
