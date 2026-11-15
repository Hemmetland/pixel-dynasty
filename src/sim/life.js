// Livet i studion: ett flöde av små, synliga händelser som scenerna (studion, Skapa spel, hårdvarulabbet och fabriken) kan visa.
// Varje händelse ("beat") kommer ur en verklig ändring i simen: en bugg som hittas, en idé, ett kickoff-möte, en leverans till lagret.
// Inget här påverkar spelets utfall: händelserna läser bara, och alla val görs med hashStr (aldrig G.rng), så betyg, pengar och
// balans är desamma med eller utan flödet. Flödet sparas som de senaste händelserna i G.life (en äldre sparning får det vid behov).
//
// Bussen: emit('life', beat) för varje ny händelse. Scenerna lyssnar på den medan de är öppna och läser lifeState(G, 'dev' | 'hw')
// för att visa rätt läge när de öppnas mitt i ett projekt. lifeLog(G, sc, sedanN) ger loggen och lifeText(beat) färdig text.
//
// beat = { n, t (G.t), k (sort), sc ('dev' | 'hw' | 'studio'), s (personalens id, 0 om ingen), who (förnamn), g (spelets eller
// produktens namn), a (ett tal: antal, betyg eller enheter), v (textvariant) }
import { emit } from '../core/bus.js';
import { t, L } from '../core/i18n.js';
import { hashStr } from '../core/rng.js';
import { fmtFull } from '../core/util.js';
import { workers, fatigueOver } from './people.js';
import { TICKS_PER_WEEK, WEEKS_PER_YEAR } from './const.js';
import { FACILITIES } from './studio.js'; // bara i lifeText (vid anrop), så importcykeln gör inget

export const LIFE_MAX = 30; // så många händelser sparas
// Sorterna. sc: vilken scen de hör till. v: antal textvarianter (life.<sort>.<0..v-1> i strings.js). gap: minsta antal tick mellan två av
// samma sort (en fjärdedels vecka per tick), så att en tät ström som buggar inte fyller loggen.
export const LIFE_KINDS = {
  // spelutveckling
  idea: { sc: 'dev', v: 3, gap: 0 }, // en snilleblixt (a = poäng)
  bug: { sc: 'dev', v: 3, gap: 6 }, // en bugg hittades (a = antal)
  fix: { sc: 'dev', v: 3, gap: 6 }, // buggar rättades i slutputsen (a = antal)
  phase: { sc: 'dev', v: 2, gap: 0 }, // kickoff för en ny fas (a = 1-3)
  quarter: { sc: 'dev', v: 2, gap: 0 }, // en fjärdedel av utvecklingen klar
  half: { sc: 'dev', v: 2, gap: 0 }, // halvvägs i utvecklingen
  almost: { sc: 'dev', v: 2, gap: 0 }, // tre fjärdedelar klara
  ad: { sc: 'dev', v: 2, gap: 0 }, // en reklamkampanj rullar ut
  tired: { sc: 'dev', v: 3, gap: 8 }, // någon är slut
  crunch: { sc: 'dev', v: 2, gap: 0 }, // övertid på
  relax: { sc: 'dev', v: 2, gap: 0 }, // övertid av
  done: { sc: 'dev', v: 2, gap: 0 }, // utvecklingen klar (a = buggar kvar)
  launch: { sc: 'dev', v: 3, gap: 0 }, // släpp (a = betyg)
  chart: { sc: 'dev', v: 2, gap: 0 }, // ett spel i toppen av listan
  sold: { sc: 'dev', v: 3, gap: 0 }, // första försäljningsveckan är klar (a = sålda exemplar)
  disc: { sc: 'dev', v: 2, gap: 0 }, // guld- eller platinaskiva
  contract: { sc: 'dev', v: 2, gap: 0 }, // ett uppdrag åt någon annan är klart (a = 1 lyckat, 0 misslyckat)
  engine: { sc: 'dev', v: 2, gap: 0 }, // en egen spelmotor är klar
  research: { sc: 'studio', v: 2, gap: 0 }, // labbet har klarat en forskning (g = namnet)
  pizza: { sc: 'dev', v: 2, gap: 12 }, // pizza till teamet under övertid
  // studion
  hired: { sc: 'studio', v: 3, gap: 0 },
  anniv: { sc: 'studio', v: 2, gap: 0 }, // en medarbetare firar år i studion (a = antal år)
  party: { sc: 'studio', v: 2, gap: 0 }, // fest efter ett riktigt bra släpp
  visitor: { sc: 'studio', v: 2, gap: 0 }, // en journalist eller gäst hälsar på efter ett bra spel
  fans: { sc: 'studio', v: 2, gap: 0 }, // fansen skickar brev när fansen nått en ny nivå (a = antal fans)
  left: { sc: 'studio', v: 2, gap: 0 },
  built: { sc: 'studio', v: 2, gap: 0 },
  // hårdvara
  hwStart: { sc: 'hw', v: 2, gap: 0 }, // en konstruktion påbörjas
  hwHalf: { sc: 'hw', v: 2, gap: 0 }, // ritningarna halvvägs
  hwProto: { sc: 'hw', v: 2, gap: 0 }, // provserien klar (a = 1 godkänd, 0 misslyckad)
  hwLeak: { sc: 'hw', v: 2, gap: 0 }, // ritningarna läcker
  hwParts: { sc: 'hw', v: 3, gap: 0 }, // en leverans till lagret (a = enheter)
  hwShort: { sc: 'hw', v: 2, gap: 0 }, // komponentbrist hos en partner (g = partnern)
  hwBatch: { sc: 'hw', v: 2, gap: 0 }, // en felaktig serie
  hwLaunch: { sc: 'hw', v: 3, gap: 0 }, // produkten når butikerna (a = betyg)
  hwRev: { sc: 'hw', v: 2, gap: 0 }, // en starkare version klar
  hwEnd: { sc: 'hw', v: 2, gap: 0 }, // en produkt läggs ned
};

