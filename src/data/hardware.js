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
// Produkter som kan byggas med dina egna komponenter (grafikkretsen och processorn som säljs): lägre enhetskostnad och
// prestanda mot komponentens nivå
export const HOST_TYPES = new Set(['pc', 'console', 'handheld', 'vr']);

// Revisioner: en uppgradering av en produkt som redan säljs (sim/hardware.js, reviseProduct). cost = andel av kostnaden för
// en ny generation, weeks = andel av designtiden, perf = lyft av prestandan mot marknaden just nu, unit = ändring av
// enhetskostnaden, life = extra år på livscykeln, hype = tillfälligt lyft av efterfrågan, max = högsta antal per produkt.
export const HW_REVS = [
  { id: 'pro', cost: 0.3, weeks: 0.4, perf: 0.12, unit: 1.06, life: 1, hype: 0.05, max: 3 },
  { id: 'slim', cost: 0.15, weeks: 0.3, perf: 0, unit: 0.88, life: 0.5, hype: 0, max: 2 },
];
// Namnet får ett tillägg efter slag: Pro och Slim på plattformar och speldatorer, Ti och Rev B på komponenter
const REV_TAIL = { pro: [' Pro', ' Ti'], slim: [' Slim', ' Rev B'] };
export const revSuffix = (type, id) => REV_TAIL[id][['sound', 'gpu', 'cpu'].includes(type) ? 1 : 0];

// Vad som sitter inuti: kurvor över året (logaritmisk interpolation mellan punkterna) för det som en produkt av sin tid har.
// Siffrorna är för en produkt på Mellan; prestandamålet skalar dem (sim/hardware.js, specsOf).
const CURVES = {
  ghz: [[1990, 0.03], [1999, 0.4], [2005, 3], [2012, 3.6], [2020, 4.2], [2030, 5]],
  cores: [[1995, 1], [2005, 1.5], [2010, 4], [2015, 8], [2020, 12], [2030, 24]],
  nm: [[1995, 500], [2000, 180], [2005, 65], [2010, 32], [2015, 14], [2020, 5], [2030, 2]],
  tflops: [[1995, 0.0001], [1996, 0.0005], [2006, 0.2], [2013, 1.8], [2020, 10], [2030, 60]],
  vram: [[1996, 0.004], [2000, 0.032], [2006, 0.5], [2013, 4], [2020, 12], [2030, 32]],
  ram: [[1990, 0.001], [1998, 0.032], [2006, 0.5], [2013, 8], [2020, 16], [2030, 32]],
  disk: [[1990, 0.1], [1999, 8], [2006, 80], [2013, 500], [2020, 1000], [2030, 4000]],
  khz: [[1989, 22], [1995, 44], [2000, 48], [2010, 96], [2030, 192]],
  screenW: [[2003, 480], [2012, 960], [2020, 1280], [2030, 1920]],
  eyeW: [[2015, 1080], [2020, 1832], [2030, 3000]],
  hz: [[2015, 90], [2025, 120], [2035, 144]],
  battery: [[2003, 3], [2012, 6], [2020, 8], [2030, 12]],
};
export function curveAt(key, y) {
  const pts = CURVES[key];
  if (y <= pts[0][0]) return pts[0][1];
  if (y >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (y < pts[i][0]) {
      const [y0, a] = pts[i - 1];
      const [y1, b] = pts[i];
      return Math.exp(Math.log(a) + ((Math.log(b) - Math.log(a)) * (y - y0)) / (y1 - y0));
    }
  }
  return pts[pts.length - 1][1];
}

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
  // studions egen fabrik (forskningen Egen fabrik, sedan bygget): kapaciteten följer fabrikens nivå (sim/hardware.js)
  { id: 'fab', name: 'Egen fabrik', from: 2008, kind: 'own', cost: 0.8, defect: 0.008, lead: 4, min: 5000, cap: 0, short: 0, perf: 0 },
];
export const HW_PARTNER = Object.fromEntries(HW_PARTNERS.map((p) => [p.id, p]));
