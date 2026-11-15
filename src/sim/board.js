// Koncernstyrelse (research b_board): en styrelse sköter koncernen åt dig. Du anger vad den får göra (G.gb): köpa upp konkurrenter,
// slå ihop dotterbolagen och sätta deras budget. Den håller alltid en reserv i kassan (6, 12 eller 24 månader av löner, hyra och
// drift), tar högst ett steg per månad, och lägger fram en rapport varje kvartal. Den tillsätter ingen VD och rör aldrig din personal.
// Ledningens kapacitet respekteras: styrelsen köper inte fler bolag än ledningen räcker till (se groupCap i group.js).
// Dotterbolagen råkar också ut för små händelser (en storsäljare, en stjärnutvecklare, en konkurrent som lockar bort folk, en skandal):
// de är en del av koncernen även utan styrelsen, ger i snitt nästan ingenting och visas bara i nyhetsloggen.
// Allt är deterministiskt: slumpen kommer ur fröet (inte G.rng), och styrelsen drar inget ur G.rng.
import { clamp, fmtMoney } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { WEEKS_PER_MONTH, WEEKS_PER_YEAR } from './const.js';
import { rentOf, facUpkeep } from './studio.js';
import { payroll } from './people.js';
import { note } from './news.js';
import { beat } from './life.js';
import { ownedComps, acqMax, canAcquire, acqPrice, compYearly, acquire } from './acquire.js';
import { LOAD, STABLE_MIN, stability, subOf, groupCap, groupLoad, canIntegrate, integCost, investWeek, setMode, setSubBudget } from './group.js';

export const BOARD_MONTHS = [6, 12, 24]; // reserven: månader av kostnader som ska finnas kvar efter ett köp eller en sammanslagning
export const EVENT_P = 0.07; // risk per dotterbolag och månad för en händelse
export const boardOpen = (G) => !!G.u.flags.groupBoard;
const fresh = (G) => ({ buy: 0, integ: 0, budget: 0, res: 1, bought: 0, merged: 0, q: { rev: G.stats.subRev || 0, bought: 0, merged: 0, ev: 0 } });
export const boardOf = (G) => G.gb || (G.gb = fresh(G));
export const boardOn = (G) => boardOpen(G) && (boardOf(G).buy || boardOf(G).integ || boardOf(G).budget);

// Policyn: buy, integ och budget är av (0) eller på (1), res är index i BOARD_MONTHS
export function setBoard(G, key, v) {
  if (!boardOpen(G) || !['buy', 'integ', 'budget', 'res'].includes(key)) return false;
  const b = boardOf(G);
  const n = key === 'res' ? clamp(Math.round(v), 0, BOARD_MONTHS.length - 1) : v ? 1 : 0;
  if (b[key] === n) return false;
  b[key] = n;
  return true;
}

// Månadens kostnader: löner, hyra och drift
export const burnOf = (G) => payroll(G) + rentOf(G) + facUpkeep(G);
export const boardReserve = (G) => BOARD_MONTHS[boardOf(G).res] * burnOf(G);

// Nästa steg styrelsen tar, eller varför den väntar. { act: 'integ' | 'buy' | null, c, why, need }
// why: off (inget påslaget), none (inget att göra), ops, load, cash, unstable, full. need: kassan som behövs för steget.
export function boardNext(G) {
  const b = boardOf(G);
  if (!b.buy && !b.integ) return { act: null, c: null, why: 'off', need: 0 };
  const reserve = boardReserve(G);
  const cap = groupCap(G);
  const load = groupLoad(G);
  let wait = null;
  let hold = false; // en sammanslagning väntar på pengar: köp inget nytt under tiden
  if (b.integ) {
    const free = ownedComps(G)
      .filter((c) => subOf(G, c).mode === 'free')
      .sort((a, c) => c.sub.staff - a.sub.staff || a.id - c.id);
    if (free.length) {
      const c = free[0];
      const ok = canIntegrate(G, c.id);
      const cost = integCost(G, c);
      if (ok === 'ops') wait = { why: 'ops', need: 0 };
      else if (load - LOAD.free + LOAD.int > cap + 1e-9) wait = { why: 'load', need: 0 };
      else if (ok === 'money' || G.money - cost < reserve) {
        wait = { why: 'cash', need: cost + reserve };
        hold = true;
      } else if (ok === true) return { act: 'integ', c, why: null, need: 0 };
    }
  }
  if (b.buy && !hold) {
    if (ownedComps(G).length >= acqMax(G)) return { act: null, c: null, ...(wait || { why: 'full', need: 0 }) };
    if (stability(G) < STABLE_MIN) return { act: null, c: null, ...(wait || { why: 'unstable', need: 0 }) };
    if (load + LOAD.free > cap + 1e-9) return { act: null, c: null, ...(wait || { why: 'load', need: 0 }) };
    const all = (G.comps || []).filter((c) => !c.owned);
    const ratio = (c) => compYearly(G, c) / acqPrice(G, c);
    const pick = all
      .filter((c) => canAcquire(G, c.id) === true && G.money - acqPrice(G, c) >= reserve)
      .sort((a, c) => ratio(c) - ratio(a) || a.id - c.id)[0];
    if (pick) return { act: 'buy', c: pick, why: null, need: 0 };
    if (all.length) return { act: null, c: null, ...(wait || { why: 'cash', need: Math.min(...all.map((c) => acqPrice(G, c))) + reserve }) };
  }
  return { act: null, c: null, ...(wait || { why: 'none', need: 0 }) };
}

