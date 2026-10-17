# Pixel Dynasty (arbetsnamn)

Ett studio-tycoonspel i pixelart. Du startar i ett garage 1980 med en dator och en idé, och bygger en studio ända
upp till ett torn i spelbranschens topp. Spelet är en fristående prototyp som körs direkt i webbläsaren, utan
beroenden, och finns på svenska och engelska.

Mekaniken är inspirerad av klassiska tycoonspel om spelutveckling. Alla namn, plattformar, texter, ikoner och grafik
är egna och genereras i koden.

## Spela

* Öppna `dist/index.html` i en webbläsare (en enda fil, fungerar offline förutom de två typsnitten från Google Fonts).
* Eller kör `npm run build` och öppna `dist/index.html` själv.

Kortkommandon: `Mellanslag` paus, `1` `2` `3` fart, `N` nytt spel, `M` meny, `Esc` stäng.

## Så spelas det

1. **Skapa spel**: välj tema, genre (valfritt en andra), plattform, målgrupp och storlek. Fördela sedan fokus med
   triangelreglaget. Varje genre föredrar sin egen balans mellan de nio kategorierna.
2. **Utveckling** sker i tre faser plus polering. Vid varje ny fas väljer du fokus igen. Under tiden kan du
   marknadsföra, köra crunch och hantera slumphändelser.
3. **Recension**: fyra recensenter ger betyg och kommentarer, och "Studioanteckningar" förklarar vad som drog upp
   eller ner resultatet. Du lär dig tema/genre-kombinationer och genrernas idealfokus av erfarenhet.
4. **Försäljning** rullar in vecka för vecka beroende på betyg, hype, fans, plattformens marknadsandel och trender.
5. **Bygg ut**: forska fram nya teman, genrer och teknik, anställ och utbilda, bygg anläggningar och flytta till
   större kontor. Ett större kontor måste förtjänas: det kräver utgivna spel, bra snittbetyg, fans, ett team som
   fyller skrivborden, rätt år och pengar (se Studio-fönstret, som visar framstegen). Ta uppdrag när kassan sinar,
   bygg egna motorer, släpp uppföljare och patchar.
6. **Priser och mässor**: spelmässa varje sommar och prisgala varje december. Konkurrenter släpper egna spel.
7. Är kassan negativ tre månader i rad får du ett sista räddningslån. Tackar du nej går studion i konkurs.

## Teknik

* Vanilla JavaScript (ES-moduler), canvas för pixelartscenen, HTML/CSS för gränssnittet. Inga ramverk.
* `src/sim/` är ren spellogik utan DOM (körbar i Node). `src/render/` ritar scenen. `src/ui/` är gränssnittet.
* Pixelart, ikoner, spelomslag, byggnader och karaktärer ritas procedurellt. Ljud och musik syntetiseras med WebAudio.
* Sparar automatiskt varje månad i `localStorage`. Exportkod för sparfiler finns under Inställningar.

```
npm install        # esbuild, eslint, playwright-core
npm run build      # dist/index.html (fristående) och dist/artifact.html (fragment för Artifact)
npm run lint
npm run sim        # autospelande bot som kör hela spelet i Node (balanstest)
node test/features.mjs    # funktionstest av sim-API:t
node test/first.mjs small # betygsfördelning för första spelet
node test/drive.mjs .shots 1280 720   # kör UI:t i Chromium och tar skärmdumpar
node test/soak.mjs .shots-soak 16     # spelar 16 år i UI:t med bot och fångar alla dialoger
node test/looks.mjs                   # personernas paletter, poser, utseendefält och gamla sparfiler
node test/behavior.mjs 900 1          # Studiohusets beteende i Node: ingen fastnar, går genom stängda dörrar eller står i varandra
node test/scene-shot.mjs .shots/s 1280 720 3 0.93 clear 1   # skärmdump av scenen (nivå, tid på dygnet, väder, HD-ljus)
node build.mjs --with-dev             # bygger även dist/dev/*.html (rooms, props, sprites m.fl.) för att granska grafik
```

## Balans

