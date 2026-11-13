// Efter släppet: spelets väg på topplistan, skivor för sålda exemplar och studions rekord.
// Allt här är uppvisning (nyheter, statistik och prestationer). Inget ändrar pengar, fans eller försäljning, så
// balansen är densamma med och utan det.
import { emit } from '../core/bus.js';
import { fmtNum, fmtFull, fmtMoney } from '../core/util.js';
import { note, milestone } from './news.js';
import { topSellers } from './market.js';
import { curveFor, unitRev } from './sales.js';
import { liveMonth } from './live.js';
import { yearOf, WEEKS_PER_YEAR, WEEKS_PER_MONTH } from './const.js';
import { CERTS, certIndex, totalUnits } from '../data/certs.js';

export { CERTS, certIndex, totalUnits };

export const CHART_SIZE = 10;
const CHART_WEEKS = 12;
const CHART_ROUTINE = 3;

export const certOf = (g) => CERTS[g.cert ?? certIndex(totalUnits(g))] || null;
// nästa skiva och hur långt det är kvar (null när diamanten är nådd)
export function nextCert(g) {
  const c = CERTS[certIndex(totalUnits(g)) + 1];
  return c ? { cert: c, left: Math.max(0, c.units - totalUnits(g)), pct: Math.min(1, totalUnits(g) / c.units) } : null;
}
// antal spel per skiva (bara den högsta skivan för varje spel räknas)
export function certCounts(G) {
  const n = CERTS.map(() => 0);
  for (const g of G.games) {
    const i = g.cert ?? certIndex(totalUnits(g));
    if (i >= 0) n[i]++;
  }
  return n;
}
export const discs = (G, min = 0) => certCounts(G).reduce((a, n, i) => a + (i >= min ? n : 0), 0);

// Studions rekord, räknade ur spellistan (så att gamla sparningar får dem direkt)
export function records(G) {
  const by = (f) => G.games.reduce((b, g) => (f(g) > (b ? f(b) : 0) ? g : b), null);
  return {
    score: by((g) => g.score),
    units: by((g) => totalUnits(g)),
    week: by((g) => (g.weekly && g.weekly[0]) || 0),
    top: by((g) => (g.chart && g.chart.top) || 0),
  };
}

