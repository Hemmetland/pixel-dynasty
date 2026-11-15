// Översikt: vad sköter sig själv just nu? Samlar team, autopiloter och Koncernen på ett ställe, med läget för varje område,
// vad som väntar på dig och (för handledningen) vad som är ett bra nästa steg. Allt här läser bara: inget skapas i G (policyerna
// G.gb, G.bz, G.hr, G.engp och butikens G.store.sh skapas av sina moduler först när spelaren rör dem), inget drar ur G.rng och
// inget ändrar spelets utfall.
import { L } from '../core/i18n.js';
import { RESEARCH } from '../data/research.js';
import { teamsOf, holds, teamName, membersOf } from './teams.js';
import { liveGames, canGoLive } from './live.js';
import { opsTeamOf, opsInfo } from './opsteam.js';
import { hwLines, hwTeamOpen, hwInfo } from './hwteam.js';
import { resInfo } from './resteam.js';
import { shopTeamOf, shopInfo, SHOP_ON } from './shopteam.js';
import { engTeamOf, engInfo, ENG_ON } from './engteam.js';
import { hrTeams } from './hrdept.js';
import { ownedComps } from './acquire.js';
import { burnOf, boardNext } from './board.js';
import { canStore } from './store.js';
import { canHw } from './hardware.js';
import { canGroup } from './group.js';
import { canUpgradeOffice, researchSlots } from './studio.js';
import { teamsOpen } from './teams.js';

// Områdena i den ordning översikten visar dem. flag = vad som låser upp området, win = fönstret där det ställs in.
export const AREAS = [
  { id: 'games', ic: 'gamepad', flag: 'autoTeams', win: 'staff' },
  { id: 'ops', ic: 'globe', flag: 'opsTeams', win: 'staff' },
  { id: 'hw', ic: 'cpu', flag: 'hwTeams', win: 'staff' },
  { id: 'res', ic: 'flask', flag: 'resTeams', win: 'staff' },
  { id: 'shop', ic: 'cart', flag: 'shopTeams', win: 'store' },
  { id: 'eng', ic: 'cog', flag: 'engTeams', win: 'contracts' },
  { id: 'hr', ic: 'team', flag: 'hrAuto', win: 'staff' },
  { id: 'board', ic: 'crown', flag: 'groupBoard', win: 'group' },
  { id: 'biz', ic: 'bank', flag: 'bizAuto', win: 'market' },
];
export const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a]));

// Forskningen som öppnar ett område (för raden "Forska fram ...")
export const unlockOf = (flag) => RESEARCH.find((r) => r.unlock && r.unlock.flags && r.unlock.flags.includes(flag)) || null;

// Hur väl ett team som håller en roll räcker till (0-1), eller null om rollen saknar mått
export function teamEff(G, team) {
  const info = team.role === 'ops' ? opsInfo(G, team) : team.role === 'hw' ? hwInfo(G, team) : team.role === 'res' ? resInfo(G, team) : team.role === 'shop' ? shopInfo(G, team) : team.role === 'eng' ? engInfo(G, team) : null;
  return info && typeof info.eff === 'number' ? info.eff : null;
}
const meanEff = (G, teams) => {
  const e = teams.map((x) => teamEff(G, x)).filter((v) => v !== null);
  return e.length ? e.reduce((a, b) => a + b, 0) / e.length : null;
};
const roleTeams = (G, role) => teamsOf(G).filter((x) => x.role === role);