`node test/sim.mjs --seed=1` spelar 1980–2020 med en optimerande bot (`-v` visar varje utgivning och vilka
kontorskrav som återstår, `--bd` visar årets pengar per kategori). `--mid` är en medelspelare, `--casual` en slarvigare.
`node test/pacing.mjs --seeds=12 [--mid|--casual] [--diff=relaxed|normal|hardcore] [--curve]` kör flera seeds och
sammanfattar när kontoren byggs ut, kassan vid årsskiften och konkurser.
Siffrorna för pengar, betyg och försäljning ligger i `src/sim/` (`const.js`, `score.js`, `sales.js`, `dev.js`).
Ett första litet spel av grundaren ger i snitt ca 6 i betyg. Stora spel kräver riktiga team.

### Takten i Normal

Att flytta till ett större kontor är en milstolpe. Alla krav och kostnader står i en tabell, `TIERS` i `src/sim/studio.js`:

| Nivå | Kontor | Kostnad | Hyra/mån | Spel | Team | Snittbetyg (4 senaste) | Fans | Tidigast |
|---|---|---|---|---|---|---|---|---|
| 1 | Litet kontor | $22k | $700 | 3 | 2 | 5,5 | – | 1982 |
| 2 | Tvåvåningsstudio | $250k | $6k | 8 | 5 | 6,5 | 1,2k | 1987 |
| 3 | Studiohuset | $1,6M | $30k | 14 | 10 | 7,0 | 14k | 1994 |
| 4 | Spelfabriken | $8M | $60k | 21 | 15 | 7,3 | 60k | 2002 |
| 5 | Dynasti-tornet | $25M | $100k | 26 | 24 | 7,8 | 150k | 2011 |

Hyran är i 1980 års pengar och följer inflationen (`moneyScale`). `year` är en golvgräns, så att ingen kan rusa förbi sin tid;
för en skicklig spelare är det oftast golvet och pengarna som avgör, för en svagare spelare fans, betyg och kassa.
Kraven visas med framsteg i Studio-fönstret (`canUpgradeOffice(G)` ger id på första saknade krav, `officeReqs(G)` alla krav).
Befintliga sparfiler behåller sitt kontor, de nya kraven gäller bara nästa steg (inga nya fält i sparfilen).

Övriga justeringar för takten: betygstaken per storlek (`SCOPE_CAP` i `score.js`: litet 6,9, medel 8,7, stort 9,2) så att de
första åren landar kring 6–7 i betyg, och svårighetsgraden Svår (`DIFFICULTY.hardcore`: försäljning 0,93, löner 1,06).
Kraven för antal spel och fans är satta för det långsammare tempot nedan (färre spel hinner ut per år).

Mätt med optimerande boten (24 seeds, Normal; årtalet är nivån vid årsskiftet, bygget sker alltså året innan): nivå 1–5
1983, 1988, 1995, 2003 och 2012, alla når tornet före 2018, första sex spelen snittar ca 6,7 och kassan vid 1985/1990/2000
ligger kring $0,3M/$1,9M/$40M. Medelboten hamnar nästan på samma år (årtalsgolven styr), svagare spelare hålls tillbaka av
fans, betyg och kassa: slarvboten får nivå 2 först 1998 och går i konkurs i median 1995. Före ändringen blev nivå 1–5
klara 1980, 1983, 1986, 1993 och 2003.

**Tempo.** Allt som styr hur lång tid saker tar står i `src/sim/tempo.js` (multiplikatorer mot den första, snabba prototypen):

* Projekt: litet spel 27 veckor (ca 65 s i hastighet 1), medel 34, stort 53, AAA 78 veckor (förut 15 / 24 / 38 / 62).
  Teamets arbete per tick är oförändrat, så betygen blir desamma; färre spel hinner ut per år.
* Intäkten per spel följer projektets längd (`REVENUE_PER_TEMPO`), annars rasar ekonomin: små och medelstora spel
  kompenseras med 1,4 och 1,25, stora spel och AAA med 1,2. Försäljningskurvan är dubbelt så lång.
* Forskning tar 3 gånger längre och ger lika många forskningspoäng per spel som förut. Kurser tar 4 gånger längre
  (12–16 veckor, vilopaus 32 veckor) med oförändrad vinst och kostnad, så kompetensen växer långsammare.

Vill du ändra takten: börja med `SCOPE_TEMPO` och `REVENUE_PER_TEMPO`.
