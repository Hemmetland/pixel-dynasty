// Spelets tempo: hur lång tid saker tar i speltid (och därmed i riktig tid).
// Alla värden är multiplikatorer mot den ursprungliga, snabba prototypen (1 = som förut), samlade här så att de går att
// skruva på utan att leta i resten av koden. Ingen import här: filen används av både sim/ och data/.
// I hastighet 1 är en tick 0,6 s, en vecka 4 ticks och ett spelår 48 veckor (ca 115 s).

// ── Projekt ──────────────────────────────────────────────────────
// Längd på utveckling + polering per storlek. Teamets arbete per tick är oförändrat, så betygen blir desamma;
// färre spel hinner ut per år och lönerna löper längre per spel. Större projekt skalas lite mindre (annars blir ett
// AAA-spel flera år). Litet spel = 27 veckor = ca 65 s i hastighet 1, medel 34, stort 53 och AAA 78 veckor.
export const SCOPE_TEMPO = { small: 1.8, medium: 1.4, large: 1.4, aaa: 1.25 };
// Intäkt per spel följer projektets längd: ett spel som tar längre tid måste sälja mer för att löner och hyra under tiden
// ska gå ihop. 1 = exakt kompensation (samma intäkt per spelår som förut), under 1 = långsammare tillväxt.
// Värdena är något över exakt kompensation (SALES_TAIL fördröjer intäkterna, och kontorskraven i studio.js bromsar takten),
// annars går nybörjare i konkurs i garaget. Intäktskurvan i övrigt är orörd.
export const REVENUE_PER_TEMPO = { small: 1.4, medium: 1.25, large: 1.2, aaa: 1.2 };
// Försäljningskurvans längd (1 = ursprunglig). Längre utveckling kräver en jämnare intäktsström.
export const SALES_TAIL = 2;

// ── Forskning och kompetens ──────────────────────────────────────
// Forskningens varaktighet. Forskningspoängen per färdigt spel är oförändrad (se dev.js), så forskningen går långsammare per år.
export const RESEARCH_TEMPO = 3;
// Kursernas längd och vilopaus mellan kurser (utbildningsrum gör kursen kortare). Vinst och kostnad per kurs är oförändrade,
// så kompetensen växer långsammare och utbildningen kostar mindre per år.
export const TRAIN_TEMPO = 4;
