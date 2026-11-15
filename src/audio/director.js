// Musikregi: väljer stämning efter hur spelet går. En ren funktion med litet minne, så att den går att testa utan ljud.
// Spelmusiken är inte hetsig hela tiden: lugnare tempo, en andningspaus när spelet står stilla eller går på lägsta
// fart, och en lugn stund med jämna mellanrum. Hetsigare musik kommer bara vid övertid. Rutor som sätter sin egen stämning
// (rapport, galan, konkurs) får vara ifred medan de visas.
export const MUSIC_STYLES = ['auto', 'calm', 'lively'];
export const INTERLUDE_AFTER = 150; // sekunder med vanlig spelmusik innan en lugn stund
export const INTERLUDE_LEN = 70; // så länge varar den lugna stunden
export const PAUSE_CALM = 6; // sekunder i paus eller meny innan musiken lugnar sig

export const newDirector = () => ({ pauseSince: null, playSince: null, calmUntil: 0 });

// s = { now (sekunder), mode: 'title' | 'play', over, prompt (en ruta med egen stämning visas), paused (paus eller
// meny), crunch (övertid pågår), speed (1-3), style: 'auto' | 'calm' | 'lively' }
// Svarar stämningen som ska spelas, eller null: lämna det som det är.
export function pickMood(D, s) {
  if (s.mode !== 'play') {
    D.pauseSince = D.playSince = null;
    D.calmUntil = 0;
    return 'title';
  }
  if (s.over) return 'sad';
  if (s.prompt) {
    D.playSince = null;
    return null;
  }
  if (s.paused) {
    if (D.pauseSince == null) D.pauseSince = s.now;
  } else D.pauseSince = null;
  const pausedLong = D.pauseSince != null && s.now - D.pauseSince >= PAUSE_CALM;
  const style = s.style || 'auto';
  if (style === 'calm') return 'calm';
  if (s.crunch && !s.paused) {
    D.playSince = null;
    return 'drive';
  }
  if (pausedLong) {
    D.playSince = null;
    return 'calm';
  }
  if (style === 'lively') return 'play';
  // vanlig stil: långsam fart och en lugn stund med jämna mellanrum
  if (s.now < D.calmUntil) return 'calm';
  if (s.speed <= 1) {
    D.playSince = null;
    return 'calm';
  }
  if (D.playSince == null) D.playSince = s.now;
  if (s.now - D.playSince >= INTERLUDE_AFTER) {
    D.calmUntil = s.now + INTERLUDE_LEN;
    D.playSince = null;
    return 'calm';
  }
  return 'play';
}

// Omgivningsljudet: hur starkt stadsbruset, syrsorna, regnet och blåsten ska vara. En ren funktion.
// s = { mode: 'title' | 'play', over, night (0-1), rain (0-1), snow (0-1), month (0-11), paused }
// Dagtid hörs stadsbrus, sommarnätter ger syrsor, regn och snö dämpar staden, och snö och vintrar ger blåst. Står spelet stilla
// är det lite tystare, och på titelskärmen eller vid konkurs hörs ingenting.
export function ambienceMix(s) {
  const mix = { city: 0, cricket: 0, rain: 0, wind: 0 };
  if (s.mode !== 'play' || s.over) return mix;
  const u = (v) => Math.min(1, Math.max(0, v || 0));
  const night = u(s.night);
  const rain = u(s.rain);
  const snow = u(s.snow);
  const summer = s.month >= 4 && s.month <= 8;
  const k = s.paused ? 0.6 : 1;
  mix.city = (0.15 + 0.5 * (1 - night)) * (1 - 0.6 * Math.max(rain, snow)) * k;
  mix.cricket = summer && rain < 0.2 && snow === 0 ? (Math.max(0, night - 0.45) / 0.55) * k : 0;
  mix.rain = rain * 0.9 * k;
  mix.wind = Math.min(1, snow * 0.8 + (summer ? 0 : night * 0.25)) * k;
  for (const key of Object.keys(mix)) mix[key] = Math.round(mix[key] * 1000) / 1000;
  return mix;
}
