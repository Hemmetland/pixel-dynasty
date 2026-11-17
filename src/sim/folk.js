// Folket: personalens liv utanför arbetet. Varje medarbetare har en personlighet, en födelsedag och en dröm (alltid samma, ur en hash av
// fröet och id:t). Kollegor som jobbat ihop blir vänner, ibland ett par och ibland gifter de sig. Vänner och par trivs bättre (humöret),
// och den som blir kvar när en vän slutar saknar hen en tid. Då och då hör en konkurrent av sig till en av de skickligaste, och den som varit
// med länge vill göra sitt drömspel: spelaren väljer mellan pengar och hjärta (händelserna i data/folk-events.js).
// Allt som avgör om och när något händer dras med hashStr, aldrig G.rng: utan en händelse är slumpföljden densamma som utan systemet.
// Bara utfallet av ett val med slump (när spelaren valt) använder G.rng, som i alla andra händelser.
import { hashStr } from '../core/rng.js';
import { clamp } from '../core/util.js';
import { WEEKS_PER_YEAR } from './const.js';
import { QUIRKS, QUIRK_IDS } from '../data/folk.js';
import { GENRES, GENRE } from '../data/genres.js';
import { TOPICS, TOPIC } from '../data/topics.js';
import { L } from '../core/i18n.js';
import { beat, lifeName, chronLog } from './life.js';
import { note } from './news.js';
import { breathing } from './events.js';
import { teamsOf } from './teams.js';
import { rivalOf } from './rival.js';
import { skillCap } from './people.js';

export const FR_CAP = 2; // så många vänner en person har som mest
export const BOND_EVERY = 4; // veckor mellan två tillfällen då nya vänskaper och kärlekar kan uppstå
export const MIN_TENURE = 12; // veckor i studion innan någon får vänner
const P_FRIEND = 0.006; // chans per par och tillfälle (ett par kollegor i samma team har dubbelt)
const P_COUPLE = 0.005; // chans per vänpar (äldre än 24 veckor) och tillfälle
const P_BREAK = 0.0015;
const P_WEDDING = 0.012; // för ett par som varit ihop i två år, per tillfälle
const COUPLE_AFTER = 24;
const WEDDING_AFTER = 96;
export const DREAM_AFTER = 96; // veckor i studion innan någon vågar be om sitt drömspel
export const DREAM_GAP = 30; // minst så många veckor mellan två drömmar
export const HUNT_GAP = 48;
const DREAM_WEEKS = { go: 24, free: 36 };
const FRIEND_MOOD = 1.5; // humör per vän (högst två)
const COUPLE_MOOD = 3;

