import { RESEARCH_TEMPO } from '../sim/tempo.js';

// Forskningsträdet. rp = forskningspoäng, money = kontantkostnad, weeks = tid.
// unlock = vad som öppnas, perk = permanenta bonusar.
const R = (id, cat, sv, en, dsv, den, rp, money, weeks, req, year, unlock, perk, glyph) => ({
  id, cat, name: { sv, en }, desc: { sv: dsv, en: den },
  rp, money, weeks: Math.max(1, Math.round(weeks * RESEARCH_TEMPO)), req: req || [], year: year || 1980, unlock: unlock || {}, perk: perk || {}, glyph,
});

export const RESEARCH_CATS = [
  { id: 'prod', color: '#ff6b5c', name: { sv: 'Produktion', en: 'Production' } },
  { id: 'genre', color: '#9b7bff', name: { sv: 'Genrer', en: 'Genres' } },
  { id: 'topic', color: '#f6b84a', name: { sv: 'Teman', en: 'Topics' } },
  { id: 'tech', color: '#4aa8ff', name: { sv: 'Teknik', en: 'Technology' } },
  { id: 'biz', color: '#6ee76a', name: { sv: 'Affärer', en: 'Business' } },
  { id: 'staff', color: '#ff8fd2', name: { sv: 'Personal', en: 'People' } },
];

