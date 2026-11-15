// Produktteam: ett litet team med arbetsledare som tar hand om en hårdvarulinje (en produkttyp, till exempel speldatorer eller
// grafikkort) över alla dess generationer (forskningen Produktteam). Medarbetarna är ute på sin produkt (s.away) och arbetar inte
// med dina projekt, men lär sig av jobbet. Teamets effekt (0–1, P.te på linjens produkter) beror på hur många de är mot vad
// linjen kräver, hur skickliga de är, arbetsledaren och rutinen. Med full effekt åldras produkterna långsammare (P.mt), spelstödet
// (drivrutiner eller devkit) förbättras utan kostnad och revisioner (Pro och Slim) blir billigare och startar av sig själva.
// Teamet kan också ta fram nästa generation på egen hand: designa den (billigare, snabbare och med lägre prototyprisk), lansera den
// med förslagspris och förslagspartner, och trappa ned den gamla modellen. Allt är deterministiskt: teamet drar inget ur G.rng
// (slumpen i hårdvaran kommer ur hash av fröet som förut), så en spelare utan produktteam har samma slumpföljd som förut.
import { clamp } from '../core/util.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { skillCap } from './people.js';
import { HW_TYPES, HW_PARTNER } from '../data/hardware.js';
import { teamsOf, teamById, teamName, membersOf, leadOf, bestLead, leadScore, endRole, setOut, seatFree } from './teams.js';
import { RUTIN_WEEKS, RUTIN_MAX, OPS_MIN } from './opsteam.js';
import { canHw, typeOpen, relPerf, revCost, revCount, canRevise, reviseProduct, canDesign, designCost, protoCost, startDesign, suggestPrice, suggestPartner, draftOf, weeklyDemand, minOrder, launch, resolveProto, discontinue, setAuto, isPlat, productProfit, PLAT_MIN, drvMax, DRIVER_STEP, HW_TEAM_MT, HW_TEAM_COST, HW_TEAM_TIME } from './hardware.js';

// Hur många personer en linje kräver för full effekt: små komponenter är enkla, plattformar kräver ett större team
export const HW_NEED = { sound: 2, gpu: 3, pc: 4, cpu: 4, vr: 5, handheld: 5, console: 6 };
// Namnet på linjen i krönikan (samma ord som hw.type.* i strings.js, som {sv,en} eftersom nyheter översätter själva)
const LINE_NAME = {
  sound: { sv: 'ljudkort', en: 'sound cards' },
  gpu: { sv: 'grafikkort', en: 'graphics cards' },
  pc: { sv: 'speldatorer', en: 'gaming PCs' },
  cpu: { sv: 'processorer', en: 'processors' },
  handheld: { sv: 'bärbara spelenheter', en: 'handhelds' },
  console: { sv: 'konsoler', en: 'consoles' },
  vr: { sv: 'VR-headset', en: 'VR headsets' },
};
const FREE_DRIVER = 0.6; // spelstödet växer så här mycket av drivrutinsteamets takt, utan kostnad
const REV_BUFFER = 4; // kassan ska räcka till så här många revisioner
const REV_PRO_BELOW = 0.95; // en Pro-revision startar när produkten tappat så mycket mot marknaden
const REV_SLIM_AGE = 0.3; // och en Slim när produkten gått så stor del av sin livscykel
const NEXT_AT = 0.5; // nästa generation när den förra gått halva livet (en plattform: 70 %)
const NEXT_AT_PLAT = 0.7;
const NEXT_BELOW = 0.78; // eller när prestandan mot marknaden fallit under så här
const WIND_WEEKS = 8; // den gamla modellen får inga nya order när den nya sålt så här länge
const WIND_END = 30; // och läggs ned efter så här många veckor

export const hwTeamOpen = (G) => !!G.u.flags.hwTeams && canHw(G);
export const hwTeamOf = (G, type) => teamsOf(G).find((x) => x.role === 'hw' && x.target === type) || null;
export const hwRutin = (team) => Math.min(RUTIN_MAX, Math.floor((team.hwW || 0) / RUTIN_WEEKS));
// Produkttyper som ett team kan ta hand om: öppna typer där du har gjort minst en produkt
export const hwLines = (G) => (G.hw ? Object.keys(HW_TYPES).filter((ty) => typeOpen(G, ty) && G.hw.products.some((p) => p.type === ty)) : []);
const marketOf = (G, type) => G.hw.products.filter((p) => p.type === type && p.state === 'market').sort((a, b) => b.t - a.t);

