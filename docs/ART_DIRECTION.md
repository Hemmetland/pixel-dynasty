# Artdirektion (från användarens referensbild)

Användaren delade en AI-genererad referensbild + en prompt. Bilden finns inte som fil i repot, så detta är en textbeskrivning
av den, som all vidare grafikutveckling ska utgå från. Målet är samma koncept som nu ("studio-tycoon, snitt genom byggnaden")
men med mycket mer liv, detaljer, ljus och känsla.

## Användarens önskemål (sammanfattning av prompten)

1. Mer genomarbetad, modern 2D-pixel/illustrationsstil: ljus, skuggor, finess och en tydlig "tech office / startup"-vibb.
   Behåll sidovyn / snittet genom byggnaden.
2. Utveckla interiören: fler rum och arbetsstationer, mötesrum, fikarum, serverrum, labb, lounge. Visa att folk jobbar,
   samarbetar, fikar, kodar, har möten.
3. Karaktärer med mer personlighet och variation. Små animationer: skriver kod, pratar, går, dricker kaffe, blir glada/trötta.
4. Stämning och detaljer: belysning, växter, posters, skärmar, statiska och rörliga detaljer. Stadens skyline i bakgrunden,
   dag/natt-cykel, väder.
5. Bättre UI/UX: tydliga indikatorer för framsteg, resurser, uppgraderingar, team. Stil som matchar spelet.
6. Behåll och bygg vidare på det som fungerar (spelmekaniken, spåret). Utveckla, ändra inte grunden.
7. Leverera som paket: HTML-version + ev. assets + visuella exempel på stil, karaktärer, miljöer, UI.

Stilord: modern 2D pixel/illustration, varm och inbjudande färgpalett, tech/startup, detaljerad miljö och karaktärer, levande och
dynamisk, dag/natt, humor och personlighet, clean och tydlig UI.

## Referensbilden i detalj

**Scen (skymning/natt):** djupt lila-blå himmel, lagerskyline i marinblått/lila med många tända fönster (varmgula, några cyan och
magenta), ett litet luftskepp uppe till vänster.

**Byggnad:** fyra våningar plus takterrass, genomskuren sidovy. Mörk grafitstruktur med tunna neonlinjer (cyan/magenta) längs
våningsplanen. Bred: 5–6 rum per våning. Varje rum har egen ljusfärg: varmt orange/gult på kontor, kallt blått i serverrum,
lila i lounge. Taklampor (pendel), gröna växter överallt (krukor, hängväxter, murgröna längs fasadkanten).

**Tak:** takträdgård med häckar, räcke, ljusslingor, ventilationsaggregat/vattentank, två lila pod-fåtöljer. Rooftop-skylt "NEXUS"
med logotyp (cyan/lila) på en mörk skyltlåda.

**Neonskyltar:** blå neonskrift på ytterväggen ("Better Code Together") och i entréplanet ("Good Ideas Build Great Things").

**Våning 1 (överst):** öppet kontor med rader av skrivbord med dubbla skärmar och ca 8 personer som skriver; stora väggskärmar;
till höger lounge med grön soffa, växter, inramade bilder.
**Våning 2:** vänster mötesrum med gardiner, stor presentationsskärm/whiteboard och personer runt ett bord; mitten arbetsrum;
höger fikarum med kyl, varuautomat, kaffe, röd soffa.
**Våning 3:** vänster utvecklarrum; mitten serverrum med blålysande racks och en tekniker; höger whiteboardrum med klisterlappar
och en person som pekar/presenterar.
**Bottenvåning:** glasfasad med dörrar (lobby), reception, växter, lounge med sittsäckar och folk som pratar, mötespodar, spel/gym.

**Karaktärer:** kompakta men detaljerade, med glasögon, luvtröjor, mössor, hörlurar, ryggsäckar, laptops, skägg; varierad hudton,
frisyr och färgglada tröjor. Pose-ark: Gå, Sitta, Skriva kod, Dricka kaffe, Prata.

**Props-ark:** monitorer, laptops, växter, kaffekopp, lampor, stolar, skrivbord, whiteboard med lappar, varuautomat, soffa,
kontorsstol, golvlampa, sidobord, småväxter. **Bakgrunder:** lila solnedgångsskyline, nattskyline, fönsterutsikt.

