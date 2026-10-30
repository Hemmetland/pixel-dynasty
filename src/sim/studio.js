import { clamp } from '../core/util.js';
import { emit } from '../core/bus.js';
import { yearOf, moneyScale } from './const.js';
import { t } from '../core/i18n.js';
import { note } from './news.js';

// ── Kontor ───────────────────────────────────────────────────────
// Att flytta till ett större kontor är en milstolpe. Utöver pengar (cost) krävs:
//   fans  = fans, så att studion har en publik som bär det större kontoret
//   games = antal utgivna spel (erfarenhet), staff = antal anställda inkl. grundaren (de nya
//   skrivborden ska verkligen behövas), avg = snittbetyg på de senaste OFFICE_AVG_N spelen,
//   year  = tidigast det här året (branschens takt, hindrar att man rusar förbi sin tid).
// Alla krav och kostnader för kontoren står i den här tabellen, så att takten är lätt att justera.
export const OFFICE_AVG_N = 4;
export const TIERS = [
  { id: 0, key: 'garage', floors: 1, desks: 2, slots: 1, deskPerFloor: 2, cost: 0, rent: 0, fans: 0, games: 0, staff: 0, avg: 0, year: 0,
    name: { sv: 'Garaget', en: 'The Garage' },
    desc: { sv: 'Där alla stora drömmar börjar. Kallt på vintern.', en: 'Where all big dreams begin. Cold in winter.' } },
  { id: 1, key: 'office', floors: 1, desks: 5, slots: 2, deskPerFloor: 5, cost: 22000, rent: 700, fans: 0, games: 3, staff: 2, avg: 5.5, year: 1982,
    name: { sv: 'Litet kontor', en: 'Small Office' },
    desc: { sv: 'Ett riktigt kontor med skyltfönster. Plats för fem.', en: 'A real office with a street sign. Room for five.' } },
  { id: 2, key: 'floors2', floors: 2, desks: 10, slots: 4, deskPerFloor: 5, cost: 250000, rent: 6000, fans: 1200, games: 8, staff: 5, avg: 6.5, year: 1987,
    name: { sv: 'Tvåvåningsstudio', en: 'Two-Floor Studio' },
    desc: { sv: 'Tak över huvudet, lab och ett kaffehörn värt namnet.', en: 'A roof, a lab and a coffee corner worth the name.' } },
  { id: 3, key: 'floors3', floors: 3, desks: 15, slots: 6, deskPerFloor: 5, cost: 1600000, rent: 30000, fans: 14000, games: 14, staff: 10, avg: 7, year: 1994,
    name: { sv: 'Studiohuset', en: 'Studio House' },
    desc: { sv: 'Glasfasad, takterrass och en ordentlig logotyp.', en: 'Glass facade, roof terrace and a proper logo.' } },
  { id: 4, key: 'floors4', floors: 4, desks: 24, slots: 8, deskPerFloor: 6, cost: 8000000, rent: 60000, fans: 60000, games: 21, staff: 15, avg: 7.3, year: 2002,
    name: { sv: 'Spelfabriken', en: 'The Game Factory' },
    desc: { sv: 'Fyra våningar av kreativt kaos.', en: 'Four floors of creative chaos.' } },
  { id: 5, key: 'floors6', floors: 4, desks: 36, slots: 12, deskPerFloor: 9, cost: 25000000, rent: 100000, fans: 150000, games: 26, staff: 24, avg: 7.8, year: 2011,
    name: { sv: 'Dynastitornet', en: 'Dynasty Tower' },
    desc: { sv: 'Ett torn med ditt namn på. Du har gjort det.', en: 'A tower with your name on it. You made it.' } },
];
export const tierOf = (G) => TIERS[G.office.tier];
export const office = tierOf;
export const capacity = (G) => TIERS[G.office.tier].desks;

