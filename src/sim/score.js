import { clamp } from '../core/util.js';
import { gauss } from '../core/rng.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { CATEGORIES, CAT, CAT_IDX } from '../data/categories.js';
import { PLATFORM, techMult } from '../data/platforms.js';
import { REVIEWERS, HEADLINES, DETAILS, NEUTRAL, GENRE_FORMS, TOPIC_PROPER, SCOPE_ADJ } from '../data/reviews.js';
import { SCOPES, AUD, yearOf } from './const.js';

// ── Fokus ────────────────────────────────────────────────────────
export function phaseCats(G, phase) {
  return CATEGORIES.filter((c) => c.phase === phase && G.u.cats.includes(c.id)).map((c) => c.id);
}
// Normalisera till heltal som summerar till 100 (steg om 5).
export function normFocus(cats, raw) {
  if (!cats.length) return {};
  let vals = cats.map((c) => Math.max(0, raw?.[c] ?? 0));
  let sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) vals = cats.map(() => 1), (sum = cats.length);
  const out = {};
  let acc = 0;
  cats.forEach((c, i) => {
    const v = i === cats.length - 1 ? 100 - acc : Math.round(((vals[i] / sum) * 100) / 5) * 5;
    out[c] = Math.max(0, v);
    acc += out[c];
  });
  // Justera eventuellt avrundningsfel på största posten.
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const big = cats.reduce((a, c) => (out[c] > out[a] ? c : a), cats[0]);
    out[big] += 100 - total;
  }
  return out;
}
export function idealWeights(genre, genre2) {
  const g1 = GENRE[genre].ideal;
  if (!genre2) return g1;
  const g2 = GENRE[genre2].ideal;
  return g1.map((v, i) => v * 0.62 + g2[i] * 0.38);
}
export function idealFocus(G, genre, phase, genre2) {
  const cats = phaseCats(G, phase);
  const w = idealWeights(genre, genre2);
  const raw = {};
  for (const c of cats) raw[c] = w[CAT_IDX[c]];
  return normFocus(cats, raw);
}
export function defaultFocus(G, genre, genre2) {
  return [0, 1, 2].map((p) => idealFocus(G, genre, p, genre2));
}
// Startfördelningen för ett nytt projekt: genrens ideal först när du har lärt dig det (släppt ett spel i genren),
// annars jämnt fördelat. Att hitta idealet är en del av spelet, inte en gratis förinställning.
export const focusKnown = (G, genre) => !!G.know.focus[genre];
export function startFocus(G, genre, genre2) {
  return focusKnown(G, genre) ? defaultFocus(G, genre, genre2) : [0, 1, 2].map((p) => normFocus(phaseCats(G, p), {}));
}
// Hur väl valet matchar genrens ideal. 1 = perfekt.
export function focusFit(G, job) {
  const fits = [];
  const dev = {};
  for (let p = 0; p < 3; p++) {
    const cats = phaseCats(G, p);
    if (cats.length < 2) {
      fits.push(1);
      continue;
    }
    const ideal = idealFocus(G, job.genre, p, job.genre2);
    const chosen = normFocus(cats, job.focus[p] || {});
    let l1 = 0;
    for (const c of cats) {
      const d = (chosen[c] - ideal[c]) / 100;
      l1 += Math.abs(d);
      dev[c] = d;
    }
    fits.push(clamp(1 - l1 / 1.1, 0, 1));
  }
  const fit = fits.reduce((a, b) => a + b, 0) / 3;
  let over = null;
  let under = null;
  for (const c of Object.keys(dev)) {
    if (!over || dev[c] > dev[over]) over = c;
    if (!under || dev[c] < dev[under]) under = c;
  }
  return { fit, fits, over: dev[over] > 0.12 ? over : null, under: dev[under] < -0.12 ? under : null };
}

// ── Kompatibilitet ───────────────────────────────────────────────
const PAIRS_GOOD = ['action|adventure', 'action|shooter', 'action|racing', 'adventure|rpg', 'rpg|strategy', 'action|rpg',
  'strategy|simulation', 'simulation|casual', 'racing|simulation', 'adventure|casual', 'shooter|rpg', 'adventure|strategy'];
const PAIRS_BAD = ['casual|shooter', 'racing|strategy', 'rpg|racing', 'casual|rpg', 'simulation|shooter', 'casual|action'];
function pairScore(a, b) {
  const k1 = a + '|' + b;
  const k2 = b + '|' + a;
  if (PAIRS_GOOD.includes(k1) || PAIRS_GOOD.includes(k2)) return 1;
  if (PAIRS_BAD.includes(k1) || PAIRS_BAD.includes(k2)) return -1;
  return 0;
}
export function genreIdx(g) {
  return ['action', 'adventure', 'rpg', 'strategy', 'simulation', 'casual', 'shooter', 'racing'].indexOf(g);
}
export function compatOf(topic, genre, genre2) {
  const c1 = TOPIC[topic].compat[genreIdx(genre)];
  if (!genre2) return c1;
  const c2 = TOPIC[topic].compat[genreIdx(genre2)];
  return clamp(c1 * 0.62 + c2 * 0.38 + pairScore(genre, genre2) * 0.35, 1, 4);
}
export function audFit(topic, genre, audience, genre2) {
  const m = TOPIC[topic].mature + GENRE[genre].mature * 0.5 + (genre2 ? GENRE[genre2].mature * 0.25 : 0);
  return clamp(1 - 0.09 * Math.abs(m - AUD[audience].v), 0.84, 1);
}
export function platFit(platform, genre, genre2) {
  const b = PLATFORM[platform].bias;
  const v = (b[genre] ?? 1) * (genre2 ? 0.65 : 1) + (genre2 ? (b[genre2] ?? 1) * 0.35 : 0);
  return v;
}
export function techWeight(genre, genre2) {
  return genre2 ? GENRE[genre].techW * 0.62 + GENRE[genre2].techW * 0.38 : GENRE[genre].techW;
}

