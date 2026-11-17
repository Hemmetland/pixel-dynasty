// Studions historia: veteranerna minns. När ett nytt projekt liknar ett tidigare spel (samma genre, helst samma tema) berättar en som varit
// med i minst två år hur det gick förra gången, och när ett toppspel fyller tre eller ett jämnt femtal år påminner hen om det.
// Minnena sparas i G.recall.mem (de senaste 30) och i krönikan. Väggen med inramade släpp och tidslinjen läser spelen och historien (news.js).
// Allt väljs med hashStr (dice.js); minnena är berättelse och ändrar bara en liten bit fans vid ett jubileum.
//
// G.recall = { last (vecka), mem: [{ t, v, who, g, a }] }, v: 0 förra gången gick bra, 1 förra gången gick dåligt, 2 jubileum, 3 första gången i den genren
import { dice } from './dice.js';
import { L } from '../core/i18n.js';
import { WEEKS_PER_YEAR, yearOf } from './const.js';
import { beat, lifeName } from './life.js';
import { storyOf } from './news.js';
import { certOf, totalUnits } from './charts.js';
import { GENRE } from '../data/genres.js';

const { h32 } = dice('hist');

export const MEM_GAP = 8; // veckor mellan två minnen
export const MEM_MAX = 30;
export const VET_YEARS = 2; // så länge ska någon ha varit med för att minnas
export const MEM_GOOD = 8; // betyg som räknas som succé
export const MEM_BAD = 6; // under det gick det dåligt

export const histOf = (G) => G.recall || (G.recall = { last: -99, mem: [] });
const titleOf = (x) => (x && typeof x === 'object' ? L(x) : x || '');

// Den som minns: någon som varit med i minst två år (grundaren räknas från start), vald med hash
function veteran(G, tag) {
  const vets = G.staff.filter((s) => !s.away && G.t - (s.hired || 0) >= VET_YEARS * WEEKS_PER_YEAR).sort((a, b) => a.id - b.id);
  return vets.length ? vets[h32(G, `vet:${tag}`) % vets.length] : null;
}

function remember(G, H, s, v, g, a) {
  H.last = G.t;
  H.mem.push({ t: G.t, v, who: lifeName(s), g, a });
  if (H.mem.length > MEM_MAX) H.mem.shift();
  beat(G, 'memory', { staff: s, g, a, v });
}

// Ett nytt projekt startar (startProject i dev.js): liknar det ett tidigare spel minns en veteran hur det gick
export function memoryStart(G, job) {
  const H = histOf(G);
  if (job.expansionOf || G.t - H.last < MEM_GAP) return false;
  const old = G.games.filter((g) => !g.expansionOf && G.t - g.t >= WEEKS_PER_YEAR);
  // senaste spelet i samma genre, helst med samma tema
  const same = old.filter((g) => g.genre === job.genre).sort((a, b) => (b.topic === job.topic ? 1 : 0) - (a.topic === job.topic ? 1 : 0) || b.t - a.t);
  const prev = same[0] || null;
  const s = veteran(G, `s:${job.id || G.t}`);
  if (!s) return false;
  if (!prev) {
    if (old.length < 3 || !GENRE[job.genre]) return false;
    remember(G, H, s, 3, GENRE[job.genre].name, 0);
    return true;
  }
  if (prev.score >= MEM_GOOD) remember(G, H, s, 0, prev.title, Math.round(prev.score * 10) / 10);
  else if (prev.score < MEM_BAD) remember(G, H, s, 1, prev.title, Math.round(prev.score * 10) / 10);
  else return false;
  return true;
}

// Veckovis: jubileum för toppspel (tre år, sedan vart femte)
export function memoryWeek(G) {
  const H = histOf(G);
  if (G.t - H.last < MEM_GAP) return;
  for (const g of G.games) {
    if (g.auto || g.expansionOf || g.score < 8.5) continue;
    const age = G.t - g.t;
    const yrs = age / WEEKS_PER_YEAR;
    if (age <= 0 || age % WEEKS_PER_YEAR !== 0 || !(yrs === 3 || (yrs >= 5 && yrs % 5 === 0))) continue;
    const s = veteran(G, `a:${g.id}`);
    if (!s) continue;
    G.fans += Math.max(100, Math.round(G.fans * 0.01));
    G.stats.jubilee = (G.stats.jubilee || 0) + 1;
    remember(G, H, s, 2, g.title, yrs);
    return;
  }
}

// Texten på spelarens språk (samma nyckel som krönikan: life.memory.<v>)
export const memoryVars = (m) => ({ who: m.who, g: titleOf(m.g), a: m.a });

// Väggen: studions spel som inramade släpp, nyast först (omslagsbild ritas i fönstret ur id, titel, tema, genre och plattform)
export function wallOf(G, max = 30) {
  return G.games
    .filter((g) => !g.expansionOf)
    .slice()
    .reverse()
    .slice(0, max)
    .map((g) => {
      const cert = certOf(g);
      return {
        id: g.id,
        title: g.title,
        year: yearOf(g.t),
        score: g.score,
        genre: g.genre,
        topic: g.topic,
        platform: g.platform,
        cert: cert ? cert.id : '',
        units: Math.round(totalUnits(g)),
        top: !!(g.chart && g.chart.top > 0),
        live: !!g.live,
        frame: g.score >= 9 ? 'gold' : g.score >= 8 ? 'silver' : g.score >= 7 ? 'bronze' : 'plain',
      };
    });
}

// Allt scenen och fönstret behöver: väggen, de senaste milstolparna, veteranerna och minnena
export function histState(G) {
  const H = histOf(G);
  const story = storyOf(G);
  return {
    wall: wallOf(G),
    milestones: story.slice(-12).map((x) => ({ t: x.t, key: x.key, vars: x.vars })), // äldst först (som storyList vill ha dem)
    memories: H.mem.slice().reverse(),
    veterans: G.staff.filter((s) => G.t - (s.hired || 0) >= VET_YEARS * WEEKS_PER_YEAR).map((s) => ({ id: s.id, name: lifeName(s), years: Math.floor((G.t - (s.hired || 0)) / WEEKS_PER_YEAR) })),
  };
}
