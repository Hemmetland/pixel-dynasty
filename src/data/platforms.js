import { clamp } from '../core/util.js';

// Fiktiv hårdvara. weight = relativ installerad bas vid toppen.
// tier = teknisk generation (1–7), styr hur mycket arbete ett bra spel kräver.
const P = (id, name, maker, kind, glyph, color, y0, m0, y1, weight, tier, license, bias, desc) => ({
  id, name, maker, kind, glyph, color, y0, m0, y1, weight, tier, license, bias: bias || {}, desc,
});

export const PLATFORMS = [
  P('pc', 'Terminus PC', 'Terminus Systems', 'pc', 'p_pc', '#8fb2d0', 1980, 0, 2200, 30, 1, 0, { strategy: 1.2, simulation: 1.2, casual: 0.9, racing: 0.9 },
    { sv: 'Den öppna plattformen. Aldrig någon licens, aldrig någon slutdag.', en: 'The open platform. No license, no end date.' }),
  P('orbit', 'Orbit One', 'Orbit Micro', 'pc', 'p_orbit', '#d8b080', 1981, 3, 1991, 16, 1, 2500, { adventure: 1.15, strategy: 1.1, action: 0.9 },
    { sv: 'Hemdatorn som lärde en generation programmera.', en: 'The home computer that taught a generation to code.' }),
  P('nova', 'Nova Spark', 'Nova Interactive', 'console', 'p_nova', '#ff6b5c', 1983, 6, 1992, 26, 1, 6000, { action: 1.15, adventure: 1.05, strategy: 0.85 },
    { sv: 'Första riktiga TV-konsolen med utbytbara kassetter.', en: 'The first real living-room console with swappable cartridges.' }),
  P('hikari8', 'Hikari Rise', 'Hikari Entertainment', 'console', 'p_hikari', '#f2f2f7', 1985, 9, 1994, 44, 1, 9000, { action: 1.2, adventure: 1.15, casual: 1.1, strategy: 0.8 },
    { sv: 'Räddade branschen. Kassetterna är små, ambitionerna stora.', en: 'It rescued the industry. Small cartridges, huge ambitions.' }),
  P('vortex16', 'Vortex Mega 16', 'Vortex Corp', 'console', 'p_vortex', '#3a7bff', 1988, 6, 1997, 30, 2, 14000, { action: 1.2, racing: 1.15, shooter: 1.1, strategy: 0.8 },
    { sv: 'Snabb, högljudd och lite ouppfostrad.', en: 'Fast, loud and a little rebellious.' }),
  P('pocket', 'Pocket Pal', 'Hikari Entertainment', 'handheld', 'p_pocket', '#a8c070', 1989, 4, 1999, 24, 1, 7000, { casual: 1.35, action: 0.9, racing: 0.7, shooter: 0.6, strategy: 0.8 },
    { sv: 'Grön skärm, gigantisk spelkänsla. Går på fyra batterier.', en: 'Green screen, huge appeal. Runs on four batteries.' }),
  P('hikari16', 'Hikari Rise 16', 'Hikari Entertainment', 'console', 'p_hikari16', '#c8c8e8', 1991, 8, 2000, 48, 2, 20000, { rpg: 1.2, adventure: 1.15, action: 1.1, racing: 1.05 },
    { sv: 'Sexton bitar, mjuka färger och rollspelens guldålder.', en: 'Sixteen bits, rich colour and the golden age of RPGs.' }),
  P('orion', 'Orion Aurora', 'Orion Digital', 'console', 'p_orion', '#b86bff', 1995, 0, 2001, 20, 3, 35000, { adventure: 1.15, rpg: 1.1, simulation: 0.9 },
    { sv: 'Tidig CD-konsol. Briljant hårdvara, svår att programmera.', en: 'An early CD console. Brilliant hardware, hard to program.' }),
  P('nova32', 'Nova Prism', 'Nova Interactive', 'console', 'p_prism', '#ff5c9d', 1994, 10, 2003, 34, 3, 40000, { action: 1.15, racing: 1.2, shooter: 1.15, rpg: 1.0 },
    { sv: 'Polygoner! Nova går all in på 3D.', en: 'Polygons! Nova bets everything on 3D.' }),
  P('hikari64', 'Hikari Kuro 64', 'Hikari Entertainment', 'console', 'p_kuro', '#22222e', 1996, 6, 2003, 30, 3, 50000, { action: 1.15, adventure: 1.2, racing: 1.15, rpg: 0.9 },
    { sv: 'Fyra kontrolluttag och en analog spak som förändrade allt.', en: 'Four controller ports and an analog stick that changed everything.' }),
  P('dreamcore', 'Vortex Dreamcore', 'Vortex Corp', 'console', 'p_dreamcore', '#ff9348', 1998, 10, 2002, 16, 3, 45000, { racing: 1.2, action: 1.15, casual: 1.1 },
    { sv: 'Före sin tid och slut före sin tid.', en: 'Ahead of its time and gone ahead of its time.' }),
  P('borealis', 'Borealis Box', 'Borealis Technologies', 'console', 'p_borealis', '#6ee76a', 2001, 10, 2007, 40, 4, 90000, { shooter: 1.3, action: 1.15, racing: 1.1, casual: 0.8 },
    { sv: 'En mjukvarujätte kliver in i vardagsrummet.', en: 'A software giant steps into the living room.' }),
  P('nova2', 'Nova Prism 2', 'Nova Interactive', 'console', 'p_prism2', '#ff5c9d', 2000, 3, 2012, 56, 4, 90000, { action: 1.1, rpg: 1.15, adventure: 1.1, simulation: 1.0 },
    { sv: 'Bäst säljande konsol någonsin, åtminstone enligt Nova.', en: 'The best-selling console ever. According to Nova, anyway.' }),
  P('hikaricube', 'Hikari Cube', 'Hikari Entertainment', 'console', 'p_cube', '#9b7bff', 2001, 11, 2007, 22, 4, 70000, { casual: 1.2, adventure: 1.15, action: 1.05, shooter: 0.8 },
    { sv: 'Kompakt lila kub. Familjevänlig och oväntat kraftfull.', en: 'A compact purple cube. Family friendly and surprisingly strong.' }),
  P('pocketduo', 'Pocket Pal Duo', 'Hikari Entertainment', 'handheld', 'p_duo', '#e8e8f0', 2004, 11, 2013, 38, 3, 25000, { casual: 1.35, rpg: 1.1, adventure: 1.15, shooter: 0.7, racing: 0.8 },
    { sv: 'Två skärmar, en penna och miljontals nya spelare.', en: 'Two screens, a stylus and millions of new players.' }),
  P('hikariwave', 'Hikari Wave', 'Hikari Entertainment', 'console', 'p_wave', '#4de1d0', 2006, 11, 2013, 46, 4, 80000, { casual: 1.4, simulation: 1.15, shooter: 0.7, rpg: 0.8 },
    { sv: 'Viftar du med armen så spelar du. Mormor älskar den.', en: 'Wave your arm and you are playing. Grandma loves it.' }),
  P('borealis2', 'Borealis Zenith', 'Borealis Technologies', 'console', 'p_zenith', '#4de14a', 2005, 11, 2014, 52, 5, 150000, { shooter: 1.3, action: 1.15, rpg: 1.1, racing: 1.1 },
    { sv: 'HD, onlinespel och prestationer. Spelar man ihop är man vän.', en: 'HD, online play and achievements. Play together, stay together.' }),
  P('nova3', 'Nova Prism 3', 'Nova Interactive', 'console', 'p_prism3', '#ff5c9d', 2006, 11, 2017, 55, 5, 150000, { action: 1.15, adventure: 1.15, rpg: 1.1, simulation: 0.95 },
    { sv: 'Blu-ray i spelkonsolen. Dyr, men kraftfull.', en: 'Blu-ray in a console. Expensive, but powerful.' }),
  P('phone', 'Aurum Phone', 'Aurum', 'mobile', 'p_phone', '#e8e8f0', 2008, 6, 2200, 60, 3, 0, { casual: 1.6, strategy: 1.05, simulation: 1.1, shooter: 0.6, racing: 0.8, rpg: 0.8, action: 0.85 },
    { sv: 'Alla har en i fickan. Miljarder potentiella spelare.', en: 'Everyone has one in their pocket. Billions of potential players.' }),
  P('borealis3', 'Borealis Omni', 'Borealis Technologies', 'console', 'p_omni', '#6ee76a', 2013, 10, 2021, 64, 6, 250000, { shooter: 1.3, action: 1.15, racing: 1.1, simulation: 1.05 },
    { sv: 'Allt-i-ett-låda för vardagsrummet.', en: 'The all-in-one box for the living room.' }),
  P('nova4', 'Nova Prism 4', 'Nova Interactive', 'console', 'p_prism4', '#ff5c9d', 2013, 10, 2200, 70, 6, 250000, { action: 1.15, adventure: 1.2, rpg: 1.15, shooter: 1.0 },
    { sv: 'Delningsknappen som alla ville ha.', en: 'The share button everybody wanted.' }),
  P('lumen', 'Lumen VR', 'Lumen Labs', 'vr', 'p_lumen', '#4aa8ff', 2016, 3, 2200, 14, 6, 120000, { action: 1.2, simulation: 1.2, shooter: 1.15, casual: 1.1, strategy: 0.6 },
    { sv: 'Sätt på dig världen. Nackstödet säljs separat.', en: 'Strap the world to your face. Neck support sold separately.' }),
  P('hikariduet', 'Hikari Duet', 'Hikari Entertainment', 'handheld', 'p_duet', '#ff5a5a', 2017, 3, 2200, 62, 5, 150000, { adventure: 1.25, casual: 1.2, rpg: 1.15, action: 1.1, shooter: 0.85 },
    { sv: 'Hemma i soffan eller på tåget. Samma spel.', en: 'Home on the couch or out on the train. Same game.' }),
  P('nova5', 'Nova Prism 5', 'Nova Interactive', 'console', 'p_prism5', '#ff5c9d', 2020, 10, 2200, 80, 7, 400000, { action: 1.15, adventure: 1.2, rpg: 1.15, shooter: 1.1 },
    { sv: 'Ljudlös SSD och laddtider som försvunnit.', en: 'A silent SSD and load times that vanished.' }),
  P('borealis4', 'Borealis Series Z', 'Borealis Technologies', 'console', 'p_seriesz', '#6ee76a', 2020, 10, 2200, 75, 7, 400000, { shooter: 1.3, racing: 1.15, action: 1.15, simulation: 1.1 },
    { sv: 'Spelar ett bibliotek på tusen titlar direkt.', en: 'Plays a library of a thousand titles straight away.' }),
];
export const PLATFORM = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
// Studions egna plattformar (sim/hardware.js, G.hw.plats, own: true) läggs sist i listan för det spel som är igång.
// Objekten är desamma som i G.hw.plats, så vikten som växer med sålda enheter syns överallt.
export function setOwnPlatforms(list = []) {
  for (let i = PLATFORMS.length - 1; i >= 0; i--) {
    if (!PLATFORMS[i].own) continue;
    delete PLATFORM[PLATFORMS[i].id];
    PLATFORMS.splice(i, 1);
  }
  for (const p of list) {
    PLATFORMS.push(p);
    PLATFORM[p.id] = p;
  }
}