// Veckovis, efter försäljningen: listplaceringar, skivor och säljrekord
export function chartWeek(G) {
  const S = G.stats;
  // en sparning från före skivorna: ge spelen sina skivor i tysthet i stället för en skur av nyheter
  if (!G.flags.charts) {
    G.flags.charts = 1;
    for (const g of G.games) g.cert = certIndex(totalUnits(g));
    S.bestCert = G.games.reduce((a, g) => Math.max(a, g.cert), -1);
    const r = records(G);
    S.recUnits = r.units ? r.units.id : 0;
    S.recWeek = r.week ? r.week.weekly[0] : 0;
  }
  const selling = G.games.filter((g) => !g.ended && g.weekly.length);
  if (selling.length) {
    const rows = topSellers(G, CHART_WEEKS, CHART_SIZE);
    // en studio som redan haft CHART_ROUTINE listettor får bara notis om nya ettor; att gå in på listan står i krönikan
    const routine = (S.no1 || 0) >= CHART_ROUTINE;
    for (const g of selling) {
      const rank = rows.findIndex((r) => r.yours && r.id === g.id) + 1;
      if (!rank) continue;
      const c = g.chart || (g.chart = { best: 0, weeks: 0, top: 0 });
      c.weeks++;
      if (rank === 1) c.top++;
      if (c.best && rank >= c.best) continue;
      const first = !c.best;
      const before = c.best;
      c.best = rank;
      if (rank === 1) {
        S.no1 = (S.no1 || 0) + 1;
        note(G, 'news.chartTop', { title: g.title }, 'good');
        emit('chartTop', g);
      } else if (first) note(G, 'news.chartIn', { title: g.title, n: rank }, 'info', routine);
      else if (rank <= 3 && before > 3) note(G, 'news.chartClimb', { title: g.title, n: rank }, 'info', routine);
    }
    // bästa första veckan (från det tredje spelet, de första slår alltid varandra)
    for (const g of selling) {
      if (g.weekly.length !== 1) continue;
      if (G.games.length >= 3 && g.weekly[0] > (S.recWeek || 0) && S.recWeek > 0) {
        g.recWeek = 1;
        note(G, 'news.recWeek', { title: g.title, v: fmtMoney(g.weekly[0]) }, 'good', true);
      }
      S.recWeek = Math.max(S.recWeek || 0, g.weekly[0]);
    }
  }
  let champ = G.games.find((g) => g.id === S.recUnits) || null;
  for (const g of G.games) {
    const u = totalUnits(g);
    const i = certIndex(u);
    if (i > (g.cert ?? -1)) {
      g.cert = i;
      g.certT = G.t;
      // en skiva firas när den är minst lika fin som studions finaste hittills; lägre skivor noteras bara i krönikan
      const big = i >= (S.bestCert ?? -1);
      if (i > (S.bestCert ?? -1)) milestone(G, 'hist.cert', { title: g.title, i });
      S.bestCert = Math.max(S.bestCert ?? -1, i);
      note(G, 'news.cert', { title: g.title, cert: CERTS[i].name, n: fmtFull(CERTS[i].units) }, 'award', true);
      emit('cert', { game: g, cert: CERTS[i], i, big });
    }
    // studions mest sålda spel byter ägare
    if (g !== champ && u > (champ ? totalUnits(champ) : 0)) {
      if (champ && u >= 1000) note(G, 'news.recUnits', { title: g.title, prev: champ.title, n: fmtNum(Math.round(totalUnits(champ))) }, 'good');
      champ = g;
      S.recUnits = g.id;
    }
  }
  if (G.t % WEEKS_PER_MONTH === 0) rankMonth(G);
}

