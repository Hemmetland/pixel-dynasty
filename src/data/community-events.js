// Fansen: en händelse när missnöjet mot ett spel sprids (sim/community.js lägger den i G.pending, den dras aldrig av månadsslumpen).
// Samma form som övriga händelser (se data/events.js). Extra fx-nyckel: viral ('end' lägger stormen, 'soften' dämpar den; gäller spelet
// i händelsen, ctx.game). {title} = spelet.
const E = (id, kind, weight, when, title, body, choices, needs) => ({ id, kind, weight, when, title, body, choices, needs });
const C = (sv, en, fx, dsv, den) => ({ label: { sv, en }, fx, hint: dsv ? { sv: dsv, en: den } : null });
const R = (sv, en) => ({ sv, en });

export const COMM_EVENTS = [
  E('comm_storm', 'comm', 1, () => false,
    { sv: 'Missnöjet mot {title} sprids', en: 'Anger about {title} is spreading' },
    { sv: 'En tråd om {title} har fått tusentals svar, och de flesta är arga: för stora löften och för många buggar. Allt fler väntar med att köpa.', en: 'A thread about {title} has thousands of replies, and most are angry: too many promises and too many bugs. More and more people are holding off buying.' },
    [C('Rätta till det', 'Fix it', { money: -2500, viral: 'end', fansRel: 0.01, res: R('Rättningen kommer inom ett par dagar. Tråden vänder: "Okej, de lyssnar faktiskt."', 'The fix lands within days. The thread turns: "Okay, they actually listen."') }, 'Kostar pengar, men stormen lägger sig', 'Costs money, but the storm settles'),
      C('Svara öppet', 'Reply openly', { viral: 'soften', res: R('Ni skriver ett ärligt svar i tråden. Det lugnar många, men inte alla.', 'You write an honest reply in the thread. It calms many, but not everyone.') }, 'Gratis, dämpar det en del', 'Free, softens it'),
      C('Låt det blåsa över', 'Let it blow over', { res: R('Ingen säger något. Tråden växer några veckor och dör sedan ut.', 'Nobody says anything. The thread grows for a few weeks and then dies down.') }, 'Gratis, men försäljningen tappar några veckor', 'Free, but sales dip for a few weeks')], ['game']),
];
