# Egen hårdvara och komponenter (balansunderlag)

Underlag för speltråden. Bara design och siffror, ingen kod. Alla siffror är startvärden att kalibrera med simbotten
(se "Balansmål" sist). Ekonomin nedan är avstämd mot `node test/sim.mjs --seed=1 --end=2030 -v --acq --group --store`
(optimal bot): kassa ca 43 M$ år 2000, 23 M$ 2005, 50 M$ 2010, 82 M$ 2012, 165 M$ 2015; årsintäkt 15 M$ (2000),
28 M$ (2005), 37 M$ (2010), 60–90 M$ (2012–2017). Forskningen tar slut runt 2016 och FP blir över (500k+), så
hårdvaran får gärna vara en stor FP-sänka sent i spelet.

## 1. Kärnidé och avgränsning

Studion går från att licensiera andras maskiner till att designa egna: ljudkort, grafikkretsar, processorer,
speldatorer, en bärbar enhet och till sist en egen konsol. Varje produkt är ett **designprojekt** (forskning,
design, prototyp) som tillverkas av en **extern partner**. Egen fabrik och leveranskedja finns inte i den här
versionen; partnern är hela tillverkningssidan.

Fyra saker avgör om en produkt lyckas: **prestanda** (mot marknaden just nu), **pris**, **tillgång** (har du
lager när efterfrågan finns) och **kompatibilitet** (fungerar den med spelen, vill andra utveckla för den).
Den strategiska vinsten är **optimering**: egna spel med egen motor blir bättre på egen hårdvara, och en egen
konsol gör studion till plattformsägare med licensintäkter från andra förlag.

Mönstret följer Digital butik (`store.js`) och Koncernledning (`group.js`): ett eget delsystem i `G.hw`, en
forskning som öppnar det, val som spelaren gör i ett eget fönster, veckokostnader, all slump ur fröet
(`rngFor(G, 'hw:…')`, inte `G.rng`) och gamla sparfiler som får `G.hw` första veckan.

## 2. Forskningsträd (ny kategori `hw`, "Hårdvara")

`veckor` är före `RESEARCH_TEMPO` (×3), som i `data/research.js`. Pengar är nominella som övriga forskningar.

| id | Namn | Tidigast | Kräver | FP | $ | v | Öppnar |
|---|---|---|---|---|---|---|---|
| `h_lab` | Hårdvarulabb | 1989 | `p_sound`, `p_engine` | 160 | 40 000 | 5 | anläggningen Hårdvarulabb, flaggan `hw` |
| `h_sound` | Ljudkort | 1989 | `h_lab` | 120 | 30 000 | 4 | produkttypen Ljudkort |
| `h_gpu` | 3D-grafikkretsar | 1995 | `h_lab`, `f_poly` | 900 | 400 000 | 7 | Grafikkort |
| `h_driver` | Drivrutinsteam | 1996 | `h_gpu` | 400 | 150 000 | 5 | +15 kompatibilitet på komponenter, drivrutinsuppdateringar |
| `h_pc` | Speldatorer | 1998 | `h_gpu` | 700 | 300 000 | 6 | Speldator (färdigbyggd) |
| `h_cpu` | Processordesign | 1999 | `h_gpu` | 2 400 | 2 500 000 | 9 | Processor, egen arkitektur |
| `h_lowpow` | Strömsnål design | 2002 | `h_cpu` | 1 600 | 1 500 000 | 7 | krävs för bärbart, −10 % enhetskostnad på bärbart |
| `h_soc` | Systemkretsar | 2003 | `h_cpu`, `h_lowpow` | 3 000 | 4 000 000 | 9 | egen arkitektur i bärbart och konsol |
| `h_handheld` | Bärbar spelenhet | 2003 | `h_lowpow` | 2 500 | 3 000 000 | 8 | Bärbar enhet (egen plattform) |
| `h_devkit` | Utvecklarprogram | 2004 | `h_handheld` | 1 800 | 2 000 000 | 6 | +15 kompatibilitet på egna plattformar, tredjepartsstöd ×1,2 |
| `h_console` | Konsolplattform | 2005 | `h_soc`, `b_server` | 6 000 | 10 000 000 | 10 | Konsol (egen plattform) |
| `h_backcompat` | Bakåtkompatibilitet | 2010 | `h_console` | 2 000 | 4 000 000 | 6 | val för efterföljare (se 6) |
| `h_vr` | Eget VR-headset | 2015 | `h_handheld`, `f_vr` | 5 000 | 12 000 000 | 9 | valfri senare produkt (samma regler som bärbart) |

