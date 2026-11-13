// Röster från spelarna: tre korta repliker per spel, valda efter betyget, det som stack ut och läget just nu.
// Rösterna byggs ur spelets sparade uppgifter varje gång de visas (så att gamla sparningar får dem direkt) och väljs
// med en hash av fröet och spelets id, aldrig med G.rng. Allt här är uppvisning: inget ändrar pengar, fans eller försäljning.
import { hashStr } from '../core/rng.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { PLATFORM } from '../data/platforms.js';
import { GENRE_FORMS, TOPIC_PROPER } from '../data/reviews.js';
import { FAN_BANDS, FAN_FLAGS, FAN_SPECIAL, FAN_FIRST, FAN_HANDLES } from '../data/fanvoices.js';
import { yearOf, WEEKS_PER_YEAR } from './const.js';
import { liveFactors, isF2P, HIKE_TALK } from './live.js';
import { note } from './news.js';

const LANGS = ['sv', 'en'];
const CLASSIC_WEEKS = 5 * WEEKS_PER_YEAR; // så gammalt ska ett spel vara för att få ett eftermäle
const capFirst = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const lcName = (name, key) => (TOPIC_PROPER[key].includes(name) || name === 'AI' ? name : name.toLowerCase());
const titleIn = (x, key) => (x && typeof x === 'object' ? x[key] || x.en || '' : x || '');

// var rösterna hörs: insändare, forum eller flödet (efter året då spelet släpptes)
export function fanSource(g) {
  const y = yearOf(g.t);
  return y < 1994 ? 'letter' : y < 2008 ? 'forum' : 'feed';
}

// läget för ett onlinespel just nu (det som spelarna klagar på eller gläds åt)
function liveState(G, g) {
  const L = g.live;
  if (L.closed) return 'liveClosed';
  const f = liveFactors(G, g);
  if (f.full) return 'liveFull';
  if (L.hikeT != null && G.t - L.hikeT < HIKE_TALK) return isF2P(L) ? 'liveShopHike' : 'liveHike';
  if (L.fresh < 40) return 'liveStale';
  if (!isF2P(L) && f.price < 0.9) return 'livePricey';
  return L.fresh >= 75 ? 'liveFresh' : 'liveMid';
}

// Särskilt läge för den tredje rösten, i prioritetsordning. Returnerar nyckeln i FAN_SPECIAL eller ''.
function specialOf(G, g) {
  if (g.live) return liveState(G, g);
  if (G.t - g.t >= CLASSIC_WEEKS) {
    if (g.score >= 8.5) return 'classic';
    if (g.score < 4.5) return 'cult';
  }
  if (g.expansionOf) return g.score >= 7 ? 'expGood' : g.score < 6 ? 'expBad' : '';
  const i = G.games.indexOf(g);
  const p1 = G.games[i - 1];
  const p2 = G.games[i - 2];
  if (p1 && g.score >= 8 && p1.score < 5.5) return 'comeback';
  if (p1 && g.score < 5.5 && p1.score >= 8) return 'slump';
  if (p1 && p2 && g.score >= 8 && p1.score >= 8 && p2.score >= 8) return 'streak';
  if ((g.hype || 0) >= 60 && g.score < 6.5) return 'hyped';
  if ((g.hype || 0) < 15 && g.score >= 8) return 'gem';
  if ((g.crowd || 1) < 0.92 && g.crowdBy && g.crowdBy[0] && g.crowdBy[0].title) return g.crowdBy[0].future ? 'crowdWait' : 'crowd';
  if (g.scope === 'aaa' && g.score >= 8.5) return 'aaa';
  if (g.scope === 'small' && g.score >= 6.8 && yearOf(g.t) >= 1992) return 'small';
  return '';
}

