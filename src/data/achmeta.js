// Prestationernas hyllor och framsteg. Varje prestation ligger i exakt en hylla (kategori), och de som går att räkna upp har ett framsteg
// (nuvarande värde, mål och hur talet skrivs: n = antal, money = dollar, score = betyg med en decimal, yr = år). Läser bara spelet.
import { certIndex, totalUnits } from './certs.js';
import { fullGames, distinct, mostInYear, streak, longestSeries, unitsTotal, decadeOf } from './achievements.js';
import { START_YEAR, WEEKS_PER_YEAR } from '../sim/const.js';

export const ACH_CATS = [
  { id: 'games', ic: 'gamepad', ids: ['first_game', 'five_games', 'twenty_games', 'trilogy', 'series5', 'novel', 'blend8', 'platforms5', 'genres6', 'topics12', 'quick3', 'pioneer', 'ports3', 'timeless', 'aaa', 'comeback', 'engine'] },
  { id: 'quality', ic: 'star', ids: ['score8', 'score9', 'score10', 'streak5', 'streak3_8', 'hits10', 'hit_aaa', 'chart1', 'disc_gold', 'disc_platinum', 'disc_diamond', 'disc_wall', 'units10m', 'boxoffice'] },
  { id: 'money', ic: 'money', ids: ['rich1', 'rich2', 'rich3', 'rev100m', 'rev1b'] },
  { id: 'studio', ic: 'building', ids: ['office1', 'office3', 'office5', 'team10', 'team30', 'team100', 'team300', 'teams5', 'fans1k', 'fans1m', 'research20', 'research_all', 'contracts5', 'known', 'hitfactory'] },
  { id: 'online', ic: 'globe', ids: ['live1', 'subs1m', 'exp3', 'live_world', 'events10', 'three_live', 'f2p1m', 'outlast', 'live_comeback', 'seasons5', 'esport1', 'esport_million'] },
  { id: 'industry', ic: 'crown', ids: ['top_studio', 'top_decade', 'empire', 'conglomerate', 'launcher', 'label5', 'hw_platform', 'hw_factory', 'hw_vr'] },
  { id: 'awards', ic: 'trophy', ids: ['award1', 'award5', 'award10', 'goty', 'slam', 'regular'] },
  { id: 'eras', ic: 'clock', ids: ['survive', 'decade', 'legend', 'era_all', 'top3_80', 'top3_90', 'top3_00', 'top3_10'] },
];
// Epokpriserna hör till ett årtionde: efter årtiondets slut går de inte längre att klara
export const ACH_DECADE = { top3_80: 1980, top3_90: 1990, top3_00: 2000, top3_10: 2010 };
export const ACH_CAT = Object.fromEntries(ACH_CATS.flatMap((c) => c.ids.map((id) => [id, c.id])));

