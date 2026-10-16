// Teman. compat = en siffra per genre i ordningen
// action, adventure, rpg, strategy, simulation, casual, shooter, racing
// (4 = utmärkt, 3 = bra, 2 = okej, 1 = dålig matchning).
const T = (id, sv, en, glyph, c1, c2, mature, compat, start = false) => ({
  id, glyph, c1, c2, mature, start,
  name: { sv, en },
  compat: compat.split('').map(Number),
});
export const TOPICS = [
  T('fantasy', 'Fantasy', 'Fantasy', 't_fantasy', '#7a4dff', '#2a1a6e', 0, '34431221', true),
  T('space', 'Rymden', 'Space', 't_space', '#2a6bff', '#0b1a4a', 0, '33344243', true),
  T('knights', 'Riddare', 'Knights', 't_knights', '#c9a14a', '#3a2a10', 0.1, '43442111', true),
  T('pirates', 'Pirater', 'Pirates', 't_pirates', '#18a5a5', '#06303a', 0, '34333222', true),
  T('detective', 'Deckare', 'Detective', 't_detective', '#7d8aa8', '#1a2236', 0.2, '14222311', true),
  T('sports', 'Sport', 'Sports', 't_sports', '#3fc35a', '#0b4a1a', -0.2, '21134413', true),
  T('abstract', 'Abstrakt', 'Abstract', 't_abstract', '#ff5c9d', '#4a0f3a', -0.4, '21122422', true),
  T('western', 'Vilda västern', 'Wild West', 't_western', '#e0883a', '#4a2008', 0.2, '34322243'),
  T('ninjas', 'Ninjor', 'Ninjas', 't_ninjas', '#e8404a', '#2a0a10', 0.3, '43322221'),
  T('vikings', 'Vikingar', 'Vikings', 't_vikings', '#5aa0c8', '#10283a', 0.3, '43343112'),
  T('horror', 'Skräck', 'Horror', 't_horror', '#8a3dff', '#14061f', 0.9, '34211141'),
  T('zombies', 'Zombier', 'Zombies', 't_zombies', '#7fbf3a', '#1a2a08', 0.8, '43232241'),
  T('aliens', 'Utomjordingar', 'Aliens', 't_aliens', '#39e08a', '#06301c', 0.2, '33232242'),
  T('robots', 'Robotar', 'Robots', 't_robots', '#8fb2d0', '#1a2838', 0, '42233243'),
  T('farming', 'Lantbruk', 'Farming', 't_farming', '#a8d14a', '#3a4a10', -0.7, '12234411'),
  T('cooking', 'Matlagning', 'Cooking', 't_cooking', '#ff8a4a', '#4a1e08', -0.6, '12124411'),
  T('music', 'Musik', 'Music', 't_music', '#ff4ad0', '#2a0a48', -0.3, '22113412'),
  T('fashion', 'Mode', 'Fashion', 't_fashion', '#ff7aa8', '#4a1030', -0.6, '12213411'),
  T('school', 'Skolan', 'School Life', 't_school', '#ffd04a', '#4a3a08', -0.4, '13323411'),
  T('hospital', 'Sjukhus', 'Hospital', 't_hospital', '#4ad0ff', '#08384a', -0.3, '12134411'),
  T('cars', 'Gatubilar', 'Street Cars', 't_cars', '#ff5a3a', '#3a1008', 0, '31123324'),
  T('mafia', 'Maffia', 'Mob', 't_mafia', '#b04a4a', '#240a0a', 0.9, '43333143'),
  T('mythology', 'Mytologi', 'Mythology', 't_mythology', '#e8d08a', '#3a2c10', 0, '34431211'),
  T('dinosaurs', 'Dinosaurier', 'Dinosaurs', 't_dinosaurs', '#5ac86a', '#0e3a1a', -0.3, '44234331'),
  T('magic', 'Magi', 'Magic', 't_magic', '#b46bff', '#220a48', -0.1, '34432321'),
  T('military', 'Militär', 'Military', 't_military', '#8a9a5a', '#1e2a10', 0.8, '42143142'),
  T('survival', 'Överlevnad', 'Survival', 't_survival', '#d08a4a', '#2a1a08', 0.4, '34334131'),
  T('heroes', 'Superhjältar', 'Superheroes', 't_heroes', '#ff3a5a', '#10205a', 0, '43321232'),
  T('cyberpunk', 'Cyberpunk', 'Cyberpunk', 't_cyberpunk', '#00f0ff', '#2a0a4a', 0.7, '43422143'),
  T('timetravel', 'Tidsresor', 'Time Travel', 't_timetravel', '#4affc8', '#0a2a3a', 0, '34332321'),
  T('city', 'Stadsbygge', 'City Building', 't_city', '#7ab8ff', '#10284a', -0.3, '11144311'),
  T('airport', 'Flyg', 'Aviation', 't_airport', '#8ad0ff', '#0a2a4a', -0.2, '22124333'),
];
export const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