export const lifeOf = (G) => G.life || (G.life = { n: 0, last: {}, items: [] });
const nowTick = (G) => G.t * TICKS_PER_WEEK + (G.tick || 0);
export const lifeName = (s) => (s && s.name ? String(s.name).split(' ')[0] : '');

// Välj en av flera (personal, projekt) utan slump ur G.rng: samma tillstånd ger samma val.
export function lifePick(G, arr, key) {
  if (!arr || !arr.length) return null;
  return arr[hashStr(`${G.seed || 0}:life:${key}:${nowTick(G)}`) % arr.length];
}

// Skapa en händelse. d: { staff (personalens objekt), g, a, v (textvariant; annars väljs den med hashStr) }. Returnerar händelsen, eller null om den dämpades eller sorten är okänd.
export function beat(G, k, d = {}) {
  const K = LIFE_KINDS[k];
  if (!K) return null;
  const LF = lifeOf(G);
  const now = nowTick(G);
  if (K.gap && now - (LF.last[k] ?? -1e9) < K.gap) return null;
  LF.last[k] = now;
  const n = ++LF.n;
  const s = d.staff || null;
  const item = { n, t: G.t, k, sc: K.sc, s: s ? s.id : 0, who: lifeName(s), g: d.g ? (typeof d.g === 'object' ? L(d.g) : String(d.g)) : '', a: d.a == null ? 0 : d.a, v: d.v != null ? Math.max(0, Math.min(K.v - 1, d.v)) : hashStr(`${G.seed || 0}:life:${k}:${n}`) % K.v };
  LF.items.push(item);
  if (LF.items.length > LIFE_MAX) LF.items.shift();
  emit('life', item);
  return item;
}

// De senaste händelserna för en scen (sc utelämnad = alla), nyast sist. since: bara de med högre löpnummer än så.
export function lifeLog(G, sc, since = 0) {
  const LF = G.life;
  if (!LF) return [];
  return LF.items.filter((b) => b.n > since && (!sc || b.sc === sc));
}
// Färdig text på spelarens språk
const NUM_KINDS = new Set(['sold', 'hwParts', 'fans']); // stora tal skrivs med tusentalsavgränsare
export const lifeText = (b) => t(`life.${b.k}.${b.v}`, { who: b.who || t('life.someone'), g: b.k === 'built' && FACILITIES[b.g] ? L(FACILITIES[b.g].name) : b.g, a: NUM_KINDS.has(b.k) ? fmtFull(b.a) : b.a });

