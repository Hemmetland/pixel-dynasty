// Skivor: sålda exemplar av ett spel, porteringar och remasters inräknade. Trösklarna följer spelets egen tillväxt:
// silver går att nå på 80-talet, guld runt 1990, platina med en storsäljare från slutet av 90-talet och diamant
// bara med de allra största spelen på 2010-talet. name står i löpande text, short på hyllans smala rutor.
export const CERTS = [
  { id: 'silver', units: 10000, color: '#c9d2e3', name: { sv: 'silverskiva', en: 'silver disc' }, short: { sv: 'Silver', en: 'Silver' } },
  { id: 'gold', units: 100000, color: '#ffd166', name: { sv: 'guldskiva', en: 'gold disc' }, short: { sv: 'Guld', en: 'Gold' } },
  { id: 'platinum', units: 500000, color: '#a8e6ff', name: { sv: 'platinaskiva', en: 'platinum disc' }, short: { sv: 'Platina', en: 'Platinum' } },
  { id: 'diamond', units: 2000000, color: '#d9b8ff', name: { sv: 'diamantskiva', en: 'diamond disc' }, short: { sv: 'Diamant', en: 'Diamond' } },
];

export const totalUnits = (g) => (g.units || 0) + (g.ports || []).reduce((a, p) => a + (p.units || 0), 0);
// högsta skivan för ett antal sålda exemplar (index i CERTS, -1 = ingen)
export function certIndex(units) {
  let i = -1;
  while (i + 1 < CERTS.length && units >= CERTS[i + 1].units) i++;
  return i;
}
