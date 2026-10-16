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
   större kontor. Ta uppdrag när kassan sinar, bygg egna motorer, släpp uppföljare och patchar.
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
```

## Balans

`node test/sim.mjs --seed=1` spelar 1980–2020 med en optimerande bot. `--casual` är en slarvigare spelare.
Siffrorna för pengar, betyg och försäljning ligger i `src/sim/` (`const.js`, `score.js`, `sales.js`, `dev.js`).
Ett första litet spel av grundaren ger i snitt ca 6 i betyg. Stora spel kräver riktiga team.
