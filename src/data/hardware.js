// Egen hårdvara: produkttyper, designval och tillverkningspartners. Siffrorna kommer ur forskningstrådens balansunderlag
// (docs/HARDWARE_SPEC.md). Design och prototyp kostar i basårets dollar och skalas med moneyScale; priset till kund är
// nominellt (ett grafikkort kostar runt 249 $ oavsett år) och enhetskostnaden faller varje år efter lanseringen.

// res = forskningen som öppnar typen, base = basår, weeks = designtid (Mellan), design och proto = kostnad (Mellan),
// price = förslagspris och marknadens referenspris, unit = enhetskostnad vid lansering som andel av priset, fall =
// kostnadsfall per år, life = livscykel i år, decay = hur fort prestandan åldras (relPerf / (1 + decay · år)),
// share = basandel (BASE), max = högsta andel, elast = priselasticitet, market = [år, enheter per år för alla
// tillverkare], linjärt mellan punkterna, drv = drivrutinsteamets kostnad mot ett grafikkorts.
const T = (id, res, base, weeks, design, proto, price, unit, fall, life, decay, share, max, elast, market, ic, color, drv, name) => ({
  id, res, base, weeks, design, proto, price, unit, fall, life, decay, share, max, elast, market, ic, color, drv, name,
});
const roman = (n) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || String(n);
export const HW_TYPES = {
  sound: T('sound', 'h_sound', 1990, 16, 120000, 30000, 149, 0.5, 0.08, 3, 0.22, 0.15, 0.35, 1.6,
    [[1989, 9000], [1990, 15000], [1995, 60000], [2000, 40000], [2004, 10000], [2010, 4000]], 'music', '#f6b84a', 0.25, (n) => `Sonora ${16 * 2 ** (n - 1)}`),
  gpu: T('gpu', 'h_gpu', 1996, 30, 1000000, 200000, 249, 0.6, 0.1, 2.5, 0.22, 0.11, 0.35, 1.6,
    [[1995, 15000], [1996, 30000], [2000, 150000], [2005, 220000], [2010, 290000], [2017, 420000], [2025, 480000]], 'gpu', '#6ee76a', 1, (n) => `Spectra ${n * 100}`),
  pc: T('pc', 'h_pc', 1999, 20, 600000, 100000, 1499, 0.8, 0.06, 2, 0.22, 0.07, 0.2, 1.2,
    [[1998, 10000], [1999, 20000], [2005, 70000], [2012, 100000], [2020, 150000]], 'pc', '#4aa8ff', 0.5, (n) => `Forge ${roman(n)}`),
  cpu: T('cpu', 'h_cpu', 2000, 48, 2500000, 500000, 199, 0.4, 0.1, 3, 0.18, 0.07, 0.15, 1.3,
    [[1999, 270000], [2000, 300000], [2010, 500000], [2020, 620000]], 'cpu', '#ff8fd2', 1, (n) => `Quark ${n}`),
  // Plattformar: varje såld enhet växer en egen plattform i spelet (sim/hardware.js, G.hw.plats)
  handheld: T('handheld', 'h_handheld', 2004, 72, 14000000, 2000000, 149, 0.95, 0.12, 6, 0.1, 0.13, 0.35, 1.4,
    [[2003, 600000], [2004, 800000], [2010, 1200000], [2017, 1000000], [2025, 800000]], 'handheld', '#7be0c8', 6.25, (n) => (n > 1 ? `Nomad ${n}` : 'Nomad')),
  console: T('console', 'h_console', 2006, 96, 35000000, 5000000, 399, 1, 0.12, 7, 0.1, 0.1, 0.3, 1.4,
    [[2005, 1200000], [2006, 1500000], [2012, 2000000], [2020, 2500000]], 'console', '#b98cff', 6.25, (n) => (n > 1 ? `Paragon ${n}` : 'Paragon')),
  // VR-headset: en liten ny nisch där Lumen VR är enda rivalen, med samma regler som en bärbar enhet
  vr: T('vr', 'h_vr', 2016, 56, 6000000, 1000000, 399, 0.75, 0.12, 5, 0.12, 0.25, 0.5, 1.4,
    [[2015, 60000], [2016, 160000], [2020, 360000], [2025, 520000]], 'vr', '#ff8a5c', 6.25, (n) => (n > 1 ? `Mirage ${n}` : 'Mirage')),
};
export const HW_IDS = ['sound', 'gpu', 'pc', 'cpu', 'handheld', 'console', 'vr'];
// Typer som blir en egen plattform när de säljs
export const PLAT_TYPES = new Set(['handheld', 'console', 'vr']);
// Typer där du väljer arkitektur: köpt kärna (standard) eller egen (för plattformarna med Systemkretsar)
export const ARCH_TYPES = new Set(['cpu', 'handheld', 'console', 'vr']);
// Licensavgiften som andra förlag betalar för att släppa spel på din plattform
export const PLAT_FEES = [0.1, 0.15, 0.2, 0.25, 0.3];
// Komponenter som en speldator kan byggas med
export const PC_PARTS = ['gpu', 'cpu'];

// Prestandamål: prestanda, designtid, designkostnad, enhetskostnad, prototyprisk och förslagspris mot marknaden
export const HW_CLASSES = [
  { id: 'budget', perf: 0.85, weeks: 0.75, design: 0.6, unit: 0.8, risk: 0.05, price: 0.8, suffix: ' LE' },
  { id: 'mid', perf: 1, weeks: 1, design: 1, unit: 1, risk: 0.12, price: 1, suffix: '' },
  { id: 'top', perf: 1.15, weeks: 1.3, design: 1.6, unit: 1.25, risk: 0.25, price: 1.3, suffix: ' Pro' },
];
// Kvalitet: felfrekvens och enhetskostnad
export const HW_QUALITY = [
  { id: 'normal', defect: 0.025, unit: 1 },
  { id: 'high', defect: 0.01, unit: 1.06 },
];
// Arkitektur: standard = köpt kärna (kompatibel, men royalty per såld enhet), egen = snabbare men ny för utvecklarna
export const HW_ARCH = [
  { id: 'std', perf: 1, compat: 80, royalty: 0.06 },
  { id: 'own', perf: 1.15, compat: 45, royalty: 0 },
];

// Tillverkningspartners (fiktiva). cost = enhetskostnad, defect = extra felfrekvens, lead = ledtid i veckor, min = minsta
// order, cap = kapacitet per år, short = risk per vecka för komponentbrist, perf = extra prestanda (spetsnod).
export const HW_PARTNERS = [
  { id: 'halden', name: 'Halden Elektronik', from: 1988, kind: 'asm', cost: 1.1, defect: 0.01, lead: 6, min: 2000, cap: 60000, short: 0, perf: 0 },
  { id: 'meridian', name: 'Meridian Foundry', from: 1995, kind: 'fab', cost: 1, defect: 0.005, lead: 12, min: 20000, cap: 600000, short: 0.004, perf: 0 },
  { id: 'kaori', name: 'Kaori Precision', from: 2000, kind: 'mass', cost: 0.88, defect: 0.015, lead: 16, min: 100000, cap: 4000000, short: 0.006, perf: 0 },
  { id: 'vela', name: 'Vela Semiconductor', from: 2005, kind: 'node', cost: 1.15, defect: 0.003, lead: 14, min: 50000, cap: 800000, short: 0.004, perf: 0.08 },
];
export const HW_PARTNER = Object.fromEntries(HW_PARTNERS.map((p) => [p.id, p]));
