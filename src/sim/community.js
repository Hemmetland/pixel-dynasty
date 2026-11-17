// Fansen: forumtrådar, memes, fanart, streamare och virala trådar kring studions spel. Varje spel har ett par månader då spelarna pratar
// om det (längre för ett onlinespel), och då och då händer något som syns i krönikan (Studiolivet, fliken Fansen). En tråd som går viralt
// ger en kort lyft i försäljningen, och ett missnöje som sprids drar ner den tills spelaren svarar (händelsen comm_storm).
// Allt som avgör om och när något händer dras med hashStr (dice.js), aldrig G.rng. Försäljningen läser g.viral (sales.js).
//
// g.comm = { t (veckan för senaste händelsen), list: [{ k, t }] (de fyra senaste) }, g.viral = { k, until (vecka), mult }.
import { dice } from './dice.js';
import { yearOf } from './const.js';
import { beat } from './life.js';
import { note } from './news.js';
import { breathing } from './events.js';
import { fanSource, fanVoices } from './fans.js';
import { FAN_HANDLES } from '../data/fanvoices.js';

const { h32, u01 } = dice('comm');

export const TALK_WEEKS = 40; // så länge pratar spelarna om ett nytt spel (ett onlinespel pratas om så länge det är öppet)
export const COMM_GAP = 4; // veckor mellan två händelser kring samma spel
export const VIRAL = {
  up: { weeks: 4, mult: 1.12 }, // en tråd går viralt
  down: { weeks: 5, mult: 0.88 }, // missnöje sprids
  streamer: { weeks: 3, mult: 1.05 }, // en streamare spelar
  cover: { weeks: 4, mult: 1.05 }, // omslaget på branschtidningen (mag.js)
};

// En aktiv lyft eller dämpning av försäljningen, annars null
export const viralOf = (G, g) => (g.viral && G.t <= g.viral.until ? g.viral : null);
// Sätter en lyft om spelet inte redan har en. Ger true om den sattes.
export function setViral(G, g, k) {
  if (viralOf(G, g)) return false;
  g.viral = { k, until: G.t + VIRAL[k].weeks, mult: VIRAL[k].mult };
  return true;
}

// Vilken händelse som är på tapeten för spelet just nu (vikter ur betyg, buggar och Förväntan), eller null
function pickKind(G, g, year, age) {
  const sc = g.score;
  const bug = (g.parts && g.parts.bugRatio) || 0;
  const hype = Math.min(1, (g.hype || 0) / 100);
  const free = !viralOf(G, g);
  const opts = [];
  if (sc >= 4) opts.push({ k: 'thread', w: 3 });
  if (year >= 1996) {
    if (bug >= 0.6) opts.push({ k: 'meme', w: 2.2, v: 0 });
    else if (sc < 5.5) opts.push({ k: 'meme', w: 1.5, v: 2 });
    else if (sc >= 7.5) opts.push({ k: 'meme', w: 1.5, v: 1 });
  }
  if (year >= 1994 && sc >= 7) opts.push({ k: 'fanart', w: 2.5 });
  if (year >= 2010 && sc >= 6.5) opts.push({ k: 'streamer', w: 2 });
  if (free && age < 16 && sc >= 7.8) opts.push({ k: 'viralUp', w: 1.2 + hype });
  if (free && age < 14 && sc < 6.2 && (hype >= 0.35 || bug >= 0.6)) opts.push({ k: 'viralDown', w: 1.4 });
  const total = opts.reduce((a, o) => a + o.w, 0);
  if (!total) return null;
  let r = u01(G, `ck:${g.id}:${G.t}`) * total;
  for (const o of opts) {
    if (r < o.w) return o;
    r -= o.w;
  }
  return opts[opts.length - 1];
}

function happen(G, g, C, o, year) {
  const k = o.k;
  const d = { g: g.title };
  const tag = `${g.id}:${G.t}`;
  if (k === 'thread') {
    const src = fanSource(g);
    d.v = (src === 'letter' ? 0 : src === 'forum' ? 2 : 5) + (h32(G, `tv:${tag}`) % (src === 'letter' ? 2 : 3));
  } else if (k === 'meme') d.v = o.v;
  else if (k === 'streamer') {
    d.who = '@' + FAN_HANDLES[h32(G, `sh:${tag}`) % FAN_HANDLES.length];
    d.v = h32(G, `sv:${tag}`) % 3;
  } else d.v = h32(G, `cv:${tag}`) % 3;
  if (k === 'fanart' || k === 'streamer') G.fans += Math.max(15, Math.round(G.fans * (k === 'streamer' ? 0.003 : 0.002)));
  if (k === 'viralUp') {
    setViral(G, g, 'up');
    G.stats.viral = (G.stats.viral || 0) + 1;
    note(G, 'news.viralUp', { title: g.title }, 'good', true);
  } else if (k === 'viralDown') {
    setViral(G, g, 'down');
    note(G, 'news.viralDown', { title: g.title }, 'bad', true);
    // spelaren får svara om det inte just stoppat spelet för något annat
    if (!G.pending.length && !breathing(G)) G.pending.push({ type: 'event', id: G.uid++, ev: 'comm_storm', game: g.id });
  } else if (k === 'streamer') setViral(G, g, 'streamer');
  beat(G, k, d);
  C.t = G.t;
  C.list.push({ k, t: G.t });
  if (C.list.length > 4) C.list.shift();
}

// Veckovis, efter försäljningen: händelser kring spel som nyss kommit (och onlinespel)
export function communityWeek(G) {
  const year = yearOf(G.t);
  for (const g of G.games) {
    if (g.auto || g.ended || !g.weekly || !g.weekly.length) continue;
    const age = G.t - g.t;
    const live = !!(g.live && !g.live.closed);
    if (age > TALK_WEEKS && !live) continue;
    const C = g.comm || (g.comm = { t: -99, list: [] });
    if (G.t - C.t < COMM_GAP) continue;
    const p = live ? 0.04 : age < 12 ? 0.16 : 0.08;
    if (u01(G, `cm:${g.id}:${G.t}`) >= p) continue;
    const o = pickKind(G, g, year, age);
    if (o) happen(G, g, C, o, year);
  }
}

// Spelen som pratas om just nu, nyast först: lyft eller dämpning, det som hänt och en röst från en spelare
export function fanTalk(G, max = 8) {
  const out = [];
  for (const g of G.games.slice().reverse()) {
    const live = !!(g.live && !g.live.closed);
    const age = G.t - g.t;
    if ((age > TALK_WEEKS && !live) || !g.weekly || !g.weekly.length) continue;
    const v = viralOf(G, g);
    if (g.auto && !v && !(g.comm && g.comm.list.length)) continue;
    const vs = fanVoices(G, g);
    const voice = vs.find((x) => x.kind === 'flag') || vs[0];
    out.push({
      id: g.id,
      title: g.title,
      score: g.score,
      age,
      live,
      viral: v ? { k: v.k, left: Math.max(1, v.until - G.t), pct: Math.round((v.mult - 1) * 100) } : null,
      happened: ((g.comm && g.comm.list) || []).slice().reverse(),
      voice: voice ? { name: voice.name, text: voice.text, mood: voice.mood } : null,
    });
    if (out.length >= max) break;
  }
  return out;
}

// Läget för scenerna: spelen som pratas om och om något är viralt just nu
export function fanState(G) {
  const games = fanTalk(G, 5);
  return { games, hot: games.some((x) => x.viral && x.viral.pct > 0), angry: games.some((x) => x.viral && x.viral.pct < 0) };
}
