// Personalavdelning (research s_hrdept): sköter anställningarna åt dig. Du anger planen (G.hr): hur många spelteam studion ska ha och
// hur stora de ska vara. Varje vecka bildar avdelningen ett nytt team om det saknas och anställer de bästa bland veckans kandidater
// till team som är för små (team.want). Ett team får också en egen önskad storlek utan planen. Avdelningen rör aldrig den ordinarie
// personalen, bara nyanställda går till teamen, och den håller alltid en reserv i kassan (HR_RESERVE månader av kostnaderna).
// Allt är deterministiskt: kandidaterna kommer ur den vanliga månadsdragningen, avdelningen drar inget ur G.rng.
import { clamp } from '../core/util.js';
import { note } from './news.js';
import { payroll, canHire, hire } from './people.js';
import { rentOf, facUpkeep, seated, capacity } from './studio.js';
import { teamsOf, teamMax, createTeam, addMember, seatFree, holds, TEAM_SIZE } from './teams.js';
import { MISSION_MIN } from './autoteam.js';

export const HR_RESERVE = 8; // månader av löner, hyra och drift som ska finnas kvar i kassan efter en anställning
export const HR_MIN = MISSION_MIN;
export const hrOpen = (G) => !!G.u.flags.hrAuto;
export const hrPlan = (G) => {
  if (!G.hr) G.hr = { teams: 0, size: 5, hired: 0, pend: 0 };
  return G.hr;
};
export const hrTeams = (G) => teamsOf(G).filter((x) => x.hr);
export const hrReserve = (G) => HR_RESERVE * (payroll(G) + rentOf(G) + facUpkeep(G));

// Planen: antal spelteam (0 = av) och storlek. Teamen som avdelningen äger får den storleken som önskad storlek.
export function setHrPlan(G, teams, size) {
  if (!hrOpen(G)) return false;
  const p = hrPlan(G);
  p.teams = clamp(Math.round(teams), 0, teamMax(G));
  p.size = clamp(Math.round(size), HR_MIN, TEAM_SIZE);
  for (const x of hrTeams(G)) x.want = p.size;
  return true;
}
// Ett team behöver minst HR_MIN personer för att ta uppdrag. Önskad storlek 0 = av.
export function setWant(G, id, n) {
  const team = teamsOf(G).find((x) => x.id === id);
  if (!team || !hrOpen(G)) return false;
  team.want = n <= 0 ? 0 : clamp(Math.round(n), HR_MIN, TEAM_SIZE);
  return true;
}

// Hur väl en kandidat passar teamets uppgift: viktade färdigheter (design, teknik, tempo, forskning)
const FIT = { game: [1, 1, 0.8, 0.2], ops: [0.4, 1, 1, 0], hw: [0.8, 1, 0.3, 0.3], res: [0.2, 0.2, 0, 1] };
export const hrFit = (team, c) => {
  const w = FIT[team.role] || FIT.game;
  return c.design * w[0] + c.tech * w[1] + c.speed * w[2] + c.research * w[3];
};

// Kandidaten som avdelningen skulle anställa till teamet nu, eller null (ingen passar, kassan räcker inte eller inga platser)
export function hrPick(G, team) {
  if (!canHire(G)) return null;
  if (holds(team) && !seatFree(G, 1)) return null;
  const reserve = hrReserve(G);
  let best = null;
  for (const c of G.candidates) {
    if (G.money - c.fee < reserve + c.salary * HR_RESERVE) continue;
    const f = hrFit(team, c);
    if (!best || f > best.f) best = { c, f };
  }
  return best ? best.c : null;
}

export function hrWeek(G) {
  if (!hrOpen(G)) return;
  const p = hrPlan(G);
  // ett nytt spelteam per vecka tills planen är uppfylld
  const mine = hrTeams(G);
  if (mine.length < p.teams && teamsOf(G).length < teamMax(G) && G.money > hrReserve(G) * 1.5) {
    const tm = createTeam(G);
    if (typeof tm !== 'string') {
      tm.hr = true;
      tm.want = p.size;
      tm.repeat = true;
      tm.autoTrain = true;
    }
  }
  // fyll på de minsta teamen först (ett team mitt i ett uppdrag tar emot nya när uppdraget är klart)
  const need = teamsOf(G)
    .filter((x) => x.want > x.members.length && !x.mission)
    .sort((a, b) => a.members.length - b.members.length || a.id - b.id);
  let n = 0;
  for (const tm of need) {
    while (tm.members.length < tm.want) {
      const c = hrPick(G, tm);
      if (!c) break;
      if (hire(G, c.id) !== true) break;
      if (addMember(G, tm.id, c.id) !== true) break;
      n++;
    }
  }
  p.hired += n;
  p.pend = (p.pend || 0) + n;
  // ett samlat besked per kvartal, inte ett per anställd
  if (p.pend > 0 && G.t % 12 === 0) {
    note(G, 'news.hrHires', { n: p.pend, staff: G.staff.length }, 'info');
    p.pend = 0;
  }
}
// Vad avdelningen har kvar att göra, för fönstret: team som saknar folk och hur många som saknas
export function hrOpenSeats(G) {
  return teamsOf(G).reduce((a, x) => a + Math.max(0, (x.want || 0) - x.members.length), 0);
}
export const hrDesksLeft = (G) => Math.max(0, capacity(G) - seated(G));
