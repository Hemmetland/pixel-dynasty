import { GENRE } from './genres.js';

// Studions rykte: vad branschen kallar studion, utifrån dess spel. Bara uppvisning, inget i spelet läser det.
export const IDENTITIES = {
  online: { sv: 'Onlinestudion', en: 'Online Studio' },
  blockbuster: { sv: 'Blockbuster-studion', en: 'Blockbuster Studio' },
  hits: { sv: 'Hitfabriken', en: 'Hit Factory' },
  indie: { sv: 'Indieälskling', en: 'Indie Darling' },
  allround: { sv: 'Allroundstudion', en: 'All-Rounder' },
  steady: { sv: 'Pålitlig hantverkare', en: 'Reliable Craftsman' },
};
// idn = { id, genre? } från identity(G); ger ett {sv,en}-namn
export function identityName(idn) {
  if (idn.id === 'genre') {
    const g = GENRE[idn.genre].name;
    return { sv: 'Specialist på ' + g.sv.toLowerCase(), en: g.en + ' Specialist' };
  }
  return IDENTITIES[idn.id];
}
