import { emit } from '../core/bus.js';
import { fmtNum, fmtMoney } from '../core/util.js';
import { tOf } from './const.js';
import { AWARD_CATS } from './awards.js';

// Nyhetslogg (studions krönika): lagras som nyckel + variabler så språket kan bytas efteråt. Titlar och namn kan vara
// {sv,en}-objekt. silent = bara i loggen, utan toast (för ögonblick som redan visas på annat sätt, t.ex. ett släpp).
// Branschrubriker och trendspaning är kuliss: de får högst FLAVOR_MAX platser i loggen, så att de inte trycker ut riktiga nyheter
export const FLAVOR_MAX = 40;
const isFlavor = (k) => k.startsWith('hl.') || k === 'news.trend';
export function note(G, key, vars = {}, kind = 'info', silent = false) {
  G.news.unshift({ t: G.t, key, vars, kind });
  if (isFlavor(key)) {
    let n = 0;
    for (let i = 0; i < G.news.length; i++) if (isFlavor(G.news[i].key) && ++n > FLAVOR_MAX) {
      G.news.splice(i, 1);
      break;
    }
  }
  if (G.news.length > 150) G.news.pop();
  for (const m of MILESTONES[key] || []) if (!m.if || m.if(vars, storyOf(G), G)) milestone(G, m.as || key, m.vars ? m.vars(vars, G) : vars, !!m.once);
  if (!silent) emit('toast', { key, vars, kind });
}

// ── Studions historia ─────────────────────────────────────────────
// Krönikan rymmer de 150 senaste nyheterna. De stora ögonblicken sparas dessutom för gott i G.story, så att studions väg
// från garaget går att läsa i efterhand. Tabellen säger vilka nyheter som också är milstolpar: once = bara första gången,
// as = sparas under en egen nyckel (hist.*) med egen text, if = bara när villkoret stämmer (får variablerna, historien
// och G), vars = egna variabler i stället för nyhetens.
// Historien är bara uppvisning: inget i spelet läser den.
// studions 10:e, 25:e, 50:e och 100:e spel (expansioner räknas inte, de har ingen egen släppnyhet)
const GAME_MARKS = [10, 25, 50, 100];
const fullGames = (G) => (G.games || []).filter((g) => !g.expansionOf);
const NTH = { as: 'hist.games', if: (v, h, G) => GAME_MARKS.includes(fullGames(G).length), vars: (v, G) => ({ title: v.title, n: fullGames(G).length }) };
const RELEASE = [{ as: 'hist.firstGame', once: true }, NTH];
const HIT = [{ as: 'hist.firstGame', once: true }, { as: 'hist.firstHit', once: true }, NTH];
// en gala med flera priser är en milstolpe bara när skörden är studions största hittills
const HAUL = (v, h) => !h.some((x) => (x.key === 'news.awardWins' || x.key === 'hist.firstAward') && (x.vars.n || 1) >= v.n);
// ett uppköp av ärkerivalen får en egen rad
const isRival = (G, v) => !!G.rival && G.rival.name === v.studio;
const MILESTONES = {
  'news.release': RELEASE,
  'news.flop': RELEASE,
  'news.hit1': HIT,
  'news.hit2': HIT,
  'news.hit3': HIT,
  'news.office': [{}],
  'news.identity': [{ as: 'hist.identity' }],
  'news.chartTop': [{ as: 'hist.firstNo1', once: true }],
  'news.rankUp': [{ if: (v) => v.n <= 5 }],
  'news.rankTop': [{}],
  'news.awardWin': [{ as: 'hist.firstAward', once: true }],
  'news.awardWins': [{ as: 'hist.firstAward', once: true }, { if: HAUL }],
  'news.filmGood': [{}],
  'news.acquired': [{ if: (v, h, G) => !isRival(G, v) }, { as: 'hist.rivalBought', if: (v, h, G) => isRival(G, v), vars: (v, G) => ({ studio: G.studio, rival: v.studio }) }],
  'news.rival': [{ as: 'hist.firstRival', once: true }],
  'news.rivalDone': [{ as: 'hist.rivalDone', once: true }],
  'news.pubRelease': [{ as: 'hist.firstPub', once: true }],
  'news.storeOpen': [{ as: 'hist.store', once: true }],
  'news.storeUsers': [{}],
  'news.hwLab': [{ as: 'hist.hwLab', once: true }],
  'news.hwFab': [{ as: 'hist.hwFab', once: true }],
  'news.hwLaunch': [{ as: 'hist.firstHw', once: true }],
  'news.hwPlat': [{ as: 'hist.hwPlat' }],
  'live.news.launch': [{}],
  'hist.fans': [{}],
  'hist.cash': [{}],
  'live.news.expansion': [{ as: 'hist.firstExp', once: true }],
  'live.news.region': [{ as: 'hist.firstRegion', once: true }],
  'live.news.subs': [{}],
  'live.news.players': [{}],
  'live.news.f2p': [{ as: 'hist.f2p' }],
  'live.news.comeback': [{ as: 'hist.comeback' }],
  'live.news.closed': [{}],
};
const STORY_MAX = 300;

