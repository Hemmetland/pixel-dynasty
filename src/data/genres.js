// Genrer. `ideal` = idealfördelning över de nio kategorierna
// [engine, gameplay, story | dialogue, level, ai | world, graphics, sound]
// och normaliseras per fas vid poängsättning.
export const GENRES = [
  {
    id: 'action', glyph: 'g_action', color: '#ff6b5c', techW: 0.55, mature: 0.2,
    name: { sv: 'Action', en: 'Action' },
    desc: { sv: 'Snabbt, reflexdrivet och hårt på tekniken.', en: 'Fast, reflex-driven and tech-hungry.' },
    ideal: [3, 5, 1, 0.5, 4, 3, 1, 3, 2],
  },
  {
    id: 'adventure', glyph: 'g_adventure', color: '#f6b84a', techW: 0.3, mature: 0,
    name: { sv: 'Äventyr', en: 'Adventure' },
    desc: { sv: 'Berättelse, gåtor och utforskande.', en: 'Story, puzzles and exploration.' },
    ideal: [1, 3, 5, 5, 3, 1, 4, 3, 2],
  },
  {
    id: 'rpg', glyph: 'g_rpg', color: '#9b7bff', techW: 0.35, mature: 0.1,
    name: { sv: 'Rollspel', en: 'RPG' },
    desc: { sv: 'Djupa världar, karaktärer och dialog.', en: 'Deep worlds, characters and dialogue.' },
    ideal: [2, 3, 5, 4, 2, 3, 5, 2, 3],
  },
  {
    id: 'strategy', glyph: 'g_strategy', color: '#4de1d0', techW: 0.4, mature: 0,
    name: { sv: 'Strategi', en: 'Strategy' },
    desc: { sv: 'Planering, system och smart AI.', en: 'Planning, systems and smart AI.' },
    ideal: [2, 5, 2, 1, 2, 5, 3, 1, 2],
  },
  {
    id: 'simulation', glyph: 'g_simulation', color: '#6ee76a', techW: 0.5, mature: -0.1,
    name: { sv: 'Simulering', en: 'Simulation' },
    desc: { sv: 'Levande system som spelaren kan finjustera.', en: 'Living systems for the player to tinker with.' },
    ideal: [4, 4, 2, 1, 3, 4, 4, 2, 2],
  },
  {
    id: 'casual', glyph: 'g_casual', color: '#ff8fd2', techW: 0.3, mature: -0.5,
    name: { sv: 'Casual', en: 'Casual' },
    desc: { sv: 'Lättillgängligt, charmigt och beroendeframkallande.', en: 'Easy to pick up, charming and addictive.' },
    ideal: [1, 5, 1, 1, 3, 1, 2, 4, 4],
  },
  {
    id: 'shooter', glyph: 'g_shooter', color: '#ff9348', techW: 0.6, mature: 0.6,
    name: { sv: 'Shooter', en: 'Shooter' },
    desc: { sv: 'Precision, tempo och stor teknik.', en: 'Precision, tempo and heavy tech.' },
    ideal: [4, 5, 1, 0.5, 5, 3, 2, 4, 3],
  },
  {
    id: 'racing', glyph: 'g_racing', color: '#4aa8ff', techW: 0.6, mature: -0.2,
    name: { sv: 'Racing', en: 'Racing' },
    desc: { sv: 'Fart, känsla och snygg grafik.', en: 'Speed, feel and gorgeous visuals.' },
    ideal: [4, 4, 0.5, 0.5, 4, 2, 3, 4, 4],
  },
];
export const GENRE_IDS = GENRES.map((g) => g.id);
export const GENRE = Object.fromEntries(GENRES.map((g) => [g.id, g]));