// Tre röster om ett spel: [{ kind, mood, name: {sv,en}, text: {sv,en} }]. kind: band (allmänt omdöme), flag (det som
// stack ut), special (läget). mood: 1 nöjd, 0 ljum, −1 missnöjd.
export function fanVoices(G, g) {
  const h = (salt) => hashStr(`${G.seed}:fan:${g.id}:${salt}`);
  const prev = g.sequelOf ? G.games.find((x) => x.id === g.sequelOf) : null;
  const base = g.expansionOf ? G.games.find((x) => x.id === g.expansionOf) : null;
  const src = fanSource(g);
  const out = [];
  const used = new Set();
  const vars = (key) => {
    const gf = (GENRE_FORMS[g.genre] || {})[key] || { a: GENRE[g.genre].name[key], pl: GENRE[g.genre].name[key] };
    return {
      title: g.title, studio: G.studio, plat: PLATFORM[g.platform] ? PLATFORM[g.platform].name : '', topic: lcName(TOPIC[g.topic].name[key], key),
      aGenre: gf.a, genres: gf.pl, prev: prev ? prev.title : '', base: base ? base.title : '', rival: g.crowdBy && g.crowdBy[0] ? titleIn(g.crowdBy[0].title, key) : '',
    };
  };
  const nameOf = (slot) => {
    const i = (h('name') + slot * 7) % FAN_FIRST.length;
    if (src === 'letter') {
      const age = 10 + (h('age' + slot) % 8);
      return { sv: `${FAN_FIRST[i]}, ${age} år`, en: `${FAN_FIRST[i]}, ${age}` };
    }
    const n = (src === 'feed' ? '@' : '') + FAN_HANDLES[i % FAN_HANDLES.length];
    return { sv: n, en: n };
  };
  const add = (pool, kind, mood, salt) => {
    let i = h(salt) % pool.sv.length;
    for (let n = 0; n < pool.sv.length && used.has(pool.sv[i]); n++) i = (i + 1) % pool.sv.length;
    used.add(pool.sv[i]);
    const text = {};
    for (const key of LANGS) {
      const v = vars(key);
      text[key] = capFirst(pool[key][i].replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m));
    }
    out.push({ kind, mood, name: nameOf(out.length), text });
  };

  // 1: det allmänna omdömet
  const band = FAN_BANDS.find((b) => g.score >= b.min) || FAN_BANDS[FAN_BANDS.length - 1];
  add(band, 'band', band.mood, 'band');

  // 2: det som stack ut. Helst något som stämmer med betyget (styrkor i ett bra spel, svagheter i ett dåligt).
  const flags = (g.flags || []).filter((f) => FAN_FLAGS[f.k] && (f.k !== 'sequel' || prev)).map((f) => ({ k: f.k, v: f.v }));
  const vr = (g.insights || []).find((x) => x.k === 'vr');
  if (vr && vr.level) flags.push({ k: 'vr', v: vr.level });
  flags.sort((a, b) => h('f' + a.k) - h('f' + b.k) || (a.k < b.k ? -1 : 1));
  const want = g.score >= 6.5 ? 1 : -1;
  const main = flags.find((f) => Math.sign(f.v) === want) || flags[0];
  if (main) add(FAN_FLAGS[main.k][main.v > 0 ? '+' : '-'], 'flag', main.v > 0 ? 1 : -1, 'flag');

  // 3: läget (onlinespelets skick, eftermälet, studions form ...), annars en avvikande röst eller ett omdöme till
  const sp = specialOf(G, g);
  const other = flags.find((f) => main && Math.sign(f.v) !== Math.sign(main.v));
  if (sp) add(FAN_SPECIAL[sp], 'special', FAN_SPECIAL[sp].mood, 'sp');
  else if (other) add(FAN_FLAGS[other.k][other.v > 0 ? '+' : '-'], 'flag', other.v > 0 ? 1 : -1, 'other');
  while (out.length < 3) add(band, 'band', band.mood, 'band' + out.length);
  return out;
}

// Veckovis: två veckor efter släppet citeras en spelare i krönikan (helst rösten om det som stack ut i spelet)
export function fanWeek(G) {
  for (const g of G.games) {
    if (g.ended || !g.weekly || g.weekly.length !== 2) continue;
    const vs = fanVoices(G, g);
    const v = vs.find((x) => x.kind === 'flag') || vs[0];
    note(G, 'news.fan', { name: v.name, title: g.title, quote: v.text }, v.mood > 0 ? 'good' : 'info');
  }
}
