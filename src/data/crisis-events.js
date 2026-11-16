// Rivaler och kriser: händelser där en rival går efter studion personligen (kind 'hunt') och kriser som spelaren måste hantera
// (kind 'crisis'). De dras inte av månadsslumpen i events.js utan av sim/crisis.js, som väljer bland dem med hashStr (aldrig G.rng).
// Samma form som övriga händelser (se data/events.js). Texterna kan ha {rival} (rivalens namn) och {rtitle} (rivalens senaste spel).
// Extra fx-nycklar: rev (andel av en vanlig månads intäkter, ± så att kostnaden följer studions storlek), payroll (andel av en månadslön
// för hela personalen, ±) och heat (rivalens jakt, ±: minus lugnar ner den).
const E = (id, kind, weight, when, title, body, choices, needs) => ({ id, kind, weight, when, title, body, choices, needs });
const C = (sv, en, fx, dsv, den) => ({ label: { sv, en }, fx, hint: dsv ? { sv: dsv, en: den } : null });
const R = (sv, en) => ({ sv, en });

const rivalIn = (G) => !!G.rival && (G.comps || []).some((c) => c.id === G.rival.id && !c.owned);
const rivalRel = (G) => (G.rival && G.market ? G.market.releases.filter((r) => r.comp === G.rival.id && r.t <= G.t).slice(-1)[0] || null : null);
// spelet som {title} pekar på (sim/events.js eventContext tar det senaste): bara ett helt spel, aldrig en tilläggsdel
const fullLast = (G) => {
  const g = G.games[G.games.length - 1];
  return g && !g.expansionOf ? g : null;
};
const inDev = (G) => !!G.job && G.job.kind === 'game' && G.job.state === 'dev';
const avgMood = (G) => {
  const s = G.staff.filter((x) => !x.isFounder);
  return s.length ? s.reduce((a, x) => a + x.mood, 0) / s.length : 100;
};

