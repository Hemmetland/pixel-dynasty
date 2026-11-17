// Branschtidningen Pixelposten: ett nummer varje månad som sätts ihop ur det som hänt. Omslaget handlar om det största i branschen just
// nu (ditt senaste släpp, en konkurrents succé, din plats på listan, en ny trend eller något i studion), sedan kommer månadens tester
// (ditt släpp och konkurrenternas), topplistan över förlagen, skvaller ur Studiolivet och ryktet om en konkurrents nästa spel.
// Numren sparas som siffror och nycklar (G.mag.issues, de senaste MAG_KEEP) och får sin text först när de visas, så att de går att läsa
// på båda språken. Ett omslag med ditt eget toppspel lyfter försäljningen en kort stund (community.js). Allt väljs med hashStr (dice.js).
//
// issue = { n, t, cover: { k, v, title, studio, score, n, genre, who, who2 }, reviews: [{ you, title, studio, score, outlets?, q }],
//           chart: [{ n, y, p, s }], rank, gossip: [{ k, v, who, who2, g }], rumor: { rival, genre, topic } | null, trend: { genre, topic } }
import { dice } from './dice.js';
import { t, L } from '../core/i18n.js';
import { WEEKS_PER_MONTH, WEEKS_PER_YEAR, yearOf, dateOf } from './const.js';
import { beat, chronLog, svGen } from './life.js';
import { studioRanking } from './charts.js';
import { upcomingReleases } from './market.js';
import { setViral } from './community.js';
import { HEADLINES as REVIEW_HEADS, REVIEWER, GENRE_FORMS } from '../data/reviews.js';
import { lang } from '../core/i18n.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';

const { h32 } = dice('mag');

export const MAG_KEEP = 24; // så många nummer sparas
export const MAG_ROWS = 4; // så många spel testas i ett nummer
// Omslagets sorter i prioritetsordning (v i beat 'issue' är sortens plats i listan COVER_KINDS) och hur många rubrikvarianter de har
export const COVER_KINDS = ['youTop', 'youGood', 'youOk', 'youFlop', 'rivalHit', 'rankUp', 'rankDown', 'trend', 'folk', 'quiet', 'leader', 'rumor'];
const COVER_VARIANTS = { youTop: 2, youGood: 2, youOk: 2, youFlop: 2, rivalHit: 2, rankUp: 2, rankDown: 2, trend: 2, folk: 3, quiet: 6, leader: 2, rumor: 2 };
const BEAT_COVERS = ['youTop', 'youFlop', 'rivalHit', 'trend', 'folk', 'leader'];
const PRIORITY = ['youTop', 'rivalHit', 'youFlop', 'leader', 'youGood', 'rankUp', 'trend', 'folk', 'youOk', 'rumor', 'rankDown', 'quiet'];
// Händelser ur krönikan som tidningen skvallrar om (mag.g.<sort>.<0|1>)
export const GOSSIP_KINDS = ['couple', 'wedding', 'breakup', 'headhunt', 'dreamGo', 'dreamDone', 'hired', 'left', 'friends'];

export const magOf = (G) => G.mag || (G.mag = { issues: [], n: 0 });
const tx = (x) => (x && typeof x === 'object' ? L(x) : x == null ? '' : String(x));

// recensentens rad ur samma lista som spelens recensioner: [nivå, rad]
function quoteOf(G, score, salt) {
  const i = REVIEW_HEADS.findIndex((h) => score >= h.min);
  const band = i < 0 ? REVIEW_HEADS.length - 1 : i;
  return [band, h32(G, `rq:${salt}`) % REVIEW_HEADS[band].sv.length];
}