// En rad per område. state: 'auto' (sköter sig självt), 'idle' (öppet men inget igång) eller 'locked' (forskas fram).
// line = [textnyckel, parametrar]; eff = teamens snitteffekt (0-1) eller null; next = styrelsens nästa steg (bara i board).
export function areaRow(G, id) {
  const a = AREA[id];
  const open = id === 'hw' ? hwTeamOpen(G) : !!G.u.flags[a.flag];
  const row = { id, ic: a.ic, win: a.win, open, state: 'locked', line: ['ov.locked', {}], eff: null, n: 0, need: null };
  if (!open) {
    const r = unlockOf(a.flag);
    row.need = r ? { id: r.id, name: r.name, year: r.year } : null;
    return row;
  }
  const idle = (key, p = {}) => {
    row.state = 'idle';
    row.line = [key, p];
    return row;
  };
  const auto = (key, p = {}) => {
    row.state = 'auto';
    row.line = [key, p];
    return row;
  };
  if (id === 'games') {
    const crews = teamsOf(G).filter((x) => !holds(x) && x.members.length);
    const m = crews.filter((x) => x.mission).length;
    const r = crews.filter((x) => x.repeat).length;
    row.n = crews.length;
    if (!crews.length) return idle('ov.games.none');
    if (m || r) return auto('ov.games.auto', { a: m, n: crews.length, r });
    return idle('ov.games.idle', { n: crews.length });
  }
  if (id === 'ops') {
    const live = liveGames(G);
    const teams = roleTeams(G, 'ops');
    const covered = live.filter((g) => opsTeamOf(G, g.id)).length;
    row.n = teams.length;
    row.eff = meanEff(G, teams);
    if (!live.length) return idle('ov.ops.none');
    if (covered) return auto('ov.ops.auto', { a: covered, b: live.length });
    return idle('ov.ops.idle', { b: live.length });
  }
  if (id === 'hw') {
    const teams = roleTeams(G, 'hw');
    const lines = hwLines(G).length;
    row.n = teams.length;
    row.eff = meanEff(G, teams);
    if (teams.length) return auto('ov.hw.auto', { a: teams.length, b: Math.max(lines, teams.length) });
    return idle(lines ? 'ov.hw.idle' : 'ov.hw.none');
  }
  if (id === 'res') {
    const teams = roleTeams(G, 'res');
    row.n = teams.length;
    row.eff = meanEff(G, teams);
    if (teams.length) return auto('ov.res.auto', { a: teams.length });
    return idle('ov.res.idle');
  }
  if (id === 'shop') {
    const team = shopTeamOf(G);
    const on = !G.store || !G.store.sh || !!G.store.sh.on;
    row.n = team ? 1 : 0;
    if (!G.store) return idle('ov.shop.nostore');
    if (!team) return idle('ov.shop.none');
    row.eff = shopInfo(G, team).eff;
    if (!on) return idle('ov.shop.off');
    return row.eff >= SHOP_ON ? auto('ov.shop.auto', { n: Math.round(row.eff * 100) }) : idle('ov.shop.weak', { n: Math.round(row.eff * 100) });
  }
  if (id === 'eng') {
    const team = engTeamOf(G);
    const on = !G.engp || !!G.engp.on;
    row.n = team ? 1 : 0;
    if (!G.u.flags.engines) return idle('ov.eng.noshop');
    if (!team) return idle('ov.eng.none');
    const inf = engInfo(G, team);
    row.eff = inf.eff;
    if (inf.proj) return auto('ov.eng.build', { name: inf.proj.name, n: Math.round(Math.min(1, inf.proj.w / Math.max(1, inf.proj.need)) * 100) });
    if (!on) return idle('ov.eng.off');
    return inf.eff >= ENG_ON ? auto('ov.eng.watch') : idle('ov.eng.weak', { n: Math.round(inf.eff * 100) });
  }
  if (id === 'hr') {
    const p = G.hr;
    const have = hrTeams(G).length;
    row.n = have;
    if (p && p.teams > 0) return auto('ov.hr.auto', { a: have, b: p.teams, s: p.size });
    return idle('ov.hr.idle');
  }
  if (id === 'board') {
    const b = G.gb;
    const subs = ownedComps(G).length;
    row.n = subs;
    if (b && (b.buy || b.integ || b.budget)) {
      row.next = boardNext(G);
      return auto('ov.board.auto', { n: subs });
    }
    return idle(canGroup(G) ? 'ov.board.idle' : 'ov.board.none');
  }
  // biz
  const z = G.bz;
  row.n = z ? (z.signed || 0) + (z.taken || 0) : 0;
  if (z && (z.pub || z.lic)) return auto('ov.biz.auto', { a: z.signed || 0, b: z.taken || 0 });
  return idle('ov.biz.idle');
}

export const overviewRows = (G) => AREAS.map((a) => areaRow(G, a.id));

