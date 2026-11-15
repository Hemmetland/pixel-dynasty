// Butiksteam (forskningen Butiksteam): ett team som sköter butikens kampanjer åt dig. Medarbetarna är ute på sin uppgift (s.away och s.out,
// platserna kommer av butikens nivå, se seatCap i studio.js) och arbetar inte med dina projekt, men lär sig av jobbet. Teamets effekt
// (0-1, S.tm i butiken) beror på hur många de är mot vad butiken kräver, hur skickliga de är, arbetsledaren och rutinen. Med full effekt
// säljer kampanjerna lite mer och Veckans spel blir billigare (se SHOP_LIFT och SHOP_FEE i store.js), och teamet sätter igång
// kampanjerna på egen hand: temaveckor (förberedelse mot en avgift), Veckans spel (mot en avgift), spelpaket och erbjudanden på äldre
// spel. Du ställer in vad teamet får göra (G.store.sh): vilka sorters kampanjer, en budget (hur stor del av kassan en betald kampanj
// högst får kosta, och att tre månaders kostnader alltid finns kvar) och hur djärvt de ska vara (hur mycket mer än avgiften en betald
// kampanj måste väntas ge, och hur stora rabatter och hur nya spel de rör). Allt är deterministiskt: teamet drar inget ur G.rng.
import { clamp, fmtMoney } from '../core/util.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { skillCap } from './people.js';
import { spend } from './studio.js';
import { burnOf } from './board.js';
import { teamsOf, teamById, teamName, membersOf, leadOf, bestLead, leadScore, endRole, setOut, seatFree } from './teams.js';
import { RUTIN_WEEKS, RUTIN_MAX } from './opsteam.js';
import {
  canStore, levelOf, baseOf, SHOP_LIFT, SHOP_FEE, SHOP_THEME, eventNow, eventFits, eventValue, spotSlots, spotsOf, spotGames, canSpot, spotValue, spotCost, startSpot,
  DEALS, dealsOf, dealSlots, dealGames, canDeal, dealValue, dealCost, startDeal, BUNDLE, bundlesOf, bundleOpen, bundleGames, canBundle, startBundle,
} from './store.js';
import { EVENT_BY_ID } from '../data/storeevents.js';

export const SHOP_MIN = 2; // minst så här många i teamet
export const SHOP_BUDGET = [0.01, 0.03, 0.08]; // så stor del av kassan en betald kampanj högst får kosta (försiktig, normal, stor budget)
export const SHOP_RESERVE = 3; // månader av kostnader som alltid ska finnas kvar i kassan efter en betald kampanj
export const SHOP_RETURN = [2, 1.5, 1.15]; // en betald kampanj måste väntas ge så här mycket mer än den kostar (försiktig, normal, djärv)
export const SHOP_THEME_FEE = 0.55; // förberedelsen av en temavecka kostar så här stor del av det extra den väntas ge
export const SHOP_DEAL_BELOW = [0.35, 0.5, 0.7]; // ett spel får erbjudande först när veckans försäljning är under så här stor del av toppveckan
export const SHOP_WAIT = [0.08, 0.15, 0.25]; // inga nya erbjudanden när så här stor del av spelarna redan väntar på nästa (S.wait)
export const SHOP_DEAL_AGE = 10; // veckor sedan släppet innan ett spel får ett erbjudande
export const SHOP_BUNDLE_AGE = [12, 6, 2]; // så gamla (veckor) ska spelen vara för att läggas i ett paket
export const SHOP_ON = 0.15; // lägsta effekt för att teamet ska sätta igång kampanjer

export const shopOpen = (G) => !!G.u.flags.shopTeams;
export const shopTeamOf = (G) => teamsOf(G).find((x) => x.role === 'shop') || null;
export const shopRutin = (team) => Math.min(RUTIN_MAX, Math.floor((team.shopW || 0) / RUTIN_WEEKS));