Förfiningar (som `REFINES`):

| id | Namn | Från | Kräver | FP | $ | Max | Per nivå |
|---|---|---|---|---|---|---|---|
| `x_yield` | Tillverkningsoptimering | 1992 | `h_lab` | 500 | 100 000 | 6 | −4 % enhetskostnad |
| `x_arch` | Arkitekturförfining | 1997 | `h_gpu` | 800 | 300 000 | 6 | +3 % prestanda |

**Anläggning `hwlab` (Hårdvarulabb):** kostnad 30 000, hyra 900, nivå 1–3. Varje nivå ger en designplats (antal
hårdvaruprojekt samtidigt) och 10 % kortare designtid. Den tar en kontorsplats, vilket är en äkta avvägning mot
QA, server och marknad.

## 3. Hårdvaruavdelningen

Hårdvaran blockerar inte spelutvecklingen (`G.job`). Den sköts av en egen avdelning som du betalar per vecka,
som dotterbolagens personal i Koncernledning. Du kan utse en **hårdvaruchef** ur personalen (som en VD); chefen
lämnar spelteamet och ger en bonus efter sina färdigheter:

- prestanda +0,1 % per poäng i Teknik över 50 (högst +5 %)
- prototyprisk −0,2 procentenheter per poäng i Forskning över 50 (högst −8)

## 4. Produkttyper och designval

### Designval (gäller alla produkter)

| Val | Alternativ | Effekt |
|---|---|---|
| Prestandamål | Budget / Mellan / Topp | prestanda 0,85 / 1,00 / 1,15; designtid ×0,75 / 1 / 1,3; designkostnad ×0,6 / 1 / 1,6; enhetskostnad ×0,8 / 1 / 1,25; prototyprisk 5 / 12 / 25 % |
| Kvalitet | Normal / Hög | Hög: felfrekvens 1 % i stället för 2,5 %, enhetskostnad +6 % |
| Arkitektur (CPU, bärbart, konsol) | Standard / Egen | Standard: köpt kärna, kompatibilitet 80, partnerroyalty 6 % per enhet. Egen (kräver `h_cpu`, för bärbart/konsol `h_soc`): prestanda +15 %, ingen royalty, kompatibilitet 45 vid start |
| Partner | se 5 | pris, ledtid, fel, kapacitet |
| Pris | fritt, med förslag | se efterfrågan |

### Produkter (Mellan, i introduktionsårets dollar)

Designkostnad och prototyp skalas med `moneyScale(år) / moneyScale(basår)` och betalas per vecka under designen
(som butikens drift), så att ett projekt kan pausas. Priset till kund är nominellt (en konsol kostar 299–499 $
oavsett år); enhetskostnaden faller varje år.

| Produkt | Basår | Designtid (v) | Design | Prototyp | Förslagspris | Enhetskostnad vid lansering | Kostnadsfall/år | Livscykel |
|---|---|---|---|---|---|---|---|---|
| Ljudkort | 1990 | 16 | 120 000 | 30 000 | 149 | 50 % av pris | 8 % | 3 år |
| Grafikkort | 1996 | 30 | 1 000 000 | 200 000 | 249 | 58 % | 10 % | 2,5 år |
| Processor | 2000 | 48 | 4 000 000 | 800 000 | 199 | 40 % | 10 % | 3 år |
| Speldator | 1999 | 20 | 600 000 | 100 000 | 1 499 | 80 % | 6 % | 2 år |
| Bärbar enhet | 2004 | 72 | 14 000 000 | 2 000 000 | 149 | 95 % | 12 % | 6 år |
| Konsol | 2006 | 96 | 35 000 000 | 5 000 000 | 399 | 110 % (säljs med förlust) | 12 % | 7 år |

En konsol för Topp år 2010 kostar alltså ca 35 M × 1,6 × (5,42 / 4,33) ≈ 70 M$ att utveckla, plus forskning
och en första order (se 5). Det ska vara den största satsningen i spelet, möjlig för en stark spelare 2009–2014.

Speldatorn använder dina egna komponenter om du har dem (annars köpta): egen GPU/CPU sänker dess enhetskostnad 8 %
var och höjer prestandan till din komponents nivå.

## 5. Tillverkningspartners