// ── Utvärdering ──────────────────────────────────────────────────
export function parPerTick(G, job) {
  const year = yearOf(G.t);
  return SCOPES[job.scope].par * techMult(PLATFORM[job.platform], year);
}

export function freshness(G, job) {
  let rep = 0;
  for (const g of G.games.slice(-5)) if (g.topic === job.topic && g.genre === job.genre) rep++;
  return rep;
}

function roundHalf(x) {
  return Math.round(x * 2) / 2;
}
// Betygstak per storlek (se "Små spel kan aldrig bli mästerverk" nedan). Taket styr också hur mycket
// de första åren ger: ett litet spel landar kring 6–7 och första "succén" (7,5+) kommer med kontoret.
export const SCOPE_CAP = { small: 7.0, medium: 8.7, large: 9.2, aaa: 10 };
// Mjukt tak: upp till cap − 1 oförändrat, därefter planar betyget ut mot cap.
export const softCap = (raw0, cap) => (raw0 <= cap - 1 ? raw0 : cap - 1 + (1 - Math.exp(-(raw0 - (cap - 1)))));

export function evaluate(G, job) {
  const year = yearOf(G.t);
  const par = parPerTick(G, job);
  const parTotal = par * job.devTicks;
  const rd = job.D / parTotal;
  const rt = job.T / parTotal;
  const tw = techWeight(job.genre, job.genre2);
  const r = Math.pow(Math.max(rd, 0.02), 1 - tw) * Math.pow(Math.max(rt, 0.02), tw);
  const s0 = 10 * (1 - Math.exp(-0.85 * r));

  const compat = compatOf(job.topic, job.genre, job.genre2);
  const mCompat = 0.8 + (0.2 * (compat - 1)) / 3;
  const ff = focusFit(G, job);
  const mFit = 0.8 + 0.22 * ff.fit;
  const mAud = audFit(job.topic, job.genre, job.audience, job.genre2);
  const pf = platFit(job.platform, job.genre, job.genre2);
  const mPlat = clamp(1 + (pf - 1) * 0.2, 0.9, 1.03);
  const bugRatio = job.bugs / SCOPES[job.scope].bugs;
  const mBug = 1 - 0.25 * (1 - Math.exp(-0.9 * bugRatio));
  const rep = freshness(G, job);
  const mFresh = 1 - Math.min(0.14, rep * 0.05);
  const chain = job.chain || 0;
  const mSeq = chain >= 2 ? 1 - Math.min(0.1, (chain - 1) * 0.03) : 1;
  const cap = SCOPE_CAP[job.scope];
  const raw0 = s0 * mCompat * mFit * mAud * mPlat * mBug * mFresh * mSeq;
  // Små spel kan aldrig bli mästerverk: ambitionen avgör taket.
  const raw = softCap(raw0, cap);

  const lossBugs = s0 * (1 - mBug);
  const reviews = REVIEWERS.map((rv) => {
    const techDev = clamp(Math.log2(Math.max(rt, 0.1)), -1.5, 1.5) * 0.6;
    const desDev = clamp(Math.log2(Math.max(rd, 0.1)), -1.5, 1.5) * 0.6;
    let s = raw + rv.strict + rv.tech * techDev + rv.design * desDev - (rv.bug - 1) * lossBugs * 0.6 + gauss(G, 0, 0.32);
    s = clamp(roundHalf(s), 1, 10);
    return { id: rv.id, score: s };
  });
  const score = Math.round((reviews.reduce((a, x) => a + x.score, 0) / reviews.length) * 10) / 10;

  // Insikter
  const flags = [];
  const lvl = (v, good, bad) => (v >= good ? 1 : v <= bad ? -1 : 0);
  const fl = {
    compat: lvl(compat, 3.4, 2.0),
    focus: lvl(ff.fit, 0.82, 0.55),
    bugs: bugRatio < 0.25 ? 1 : bugRatio > 0.7 ? -1 : 0,
    tech: lvl(rt, 1.25, 0.65),
    design: lvl(rd, 1.25, 0.65),
    audience: lvl(mAud, 0.97, 0.9),
    platform: lvl(pf, 1.12, 0.85),
    scope: lvl(r, 1.3, 0.6),
    fresh: rep >= 2 ? -1 : 0,
  };
  for (const [k, v] of Object.entries(fl)) if (v) flags.push({ k, v, w: Math.abs(v) });
  const insights = [
    { k: 'compat', level: fl.compat, v: compat },
    { k: 'focus', level: fl.focus, v: ff.fit, over: ff.over, under: ff.under },
    { k: 'design', level: fl.design, v: rd },
    { k: 'tech', level: fl.tech, v: rt },
    { k: 'bugs', level: -fl.bugs, v: job.bugs, ratio: bugRatio },
    { k: 'platform', level: fl.platform, v: pf },
    { k: 'audience', level: fl.audience, v: mAud },
  ];
  insights.find((i) => i.k === 'bugs').level = fl.bugs;

  return {
    score: clamp(score, 1, 10),
    raw,
    reviews,
    flags,
    insights,
    parts: { rd, rt, r, s0, compat, mCompat, fit: ff.fit, mFit, mAud, mPlat, mBug, mFresh, mSeq, bugRatio, par, parTotal, rep, year },
    ff,
  };
}