// Policyn: vilka sorters kampanjer teamet får köra (på eller av) samt budget och djärvhet (index 0 till 2)
const fresh = () => ({ on: 1, deal: 1, spot: 1, bundle: 1, theme: 1, budget: 1, aggro: 1, prep: null, n: { deal: 0, spot: 0, bundle: 0, theme: 0 }, q: { n: 0, fee: 0 }, fee: 0 });
export const shopOf = (G) => (G.store ? G.store.sh || (G.store.sh = fresh()) : fresh());
const KEYS = ['on', 'deal', 'spot', 'bundle', 'theme', 'budget', 'aggro'];
export function setShop(G, key, v) {
  if (!shopOpen(G) || !G.store || !KEYS.includes(key)) return false;
  const P = shopOf(G);
  const n = key === 'budget' || key === 'aggro' ? clamp(Math.round(v), 0, 2) : v ? 1 : 0;
  if (P[key] === n) return false;
  P[key] = n;
  return true;
}

// Hur många som behövs för att sköta butiken: fler butiksnivåer, fler kampanjer (4 på nivå 3 upp till 7 på nivå 6)
export const shopNeed = (G) => clamp(1 + levelOf(G), 3, 7);
// Teamets kvalitet: skicklighet, arbetsledare och rutin (0,55 för ett nytt oerfaret team upp mot 1,2)
export function shopQuality(G, team) {
  const mem = membersOf(G, team);
  if (!mem.length) return 0;
  const cap = skillCap(G);
  const avg = mem.reduce((a, s) => a + (s.design + s.tech + s.speed + s.research) / 4, 0) / mem.length / cap;
  const lead = leadOf(G, team);
  const lb = lead ? 0.12 * Math.min(1, leadScore(lead) / (4 * cap)) : 0;
  return 0.55 + 0.35 * Math.min(1, avg) + lb + 0.02 * shopRutin(team);
}
export const shopEff = (G, team) => clamp((membersOf(G, team).length / shopNeed(G)) * shopQuality(G, team), 0, 1);
// Allt fönstret behöver veta om butiksteamet
export function shopInfo(G, team) {
  const eff = shopEff(G, team);
  return { n: membersOf(G, team).length, need: shopNeed(G), q: shopQuality(G, team), eff, rutin: shopRutin(team), lift: SHOP_LIFT * eff, fee: SHOP_FEE * eff, theme: SHOP_THEME * eff };
}

export function canShop(G, team) {
  if (!shopOpen(G)) return 'shopLocked';
  if (!G.store || !canStore(G)) return 'shopStore';
  if (team.mission) return 'mission';
  const mem = membersOf(G, team);
  if (mem.length < SHOP_MIN) return 'opsSmall';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  const other = shopTeamOf(G);
  if (other && other !== team) return 'shopTaken';
  if (team.role === 'shop') return true;
  if (!seatFree(G, mem.filter((s) => !s.out).length)) return 'noSeats';
  return true;
}
export function assignShop(G, id) {
  const team = teamById(G, id);
  if (!team) return false;
  const ok = canShop(G, team);
  if (ok !== true) return tr(G, 'tm.err.' + ok);
  const fresh2 = team.role !== 'shop';
  team.role = 'shop';
  team.target = 'store';
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  setOut(membersOf(G, team), true);
  if (fresh2) note(G, 'news.shopStart', { team: teamName(team) }, 'info', true);
  return true;
}
export function endShop(G, id) {
  const team = teamById(G, id);
  return team && team.role === 'shop' ? endRole(G, id) : false;
}

