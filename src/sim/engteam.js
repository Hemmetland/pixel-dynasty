// Motorteam (forskningen Motorteam): ett team bygger spelmotorer i bakgrunden, så att hela studion kan fortsätta göra spel. Utan team
// tar en motor hela studions projektplats (G.job) i flera veckor; med team går bygget vid sidan om. Medarbetarna är ute i verkstaden
// (s.away och s.out, platserna kommer av verkstaden och hur många motorer studion byggt, se seatCap i studio.js) och arbetar inte med
// dina projekt, men lär sig av jobbet. Teamets effekt (0-1) beror på hur många de är mot vad tiden kräver (nyare tekniska delar kräver
// fler händer), hur skickliga de är, arbetsledaren och rutinen, och styr både bygget (en vecka vid full effekt är en vecka, vid
// halv effekt två) och hur bra motorn blir (upp till ENG_BONUS mer teknik). Du kan beställa en motor åt teamet i Uppdrag > Motorer,
// eller lämna det åt teamet att byta motor själv när studions bästa tappat för mycket (G.engp: på/av, när, storlek och budget).
// Allt är deterministiskt: teamet drar inget ur G.rng, så spel utan motorteam har samma slumpföljd som förut.
import { clamp } from '../core/util.js';
import { emit } from '../core/bus.js';
import { note } from './news.js';
import { tr } from './tr.js';
import { skillCap } from './people.js';
import { spend } from './studio.js';
import { burnOf } from './board.js';
import { yearOf, yfOf, engineNeed, engineEff } from './const.js';
import { teamsOf, teamById, teamName, membersOf, leadOf, bestLead, leadScore, endRole, setOut, seatFree } from './teams.js';
import { RUTIN_WEEKS, RUTIN_MAX } from './opsteam.js';
import { engineCost, engineTech, engineWeeks } from './engines.js';
import { FEATURES, FEAT } from '../data/research.js';
import { beat } from './life.js';

export const ENG_MIN = 2; // minst så här många i teamet
export const ENG_BONUS = 0.1; // en motor byggd av ett team med full effekt har så här mycket mer teknik
export const ENG_ON = 0.15; // lägsta effekt för att teamet ska bygga
export const ENG_BUDGET = [0.02, 0.05, 0.12]; // så stor del av kassan en motor högst får kosta (liten, normal, stor budget)
export const ENG_RESERVE = 3; // månader av kostnader som alltid ska finnas kvar efter att bygget betalats
export const ENG_WHEN = [0.55, 0.8, 1]; // teamet bygger en ny motor när den bästa har sjunkit under så här stor del av tidens behov (sent, normalt, tidigt)
export const ENG_SIZE = [0.9, 1.1, 1.3]; // och sikta på så här stor del av tidens behov (liten, normal, stor motor)

export const engOpen = (G) => !!G.u.flags.engTeams;
export const engTeamOf = (G) => teamsOf(G).find((x) => x.role === 'eng') || null;
export const engRutin = (team) => Math.min(RUTIN_MAX, Math.floor((team.engW || 0) / RUTIN_WEEKS));

// Policyn: på/av (teamet byter motor själv), när, hur stor och budget (index 0 till 2)
const fresh = () => ({ on: 1, when: 1, size: 1, budget: 1, n: 0, fee: 0 });
export const engPolicy = (G) => G.engp || (G.engp = fresh());
const KEYS = ['on', 'when', 'size', 'budget'];
export function setEng(G, key, v) {
  if (!engOpen(G) || !KEYS.includes(key)) return false;
  const P = engPolicy(G);
  const n = key === 'on' ? (v ? 1 : 0) : clamp(Math.round(v), 0, 2);
  if (P[key] === n) return false;
  P[key] = n;
  return true;
}

// Hur många som behövs: fler tekniska delar i tiden, fler händer (3 i början upp till 9 senare)
export const engNeed = (G) => clamp(Math.round(2 + engineNeed(yearOf(G.t)) / 12), 3, 9);
// Teamets kvalitet: skicklighet (teknik och forskning väger tyngst), arbetsledare och rutin (0,55 för ett nytt oerfaret team upp mot 1,2)
export function engQuality(G, team) {
  const mem = membersOf(G, team);
  if (!mem.length) return 0;
  const cap = skillCap(G);
  const avg = mem.reduce((a, s) => a + (s.design + 2 * s.tech + s.speed + 2 * s.research) / 6, 0) / mem.length / cap;
  const lead = leadOf(G, team);
  const lb = lead ? 0.12 * Math.min(1, leadScore(lead) / (4 * cap)) : 0;
  return 0.55 + 0.35 * Math.min(1, avg) + lb + 0.02 * engRutin(team);
}
export const engEff = (G, team) => clamp((membersOf(G, team).length / engNeed(G)) * engQuality(G, team), 0, 1);
// Allt fönstret behöver veta om motorteamet
export function engInfo(G, team) {
  const eff = engEff(G, team);
  return { n: membersOf(G, team).length, need: engNeed(G), q: engQuality(G, team), eff, rutin: engRutin(team), bonus: ENG_BONUS * eff, proj: team.ep || null };
}

// Hur bra studions bästa motor är mot tidens behov nu (1 = precis tillräckligt, 0 = ingen motor)
export function bestRatio(G) {
  const yf = yfOf(G.t);
  const need = engineNeed(Math.floor(yf));
  return G.engines.reduce((m, e) => Math.max(m, engineEff(e, yf) / need), 0);
}