export const RESEARCH = [
  // ── Produktion ───────────────────────────────────────────────
  R('p_dialogue', 'prod', 'Dialogträd', 'Dialogue Trees', 'Öppnar kategorin Dialog i fas 2.', 'Unlocks the Dialogue category in phase 2.', 14, 0, 3, [], 1980, { cats: ['dialogue'] }, {}, 'c_dialogue'),
  R('p_ai', 'prod', 'Enkel AI', 'Basic AI', 'Öppnar kategorin AI i fas 2.', 'Unlocks the AI category in phase 2.', 18, 0, 4, [], 1980, { cats: ['ai'] }, {}, 'c_ai'),
  R('p_sound', 'prod', 'Ljudchip', 'Sound Chip', 'Öppnar kategorin Ljud & musik i fas 3.', 'Unlocks the Sound & Music category in phase 3.', 22, 0, 4, [], 1980, { cats: ['sound'] }, {}, 'c_sound'),
  R('p_world', 'prod', 'Världsbibel', 'World Bible', 'Öppnar kategorin Världsbygge i fas 3.', 'Unlocks the World Design category in phase 3.', 36, 0, 5, ['p_dialogue'], 1981, { cats: ['world'] }, {}, 'c_world'),
  R('p_aud_young', 'prod', 'Ungdomsmarknad', 'Youth Market', 'Gör spel för en yngre publik.', 'Make games aimed at a younger audience.', 24, 0, 3, [], 1980, { aud: ['young'] }, {}, 'u_young'),
  R('p_aud_mature', 'prod', 'Vuxenmarknad', 'Mature Market', 'Gör spel för en vuxen publik.', 'Make games aimed at a mature audience.', 50, 0, 4, ['p_aud_young'], 1984, { aud: ['mature'] }, {}, 'u_mature'),
  R('p_scope_large', 'prod', 'Stora produktioner', 'Big Productions', 'Låser upp storleken Stor.', 'Unlocks large-scale games.', 80, 5000, 6, ['p_ai'], 1983, { scopes: ['large'] }, {}, 'u_scope'),
  R('p_scope_aaa', 'prod', 'Blockbuster-budgetar', 'Blockbuster Budgets', 'Låser upp AAA-produktioner med enorma team.', 'Unlocks AAA productions with huge teams.', 650, 150000, 12, ['p_scope_large', 'p_world'], 1996, { scopes: ['aaa'] }, {}, 'u_aaa'),
  R('p_second_genre', 'prod', 'Genreblandning', 'Genre Blending', 'Kombinera två genrer i samma spel.', 'Combine two genres in one game.', 110, 8000, 6, ['p_dialogue'], 1985, { flags: ['genre2'] }, {}, 'g_casual'),
  R('p_sequels', 'prod', 'Franchiseplanering', 'Franchise Planning', 'Gör uppföljare som ärver fans och hype.', 'Make sequels that inherit fans and hype.', 45, 0, 4, [], 1982, { flags: ['sequels'] }, {}, 'u_sequel'),
  R('p_engine', 'prod', 'Motorverkstad', 'Engine Workshop', 'Bygg egna spelmotorer av tekniska delar.', 'Build custom game engines from tech parts.', 70, 6000, 6, ['p_ai'], 1984, { flags: ['engines'] }, {}, 'c_engine'),

  // ── Genrer ───────────────────────────────────────────────────
  R('g_casual', 'genre', 'Casual-spel', 'Casual Games', 'Lättillgängliga spel för alla.', 'Easy games for everyone.', 20, 0, 3, [], 1980, { genres: ['casual'] }, {}, 'g_casual'),
  R('g_rpg', 'genre', 'Rollspel', 'Role-Playing', 'Djupa världar med levande figurer.', 'Deep worlds with living characters.', 32, 0, 4, ['p_dialogue'], 1981, { genres: ['rpg'] }, {}, 'g_rpg'),
  R('g_sim', 'genre', 'Simulering', 'Simulation', 'Komplexa system att pyssla med.', 'Complex systems to tinker with.', 42, 0, 5, ['p_ai'], 1982, { genres: ['simulation'] }, {}, 'g_simulation'),
  R('g_shooter', 'genre', 'Shooter', 'Shooters', 'Precision och tempo.', 'Precision and pace.', 65, 0, 5, ['p_ai'], 1984, { genres: ['shooter'] }, {}, 'g_shooter'),
  R('g_racing', 'genre', 'Racing', 'Racing', 'Fart och känsla.', 'Speed and feel.', 65, 0, 5, ['p_ai'], 1984, { genres: ['racing'] }, {}, 'g_racing'),

  // ── Teman ────────────────────────────────────────────────────
  R('tp_frontier', 'topic', 'Vilda berättelser', 'Frontier Tales', 'Teman: Vilda västern, Ninjor, Vikingar.', 'Topics: Wild West, Ninjas, Vikings.', 28, 0, 4, [], 1980, { topics: ['western', 'ninjas', 'vikings'] }, {}, 't_western'),
  R('tp_dark', 'topic', 'Mörka berättelser', 'Dark Tales', 'Teman: Skräck, Zombier.', 'Topics: Horror, Zombies.', 44, 0, 4, ['p_aud_young'], 1982, { topics: ['horror', 'zombies'] }, {}, 't_horror'),
  R('tp_scifi', 'topic', 'Sci-fi-världar', 'Sci-Fi Worlds', 'Teman: Utomjordingar, Robotar.', 'Topics: Aliens, Robots.', 48, 0, 4, [], 1982, { topics: ['aliens', 'robots'] }, {}, 't_aliens'),
  R('tp_life', 'topic', 'Livsstil', 'Lifestyle', 'Teman: Lantbruk, Matlagning, Musik.', 'Topics: Farming, Cooking, Music.', 55, 0, 5, ['g_casual'], 1984, { topics: ['farming', 'cooking', 'music'] }, {}, 't_farming'),
  R('tp_motor', 'topic', 'Bilar & brott', 'Cars & Crime', 'Teman: Gatubilar, Maffia.', 'Topics: Street Cars, Mob.', 80, 0, 5, ['g_racing'], 1986, { topics: ['cars', 'mafia'] }, {}, 't_cars'),
  R('tp_epic', 'topic', 'Episka legender', 'Epic Legends', 'Teman: Mytologi, Dinosaurier, Magi.', 'Topics: Mythology, Dinosaurs, Magic.', 120, 0, 6, ['g_rpg'], 1988, { topics: ['mythology', 'dinosaurs', 'magic'] }, {}, 't_mythology'),
  R('tp_builder', 'topic', 'Byggare', 'Builders', 'Teman: Stadsbygge, Flyg.', 'Topics: City Building, Aviation.', 140, 0, 6, ['g_sim'], 1989, { topics: ['city', 'airport'] }, {}, 't_city'),
  R('tp_campus', 'topic', 'Vardag', 'Everyday Life', 'Teman: Mode, Skolan, Sjukhus.', 'Topics: Fashion, School Life, Hospital.', 90, 0, 5, ['tp_life'], 1990, { topics: ['fashion', 'school', 'hospital'] }, {}, 't_school'),
  R('tp_modern', 'topic', 'Moderna konflikter', 'Modern Conflicts', 'Teman: Militär, Överlevnad, Superhjältar.', 'Topics: Military, Survival, Superheroes.', 240, 0, 7, ['g_shooter'], 1994, { topics: ['military', 'survival', 'heroes'] }, {}, 't_military'),
  R('tp_future', 'topic', 'Imorgon', 'Tomorrow', 'Teman: Cyberpunk, Tidsresor.', 'Topics: Cyberpunk, Time Travel.', 380, 0, 7, ['tp_scifi'], 1998, { topics: ['cyberpunk', 'timetravel'] }, {}, 't_cyberpunk'),

  // ── Teknik (motordelar) ──────────────────────────────────────
  R('f_scroll', 'tech', 'Mjuk skrollning', 'Smooth Scrolling', 'Motordel: Skrollning.', 'Engine part: Scrolling.', 32, 0, 4, [], 1981, { feats: ['scroll'] }, {}, 'f_gear'),
  R('f_tiles', 'tech', 'Tile-kartor', 'Tile Maps', 'Motordel: Tile-kartor.', 'Engine part: Tile maps.', 45, 0, 4, ['f_scroll'], 1982, { feats: ['tiles'] }, {}, 'f_gear'),
  R('f_synth', 'tech', 'Ljudsyntes', 'Sound Synth', 'Motordel: Syntljud.', 'Engine part: Synth audio.', 55, 0, 4, ['p_sound'], 1983, { feats: ['synth'] }, {}, 'f_gear'),
  R('f_cd', 'tech', 'CD-ROM-stöd', 'CD-ROM Support', 'Motordel: Förinspelade ljud och video.', 'Engine part: Streamed audio and video.', 260, 10000, 6, ['f_synth'], 1992, { feats: ['cd'] }, {}, 'f_gear'),
  R('f_poly', 'tech', '3D-polygoner', '3D Polygons', 'Motordel: Polygonrendering.', 'Engine part: Polygon rendering.', 320, 20000, 7, ['f_tiles'], 1993, { feats: ['poly'] }, {}, 'f_gear'),
  R('f_net', 'tech', 'Nätverksspel', 'Network Play', 'Motordel: Multiplayer över nätet.', 'Engine part: Online multiplayer.', 480, 25000, 7, ['f_cd'], 1996, { feats: ['net'] }, {}, 'f_gear'),
  R('f_phys', 'tech', 'Fysikmotor', 'Physics Engine', 'Motordel: Fysiksimulering.', 'Engine part: Physics simulation.', 420, 30000, 7, ['f_poly'], 1996, { feats: ['phys'] }, {}, 'f_gear'),
  R('f_light', 'tech', 'Dynamisk belysning', 'Dynamic Lighting', 'Motordel: Realtidsljus.', 'Engine part: Real-time lighting.', 620, 60000, 8, ['f_poly'], 1999, { feats: ['light'] }, {}, 'f_gear'),
  R('f_shader', 'tech', 'Shaders', 'Shaders', 'Motordel: Programmerbara effekter.', 'Engine part: Programmable effects.', 950, 100000, 8, ['f_light'], 2003, { feats: ['shader'] }, {}, 'f_gear'),
  R('f_mocap', 'tech', 'Rörelseinfångning', 'Motion Capture', 'Motordel: Realistiska animationer.', 'Engine part: Realistic animation.', 1300, 200000, 9, ['f_phys'], 2005, { feats: ['mocap'] }, {}, 'f_gear'),
  R('f_cloud', 'tech', 'Molntjänster', 'Cloud Services', 'Motordel: Servrar och live-tjänster.', 'Engine part: Servers and live services.', 2100, 400000, 10, ['f_net'], 2010, { feats: ['cloud'] }, {}, 'f_gear'),
  R('f_pbr', 'tech', 'Fotorealism', 'Photoreal Rendering', 'Motordel: Fysikaliskt korrekt rendering.', 'Engine part: Physically based rendering.', 5200, 900000, 12, ['f_shader'], 2014, { feats: ['pbr'] }, {}, 'f_gear'),
  R('f_vr', 'tech', 'VR-rendering', 'VR Rendering', 'Motordel: Stereoskopisk 3D.', 'Engine part: Stereoscopic 3D.', 3600, 700000, 10, ['f_shader'], 2015, { feats: ['vr'] }, {}, 'f_gear'),

  // ── Affärer ──────────────────────────────────────────────────
  R('b_mkt1', 'biz', 'Pressmaterial', 'Press Kits', 'Marknadsföring: Pressutskick.', 'Marketing: Press release.', 22, 0, 3, [], 1980, { mkt: ['press'] }, {}, 'm_press'),
  R('b_mkt2', 'biz', 'Tidningsannonser', 'Magazine Ads', 'Marknadsföring: Annonser i spelpressen.', 'Marketing: Ads in the gaming press.', 55, 0, 4, ['b_mkt1'], 1982, { mkt: ['ads'] }, {}, 'm_ads'),
  R('b_mkt3', 'biz', 'TV-reklam', 'TV Spots', 'Marknadsföring: Reklamfilm.', 'Marketing: TV commercials.', 200, 0, 5, ['b_mkt2'], 1988, { mkt: ['tv'] }, {}, 'm_tv'),
  R('b_mkt4', 'biz', 'Nätkampanjer', 'Online Campaigns', 'Marknadsföring: Trailers och communities.', 'Marketing: Trailers and communities.', 520, 0, 6, ['b_mkt3'], 1998, { mkt: ['online'] }, {}, 'm_online'),
  R('b_mkt5', 'biz', 'Influencer-avtal', 'Influencer Deals', 'Marknadsföring: Streamers och kreatörer.', 'Marketing: Streamers and creators.', 1300, 0, 6, ['b_mkt4'], 2008, { mkt: ['influencer'] }, {}, 'm_influencer'),
  R('b_expo', 'biz', 'Mässmonter', 'Convention Booth', 'Visa upp pågående spel på årsmässan.', 'Show work-in-progress at the annual expo.', 70, 0, 4, ['b_mkt1'], 1983, { flags: ['expo'] }, {}, 'f_expo'),
  R('b_port', 'biz', 'Porteringsteam', 'Porting Team', 'Låt ett externt team porta släppta spel till andra plattformar du har licens för.', 'Have an outside team port released games to other platforms you hold a license for.', 60, 5000, 4, ['b_mkt1'], 1983, { flags: ['ports'] }, {}, 'gp_console'),
  R('b_remaster', 'biz', 'Remaster', 'Remasters', 'Gör om gamla klassiker (minst tio år, betyg 7+) för dagens maskiner: dyrare än en portering, men inget åldrande och lite nostalgi.', 'Remake old classics (ten years or older, score 7+) for today\'s hardware: dearer than a port, but no ageing and a little nostalgia.', 700, 120000, 6, ['b_port'], 1999, { flags: ['remaster'] }, {}, 'gp_console'),
  R('b_merch', 'biz', 'Licensavdelning', 'Licensing Office', 'Sälj licenser för dina spelserier till leksaker, serietidningar och (från 1993) film.', 'License your game series for toys, comics and (from 1993) films.', 140, 15000, 4, ['b_mkt2', 'p_sequels'], 1986, { flags: ['merch'] }, {}, 'u_sequel'),
  R('b_publish', 'biz', 'Förlagsverksamhet', 'Publishing Label', 'Ge ut andra studiors spel: betala ett förskott och få hälften av försäljningen.', 'Publish other studios\' games: pay an advance and take half of the sales.', 320, 40000, 6, ['b_mktdept'], 1990, { flags: ['publish'] }, {}, 'c_story'),
  R('b_train', 'biz', 'Utbildningslokal', 'Training Room', 'Anläggning: Utbildningsrum.', 'Facility: Training Room.', 70, 0, 4, ['s_train1'], 1983, { facs: ['training'] }, {}, 'f_training'),
  R('b_qa', 'biz', 'QA-avdelning', 'QA Department', 'Anläggning: QA-labb som fixar buggar snabbare.', 'Facility: QA lab that fixes bugs faster.', 60, 0, 4, ['q_triage'], 1984, { facs: ['qa'] }, {}, 'f_qa'),
  R('b_fun', 'biz', 'Spelrum', 'Game Room', 'Anläggning: Arkad och sittsäckar höjer humöret.', 'Facility: Arcade and beanbags lift morale.', 90, 0, 4, [], 1985, { facs: ['gameroom'] }, {}, 'f_gameroom'),
  R('b_mktdept', 'biz', 'Marknadsavdelning', 'Marketing Dept', 'Anläggning: Billigare och starkare kampanjer.', 'Facility: Cheaper, stronger campaigns.', 150, 0, 5, ['b_mkt2'], 1988, { facs: ['marketing'] }, {}, 'f_marketing'),
  R('b_server', 'biz', 'Serverrum', 'Server Room', 'Anläggning: servrar för onlinespel. Låser upp onlinespel (MMO) med abonnemang och expansioner.', 'Facility: servers for online games. Unlocks online games (MMO) with subscriptions and expansions.', 420, 0, 6, ['f_net'], 1997, { facs: ['server'] }, {}, 'f_server'),

  // ── Kvalitet / QA ────────────────────────────────────────────
  R('q_triage', 'prod', 'Buggtriage', 'Bug Triage', 'Fixar buggar 25% snabbare.', 'Fixes bugs 25% faster.', 36, 0, 3, [], 1981, {}, { qa: 0.25 }, 'q_bug'),
  R('q_auto', 'prod', 'Automatiserad testning', 'Automated Testing', 'Fixar buggar 35% snabbare.', 'Fixes bugs 35% faster.', 260, 0, 5, ['q_triage'], 1993, {}, { qa: 0.35 }, 'q_bug'),
  R('q_ci', 'prod', 'Kontinuerlig integration', 'Continuous Integration', 'Fixar buggar 40% snabbare och färre buggar uppstår.', 'Fixes bugs 40% faster and fewer bugs appear.', 900, 0, 6, ['q_auto'], 2002, {}, { qa: 0.4, bugs: -0.1 }, 'q_bug'),
  R('q_patch', 'prod', 'Patch-flöde', 'Patch Pipeline', 'Släpp patchar efter lansering.', 'Release patches after launch.', 300, 0, 5, ['q_auto'], 1998, { flags: ['patches'] }, {}, 'q_patch'),

  // ── Personal ─────────────────────────────────────────────────
  R('s_train1', 'staff', 'Utbildning', 'Training Courses', 'Skicka personal på kurs för att höja färdigheter.', 'Send staff on courses to raise their skills.', 38, 0, 3, [], 1980, { flags: ['training'] }, {}, 's_train'),
  R('s_train2', 'staff', 'Avancerade kurser', 'Advanced Training', 'Högre tak på färdigheter och bättre kurser.', 'Higher skill caps and better courses.', 180, 0, 5, ['s_train1'], 1990, { flags: ['training2'] }, { skillCap: 40 }, 's_train'),
  R('s_hr1', 'staff', 'Rekryteringsbyrå', 'Recruiting Agency', 'Fler och bättre kandidater varje månad.', 'More and better candidates every month.', 70, 0, 4, [], 1983, { flags: ['hr1'] }, { hire: 1 }, 's_hr'),
  R('s_hr2', 'staff', 'Headhunters', 'Headhunters', 'Elitprofiler dyker upp.', 'Elite profiles show up.', 300, 0, 5, ['s_hr1'], 1992, { flags: ['hr2'] }, { hire: 1 }, 's_hr'),
  R('s_perks', 'staff', 'Personalförmåner', 'Staff Perks', 'Högre arbetsglädje och mindre personalomsättning.', 'Higher morale and less staff turnover.', 50, 0, 4, [], 1984, {}, { morale: 8 }, 's_perk'),
];
// Förfiningar: återkommande forskning när trädet tar slut. Varje nivå ger perk igen och kostar mer (sim/research.js
// researchCost: rp × 2^nivå, pengar × årets penningvärde × 1,5^nivå). max = antal nivåer; nivå n går att forska från
// år year + 3n (researchYear), så att linjerna räcker in på 2000-talet.
const F = (id, cat, sv, en, dsv, den, rp, money, req, max, perk, year) => ({
  id, cat, name: { sv, en }, desc: { sv: dsv, en: den }, rp, money, weeks: 5 * RESEARCH_TEMPO, req, year, unlock: {}, perk, glyph: null, max, refine: true,
});
export const REFINES = [
  F('x_quality', 'prod', 'Kvalitetsrutiner', 'Quality Routines', 'Varje nivå: buggar fixas 5 % snabbare och det blir 2 % färre.', 'Each level: bugs get fixed 5% faster and there are 2% fewer.', 300, 20000, ['q_auto'], 8, { qa: 0.05, bugs: -0.02 }, 1994),
  F('x_brand', 'biz', 'Varumärkesbygge', 'Brand Building', 'Varje nivå: dina spel säljer 2 % mer.', 'Each level: your games sell 2% more.', 400, 40000, ['b_mktdept'], 8, { sales: 0.02 }, 1989),
  F('x_media', 'biz', 'Mediekontakter', 'Media Relations', 'Varje nivå: marknadsföring kostar 4 % mindre.', 'Each level: marketing costs 4% less.', 300, 20000, ['b_mkt3'], 6, { mktCost: 0.04 }, 1989),
  F('x_craft', 'staff', 'Mästarkurser', 'Master Classes', 'Varje nivå: utbildning når 5 poäng högre.', 'Each level: training reaches 5 points higher.', 350, 25000, ['s_train2'], 6, { skillCap: 5 }, 1991),
  F('x_culture', 'staff', 'Studiokultur', 'Studio Culture', 'Varje nivå: teamets humör vilar 2 poäng högre.', 'Each level: team mood settles 2 points higher.', 250, 15000, ['s_perks'], 5, { morale: 2 }, 1985),
];
export const RES = Object.fromEntries([...RESEARCH, ...REFINES].map((r) => [r.id, r]));