export const FACILITIES = {
  coffee: { id: 'coffee', glyph: 'f_coffee', cost: 2500, rent: 90, name: { sv: 'Kaffehörna', en: 'Coffee Corner' },
    desc: { sv: 'Bättre humör. Stabilare arbetsdagar.', en: 'Better mood. Steadier workdays.' },
    eff: { sv: '+4 humör per nivå', en: '+4 morale per level' } },
  lab: { id: 'lab', glyph: 'f_lab', cost: 7000, rent: 250, name: { sv: 'Forskningslabb', en: 'Research Lab' },
    desc: { sv: 'Mer forskning och fler samtidiga projekt.', en: 'More research and more parallel projects.' },
    eff: { sv: '+20% FP och +1 forskningsplats per nivå', en: '+20% RP and +1 research slot per level' } },
  qa: { id: 'qa', glyph: 'f_qa', cost: 9000, rent: 400, name: { sv: 'QA-labb', en: 'QA Lab' },
    desc: { sv: 'Buggar hittas och fixas snabbare.', en: 'Bugs are found and fixed faster.' },
    eff: { sv: '+30% buggfix, −6% nya buggar per nivå', en: '+30% bug fixing, −6% new bugs per level' } },
  training: { id: 'training', glyph: 'f_training', cost: 8000, rent: 300, name: { sv: 'Utbildningsrum', en: 'Training Room' },
    desc: { sv: 'Fler kan gå kurs samtidigt, och kurserna blir kortare.', en: 'More can train at once, and courses run shorter.' },
    eff: { sv: '+1 kursplats och kortare kurser per nivå', en: '+1 course seat and shorter courses per level' } },
  gameroom: { id: 'gameroom', glyph: 'f_gameroom', cost: 12000, rent: 380, name: { sv: 'Spelrum', en: 'Game Room' },
    desc: { sv: 'Arkad, sittsäckar och ett bordsfotbollsbord.', en: 'Arcade, beanbags and a foosball table.' },
    eff: { sv: '+6 humör per nivå', en: '+6 morale per level' } },
  marketing: { id: 'marketing', glyph: 'f_marketing', cost: 14000, rent: 500, name: { sv: 'Marknadsavdelning', en: 'Marketing Dept' },
    desc: { sv: 'Billigare kampanjer som ger mer hype.', en: 'Cheaper campaigns that produce more hype.' },
    eff: { sv: '−10% kostnad och +12% hype per nivå', en: '−10% cost and +12% hype per level' } },
  server: { id: 'server', glyph: 'f_server', cost: 22000, rent: 700, name: { sv: 'Serverrum', en: 'Server Room' },
    desc: { sv: 'Drift för online-spel och snabbare byggen.', en: 'Ops for online games and faster builds.' },
    eff: { sv: '+4% tekniskt arbete och mer plats för onlinespelare per nivå', en: '+4% technical output and room for more online players per level' } },
};
export const FAC_IDS = Object.keys(FACILITIES);
export const FAC_MAX = 3;