Fiktiva namn. En order (produktionsomgång) betalas när den läggs och levereras efter ledtiden. Osålt lager tappar
30 % i värde per år (nedskrivning). Tomt lager = förlorad försäljning (en liten hype-bonus "slutsålt" de första
veckorna efter lansering, sedan ren förlust). Valet **Autobeställning** lägger order mot prognosen.

| Partner | Från | Typ | Enhetskostnad | Felfrekvens | Ledtid (v) | Minsta order | Kapacitet/år | Särdrag |
|---|---|---|---|---|---|---|---|---|
| Halden Elektronik | 1988 | montering | ×1,10 | +1,0 pe | 6 | 2 000 | 60 000 | liten och flexibel, inga bristhändelser |
| Meridian Foundry | 1995 | chipfabrik | ×1,00 | +0,5 pe | 12 | 20 000 | 600 000 | stabil |
| Kaori Precision | 2000 | massmontering | ×0,88 | +1,5 pe | 16 | 100 000 | 4 000 000 | billigast, högre bristrisk |
| Vela Semiconductor | 2005 | spetsnod | ×1,15 | +0,3 pe | 14 | 50 000 | 800 000 | prestanda +8 %, kapacitet tilldelas (brist först hos dig om relationen är låg) |

**Relation** 0–100 per partner (start 50): +2 per levererad order, −10 vid avbokad order, −5 vid byte mitt i en
produkts livscykel. Relation över 70 ger −3 % pris och förtur vid brist.
**Exklusivitetsavtal** (erbjuds som händelse): −5 % pris och dubbel förtur vid brist, men du får inte använda en
annan partner för den produkttypen på 3 år.

En konsol eller bärbar enhet kräver minst Meridian/Kaori/Vela (inte Halden). Konsolens första order ska vara minst
100 000 enheter: för en konsol 2010 är det ca 40–45 M$ i bundet kapital, vilket är själva risken.

## 6. Efterfrågan, betyg och marknad

### Produktbetyg (1–10, visas som recension)

```
relPerf = perf0 / (1 + DECAY · årSedanLansering)        DECAY: komponenter 0,22, CPU 0,18, bärbart/konsol 0,10
score   = clamp(5 + 8·(relPerf − 0,85) + 0,03·(kompat − 60) − 0,4·max(0, fel% − 2), 1, 10)
```

perf0 = prestandamål × (1 + 0,03·`x_arch`) × arkitektur × partner × chef. Mellan, kompat 70, 2 % fel ger 6,5;
Topp ger 7,7; Budget 5,3 (men billigare). En komponent tappar ca ett betygssteg om året, så en serie behöver en ny
generation vart 2–3 år (en ny design på samma produktlinje kostar 60 % av den första och tar 75 % av tiden).

### Marknadsandel

```
mål     = BASE[typ] · exp(0,55·(score − 6,5)) · (refPris / pris)^ELAST · varumärke · extra
andel  → mål med 8 % per vecka, högst MAX[typ]
enheter = MARKNAD(typ, år) / 48 · andel · säsong, begränsat av lager
```

| Typ | BASE | MAX | ELAST | refPris | Marknad, enheter/år (alla tillverkare, linjärt mellan punkterna) |
|---|---|---|---|---|---|
| Ljudkort | 0,15 | 0,45 | 1,6 | 149 | 1990 15k, 1995 60k, 2000 40k, 2004 10k (integreras i moderkort) |
| Grafikkort | 0,15 | 0,45 | 1,6 | 249 | 1996 30k, 2000 150k, 2005 300k, 2010 450k, 2017 700k, 2025 800k |
| Processor | 0,06 | 0,20 | 1,3 | 199 | 2000 200k, 2010 400k, 2020 500k |
| Speldator | 0,10 | 0,30 | 1,2 | 1 499 | 1999 20k, 2005 80k, 2012 150k, 2020 250k |
| Bärbar | 0,18 | 0,45 | 1,4 | 149 | 2004 800k, 2010 1,2M, 2017 1,0M, 2025 0,8M (telefonen äter) |
| Konsol | 0,14 | 0,40 | 1,4 | 399 | 2006 1,5M, 2012 2,0M, 2020 2,5M |

- **varumärke** = 0,7 + 0,6 · hårdvarurykte/100. Ryktet börjar på 30, varje lansering flyttar det 25 % mot score×10,
  skandaler och återkallelser drar av (se 9).