// Sätter ihop ett nummer ur läget just nu (inget skrivs i spelet förutom g.magT på recenserade spel och en kort lyft för ett toppspel)
function buildIssue(G, M, prev) {
  const since = prev ? prev.t : G.t - 2 * WEEKS_PER_MONTH;
  const year = yearOf(G.t);
  // dina nya spel: recenseras en gång, i numret efter släppet
  const mine = G.games.filter((g) => g.magT == null && G.t - g.t >= 1 && G.t - g.t <= 12).sort((a, b) => b.score - a.score);
  const own = mine.slice(0, 2);
  for (const g of mine) g.magT = G.t;
  // konkurrenternas släpp sedan förra numret
  const rels = ((G.market && G.market.releases) || []).filter((r) => !r.yours && r.t > since && r.t <= G.t).sort((a, b) => b.score - a.score);
  const reviews = own.map((g) => ({ you: 1, id: g.id, title: g.title, studio: G.studio, score: g.score, outlets: (g.reviews || []).map((r) => ({ id: r.id, s: r.score })), q: quoteOf(G, g.score, `g${g.id}`) }));
  for (const r of rels.slice(0, Math.min(2, MAG_ROWS - reviews.length))) reviews.push({ you: 0, id: r.id, title: r.title, studio: r.studio, score: r.score, q: quoteOf(G, r.score, `r${r.id}`) });
  // topplistan över förlagen: de fem största och din plats
  const rows = studioRanking(G);
  const me = rows.find((r) => r.you);
  const chart = rows.slice(0, 5).map((r) => ({ n: r.name, y: r.you ? 1 : 0, p: r.pos, s: Math.round(r.share * 1000) / 10 }));
  if (me && me.pos > 5) chart.push({ n: me.name, y: 1, p: me.pos, s: Math.round(me.share * 1000) / 10 });
  // skvaller: de senaste händelserna ur Studiolivet, helst olika sorter
  const gossip = [];
  const seen = new Set();
  // (det som hänt de senaste fyra månaderna och inte redan skvallrats om)
  let gn = M.gn || 0;
  for (const it of chronLog(G, null, 140)) {
    if (it.t <= G.t - 4 * WEEKS_PER_MONTH || it.n <= (M.gn || 0) || !GOSSIP_KINDS.includes(it.k) || seen.has(it.k)) continue;
    seen.add(it.k);
    gossip.push({ k: it.k, v: h32(G, `gv:${it.n}`) % 2, who: it.who || '', who2: it.who2 || '', g: it.g || '' });
    gn = Math.max(gn, it.n);
    if (gossip.length >= 3) break;
  }
  M.gn = gn;
  const up = upcomingReleases(G, 16)[0];
  const rumor = up && up.next && GENRE[up.next.genre] && TOPIC[up.next.topic] ? { rival: up.name, genre: up.next.genre, topic: up.next.topic } : null;
  const hot = G.market && G.market.trend && G.market.trend.genre && G.market.trend.genre[0];
  const hotTopic = G.market && G.market.trend && G.market.trend.topic && G.market.trend.topic[0];
  const trend = hot && GENRE[hot.id] ? { genre: hot.id, topic: hotTopic && TOPIC[hotTopic.id] ? hotTopic.id : '' } : null;

  // omslaget: första sorten i prioritetsordningen som har något att berätta, helst inte samma som förra numret
  const ownTop = own[0] || null;
  const rivalTop = rels[0] || null;
  const folk = gossip.find((x) => ['couple', 'wedding', 'headhunt', 'dreamDone'].includes(x.k)) || null;
  const rank = me ? me.pos : rows.length;
  const can = {
    youTop: ownTop && ownTop.score >= 8.5,
    youGood: ownTop && ownTop.score >= 7 && ownTop.score < 8.5,
    youOk: ownTop && ownTop.score >= 5.5 && ownTop.score < 7,
    youFlop: ownTop && ownTop.score < 5.5,
    rivalHit: rivalTop && rivalTop.score >= 8.5,
    rankUp: prev && prev.rank != null && rank < prev.rank,
    leader: prev && prev.chart && prev.chart[0] && rows[0] && rows[0].name !== prev.chart[0].n,
    rumor: !!rumor,
    rankDown: prev && prev.rank != null && rank > prev.rank && me && me.rev > 0,
    trend: prev && prev.trend && trend && prev.trend.genre !== trend.genre,
    folk: !!folk,
    quiet: true,
  };
  const ok = PRIORITY.filter((k) => can[k]);
  const k = ok.find((x) => !(prev && prev.cover && prev.cover.k === x)) || ok[0];
  const cover = { k, v: h32(G, `cv:${G.t}`) % COVER_VARIANTS[k] };
  if (k === 'youTop' || k === 'youGood' || k === 'youOk' || k === 'youFlop') Object.assign(cover, { title: ownTop.title, studio: G.studio, score: ownTop.score });
  else if (k === 'rivalHit') Object.assign(cover, { title: rivalTop.title, studio: rivalTop.studio, score: rivalTop.score });
  else if (k === 'rankUp' || k === 'rankDown') cover.n = rank;
  else if (k === 'leader') cover.studio = rows[0].name;
  else if (k === 'rumor') Object.assign(cover, { studio: rumor.rival, genre: rumor.genre });
  else if (k === 'trend') cover.genre = trend.genre;
  else if (k === 'folk') {
    cover.v = folk.k === 'headhunt' ? 1 : folk.k === 'dreamDone' ? 2 : 0;
    Object.assign(cover, { who: folk.who, who2: folk.who2 });
  }
  return { issue: { n: M.n + 1, t: G.t, cover, reviews, chart, rank, gossip, rumor, trend }, ownTop, year };
}