**HUD (glaspaneler, mörka, turkos accent):**
- Höger överst: studiopanel ("NEXUS" + logotyp) med Team 12/15, Kod 68%, Resurser 4 230, Mål 2/5.
- Under: "Pågående uppgifter" med tre rader och turkosa framstegsstaplar (Implementera API 78%, Designa UI 45%, Testa funktioner 30%).
- Nere till vänster: navigeringsfält med ikoner (Byggnad, Team, Uppgraderingar, Statistik, Inställningar).
- Nere till höger: klockpanel "Dag 3 10:24" med solikon.

**Palett (prover):** orange/gul, korall, magenta, kungsblå, cyan, grön, grå.

## Hur långt koden kan komma

Allt i spelet ritas i kod. Struktur (rum, möbler, växter, neon, ljus, skuggor, glöd, reflektioner) och karaktärsdetaljer
(accessoarer, kläder, animationer) går att nå nära referensen. Illustratörsnivå i varje enskild pixel kräver riktig handritad
eller AI-genererad spritekonst som levereras som separata transparenta PNG-filer (en bild per sprite/animationsruta).

## Ny referens: "PixelForge Studios" (docs/reference/pixelforge-heart.png)

Användaren lade senare in en andra, rikare referensbild: `docs/reference/pixelforge-heart.png`. **Titta på den direkt** (den är en riktig bildfil, öppna den med
Read-verktyget). Den ersätter inte beskrivningen ovan men pekar ut slutmålet. Det viktigaste i den:

- **Ett enda hus som växer.** Garage och ett sovrum ("Sovrum (Start)") nere till vänster är början, därefter lobby med glasentré, och ovanpå det
  fyra våningar med många rum, takterrass med växter, skyltar och en helikopter. Rummen är **avdelningar med namnskylt**: VD, Mötesrum, Forskning,
  Server & Online, Koncept & Design, Programmering, Art & Animation, Ljud & Musik, Test & QA, Utveckling av hårdvara, Konsol & Spelportar, MMORPG / Servrar,
  Paus & Lounge, Kök & Matsal, Träning & Hälsa, Toaletter. Varje rum är fullt av detaljer som visar vad avdelningen gör (modeller, kodskärmar,
  mixerbord, serverrack, tavla med idéer, biljardbord, löpband) och av människor som jobbar där. Rummen har egen ljusfärg (blått i forskning och serverrum,
  varmt i kök, grönt i sovrum), växter överallt och synlig skyline med solnedgång bakom.
- **Idé för spelet:** avdelningarna är de rum man bygger och bemannar. De kan knytas till spelets system: Koncept & Design (design), Programmering (teknik),
  Art & Animation (grafik), Ljud & Musik (ljud), Test & QA (buggar), Forskning (forskningspoäng), Server & Online (online-spel), Utveckling av hårdvara och
  Konsol & Spelportar (egna motorer och plattformar), Träning & Hälsa (kurser och humör), Paus & Lounge, Kök (humör), Mötesrum (kickoff vid ny fas), VD (ledning).
  Byggnaden kan visa hela huset från början med olåsta rum som mörka byggplatser ("att hyra") så att man ser vart man är på väg.
- **Gränssnitt:** överst studiolinje med logotyp och slogan ("Small ideas. Big worlds."), pengar med inkomst per dag, anställda, rykte (stjärnbetyg), datum med
  tidsålder och hastighetsknappar. Vänster: panelen "Aktuella mål" med framsteg (t.ex. "Släpp spelet Skyward, forskningsfas 2/3", "Bygg ut kontoret till nivå 3 2/4 rum",
  "Tjäna $1 000 000 $342 750 / $1 000 000"). Höger: "Pågående projekt" (namn, genre, framsteg i procent, budget, team 6/8, släppdatum), "Marknaden" (plattformars andelar
  i procent) och "Nyheter". Nere: navigering med åtta flikar (Översikt, Projekt, Personal, Forskning, Företag, Ekonomi, Marknad, Inställningar), "Nästa steg"-lista för
  nybörjare (Anställ första medarbetaren, Köp 2 datorer, Starta ditt första spel) och klockpanel med dag och tid.
- **Gata och omgivning:** lastbil med företagslogotyp, träd, lyktstolpar och en kuliss av skyline i flera lager.