- **extra** för bärbart/konsol: `(1 + 0,1·log10(1 + fans/10 000))` · bibliotek · exklusiva.
  bibliotek = 0,6 + 0,7 · stöd (se 7). Varje eget exklusivt spel med betyg ≥ 8 de senaste 26 veckorna
  ger +8 % (högst +30 %).
- **säsong**: konsol och bärbart ×2 vecka 44–47 (julhandeln), ×0,8 vecka 0–8.
- Konsoler och bärbart konkurrerar om samma marknad som de fiktiva plattformarna: när en rivals nya generation
  lanseras (`PLATFORMS`) faller din relPerf ett extra steg (DECAY-år +0,5).

Kontrollräkning grafikkort 2005: marknad 300k, andel 20 % = 60k enheter à 299 $, marginal ca 40 % ≈ 7 M$ brutto,
efter drivrutiner och marknad ca 5–6 M$. Mot spelintäkten 28 M$ är det ca 20 %: märkbart men inte dominerande.

## 7. Egen plattform (bärbart och konsol)

En lanserad bärbar enhet eller konsol blir en plattform i spelet (samma fält som i `data/platforms.js`, lagrad i
`G.hw.plats` och sammanslagen med `PLATFORMS` där plattformar listas):

- `weight` = installerad bas / 15 000, högst 90. 300k sålda om året ger vikt ca 20 efter ett år och 40 efter två
  (Nova Prism 5 har 80).
- `tier` = bästa konkurrerande generation vid lansering (Topp och Mellan), en lägre för Budget. Budget får en
  casual-bias som Hikari Wave (`casual: 1.3, simulation: 1.1, shooter: 0.75`), Topp en teknikbias (`shooter: 1.15,
  action: 1.1, racing: 1.1`).
- Ingen licenskostnad för dig. Livslängd: tills du lägger ned den, sedan samma utfasning som `lifecycle` (1,5 år).
- **Licensavgift för andra förlag** väljs bland 10/15/20/25/30 % (samma steg som butikens `FEES`).
  stöd = clamp(0,6 · (kompat/70) · (0,2/avgift)^0,8 · min(1, weight/30) · (1,2 med `h_devkit`), 0, 1).
- **Royalty per vecka** = avgift · THIRD · weight · `unitRev(år)` · stöd, med THIRD ≈ 40. En plattform med vikt 50,
  20 % avgift och stöd 0,65 ger år 2015 ca 0,2 · 40 · 50 · 1 578 · 0,65 · 48 ≈ 20 M$/år, ungefär som en väl driven
  butik.
- **Digital butik på konsolen:** har du `b_store` går konsolens digitala andel (2008 20 %, 2015 40 %, 2020 60 %)
  genom din butik och ger butiksavgiften i stället för royaltyn på den delen, plus att butikens räckvidd växer.
- **Koncernen:** integrerade dotterbolag och förlagets spel räknas som förstapart (ingen licensavgift, kan bli
  exklusiva), en ny synergi i `group.js`.
- **Efterföljare:** en ny generation på samma linje kostar 70 % av första designen. Med `h_backcompat` (enhetskostnad
  +8 %) får efterföljaren 40 % av föregångarens vikt vid lansering och tredjepartsstödet följer med.

Kontrollräkning konsol 2012, Mellan, 15 % andel: 300k enheter à 399 $ = 120 M$ hårdvaruintäkt; förlust ca 40 $ per
enhet första året (−12 M$), sedan runt +10 % marginal år 2 när kostnaden fallit. Vinsten ska komma från royalty,
egna spel utan licens och butiken. Avstämt mot kassan 82 M$ (2012) är detta ett satsa-allt-beslut.

## 8. Kompatibilitet och motoroptimering

**Kompatibilitet (0–100) per produkt:** start 70 för komponenter, 80/45 för Standard/Egen arkitektur på
plattformar. +15 med `h_driver` (komponenter) eller `h_devkit` (plattformar). Ett **drivrutins- eller devkitteam**
kostar per vecka (komponent 4 000, plattform 25 000, × `moneyScale(år)/moneyScale(1996)`) och ger +1 kompat per
4 veckor upp till 95. Låg kompat ger returer: (70 − kompat)·0,3 % av intäkten betalas tillbaka när kompat < 70.

**Optimering för egen hårdvara:**

