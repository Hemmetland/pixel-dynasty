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
  { id: 'hw', color: '#d99a5b', name: { sv: 'Hårdvara', en: 'Hardware' } },
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
  R('p_second_genre', 'prod', 'Genreblandning', 'Genre Blending', 'Kombinera två genrer i samma spel. Rätt blandning ger ett bättre recept, men teamet måste också kunna båda genrerna.', 'Combine two genres in one game. The right mix makes a better recipe, but the team must also know both genres.', 110, 8000, 6, ['p_dialogue'], 1985, { flags: ['genre2'] }, {}, 'g_casual'),
  R('p_sequels', 'prod', 'Franchiseplanering', 'Franchise Planning', 'Gör uppföljare som ärver fans och förväntan.', 'Make sequels that inherit fans and hype.', 45, 0, 4, [], 1982, { flags: ['sequels'] }, {}, 'u_sequel'),
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
  R('f_proc', 'tech', 'Procedurell generering', 'Procedural Generation', 'Motordel: Världar och banor som bygger sig själva.', 'Engine part: Worlds and levels that build themselves.', 7500, 1300000, 12, ['f_pbr'], 2017, { feats: ['proc'] }, {}, 'f_gear'),
  R('f_rt', 'tech', 'Strålföljning', 'Ray Tracing', 'Motordel: Ljus som beter sig som i verkligheten.', 'Engine part: Light that behaves like the real thing.', 11000, 2200000, 12, ['f_pbr'], 2019, { feats: ['rt'] }, {}, 'f_gear'),
  R('f_ml', 'tech', 'Maskininlärning', 'Machine Learning', 'Motordel: Motståndare som lär sig och animation som fyller i luckorna.', 'Engine part: Opponents that learn and animation that fills in the gaps.', 16000, 3500000, 14, ['f_proc', 'f_rt'], 2022, { feats: ['ml'] }, {}, 'f_gear'),
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
  R('b_acq', 'biz', 'Uppköp', 'Acquisitions', 'Köp upp konkurrerande studior. De blir dotterbolag: du får en andel av deras försäljning och deras släpp krockar inte längre med dina.', 'Buy rival studios. They become subsidiaries: you take a share of their sales and their releases stop clashing with yours.', 900, 500000, 8, ['b_mktdept'], 2000, { flags: ['acquire'] }, {}, 'f_marketing'),
  R('b_group', 'biz', 'Koncernledning', 'Group Management', 'Styr dina dotterbolag: slå ihop dem för en större andel och samarbetsvinster genom koncernens verksamheter, sätt deras budget och tillsätt en VD ur din personal. Ledningen räcker bara till ett visst antal bolag.', 'Run your subsidiaries: merge them for a bigger share and shared benefits through the group\'s operations, set their budget and appoint a CEO from your staff. Management only stretches to a certain number of companies.', 1000, 700000, 8, ['b_acq'], 2003, { flags: ['group'] }, {}, 'f_marketing'),
  R('b_board', 'biz', 'Koncernstyrelse', 'Group Board', 'En styrelse sköter koncernen åt dig: den köper upp konkurrenter, slår ihop dotterbolagen och sätter deras budget själv, och håller alltid en reserv i kassan. Du anger vad den får göra, och den lägger fram en rapport varje kvartal. Med ett campus växer koncernen: fler dotterbolag och mer plats för ledningen.', 'A board runs the group for you: it buys rivals, merges the subsidiaries and sets their budgets by itself, and always keeps a reserve in the bank. You choose what it may do, and it reports every quarter. With a campus the group can grow: more subsidiaries and more room for management.', 1400, 1500000, 10, ['b_group', 's_hrdept'], 2006, { flags: ['groupBoard'] }, {}, 'f_marketing'),
  R('b_biz', 'biz', 'Affärsavdelning', 'Business Department', 'En affärsavdelning sköter förlaget och licensaffärerna åt dig: den skriver på pitchar med tillräckligt bra demo och tar emot erbjudanden om prylar, serietidningar och film, men bara när kassan har en reserv kvar. Du anger hur kräsen den ska vara, och den lägger fram en rapport varje kvartal.', 'A business department runs your label and licensing deals for you: it signs pitches with a good enough demo and accepts offers for merchandise, comics and films, but only while the bank keeps a reserve. You set how picky it is, and it reports every quarter.', 1100, 800000, 8, ['b_publish', 'b_merch'], 2004, { flags: ['bizAuto'] }, {}, 'f_marketing'),
  R('b_store', 'biz', 'Digital butik', 'Digital Storefront', 'Bygg en egen butik och launcher för pc-spel: sälj koncernens spel utan mellanhand, och välj om andra förlag får sälja där mot en avgift. Drift och support kostar varje vecka, men butiken går att pausa.', 'Build your own PC store and launcher: sell the group\'s games without a middleman, and choose whether other publishers may sell there for a fee. Running and support cost money every week, but the store can be paused.', 1100, 600000, 8, ['b_server'], 2003, { flags: ['store'] }, {}, 'p_pc'),
  R('b_train', 'biz', 'Utbildningslokal', 'Training Room', 'Anläggning: Utbildningsrum.', 'Facility: Training Room.', 70, 0, 4, ['s_train1'], 1983, { facs: ['training'] }, {}, 'f_training'),
  R('b_qa', 'biz', 'QA-avdelning', 'QA Department', 'Anläggning: QA-labb som fixar buggar snabbare.', 'Facility: QA lab that fixes bugs faster.', 60, 0, 4, ['q_triage'], 1984, { facs: ['qa'] }, {}, 'f_qa'),
  R('b_fun', 'biz', 'Spelrum', 'Game Room', 'Anläggning: Arkad och sittsäckar höjer humöret.', 'Facility: Arcade and beanbags lift morale.', 90, 0, 4, [], 1985, { facs: ['gameroom'] }, {}, 'f_gameroom'),
  R('b_mktdept', 'biz', 'Marknadsavdelning', 'Marketing Dept', 'Anläggning: Billigare och starkare kampanjer.', 'Facility: Cheaper, stronger campaigns.', 150, 0, 5, ['b_mkt2'], 1988, { facs: ['marketing'] }, {}, 'f_marketing'),
  R('b_server', 'biz', 'Serverrum', 'Server Room', 'Anläggning: servrar för onlinespel. Låser upp onlinespel (MMO) med abonnemang och expansioner.', 'Facility: servers for online games. Unlocks online games (MMO) with subscriptions and expansions.', 420, 0, 6, ['f_net'], 1997, { facs: ['server'] }, {}, 'f_server'),

  // ── Kvalitet / QA ────────────────────────────────────────────
  R('q_triage', 'prod', 'Buggtriage', 'Bug Triage', 'Fixar buggar 25% snabbare.', 'Fixes bugs 25% faster.', 36, 0, 3, [], 1981, {}, { qa: 0.25 }, 'q_bug'),
  R('q_auto', 'prod', 'Automatiserad testning', 'Automated Testing', 'Fixar buggar 35% snabbare.', 'Fixes bugs 35% faster.', 260, 0, 5, ['q_triage'], 1993, {}, { qa: 0.35 }, 'q_bug'),
  R('q_ci', 'prod', 'Automatiska tester', 'Automated Testing', 'Fixar buggar 40% snabbare och färre buggar uppstår.', 'Fixes bugs 40% faster and fewer bugs appear.', 900, 0, 6, ['q_auto'], 2002, {}, { qa: 0.4, bugs: -0.1 }, 'q_bug'),
  R('q_patch', 'prod', 'Buggfix-flöde', 'Patch Flow', 'Släpp buggfixar efter lansering.', 'Release patches after launch.', 300, 0, 5, ['q_auto'], 1998, { flags: ['patches'] }, {}, 'q_patch'),

  // ── Personal ─────────────────────────────────────────────────
  R('s_train1', 'staff', 'Utbildning', 'Training Courses', 'Skicka personal på kurs för att höja färdigheter. Ett bra betyg kräver både skickligt folk och ett bra recept.', 'Send staff on courses to raise their skills. A good score needs both skilled people and a good recipe.', 38, 0, 3, [], 1980, { flags: ['training'] }, {}, 's_train'),
  R('s_train2', 'staff', 'Avancerade kurser', 'Advanced Training', 'Högre tak på färdigheter och bättre kurser.', 'Higher skill caps and better courses.', 180, 0, 5, ['s_train1'], 1990, { flags: ['training2'] }, { skillCap: 40 }, 's_train'),
  R('s_auto', 'staff', 'Självgående team', 'Self-Running Teams', 'Ett team kan ta egna uppdrag: en uppföljare, en expansion eller ett nytt spel, och bli bättre för varje spel.', 'A team can take its own missions: a sequel, an expansion or a new game, and get better with every game.', 650, 120000, 8, ['s_train2', 'p_scope_large'], 1998, { flags: ['autoTeams'] }, {}, 's_train'),
  R('s_ops', 'staff', 'Driftteam', 'Live Ops Teams', 'Ett team tar hand om ett onlinespel året runt: innehållet håller sig fräscht, avbrotten blir färre och spelet åldras långsammare. Teamet startar uppdateringar, evenemang och nya regioner själv.', 'A team looks after an online game all year round: content stays fresh, outages are rarer and the game ages slower. The team starts updates, events and new regions on its own.', 900, 300000, 9, ['s_auto', 'b_server'], 2000, { flags: ['opsTeams'] }, {}, 's_train'),
  R('s_hwteam', 'staff', 'Produktteam', 'Product Teams', 'Ett litet team med arbetsledare tar hand om en hårdvarulinje: produkterna åldras långsammare, Pro- och Slim-versioner kommer billigare och teamet kan ta fram nästa generation själv.', 'A small team with a leader looks after a hardware line: products age slower, Pro and Slim versions come cheaper and the team can develop the next generation on its own.', 1100, 400000, 9, ['s_auto', 'h_pc'], 2002, { flags: ['hwTeams'] }, {}, 's_train'),
  R('s_shop', 'staff', 'Butiksteam', 'Store Teams', 'Ett team med arbetsledare sköter butikens kampanjer åt dig: erbjudanden, Veckans spel, spelpaket och temaveckor. Du bestämmer budget och hur djärvt de får kampanja, och ett skickligt team får kampanjerna att sälja mer och Veckans spel att kosta mindre.', 'A team with a leader runs the store\'s campaigns for you: offers, the weekly spotlight, game bundles and theme weeks. You set the budget and how bold they may be, and a skilled team makes campaigns sell more and the spotlight cost less.', 1000, 350000, 9, ['s_auto', 'b_store'], 2006, { flags: ['shopTeams'] }, {}, 's_train'),
  R('s_eng', 'staff', 'Motorteam', 'Engine Teams', 'Ett team med arbetsledare bygger spelmotorer i verkstaden vid sidan om studions spel, så att hela studion kan fortsätta göra spel medan motorn tar form. Teamet byter motor själv när den bästa har blivit för gammal, inom en budget du bestämmer, och ett skickligt team får motorerna att bli lite bättre.', 'A team with a leader builds game engines in the workshop alongside the studio\'s games, so the whole studio can keep making games while the engine takes shape. The team replaces the engine on its own when the best one has grown too old, within a budget you set, and a skilled team makes the engines a little better.', 900, 250000, 8, ['s_auto', 'p_engine'], 1998, { flags: ['engTeams'] }, {}, 's_train'),
  R('s_res', 'staff', 'Forskningsteam', 'Research Teams', 'Ett team forskar på heltid i labbet. Inriktningen Ny teknik ger alla spel lite mer teknik och fler forskningspoäng. Inriktningen Recept bygger studions receptkunskap steg för steg: först vet ni idealfördelningen för alla genrer, sedan vad som passar ihop, och självgående team väljer allt bättre recept medan hela studion lär sig genrerna. Det tar många år, och ett bra recept räcker inte: betyget kräver också ett skickligt team.', 'A team researches full time in the lab. The New Tech focus gives every game a little more tech and more research points. The Recipes focus builds the studio\'s recipe knowledge step by step: first you know the ideal split for every genre, then what fits together, and self-running teams pick better and better recipes while the whole studio learns the genres. It takes many years, and a good recipe is not enough: the score also needs a skilled team.', 1300, 500000, 10, ['s_auto'], 2001, { flags: ['resTeams'] }, {}, 's_train'),
  R('s_hrdept', 'staff', 'Personalavdelning', 'HR Department', 'En personalavdelning sköter anställningarna åt dig. Du anger hur många spelteam studion ska ha och hur stora de ska vara, så anställer den själv de som passar bäst bland kandidaterna, bildar nya team och fyller på när någon slutar. Den håller alltid en reserv i kassan.', 'An HR department handles the hiring for you. You say how many game teams the studio should have and how big they should be, and it hires the best fit among the candidates, forms new teams and tops them up when someone leaves. It always keeps a reserve in the bank.', 1000, 400000, 8, ['s_auto', 's_hr1'], 2004, { flags: ['hrAuto'] }, {}, 's_hr'),
  R('s_campus', 'staff', 'Campus', 'Campus', 'När Dynastitornet är fullt kan du bygga hus bredvid det: varje hus ger 30 skrivbord, plats för fyra team till och två kandidater till varje månad. Det krävs ett stort och välfungerande studio, och hyran växer med varje hus. Så blir en studio med hundratals anställda möjlig.', 'When the Dynasty Tower is full you can build houses next to it: each gives 30 desks, room for four more teams and two more candidates every month. It takes a large, well-run studio, and the rent grows with every house. This is how a studio with hundreds of employees becomes possible.', 2600, 3000000, 12, ['s_res'], 2008, { flags: ['campus'] }, {}, 's_train'),
  R('s_hr1', 'staff', 'Rekryteringsbyrå', 'Recruiting Agency', 'Fler och bättre kandidater varje månad.', 'More and better candidates every month.', 70, 0, 4, [], 1983, { flags: ['hr1'] }, { hire: 1 }, 's_hr'),
  R('q_cloudqa', 'prod', 'Molnbaserad testning', 'Cloud Testing', 'Tusentals testmaskiner på en gång: buggar fixas 50 % snabbare och färre slinker igenom.', 'Thousands of test machines at once: bugs get fixed 50% faster and fewer slip through.', 6000, 900000, 10, ['q_ci'], 2016, {}, { qa: 0.5, bugs: -0.1 }, 'q_bug'),
  R('b_data', 'biz', 'Spelaranalys', 'Player Analytics', 'Du ser vad spelarna gör och formar spelen efter det: dina spel säljer 5 % mer.', 'You see what players do and shape games to fit: your games sell 5% more.', 8000, 1500000, 10, ['b_mkt5'], 2017, {}, { sales: 0.05 }, 'm_online'),
  R('s_remote', 'staff', 'Distansarbete', 'Remote Work', 'Kandidater från hela världen och ett lugnare team.', 'Candidates from all over the world and a calmer team.', 6500, 800000, 10, ['s_hr2'], 2018, {}, { hire: 0.5, morale: 4 }, 's_hr'),
  R('s_hr2', 'staff', 'Headhunters', 'Headhunters', 'Elitprofiler dyker upp.', 'Elite profiles show up.', 300, 0, 5, ['s_hr1'], 1992, { flags: ['hr2'] }, { hire: 1 }, 's_hr'),
  R('s_perks', 'staff', 'Personalförmåner', 'Staff Perks', 'Högre arbetsglädje och mindre personalomsättning.', 'Higher morale and less staff turnover.', 50, 0, 4, [], 1984, {}, { morale: 8 }, 's_perk'),

  // ── Hårdvara (egna produkter, sim/hardware.js) ──────────────
  R('h_lab', 'hw', 'Hårdvarulabb', 'Hardware Lab', 'Öppna en hårdvaruavdelning som designar egna produkter vid sidan av spelen. Tillverkningen sköts av externa partners.', 'Open a hardware division that designs your own products alongside the games. Outside partners handle manufacturing.', 160, 40000, 5, ['p_sound', 'p_engine'], 1989, { flags: ['hw'] }, {}, null),
  R('h_sound', 'hw', 'Ljudkort', 'Sound Cards', 'Produkttyp: ljudkort för pc. En liten marknad, men billig att komma in på.', 'Product type: PC sound cards. A small market, but cheap to get into.', 120, 30000, 4, ['h_lab'], 1989, { flags: ['hw_sound'] }, {}, null),
  R('h_gpu', 'hw', '3D-grafikkretsar', '3D Graphics Chips', 'Produkttyp: grafikkort. Dyrt att designa, men pc-spelarna köper ett nytt vart par år.', 'Product type: graphics cards. Costly to design, but PC players buy a new one every couple of years.', 900, 400000, 7, ['h_lab', 'f_poly'], 1995, { flags: ['hw_gpu'] }, {}, null),
  R('h_driver', 'hw', 'Drivrutinsteam', 'Driver Team', '+15 spelstöd på nya komponenter, och ett drivrutinsteam kan förbättra det efter lanseringen.', '+15 game support on new components, and a driver team can keep improving it after launch.', 400, 150000, 5, ['h_gpu'], 1996, { flags: ['hw_driver'] }, {}, null),
  R('h_pc', 'hw', 'Speldatorer', 'Gaming PCs', 'Produkttyp: färdigbyggda speldatorer. Med egna grafikkort och processorer blir de billigare och snabbare.', 'Product type: prebuilt gaming PCs. Your own graphics cards and processors make them cheaper and faster.', 700, 300000, 6, ['h_gpu'], 1998, { flags: ['hw_pc'] }, {}, null),
  R('h_cpu', 'hw', 'Processordesign', 'Processor Design', 'Produkttyp: processorer, med köpt design eller egen processordesign (snabbare och utan avgift per såld enhet, men utvecklarna måste lära sig den).', 'Product type: processors, with a bought design or your own processor design (faster and free of fees per unit sold, but developers have to learn it).', 2400, 2500000, 9, ['h_gpu'], 1999, { flags: ['hw_cpu'] }, {}, null),
  R('h_lowpow', 'hw', 'Strömsnål design', 'Low-Power Design', 'Kretsar som klarar sig på batteri. Krävs för en bärbar spelenhet och gör den 10 % billigare att tillverka.', 'Chips that can live on a battery. Required for a handheld and makes it 10% cheaper to build.', 1600, 1500000, 7, ['h_cpu'], 2002, { flags: ['hw_lowpow'] }, {}, null),
  R('h_handheld', 'hw', 'Bärbar spelenhet', 'Handheld Console', 'Produkttyp: en egen bärbar spelenhet. Varje såld enhet växer en egen plattform som dina spel kan släppas på, och andra förlag betalar licens för att släppa där.', 'Product type: your own handheld. Every unit sold grows a platform of your own that your games can launch on, and other publishers pay a license fee to release there.', 2500, 3000000, 8, ['h_lowpow'], 2003, { flags: ['hw_handheld'] }, {}, null),
  R('h_soc', 'hw', 'Systemkretsar', 'Systems on a Chip', 'Egen processordesign även i bärbara enheter och konsoler: snabbare och utan avgift per såld enhet, men utvecklarna måste lära sig den.', 'Your own processor design in handhelds and consoles too: faster and free of fees per unit sold, but developers have to learn it.', 3000, 4000000, 9, ['h_cpu', 'h_lowpow'], 2003, { flags: ['hw_soc'] }, {}, null),
  R('h_devkit', 'hw', 'Utvecklarprogram', 'Developer Program', '+15 spelstöd på dina plattformar och 20 % fler förlag som släpper spel där. Utvecklarstöd kan förbättra det efter lanseringen.', '+15 game support on your platforms and 20% more publishers releasing there. Developer support can keep improving it after launch.', 1800, 2000000, 6, ['h_handheld'], 2004, { flags: ['hw_devkit'] }, {}, null),
  R('h_console', 'hw', 'Konsolplattform', 'Console Platform', 'Produkttyp: en egen konsol för vardagsrummet. Den säljs med förlust i början, och vinsten kommer från licenser, egna spel och tiden.', 'Product type: your own living-room console. It sells at a loss at first, and the profit comes from licenses, your own games and time.', 6000, 10000000, 10, ['h_soc', 'b_server'], 2005, { flags: ['hw_console'] }, {}, null),
  R('h_backcompat', 'hw', 'Bakåtkompatibilitet', 'Backward Compatibility', 'En ny modell av din bärbara enhet eller konsol spelar föregångarens spel: den startar med 40 % av den gamla plattformens spelare, men kostar 8 % mer att tillverka.', 'A new model of your handheld or console plays its predecessor\'s games: it starts with 40% of the old platform\'s players, but costs 8% more to build.', 2000, 4000000, 6, ['h_console'], 2010, { flags: ['hw_backcompat'] }, {}, null),
  R('h_fab', 'hw', 'Egen fabrik', 'Own Factory', 'Bygg en egen fabrik som tillverkar dina produkter: 20 % billigare än Meridian, fyra veckors ledtid och inga bristhändelser, men bygget är dyrt och driften kostar varje månad även när fabriken står still.', 'Build a factory of your own to make your products: 20% cheaper than Meridian, a four-week lead time and no shortages, but it is costly to build and costs money every month even when it stands idle.', 4000, 6000000, 8, ['h_soc'], 2008, { flags: ['hw_fab'] }, {}, null),
  R('h_vr', 'hw', 'VR-headset', 'VR Headset', 'Produkttyp: ett eget VR-headset. En liten och ny marknad där Lumen Rift är enda rivalen. Varje såld enhet växer en egen VR-plattform, där action, simulering och skjutspel säljer bäst.', 'Product type: your own VR headset. A small, new market where Lumen Rift is the only rival. Every unit sold grows a VR platform of your own, where action, simulation and shooters sell best.', 5000, 12000000, 9, ['h_handheld', 'f_vr'], 2015, { flags: ['hw_vr'] }, {}, null),
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
  F('x_yield', 'hw', 'Tillverkningsoptimering', 'Yield Tuning', 'Varje nivå: din hårdvara kostar 2 % mindre att tillverka.', 'Each level: your hardware costs 2% less to manufacture.', 500, 100000, ['h_lab'], 6, { hwCost: 0.02 }, 1992),
  F('x_arch', 'hw', 'Processorförfining', 'Processor Tuning', 'Varje nivå: nya hårdvarudesigner får 1,5 % mer kraft.', 'Each level: new hardware designs get 1.5% more power.', 800, 300000, ['h_gpu'], 6, { hwPerf: 0.015 }, 1997),
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
  { id: 'proc', tech: 38, cost: 1100000, name: { sv: 'Procedurell generering', en: 'Procedural Generation' } },
  { id: 'rt', tech: 44, cost: 1800000, name: { sv: 'Strålföljning', en: 'Ray Tracing' } },
  { id: 'ml', tech: 50, cost: 2800000, name: { sv: 'Maskininlärning', en: 'Machine Learning' } },
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