export function canEng(G, team) {
  if (!engOpen(G)) return 'engLocked';
  if (!G.u.flags.engines) return 'engWorkshop';
  if (team.mission) return 'mission';
  const mem = membersOf(G, team);
  if (mem.length < ENG_MIN) return 'opsSmall';
  if (mem.some((s) => s.isFounder)) return 'founder';
  if (mem.some((s) => s.trainUntil > G.t)) return 'training';
  const other = engTeamOf(G);
  if (other && other !== team) return 'engTaken';
  if (team.role === 'eng') return true;
  if (!seatFree(G, mem.filter((s) => !s.out).length)) return 'noSeats';
  return true;
}
export function assignEng(G, id) {
  const team = teamById(G, id);
  if (!team) return false;
  const ok = canEng(G, team);
  if (ok !== true) return tr(G, 'tm.err.' + ok);
  const isNew = team.role !== 'eng';
  team.role = 'eng';
  team.target = 'engine';
  if (!leadOf(G, team)) team.lead = bestLead(G, team).id;
  setOut(membersOf(G, team), true);
  if (isNew) note(G, 'news.engStart', { team: teamName(team) }, 'info', true);
  return true;
}
// Teamet slutar med motorerna (ett pågående bygge avbryts och pengarna är förbrukade)
export function endEng(G, id) {
  const team = teamById(G, id);
  if (!team || team.role !== 'eng') return false;
  const r = endRole(G, id);
  if (r === true) team.ep = null;
  return r;
}

// ── Bygget ──
// Ett bygge åt teamet: pengarna betalas när det börjar och teamet arbetar sedan på det vid sidan om studions projekt.
export function canEngOrder(G, team, featIds) {
  if (!team || team.role !== 'eng') return 'engNoTeam';
  if (team.ep) return 'engBusy';
  const ids = featIds.filter((id) => G.u.feats.includes(id));
  if (ids.length < 2) return 'engFew';
  if (G.money < engineCost(ids)) return 'money';
  return true;
}
export function orderEngine(G, name, featIds, auto = false) {
  const team = engTeamOf(G);
  const ok = canEngOrder(G, team, featIds);
  if (ok !== true) return ok === 'money' ? tr(G, 'err.money') : tr(G, 'tm.err.' + ok);
  const ids = featIds.filter((id) => G.u.feats.includes(id));
  const cost = engineCost(ids);
  spend(G, cost, 'engines');
  const nm = name || tr(G, 'eng.autoName', { n: G.engines.length + 1 });
  team.ep = { id: G.uid++, name: nm, feats: ids, w: 0, need: engineWeeks(ids), cost, t0: G.t, auto, half: false, test: false };
  beat(G, 'engStart', { g: nm });
  emit('engTeamStart', team.ep);
  return true;
}

// Val av tekniska delar åt en motor: de som ger mest teknik per krona först, tills motorn når målet eller pengarna (cap) tar slut
export function pickFeats(G, target, cap) {
  const feats = FEATURES.filter((f) => G.u.feats.includes(f.id)).sort((a, b) => b.tech / b.cost - a.tech / a.cost || (a.id < b.id ? -1 : 1));
  const out = [];
  let cost = 0;
  let tech = 0;
  for (const f of feats) {
    if (tech >= target) break;
    if (cost + f.cost > cap) continue;
    out.push(f.id);
    cost += f.cost;
    tech += f.tech;
  }
  return out;
}

function finish(G, team) {
  const p = team.ep;
  const eff = engEff(G, team);
  const base = engineTech(p.feats);
  const e = { id: G.uid++, name: p.name, feats: p.feats.filter((id) => FEAT[id]), tech: Math.round(base * (1 + ENG_BONUS * eff) * 10) / 10, built: yfOf(G.t), team: team.id };
  G.engines.push(e);
  team.ep = null;
  team.engN = (team.engN || 0) + 1;
  beat(G, 'engine', { g: e.name });
  note(G, 'news.engTeamDone', { team: teamName(team), name: e.name }, 'good');
  emit('engineDone', e);
}

// Varje vecka: räkna om effekten, arbeta på bygget och låt teamet byta motor själv om det får
export function engWeek(G) {
  const team = engTeamOf(G);
  if (!team) return;
  const eff = engEff(G, team);
  team.eff = eff;
  team.engW = (team.engW || 0) + 1;
  const P = engPolicy(G);
  if (team.ep) {
    if (eff >= ENG_ON) {
      const p = team.ep;
      p.w += eff;
      if (!p.half && p.w >= p.need / 2) {
        p.half = true;
        beat(G, 'engHalf', { g: p.name });
      }
      if (!p.test && p.w >= (p.need * 3) / 4) {
        p.test = true;
        beat(G, 'engTest', { g: p.name });
      }
      if (p.w >= p.need) finish(G, team);
    }
    return;
  }
  if (!P.on || eff < ENG_ON || !G.u.flags.engines || bestRatio(G) >= ENG_WHEN[P.when]) return;
  // byt motor: betala bara det som ryms i budgeten och lämna tre månaders kostnader i kassan
  const reserve = ENG_RESERVE * burnOf(G);
  const cap = Math.min(ENG_BUDGET[P.budget] * Math.max(0, G.money), Math.max(0, G.money - reserve));
  const ids = pickFeats(G, engineNeed(yearOf(G.t)) * ENG_SIZE[P.size], cap);
  if (ids.length < 2) return;
  if (orderEngine(G, '', ids, true) === true) {
    P.n++;
    P.fee += engineCost(ids);
  }
}