// Veckovis: den som är mest utsliten under ett pågående projekt. (De andra händelserna skapas där de sker: dev.js, hardware.js,
// people.js, studio.js och charts.js.)
const FAN_STEPS = [1e4, 5e4, 1e5, 5e5, 1e6, 5e6, 1e7];
export function lifeWeek(G) {
  const J = G.job;
  if (J && J.kind === 'game' && J.state === 'dev') {
    let worst = null;
    for (const w of workers(G)) if (fatigueOver(w) > 0 && (!worst || (w.fatigue || 0) > (worst.fatigue || 0))) worst = w;
    if (worst) beat(G, 'tired', { staff: worst, g: J.title });
    // pizza till teamet: under övertid var fjärde vecka i snitt, valt med hashStr
    if (J.crunch && hashStr(`${G.seed || 0}:life:pizza:${G.t}`) % 4 === 0) beat(G, 'pizza', { g: J.title });
  }
  // jubileer: den som varit i studion ett helt antal år (grundaren räknas från start)
  for (const s of G.staff) {
    const yrs = Math.floor((G.t - (s.hired || 0)) / WEEKS_PER_YEAR);
    if (yrs >= 1 && (G.t - (s.hired || 0)) % WEEKS_PER_YEAR === 0 && !s.away) beat(G, 'anniv', { staff: s, a: yrs });
  }
  // efter ett bra släpp: fest veckan efter försäljningsstarten, en gäst på besök veckan därpå
  for (const g of G.games) {
    if (g.auto || g.expansionOf) continue;
    const age = G.t - g.t;
    if (age === 2 && g.score >= 8) beat(G, 'party', { g: g.title, a: Math.round(g.score * 10) / 10 });
    if (age === 4 && g.score >= 7.5) beat(G, 'visitor', { g: g.title });
  }
  // fansen: ett brev för varje ny nivå
  const LF = lifeOf(G);
  const fi = FAN_STEPS.filter((x) => G.fans >= x).length;
  if (LF.fa === undefined) LF.fa = fi; // en sparning eller ett nytt spel börjar räkna nu
  else if (fi > LF.fa) {
    LF.fa = fi;
    beat(G, 'fans', { a: FAN_STEPS[fi - 1] });
  }
}

// ── Ögonblicksbilder för scenerna ──
// dev: spelutvecklingen nu. active = ett projekt pågår; phase 0-3 (3 = slutputs); pct 0-1 av hela utvecklingen (slutputsen räknas som
// de sista 15 procenten av stapeln); crew = de som arbetar.
export function lifeState(G, sc) {
  if (sc === 'hw') return hwState(G);
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  const crew = workers(G).map((w) => ({ id: w.id, name: lifeName(w), mood: Math.round(w.mood), fatigue: Math.round((w.fatigue || 0) * 10) / 10, trait: w.trait || null, away: !!w.away }));
  if (!J) return { active: false, phase: 0, pct: 0, bugs: 0, crunch: false, title: '', crew };
  const dev = J.state === 'dev';
  const build = Math.min(1, J.ticks / Math.max(1, J.devTicks));
  const pct = J.phase >= 3 ? 0.85 + 0.15 * Math.min(1, J.polishDone / Math.max(1, J.polishTicks)) : 0.85 * build;
  return { active: dev, phase: J.phase, pct: dev ? pct : 1, bugs: Math.round(J.bugs), crunch: !!J.crunch, title: J.title || '', hype: Math.round(J.hype || 0), report: J.state === 'report', crew };
}
function hwState(G) {
  const H = G.hw;
  if (!H) return { open: false, designing: [], testing: [], prod: [], orders: [], market: 0, fab: 0, lab: 0, crew: [] };
  const crew = H.chief ? [{ id: H.chief.id, name: lifeName(H.chief), chief: true }] : [];
  return {
    open: true,
    designing: H.projects.filter((p) => p.state === 'design').map((p) => ({ id: p.id, name: p.name, type: p.type, pct: Math.min(1, p.done / Math.max(1, p.weeks)), paused: !!p.paused })),
    testing: H.projects.filter((p) => p.state === 'fail' || p.state === 'ready').map((p) => ({ id: p.id, name: p.name, type: p.type, state: p.state })),
    prod: H.products.filter((p) => p.state === 'prod').map((p) => ({ id: p.id, name: p.name, type: p.type, stock: p.stock || 0, sold: p.sold || 0 })),
    orders: H.orders.map((o) => ({ p: o.p, units: o.units, left: o.left, partner: o.partner })),
    market: H.products.filter((p) => p.state === 'market').length,
    fab: (H.fab && H.fab.lvl) || 0,
    lab: H.lab || 0,
    crew,
  };
}
