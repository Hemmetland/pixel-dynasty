// Spelvärlden reagerar: en riktig succé får hela branschen att vilja ha mer av samma sak, och ett riktigt magplask får genren att
// kallna. Efter ditt toppspel (betyg 8,5 eller mer) blir genren hetast i trenden en tid (och ämnet, från betyg 9), och en eller två
// konkurrenter byter sitt nästa spel mot en kopia med samma genre och tema (släppet bär märket rel.clone). Efter ett spel under 4,5
// kallnar genren. En konkurrents succé (9 eller mer) hettar till genren på samma sätt. En genre reagerar högst vart 24:e vecka.
// Allt väljs med hashStr (dice.js), inget G.rng. Trenden är den vanliga G.market.trend, så säljeffekten är den som redan finns
// (trendMult i försäljningen): ett varmt tema ger dina nästa spel i samma genre mer, och kopiorna trängs med ditt nästa släpp (crowding).
import { emit } from '../core/bus.js';
import { L } from '../core/i18n.js';
import { dice } from './dice.js';
import { beat } from './life.js';
import { note } from './news.js';
import { TREND_MULT, TREND_STEP, COMP_GENRES, trendWeeksLeft, releaseWeek } from './market.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';

const { h32 } = dice('react');

export const HIT_SCORE = 8.5; // ditt spel är en succé som branschen märker
export const FLOP_SCORE = 4.5;
export const RIVAL_HIT = 9;
export const REACT_GAP = 24; // veckor mellan två reaktioner för samma genre

// G.react = { last: { genre: vecka }, clones: [{ t, mine, studio, title }], swings: [{ t, k, kind, id, src }] }
export const reactOf = (G) => G.react || (G.react = { last: {}, clones: [], swings: [] });
const keep = (a, n) => a.length > n && a.splice(0, a.length - n);

// Sätter id som hetast (hot) eller kallast i trenden för genre eller ämne. Ger true om något ändrades.
export function heatTrend(G, kind, id, hot, src) {
  const tr = G.market && G.market.trend;
  if (!tr || !tr[kind] || !tr[kind].length) return false;
  const M = TREND_MULT[kind];
  const cur = tr[kind];
  const until = G.t + TREND_STEP + (h32(G, `tu:${kind}:${id}:${G.t}`) % TREND_STEP);
  const without = cur.filter((x) => x.id !== id);
  let list;
  if (hot) {
    if (cur[0].id === id) {
      cur[0].until = Math.max(cur[0].until || 0, until);
      return false;
    }
    list = [{ id, mult: M[0], until, src }, ...without].slice(0, M.length);
  } else {
    if (cur[M.length - 1].id === id) return false;
    list = [...without.slice(0, M.length - 1), { id, mult: M[M.length - 1], until, src }];
  }
  tr[kind] = list.map((x, i) => ({ ...x, mult: kind === 'topic' && i === M.length - 1 && x.mult === 1 ? 1 : M[i] }));
  emit('trends', tr);
  return true;
}

const genreName = (id) => (GENRE[id] ? L(GENRE[id].name) : '');

// Ditt spel har kommit ut: en succé hettar till genren och väcker kopiorna, ett magplask kyler den
export function reactToLaunch(G, g) {
  if (g.auto || g.expansionOf || !GENRE[g.genre]) return;
  const hit = g.score >= HIT_SCORE;
  const flop = g.score < FLOP_SCORE;
  if (!hit && !flop) return;
  const R = reactOf(G);
  if (G.t - (R.last[g.genre] ?? -999) < REACT_GAP) return;
  R.last[g.genre] = G.t;
  if (flop) {
    if (heatTrend(G, 'genre', g.genre, false, 'you')) {
      R.swings.push({ t: G.t, k: 'cold', kind: 'genre', id: g.genre, src: 'you' });
      beat(G, 'trendSwing', { g: genreName(g.genre), who: g.title, v: 1 });
      note(G, 'news.swingCold', { genre: GENRE[g.genre].name, title: g.title }, 'info', true);
    }
    keep(R.swings, 12);
    return;
  }
  const swung = heatTrend(G, 'genre', g.genre, true, 'you');
  if (g.score >= 9 && TOPIC[g.topic]) heatTrend(G, 'topic', g.topic, true, 'you');
  if (swung) {
    R.swings.push({ t: G.t, k: 'hot', kind: 'genre', id: g.genre, src: 'you' });
    G.stats.hot = (G.stats.hot || 0) + 1;
    beat(G, 'trendSwing', { g: genreName(g.genre), who: g.title, v: 0 });
    note(G, 'news.swingHot', { genre: GENRE[g.genre].name, title: g.title }, 'info');
  }
  keep(R.swings, 12);
  // kopiorna: konkurrenter som snart ska släppa något byter till din genre och ditt tema
  if (!COMP_GENRES.includes(g.genre) || !TOPIC[g.topic]) return;
  const cands = (G.comps || [])
    .filter((c) => !c.owned && c.next && !c.next.clone && !c.next.fr && c.nextT > G.t + 6 && c.nextT - G.t <= 48)
    .sort((a, b) => h32(G, `cl:${g.id}:${a.id}`) - h32(G, `cl:${g.id}:${b.id}`) || a.id - b.id);
  const n = g.score >= 9.2 ? 2 : 1;
  for (const c of cands.slice(0, n)) c.next = { ...c.next, genre: g.genre, topic: g.topic, clone: g.id, cloneOf: g.title };
}

// En konkurrents släpp: en riktig succé hettar till genren, och en kopia av ditt spel hamnar i listan över kopior
export function reactToRival(G, rel, c) {
  const R = reactOf(G);
  if (rel.clone) {
    G.stats.copied = (G.stats.copied || 0) + 1;
    R.clones.push({ t: G.t, gid: rel.clone, mine: (G.games.find((x) => x.id === rel.clone) || {}).title || '', studio: c.name, title: rel.title });
    keep(R.clones, 12);
  }
  if (c.owned || rel.score < RIVAL_HIT || !GENRE[rel.genre]) return;
  if (G.t - (R.last[rel.genre] ?? -999) < REACT_GAP) return;
  R.last[rel.genre] = G.t;
  if (heatTrend(G, 'genre', rel.genre, true, 'rival')) {
    R.swings.push({ t: G.t, k: 'hot', kind: 'genre', id: rel.genre, src: 'rival' });
    keep(R.swings, 12);
    beat(G, 'trendSwing', { g: genreName(rel.genre), who: c.name, v: 2 });
  }
}

// Läget för fönstret Världen och för scenerna: trenden (med veckor kvar och vem som startade den), kopiorna och de senaste svängningarna
export function reactState(G) {
  const R = reactOf(G);
  const tr = (G.market && G.market.trend) || { genre: [], topic: [] };
  const slot = (kind, x, i) => {
    const ref = kind === 'genre' ? GENRE[x.id] : TOPIC[x.id];
    return { id: x.id, name: ref ? L(ref.name) : x.id, mult: x.mult, pct: Math.round((x.mult - 1) * 100), left: Math.max(1, trendWeeksLeft(G, x)), src: x.src || '', hottest: i === 0 };
  };
  const coming = (G.comps || []).filter((c) => !c.owned && c.next && c.next.clone).map((c) => ({ studio: c.name, mine: c.next.cloneOf || '', in: Math.max(1, releaseWeek(c) - G.t) }));
  return {
    genre: tr.genre.map((x, i) => slot('genre', x, i)),
    topic: tr.topic.map((x, i) => slot('topic', x, i)),
    clones: R.clones.slice().reverse(),
    coming,
    swings: R.swings.slice().reverse(),
  };
}