| Situation | Effekt |
|---|---|
| Eget spel, egen motor (byggd ≤ 3 år sedan), egen plattform | taket i `engineMult` höjs från ratio 1,4 till 1,65, buggar −15 %, utvecklingstid −10 %, märks "Optimerad" i recensionerna |
| Eget pc-spel med egen motor som har `poly` eller `shader`, och du säljer grafikkort | försäljning × (1 + 0,25 · din GPU-andel), högst +10 % ("Optimerad för …-grafik") |
| Portering till egen plattform | kostnad × (1,4 − kompat/100), tid × (1,3 − kompat/200) |
| Eget exklusivt spel ≥ 8 på egen plattform | +8 % efterfrågan på plattformen i 26 veckor (högst +30 %) |
| Speldator med egna komponenter | varje såld dator höjer butikens räckviddsmål med 0,02 per 10k sålda (högst +0,1) |

## 9. Risker och händelser

Alla dras ur fröet. Sannolikhet per vecka om inget annat står. Text via `t()` på svenska och engelska.

| Händelse | När | Sannolikhet | Effekt / val |
|---|---|---|---|
| Prototypen klarar inte testerna | vid prototyp | 5 / 12 / 25 % (Budget/Mellan/Topp), minus chefens bonus | Val: gör om (+25 % tid, +20 % kostnad) eller skeppa ändå (fel% ×2) |
| Komponentbrist | per partner med order | 0,4 % (Kaori 0,6 %, Halden 0) | kapacitet −50 % i 8–20 veckor; relation > 70 halverar |
| Global chipbrist | 2020 v.10 till 2022 v.20 | fast | alla partners kapacitet −40 %, enhetskostnad +15 % |
| Felbatch | per order | 2 × fel% | Val: återkalla (30 % av orderns värde, rykte −5) eller låt bli (50 %: rykte −15 och stämning 10 % av orderns värde) |
| Överhettning ("röda lampan") | konsol Topp med kvalitet Normal, första året | 15 % en gång | garantikostnad 8 % av hårdvaruintäkten i 2 år, eller utbytesprogram direkt (5 % av installerad bas × enhetskostnad), rykte −10 |
| Försenad leverans | per order | 3 % | ledtid +50 % |
| Läcka | sista 12 designveckorna | 5 % per projekt | hype +15 för produkten, men konkurrenterna sänker pris: din andel −10 % i 12 veckor efter lansering |
| Patentstämning | egen arkitektur, per år | 2 % | förlik (1 % av årets hårdvaruintäkt, minst 200 000) eller rättegång (50 %: inget, 50 %: 4 %) |
| Benchmarkfrestelse | vid GPU-lansering | 20 % | Val: fuska (+0,5 betyg i 26 v, 20 % risk att avslöjas: rykte −20) eller låt bli |
| Kryptoboom | 2017 v.20 till 2018 v.30 | fast | grafikkortsmarknaden ×2 och priset kan höjas 30 % utan andelsförlust; säljer du till grävare (val) rykte −5 hos spelarna |
| Valutasväng | per partner | 0,3 % | enhetskostnad ±10 % i 26 veckor |
| Exklusivitetserbjudande | relation > 60, per år | 20 % | se 5 |
| Rival sänker priset | när du lanserar bärbart/konsol | 40 % | din priselasticitet räknas mot ett refPris −15 % i 26 veckor |

## 10. Föreslagen implementationsordning

1. **Komponenter:** `h_lab`, `h_sound`, `h_gpu`, `h_driver`, anläggningen, partners Halden och Meridian, design →
   prototyp → order → försäljning, betyg och andel, `x_yield`/`x_arch`, GPU-optimeringen för egna pc-spel. Fönster
   "Hårdvara" som butikens fönster (flikar: Projekt, Produkter, Partners).
2. **Datorer och processorer:** `h_pc`, `h_cpu`, Kaori och Vela, egen arkitektur, koppling till butikens räckvidd.
3. **Plattformar:** `h_lowpow`, `h_soc`, `h_handheld`, `h_devkit`, `h_console`, `h_backcompat`: egen plattform i
   plattformslistan, licensavgift och royalty, optimeringen, exklusiva, koncernsynergin, händelserna.
4. Senare och valfritt: `h_vr`, egen fabrik (utanför den här specen).

Tillstånd: `G.hw = { t0, rep: 30, chief: null, projects: [], products: [], orders: [], plats: [], partners: {}, m, lm, tot }`
skapas när `h_lab` är klar (eller första veckan för gamla sparfiler som har flaggan). Ny sparversion behövs inte om
allt saknat tolkas som tomt.