export function facLevel(G, id) {
  return G.office.fac[id] ? G.office.fac[id].lvl : 0;
}
export const facCount = (G) => Object.keys(G.office.fac).length;
export function facCost(G, id) {
  const f = FACILITIES[id];
  const lvl = facLevel(G, id);
  return Math.round((f.cost * Math.pow(lvl + 1, 1.8) * moneyScale(yearOf(G.t))) / 100) * 100;
}
export function facUpkeep(G) {
  let s = 0;
  for (const [id, f] of Object.entries(G.office.fac)) s += FACILITIES[id].rent * f.lvl * moneyScale(yearOf(G.t));
  return Math.round(s);
}
export function buildFacility(G, id) {
  const f = FACILITIES[id];
  if (!f || !G.u.facs.includes(id)) return false;
  const lvl = facLevel(G, id);
  if (lvl >= FAC_MAX) return false;
  if (lvl === 0 && facCount(G) >= tierOf(G).slots) return t('err.slots');
  const cost = facCost(G, id);
  if (G.money < cost) return t('err.money');
  spend(G, cost, 'facilities');
  if (lvl === 0) {
    const used = new Set(Object.values(G.office.fac).map((x) => x.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    G.office.fac[id] = { lvl: 1, slot };
  } else G.office.fac[id].lvl++;
  emit('facility', { id, lvl: facLevel(G, id) });
  return true;
}
export function nextTier(G) {
  return TIERS[G.office.tier + 1] || null;
}
// Snittbetyget på de senaste spelen (0 om inga spel är utgivna).
export function avgRecentScore(G, n = OFFICE_AVG_N) {
  const g = (G.games || []).slice(-n);
  return g.length ? g.reduce((s, x) => s + x.score, 0) / g.length : 0;
}
// Alla krav för nästa kontor, i den ordning de visas: { id, have, need, ok }. Krav som är 0 hoppas över.
export function officeReqs(G, n = nextTier(G)) {
  if (!n) return [];
  return [
    { id: 'games', have: (G.games || []).length, need: n.games },
    { id: 'staff', have: G.staff.length, need: n.staff },
    { id: 'avg', have: avgRecentScore(G), need: n.avg },
    { id: 'fans', have: G.fans, need: n.fans },
    { id: 'year', have: yearOf(G.t), need: n.year },
    { id: 'money', have: G.money, need: n.cost },
  ]
    .filter((r) => r.need > 0)
    .map((r) => ({ ...r, ok: r.have >= r.need - (r.id === 'avg' ? 0.005 : 0) }));
}
// true om kontoret kan byggas ut, annars id på det första kravet som saknas ('max' om toppen är nådd).
export function canUpgradeOffice(G) {
  const n = nextTier(G);
  if (!n) return 'max';
  const miss = officeReqs(G, n).find((r) => !r.ok);
  return miss ? miss.id : true;
}
export function upgradeOffice(G) {
  const ok = canUpgradeOffice(G);
  if (ok !== true) return false;
  const n = nextTier(G);
  spend(G, n.cost, 'office');
  G.office.tier = n.id;
  note(G, 'news.office', { studio: G.studio, name: n.name }, 'good', true);
  emit('office', n);
  return true;
}
export function rentOf(G) {
  return Math.round(tierOf(G).rent * moneyScale(yearOf(G.t)) * 0.8);
}

// Effektgetters
export const labMult = (G) => 1 + 0.2 * facLevel(G, 'lab');
export const researchSlots = (G) => 1 + facLevel(G, 'lab');
export const qaFixMult = (G) => 1 + G.perk.qa + 0.3 * facLevel(G, 'qa');
export const bugMult = (G) => Math.max(0.4, 1 + G.perk.bugs - 0.06 * facLevel(G, 'qa'));
export const mktCostMult = (G) => 1 - 0.1 * facLevel(G, 'marketing') - (G.perk.mktCost || 0);
export const mktHypeMult = (G) => 1 + 0.12 * facLevel(G, 'marketing');
export const serverMult = (G) => 1 + 0.04 * facLevel(G, 'server');

// ── Pengar ───────────────────────────────────────────────────────
export function earn(G, amount, cat = 'sales') {
  G.money += amount;
  // alla intäkter sedan starten (stats.revenue räknar bara spelen och det som hör till dem)
  G.stats.income = (G.stats.income || 0) + amount;
  G.month.income += amount;
  G.month.breakdown[cat] = (G.month.breakdown[cat] || 0) + amount;
}
export function spend(G, amount, cat = 'other') {
  G.money -= amount;
  G.month.expense += amount;
  G.month.breakdown[cat] = (G.month.breakdown[cat] || 0) - amount;
}

// ── Lån ──────────────────────────────────────────────────────────
export function loanLimit(G) {
  const rev12 = G.hist.revenue.slice(-12).reduce((s, x) => s + x.v, 0);
  return Math.round((20000 * moneyScale(yearOf(G.t)) + rev12 * 0.35) / 1000) * 1000;
}
export const loanTotal = (G) => G.loans.reduce((s, l) => s + l.amount, 0);
export function takeLoan(G, amount) {
  const room = loanLimit(G) - loanTotal(G);
  amount = Math.min(amount, room);
  if (amount < 1000) return false;
  G.loans.push({ id: G.uid++, amount, rate: 0.09, t: G.t });
  G.money += amount;
  G.month.income += amount;
  G.month.breakdown.loan = (G.month.breakdown.loan || 0) + amount;
  return amount;
}
export function repayLoan(G, amount) {
  amount = Math.min(amount, G.money, loanTotal(G));
  if (amount < 1) return false;
  let left = amount;
  for (const l of G.loans) {
    const x = Math.min(left, l.amount);
    l.amount -= x;
    left -= x;
    if (left <= 0) break;
  }
  G.loans = G.loans.filter((l) => l.amount > 0.5);
  G.money -= amount;
  G.month.expense += amount;
  G.month.breakdown.loan = (G.month.breakdown.loan || 0) - amount;
  return amount;
}
export function loanInterest(G) {
  return G.loans.reduce((s, l) => s + (l.amount * l.rate) / 12, 0);
}
export { clamp };

// Sista chansen: banken erbjuder ett räddningslån (dyrare ränta).
export function bailoutAmount(G) {
  return Math.round((30000 * moneyScale(yearOf(G.t)) + (G.staff.length * 4000 * moneyScale(yearOf(G.t)))) / 1000) * 1000;
}
export function takeBailout(G) {
  const amt = bailoutAmount(G);
  G.loans.push({ id: G.uid++, amount: amt, rate: 0.15, t: G.t });
  G.money += amt;
  G.month.income += amt;
  G.month.breakdown.loan = (G.month.breakdown.loan || 0) + amt;
  G.debtMonths = 0;
  return amt;
}
export function declineBailout(G) {
  G.over = { type: 'bankrupt', t: G.t };
  G.pending.push({ type: 'gameover', id: G.uid++ });
  emit('gameover', G.over);
}
