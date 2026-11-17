// Folket: händelser där en medarbetare drömmer om ett eget spel, får ett erbjudande av en konkurrent eller ska gifta sig. De dras inte av
// månadsslumpen i events.js utan av sim/folk.js, som väljer vem och när med hashStr (aldrig G.rng). Samma form som övriga händelser
// (se data/events.js). {name} = personen, {partner} = den andra (paret), {dream} = drömspelet (genre och ämne).
// Extra fx-nycklar (sim/events.js): whoMood och whoRaise (andel) gäller bara personen (och den andra), whoLeave gör att de slutar, och
// dream ('go' på studions tid, 'free' på fritiden, 'no') sätter igång eller avslår drömmen (folk.js).
const E = (id, kind, weight, when, title, body, choices, needs) => ({ id, kind, weight, when, title, body, choices, needs });
const C = (sv, en, fx, dsv, den) => ({ label: { sv, en }, fx, hint: dsv ? { sv: dsv, en: den } : null });
const R = (sv, en) => ({ sv, en });

export const FOLK_EVENTS = [
  E('folk_dream', 'folk', 1, () => false,
    { sv: '{name} drömmer om ett eget spel', en: '{name} dreams of their own game' },
    { sv: '{name} har bett om ett samtal. Efter åratal i studion vill hen äntligen göra sitt drömspel: {dream}. "Jag har burit på den här idén sedan jag började", säger hen.', en: '{name} asked for a word. After years at the studio they finally want to make their dream game: {dream}. "I have carried this idea since I started," they say.' },
    [C('Ge grönt ljus på studions tid', 'Give the green light, on studio time', { money: -3000, whoMood: 30, dream: 'go', res: R('{name} lyser upp. Skisserna täcker snart hela anslagstavlan.', '{name} lights up. The sketches soon cover the whole noticeboard.') }, 'Kostar pengar, men hen blommar ut', 'Costs money, but they will bloom'),
      C('Gör det på fritiden', 'Do it in their spare time', { whoMood: 10, dream: 'free', res: R('{name} tackar och ritar på kvällarna. Det blir något litet, men det blir deras.', '{name} says thanks and draws in the evenings. It will be something small, but it will be theirs.') }, 'Gratis, men något mindre', 'Free, but something smaller'),
      C('Inte nu', 'Not now', { whoMood: -14, dream: 'no', res: R('{name} nickar och går tillbaka till skrivbordet. Det blir tyst en stund.', '{name} nods and goes back to the desk. It is quiet for a while.') }, 'Hen blir besviken', 'They will be disappointed')], ['staff']),
  E('folk_headhunt', 'folk', 1, () => false,
    { sv: '{name} får ett erbjudande', en: '{name} gets an offer' },
    { sv: 'Ett konkurrerande bolag har hört av sig till {name} med ett jobb som är svårt att tacka nej till. Hen har inte sagt något, men du ser att hen funderar.', en: 'A rival company has contacted {name} with a job that is hard to turn down. They have said nothing, but you can see they are thinking.' },
    [C('Höj lönen rejält', 'Give a big raise', { whoRaise: 0.25, res: R('{name} stannar. Det blir en dyr men glad vecka.', '{name} stays. A pricey but happy week follows.') }, 'Dyrare lön varje månad', 'Higher pay every month'),
      C('Erbjud mer ansvar', 'Offer more responsibility', { money: -800, rand: [[0.8, { whoMood: 14, res: R('{name} får egna projekt och stannar. "Det var inte bara lönen", säger hen.', '{name} gets their own projects and stays. "It was never just the pay," they say.') }], [0.2, { whoLeave: 1, mood: -4, res: R('{name} tackar för förtroendet men går ändå. Hela studion märker tomrummet.', '{name} thanks you for the trust but leaves anyway. The whole studio feels the gap.') }]] }, 'Billigare, men ingen garanti', 'Cheaper, but no guarantee'),
      C('Önska lycka till', 'Wish them luck', { whoLeave: 1, mood: -4, res: R('{name} tömmer skrivbordet, kramar om alla och går.', '{name} clears the desk, hugs everyone and goes.') })], ['staff']),
  E('folk_headhunt_pair', 'folk', 1, () => false,
    { sv: '{name} och {partner} funderar på att flytta', en: '{name} and {partner} are thinking of moving' },
    { sv: '{name} och {partner}, som är tillsammans, har fått varsitt erbjudande av samma konkurrent. De vill helst jobba nära varandra, vad som än händer.', en: '{name} and {partner}, who are a couple, have each received an offer from the same rival. They want to work close together, whatever happens.' },
    [C('Höj lönen för båda', 'Raise both salaries', { whoRaise: 0.2, res: R('{name} och {partner} stannar, och tackar med varsin kaka.', '{name} and {partner} stay, and say thanks with a cake each.') }, 'Dyrare lön för två varje månad', 'Higher pay for two every month'),
      C('Erbjud mer ansvar', 'Offer more responsibility', { money: -1200, rand: [[0.65, { whoMood: 14, res: R('Paret får egna projekt och stannar.', 'The couple get their own projects and stay.') }], [0.35, { whoLeave: 1, mood: -8, res: R('{name} och {partner} flyttar tillsammans. Studion blir märkbart tystare.', '{name} and {partner} move together. The studio is noticeably quieter.') }]] }, 'Risk att båda går', 'Risk of losing both'),
      C('Önska lycka till', 'Wish them luck', { whoLeave: 1, mood: -8, res: R('{name} och {partner} går tillsammans, med en present från hela studion.', '{name} and {partner} leave together, with a gift from the whole studio.') })], ['staff']),
  E('folk_wedding', 'folk', 1, () => false,
    { sv: 'Bröllop i studion', en: 'A wedding at the studio' },
    { sv: '{name} och {partner} ska gifta sig! Hela studion är inbjuden, och de undrar om du vill fira med dem.', en: '{name} and {partner} are getting married! The whole studio is invited, and they wonder if you want to celebrate with them.' },
    [C('Bjud på fest i studion', 'Throw a party at the studio', { money: -1500, mood: 8, whoMood: 15, res: R('Studion fylls av blommor och musik. Ingen jobbar mycket den dagen.', 'The studio fills with flowers and music. Nobody gets much work done that day.') }, 'Kostar, men lyfter alla', 'Costs money, but lifts everyone'),
      C('Ge en present', 'Give a gift', { money: -400, mood: 2, whoMood: 12, res: R('Presenten får hedersplats på bröllopsbordet.', 'The gift gets a place of honour on the wedding table.') }),
      C('Gratulera och ge ledigt', 'Congratulate and give time off', { whoMood: 6, res: R('Paret strålar. Dagen efter ligger det blommor på skrivbordet.', 'The couple beam. The next day there are flowers on the desk.') }, 'Gratis', 'Free')], ['staff']),
];