// 0 till 4294967295 ur seed och nyckel (hashStr sprider tätt följande tal ojämnt, så resultatet blandas en gång till)
function h32(G, tag) {
  let h = hashStr(`${G.seed || 0}|folk|${tag}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
const u01 = (G, tag) => h32(G, tag) / 4294967296;

export const folkOf = (G) => G.folk || (G.folk = { bonds: [], cool: {}, dreams: {}, last: {} });

// Drömspelet: en genre och ett ämne studion kan göra just nu (ur det som är upplåst), alltid samma för samma person så länge listorna är desamma
function dreamOf(G, id) {
  const gs = G.u && G.u.genres && G.u.genres.length ? G.u.genres : GENRES.map((x) => x.id);
  const ts = G.u && G.u.topics && G.u.topics.length ? G.u.topics : TOPICS.map((x) => x.id);
  return { genre: gs[h32(G, `dg:${id}`) % gs.length], topic: ts[h32(G, `dt:${id}`) % ts.length] };
}

// En medarbetares fasta egenskaper: personlighet, födelsedag (vecka 0–47 på året) och drömspel (genre och ämne)
export function persona(G, s) {
  const id = s.id;
  return {
    quirk: QUIRK_IDS[h32(G, `q:${id}`) % QUIRK_IDS.length],
    bday: h32(G, `b:${id}`) % WEEKS_PER_YEAR,
    dream: dreamOf(G, id),
  };
}
export const ageOf = (G, s) => 21 + (h32(G, `age:${s.id}`) % 17) + Math.floor((G.t - (s.hired || 0)) / WEEKS_PER_YEAR);
// Drömspelets namn på spelarens språk
export const dreamName = (d) => `${L(GENRE[d.genre].name)} · ${L(TOPIC[d.topic].name)}`;
// Veckor till nästa födelsedag (0 = den här veckan)
export const bdayIn = (G, s) => (persona(G, s).bday - (G.t % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;

// ── Band ─────────────────────────────────────────────────────────
const lo = (a, b) => Math.min(a, b);
const hi = (a, b) => Math.max(a, b);
export const bondOf = (G, a, b) => folkOf(G).bonds.find((x) => x.a === lo(a, b) && x.b === hi(a, b)) || null;
export const bondsOf = (G, id) => folkOf(G).bonds.filter((x) => x.a === id || x.b === id);
const other = (b, id) => (b.a === id ? b.b : b.a);
const staffById = (G, id) => G.staff.find((s) => s.id === id) || null;
export const partnerOf = (G, id) => {
  const b = bondsOf(G, id).find((x) => x.k === 'couple');
  return b ? staffById(G, other(b, id)) : null;
};
export const friendsOf = (G, id) => bondsOf(G, id).filter((x) => x.k === 'friend').map((x) => staffById(G, other(x, id))).filter(Boolean);
const frCount = (G, id) => bondsOf(G, id).filter((x) => x.k === 'friend').length;
const bname = (G, b, id) => (b.a === id ? b.na : b.nb);

function addBond(G, a, b, k) {
  const F = folkOf(G);
  const bd = { a: lo(a.id, b.id), b: hi(a.id, b.id), k, t0: G.t, na: a.id < b.id ? lifeName(a) : lifeName(b), nb: a.id < b.id ? lifeName(b) : lifeName(a) };
  F.bonds.push(bd);
  return bd;
}

// Bandens humör per person och vecka: vänner och sambo lyfter, en nyligen förlorad vän drar ner en tid
export function bondBonus(G) {
  const F = G.folk;
  const m = new Map();
  if (!F) return m;
  const fr = new Map();
  for (const b of F.bonds) {
    for (const id of [b.a, b.b]) {
      if (b.k === 'couple') m.set(id, (m.get(id) || 0) + COUPLE_MOOD);
      else if ((fr.get(id) || 0) < FR_CAP) {
        fr.set(id, (fr.get(id) || 0) + 1);
        m.set(id, (m.get(id) || 0) + FRIEND_MOOD);
      }
    }
  }
  for (const id of Object.keys(F.cool)) {
    const c = F.cool[id];
    if (c.until > G.t) m.set(+id, (m.get(+id) || 0) - c.v);
    else delete F.cool[id];
  }
  return m;
}

// En vän eller en partner som inte längre finns i studion: de som blir kvar saknar hen en tid
function tidy(G) {
  const F = folkOf(G);
  const keep = [];
  for (const b of F.bonds) {
    const A = staffById(G, b.a);
    const B = staffById(G, b.b);
    if (A && B) {
      keep.push(b);
      continue;
    }
    const left = !A ? b.a : b.b;
    const stay = A || B;
    if (stay && G.t - b.t0 >= 8) {
      const couple = b.k === 'couple';
      F.cool[stay.id] = { until: G.t + (couple ? 16 : 10), v: couple ? 12 : 6 };
      beat(G, 'miss', { staff: stay, staff2: { id: left, name: bname(G, b, left) }, v: couple ? 2 : undefined });
    }
  }
  F.bonds = keep;
}

// ── Veckan ───────────────────────────────────────────────────────
export function folkWeek(G) {
  const F = folkOf(G);
  tidy(G);
  // födelsedagar: tårta, en snäll tanke och lite bättre humör
  for (const s of G.staff) {
    if (G.t - (s.hired || 0) < 4 || G.t % WEEKS_PER_YEAR !== persona(G, s).bday) continue;
    // i en stor studio firas inte alla med tårta: grundaren, de som har vänner eller någon till var tredje (hash)
    if (!s.isFounder && !bondsOf(G, s.id).length && h32(G, `bd:${s.id}`) % 3 !== 0) continue;
    if (beat(G, 'birthday', { staff: s, a: ageOf(G, s) })) s.mood = clamp(s.mood + 3, 0, 100);
  }
  // bakis dagen efter releasefesten (festen är veckan efter att försäljningen börjat, se lifeWeek)
  if (G.staff.length >= 2) {
    for (const g of G.games) {
      if (g.auto || g.expansionOf || G.t - g.t !== 3 || g.score < 8) continue;
      const pool = G.staff.filter((s) => !s.away);
      if (pool.length < 2) break;
      const a = pool[h32(G, `hang:${g.id}:a`) % pool.length];
      const rest = pool.filter((s) => s !== a);
      const b = rest[h32(G, `hang:${g.id}:b`) % rest.length];
      beat(G, 'hangover', { staff: a, staff2: b, g: g.title });
    }
  }
  if (G.t % BOND_EVERY === 1) formBonds(G, F);
}

// Nya vänskaper, kärlekar, bröllop och uppbrott (högst ett av varje sort per tillfälle, så att det inte blir ett sorl)
function formBonds(G, F) {
  const S = G.staff.filter((s) => G.t - (s.hired || 0) >= MIN_TENURE && s.trainUntil <= G.t);
  if (S.length < 2) return;
  const teamOf = new Map();
  for (const tm of teamsOf(G)) for (const id of tm.members) teamOf.set(id, tm.id);
  const q = new Map(S.map((s) => [s.id, QUIRKS[persona(G, s).quirk].fr]));
  for (let i = 0; i < S.length; i++) {
    const a = S[i];
    if (frCount(G, a.id) >= FR_CAP) continue;
    let made = false;
    for (let j = i + 1; j < S.length && !made; j++) {
      const b = S[j];
      if (frCount(G, b.id) >= FR_CAP || bondOf(G, a.id, b.id)) continue;
      const same = teamOf.has(a.id) && teamOf.get(a.id) === teamOf.get(b.id);
      const p = P_FRIEND * q.get(a.id) * q.get(b.id) * (same ? 2 : 1);
      if (u01(G, `fr:${lo(a.id, b.id)}:${hi(a.id, b.id)}:${G.t}`) >= p) continue;
      addBond(G, a, b, 'friend');
      beat(G, 'friends', { staff: a, staff2: b });
      made = true;
    }
    if (made) break;
  }
  // kärlek mellan vänner
  const free = (id) => !bondsOf(G, id).some((x) => x.k === 'couple');
  for (const b of F.bonds) {
    if (b.k !== 'friend' || G.t - b.t0 < COUPLE_AFTER || !free(b.a) || !free(b.b)) continue;
    if (u01(G, `cp:${b.a}:${b.b}:${G.t}`) >= P_COUPLE) continue;
    b.k = 'couple';
    b.t0 = G.t;
    beat(G, 'couple', { staff: staffById(G, b.a), staff2: staffById(G, b.b) });
    break;
  }
  // uppbrott och bröllop
  for (const b of F.bonds.slice()) {
    if (b.k !== 'couple') continue;
    const A = staffById(G, b.a);
    const B = staffById(G, b.b);
    if (u01(G, `br:${b.a}:${b.b}:${G.t}`) < (b.wed ? P_BREAK / 3 : P_BREAK)) {
      F.bonds = F.bonds.filter((x) => x !== b);
      F.cool[A.id] = { until: G.t + 12, v: 8 };
      F.cool[B.id] = { until: G.t + 12, v: 8 };
      beat(G, 'breakup', { staff: A, staff2: B });
      break;
    }
    if (!b.wed && G.t - b.t0 >= WEDDING_AFTER && !G.pending.length && !breathing(G) && u01(G, `wd:${b.a}:${b.b}:${G.t}`) < P_WEDDING) {
      b.wed = -1; // frågan är ställd (svaret sätter veckan)
      G.pending.push({ type: 'event', id: G.uid++, ev: 'folk_wedding', who: A.id, who2: B.id, partner: B.name.split(' ')[0] });
      break;
    }
  }
}

// ── Månaden: erbjudanden, drömmar och det som följer av ett nej ──
export function folkMonth(G) {
  const F = folkOf(G);
  dreamsMonth(G, F);
  const crew = G.staff.filter((s) => !s.isFounder);
  if (crew.length < 3) return;
  // slumpen faller medan spelet nyss stannat för något annat: frågan väntar till nästa månad (som övriga händelser, så att det blir
  // lika många men utspridda)
  const busy = G.pending.length || breathing(G);
  if (G.t - (F.last.hunt ?? -999) >= HUNT_GAP && G.t >= WEEKS_PER_YEAR * 2) {
    const avg = crew.reduce((a, s) => a + s.mood, 0) / crew.length;
    const p = 0.045 * (rivalOf(G) ? 1.3 : 1) * (avg < 55 ? 1.6 : avg > 72 ? 0.6 : 1);
    if (u01(G, `hh:${G.t}`) < p) F.dueHunt = true;
  }
  if (G.t - (F.last.dream ?? -999) >= DREAM_GAP && G.t >= WEEKS_PER_YEAR * 3 && u01(G, `dm:${G.t}`) < 0.12) F.dueDream = true;
  if (busy) return;
  // en konkurrent hör av sig till en av de skickligaste
  if (F.dueHunt) {
    F.dueHunt = false;
    const skill = (s) => (s.design + s.tech + s.speed + s.research) / 4;
    const cand = crew.filter((s) => G.t - (s.hired || 0) >= WEEKS_PER_YEAR).sort((a, b) => skill(b) + 4 * u01(G, `hs:${b.id}:${G.t}`) - (skill(a) + 4 * u01(G, `hs:${a.id}:${G.t}`)));
    const s = cand[0];
    if (s) {
      F.last.hunt = G.t;
      const par = partnerOf(G, s.id);
      const pair = par && !par.isFounder ? par : null;
      const R = rivalOf(G);
      G.pending.push({ type: 'event', id: G.uid++, ev: pair ? 'folk_headhunt_pair' : 'folk_headhunt', who: s.id, name: s.name.split(' ')[0], ...(pair ? { who2: pair.id, partner: pair.name.split(' ')[0] } : {}) });
      beat(G, 'headhunt', { staff: s, staff2: pair || undefined, g: R ? R.name : '', v: 0 });
      return;
    }
  }
  // någon har burit på en dröm länge
  if (F.dueDream) {
    const cand = crew.filter((s) => !F.dreams[s.id] && G.t - (s.hired || 0) >= DREAM_AFTER && (s.games || 0) >= 3).sort((a, b) => u01(G, `ds:${a.id}:${G.t}`) - u01(G, `ds:${b.id}:${G.t}`));
    const s = cand[0];
    if (s) {
      F.dueDream = false;
      F.last.dream = G.t;
      const d = persona(G, s).dream;
      G.pending.push({ type: 'event', id: G.uid++, ev: 'folk_dream', who: s.id, dream: d });
      beat(G, 'dream', { staff: s, g: dreamName(d) });
    }
  }
}

// Drömmar på gång: klara efter 24 veckor (studions tid) eller 36 (fritiden); ett nej kan sluta med att hen går
function dreamsMonth(G, F) {
  for (const id of Object.keys(F.dreams)) {
    const d = F.dreams[id];
    const s = staffById(G, +id);
    if (!s) {
      if (d.state !== 'done') d.state = 'gone';
      continue;
    }
    if ((d.state === 'go' || d.state === 'free') && G.t >= d.until) finishDream(G, s, d);
    else if (d.state === 'no') {
      const age = G.t - d.t0;
      if (age >= 8 && age < 32 && s.mood < 65 && u01(G, `dq:${s.id}:${G.t}`) < 0.2) {
        G.staff = G.staff.filter((x) => x !== s);
        G.stats.quits = (G.stats.quits || 0) + 1;
        d.state = 'quit';
        beat(G, 'dreamQuit', { staff: s, g: dreamName(d.dream) });
        note(G, 'news.dreamQuit', { name: s.name }, 'bad');
      } else if (age >= 32) d.state = 'forgiven';
    }
  }
}

// Drömmen blir klar: hen växer som utvecklare, fansen får höra om det och nästa spel får lite snack
function finishDream(G, s, d) {
  const go = d.state === 'go';
  d.state = 'done';
  const cap = skillCap(G);
  const gain = go ? 2 : 1;
  s.design = Math.min(cap, s.design + gain);
  s.tech = Math.min(cap, s.tech + gain);
  s.mood = clamp(s.mood + (go ? 20 : 10), 0, 100);
  if (go && !s.trait) s.trait = 'spark';
  const fans = Math.max(go ? 200 : 80, Math.round(G.fans * (go ? 0.03 : 0.01)));
  G.fans += fans;
  if (go) G.flags.hypeNext = (G.flags.hypeNext || 0) + 5;
  beat(G, 'dreamDone', { staff: s, g: dreamName(d.dream), v: go ? 0 : 1 });
  note(G, 'news.dreamDone', { name: s.name, game: dreamName(d.dream) }, 'good');
}

// Spelarens svar på drömmen (fx.dream i händelsen): 'go', 'free' eller 'no'
export function folkDream(G, id, mode) {
  const s = staffById(G, id);
  if (!s) return;
  const F = folkOf(G);
  const dream = persona(G, s).dream;
  F.dreams[id] = { state: mode, t0: G.t, until: G.t + (DREAM_WEEKS[mode] || 0), dream };
  if (mode === 'no') beat(G, 'dreamNo', { staff: s, g: dreamName(dream) });
  else beat(G, 'dreamGo', { staff: s, g: dreamName(dream), v: mode === 'go' ? 0 : 1 });
}

// En medarbetare slutar (erbjudande, utbränd): samma som övriga avsked
export function folkLeave(G, s) {
  G.staff = G.staff.filter((x) => x !== s);
  G.stats.quits = (G.stats.quits || 0) + 1;
  note(G, 'news.staffLeft', { name: s.name }, 'bad');
}

// Efter ett val i en av folkets händelser: bröllopet bokförs, och scenen får veta hur erbjudandet gick
export function folkAfter(G, pr, ev, idx) {
  if (ev.kind !== 'folk') return;
  if (ev.id === 'folk_wedding') {
    const b = bondOf(G, pr.who, pr.who2);
    if (b) b.wed = G.t;
    beat(G, 'wedding', { staff: staffById(G, pr.who), staff2: staffById(G, pr.who2), v: idx === 0 ? 0 : 1 });
    note(G, 'news.folkWedding', { a: (staffById(G, pr.who) || {}).name || '', b: pr.partner || '' }, 'info');
  } else if (ev.id === 'folk_headhunt' || ev.id === 'folk_headhunt_pair') {
    const s = staffById(G, pr.who);
    const R = rivalOf(G);
    if (s) beat(G, 'headhunt', { staff: s, staff2: pr.who2 ? staffById(G, pr.who2) || undefined : undefined, g: R ? R.name : '', v: 1 });
    else beat(G, 'headhunt', { staff: { id: pr.who, name: pr.name || '' }, g: R ? R.name : '', v: 2 });
  }
}

// Allt scenen och fönstret behöver: humöret, paren och vännerna, kommande födelsedagar och drömmarna på gång
export function folkState(G) {
  const F = folkOf(G);
  const S = G.staff;
  const name = (id) => {
    const s = staffById(G, id);
    return s ? lifeName(s) : '';
  };
  const mood = S.length ? Math.round(S.reduce((a, s) => a + s.mood, 0) / S.length) : 0;
  return {
    n: S.length,
    mood,
    couples: F.bonds.filter((b) => b.k === 'couple').map((b) => ({ a: b.a, b: b.b, an: name(b.a), bn: name(b.b), wed: !!b.wed && b.wed > 0 })),
    friends: F.bonds.filter((b) => b.k === 'friend').map((b) => ({ a: b.a, b: b.b, an: name(b.a), bn: name(b.b) })),
    birthdays: S.map((s) => ({ id: s.id, name: lifeName(s), in: bdayIn(G, s) }))
      .sort((x, y) => x.in - y.in || x.id - y.id)
      .slice(0, 3),
    dreams: Object.keys(F.dreams)
      .map((id) => ({ id: +id, name: name(+id), state: F.dreams[id].state, until: F.dreams[id].until, game: dreamName(F.dreams[id].dream) }))
      .filter((d) => d.state === 'go' || d.state === 'free'),
    recent: chronLog(G, 'folk', 6),
  };
}