export function hwQuality(G, team) {
  const mem = membersOf(G, team);
  if (!mem.length) return 0;
  const cap = skillCap(G);
  const avg = mem.reduce((a, s) => a + 0.4 * s.tech + 0.3 * s.research + 0.15 * s.design + 0.15 * s.speed, 0) / mem.length / cap;
  const lead = leadOf(G, team);
  const lb = lead ? 0.12 * Math.min(1, leadScore(lead) / (4 * cap)) : 0;
  return 0.55 + 0.35 * Math.min(1, avg) + lb + 0.02 * hwRutin(team);
}
export const hwEff = (G, team, type) => clamp((membersOf(G, team).length / (HW_NEED[type] || 4)) * hwQuality(G, team), 0, 1);
// Allt fönstret behöver veta om ett produktteam
export function hwInfo(G, team) {
  const type = team.target;
  if (!G.hw || !HW_TYPES[type]) return null;
  const cur = marketOf(G, type)[0] || null;
  const proj = G.hw.projects.find((p) => p.type === type && p.team === team.id) || null;
  return { type, n: membersOf(G, team).length, need: HW_NEED[type] || 4, q: hwQuality(G, team), eff: hwEff(G, team, type), rutin: hwRutin(team), cur, proj };
}

export function canHwTeam(G, team, type) {
  if (!G.u.flags.hwTeams) return 'hwLocked';
  if (!canHw(G) || !G.hw) return 'noHw';
  if (!HW_TYPES[type] || !typeOpen(G, type)) return 'hwType';
  if (!G.hw.products.some((p) => p.type === type)) return 'hwNone';
  if (team.mission) return 'mission';
  const mem = membersOf(G, team);
  if (mem.length < OPS_MIN) return 'opsSmall';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  const other = hwTeamOf(G, type);
  if (other && other !== team) return 'hwTaken';
  if (!seatFree(G, mem.filter((s) => !s.out).length)) return 'noSeats';
  return true;
}
export function assignHw(G, id, type) {
  const team = teamById(G, id);
  if (!team) return false;
  const ok = canHwTeam(G, team, type);
  if (ok !== true) return tr(G, 'tm.err.' + ok);
  team.role = 'hw';
  team.target = type;
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  setOut(membersOf(G, team), true);
  note(G, 'news.hwTeamStart', { team: teamName(team), type: LINE_NAME[type] }, 'info', true);
  return true;
}
export function endHw(G, id) {
  const team = teamById(G, id);
  return team && team.role === 'hw' ? endRole(G, id) : false;
}

// En Pro-revision när produkten tappat mot marknaden, en Slim när den gått en bit av livet, om kassan räcker
function autoRevise(G, team, P) {
  if (P.up) return;
  const life = HW_TYPES[P.type].life + (P.lifeAdd || 0);
  const kinds = [];
  if (relPerf(G, P) < REV_PRO_BELOW) kinds.push('pro');
  if ((G.t - P.t) / 48 >= REV_SLIM_AGE * life) kinds.push('slim');
  for (const k of kinds) {
    if (revCount(P, k) >= 3 || canRevise(G, P, k) !== true || G.money < revCost(G, P, k) * REV_BUFFER) continue;
    if (reviseProduct(G, P.id, k) === true) note(G, 'news.hwTeamRev', { team: teamName(team), name: P.name }, 'info', true);
    return;
  }
}

