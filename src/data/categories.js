// De nio utvecklingskategorierna, tre per fas.
// dMix = hur stor andel av kategorins arbete som blir Design (resten Teknik).
export const CATEGORIES = [
  { id: 'engine', phase: 0, dMix: 0.1, color: '#4aa8ff', glyph: 'c_engine', start: true,
    name: { sv: 'Motor', en: 'Engine' },
    desc: { sv: 'Spelets tekniska grund. Mer teknik, färre kraschar.', en: 'The technical backbone. More tech, fewer crashes.' } },
  { id: 'gameplay', phase: 0, dMix: 0.9, color: '#ff6b5c', glyph: 'c_gameplay', start: true,
    name: { sv: 'Spelmekanik', en: 'Gameplay' },
    desc: { sv: 'Själva spelkänslan. Det som får folk att fortsätta.', en: 'How it plays. What keeps people coming back.' } },
  { id: 'story', phase: 0, dMix: 1.0, color: '#f6b84a', glyph: 'c_story', start: true,
    name: { sv: 'Story & uppdrag', en: 'Story & Quests' },
    desc: { sv: 'Handling, uppdrag och vändningar.', en: 'Plot, quests and twists.' } },
  { id: 'dialogue', phase: 1, dMix: 0.95, color: '#ff8fd2', glyph: 'c_dialogue', start: false,
    name: { sv: 'Dialog', en: 'Dialogue' },
    desc: { sv: 'Repliker, personligheter och humor.', en: 'Lines, personality and humour.' } },
  { id: 'level', phase: 1, dMix: 0.55, color: '#6ee76a', glyph: 'c_level', start: true,
    name: { sv: 'Banor', en: 'Level Design' },
    desc: { sv: 'Banor, tempo och överraskningar.', en: 'Levels, pacing and surprises.' } },
  { id: 'ai', phase: 1, dMix: 0.15, color: '#4de1d0', glyph: 'c_ai', start: false,
    name: { sv: 'AI', en: 'AI' },
    desc: { sv: 'Motståndare och figurer som uppför sig smart.', en: 'Opponents and characters that act smart.' } },
  { id: 'world', phase: 2, dMix: 0.75, color: '#9b7bff', glyph: 'c_world', start: false,
    name: { sv: 'Världsbygge', en: 'World Design' },
    desc: { sv: 'Lore, miljöer och en värld som känns levande.', en: 'Lore, settings and a world that feels alive.' } },
  { id: 'graphics', phase: 2, dMix: 0.2, color: '#ff9348', glyph: 'c_graphics', start: true,
    name: { sv: 'Grafik', en: 'Graphics' },
    desc: { sv: 'Det första spelaren ser.', en: 'The first thing players see.' } },
  { id: 'sound', phase: 2, dMix: 0.5, color: '#e3e8ff', glyph: 'c_sound', start: false,
    name: { sv: 'Ljud & musik', en: 'Sound & Music' },
    desc: { sv: 'Musik och ljudeffekter som sätter stämningen.', en: 'Music and effects that set the mood.' } },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const CAT_IDX = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
export const PHASES = [
  { id: 0, name: { sv: 'Fas 1 · Grunden', en: 'Phase 1 · Foundation' } },
  { id: 1, name: { sv: 'Fas 2 · Innehåll', en: 'Phase 2 · Content' } },
  { id: 2, name: { sv: 'Fas 3 · Finish', en: 'Phase 3 · Finish' } },
];