// Varje månad (veckan efter att månadens listor räknats): ett nytt nummer
export function magMonth(G) {
  if (G.t < WEEKS_PER_YEAR) return null;
  const M = magOf(G);
  // en sparning från före tidningen: gamla spel recenseras inte i efterhand
  if (!M.n && !M.issues.length) for (const g of G.games) if (g.magT == null && G.t - g.t > 12) g.magT = -1;
  const prev = M.issues[M.issues.length - 1] || null;
  const { issue, ownTop } = buildIssue(G, M, prev);
  M.n = issue.n;
  M.issues.push(issue);
  if (M.issues.length > MAG_KEEP) M.issues.shift();
  const c = issue.cover;
  if (c.k === 'youTop' && ownTop) {
    setViral(G, ownTop, 'cover');
    G.stats.covers = (G.stats.covers || 0) + 1;
  }
  const subject = c.k.startsWith('you') || c.k === 'rivalHit' ? tx(c.title) : c.k === 'trend' ? L(GENRE[c.genre].name) : c.k === 'folk' ? c.who || c.who2 : c.k === 'leader' ? c.studio : '';
  // bara de nummer som har något att berätta hamnar i krönikan (en lugn månad eller ett godkänt betyg gör inte det)
  if (BEAT_COVERS.includes(c.k)) beat(G, 'issue', { g: subject, v: COVER_KINDS.indexOf(c.k) });
  return issue;
}

// ── Texter (på spelarens språk när de visas) ──
export function coverText(c) {
  return t(`mag.cover.${c.k}.${c.v}`, { title: tx(c.title), studio: c.studio || '', score: c.score != null ? c.score.toFixed(1) : '', n: c.n || '', genre: c.genre && GENRE[c.genre] ? L(GENRE[c.genre].name) : '', aGenre: c.genre && GENRE[c.genre] ? aGenre(c.genre) : '', who: c.who || t('life.someone'), who2: c.who2 || t('life.someone') });
}
export const gossipText = (x) => t(`mag.g.${x.k}.${x.v}`, { who: x.who || t('life.someone'), who2: x.who2 || t('life.someone'), whoG: svGen(x.who || t('life.someone')), who2G: svGen(x.who2 || t('life.someone')), g: x.g || '' });
// "ett rollspel" / "an RPG" (böjd form med obestämd artikel, som i recensionerna)
const aGenre = (id) => ((GENRE_FORMS[id] || {})[lang] || { a: L(GENRE[id].name) }).a;
export function rumorText(r) {
  return t('mag.rumor', { rival: r.rival, aGenre: aGenre(r.genre), topic: L(TOPIC[r.topic].name).toLowerCase() });
}
export function quoteText(q, lang) {
  const h = REVIEW_HEADS[q[0]];
  return h ? (h[lang] || h.sv)[q[1]] || '' : '';
}
export const outletName = (id) => (REVIEWER[id] ? L(REVIEWER[id].name) : id);
export const issueDate = (i) => dateOf(i.t);

// Det scenen och fönstret behöver: senaste numret (eller null) och hur många som finns
export function magState(G) {
  const M = G.mag;
  const issue = M && M.issues.length ? M.issues[M.issues.length - 1] : null;
  if (!issue) return { issue: null, count: 0, month: 0, year: 0, cover: null, reviews: [], gossip: [], chart: [] };
  const d = dateOf(issue.t);
  return { issue, count: M.issues.length, month: d.month, year: d.year, cover: issue.cover, reviews: issue.reviews, gossip: issue.gossip, chart: issue.chart };
}