// Motordelar (används i motorverkstaden). tech = poängbonus, cost = pengar, weeks = byggtid.
export const FEATURES = [
  { id: 'sprites', tech: 4, cost: 800, start: true, name: { sv: 'Sprite-motor', en: 'Sprite Engine' } },
  { id: 'scroll', tech: 6, cost: 1500, name: { sv: 'Skrollning', en: 'Scrolling' } },
  { id: 'tiles', tech: 7, cost: 2200, name: { sv: 'Tile-kartor', en: 'Tile Maps' } },
  { id: 'synth', tech: 8, cost: 3500, name: { sv: 'Ljudsyntes', en: 'Sound Synth' } },
  { id: 'cd', tech: 12, cost: 9000, name: { sv: 'CD-ROM-stöd', en: 'CD-ROM Support' } },
  { id: 'poly', tech: 18, cost: 20000, name: { sv: '3D-polygoner', en: '3D Polygons' } },
  { id: 'net', tech: 16, cost: 28000, name: { sv: 'Nätverksspel', en: 'Network Play' } },
  { id: 'phys', tech: 18, cost: 32000, name: { sv: 'Fysikmotor', en: 'Physics Engine' } },
  { id: 'light', tech: 22, cost: 60000, name: { sv: 'Dynamisk belysning', en: 'Dynamic Lighting' } },
  { id: 'shader', tech: 28, cost: 110000, name: { sv: 'Shaders', en: 'Shaders' } },
  { id: 'mocap', tech: 26, cost: 190000, name: { sv: 'Rörelseinfångning', en: 'Motion Capture' } },
  { id: 'cloud', tech: 30, cost: 380000, name: { sv: 'Molntjänster', en: 'Cloud Services' } },
  { id: 'vr', tech: 34, cost: 650000, name: { sv: 'VR-rendering', en: 'VR Rendering' } },
  { id: 'pbr', tech: 40, cost: 850000, name: { sv: 'Fotorealism', en: 'Photoreal Rendering' } },
];
export const FEAT = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

// Marknadsföringskampanjer. hype = tillskott, cost = bas i dagens pengar (skalas med år).
export const MARKETING = [
  { id: 'press', hype: 7, cost: 700, name: { sv: 'Pressutskick', en: 'Press Release' }, glyph: 'm_press' },
  { id: 'ads', hype: 14, cost: 2600, name: { sv: 'Tidningsannons', en: 'Magazine Ad' }, glyph: 'm_ads' },
  { id: 'tv', hype: 24, cost: 12000, name: { sv: 'TV-reklam', en: 'TV Spot' }, glyph: 'm_tv' },
  { id: 'online', hype: 32, cost: 30000, name: { sv: 'Trailer & community', en: 'Trailer & Community' }, glyph: 'm_online' },
  { id: 'influencer', hype: 40, cost: 80000, name: { sv: 'Influencer-kampanj', en: 'Influencer Campaign' }, glyph: 'm_influencer' },
];
export const MKT = Object.fromEntries(MARKETING.map((m) => [m.id, m]));
