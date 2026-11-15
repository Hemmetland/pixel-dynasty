// Campus: när Dynastitornet är fullt kan studion bygga fler hus bredvid det (research s_campus). Varje hus ger CAMPUS_DESKS skrivbord,
// plats för fyra team till (teamMax i teams.js) och två kandidater till varje månad (refreshCandidates i people.js). Husen kostar
// hyra och måste behövas: det förra huset ska vara nästan fullt innan nästa får byggas. Personalen i campushusen sitter inte i
// scenen (bara tornets skrivbord ritas) men räknas som vanlig personal. All logik är deterministisk, inget dras ur G.rng.
import { yearOf } from './const.js';
import { emit } from '../core/bus.js';
import { note } from './news.js';
import { CAMPUS, CAMPUS_MAX, CAMPUS_DESKS, TIERS, campusOf, capacity, spend, avgRecentScore } from './studio.js';

export { CAMPUS, CAMPUS_MAX, CAMPUS_DESKS, campusOf };
export const CAMPUS_AVG = 7.8; // snittbetyget på de senaste spelen som krävs för varje hus
export const CAMPUS_SLACK = 3; // så många skrivbord får stå tomma när nästa hus byggs

// Campus går att bygga när forskningen är klar och kontoret är på sista nivån
export const campusOpen = (G) => !!G.u.flags.campus && G.office.tier >= TIERS.length - 1;
export const campusNext = (G) => (campusOf(G) < CAMPUS_MAX ? { n: campusOf(G) + 1, desks: CAMPUS_DESKS, ...CAMPUS[campusOf(G)] } : null);

// Kraven för nästa hus i samma form som kontorens (studio.js officeReqs): { id, have, need, ok }
export function campusReqs(G, nx = campusNext(G)) {
  if (!nx) return [];
  return [
    { id: 'staff', have: G.staff.length, need: Math.max(0, capacity(G) - CAMPUS_SLACK) },
    { id: 'avg', have: avgRecentScore(G), need: CAMPUS_AVG },
    { id: 'fans', have: G.fans, need: nx.fans },
    { id: 'money', have: G.money, need: nx.cost },
  ].map((r) => ({ ...r, ok: r.have >= r.need - (r.id === 'avg' ? 0.005 : 0) }));
}
// true om nästa hus kan byggas, annars id på det första kravet som saknas ('max' när alla hus står, 'locked' utan forskning och torn)
export function canCampus(G) {
  if (!campusOpen(G)) return 'locked';
  const nx = campusNext(G);
  if (!nx) return 'max';
  const miss = campusReqs(G, nx).find((r) => !r.ok);
  return miss ? miss.id : true;
}
export function buildCampus(G) {
  if (canCampus(G) !== true) return false;
  const nx = campusNext(G);
  spend(G, nx.cost, 'office');
  G.office.campus = nx.n;
  note(G, 'news.campus', { studio: G.studio, n: nx.n, desks: nx.desks }, 'good', true);
  emit('office', { campus: nx.n, year: yearOf(G.t) });
  return true;
}
// Andelen av campushusens skrivbord som är besatta (0–1), för att tända fönstren på kvällen
export function campusFill(G) {
  const n = campusOf(G);
  if (!n) return 0;
  const inTower = TIERS[G.office.tier].desks;
  const extra = Math.max(0, G.staff.filter((s) => !s.out).length - inTower);
  return Math.min(1, extra / (n * CAMPUS_DESKS));
}