// Sammanfattning: hur många områden som sköter sig självt av dem som går att använda, personal och platser
export function overviewSummary(G) {
  const rows = overviewRows(G);
  const open = rows.filter((r) => r.open);
  return { auto: open.filter((r) => r.state === 'auto').length, open: open.length, locked: rows.length - open.length, teams: teamsOf(G).length, staff: G.staff.length };
}

// Det som väntar på dig: team som inte räcker till, trång kassa, tomma platser i produktionen. Högst fem, viktigast först.
// { k: textnyckel, p: parametrar, win: fönstret att öppna }
export function overviewTodo(G) {
  const out = [];
  for (const team of teamsOf(G)) {
    if (!holds(team)) continue;
    const e = teamEff(G, team);
    if (e !== null && e < 0.3) out.push({ k: 'ov.todo.low', p: { team: L(teamName(team)), n: Math.round(e * 100), m: membersOf(G, team).length }, win: 'staff' });
  }
  const rows = overviewRows(G);
  const anyAuto = rows.some((r) => r.state === 'auto');
  const burn = burnOf(G);
  if (anyAuto && burn > 0 && G.money < burn * 3) out.push({ k: 'ov.todo.cash', p: { n: Math.max(0, Math.floor(G.money / burn)) }, win: 'finance' });
  const crews = teamsOf(G).filter((x) => !holds(x) && x.members.length);
  if (G.games.length > 0 && !G.job && !crews.some((x) => x.mission)) out.push({ k: 'ov.todo.idle', p: {}, win: 'wizard' });
  const live = liveGames(G);
  if (G.u.flags.opsTeams && live.length && live.some((g) => !opsTeamOf(G, g.id))) out.push({ k: 'ov.todo.ops', p: { n: live.filter((g) => !opsTeamOf(G, g.id)).length }, win: 'staff' });
  if (G.research.active.length < researchSlots(G) && G.research.active.length === 0 && G.games.length >= 2) out.push({ k: 'ov.todo.research', p: {}, win: 'research' });
  return out.slice(0, 5);
}

// Handledningens nästa steg: de första tre som passar läget. { id, ic, win } (texter: guide.next.<id>.h och .b)
const NEXT = [
  { id: 'create', ic: 'plus', win: 'wizard', when: (G) => !G.job && G.games.length === 0 },
  { id: 'dev', ic: 'gamepad', win: null, when: (G) => !!G.job && G.job.kind === 'game' && G.games.length === 0 },
  { id: 'research', ic: 'flask', win: 'research', when: (G) => G.games.length >= 1 && G.research.done.length === 0 && !G.research.active.length },
  { id: 'again', ic: 'rocket', win: 'wizard', when: (G) => G.games.length >= 1 && G.games.length < 4 && !G.job },
  { id: 'team', ic: 'team', win: 'staff', when: (G) => G.games.length >= 2 && G.staff.length < 3 },
  { id: 'studio', ic: 'building', win: 'studio', when: (G) => G.office.tier === 0 && canUpgradeOffice(G) === true },
  { id: 'teams', ic: 'team', win: 'staff', when: (G) => teamsOpen(G) && teamsOf(G).length === 0 },
  { id: 'hw', ic: 'gpu', win: 'hardware', when: (G) => canHw(G) && !(G.hw && (G.hw.products.length || G.hw.projects.length)) },
  { id: 'store', ic: 'cart', win: 'store', when: (G) => canStore(G) && !G.store },
  { id: 'live', ic: 'globe', win: 'library', when: (G) => canGoLive(G) && liveGames(G).length === 0 && G.games.some((g) => g.score >= 7) },
  { id: 'auto', ic: 'sliders', win: 'overview', when: (G) => AREAS.some((a) => G.u.flags[a.flag]) && !G.flags.overviewSeen },
  { id: 'group', ic: 'network', win: 'group', when: (G) => canGroup(G) && ownedComps(G).length === 0 },
];
export const GUIDE_STEPS = NEXT.map((x) => x.id);
export const nextSteps = (G) => NEXT.filter((s) => s.when(G)).slice(0, 3).map(({ id, ic, win }) => ({ id, ic, win }));