export function milestone(G, key, vars = {}, once = false) {
  const h = storyOf(G);
  if (once && h.some((x) => x.key === key)) return;
  h.push({ t: G.t, key, vars });
  if (h.length > STORY_MAX) h.splice(0, h.length - STORY_MAX);
}

// Mått som passeras: fansen och kassan. Varje steg firas med en nyhet och hamnar i historien. Nivån sparas i stats, så
// en äldre sparning börjar tyst på sin nuvarande nivå i stället för att få alla steg på en gång.
const round = (s) => s.replace(/\.0+(?=[KMB])/, ''); // jämna tal skrivs kort: 100K, $10M
const MARKS = [
  { stat: 'fanMark', key: 'hist.fans', of: (G) => G.fans, steps: [1e4, 1e5, 1e6, 1e7, 1e8], fmt: (n) => round(fmtNum(n)) },
  { stat: 'cashMark', key: 'hist.cash', of: (G) => G.money, steps: [1e6, 1e7, 1e8, 1e9, 1e10], fmt: (n) => round(fmtMoney(n)) },
];
// alla nycklar som kan hamna i historien (testerna kontrollerar att var och en har en text)
export const STORY_KEYS = [...new Set(['hist.founded', 'hist.cert', ...MARKS.map((m) => m.key), ...Object.entries(MILESTONES).flatMap(([k, list]) => list.map((m) => m.as || k))])];

export function storyWeek(G) {
  for (const m of MARKS) {
    const v = m.of(G);
    let lvl = 0;
    while (lvl < m.steps.length && v >= m.steps[lvl]) lvl++;
    if (G.stats[m.stat] == null) G.stats[m.stat] = lvl;
    else if (lvl > G.stats[m.stat]) {
      G.stats[m.stat] = lvl;
      note(G, m.key, { n: m.fmt(m.steps[lvl - 1]) }, 'award');
    }
  }
}

// Historien, äldst först. En sparning från före historien får den byggd ur det som går att läsa ut i efterhand: första
// spelet, första succén, vart 10:e, 25:e, 50:e och 100:e spel, första listettan, de finaste skivorna, priserna, onlinespelen,
// första expansionen, uppköpen och första året som störst.
export function storyOf(G) {
  if (G.story) return G.story;
  const h = [];
  const add = (t, key, vars) => h.push({ t, key, vars });
  const games = G.games || [];
  const sv = (g) => ({ title: g.title, studio: G.studio, v: g.score.toFixed(1) });
  if (games[0]) add(games[0].t, 'hist.firstGame', sv(games[0]));
  const hit = games.find((g) => g.score >= 8);
  if (hit) add(hit.t, 'hist.firstHit', sv(hit));
  const full = fullGames(G);
  for (const n of GAME_MARKS) if (full[n - 1]) add(full[n - 1].t, 'hist.games', { title: full[n - 1].title, n });
  const no1 = games.find((g) => g.chart && g.chart.top > 0);
  if (no1) add(no1.t, 'hist.firstNo1', { title: no1.title });
  let best = -1;
  for (const g of games.filter((x) => x.certT != null && x.cert >= 0).sort((a, b) => a.certT - b.certT)) {
    if (g.cert <= best) continue;
    best = g.cert;
    add(g.certT, 'hist.cert', { title: g.title, i: g.cert });
  }
  // priserna: första galan med vinst och sedan varje gala som slog studions största skörd (galan hålls i december)
  const galas = new Map();
  for (const a of G.awards || []) galas.set(a.year, [...(galas.get(a.year) || []), a]);
  let haul = 0;
  for (const [year, won] of [...galas].sort((a, b) => a[0] - b[0])) {
    if (won.length <= haul) continue;
    const cat = AWARD_CATS.find((c) => c.id === won[0].cat);
    add(tOf(year, 11, 3), haul ? 'news.awardWins' : 'hist.firstAward', { title: won[0].title, cat: cat ? cat.name : '', year, n: won.length });
    haul = won.length;
  }
  for (const g of games) if (g.live) add(g.live.t0, 'live.news.launch', { title: g.title });
  const exp = games.find((g) => g.expansionOf);
  const base = exp && games.find((g) => g.id === exp.expansionOf);
  if (exp) add(exp.t, 'hist.firstExp', { title: exp.title, base: base ? base.title : '' });
  for (const c of G.comps || []) if (c.owned && c.ownedT != null) add(c.ownedT, 'news.acquired', { studio: c.name });
  if (G.stats && G.stats.topStudio) add((G.stats.topStudio + 1 - 1980) * 48, 'news.rankTop', { studio: G.studio, y: G.stats.topStudio });
  h.sort((a, b) => a.t - b.t);
  G.story = h;
  return h;
}