// ── Branschrankningen ─────────────────────────────────────────────
// Studiornas spelförsäljning de senaste 48 veckorna, din studio bland konkurrenterna. Dina dotterbolag räknas till dig.
// Konkurrenterna är förlag: storspelen som syns på topplistan är bara en del av det de säljer, så i rankningen räknas hela
// katalogen (catalogOf) plus äldre titlar (backlistOf), och ett starkare förlag har en bredare katalog. Då börjar du längst ner bland jättarna och får
// arbeta dig uppåt. Rankningen är bara uppvisning: priser, uppköp och din egen försäljning räknas som förut.
export const catalogOf = (c) => 1.5 + 2.5 * (c.strength || 1);
// Förlagen fanns före 1980 och säljer äldre titlar hela tiden: en liten grundförsäljning per år som följer prisnivån.
// Den märks mest de första åren (ingen står på noll, och en garagestudio börjar längst ner) och drunknar sedan i släppen.
const BACKLIST = 150;
export const backlistOf = (G, c, weeks = WEEKS_PER_YEAR) => (unitRev(yearOf(G.t)) * BACKLIST * (0.6 + 0.5 * (c.strength || 1)) * weeks) / WEEKS_PER_YEAR;
// Dina onlinespels intäkter under perioden (abonnemang och butik). Historiken sparar summan per månad; äldre sparningar
// saknar den och får i stället dagens månadsintäkt gånger tolv.
function liveSpan(G, g, weeks) {
  const L = g.live;
  if (!L) return 0;
  const from = G.t - weeks;
  const h = (L.hist || []).filter((x) => x.r != null);
  if (!h.length) return L.closed ? 0 : (liveMonth(G, g).rev * weeks) / WEEKS_PER_MONTH;
  let base = 0; // summan vid periodens början
  for (const x of h) if (x.t <= from) base = x.r;
  if (h[0].t > from && L.t0 <= from) base = h[0].r; // historiken börjar mitt i perioden: räkna från dess första punkt
  return Math.max(0, L.rev - base);
}
export function studioRanking(G, weeks = WEEKS_PER_YEAR) {
  const from = G.t - weeks; // veckor efter 'from' räknas
  const by = new Map();
  for (const r of (G.market && G.market.releases) || []) {
    const age = G.t - r.t;
    if (age < 0) continue;
    const c = curveFor(r.score, r.tail || 1);
    let k = 0;
    for (let w = Math.max(0, age - weeks + 1); w <= age && w < c.length; w++) k += c[w];
    if (k > 0) by.set(r.comp, (by.get(r.comp) || 0) + r.total * k);
  }
  const span = (x) => x.weekly.reduce((a, v, i) => a + (x.t + 1 + i > from ? v : 0), 0);
  let you = 0;
  for (const g of G.games) {
    you += span(g) + liveSpan(G, g, weeks);
    for (const p of g.ports || []) you += span(p);
  }
  const rows = [];
  for (const c of G.comps || []) {
    const rev = (by.get(c.id) || 0) * catalogOf(c) + backlistOf(G, c, weeks);
    if (c.owned) you += rev;
    else rows.push({ id: c.id, name: c.name, color: c.color, rev, comp: c });
  }
  rows.push({ id: 0, name: G.studio, color: '#4de1d0', rev: you, you: true });
  rows.sort((a, b) => b.rev - a.rev || (a.you ? 1 : b.you ? -1 : a.id - b.id));
  const total = rows.reduce((a, r) => a + r.rev, 0);
  rows.forEach((r, i) => {
    r.pos = i + 1;
    r.share = total > 0 ? r.rev / total : 0;
  });
  return rows;
}
export const studioRank = (G) => studioRanking(G).find((r) => r.you);
// Varje månad: når du en bättre plats än någonsin förr blir det en nyhet med studion du gick om. Platser du redan haft
// firas inte igen (de byter ofta ägare när släpp kommer och går), så det blir som mest en nyhet per plats på stegen.
// En sparning från före stegen börjar på den bästa plats den haft, utan nyheter.
export function rankMonth(G) {
  const S = G.stats;
  const rows = studioRanking(G);
  const i = rows.findIndex((r) => r.you);
  const me = rows[i];
  if (S.bestRank == null) {
    S.bestRank = G.games.length ? Math.min(me.pos, ...(G.ranks || []).map((r) => r.pos)) : rows.length;
    return;
  }
  if (me.pos >= S.bestRank || !(me.rev > 0)) return;
  S.bestRank = me.pos;
  const passed = rows[i + 1];
  if (passed) note(G, 'news.rankUp', { studio: G.studio, n: me.pos, rival: passed.name }, 'good');
}
// Årets slut: din plats sparas (för årsrapporten och pilarna i rankningen), och första gången du är störst blir det en nyhet
export function rankYear(G) {
  const rows = studioRanking(G);
  const me = rows.find((r) => r.you);
  const near = rows[me.pos === 1 ? 1 : me.pos - 2];
  const hist = G.ranks || (G.ranks = []);
  const prev = hist[hist.length - 1];
  hist.push({ y: yearOf(G.t) - 1, pos: me.pos, share: Math.round(me.share * 1000) / 1000, rev: Math.round(me.rev), near: near ? near.name : '', gap: near ? Math.round(Math.abs(near.rev - me.rev)) : 0 });
  if (hist.length > 60) hist.shift();
  if (me.pos === 1 && me.rev > 0 && !G.stats.topStudio) {
    G.stats.topStudio = yearOf(G.t) - 1;
    note(G, 'news.rankTop', { studio: G.studio, y: yearOf(G.t) - 1 }, 'award', true);
    emit('rankTop', me);
  }
  return { now: me, prev: prev || null };
}
