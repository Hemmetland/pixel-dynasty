import { emit } from '../core/bus.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PLATFORMS, launchTime } from '../data/platforms.js';
import { dateOf, yearOf, TICKS_PER_WEEK, WEEKS_PER_MONTH, WEEKS_PER_YEAR, START_YEAR } from './const.js';
import { devTick } from './dev.js';
import { researchTick } from './research.js';
import { contractTick, refreshContracts } from './contracts.js';
import { engineTick } from './engines.js';
import { salesWeek } from './sales.js';
import { liveWeek } from './live.js';
import { portWeek } from './ports.js';
import { pubWeek } from './publish.js';
import { frWeek } from './franchise.js';
import { subWeek } from './acquire.js';
import { groupWeek, costSave } from './group.js';
import { storeWeek } from './store.js';
import { hwWeek } from './hardware.js';
import { monthlyMarket, updateTrends } from './market.js';
import { rollDevEvent, rollStudioEvent } from './events.js';
import { runAwards, expoOffer } from './awards.js';
import { finishTraining, refreshCandidates, payroll, updateMood, burnoutQuits } from './people.js';
import { rentOf, facUpkeep, loanInterest, spend } from './studio.js';
import { note } from './news.js';

// Ett tick = en fjärdedels vecka. Returnerar false om spelet väntar på spelaren.
export function stepTick(G) {
  if (G.over || G.pending.length) return false;
  const J = G.job;
  if (J) {
    if (J.kind === 'game') {
      if (J.crunchTicks > 0 && --J.crunchTicks <= 0) J.crunch = false;
      devTick(G);
    } else if (J.kind === 'contract') contractTick(G);
    else if (J.kind === 'engine') engineTick(G);
  }
  researchTick(G);
  G.tick++;
  if (G.tick >= TICKS_PER_WEEK) {
    G.tick = 0;
    G.t++;
    weekly(G);
  }
  return true;
}

function weekly(G) {
  for (const s of G.staff) if (s.trainSkill && s.trainUntil <= G.t) finishTraining(G, s);
  salesWeek(G);
  portWeek(G);
  pubWeek(G);
  frWeek(G);
  subWeek(G);
  groupWeek(G);
  storeWeek(G);
  hwWeek(G);
  liveWeek(G);
  updateMood(G);
  rollDevEvent(G);
  const d = dateOf(G.t);
  // plattformsnyheter, en gång: veckan då plattformen kommer ut (lanseringen ligger alltid på en hel vecka)
  for (const p of PLATFORMS) {
    if (p.id !== 'pc' && !p.own && G.t === Math.round((launchTime(p) - START_YEAR) * WEEKS_PER_YEAR)) note(G, 'news.platform', { name: p.name, maker: p.maker }, 'platform');
  }
  if (d.month === 5 && d.week === 1) expoOffer(G);
  if (d.month === 11 && d.week === 3) runAwards(G);
  if (G.t % WEEKS_PER_MONTH === 0) monthly(G, d);
}

function monthly(G, d) {
  // Kostnader
  const sal = payroll(G);
  // koncernens delade tjänster sänker hyran och driften
  const save = 1 - costSave(G);
  const rent = Math.round(rentOf(G) * save);
  const upkeep = Math.round(facUpkeep(G) * save);
  const interest = Math.round(loanInterest(G));
  if (sal) spend(G, sal, 'salaries');
  if (rent) spend(G, rent, 'rent');
  if (upkeep) spend(G, upkeep, 'facilities');
  if (interest) spend(G, interest, 'interest');
  if (G.job && G.job.kind === 'game') G.job.cost += sal + rent + upkeep;
  // Historik
  G.hist.cash.push({ t: G.t, v: Math.round(G.money) });
  G.hist.revenue.push({ t: G.t, v: Math.round(G.month.breakdown.sales || 0) });
  G.hist.fans.push({ t: G.t, v: Math.round(G.fans) });
  for (const k of ['cash', 'revenue', 'fans']) if (G.hist[k].length > 240) G.hist[k].shift();
  G.lastMonth = G.month;
  // årets summa per kategori (för finansfönstret och årsrapporten)
  // (en äldre sparning börjar räkna nu, och då gäller summan bara en del av året)
  if (!G.yr) {
    G.yr = {};
    G.yrT = G.t;
  }
  for (const [k, v] of Object.entries(G.month.breakdown)) G.yr[k] = (G.yr[k] || 0) + v;
  G.month = { income: 0, expense: 0, breakdown: {} };
  // Skuld
  if (G.money < 0) {
    G.debtMonths++;
    if (G.debtMonths >= 3) {
      if (!G.flags.bailout) {
        G.flags.bailout = true;
        G.pending.push({ type: 'bailout', id: G.uid++ });
      } else {
        G.over = { type: 'bankrupt', t: G.t };
        G.pending.push({ type: 'gameover', id: G.uid++ });
        emit('gameover', G.over);
      }
    } else note(G, 'news.debt', { n: 3 - G.debtMonths }, 'bad');
  } else G.debtMonths = 0;
  const burn = sal + rent + upkeep + interest;
  if (G.money >= 0 && burn > 0 && G.money < burn * 2.2 && !G.flags.lowCashAt) {
    G.flags.lowCashAt = G.t;
    note(G, 'news.lowCash', {}, 'bad');
  } else if (G.money > burn * 4) G.flags.lowCashAt = 0;
  burnoutQuits(G);
  refreshCandidates(G);
  refreshContracts(G);
  monthlyMarket(G);
  if (d.month === 0 || d.month === 6) updateTrends(G);
  if (d.month === 0 && G.t > 0) {
    G.lastYear = { year: yearOf(G.t) - 1, bd: G.yr || {}, part: G.yrT != null };
    G.yr = {};
    G.yrT = null;
    G.pending.push({ type: 'year', id: G.uid++, year: yearOf(G.t) - 1 });
  }
  if (G.t === 48 * 41 && !G.flags.ending) {
    G.flags.ending = true;
    G.pending.push({ type: 'ending', id: G.uid++ });
  }
  rollStudioEvent(G);
  checkAchievements(G);
  emit('month', G);
}

export function checkAchievements(G) {
  for (const a of ACHIEVEMENTS) {
    if (!G.ach.includes(a.id) && a.check(G)) {
      G.ach.push(a.id);
      note(G, 'news.ach', { name: a.name }, 'award', true);
      emit('achievement', a);
    }
  }
}

export function initWorld(G) {
  // Skapas när ett nytt spel börjar.
  updateTrends(G);
  refreshCandidates(G);
  refreshContracts(G);
}