## 11. Balansmål (för simbotten)

Lägg till `--hw` i `test/sim.mjs` / `pacing.mjs` (botten forskar hårdvara när den har råd, väljer Mellan och
Meridian/Kaori, sätter förslagspris). Mål över 6 frön:

- En komponentlinje (ljudkort/grafikkort) betalar tillbaka forskning + design inom 2–3 år och ger 15–30 % av
  studions årsvinst när den går bra. Den får aldrig vara bättre än att göra spel.
- Återbetalningstid för en bra produkt (betyg 7+, Mellan): komponent 12–24 månader efter lansering, speldator 12–18,
  bärbar enhet 3 år, konsol 3–4 år (inklusive royalty). En dålig produkt (betyg under 5,5) betalar sig aldrig.
- Hårdvarans andel av studions intäkter år 2010 för en spelare som satsat (komponenter + speldator): 15–35 %. Med
  egen konsol får hårdvaruintäkten nå 40–55 % av intäkterna, men dess andel av vinsten ska vara under 20 % (royalty
  och egna spel bär vinsten).
- Botten med `--hw` ska inte gå i konkurs oftare än utan, och kontorsnivåerna ska nås samma år ±1.
- En Mellan-konsol lanserad 2010–2014 går med förlust de första 1–2 åren (hårdvara + utveckling) och når break-even
  inklusive royalty och egna spel efter 3–4 år. En Topp-konsol med dåliga spel ska kunna sänka studion.
- Konsolens vikt ska hamna på 20–50 för en normal lansering och nå 70+ bara med flera exklusiva 8+-spel.
- Kassa 2020 med `--hw` ska ligga inom ±30 % av utan, men spridningen mellan frön ska vara större (större risk).

Kalibrera i den här ordningen: MARKNAD-tabellen (storleken), sedan THIRD (royalty), sist BASE (andel).

## Så blev det i spelet (steg 1–2)

- Koden finns i `src/data/hardware.js` (tabeller), `src/sim/hardware.js` (regler, `G.hw`) och `src/ui/win-hardware.js` (fönstret).
- Anläggningen `hwlab` blev labbnivåer i `G.hw.lab` (1–3 designplatser) eftersom byggnaden ligger i en annan tråd.
- Kalibrerat med `N=24`, `node test/sim.mjs --hw`: kassa 2020 cirka 15 % över en spelare utan hårdvara, hårdvaran är
  cirka en tredjedel av intäkterna 2010 och ingen bot går i konkurs. Nivåtrappan i `npm run pacing` är oförändrad.
- Grafikkort fick namnet Spectra (Vortex är redan en konkurrerande plattformstillverkare).

## Så blev det i spelet (steg 3, plattformar)

- Bärbar enhet (Nomad) och konsol (Paragon) är produkttyper i samma fönster. När första leveransen kommer ut läggs en
  plattform till i `G.hw.plats` och i registret i `data/platforms.js` (`setOwnPlatforms`, nollas av `newGame`, läggs
  tillbaka när en sparning laddas). Plattformen får licens direkt, vikt = installerad bas / 30 000 (högst 90) och tonar
  ut under 3,5 år när produkten läggs ned.
- Licensintäkt per vecka = avgift · 30 · potential · `unitRev` · stöd. Stöd och efterfrågan (`platPull`) följer
  specen, men biblioteket väger 0,6 + 0,5 · stöd + 0,04 per eget spel (högst fem), och BASE/MAX är sänkta (bärbart 0,13/0,35,
  konsol 0,10/0,30). Konsolens enhetskostnad är 100 % av priset vid lansering. Första ordern: bärbart 40 000, konsol 60 000.
- Med: Strömsnål design, Systemkretsar (egen arkitektur i plattformar), Utvecklarprogram (+15 kompatibilitet,
  devkitteam), Bakåtkompatibilitet, konkurrentens prissänkning, överhettning, julhandeln, rivalgenerationer som åldrar
  plattformen, exklusiva hits som säljer enheter och motoroptimering (tak 1,65, buggar −15 %) för egna spel.