// Budgeten för integrerade bolag: satsa så länge kassan räcker (ett halvårs satsning över reserven, och vidare tills den minskar
// till ett kvartal), spara bara när kassan är riktigt trång, annars normal
function autoBudget(G) {
  const cost = burnOf(G);
  const reserve = boardReserve(G);
  let committed = 0;
  for (const c of ownedComps(G)) {
    const s = subOf(G, c);
    if (s.mode !== 'int') continue;
    committed += investWeek(G, c) * WEEKS_PER_YEAR;
    let want = 1;
    if (G.money < cost * 3 || (s.budget === 0 && G.money < cost * 6)) want = 0;
    else if (G.money > reserve + committed * (s.budget === 2 ? 0.25 : 0.5)) want = 2;
    setSubBudget(G, c.id, want);
  }
}

// ── Händelser i dotterbolagen ──
const EVENTS = [
  ['subHit', 3],
  ['subTalent', 3],
  ['subPoach', 2],
  ['subScandal', 1],
];
const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:board:${key}`));
function subEvents(G) {
  for (const c of ownedComps(G)) {
    const s = subOf(G, c);
    const r = rngFor(G, `ev:${c.id}:${G.t}`);
    if (r() >= EVENT_P) continue;
    let x = r() * EVENTS.reduce((a, e) => a + e[1], 0);
    let key = EVENTS[0][0];
    for (const [k, w] of EVENTS) {
      key = k;
      if ((x -= w) < 0) break;
    }
    let tone = 'good';
    if (key === 'subHit') {
      c.strength = clamp(c.strength + 0.05, 0.45, 1.7);
      s.staff *= 1.04;
    } else if (key === 'subTalent') {
      s.staff *= 1.08;
    } else if (key === 'subPoach') {
      if (s.mode === 'int' && s.budget === 2) key = 'subPoachHeld';
      else {
        s.staff = Math.max(4, s.staff * 0.93);
        c.strength = clamp(c.strength - 0.02, 0.45, 1.7);
      }
      tone = key === 'subPoach' ? 'bad' : 'info';
    } else {
      s.staff = Math.max(4, s.staff * 0.97);
      c.strength = clamp(c.strength - 0.06, 0.45, 1.7);
      tone = 'bad';
    }
    boardOf(G).q.ev++;
    note(G, `news.${key}`, { studio: c.name }, tone, true);
  }
}

// ── Veckovis (efter groupWeek): händelser och styrelsens steg en gång i månaden, rapporten en gång i kvartalet ──
export function boardWeek(G) {
  if (!ownedComps(G).length && !G.gb) return;
  const month = G.t % WEEKS_PER_MONTH === 1;
  if (month) {
    subEvents(G);
    if (boardOpen(G)) {
      const b = boardOf(G);
      if (b.budget) autoBudget(G);
      const did = new Set();
      for (let i = 0; i < 2; i++) {
        const nx = boardNext(G);
        if (!nx.act || did.has(nx.act)) break;
        did.add(nx.act);
        if (nx.act === 'integ' && setMode(G, nx.c.id, 'int') === true) {
          b.merged++;
          b.q.merged++;
        } else if (nx.act === 'buy' && acquire(G, nx.c.id) === true) {
          b.bought++;
          b.q.bought++;
        } else break;
      }
      if (b.budget) autoBudget(G);
    }
  }
  if (G.t % (WEEKS_PER_MONTH * 3) === 11 && boardOpen(G) && ownedComps(G).length) {
    const b = boardOf(G);
    const rev = G.stats.subRev || 0;
    beat(G, 'grpReport', { a: b.q.bought });
    note(G, 'news.boardReport', { v: fmtMoney(Math.max(0, rev - b.q.rev)), b: b.q.bought, i: b.q.merged, e: b.q.ev }, 'info');
    b.q = { rev, bought: 0, merged: 0, ev: 0 };
  }
}
