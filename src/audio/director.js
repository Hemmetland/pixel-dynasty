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