// Nästa generation: designas när den förra gått halva livet (eller tappat mot marknaden), om labbet har plats och kassan räcker
function nextGen(G, H, team, type, eff) {
  if (H.projects.some((p) => p.type === type) || H.products.some((p) => p.type === type && p.state === 'prod')) return;
  const market = marketOf(G, type);
  const ended = H.products.filter((p) => p.type === type && p.state === 'ended').sort((a, b) => (b.endT || 0) - (a.endT || 0));
  const base = market[0] || ended[0];
  if (!base) return;
  // en linje som gick med förlust startas inte om
  if (!market.length && productProfit(base) < 0) return;
  const ty = HW_TYPES[type];
  const plat = isPlat(type);
  if (market.length && (G.t - base.t) / 48 < (ty.life + (base.lifeAdd || 0)) * (plat ? NEXT_AT_PLAT : NEXT_AT) && relPerf(G, base) >= NEXT_BELOW) return;
  const spec = { type, cls: base.cls, qual: base.qual || 'normal', arch: base.arch || 'std', opt: G.engines.some((e) => e.id === base.opt) ? base.opt : null };
  let ok = canDesign(G, spec);
  if (ok === 'locked' && spec.arch === 'own') {
    spec.arch = 'std';
    ok = canDesign(G, spec);
  }
  if (ok !== true) return;
  const first = plat ? PLAT_MIN[type] * ty.price * ty.unit : 0;
  if (G.money < (designCost(G, spec) + protoCost(G, spec)) * (plat ? 4 : 6) + first) return;
  if (startDesign(G, spec) !== true) return;
  const J = H.projects[H.projects.length - 1];
  J.team = team.id;
  J.tq = eff;
  J.budget = Math.round(J.budget * (1 - HW_TEAM_COST * eff));
  J.weeks = Math.max(4, Math.round(J.weeks * (1 - HW_TEAM_TIME * eff)));
  note(G, 'news.hwTeamDesign', { team: teamName(team), name: J.name }, 'info', true);
}

// Teamets egna projekt: en misslyckad prototyp görs om om kassan räcker, en färdig produkt lanseras med förslagspris och -partner
function tend(G, H, team) {
  for (const J of H.projects.slice()) {
    if (J.team !== team.id) continue;
    if (J.state === 'fail') resolveProto(G, J.id, G.money > J.budget * 3 ? 'redo' : 'ship');
    else if (J.state === 'ready') {
      const price = suggestPrice(J.type, J.cls);
      const pid = suggestPartner(G, J, price);
      const d = weeklyDemand(G, draftOf(G, J, pid, price), price);
      const units = Math.max(minOrder(J, pid, true), Math.round(d * (HW_PARTNER[pid].lead + 6)));
      if (launch(G, J.id, { partner: pid, price, units, auto: true }) === true) H.products[H.products.length - 1].team = team.id;
    }
  }
}

// Den nya modellen har sålt ett tag: den gamla får inga nya order och läggs ned när lagret är slut (eller efter en tid)
function windDown(G, H, team, type) {
  const m = marketOf(G, type);
  if (m.length < 2 || m[0].team !== team.id || G.t - m[0].t < WIND_WEEKS) return;
  for (const P of m.slice(1)) {
    if (P.auto) setAuto(G, P.id, false);
    if (P.stock < Math.max(1, P.dem) || G.t - m[0].t >= WIND_END) discontinue(G, P.id, true);
  }
}

// Varje vecka efter hwWeek: räkna om teamens effekt (P.te), underhåll produkterna och låt teamen göra sina egna drag
export function hwTeamWeek(G) {
  const H = G.hw;
  if (!H) return;
  for (const P of H.products) if (P.te) P.te = 0;
  for (const team of teamsOf(G)) {
    if (team.role !== 'hw' || !HW_TYPES[team.target]) continue;
    const type = team.target;
    const eff = hwEff(G, team, type);
    team.hwW = (team.hwW || 0) + 1;
    for (const P of H.products) if (P.type === type && P.state !== 'ended') P.te = eff;
    const flag = isPlat(type) ? 'hw_devkit' : 'hw_driver';
    for (const P of marketOf(G, type)) {
      P.mt = (P.mt || 0) + HW_TEAM_MT * eff;
      if (G.u.flags[flag] && !P.drv && P.compat < drvMax(P)) P.compat = Math.min(drvMax(P), P.compat + DRIVER_STEP * FREE_DRIVER * eff);
    }
    if (eff < 0.15) continue;
    tend(G, H, team);
    const cur = marketOf(G, type)[0];
    if (cur && team.autoRev !== false) autoRevise(G, team, cur);
    if (team.repeat) {
      nextGen(G, H, team, type, eff);
      windDown(G, H, team, type);
    }
  }
}