- Läcka (5 % under designens sista 12 veckor: lyft +0,15 som avtar, andel −10 % de första 12 veckorna),
  patentstämning (2 % per år med egen arkitektur på marknaden, förlikning 1 % av årets hårdvaruintäkt, rättegång 50 %
  inget eller 4 %, obesvarad förliks) och exklusivitetserbjudande (vecka 32, 20 % per partner med relation över 60
  som tillverkar en produkt åt dig: −5 % pris och dubbel förtur vid brist i tre år, typen låst till partnern för nya
  produkter och byten, obesvarat går ut efter 8 veckor) är med.
- Konsolens digitala butik: med en egen butik (inte pausad) säljs 5 % (2003), 20 % (2008), 40 % (2015) och 60 %
  (2020) av spelen på en egen plattform digitalt där. Dina spel behåller butiksavgiften (30 %) på den delen, och andra
  förlags digitala del ger butiken 30 % i stället för licensavgiften (raden "Egna plattformar" i butikens ekonomi).
  Plattformens spelare höjer butikens räckviddsmål med upp till 0,04 vid en miljon sålda enheter. Botar `--hw --store`
  (24 seeds): kassa 2020 420 M$ mot 370 M$ med bara `--hw`.
- Koncernsynergin: ett integrerat dotterbolag som valt en konsol eller bärbar enhet släpper i stället exklusivt på din
  nyaste egna plattform av samma slag med sannolikheten 0,6 · integrationen, om din plattform är minst halvt så stor.
  Spelet säljer efter din plattforms storlek (gånger 1,1, ingen licensavgift), räknas som ett av dina spel på
  plattformen och ett hit (8+) säljer fler enheter. Botar `--hw --acq --group` (16 seeds): 0–6 förstapartsspel per
  plattform, kassan oförändrad (541 mot 539 M$), alltså ett strategiskt val snarare än en ren vinst.
- Köpta exklusiva: på plattformskortet kan du betala ett annat förlag för att släppa sitt nästa spel bara på din
  plattform (vikt minst 10, ett köp per 24 veckor). Priset är 30 % av förlagets snittförsäljning för de tre senaste
  spelen (`exclPrice`), och spelet måste släppas om 4–36 veckor. Spelet säljer efter din plattforms storlek, ger licensavgiften och räknas bland
  plattformens spel; läggs plattformen ned före släppet får du tillbaka hälften. Botar `--hw --platex` (24 seeds):
  372 mot 370 M$, alltså nästan neutralt.
- Botar (24 seeds med fast slump): kassa 2020 är 267 M$ utan hårdvara, 341 M$ med bara komponenter (+28 %) och
  357 M$ med plattformar (+34 %; 370 M$ efter händelserna nedan), större spridning, ingen konkurs, samma nivåår. En konsol från 2011 tjänar cirka
  100 M$ inklusive licenser, konsoler från 2014–2015 går runt noll till 40 M$ och en svag konsol går med förlust.
- Drivrutinsteamet stannar när kompatibiliteten når taket, och knappen är avstängd där. Tidiga grafikkort, datorer
  och processorer har något större marknader (processorns grundandel är 7 % i stället för 6 %) så att första generationen
  inte blir en ren förlustaffär, och de sena marknaderna är trimmade.

## Så blev det i spelet (steg 4, VR-headset)

- `h_vr` (2015, kräver `h_handheld` och `f_vr`, 5 000 FP och 12 M$) öppnar typen VR-headset (`vr` i `HW_TYPES`):
  basår 2016, 56 veckor, design 6 M$, prototyp 1 M$, förslagspris 399 $, enhetskostnad 75 %, kostnadsfall 12 %/år,
  livscykel 5 år, BASE 0,25 och MAX 0,5 (Lumen VR är enda rivalen), marknad 60 000 (2015), 160 000 (2016),
  360 000 (2020) och 520 000 (2025) enheter per år. Första ordern 25 000.
- Headsetet följer reglerna för en bärbar enhet: egen plattform av slaget `vr` (namn Mirage), egen arkitektur med
  Systemkretsar, licens, devkit, bakåtkompatibilitet, butiken, koncernsynergin och köpta exklusiva. Generationen är
  den bästa konsolens (inte en lägre), och plattformen gynnar action, simulering och skjutspel som Lumen VR.
- Botar `--hw --vr --end=2026` (24 seeds): kassa 2026 933 M$ mot 893 M$ med bara `--hw` (+4,5 %). Första Mirage
  (2017) säljer 300 000–520 000 enheter, når vikt 10–17 och tjänar 28–59 M$ plus 7–22 M$ i licenser.