// Skriv recensionstexter (språkberoende, så de byggs vid visning). Valen är stabila per spel men varierar mellan spel och recensenter.
const mix = (a, b, c) => (Math.imul(a + 1, 2654435761 | 0) ^ Math.imul(b + 1, 40503) ^ Math.imul(c + 1, 97)) >>> 0;
const capFirst = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const lcName = (name, key) => (TOPIC_PROPER[key].includes(name) || name === 'AI' ? name : name.toLowerCase());
export function reviewTexts(job, rep, lang) {
  const out = [];
  const key = lang === 'en' ? 'en' : 'sv';
  const gf = (GENRE_FORMS[job.genre] || {})[key] || { a: GENRE[job.genre].name[key], comp: GENRE[job.genre].name[key], pl: GENRE[job.genre].name[key] };
  const ins = (rep.insights || []).find((x) => x.k === 'focus');
  const vars = {
    aGenre: gf.a,
    genreComp: gf.comp,
    genres: gf.pl,
    topic: lcName(TOPIC[job.topic].name[key], key),
    over: ins?.over ? lcName(CAT[ins.over].name[key], key) : '…',
    under: ins?.under ? lcName(CAT[ins.under].name[key], key) : '…',
    scopeAdj: (SCOPE_ADJ[job.scope] || SCOPE_ADJ.small)[key],
  };
  const fill = (line) => capFirst(line.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m));
  // nådde storleken betygstaket? då kan en recensent säga det
  const p = rep.parts || {};
  const cap = SCOPE_CAP[job.scope];
  const raw0 = p.s0 * p.mCompat * p.mFit * p.mAud * (p.mPlat ?? 1) * (p.mBug ?? 1) * (p.mFresh ?? 1) * (p.mSeq ?? 1);
  const capped = cap < 10 && raw0 > 0 && raw0 - softCap(raw0, cap) >= 0.25;
  const flags = capped ? [{ k: 'cap', v: 1 }, ...(rep.flags || [])] : rep.flags || [];
  const usedFlags = new Set();
  const usedLines = new Set();
  const usedHeads = new Set();
  const pickLine = (pool, tag, salt) => {
    let idx = mix(job.id, salt, tag.length) % pool.length;
    for (let n = 0; n < pool.length && usedLines.has(tag + idx); n++) idx = (idx + 1) % pool.length;
    usedLines.add(tag + idx);
    return pool[idx];
  };
  rep.reviews.forEach((rv, i) => {
    const def = REVIEWERS[i];
    const tier = HEADLINES.find((x) => rv.score >= x.min);
    const h = tier[key];
    let hi = mix(job.id, i, 7) % h.length;
    for (let n = 0; n < h.length && usedHeads.has(tier.min + ':' + hi); n++) hi = (hi + 1) % h.length;
    usedHeads.add(tier.min + ':' + hi);
    const headline = h[hi];
    const pref = {
      bitbyte: ['tech', 'bugs', 'scope', 'platform'],
      gazette: ['cap', 'compat', 'scope', 'focus', 'audience'],
      pulse: ['design', 'focus', 'compat', 'fresh'],
      critic: ['bugs', 'compat', 'fresh', 'design', 'tech'],
    }[def.id];
    const good = rv.score >= 6.5;
    const fits = (f) => (good ? f.v > 0 : f.v < 0);
    const cands = flags.filter(fits);
    const pickF = cands.find((f) => pref.includes(f.k) && !usedFlags.has(f.k)) || cands.find((f) => !usedFlags.has(f.k)) || cands.find((f) => pref.includes(f.k)) || cands[0];
    let detail = '';
    if (pickF && DETAILS[pickF.k]?.[pickF.v > 0 ? '+' : '-']) {
      usedFlags.add(pickF.k);
      detail = fill(pickLine(DETAILS[pickF.k][pickF.v > 0 ? '+' : '-'][key], pickF.k + (pickF.v > 0 ? '+' : '-'), i));
    } else if (NEUTRAL[def.id]) detail = fill(pickLine(NEUTRAL[def.id][good ? '+' : '-'][key], def.id, i));
    out.push({ id: def.id, score: rv.score, headline, detail });
  });
  return out;
}
