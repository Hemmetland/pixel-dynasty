import { GENRE } from './genres.js';

// Studions rykte: vad branschen kallar studion, utifrån dess spel. Bara uppvisning, inget i spelet läser det.
export const IDENTITIES = {
  online: { sv: 'Onlinestudion', en: 'The online studio' },
  blockbuster: { sv: 'Blockbuster-studion', en: 'The blockbuster studio' },
  hits: { sv: 'Hitfabriken', en: 'The hit factory' },
  indie: { sv: 'Indieälskling', en: 'Indie darling' },
  allround: { sv: 'Allroundstudion', en: 'The all-rounder' },
  steady: { sv: 'Pålitlig hantverkare', en: 'Reliable craftsman' },
};
// idn = { id, genre? } från identity(G); ger ett {sv,en}-namn
export function identityName(idn) {
  if (idn.id === 'genre') {
    const g = GENRE[idn.genre].name;
    return { sv: 'Specialist på ' + g.sv.toLowerCase(), en: g.en + ' specialist' };
  }
  return IDENTITIES[idn.id];
}