// PC:ns generation följer året.
export function pcTier(year) {
  if (year < 1984) return 1;
  if (year < 1991) return 2;
  if (year < 1998) return 3;
  if (year < 2005) return 4;
  if (year < 2012) return 5;
  if (year < 2019) return 6;
  return 7;
}
export function pcGeneration(year) {
  const g = [
    [1980, 'Terminus 80'], [1984, 'Terminus 286'], [1991, 'Terminus 486'], [1998, 'Terminus Pro'],
    [2005, 'Terminus Quad'], [2012, 'Terminus RTX'], [2019, 'Terminus Ultra'],
  ];
  let name = g[0][1];
  for (const [y, n] of g) if (year >= y) name = n;
  return name;
}
// Mobilen blir kraftfullare med åren: smarta telefoner kommer ikapp konsolerna, men aldrig helt.
export function phoneTier(year) {
  if (year < 2012) return 3;
  if (year < 2016) return 4;
  return 5;
}
export function platTier(p, year) {
  return p.id === 'pc' ? pcTier(year) : p.kind === 'mobile' ? phoneTier(year) : p.tier;
}
export const launchTime = (p) => p.y0 + p.m0 / 12;
export function lifecycle(p, yf) {
  const t0 = launchTime(p);
  const t1 = p.y1;
  if (yf < t0) return 0;
  if (p.y1 < 2100 && yf > t1 + 1.5) return 0;
  const age = yf - t0;
  // en egen plattforms vikt följer redan de sålda enheterna, så den växer inte upp en gång till
  const ramp = p.id === 'pc' || p.own ? 1 : Math.pow(clamp(age / 1.6, 0, 1), 1.3);
  let fade = 1;
  if (p.y1 < 2100 && yf > t1 - 2) fade = clamp((t1 + 1.5 - yf) / 3.5, 0, 1);
  // Mobil/PC och långlivade plattformar mognar långsamt vidare (mobilen planar ut tidigare, alla har redan en).
  const grow = p.y1 >= 2100 && !p.own ? 1 + Math.min(p.kind === 'mobile' ? 0.25 : 0.6, age * 0.03) : 1;
  return ramp * fade * grow;
}
export const potential = (p, yf) => p.weight * lifecycle(p, yf);
// Teknikfaktor per generation: hur mycket mer poäng ett "bra" spel kräver.
// De sista generationerna stiger mjukare: teamens färdigheter planar ut kring 100, så de nya konsolerna ska gå att nå.
export const TECH_MULT = [1, 1.7, 3.0, 5.2, 8.0, 10.5, 13.5];
export const techMult = (p, year) => TECH_MULT[platTier(p, year) - 1];