export const CRISIS_EVENTS = [
  // ── Rivalen jagar dig ──
  E('hunt_launch', 'hunt', 1.2, (G) => rivalIn(G) && G.games.length >= 2 && inDev(G),
    { sv: '{rival} siktar på ditt släpp', en: '{rival} is aiming at your launch' },
    { sv: '{rival} har läckt att de släpper ett spel i samma veva som ditt. Pressen skriver redan om duellen.', en: '{rival} let it slip that they will release a game right around yours. The press is already writing about the duel.' },
    [C('Gå ut före dem', 'Beat them to it', { crunch: 2, bugs: 0.12, heat: -6, res: R('Ni pressar på och är först ut. Det märks på kaffeförbrukningen.', 'You push hard and get out first. You can tell from the coffee use.') }, 'Övertid i två veckor, fler buggar', 'Two weeks of overtime, more bugs'),
      C('Satsa på reklam', 'Spend on ads', { rev: -0.07, hype: 12, salesMult: 0.97, heat: -3, res: R('Reklamen gör att ni syns, även bredvid rivalens stora affischer.', 'The ads make you visible, even next to the rival\'s big posters.') }),
      C('Strunta i dem', 'Ignore them', { salesMult: 0.88, heat: 6, res: R('Rivalen tar uppmärksamheten. Ert spel får sälja i deras skugga.', 'The rival takes the attention. Your game has to sell in their shadow.') }, 'Lägre försäljning för nästa spel', 'Lower sales for the next game')]),
  E('hunt_poach', 'hunt', 1, (G) => rivalIn(G) && G.staff.filter((x) => !x.isFounder).length >= 3,
    { sv: '{rival} går efter ditt folk', en: '{rival} is going after your people' },
    { sv: '{rival} har ringt {name} och lovat guld och gröna skogar. Hen har inte sagt nej.', en: '{rival} called {name} and promised the moon. {name} has not said no.' },
    [C('Matcha erbjudandet', 'Match the offer', { rev: -0.05, raiseRandom: 1, mood: 4, heat: -5, res: R('{name} stannar och berättar för alla att rivalen blev blåst.', '{name} stays and tells everyone the rival got outplayed.') }),
      C('Prata med personen', 'Talk to them', { rand: [[0.55, { mood: 4, heat: -4, res: R('{name} stannar. Ni pratade ut, och det kostade inget.', '{name} stays. You talked it through, and it cost nothing.') }], [0.45, { loseStaff: 1, mood: -6, heat: 4, res: R('{name} har redan bestämt sig och går till rivalen.', '{name} had already made up their mind and joins the rival.') }]] }, 'Kostar inget, men kan gå fel', 'Costs nothing, but can go wrong'),
      C('Låt hen gå', 'Let them go', { loseStaff: 1, mood: -8, heat: 5, res: R('{name} tömmer skrivbordet och går till {rival}.', '{name} clears the desk and joins {rival}.') })], ['staff']),
  E('hunt_smear', 'hunt', 0.9, (G) => rivalIn(G) && G.fans >= 200,
    { sv: '{rival} sprider rykten om dig', en: '{rival} is spreading rumours about you' },
    { sv: 'Någon på {rival} har kallat er studio för en kopieringsmaskin i en intervju. Fansen frågar vad som är sant.', en: 'Someone at {rival} called your studio a copy machine in an interview. Your fans are asking what is true.' },
    [C('Svara med humor', 'Answer with humour', { rand: [[0.6, { fansRel: 0.03, heat: -5, res: R('Ert svar sprids överallt. Fansen älskar det.', 'Your reply spreads everywhere. Fans love it.') }], [0.4, { fansRel: -0.03, heat: 3, res: R('Skämtet landar fel och blir en egen nyhet.', 'The joke lands wrong and becomes a story of its own.') }]] }, 'Kan ge fans, kan slå fel', 'Can win fans, can backfire'),
      C('Håll er tysta', 'Stay quiet', { fansRel: -0.015, heat: 2, res: R('Det blåser över, men några fans hann tvivla.', 'It blows over, but some fans had time to doubt.') }),
      C('Anlita en advokat', 'Hire a lawyer', { rev: -0.06, rand: [[0.5, { fansRel: 0.03, heat: -10, res: R('Rivalen tvingas be om ursäkt. Fansen jublar.', 'The rival has to apologise. Fans cheer.') }], [0.5, { fansRel: -0.02, heat: 4, res: R('Det blir en lång och dyr strid som ingen vinner.', 'It turns into a long and costly fight that nobody wins.') }]] }, 'Dyrt och osäkert', 'Costly and uncertain')]),
  E('hunt_copy', 'hunt', 1.3, (G) => {
    const r = rivalRel(G);
    const g = fullLast(G);
    return rivalIn(G) && !!r && !!g && (r.genre === g.genre || r.topic === g.topic) && g.score >= 7 && G.t - r.t <= 20 && G.t - g.t <= 60;
  },
    { sv: '{rival} släpper en kopia av {title}', en: '{rival} releases a copy of {title}' },
    { sv: '{rtitle} från {rival} ser misstänkt likt {title} ut, bara med en annan hatt på hjälten.', en: '{rtitle} from {rival} looks suspiciously like {title}, only with a different hat on the hero.' },
    [C('Släpp en gratis uppdatering', 'Release a free update', { rev: -0.05, fansRel: 0.012, heat: -4, res: R('Spelarna får något nytt och stannar hos er.', 'Players get something new and stay with you.') }),
      C('Svara med en uppföljare', 'Answer with a sequel', { hypeNext: 14, salesMult: 1.04, heat: -2, res: R('Ni tillkännager nästa del. Kopian blir en fotnot.', 'You announce the next part. The copy becomes a footnote.') }, 'Mer förväntan på nästa spel', 'More buzz for the next game'),
      C('Ignorera det', 'Ignore it', { fansRel: -0.02, heat: 4, res: R('Några fans byter till kopian, den är ju billigare.', 'Some fans switch to the copy since it is cheaper.') })], ['game']),
  E('hunt_flop', 'hunt', 0.8, (G) => {
    const r = rivalRel(G);
    return rivalIn(G) && !!r && r.score <= 6.2 && G.t - r.t <= 16 && G.games.length >= 2;
  },
    { sv: '{rival}s spel floppade', en: '{rival}\'s game flopped' },
    { sv: '{rtitle} fick hård kritik, och {rival} har blivit tysta. Deras fans letar efter något nytt att spela.', en: '{rtitle} got harsh reviews and {rival} have gone quiet. Their fans are looking for something new to play.' },
    [C('Locka över deras fans', 'Win over their fans', { rev: -0.05, fansRel: 0.04, heat: 3, res: R('En enkel kampanj räcker: "Vi gör inte sånt här." Fans strömmar in.', 'A simple campaign is enough: "We do not make this kind of game." Fans flow in.') }),
      C('Visa respekt', 'Show respect', { fansRel: 0.015, mood: 4, heat: -6, res: R('Du skriver att alla har dåliga dagar. Branschen noterar det.', 'You write that everyone has bad days. The industry notices.') })]),
  // ── Kriser ──
  E('crisis_leak', 'crisis', 1.2, (G) => inDev(G) && G.job.phase >= 1 && G.games.length >= 1,
    { sv: 'Bygget har läckt ut', en: 'Your build has leaked' },
    { sv: 'Skärmbilder och en spelbar demo av {title} ligger på ett forum. Tusentals har redan laddat ner den.', en: 'Screenshots and a playable demo of {title} are on a forum. Thousands have already downloaded it.' },
    [C('Jaga källan', 'Hunt the source', { rev: -0.05, rand: [[0.55, { hype: 6, mood: -3, res: R('Du hittar läckan: en praktikant som skröt för sina vänner. Demon plockas ner.', 'You find the leak: an intern bragging to friends. The demo is taken down.') }], [0.45, { hype: -10, mood: -6, res: R('Ingen hittas, och misstänksamheten förstör stämningen.', 'Nobody is found, and the suspicion ruins the mood.') }]] }, 'Kostar, och kan ge en syndabock', 'Costs money, and may give a scapegoat'),
      C('Visa upp spelet själva', 'Show the game yourselves', { rev: -0.07, hype: 14, res: R('Ni släpper en officiell trailer. Läckan blir gratis reklam.', 'You release an official trailer. The leak becomes free advertising.') }),
      C('Låtsas som ingenting', 'Pretend nothing happened', { hype: -8, fansRel: -0.01, res: R('Ryktet om kaos i studion sprids.', 'The rumour of chaos in the studio spreads.') })]),
  E('crisis_strike', 'crisis', 1.1, (G) => G.t > 48 && G.staff.filter((x) => !x.isFounder).length >= 4 && avgMood(G) <= 42,
    { sv: 'Personalen lägger ner verktygen', en: 'The staff down tools' },
    { sv: 'Efter månader av övertid och dålig stämning har teamet gått ut på gården. De vill prata, och de vill inte vänta.', en: 'After months of overtime and bad mood the team has walked out to the yard. They want to talk, and they will not wait.' },
    [C('Höj lönerna', 'Raise the salaries', { payroll: -0.5, mood: 25, res: R('Alla kommer tillbaka på måndag. Kassan känns det av, men stämningen lyfter.', 'Everyone is back on Monday. The cash feels it, but the mood lifts.') }, 'Dyrt men löser det direkt', 'Costly but solves it at once'),
      C('Förhandla fram ett avtal', 'Negotiate a deal', { rand: [[0.6, { payroll: -0.25, mood: 15, res: R('Ni möts på mitten och skakar hand. Arbetet rullar igång.', 'You meet halfway and shake hands. Work starts rolling again.') }], [0.4, { payroll: -0.4, mood: 6, rp: -4, res: R('Det drar ut på tiden och ett par projekt står still.', 'It drags on and a couple of projects stand still.') }]] }),
      C('Hård linje', 'Take a hard line', { loseStaff: 1, mood: -10, fansRel: -0.02, res: R('En av förgrundsfigurerna slutar och pressen skriver om "arbetsfrid i fara".', 'One of the key people quits and the press writes about "labour peace in danger".') }, 'Billigt nu, dyrt sen', 'Cheap now, costly later')]),
  E('crisis_flop', 'crisis', 1.3, (G) => {
    const g = fullLast(G);
    return !!g && g.score <= 5.6 && G.t - g.t <= 10 && G.games.length >= 2;
  },
    { sv: '{title} sågas av kritikerna', en: '{title} is torn apart by critics' },
    { sv: 'Recensionerna av {title} är i botten och spelarna kräver pengarna tillbaka. Hashtaggen sprids snabbt.', en: 'The reviews of {title} are at rock bottom and players want their money back. The hashtag is spreading fast.' },
    [C('Be om ursäkt och släpp en gratis fix', 'Apologise and release a free fix', { rev: -0.1, fansRel: 0.005, mood: 2, res: R('Ni erkänner misstagen och rättar dem. Många spelare ger er en chans till.', 'You admit the mistakes and fix them. Many players give you another chance.') }),
      C('Skyll på kritikerna', 'Blame the critics', { fansRel: -0.05, mood: 3, res: R('Teamet jublar, spelarna gör det inte. Fansen tappar förtroendet.', 'The team cheers, the players do not. Fans lose trust.') }, 'Billigt men skadar förtroendet', 'Cheap but hurts trust'),
      C('Ge alla pengarna tillbaka', 'Refund everyone', { rev: -0.2, fansRel: 0.02, res: R('Det kostar en slant, men ryktet om en ärlig studio sprids.', 'It costs a fortune, but the word about an honest studio spreads.') }, 'Dyrt men ger förtroende', 'Costly but earns trust')], ['game']),
];
