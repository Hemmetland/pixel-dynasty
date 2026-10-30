import { clamp, fmtNum } from '../core/util.js';
import { gauss, hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { PLATFORM, PLATFORMS, setOwnPlatforms, potential, launchTime } from '../data/platforms.js';
import { HW_TYPES, HW_IDS, HW_CLASSES, HW_QUALITY, HW_ARCH, HW_PARTNERS, HW_PARTNER, ARCH_TYPES, PC_PARTS, PLAT_TYPES, PLAT_FEES } from '../data/hardware.js';
import { yearOf, yfOf, moneyScale, wageIndex, tOf, WEEKS_PER_YEAR, WEEKS_PER_MONTH } from './const.js';
import { unitRev } from './sales.js';
import { spend, earn, capacity } from './studio.js';
import { note } from './news.js';

// Egen hårdvara (balansunderlaget docs/HARDWARE_SPEC.md): med forskningen Hårdvarulabb får studion en hårdvaruavdelning
// som designar egna produkter vid sidan av spelen (den blockerar inte G.job). En produkt är ett designprojekt (design
// betalas per vecka, sedan en prototyp som kan misslyckas) som en extern partner tillverkar: du lägger order som betalas
// direkt och levereras efter ledtiden i takt med partnerns kapacitet. På marknaden avgör prestandan (mot marknaden just
// nu, den åldras), priset, tillgången (lager när efterfrågan finns) och kompatibiliteten hur stor andel du tar.
// Egna spel byggda med en motor som produkten är optimerad för säljer mer på pc, och dina hits på motorn säljer
// hårdvara. En bärbar enhet eller konsol blir en egen plattform (G.hw.plats) som växer med de sålda enheterna: dina spel
// kan släppas där utan licens, andra förlag betalar en licensavgift per vecka och egna hits säljer plattformen. Egen
// fabrik och leveranskedja finns inte. Allt ligger i G.hw och all slump kommer ur fröet (inte G.rng).
export const LAB_MAX = 3;
const LAB_COST = [0, 0, 400000, 2000000]; // utbyggnad till nivå 2 och 3, i 1990 års pengar
const LAB_RENT = 900; // per nivå och månad, i 1989 års löner
const LAB_SPEED = 0.1; // kortare designtid per nivå över den första
const GEN_COST = 0.6; // en ny generation på samma produktlinje kostar så mycket av den första
const GEN_WEEKS = 0.75;
const OWN_ARCH_COST = 1.4;
export const REP0 = 30;
const SHARE_STEP = 0.08; // andelen närmar sig målet så mycket per vecka
const BACKLOG_WEEKS = 6; // de första veckorna efter lanseringen väntar köparna (förbeställningar) när lagret är tomt
const BACKLOG_KEEP = 0.6;
export const DRIVER_COST = 4000; // drivrutinsteam per vecka, i 1996 års pengar
const DRIVER_MAX = 90;
const DRIVER_STEP = 0.25; // kompatibilitet per vecka
const DRIVER_BONUS = 15;
const REL0 = 50;
const OPT_PER = 0.25; // egna pc-spel på en optimerad motor säljer så mycket mer per andel av marknaden
const OPT_MAX = 0.1;
const HIT_BOOST = 0.08; // ett eget hit (8+) på motorn höjer efterfrågan på produkten
const HIT_MAX = 0.3;
const PART_SAVE = 0.05; // en speldator med egen komponent: lägre enhetskostnad per egen komponenttyp
export const CLEAR = 0.3; // osålt lager vid nedläggning säljs ut för den andelen av priset
export const AUTO_COVER = 6; // autobeställning: veckor av efterfrågan utöver ledtiden som ska finnas i lager och på väg
const AUTO_ORDER = 16; // autobeställning: veckor av efterfrågan per order
const ISSUE_WEEKS = 8; // ett beslut som inte tas inom så många veckor väljer det försiktiga alternativet
const BENCH_P = 0.2;
const BENCH_CAUGHT = 0.2;
const BENCH_SCORE = 0.5;
const BENCH_WEEKS = 26;
const DELAY_P = 0.03;
const FX_P = 0.003;
// Fasta händelser: kryptoboomen (grafikkort) och den globala chipbristen
const CRYPTO = [tOf(2017, 5), tOf(2018, 7, 2)];
const CHIPS = [tOf(2020, 2, 2), tOf(2022, 5)];
// Plattformar
export const PER_WEIGHT = 30000; // installerad bas per viktpoäng (Nova Prism 5 har vikt 80)
const WEIGHT_MAX = 90;
const THIRD = 40; // andra förlags spel på plattformen, i spelintäkt per viktpoäng och vecka (gånger licensavgiften och stödet)
export const PLAT_MIN = { handheld: 40000, console: 60000 }; // första ordern
const DEVKIT_MAX = 95;
const DEVKIT_BONUS = 15;
const BACKCOMPAT = 0.4; // en efterföljare med bakåtkompatibilitet börjar med så stor del av föregångarens bas
const BC_COST = 1.08;
const LOWPOW = 0.9;
const RIVAL_AGE = 0.5; // en ny generation hos konkurrenterna åldrar din plattform så många år
const CUT_P = 0.4; // en konkurrent sänker priset när din plattform kommer ut
const CUT_WEEKS = 26;
const HEAT_P = 0.15; // överhettning: konsol med toppprestanda och normal kvalitet, första året
const HEAT_WAR = 0.08; // extra garanti av hårdvaruintäkten i två år om du inte byter ut enheterna
const HEAT_FIX = 0.05; // utbytesprogrammet: så stor del av basen gånger enhetskostnaden
const EXCL_BOOST = 0.08; // ett eget spel på 8+ på plattformen säljer fler enheter (som ett hit på en optimerad motor)
const OPT_CAP = 1.65; // taket för motorns effekt när ett eget spel byggs med en ny egen motor för den egna plattformen
const OPT_AGE = 3;
export const canHw = (G) => !!G.u.flags.hw;
const rngFor = (G, key) => seeded(hashStr(`${G.seed || 0}:hw:${key}`));
const gaussFor = (G, key, m, s) => gauss({ rng: hashStr(`${G.seed || 0}:hw:${key}`) | 0 }, m, s);
// designkostnader följer prisnivån från produkttypens basår
const msRatio = (G, base) => moneyScale(yearOf(G.t)) / moneyScale(base);

function blank() {
  return { rev: 0, lic: 0, design: 0, proto: 0, make: 0, war: 0, roy: 0, drv: 0, lab: 0, issue: 0 };
}
// Avdelningen öppnas första veckan efter forskningen (eller i en gammal sparfil som har flaggan)
export function hwOf(G) {
  if (!G.hw) {
    G.hw = { t0: G.t, rep: REP0, lab: 1, chief: null, projects: [], products: [], orders: [], partners: {}, lines: {}, plats: [], m: blank(), lm: blank(), tot: blank() };
    note(G, 'news.hwLab', { studio: G.studio }, 'good');
    emit('hwOpen', G.hw);
  }
  return G.hw;
}
const book = (H, k, v) => {
  H.m[k] += v;
  H.tot[k] += v;
};
function pay(G, H, k, v, cat = 'hwMake') {
  if (v <= 0) return;
  spend(G, v, cat);
  book(H, k, v);
}

// ── Typer, partners, labbet och chefen ──────────────────────────
export const typeOpen = (G, id) => canHw(G) && !!G.u.flags['hw_' + id];
export const openTypes = (G) => HW_IDS.filter((id) => typeOpen(G, id));
export const partnerOpen = (G, id) => yearOf(G.t) >= HW_PARTNER[id].from;
export const openPartners = (G) => HW_PARTNERS.filter((p) => partnerOpen(G, p.id));
function partnerState(H, id) {
  return (H.partners[id] ||= { rel: REL0, short: 0, shortK: 1, fx: 1, fxUntil: 0 });
}
export const relOf = (G, id) => (G.hw ? partnerState(G.hw, id).rel : REL0);
export const cryptoOn = (t) => t >= CRYPTO[0] && t < CRYPTO[1];
export const chipsOn = (t) => t >= CHIPS[0] && t < CHIPS[1];
// partnerns kapacitet per vecka just nu: komponentbrist halverar den (en god relation halverar förlusten), chipbristen tar 40 %
export function partnerCap(G, id) {
  const P = HW_PARTNER[id];
  const S = G.hw ? partnerState(G.hw, id) : null;
  let k = 1;
  if (S && S.short > G.t) k *= S.rel > 70 ? 1 - (1 - S.shortK) / 2 : S.shortK;
  if (chipsOn(G.t)) k *= 0.6;
  return (P.cap / WEEKS_PER_YEAR) * k;
}

export const labSlots = (H) => H.lab;
export const labCost = (G) => (G.hw && G.hw.lab < LAB_MAX ? Math.round((LAB_COST[G.hw.lab + 1] * msRatio(G, 1990)) / 1000) * 1000 : 0);
export const labRent = (G, H = G.hw) => Math.round(LAB_RENT * H.lab * (wageIndex(yearOf(G.t)) / wageIndex(1989)));
export function upgradeLab(G) {
  const H = G.hw;
  if (!H || H.lab >= LAB_MAX) return false;
  const c = labCost(G);
  if (G.money < c) return 'money';
  pay(G, H, 'lab', c, 'hwDev');
  H.lab++;
  emit('hwLab', H);
  return true;
}
const skillBase = (year) => 9 + (year - 1980) * 1.45;
const lvl = (G, v) => clamp(v / skillBase(yearOf(G.t)) / 3, 0, 1);
// Hårdvaruchefen: Teknik ger prestanda (högst +5 %), Forskning sänker prototyprisken (högst 8 procentenheter)
export const chiefPerf = (G, H = G.hw) => (H && H.chief ? 0.05 * lvl(G, H.chief.tech) : 0);
export const chiefRisk = (G, H = G.hw) => (H && H.chief ? 0.08 * lvl(G, H.chief.research) : 0);
export const chiefRating = (G, st) => Math.round(((lvl(G, st.tech) + lvl(G, st.research)) / 2) * 100);
export const chiefCandidates = (G) => G.staff.filter((s) => !s.isFounder).sort((a, b) => b.tech + b.research - (a.tech + a.research));
// Chefen lämnar spelteamet; lönen betalas av hårdvaruavdelningen
export function setChief(G, staffId) {
  const H = G.hw;
  const st = G.staff.find((x) => x.id === staffId);
  if (!H || H.chief || !st || st.isFounder) return false;
  G.staff = G.staff.filter((x) => x.id !== staffId);
  H.chief = st;
  note(G, 'news.hwChief', { name: st.name }, 'info');
  emit('staffMoved', st);
  return true;
}
export function recallChief(G) {
  const H = G.hw;
  if (!H || !H.chief) return false;
  if (G.staff.length >= capacity(G)) return 'capacity';
  G.staff.push(H.chief);
  H.chief = null;
  emit('staffMoved', null);
  return true;
}

// ── Design ──────────────────────────────────────────────────────
export const CLS = Object.fromEntries(HW_CLASSES.map((c) => [c.id, c]));
const QUAL = Object.fromEntries(HW_QUALITY.map((c) => [c.id, c]));
const ARCH = Object.fromEntries(HW_ARCH.map((c) => [c.id, c]));
export const hasArch = (type) => ARCH_TYPES.has(type);
export const isPlat = (type) => PLAT_TYPES.has(type);
// egen arkitektur i en bärbar enhet eller konsol kräver Systemkretsar
export const archOpen = (G, type, arch) => hasArch(type) && (arch !== 'own' || !isPlat(type) || !!G.u.flags.hw_soc);
const archOf = (spec) => (hasArch(spec.type) ? ARCH[spec.arch || 'std'] : null);
const madeBefore = (H, type) => H.products.some((p) => p.type === type);
const nextGen = (H, type) => (H.lines[type] || 0) + 1;
export const hwName = (H, type, cls) => HW_TYPES[type].name(nextGen(H, type)) + CLS[cls].suffix;

export function designCost(G, spec) {
  const ty = HW_TYPES[spec.type];
  const gen = G.hw && madeBefore(G.hw, spec.type) ? GEN_COST : 1;
  const own = spec.arch === 'own' && hasArch(spec.type) ? OWN_ARCH_COST : 1;
  return Math.round((ty.design * CLS[spec.cls].design * gen * own * msRatio(G, ty.base)) / 1000) * 1000;
}
export const protoCost = (G, spec) => Math.round((HW_TYPES[spec.type].proto * Math.sqrt(CLS[spec.cls].design) * msRatio(G, HW_TYPES[spec.type].base)) / 1000) * 1000;
export function designWeeks(G, spec) {
  const ty = HW_TYPES[spec.type];
  const gen = G.hw && madeBefore(G.hw, spec.type) ? GEN_WEEKS : 1;
  const lab = 1 - LAB_SPEED * ((G.hw?.lab || 1) - 1);
  return Math.max(4, Math.round(ty.weeks * CLS[spec.cls].weeks * gen * lab));
}
// prototyprisken: prestandamålet minus chefens bonus
export const protoRisk = (G, spec) => Math.max(0.01, CLS[spec.cls].risk - chiefRisk(G));
// prestandan mot marknaden vid lanseringen, utan prototypens slump och partnerns nod
export function designPerf(G, spec) {
  const a = archOf(spec);
  return CLS[spec.cls].perf * (a ? a.perf : 1) * (1 + (G.perk.hwPerf || 0)) * (1 + chiefPerf(G));
}
export const baseCompat = (G, spec) => (archOf(spec) ? archOf(spec).compat : 70) + (G.u.flags[isPlat(spec.type) ? 'hw_devkit' : 'hw_driver'] ? (isPlat(spec.type) ? DEVKIT_BONUS : DRIVER_BONUS) : 0);
export const defectOf = (spec, partner, bad) => (QUAL[spec.qual || 'normal'].defect + HW_PARTNER[partner].defect) * (bad ? 2 : 1);

export function canDesign(G, spec) {
  if (!canHw(G)) return 'locked';
  const H = G.hw;
  if (!H) return 'locked';
  if (!typeOpen(G, spec.type) || !CLS[spec.cls] || !QUAL[spec.qual || 'normal']) return 'locked';
  if (spec.arch === 'own' && !archOpen(G, spec.type, 'own')) return 'locked';
  if (H.projects.length >= labSlots(H)) return 'slots';
  // en månads design ska finnas i kassan när projektet börjar
  if (G.money < (designCost(G, spec) / designWeeks(G, spec)) * WEEKS_PER_MONTH) return 'money';
  return true;
}
export function startDesign(G, spec) {
  const ok = canDesign(G, spec);
  if (ok !== true) return ok;
  const H = G.hw;
  const gen = nextGen(H, spec.type);
  const engine = spec.opt != null ? G.engines.find((e) => e.id === spec.opt) : null;
  const P = {
    id: G.uid++, type: spec.type, cls: spec.cls, qual: spec.qual || 'normal', arch: hasArch(spec.type) ? spec.arch || 'std' : null, opt: engine ? engine.id : null,
    name: HW_TYPES[spec.type].name(gen) + CLS[spec.cls].suffix, gen, t0: G.t, weeks: designWeeks(G, spec), done: 0, budget: designCost(G, spec), paid: 0,
    proto: protoCost(G, spec), state: 'design', paused: false, redo: 0, bad: false, perf: 0,
    // en efterföljare med bakåtkompatibilitet spelar föregångarens spel
    bc: isPlat(spec.type) && !!G.u.flags.hw_backcompat && H.plats.some((p) => p.kind === spec.type),
  };
  H.lines[spec.type] = gen;
  H.projects.push(P);
  emit('hwDesign', P);
  return true;
}
export const projectOf = (G, id) => G.hw?.projects.find((p) => p.id === id);
export function pauseDesign(G, id, on) {
  const P = projectOf(G, id);
  if (!P || P.state !== 'design') return false;
  P.paused = !!on;
  return true;
}
// Avbryt ett designprojekt: det som är betalt är borta
export function cancelDesign(G, id) {
  const H = G.hw;
  const P = projectOf(G, id);
  if (!P) return false;
  H.projects = H.projects.filter((p) => p !== P);
  if (H.lines[P.type] === P.gen) H.lines[P.type] = P.gen - 1;
  return true;
}
// Misslyckad prototyp: gör om (+25 % tid, +20 % kostnad, halva risken) eller skeppa ändå (dubbel felfrekvens)
export function resolveProto(G, id, choice) {
  const P = projectOf(G, id);
  if (!P || P.state !== 'fail') return false;
  if (choice === 'redo') {
    P.state = 'design';
    P.redo++;
    P.extra = Math.round(P.weeks * 0.25);
    P.weeks += P.extra;
    P.budget += Math.round(P.budget * 0.2);
    return true;
  }
  P.bad = true;
  P.state = 'ready';
  return true;
}
function finishDesign(G, H, P) {
  pay(G, H, 'proto', P.proto, 'hwDev');
  const risk = protoRisk(G, P) * (P.redo ? 0.5 : 1);
  P.perf = designPerf(G, P) * clamp(gaussFor(G, `perf:${P.id}:${P.redo}`, 1, 0.03), 0.92, 1.08);
  if (rngFor(G, `proto:${P.id}:${P.redo}`)() < risk) {
    P.state = 'fail';
    P.failT = G.t;
    note(G, 'news.hwFail', { name: P.name }, 'bad');
  } else {
    P.state = 'ready';
    note(G, 'news.hwProto', { name: P.name }, 'good');
  }
  emit('hwProto', P);
}

// ── Kostnad, pris, betyg och efterfrågan ────────────────────────
// egna komponenter på marknaden som en speldator byggs med
const ownParts = (G) => PC_PARTS.filter((ty) => G.hw && G.hw.products.some((p) => p.type === ty && p.state === 'market'));
function partsBoost(G, perf) {
  let best = perf;
  for (const ty of ownParts(G)) {
    for (const p of G.hw.products) if (p.type === ty && p.state === 'market') best = Math.max(best, 0.5 * perf + 0.5 * relPerf(G, p));
  }
  return best;
}
// enhetskostnad för produkten (eller ett projekt före lanseringen) hos partnern vid tiden t
export function unitCost(G, P, partner, t = G.t) {
  const ty = HW_TYPES[P.type];
  const S = G.hw ? partnerState(G.hw, partner) : { rel: REL0, fx: 1, fxUntil: 0 };
  const age = P.t != null ? Math.max(0, (t - P.t) / WEEKS_PER_YEAR) : 0;
  const parts = P.type === 'pc' ? Math.pow(1 - PART_SAVE, P.parts ? P.parts.length : ownParts(G).length) : 1;
  const fx = S.fxUntil > t ? S.fx : 1;
  const plat = (P.type === 'handheld' && G.u.flags.hw_lowpow ? LOWPOW : 1) * (P.bc ? BC_COST : 1);
  return ty.price * ty.unit * CLS[P.cls].unit * QUAL[P.qual || 'normal'].unit * HW_PARTNER[partner].cost * Math.max(0.5, 1 - (G.perk.hwCost || 0)) * parts * plat
    * Math.pow(1 - ty.fall, age) * (S.rel > 70 ? 0.97 : 1) * fx * (chipsOn(t) ? 1.15 : 1);
}
// priser slutar på 9 (tiotal, eller femtiotal över 600 $)
const roundPrice = (p) => {
  const step = p >= 600 ? 50 : 10;
  return Math.max(9, Math.round((p + 1) / step) * step - 1);
};
// förslagspriset: marknadens pris för prestandamålet
export const suggestPrice = (type, cls) => roundPrice(HW_TYPES[type].price * CLS[cls].price);
// prisstegen spelaren väljer mellan, kring förslagspriset
export const PRICE_STEPS = [0.7, 0.85, 1, 1.15, 1.3, 1.5];
export const priceSteps = (type, cls) => PRICE_STEPS.map((k) => roundPrice((suggestPrice(type, cls) + 1) * k));
// ett steg upp eller ned (ungefär 5 %) från ett pris, alltid till ett annat pris
export function stepPrice(p, dir) {
  const v = roundPrice(p * (1 + 0.05 * dir));
  return Math.max(9, v !== p ? v : p + dir * (p >= 600 ? 50 : 10));
}
// konkurrenternas nya generationer av samma slag sedan din plattform kom ut (var och en åldrar den ett halvår extra)
function rivalGens(P, t) {
  if (!isPlat(P.type) || P.t == null) return 0;
  const a = yfOf(P.t);
  const b = yfOf(t);
  let n = 0;
  for (const p of PLATFORMS) if (!p.own && p.kind === P.type && launchTime(p) > a && launchTime(p) <= b) n++;
  return n;
}
// prestanda mot marknaden just nu: den åldras från lanseringen
export const relPerf = (G, P, t = G.t) =>
  P.perf0 / (1 + HW_TYPES[P.type].decay * (Math.max(0, (t - (P.t ?? t)) / WEEKS_PER_YEAR) + RIVAL_AGE * rivalGens(P, t)));
export function scoreOf(G, P, t = G.t) {
  const cheat = P.cheat && P.cheat > t ? BENCH_SCORE : 0;
  const s = 5 + 8 * (relPerf(G, P, t) - 0.85) + 0.03 * (P.compat - 60) - 0.4 * Math.max(0, P.defect * 100 - 2) + cheat;
  return Math.round(clamp(s, 1, 10) * 10) / 10;
}
export const brandOf = (H) => 0.7 + (0.6 * H.rep) / 100;
export function marketSize(type, yf, t) {
  const pts = HW_TYPES[type].market;
  let v = pts[0][1];
  if (yf >= pts[pts.length - 1][0]) v = pts[pts.length - 1][1];
  else
    for (let i = 1; i < pts.length; i++) {
      if (yf < pts[i][0]) {
        const [y0, a] = pts[i - 1];
        const [y1, b] = pts[i];
        v = yf <= y0 ? a : a + ((b - a) * (yf - y0)) / (y1 - y0);
        break;
      }
    }
  if (type === 'gpu' && cryptoOn(t)) v *= 2;
  return v;
}
const refPrice = (type, t, P) => HW_TYPES[type].price * (type === 'gpu' && cryptoOn(t) ? 1.3 : 1) * (P && P.cut > t ? 0.85 : 1);
// målandelen för en produkt (före taket för alla dina produkter av samma typ)
export function targetShare(G, P, price = P.price, t = G.t) {
  const ty = HW_TYPES[P.type];
  const s = scoreOf(G, P, t);
  const pr = clamp(Math.pow(refPrice(P.type, t, P) / price, ty.elast), 0.05, 4);
  return ty.share * Math.exp(0.55 * (s - 6.5)) * pr * brandOf(G.hw) * (1 + (P.boost || 0)) * platPull(G, P);
}
// En plattform säljer på sina spel: fansen, andra förlags stöd och dina egna spel på den de senaste två åren
export function platPull(G, P) {
  if (!isPlat(P.type)) return 1;
  const fans = 1 + 0.1 * Math.log10(1 + G.fans / 10000);
  return fans * (0.6 + 0.5 * supportOf(G, P) + Math.min(0.2, 0.04 * ownGames(G, P)));
}
export const ownGames = (G, P) => (P.plat ? G.games.filter((g) => g.platform === P.plat && G.t - g.t < 2 * WEEKS_PER_YEAR).length : 0);
// julhandeln säljer dubbelt, januari och februari lite mindre
const season = (type, t) => {
  if (!isPlat(type)) return 1;
  const w = t % WEEKS_PER_YEAR;
  return w >= 44 ? 2 : w <= 8 ? 0.8 : 1;
};
// väntad efterfrågan per vecka när andelen nått målet (för förslag och autobeställning)
export const weeklyDemand = (G, P, price = P.price, t = G.t) => (marketSize(P.type, yfOf(t), t) / WEEKS_PER_YEAR) * Math.min(HW_TYPES[P.type].max, targetShare(G, P, price, t));

// En tänkt produkt av ett färdigt projekt (för förhandsvisningen i fönstret och lanseringen)
export function draftOf(G, J, partner = 'halden', price) {
  const pp = HW_PARTNER[partner];
  let perf = J.perf * (1 + pp.perf);
  if (J.type === 'pc') perf = partsBoost(G, perf);
  return {
    id: J.id, type: J.type, cls: J.cls, qual: J.qual, arch: J.arch, opt: J.opt, name: J.name, gen: J.gen, t: null, perf0: perf,
    compat: baseCompat(G, J), defect: defectOf(J, partner, J.bad), bad: J.bad, price: price ?? suggestPrice(J.type, J.cls), partner, boost: 0,
    parts: J.type === 'pc' ? ownParts(G) : undefined, bc: J.bc, fee: isPlat(J.type) ? 0.2 : undefined,
  };
}

// ── Lansering och order ─────────────────────────────────────────
export const productOf = (G, id) => G.hw?.products.find((p) => p.id === id);
const ordersOf = (H, P) => H.orders.filter((o) => o.p === P.id);
export const pipelineOf = (G, P) => (G.hw ? ordersOf(G.hw, P).reduce((a, o) => a + o.left, 0) : 0);
// förslag till orderstorlek: minsta ordern och ungefär 8, 16 och 26 veckors efterfrågan, avrundat
export function orderOptions(G, P, partner = P.partner, d = weeklyDemand(G, P, P.price), first = false) {
  const min = minOrder(P, partner, first);
  const nice = (v) => {
    const k = Math.pow(10, Math.max(2, Math.floor(Math.log10(Math.max(1, v))) - 1));
    return Math.round(v / k) * k;
  };
  const out = [min];
  for (const w of [8, 16, 26]) {
    const v = nice(d * w);
    if (v > out[out.length - 1] * 1.3) out.push(v);
  }
  return out;
}
// förslag till tillverkare för ett färdigt projekt: den billigaste vars minsta order räcker högst ett halvår och vars
// kapacitet räcker till efterfrågan, annars den första
export function suggestPartner(G, J, price = suggestPrice(J.type, J.cls)) {
  const open = openPartners(G).filter((p) => partnerFits(J.type, p.id));
  for (const p of open.slice().sort((a, b) => a.cost - b.cost)) {
    const d = weeklyDemand(G, draftOf(G, J, p.id, price), price);
    if (p.min <= d * 26 && d <= partnerCap(G, p.id) * 1.1) return p.id;
  }
  return open[0].id;
}
// en bärbar enhet eller konsol kräver en chipfabrik (inte monteringsfirman)
export const partnerFits = (type, id) => !isPlat(type) || HW_PARTNER[id].kind !== 'asm';
// minsta order: partnerns, och för en plattform en första order som räcker till en riktig lansering
export const minOrder = (P, partner, first = false) => Math.max(HW_PARTNER[partner].min, first && isPlat(P.type) ? PLAT_MIN[P.type] : 0);
export function orderCost(G, P, units, partner = P.partner) {
  return Math.round(units * unitCost(G, P, partner));
}
export function canOrder(G, P, units, partner = P.partner) {
  if (!P || P.state === 'ended') return false;
  if (!partnerOpen(G, partner) || !partnerFits(P.type, partner)) return 'locked';
  if (units < minOrder(P, partner, P.state === 'prod' && !P.sold && !pipelineOf(G, P))) return 'min';
  if (G.money < orderCost(G, P, units, partner)) return 'money';
  return true;
}
function placeOrder(G, H, P, units) {
  const pp = HW_PARTNER[P.partner];
  const unit = unitCost(G, P, P.partner);
  const cost = Math.round(units * unit);
  const late = rngFor(G, `late:${P.id}:${G.t}`)() < DELAY_P;
  const o = { id: G.uid++, p: P.id, partner: P.partner, units, left: units, at: G.t + Math.round(pp.lead * (late ? 1.5 : 1)), cost, unit };
  H.orders.push(o);
  pay(G, H, 'make', cost);
  P.cost += cost;
  if (late) note(G, 'news.hwDelay', { name: P.name, partner: pp.name }, 'bad', true);
  return o;
}
export function orderMore(G, id, units) {
  const P = productOf(G, id);
  const ok = canOrder(G, P, units);
  if (ok !== true) return ok;
  placeOrder(G, G.hw, P, units);
  return true;
}
// Lansera ett färdigt projekt: välj partner, pris och första ordern. Produkten kommer ut när första leveransen är klar.
export function launch(G, id, opts = {}) {
  const H = G.hw;
  const J = projectOf(G, id);
  if (!J || J.state !== 'ready') return false;
  const partner = opts.partner || suggestPartner(G, J);
  if (!partnerOpen(G, partner) || !partnerFits(J.type, partner)) return 'locked';
  const P = { ...draftOf(G, J, partner, opts.price), state: 'prod', auto: opts.auto !== false, stock: 0, back: 0, share: 0, dem: 0, sold: 0, rev: 0, cost: 0, dev: J.paid + J.proto, war: 0, roy: 0, lic: 0, peak: 0, drv: false, hist: [], tReady: G.t };
  const units = Math.max(minOrder(P, partner, true), Math.round(opts.units || 0));
  const ok = canOrder(G, P, units, partner);
  if (ok !== true) return ok;
  H.projects = H.projects.filter((p) => p !== J);
  H.products.push(P);
  placeOrder(G, H, P, units);
  emit('hwLaunch', P);
  return true;
}
export function setPrice(G, id, price) {
  const P = productOf(G, id);
  if (!P || P.state === 'ended' || !(price > 0)) return false;
  P.price = Math.round(price);
  return true;
}
export function setAuto(G, id, on) {
  const P = productOf(G, id);
  if (!P || P.state === 'ended') return false;
  P.auto = !!on;
  return true;
}
// Byt partner mitt i livscykeln: framtida order går dit, relationen med den gamla tar skada
export function setPartner(G, id, partner) {
  const P = productOf(G, id);
  if (!P || P.state === 'ended' || P.partner === partner || !partnerOpen(G, partner) || !partnerFits(P.type, partner)) return false;
  partnerState(G.hw, P.partner).rel = clamp(partnerState(G.hw, P.partner).rel - 5, 0, 100);
  P.partner = partner;
  P.defect = defectOf(P, partner, P.bad);
  return true;
}
export function setDriver(G, id, on) {
  const P = productOf(G, id);
  if (!P || P.state === 'ended' || (on && !G.u.flags[isPlat(P.type) ? 'hw_devkit' : 'hw_driver'])) return false;
  P.drv = !!on;
  return true;
}
export const driverCost = (G, P) => Math.round((DRIVER_COST * HW_TYPES[P.type].drv * moneyScale(yearOf(G.t))) / moneyScale(1996) / 10) * 10;
// Lägg ned: ej tillverkade order avbokas (halva pengarna tillbaka, relationen tar skada), lagret reas ut
export function discontinue(G, id, auto = false) {
  const H = G.hw;
  const P = productOf(G, id);
  if (!P || P.state === 'ended') return false;
  for (const o of ordersOf(H, P)) {
    if (o.left > 0) {
      const back = Math.round(o.left * o.unit * 0.5);
      if (back > 0) {
        earn(G, back, 'hwMake');
        book(H, 'make', -back);
        P.cost -= back;
      }
      partnerState(H, o.partner).rel = clamp(partnerState(H, o.partner).rel - 10, 0, 100);
    }
  }
  H.orders = H.orders.filter((o) => o.p !== P.id);
  if (P.stock > 0) {
    const v = Math.round(P.stock * P.price * CLEAR);
    earn(G, v, 'hardware');
    book(H, 'rev', v);
    P.rev += v;
    P.stock = 0;
  }
  P.state = 'ended';
  P.endT = G.t;
  P.share = 0;
  // plattformen lever vidare och tonar ut på ett par år, som konkurrenternas
  const pl = platOf(G, P);
  if (pl) pl.y1 = yfOf(G.t) + 2;
  note(G, 'news.hwEnd', { name: P.name, n: fmtNum(Math.round(P.sold)) }, 'info', auto);
  return true;
}
// Felbatch: återkalla (30 % av orderns värde, ryktet −5) eller låt bli (hälften av gångerna: ryktet −15 och en stämning
// på 10 % av orderns värde)
export const RECALL = 0.3;
export function resolveIssue(G, id, choice) {
  const H = G.hw;
  const P = productOf(G, id);
  if (!P || !P.issue) return false;
  const v = P.issue.value;
  if (P.issue.kind === 'heat') {
    // överhettningen: byt ut enheterna nu, eller betala högre garanti i två år
    if (choice === 'recall') {
      pay(G, H, 'issue', v);
      H.rep = clamp(H.rep - 5, 0, 100);
    } else {
      P.heat = G.t + 2 * WEEKS_PER_YEAR;
      H.rep = clamp(H.rep - 10, 0, 100);
    }
    P.issue = null;
    return true;
  }
  if (choice === 'recall') {
    pay(G, H, 'issue', Math.round(v * RECALL));
    H.rep = clamp(H.rep - 5, 0, 100);
  } else if (rngFor(G, `suit:${P.id}:${P.issue.t}`)() < 0.5) {
    pay(G, H, 'issue', Math.round(v * 0.1));
    H.rep = clamp(H.rep - 15, 0, 100);
    note(G, 'news.hwSuit', { name: P.name }, 'bad');
  }
  P.issue = null;
  return true;
}
// Benchmarkfrestelsen vid ett grafikkorts lansering: fuska (+0,5 i betyg ett halvår, men testarna kan avslöja det)
export function resolveBench(G, id, cheat) {
  const P = productOf(G, id);
  if (!P || P.bench !== 'offer') return false;
  P.bench = cheat ? 'cheat' : null;
  if (cheat) P.cheat = G.t + BENCH_WEEKS;
  return true;
}

// ── Veckan ──────────────────────────────────────────────────────
export function hwWeek(G) {
  if (!canHw(G)) return;
  const H = hwOf(G);
  H.plats ||= [];
  syncPlats(H);
  if (G.t === CRYPTO[0]) note(G, 'news.hwCrypto', {}, 'info', !H.products.some((p) => p.type === 'gpu'));
  if (G.t === CHIPS[0]) note(G, 'news.hwChips', {}, 'bad', !H.products.length);
  // partners: komponentbrist och valutasvängningar hos dem du har order hos
  for (const pp of HW_PARTNERS) {
    const S = partnerState(H, pp.id);
    if (!H.orders.some((o) => o.partner === pp.id)) continue;
    const r = rngFor(G, `p:${pp.id}:${G.t}`);
    if (S.short <= G.t && r() < pp.short) {
      S.short = G.t + 8 + Math.floor(r() * 13);
      S.shortK = 0.5;
      note(G, 'news.hwShort', { partner: pp.name }, 'bad');
    }
    if (S.fxUntil <= G.t && r() < FX_P) {
      S.fx = r() < 0.5 ? 0.9 : 1.1;
      S.fxUntil = G.t + 26;
    }
  }
  // design
  for (const J of H.projects.slice()) {
    if (J.state !== 'design' || J.paused) continue;
    const step = J.budget / J.weeks;
    if (G.money < step) continue;
    pay(G, H, 'design', step, 'hwDev');
    J.paid += step;
    J.done++;
    if (J.done >= J.weeks) finishDesign(G, H, J);
  }
  // leveranser: varje partner levererar äldsta ordern först, i takt med kapaciteten
  for (const pp of HW_PARTNERS) {
    let cap = partnerCap(G, pp.id);
    for (const o of H.orders) {
      if (o.partner !== pp.id || o.at > G.t || o.left <= 0 || cap <= 0) continue;
      const n = Math.min(o.left, Math.max(1, Math.floor(cap)));
      cap -= n;
      o.left -= n;
      const P = productOf(G, o.p);
      if (!P) continue;
      P.stock += n;
      if (P.state === 'prod') release(G, H, P);
      if (o.left <= 0) {
        const S = partnerState(H, pp.id);
        S.rel = clamp(S.rel + 2, 0, 100);
        if (!P.issue && rngFor(G, `batch:${o.id}`)() < 2 * P.defect) {
          P.issue = { kind: 'batch', units: o.units, value: o.cost, t: G.t };
          note(G, 'news.hwBatch', { name: P.name }, 'bad');
        }
      }
    }
  }
  H.orders = H.orders.filter((o) => o.left > 0);
  sell(G, H);
  platWeek(G, H);
  // lab och chef en gång i månaden
  if (G.t % WEEKS_PER_MONTH === 0) {
    pay(G, H, 'lab', labRent(G, H) + (H.chief ? H.chief.salary || 0 : 0), 'hwDev');
    H.lm = H.m;
    H.m = blank();
  }
}

function release(G, H, P) {
  P.state = 'market';
  P.t = G.t;
  const s = scoreOf(G, P);
  P.score0 = s;
  H.rep = clamp(H.rep + (s * 10 - H.rep) * 0.25, 0, 100);
  note(G, 'news.hwLaunch', { name: P.name, v: s.toFixed(1) }, s >= 7 ? 'good' : s < 5.5 ? 'bad' : 'info');
  if (P.type === 'gpu' && rngFor(G, `bench:${P.id}`)() < BENCH_P) P.bench = 'offer';
  if (isPlat(P.type)) openPlat(G, H, P);
  G.stats.hwLaunched = (G.stats.hwLaunched || 0) + 1;
  emit('hwRelease', P);
}

function sell(G, H) {
  const live = H.products.filter((p) => p.state === 'market');
  // målandelar, med taket för alla dina produkter av samma typ
  const tgt = new Map();
  const sum = {};
  for (const P of live) {
    const v = targetShare(G, P);
    tgt.set(P, v);
    sum[P.type] = (sum[P.type] || 0) + v;
  }
  const yf = yfOf(G.t);
  for (const P of live) {
    const ty = HW_TYPES[P.type];
    const k = sum[P.type] > ty.max ? ty.max / sum[P.type] : 1;
    P.share += (tgt.get(P) * k - P.share) * SHARE_STEP;
    const dem = (marketSize(P.type, yf, G.t) / WEEKS_PER_YEAR) * P.share * season(P.type, G.t);
    P.dem = dem;
    const want = dem + P.back;
    const n = Math.min(P.stock, want);
    P.stock -= n;
    const age = G.t - P.t;
    P.back = age < BACKLOG_WEEKS ? (want - n) * BACKLOG_KEEP : 0;
    if (want - n > 1 && age >= BACKLOG_WEEKS) {
      H.rep = clamp(H.rep - 0.15, 0, 100);
      if (!P.so) {
        P.so = true;
        note(G, 'news.hwSoldOut', { name: P.name }, 'bad');
      }
    } else if (P.stock > dem * 2) P.so = false;
    const rev = n * P.price;
    P.sold += n;
    P.rev += rev;
    P.peak = Math.max(P.peak, n);
    P.hist.push(Math.round(n));
    if (P.hist.length > WEEKS_PER_YEAR) P.hist.shift();
    if (rev > 0) {
      earn(G, rev, 'hardware');
      book(H, 'rev', rev);
      G.stats.hwUnits = (G.stats.hwUnits || 0) + n;
      if (P.type === 'pc' && P.parts && P.parts.length) H.pcParts = (H.pcParts || 0) + n;
      if (P.plat) P.base = (P.base || 0) + n;
    }
    // garanti (utbyten), returer vid låg kompatibilitet och royalty för köpt kärna
    const war = n * P.defect * unitCost(G, P, P.partner);
    const ret = (P.compat < 70 ? rev * (70 - P.compat) * 0.003 : 0) + (P.heat > G.t ? rev * HEAT_WAR : 0);
    const roy = P.arch === 'std' ? rev * HW_ARCH[0].royalty : 0;
    pay(G, H, 'war', war + ret);
    pay(G, H, 'roy', roy);
    P.war += war + ret;
    P.roy += roy;
    if (P.drv) {
      pay(G, H, 'drv', driverCost(G, P), 'hwDev');
      P.compat = Math.min(isPlat(P.type) ? DEVKIT_MAX : DRIVER_MAX, P.compat + DRIVER_STEP);
    }
    P.boost = (P.boost || 0) * 0.96;
    // beslut som ligger för länge: det försiktiga alternativet
    if (P.issue && G.t - P.issue.t >= ISSUE_WEEKS) resolveIssue(G, P.id, 'ignore');
    if (P.bench === 'offer' && age >= ISSUE_WEEKS) P.bench = null;
    if (P.heatAt === G.t && !P.issue) {
      P.issue = { kind: 'heat', value: Math.round(HEAT_FIX * (P.base || 0) * unitCost(G, P, P.partner)), t: G.t };
      note(G, 'news.hwHeat', { name: P.name }, 'bad');
    }
    if (P.bench === 'cheat' && P.cheat <= G.t) {
      P.bench = null;
      if (rngFor(G, `caught:${P.id}`)() < BENCH_CAUGHT) {
        H.rep = clamp(H.rep - 20, 0, 100);
        note(G, 'news.hwBench', { name: P.name }, 'bad');
      }
    }
    autoOrder(G, H, P);
    // livscykeln: utgången när lagret är tomt och inget är på väg, eller långt efter livscykeln
    const years = age / WEEKS_PER_YEAR;
    if ((years > ty.life && P.stock < 1 && !pipelineOf(G, P)) || years > ty.life * 2.5) discontinue(G, P.id, true);
  }
}

// Autobeställning: håll lager och order på väg för ledtiden plus några veckor, inte efter livscykeln
function autoOrder(G, H, P) {
  if (!P.auto || P.state !== 'market') return;
  const ty = HW_TYPES[P.type];
  const pp = HW_PARTNER[P.partner];
  const left = ty.life * WEEKS_PER_YEAR - (G.t - P.t);
  if (left <= pp.lead) return;
  const d = Math.max(P.dem, weeklyDemand(G, P) * 0.5);
  if (d <= 0) return;
  const have = P.stock + pipelineOf(G, P);
  if (have >= d * (pp.lead + AUTO_COVER)) return;
  const units = Math.max(pp.min, Math.round(Math.min(d * AUTO_ORDER, d * left)));
  // en minsta order som räcker längre än livscykeln: bara om det finns efterfrågan för halva
  if (units > d * left * 2) return;
  const cost = orderCost(G, P, units);
  if (G.money < cost) {
    if (!P.cash) note(G, 'news.hwCash', { name: P.name }, 'bad');
    P.cash = true;
    return;
  }
  P.cash = false;
  placeOrder(G, H, P, units);
}

// Ett eget spel släpps: pc-spel byggda med en motor som en av dina produkter är optimerad för säljer mer (ju större
// andel produkten har), och ett hit på motorn ger produkten ett lyft
export function hwRelease(G, game) {
  if (!G.hw) return;
  const pl = PLATFORM[game.platform];
  if (pl && pl.own) return platRelease(G, game, pl);
  if (!game.engineId || pl?.kind !== 'pc') return;
  const ps = G.hw.products.filter((p) => p.state === 'market' && p.opt === game.engineId);
  if (!ps.length) return;
  const share = ps.reduce((a, p) => a + p.share, 0);
  const mult = 1 + Math.min(OPT_MAX, OPT_PER * share);
  game.total *= mult;
  game.hwOpt = { name: ps[0].name, pct: Math.round((mult - 1) * 100) };
  if (game.score >= 8) for (const p of ps) p.boost = Math.min(HIT_MAX, (p.boost || 0) + HIT_BOOST);
  if (game.hwOpt.pct >= 1) note(G, 'news.hwOpt', { title: game.title, name: game.hwOpt.name, pct: game.hwOpt.pct }, 'good', true);
}

// Speldatorer med egna komponenter kommer med din butik förinstallerad: 0,02 i butikens räckviddsmål per 10 000 sålda, högst 0,1
export const hwReach = (G) => (G.hw ? Math.min(0.1, (0.02 * (G.hw.pcParts || 0)) / 10000) : 0);

// Samlat för fönstret, botten och testerna
export const hwNet = (G) => {
  const T = G.hw?.tot;
  return T ? T.rev + (T.lic || 0) - T.design - T.proto - T.make - T.war - T.roy - T.drv - T.lab - T.issue : 0;
};
export const productProfit = (P) => P.rev + (P.lic || 0) - P.dev - P.cost - P.war - P.roy;
// pengar som går åt per månad just nu (designprojekt, drivrutinsteam, labb och chef) för ekonomiöversikten
export function hwCostMonth(G) {
  const H = G.hw;
  if (!H) return 0;
  let w = 0;
  for (const J of H.projects) if (J.state === 'design' && !J.paused) w += J.budget / J.weeks;
  for (const P of H.products) if (P.state === 'market' && P.drv) w += driverCost(G, P);
  return Math.round(w * WEEKS_PER_MONTH + labRent(G, H) + (H.chief ? H.chief.salary || 0 : 0));
}

// ── Egna plattformar ────────────────────────────────────────────
// registret i data/platforms.js ska peka på just det här spelets plattformsobjekt (efter en laddning eller ett nytt spel)
function syncPlats(H) {
  const own = PLATFORMS.filter((p) => p.own);
  if (own.length !== H.plats.length || H.plats.some((p, i) => own[i] !== p)) setOwnPlatforms(H.plats);
}
export const platOf = (G, P) => (P && P.plat && G.hw ? G.hw.plats.find((p) => p.id === P.plat) : null);
export const productOfPlat = (G, id) => G.hw?.products.find((p) => p.plat === id) || null;
// Generationen som plattformen tävlar i: den bästa konsolgenerationen på marknaden (en lägre för en bärbar enhet), en
// lägre till för Budget
function platTierAt(G, type, cls) {
  const yf = yfOf(G.t);
  let best = 1;
  for (const p of PLATFORMS) if (!p.own && p.kind === 'console' && potential(p, yf) > 12) best = Math.max(best, p.tier);
  return Math.max(1, best - (type === 'handheld' ? 1 : 0) - (cls === 'budget' ? 1 : 0));
}
const PLAT_BIAS = {
  budget: { casual: 1.3, simulation: 1.1, shooter: 0.75 },
  top: { shooter: 1.15, action: 1.1, racing: 1.1 },
  handheld: { casual: 1.2, rpg: 1.1, adventure: 1.05, racing: 0.85, shooter: 0.8 },
};
// Produkten kommer ut: plattformen läggs till i spelet (vikt efter installerad bas), med föregångarens spelare om den är
// bakåtkompatibel. En konkurrent kan sänka priset, och en het konsol kan överhettas första året.
function openPlat(G, H, P) {
  const yf = yfOf(G.t);
  const prev = H.plats.filter((p) => p.kind === P.type).pop();
  const prevP = prev ? productOfPlat(G, prev.id) : null;
  P.base = P.bc && prevP ? Math.round(BACKCOMPAT * (prevP.base || 0)) : 0;
  const bias = P.cls === 'budget' ? PLAT_BIAS.budget : P.cls === 'top' ? PLAT_BIAS.top : P.type === 'handheld' ? PLAT_BIAS.handheld : {};
  const y0 = Math.floor(yf);
  const pl = {
    id: `own${P.id}`, name: P.name, maker: G.studio, kind: P.type, glyph: null, color: HW_TYPES[P.type].color, y0, m0: (yf - y0) * 12, y1: 2200,
    weight: Math.min(WEIGHT_MAX, P.base / PER_WEIGHT), tier: platTierAt(G, P.type, P.cls), license: 0, bias,
    desc: P.type === 'handheld'
      ? { sv: 'Studions egen bärbara spelenhet. Dina spel kräver ingen licens här.', en: 'Your studio\'s own handheld. Your games need no license here.' }
      : { sv: 'Studions egen konsol. Dina spel kräver ingen licens här.', en: 'Your studio\'s own console. Your games need no license here.' },
    own: true, hw: P.id,
  };
  P.plat = pl.id;
  H.plats.push(pl);
  setOwnPlatforms(H.plats);
  if (!G.licenses.includes(pl.id)) G.licenses.push(pl.id);
  note(G, 'news.hwPlat', { name: P.name }, 'platform');
  const r = rngFor(G, `plat:${P.id}`);
  if (r() < CUT_P) {
    P.cut = G.t + CUT_WEEKS;
    note(G, 'news.hwCut', { name: P.name }, 'bad', true);
  }
  if (P.type === 'console' && P.cls === 'top' && P.qual === 'normal' && r() < HEAT_P) P.heatAt = G.t + 6 + Math.floor(r() * 40);
}
// andra förlags stöd för plattformen (0–1): kompatibiliteten, avgiften och storleken; Utvecklarprogrammet höjer det
export function supportOf(G, P, fee = P.fee ?? 0.2) {
  const pl = platOf(G, P);
  const w = pl ? pl.weight : 0;
  return clamp(0.6 * (P.compat / 70) * Math.pow(0.2 / fee, 0.8) * Math.min(1, w / 30) * (G.u.flags.hw_devkit ? 1.2 : 1), 0, 1);
}
// licensintäkten per vecka från andra förlags spel på plattformen (den tonar ut med plattformen)
export function platRoyalty(G, P, fee = P.fee ?? 0.2) {
  const pl = platOf(G, P);
  if (!pl) return 0;
  return fee * THIRD * potential(pl, yfOf(G.t)) * unitRev(yearOf(G.t)) * supportOf(G, P, fee);
}
export function setPlatFee(G, id, fee) {
  const P = productOf(G, id);
  if (!P || !P.plat || !PLAT_FEES.includes(fee)) return false;
  P.fee = fee;
  return true;
}
function platWeek(G, H) {
  for (const pl of H.plats) {
    const P = productOfPlat(G, pl.id);
    if (!P) continue;
    pl.weight = Math.min(WEIGHT_MAX, (P.base || 0) / PER_WEIGHT);
    const v = platRoyalty(G, P);
    if (v <= 0) continue;
    earn(G, v, 'hwLic');
    book(H, 'lic', v);
    P.lic = (P.lic || 0) + v;
  }
}
// Ett eget spel på den egna plattformen: ett hit säljer fler enheter
function platRelease(G, game, pl) {
  const P = productOfPlat(G, pl.id);
  if (!P) return;
  P.games = (P.games || 0) + 1;
  if (game.score >= 8 && P.state === 'market') {
    P.boost = Math.min(HIT_MAX, (P.boost || 0) + EXCL_BOOST);
    note(G, 'news.hwExcl', { title: game.title, name: P.name }, 'good', true);
  }
}
// Ett eget spel för den egna plattformen med en egen motor som är högst tre år gammal: motorn ger mer (taket 1,65 i
// stället för 1,4) och spelet får färre buggar
export function ownPlatOpt(G, J) {
  const pl = PLATFORM[J.platform];
  if (!pl || !pl.own || J.engineId == null) return false;
  const e = G.engines.find((x) => x.id === J.engineId);
  return !!e && yfOf(G.t) - e.built <= OPT_AGE;
}
export const engineCap = (G, J) => (ownPlatOpt(G, J) ? OPT_CAP : 1.4);