// ── Veckans kampanjer ──
// (runCampaigns används också av testbotten för att jämföra med en spelare som kör samma kampanjer själv, utan team.)
// Teamet håller sig inom budgeten: en betald kampanj får kosta högst en andel av kassan, kassan ska räcka till tre månaders kostnader efter den,
// och kampanjen ska väntas ge minst SHOP_RETURN gånger avgiften.
export function runCampaigns(G, S, team, eff) {
  const P = shopOf(G);
  if (!P.on) return;
  const reserve = SHOP_RESERVE * burnOf(G);
  const cap = SHOP_BUDGET[P.budget] * Math.max(0, G.money);
  const paid = (cost, value) => cost <= cap && G.money - cost >= reserve && value >= cost * SHOP_RETURN[P.aggro];
  const tally = (kind, fee) => {
    P.n[kind]++;
    P.q.n++;
    P.q.fee += fee;
    P.fee += fee;
  };
  // temaveckan: förbered den (en gång per tema och år) mot en avgift, så lyfter den extra
  const ev = eventNow(G);
  if (P.theme && ev && !(P.prep && P.prep.id === ev.id && G.t - P.prep.t0 <= ev.weeks[1] - ev.weeks[0] + 1) && eventFits(G, ev).length) {
    const extra = SHOP_THEME * eff * eventValue(G, ev);
    const fee = Math.round((extra * SHOP_THEME_FEE) / 10) * 10;
    if (extra > 0 && paid(fee, extra)) {
      spend(G, fee, 'storeOps');
      P.prep = { id: ev.id, t0: G.t, v: SHOP_THEME * eff };
      tally('theme', fee);
      note(G, 'news.shopTheme', { team: team ? teamName(team) : { sv: 'Butiken', en: 'The store' }, name: EVENT_BY_ID[ev.id].name }, 'info', true);
    } else P.prep = { id: ev.id, t0: G.t, v: 0 }; // inte i år
  }
  // Veckans spel: det spel som ger mest över avgiften
  if (P.spot && spotsOf(S).length < spotSlots(G)) {
    let best = null;
    let bv = 0;
    for (const g of spotGames(G)) {
      if (canSpot(G, g.id) !== true) continue;
      const cost = spotCost(G, g);
      const val = spotValue(G, g);
      if (!paid(cost, val) || val - cost <= bv) continue;
      bv = val - cost;
      best = { g, cost };
    }
    if (best && startSpot(G, best.g.id) === true) tally('spot', best.cost);
  }
  // spelpaket: de tre bäst säljande spelen som är gamla nog (inget kostar något)
  if (P.bundle && bundleOpen(G) && !bundlesOf(S).length) {
    const pool = bundleGames(G)
      .filter((g) => G.t - g.t >= SHOP_BUNDLE_AGE[P.aggro])
      .sort((a, b) => baseOf(G, b) - baseOf(G, a) || a.id - b.id)
      .slice(0, BUNDLE.games)
      .map((g) => g.id);
    if (pool.length === BUNDLE.games && canBundle(G, pool) === true && startBundle(G, pool) === true) tally('bundle', 0);
  }
  // erbjudanden: äldre spel vars försäljning har sjunkit får den rabatt som ger mest (djärvare teamet tar större rabatter)
  if (P.deal && dealsOf(S).length < dealSlots(G) && (S.wait || 0) < SHOP_WAIT[P.aggro]) {
    let best = null;
    let bv = 0;
    for (const g of dealGames(G)) {
      if (G.t - g.t < SHOP_DEAL_AGE) continue;
      const base = baseOf(G, g);
      if (base <= 0 || base > Math.max(1, ...(g.weekly || [0])) * SHOP_DEAL_BELOW[P.aggro]) continue;
      for (let i = 0; i <= Math.min(P.aggro, DEALS.length - 1); i++) {
        if (canDeal(G, g.id, i) !== true) continue;
        const v = dealValue(G, g, i) - dealCost(G, i); // ett erbjudande ska ge mer än väntan på nästa kostar
        if (v > bv) {
          bv = v;
          best = { g, i };
        }
      }
    }
    if (best && startDeal(G, best.g.id, best.i) === true) tally('deal', 0);
  }
}

// Varje vecka före butikens egen vecka: räkna om teamets effekt (S.tm) och låt teamet sätta igång veckans kampanjer
export function shopWeek(G) {
  const S = G.store;
  if (S) S.tm = 0;
  const team = shopTeamOf(G);
  if (!team || !S || !canStore(G)) return;
  const eff = shopEff(G, team);
  S.tm = eff;
  team.shopW = (team.shopW || 0) + 1;
  if (!S.paused && eff >= SHOP_ON) runCampaigns(G, S, team, eff);
  // en rapport varje kvartal
  const P = S.sh;
  if (P && G.t % 12 === 7 && P.q.n) {
    note(G, 'news.shopReport', { a: P.q.n, v: fmtMoney(P.q.fee) }, 'info');
    P.q = { n: 0, fee: 0 };
  }
}