const liveMax = (G, f) => Math.max(0, ...G.games.filter((g) => g.live).map(f));
const years = (G) => G.t / WEEKS_PER_YEAR;
const eraCount = (G) => [1980, 1990, 2000, 2010].filter((d) => fullGames(G).some((g) => decadeOf(START_YEAR + Math.floor(g.t / WEEKS_PER_YEAR)) === d)).length;
// [nuvarande, mål, format]
const P = {
  five_games: (G) => [fullGames(G).length, 5, 'n'],
  twenty_games: (G) => [fullGames(G).length, 20, 'n'],
  score8: (G) => [G.stats.bestScore, 8, 'score'],
  score9: (G) => [G.stats.bestScore, 9, 'score'],
  score10: (G) => [G.stats.bestScore, 9.6, 'score'],
  rich1: (G) => [G.money, 1e5, 'money'],
  rich2: (G) => [G.money, 1e6, 'money'],
  rich3: (G) => [G.money, 2.5e8, 'money'],
  rev100m: (G) => [G.stats.revenue, 1e8, 'money'],
  rev1b: (G) => [G.stats.revenue, 1e9, 'money'],
  office1: (G) => [G.office.tier, 1, 'n'],
  office3: (G) => [G.office.tier, 3, 'n'],
  office5: (G) => [G.office.tier, 5, 'n'],
  team10: (G) => [G.staff.length, 10, 'n'],
  team30: (G) => [G.staff.length, 30, 'n'],
  team100: (G) => [G.staff.length, 100, 'n'],
  team300: (G) => [G.staff.length, 300, 'n'],
  teams5: (G) => [(G.teams || []).length, 5, 'n'],
  fans1k: (G) => [G.fans, 1000, 'n'],
  fans1m: (G) => [G.fans, 1e6, 'n'],
  research20: (G) => [G.research.done.length, 20, 'n'],
  research_all: (G) => [G.research.done.length, 50, 'n'],
  contracts5: (G) => [G.stats.contracts, 5, 'n'],
  award1: (G) => [G.awards.length, 1, 'n'],
  award5: (G) => [G.awards.length, 5, 'n'],
  award10: (G) => [G.awards.length, 10, 'n'],
  survive: (G) => [years(G), 10, 'yr'],
  decade: (G) => [years(G), 10, 'yr'],
  legend: (G) => [years(G), 40, 'yr'],
  subs1m: (G) => [liveMax(G, (g) => g.live.peak), 1e6, 'n'],
  f2p1m: (G) => [liveMax(G, (g) => (g.live.model === 'f2p' ? g.live.peak : 0)), 1e6, 'n'],
  exp3: (G) => [liveMax(G, (g) => g.live.exps.length), 3, 'n'],
  events10: (G) => [G.games.reduce((a, g) => a + ((g.live && g.live.events) || 0), 0), 10, 'n'],
  three_live: (G) => [G.games.filter((g) => g.live && !g.live.closed).length, 3, 'n'],
  seasons5: (G) => [G.stats.liveSeasons || 0, 5, 'n'],
  esport_million: (G) => [G.stats.esportViewers || 0, 1e6, 'n'],
  disc_wall: (G) => [G.games.filter((g) => certIndex(totalUnits(g)) >= 1).length, 10, 'n'],
  top_decade: (G) => [(G.ranks || []).filter((r) => r.pos === 1).length, 10, 'n'],
  empire: (G) => [G.stats.acquired || 0, 3, 'n'],
  label5: (G) => [G.stats.published || 0, 5, 'n'],
  launcher: (G) => [G.stats.storeUsers || 0, 1e7, 'n'],
  hits10: (G) => [G.stats.hits, 10, 'n'],
  units10m: (G) => [unitsTotal(G), 1e7, 'n'],
  platforms5: (G) => [distinct(G, (g) => g.platform), 5, 'n'],
  genres6: (G) => [distinct(G, (g) => g.genre), 6, 'n'],
  topics12: (G) => [distinct(G, (g) => g.topic), 12, 'n'],
  quick3: (G) => [mostInYear(G), 3, 'n'],
  streak5: (G) => [streak(G, 7), 5, 'n'],
  streak3_8: (G) => [streak(G, 8), 3, 'n'],
  series5: (G) => [longestSeries(G), 5, 'n'],
  ports3: (G) => [Math.max(0, ...G.games.map((g) => (g.ports || []).filter((p) => p.kind !== 'remaster').length)), 3, 'n'],
  era_all: (G) => [eraCount(G), 4, 'n'],
};
// Framsteget för en prestation: { cur, max, pct (0-100), fmt } eller null om den inte går att räkna upp
export function achProgress(G, id) {
  const f = P[id];
  if (!f) return null;
  const [cur, max, fmt] = f(G);
  const c = Math.max(0, Number.isFinite(cur) ? cur : 0);
  return { cur: c, max, pct: Math.min(100, (c / max) * 100), fmt };
}
export const ACH_WITH_PROGRESS = Object.keys(P);
