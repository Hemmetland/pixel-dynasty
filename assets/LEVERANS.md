# Leverans av assets till spelet

Från tråden Kör (assets). Inkopplingen i spelet görs av spelets tråd på `claude/pixel-dynasty-prototype`.
Alla filer ligger på samma sökväg som spelet använder, så de kan kopieras rakt över från `claude/studio-dynasty-dev-830676`.
Granskningen av hela första PixelLab-satsen finns i `assets/pixellab/REVIEW.md`.

## Dockikoner (nya, handritade pixel för pixel, ingen AI)

32x32, transparent, hård alfa. En gemensam palett på 27 färger (31 med logomärket), mörk kontur `#1c1c31`
med ljus kant `#82b2d0` uppe till vänster så att formen syns mot dockans mörka bakgrund. Ljus uppifrån vänster, rak framvy.
Visas i heltalsskala: 32 px i dockans 26 px-ruta sticker ut 3 px åt varje håll i stället för att skalas suddigt.

| Fil | Manifestnyckel | Dockknapp | Mått |
| --- | --- | --- | --- |
| `assets/ui/dock-wizard.png` | `ui.dock.wizard` | Nytt spel (ritad för den turkosa knappen) | 32x32 |
| `assets/ui/dock-research.png` | `ui.dock.research` | Forska (kolv) | 32x32 |
| `assets/ui/dock-staff.png` | `ui.dock.staff` | Team | 32x32 |
| `assets/ui/dock-studio.png` | `ui.dock.studio` | Studio (byggnad) | 32x32 |
| `assets/ui/dock-market.png` | `ui.dock.market` | Marknad (stapeldiagram, från PixelLabs nav-stats) | 32x32 |
| `assets/ui/dock-finance.png` | `ui.dock.finance` | Ekonomi (bank) | 32x32 |
| `assets/ui/dock-library.png` | `ui.dock.library` | Spel (handkontroll) | 32x32 |
| `assets/ui/dock-contracts.png` | `ui.dock.contracts` | Uppdrag (hammare och kugghjul) | 32x32 |

Byt alla åtta samtidigt, så att dockan inte blir hälften pixelikoner och hälften linjeikoner.

`assets/ui/logo-mark.png` (32x32) är bara märket ur NEXUS-loggan. Lägg inte in det som `ui.logo` utan varianter:
då ersätter det märket spelaren väljer i nytt spel. Använd det bara där loggan alltid är NEXUS.

## Rättade bilder (samma nycklar och mått som i dag)

| Fil | Nyckel | Mått | Ankare | Ändring |
| --- | --- | --- | --- | --- |
| `assets/props/floorLamp.png` | `prop.floorLamp` | 19x41, crop `[0, 0, 19, 41]` | 9, 41 | 128 färger blev 14, svart kontur lyft till paletten |
| `assets/props/plantFloor.png` | `prop.plantFloor` | 21x28, crop `[0, 0, 21, 28]` | 5, 28 | 321 färger blev 14, kruka och blad reducerade var för sig |
| `assets/pixellab/backgrounds/skyline-night.png` | `bg.skyline-night` | 512x256 | 0, 0 | låtsasbokstäver på skyltar, ett ditherband och fem randiga ljuspelare bortmålade |
| `assets/pixellab/backgrounds/skyline-dusk.png` | `bg.skyline-dusk` | 512x256 | 0, 0 | två schackrutade ditherband i himlen blev hårda steg |

## Manifestrader för dockan

```json
"ui.dock.wizard": { "file": "ui/dock-wizard.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.research": { "file": "ui/dock-research.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.staff": { "file": "ui/dock-staff.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.studio": { "file": "ui/dock-studio.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.market": { "file": "ui/dock-market.png", "fw": 32, "fh": 32, "note": "handritad utifrån PixelLabs nav-stats" },
"ui.dock.finance": { "file": "ui/dock-finance.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.library": { "file": "ui/dock-library.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" },
"ui.dock.contracts": { "file": "ui/dock-contracts.png", "fw": 32, "fh": 32, "note": "handritad pixel för pixel" }
```

## Förslag till kodkrok

Spelet har ännu ingen krok för `ui.*`-spritar. Ett förslag finns som patch mot `claude/pixel-dynasty-prototype` (e1174d5):
`spriteSrc()` i `src/render/sprites.js`, `pixImg()`/`pixIcon()` i `src/ui/icons.js`, dockan i `src/ui/hud.js` och sju rader CSS.
Linjeikonen är reserv när spriten saknas. Lint, tester och nyckelkontrollen (18 kända) går igenom med patchen.

Känd begränsning: pixelikoner följer inte `currentColor`, så den valda knappen (`.dk.on`) syns bara på bakgrund och understrykning.
Patchen finns på `/mnt/project-files/pixellab-preview/dock-hook.patch`.

## Karaktären: sitta, skriva och prata (handritat)

PixelLab gick inte att nå, så de här rutorna är handredigerade ur karaktärens egna rutor (`east`, `walk-east`, `drink-coffee-east`).
De använder bara färger som redan finns i karaktären, så färgbytet per person i `charsprite.js` fungerar.
Bara karaktären är ritad. Stol och skrivbord ritar spelet själv.

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/sit.png` (184x92) | 2 | `char.sit` | sitter i vila, hand på knät; ruta 1 andas (huvud och bröst 1 px upp) |
| `assets/chars/type.png` (368x92) | 4 | `char.type` | sitter framåtlutad och skriver, händerna växlar, nick i ruta 2; samma ben som `char.sit` |
| `assets/chars/talk.png` (368x92) | 4 | `char.talk` | står och pratar: munnen öppnas och stängs, armen gestikulerar i ruta 1–2; fötterna står still |

Enskilda rutor finns i `assets/pixellab/characters/dev/{sit,type,talk}-east-hand/`.
Alla har samma mått som `char.walk`: `fw` 92, `fh` 92, `ax` 46, `ay` 82, `scale` 0.42, vänd österut, sulorna på rad 80 som i `east.png`.

```json
"char.sit":  { "file": "chars/sit.png",  "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande vila" },
"char.type": { "file": "chars/type.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad skrivande; samma underkropp som char.sit" },
"char.talk": { "file": "chars/talk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad stående gest och mun; bara stående" }
```

Höjder i sprite-px: låret ligger på rad 59–63, vilket är stolsitsens topp (`fy-9` i `chair2`). Händerna i `type` ligger på rad 47–53, tangentbordets höjd.
Förslag på bildfrekvens: `sit` 1,5, `type` 8 och `talk` 4,2 rutor per sekund.

Kända begränsningar:
- `talk` är bara stående. Den som pratar sittande ska ha kvar den procedurella figuren, annars står den på stolen.
- Rörelserna är 1 px och blir ungefär en halv scenpixel, så de syns mest som ett lätt flimmer.
- I `sit` syns underarmen knappt. Benen ser långa ut, eftersom stolsitsen ligger nära stående höfthöjd.
- `build()` i `charsprite.js` delar kantfärgerna med alfa en gång för mycket (`getImageData` ger redan icke-förmultiplicerade färger). Det ger ljusa kanter på tröja och mössa, också på `char.stand`.

## Karaktären: sittande prat, kaffe, läsa och tänka (handritat)

Samma metod som ovan: handredigerat ur karaktärens egna rutor, bara karaktären ritad, stol och skrivbord ritar spelet.
Raderna 59–91 är identiska med `sit-east-hand/0.png` i alla elva rutorna, så figuren hoppar inte när den byter mellan sittande poser.

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/sitTalk.png` (368x92) | 4 | `char.sitTalk` | 0: hand i knät, mun öppen. 1: underarm ut med öppen handflata, mun stängd, litet nick. 2: underarm 45°, handen uppåt, mun öppen. 3: hand i knät, mun stängd |
| `assets/chars/sitDrink.png` (552x92) | 6 | `char.sitDrink` | vit mugg: låret, bröstet, munnen (huvudet bakåtlutat), munnen, munnen, bröstet. Rutordningen 0,1,2,2,2,1 är inbakad i remsan, samma som procedurella `frameOf('drink')` |
| `assets/chars/read.png` (184x92) | 2 | `char.read` | huvudet böjt framåt, blicken nere, bok med vita sidor och lila pärm i bröst-/bordshöjd; i ruta 1 tippar boken 2 px och huvudet flyttas 1 px |
| `assets/chars/think.png` (184x92) | 2 | `char.think` | armbågen på bordsskivan, knytnäven under hakan, huvudet lutat uppåt; i ruta 1 andas överkroppen 1 px upp och pekfingret når läpparna |

Enskilda rutor finns i `assets/pixellab/characters/dev/{sitTalk,sitDrink,read,think}-east-hand/` (sitDrink har bara de tre unika rutorna 0–2).
Mått som övriga: `fw` 92, `fh` 92, `ax` 46, `ay` 82, `scale` 0.42, sulorna på rad 80.

```json
"char.sitTalk":  { "file": "chars/sitTalk.png",  "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande prat; samma underkropp som char.sit (Kör)" },
"char.sitDrink": { "file": "chars/sitDrink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande kaffe, rutordning 0,1,2,2,2,1 inbakad; samma underkropp som char.sit (Kör)" },
"char.read":     { "file": "chars/read.png",     "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande läsning med bok; samma underkropp som char.sit (Kör)" },
"char.think":    { "file": "chars/think.png",    "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande fundering, armbågen på bordet; samma underkropp som char.sit (Kör)" }
```

Takterna i `SEAT_SPRITE` (`talk` 4,2, `drink` 3, `read` 1, `think` 1,2) fungerar som de är. `sitDrink` har 6 rutor i stället för 3, eftersom `drawPoseSprite` bara räknar `floor(t*takt) % rutor`: med tre rutor i följd hoppar muggen från munnen rakt ner till låret. Med sex rutor i takt 3 tar en klunk 2 sekunder (procedurella drycken går i 1,7, om ni vill ha samma tempo).

Färger: alla figurpixlar använder färger som redan finns i karaktären (33–37 nyanser per remsa, som `sit.png`). Muggen använder karaktärens egna vita och mörka färger. Bokpärmen har fyra nya lila nyanser (#3a2350, #5a3678, #7a4e9e, #9a6cc0, nyans 271–273) som ligger utanför alla intervall i `material()`, så mugg och bok färgbyts aldrig. Färgbytet är prövat med två andra utseenden: tröja, mössa, jeans, hud och skor byts i alla rutor. Ingen mösspixel ligger under rad 27.

Kända begränsningar:
- `think` vilar armbågen på bordsskivan (rad 53, ungefär `fy-12`). I loungen (`scene.js`, soffan väljer `sitIdle`/`think`/`read`/`sleep`) finns inget bord, så där svävar armbågen framför bröstet. Det syns som en hand mot hakan men är inte riktigt rätt.
- `sitTalk`: den öppna munnen är en mörk springa som i full storlek kan likna ett hakskägg; i spelskala är den en pixel. I ruta 1 ligger handen bara ungefär 0,6 scenpixel över tangentbordet.
- `sitDrink`: muggen har inget synligt öra, och i ruta 2 är huvudet roterat 11°, så glasögonen är lite kantigare.
- `read`: bara den närmre handen syns (den andra skyms av boken), och boken kan tas för ett block eller en platta. Rörelsen i ruta 1 är diskret.
- `drawPoseSprite` lägger inte till personens id i rutindex, så alla i samma pose byter ruta samtidigt (gäller redan `char.sit` och `char.type`).

## Karaktären: sover vid skrivbordet (handritat)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/sleep.png` (184x92) | 2 | `char.sleep` | sitter hopsjunken med ryggen i en båge, närmre underarmen platt på bordsskivan och huvudet liggande på den med ansiktet nedåt, ögat stängt och mössan mot skärmen. Ruta 1 andas: rygg och axel 2 px upp, huvudet 1 px |

Enskilda rutor finns i `assets/pixellab/characters/dev/sleep-east-hand/`. Raderna 59–91 är identiska med `sit-east-hand/0.png`, så figuren hoppar inte från `char.sit`. Underarmens undersida ligger på rad 53, bordsskivans höjd (`fy-12`). Mössans knut slutar 1 scenpixel före skärmen i `desk2`.

```json
"char.sleep": { "file": "chars/sleep.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "hatRow": 0.53, "note": "PixelLab-karaktär 77053f90, handritad sovande med huvudet mot bordet; samma underkropp som char.sit (Kör)" }
```

- **hatRow 0.53:** mössans lägsta pixel ligger på rad 48 (0,522 av rutan). Inga andra pixlar har mössans nyans, så alla värden mellan 0,522 och 0,532 fungerar. Med standardvärdet 0.3 färgbyts ingen av mössans 158 pixlar; med 0.53 färgbyts alla, och den som saknar mössa får hårfärg där.
- **Takt:** procedurella sovandet andas på `sin(t*2.4)`, en andning per 2,6 sekunder. Samma tempo får man med `sleep: ['char.sleep', 0.75]` i `SEAT_SPRITE`.
- **Färger:** 32 nyanser, alla redan i karaktären.
- **Begränsningar:** bara den närmre armen syns. Det stängda ögat och de sneda glasögonen är 1 px-detaljer som försvinner i spelskala. zzz-bubblan ritas i dag vid `fy-32` till `fy-38`, ungefär 10–16 scenpixlar ovanför det sänkta huvudet; sänk den till runt `fy-26` för den här posen om den ser lösryckt ut.

## Karaktären: trött vid skrivbordet (handritat)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/tired.png` (184x92) | 2 | `char.tired` | 0: hopsjunken, axlarna 3 px lägre, huvudet hänger framåt och nedåt med halvslutna ögon, handen i knät. 1: gäspning: axlarna tillbaka, ögonen hårt stängda, käken nere och en lös näve framför munnen |

Enskilda rutor finns i `assets/pixellab/characters/dev/tired-east-hand/`. Raderna 59–91 är identiska med `sit-east-hand/0.png`. Mössan ligger på rad 13–27 i båda rutorna, så ingen `hatRow` behövs.

```json
"char.tired": { "file": "chars/tired.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad trött med gäspning; samma underkropp som char.sit (Kör)" }
```

- **Takt:** `tired: ['char.tired', 0.7]` i `SEAT_SPRITE` ger samma cykel som procedurella trött (4 rutor i 1,4/s, gäspningen i andra halvan). Posen varar 2,8 s, alltså en hopsjunkning och en gäspning.
- **Färger:** 36 nyanser, alla redan i karaktären, ingen rekvisita.
- **Begränsningar:** handen i knät är densamma som i `char.sit`, så den ser inte slappare ut. Den lyfta armen är lite tjockare och stelare än armarna i `think` och `sitDrink`. I spelskala är munnen en mörk pixel, så utan zzz-bubblan kan gäspningen också tas för en hostning.

## Karaktären: laptop i soffan (handritat)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/sitLaptop.png` (368x92) | 4 | `char.sitLaptop` | sitter framåtlutad med huvudet böjt mot en grå laptop i knät (skärmen mot ansiktet). Händerna skriver: 0 närmre handen trycker, 1 den lyfts 2 px och den bortre handens fingertoppar syns, 2 som 0 med en liten nick, 3 som 1 |

Enskilda rutor finns i `assets/pixellab/characters/dev/sitLaptop-east-hand/`. Raderna 59–91 är identiska med `sit-east-hand/0.png`; laptopen vilar på lårets kontur (rad 58) och sticker ut cirka 7 px förbi knät.

```json
"char.sitLaptop": { "file": "chars/sitLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande med laptop i knät; samma underkropp som char.sit (Kör)" }
```

- **Takt:** `laptop: ['char.sitLaptop', 8]` i `SEAT_SPRITE`, samma som `char.type`. 4 är ett lugnare alternativ. `drawPoseSprite` slår bara upp `laptop` i `SEAT_SPRITE` när `seated` är sant, så stående laptop vid serverracket förblir procedurell.
- **Soffhöjd:** `F.sofa` har dynans topp på `fy-12`, 3 px högre än `chair2` (`fy-9`); `P.sofaM` 2 px och fåtöljen 1 px högre. Ritad på `fy` som i dag syns dynans översta rader bakom låren och det ser ut som att man sjunker ner i soffan med fötterna i golvet. Höjer man spriten 3 px hamnar låren på dynan men fötterna svävar. Jag rekommenderar ingen förskjutning.
- **Färger:** 35 figurfärger från karaktären plus fem neutralgrå för laptopen (#2e2e33, #64646a, #8c8c92, #b4b4b8, #dcdcd8, mättnad högst 0,1), som ger `material()` = null på alla rader. Mössan ligger på rad 12–27, ingen `hatRow` behövs.
- **Begränsningar:** skrivandet syns i spelskala som ett litet flimmer i en handklump, inte som två händer. Laptopen ligger mot knäna och färgbyts inte per person.

## Karaktären: jubel med armarna upp (handritat, stående)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/cheer.png` (184x92) | 2 | `char.cheer` | står med båda armarna i ett V och knutna nävar ovanför mössan, stort skratt med öppen mun. Ruta 1 är ett litet hopp: hela figuren 2 px upp (sulorna på rad 78) och armarna 2 px till |

Enskilda rutor finns i `assets/pixellab/characters/dev/cheer-east-hand/`. Benen och fötterna är identiska med `east.png` (i ruta 1 förskjutna 2 px uppåt); tröjans fåll och jeansens överkant är omritade eftersom den hängande handen täckte dem.

```json
"char.cheer": { "file": "chars/cheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad stående jubel med hopp; samma ben som char.stand (Kör)" }
```

- **Takt:** `cheer: ['char.cheer', 5]` i `STAND_SPRITE`, samma som procedurella `floor(t*5) % 2`.
- **Bara stående:** firandet vid skrivbordet (`behavior.js`, `setPose(a, 'cheer', true)`) slår upp sittande sprites och täcks inte av den här.
- **Färger:** 33 nyanser, alla redan i karaktären, ingen rekvisita. Mössan ligger på rad 8–23, ingen `hatRow` behövs.
- **Begränsningar:** ansiktet är cirka 4 scenpixlar brett, så skrattet är en mörk pixel och tänderna syns bara i full storlek. Hoppet flyttar glasögonen mot nedskalningen, så de flimrar lite. Den bortre handen är en knytnäve, och den lyfta närmre armen döljer luvan.

## Karaktären: presentation vid tavlan (handritat, stående)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/present.png` (184x92) | 2 | `char.present` | står vänd mot tavlan med närmre armen framsträckt och en grå pekpinne i 45° uppåt, munnen öppen. Ruta 1: munnen stängd och handen med pinnen 2 px lägre, som ett tryck på en annan punkt |

Enskilda rutor finns i `assets/pixellab/characters/dev/present-east-hand/`. Raderna 64–91 är identiska med `east.png`, sulorna på rad 80. Pinnens spets hamnar på ungefär `fy-25`, inne på whiteboarden och vid skärmens nederkant i mötesrummet.

```json
"char.present": { "file": "chars/present.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad stående presentation med pekpinne; samma ben som char.stand (Kör)" }
```

- **Takt:** `present: ['char.present', 3]` i `STAND_SPRITE`, samma tempo som procedurella `floor(t*3) % 4`.
- **Färger:** 33 nyanser, alla redan i karaktären. Pinnen använder tre neutrala källfärger (#96a2c2, #1c1923, #eee8ec) som ger `material()` = null. Mössan ligger på rad 10–24, ingen `hatRow` behövs.
- **Begränsningar:** pinnen blir 2 scenpixlar bred, lite tjockare än den procedurella, eftersom en tunnare försvann mot antingen den vita tavlan eller den mörka marknadstavlan. Trycket och munrörelsen är ungefär en scenpixel. Kroppen lutar inte framåt (det gjorde glasögonen till en blå klump i spelskala).

## Frisyr 1: kort hår utan mössa och glasögon (första omgången)

Variant `#1` av karaktären: samma kropp, poser, rutor och ankare, bara huvudet bytt. Kort hår tätt mot skallen (toppen 3–4 px under den gamla mössan), polisong, kort nacke och synligt öra. Utan glasögon ritas ögat med fransrad, ögonvita, pupill och blå iris; `type` behåller sitt sänkta ögonlock. Allt utanför huvudet är pixel för pixel som grundremsan (ändringar bara på rad 9–34).

Håret använder bara hårmaterialets färger (#472b2f, #412425, #301b1a) och konturen #181311 (null), så det färgbyts till personens hårfärg, även ljusa färger som blont. Inga mösspixlar finns kvar, så ingen `hatRow` behövs.

| Remsa | Rutor | Nyckel |
| --- | --- | --- |
| `assets/chars/hair1/walk.png` | 6 | `char.walk#1` |
| `assets/chars/hair1/stand.png` | 1 | `char.stand#1` |
| `assets/chars/hair1/sit.png` | 2 | `char.sit#1` |
| `assets/chars/hair1/type.png` | 4 | `char.type#1` |

Enskilda rutor finns i `assets/pixellab/characters/dev/hair1/<nyckel>/`. Övriga poser följer.

```json
"char.walk#1":  { "file": "chars/hair1/walk.png",  "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.stand#1": { "file": "chars/hair1/stand.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 1, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.sit#1":   { "file": "chars/hair1/sit.png",   "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.type#1":  { "file": "chars/hair1/type.png",  "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" }
```

Kända begränsningar: hjässans höjd skiljer cirka 1 px mellan vissa rutor (vald så att konturen ger så få lösa mörka pixlar som möjligt i spelskala). I `walk` ruta 0–2 finns en vit pixel vid örat som redan fanns i PixelLab-rutorna.

### Frisyr 1: resten av poserna

Nu har variant `#1` alla 15 nycklar. De fyra första (walk, stand, sit, type) är oförändrade sedan förra leveransen.

| Remsa | Rutor | Nyckel |
| --- | --- | --- |
| `assets/chars/hair1/drink.png` | 6 | `char.drink#1` |
| `assets/chars/hair1/talk.png` | 4 | `char.talk#1` |
| `assets/chars/hair1/sitTalk.png` | 4 | `char.sitTalk#1` |
| `assets/chars/hair1/sitDrink.png` | 6 | `char.sitDrink#1` |
| `assets/chars/hair1/read.png` | 2 | `char.read#1` |
| `assets/chars/hair1/think.png` | 2 | `char.think#1` |
| `assets/chars/hair1/sleep.png` | 2 | `char.sleep#1` |
| `assets/chars/hair1/tired.png` | 2 | `char.tired#1` |
| `assets/chars/hair1/sitLaptop.png` | 4 | `char.sitLaptop#1` |
| `assets/chars/hair1/cheer.png` | 2 | `char.cheer#1` |
| `assets/chars/hair1/present.png` | 2 | `char.present#1` |

Enskilda rutor finns i `assets/pixellab/characters/dev/hair1/<nyckel>/`.

```json
"char.drink#1": { "file": "chars/hair1/drink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.talk#1": { "file": "chars/hair1/talk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.sitTalk#1": { "file": "chars/hair1/sitTalk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.sitDrink#1": { "file": "chars/hair1/sitDrink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.read#1": { "file": "chars/hair1/read.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.think#1": { "file": "chars/hair1/think.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.sleep#1": { "file": "chars/hair1/sleep.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.tired#1": { "file": "chars/hair1/tired.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.sitLaptop#1": { "file": "chars/hair1/sitLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.cheer#1": { "file": "chars/hair1/cheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" },
"char.present#1": { "file": "chars/hair1/present.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" }
```

- **Så byggdes huvudena:** samma uppritade huvud i alla poser, flyttat eller roterat exakt som posens eget huvud (läsa och laptop 12° framåt, tänka 7°, kaffe 11°, trött -20°, sova 90°). `drink` är PixelLab-rutor, där huvudet passades in ruta för ruta.
- **Utanför huvudet** ändrades bara några pixlar: i `cheer` syns den lyfta bortre armen där mössan tidigare täckte den, och i `drink` och `walk` försvann några lösa källpixlar.
- **`sleep#1`** behöver ingen `hatRow` (inga mösspixlar), men värdet 0.53 skadar inte.
- **Begränsningar:** den mörka konturen på hjässan kan ge en eller två mörka hörnpixlar på ljust hår i spelskala (högst cirka 4 per ruta, värst i `drink` 0 och 4). `drink` ruta 1, 3 och 4 har ett enkelt upprätt öga i ett lutat ansikte, och i `sleep` är huvudet mindre än mössan var, så handen på bordet syns helt.

## Karaktären: jubel vid skrivbordet (handritat, sittande)

| Remsa | Rutor | Nyckel | Innehåll |
| --- | --- | --- | --- |
| `assets/chars/sitCheer.png` (184x92) | 2 | `char.sitCheer` | sitter med båda armarna i ett V och knutna nävar över huvudet, stort skratt. Ruta 1: ryggen rätas 2 px och armarna går 2 px högre, som ett glädjeskutt på stolen |

Enskilda rutor finns i `assets/pixellab/characters/dev/sitCheer-east-hand/`. Överkroppen är stående `char.cheer` flyttad 3 px ner (samma förhållande som mellan `east.png` och `sit-east-hand/0.png`), med armarna lite mer isär så att nävarna går fria från mössan. Raderna 59–91 är identiska med `sit-east-hand/0.png`. Den bortre näven ligger cirka 7 scenpixlar från skärmen i `desk2`.

```json
"char.sitCheer": { "file": "chars/sitCheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "PixelLab-karaktär 77053f90, handritad sittande jubel vid skrivbordet; samma underkropp som char.sit (Kör)" }
```

- **Takt:** `cheer: ['char.sitCheer', 5]` i `SEAT_SPRITE`, samma som procedurella `floor(t*5) % 2` och stående `char.cheer`.
- **Färger:** 34 nyanser, alla redan i karaktären. Mössan ligger på rad 11–27, ingen `hatRow` behövs.
- **Begränsningar:** ansiktet är cirka 5 scenpixlar brett, så munnen växlar mellan mörk och mörkrosa mellan rutorna, vilket ser ut som skratt men inte lika tydligt som den procedurella figurens vita tänder. Ruta 1 läses som att sitta upp rak, inte som ett riktigt lyft från stolen.
- **Frisyrer:** `char.sitCheer#1` (kort hår) och `#2` följer, så att ingen byter frisyr när de jublar.

### Frisyr 1: jubel vid skrivbordet

```json
"char.sitCheer#1": { "file": "chars/hair1/sitCheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 1, kort hår utan mössa och glasögon (Kör)" }
```

Byggd som `cheer#1`: samma huvud, och den bortre armen syns där mössan tidigare täckte den. Rutor i `assets/pixellab/characters/dev/hair1/sitCheer/`. Därmed har `#1` alla 16 nycklar.


## Frisyr 2: hästsvans utan mössa och glasögon (alla 16 nycklar)

Variant `#2`: samma ansikte och öga som `#1`, men håret är bakåtkammat med en knut, ett mörkt hårband och en hästsvans som hänger ner till axelhöjd (cirka 4 px tjock, smalnar av mot spetsen). I `walk` svänger svansen -1 till +1 px med stegen, i lutade poser hänger den rakt ner, och i jublen svänger den bakåt på skuttet. Håret och svansen använder hårmaterialets färger; hårbandet och konturen (#181311) färgbyts inte.

| Remsa | Rutor | Nyckel |
| --- | --- | --- |
| `assets/chars/hair2/walk.png` | 6 | `char.walk#2` |
| `assets/chars/hair2/stand.png` | 1 | `char.stand#2` |
| `assets/chars/hair2/drink.png` | 6 | `char.drink#2` |
| `assets/chars/hair2/sit.png` | 2 | `char.sit#2` |
| `assets/chars/hair2/type.png` | 4 | `char.type#2` |
| `assets/chars/hair2/talk.png` | 4 | `char.talk#2` |
| `assets/chars/hair2/sitTalk.png` | 4 | `char.sitTalk#2` |
| `assets/chars/hair2/sitDrink.png` | 6 | `char.sitDrink#2` |
| `assets/chars/hair2/read.png` | 2 | `char.read#2` |
| `assets/chars/hair2/think.png` | 2 | `char.think#2` |
| `assets/chars/hair2/sleep.png` | 2 | `char.sleep#2` |
| `assets/chars/hair2/tired.png` | 2 | `char.tired#2` |
| `assets/chars/hair2/sitLaptop.png` | 4 | `char.sitLaptop#2` |
| `assets/chars/hair2/cheer.png` | 2 | `char.cheer#2` |
| `assets/chars/hair2/present.png` | 2 | `char.present#2` |
| `assets/chars/hair2/sitCheer.png` | 2 | `char.sitCheer#2` |

Enskilda rutor finns i `assets/pixellab/characters/dev/hair2/<nyckel>/`. Allt under rad 60 är identiskt med grundremsorna. Utanför huvudet och svansen ändrades bara: 18 huvpixlar per ruta i `sleep` (under svansen) och den lyfta närmre armen i `cheer` och `sitCheer`, där hårbandet och svansen ritas ovanpå armen.

```json
"char.walk#2": { "file": "chars/hair2/walk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.stand#2": { "file": "chars/hair2/stand.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 1, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.drink#2": { "file": "chars/hair2/drink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sit#2": { "file": "chars/hair2/sit.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.type#2": { "file": "chars/hair2/type.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.talk#2": { "file": "chars/hair2/talk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sitTalk#2": { "file": "chars/hair2/sitTalk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sitDrink#2": { "file": "chars/hair2/sitDrink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.read#2": { "file": "chars/hair2/read.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.think#2": { "file": "chars/hair2/think.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sleep#2": { "file": "chars/hair2/sleep.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.tired#2": { "file": "chars/hair2/tired.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sitLaptop#2": { "file": "chars/hair2/sitLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.cheer#2": { "file": "chars/hair2/cheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.present#2": { "file": "chars/hair2/present.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" },
"char.sitCheer#2": { "file": "chars/hair2/sitCheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 2, långt hår i hästsvans utan mössa och glasögon (Kör)" }
```

- **`sleep#2`** behöver ingen `hatRow`.
- **Begränsningar:** i `sleep` blir hårmassan cirka 6 px högre än i `#1` och läses mer som en knut än en hästsvans. `drink` ruta 1 har en liten ögla mellan svansen och skallen (syns bara i full storlek). I `read` och `sitLaptop` är bakhuvudet lite plattare. På ljust hår syns hårbandet och konturen mot nacken som mörka prickar i spelskala.

## Frisyr 3: lockigt hår utan mössa och glasögon (alla 16 nycklar)

Variant `#3`: samma ansikte och öga som `#1` och `#2`, men håret är ett runt, lockigt moln (kort afro). Toppen ligger 4 px högre än i `#1` och bakhuvudet 5 px längre bak. Tre runda lockar bildar kronan, fler lockar buktar bakhuvudet och nacken, och en lockig lugg ligger över pannan. Lockarna är cirka 5 px stora med 2 px skuggfickor så att strukturen överlever nedskalningen till 0,42. Håret använder bara hårmaterialets färger (#472b2f, #412425, #301b1a), ljus uppifrån vänster; konturen (#181311) färgbyts inte. Kronans form väljs en gång per remsa så att lockarna inte hoppar mellan rutorna.

| Remsa | Rutor | Nyckel |
| --- | --- | --- |
| `assets/chars/hair3/walk.png` | 6 | `char.walk#3` |
| `assets/chars/hair3/stand.png` | 1 | `char.stand#3` |
| `assets/chars/hair3/drink.png` | 6 | `char.drink#3` |
| `assets/chars/hair3/sit.png` | 2 | `char.sit#3` |
| `assets/chars/hair3/type.png` | 4 | `char.type#3` |
| `assets/chars/hair3/talk.png` | 4 | `char.talk#3` |
| `assets/chars/hair3/sitTalk.png` | 4 | `char.sitTalk#3` |
| `assets/chars/hair3/sitDrink.png` | 6 | `char.sitDrink#3` |
| `assets/chars/hair3/read.png` | 2 | `char.read#3` |
| `assets/chars/hair3/think.png` | 2 | `char.think#3` |
| `assets/chars/hair3/sleep.png` | 2 | `char.sleep#3` |
| `assets/chars/hair3/tired.png` | 2 | `char.tired#3` |
| `assets/chars/hair3/sitLaptop.png` | 4 | `char.sitLaptop#3` |
| `assets/chars/hair3/cheer.png` | 2 | `char.cheer#3` |
| `assets/chars/hair3/present.png` | 2 | `char.present#3` |
| `assets/chars/hair3/sitCheer.png` | 2 | `char.sitCheer#3` |

Enskilda rutor finns i `assets/pixellab/characters/dev/hair3/<nyckel>/`. Allt under rad 60 är identiskt med grundremsorna. Utanför huvudet ändrades bara: 4 till 6 huvpixlar vid nacken i `sitDrink` ruta 2 till 4 och i `think`, och 8 till 12 pixlar av den bortre, lyfta ärmen bakom huvudet i `cheer` och `sitCheer`, där lockarna ligger framför ärmen. Den närmre armen, muggen, boken, laptopen och händerna är orörda. Lockarna täcker örats översta 3 pixlar; nedre delen av örat syns.

```json
"char.walk#3": { "file": "chars/hair3/walk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.stand#3": { "file": "chars/hair3/stand.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 1, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.drink#3": { "file": "chars/hair3/drink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sit#3": { "file": "chars/hair3/sit.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.type#3": { "file": "chars/hair3/type.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.talk#3": { "file": "chars/hair3/talk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sitTalk#3": { "file": "chars/hair3/sitTalk.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sitDrink#3": { "file": "chars/hair3/sitDrink.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.read#3": { "file": "chars/hair3/read.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.think#3": { "file": "chars/hair3/think.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sleep#3": { "file": "chars/hair3/sleep.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.tired#3": { "file": "chars/hair3/tired.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sitLaptop#3": { "file": "chars/hair3/sitLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.cheer#3": { "file": "chars/hair3/cheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.present#3": { "file": "chars/hair3/present.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" },
"char.sitCheer#3": { "file": "chars/hair3/sitCheer.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 2, "scale": 0.42, "note": "Frisyr 3, lockigt hår utan mössa och glasögon (Kör)" }
```

- **`sleep#3`** behöver ingen `hatRow`.
- **Begränsningar:** på ljust hår lämnar den knottriga kronan några ensamma mörka pixlar överst i spelskala (fler än den släta kronan i `#1`, men de syns knappt mot den mörka bakgrunden). I svart och mörkbrunt hår blir strukturen svag eftersom hårets tre nyanser ligger nära varandra, så håret läses mest som en stor rund kalufs. I de vridna huvudena i `read`, `sitLaptop` och `drink` ruta 1 blir lockstrukturen lite brusigare; kronan är handskuren tillbaka till två lockar i `read` och `sitLaptop`.

## Spela arkadspel: `char.play` med frisyr 1, 2 och 3

Stående vid en arkadmaskin, 4 rutor: den bortre handen på spaken (röd kula), den närmre handen på knapparna, en lätt gungning i knäna. Grundremsan och de tre frisyrerna levereras samtidigt.

| Ruta | Knän | Spak | Knapp |
| --- | --- | --- | --- |
| 0 | uppe | bakåt | uppe |
| 1 | 2 px ner | mitten | intryckt |
| 2 | 2 px ner | framåt | uppe |
| 3 | uppe | mitten | intryckt |

- **Remsor:** `assets/chars/play.png`, `assets/chars/hair1/play.png`, `assets/chars/hair2/play.png`, `assets/chars/hair3/play.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/play-east-hand/` och `dev/hair1/play/`, `dev/hair2/play/`, `dev/hair3/play/`.
- **Takt:** 7 bilder/s ger en ren loop: `STAND_SPRITE.play = ['char.play', 7]`.
- **Mått:** överkroppen sjunker 2 px i ruta 1 och 2 medan händerna står still på kontrollerna, så armarna böjs. Skorna (rad 75 till 91) är identiska med `east.png` och sulorna ligger på rad 80. Händerna når x 62 till 66, knapphanden rad 45 till 52 (kontrollpanelen ligger på rad 46 till 53).
- **Färger:** spakens kula använder två nya rekvisitafärger, `#e85846` och `#b4402f`, som båda ger `material()` = null på alla rader. Allt annat använder källfärger. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** huvudet rör sig exakt som i grundremsan. Inga kropps-, hand- eller spakpixlar ändras i någon variant, och händerna och spaken ligger framför håret.

```json
"char.play": { "file": "chars/play.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Spelar på arkadmaskin, handritad (Kör)" },
"char.play#1": { "file": "chars/hair1/play.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.play#2": { "file": "chars/hair2/play.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.play#3": { "file": "chars/hair3/play.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Platsen i spelrummet:** arkadmaskinen ritas på slot.x+3 till +16 men platsen (facSpots i behavior.js) är slot.x+14 vänd österut, så maskinen hamnar bakom personen och händerna spelar över sittsäcken. Spegelvänd (dir -1) på slot.x+21 landar händerna på kontrollpanelen och posen läses tydligt (se förhandsvisningen, del B). Den som pratar med spelaren på s.x+15 står då bakom och tittar på.
- **Begränsningar:** spakens kula är 1 till 2 röda pixlar i spelskala och läses som en spak bara bredvid maskinen. I grundremsan läses glasögonen som ett mörkt streck i ruta 1 och 2 (nedskalningen träffar dem annorlunda när huvudet sjunker 2 px), så den kan se ut att blinka i takt med gungningen, som i jublet. Knäböjen är ungefär 1 pixel i spelskala.

## Skruva vid serverracket: `char.fix` med frisyr 1, 2 och 3

Stående vid ett serverrack, 4 rutor: lätt framåtlutad, blicken ner mot arbetet (det sänkta ögat från `type`), den närmre armen i brösthöjd med en skruvmejsel och den bortre handen platt mot racket. Handen vrider mejseln: knytnäven går genom fyra lägen (tummen uppe, rullar, vriden, tar om greppet), armbågen sjunker 1 till 2 px och ljusfasetten på handtaget flyttar ner en rad per ruta. Grundremsan och de tre frisyrerna levereras samtidigt.

- **Remsor:** `assets/chars/fix.png`, `assets/chars/hair1/fix.png`, `assets/chars/hair2/fix.png`, `assets/chars/hair3/fix.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/fix-east-hand/` och `dev/hair1/fix/`, `dev/hair2/fix/`, `dev/hair3/fix/`.
- **Takt:** 5 bilder/s ger en jämn vridning: `STAND_SPRITE.fix = ['char.fix', 5]`.
- **Mått:** överkroppen (rad 0 till 41) är flyttad 2 px framåt och huvudet (2, 2). Benen och fötterna (rad 64 till 91) är identiska med `east.png`, sulorna på rad 80. Knytnäven ligger på rad 37 till 45, mejselns spets når x 77. Från rackplatsen på rx+10 hamnar spetsen på ungefär rx+23, alltså inne i racket som börjar på rx+18 till 19.
- **Färger:** handtaget använder fyra nya gulgröna rekvisitafärger (`#e2ea6e`, `#bccb3e`, `#8e9a2a`, `#4c5420`, nyans 63 till 66) som alla ger `material()` = null. Skaftet använder källfärger. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** händerna, ärmen och mejseln är identiska med grundremsan. Lockarna i `#3` täcker tre huvpixlar vid nacken, (41..43, 32), i varje ruta.

```json
"char.fix": { "file": "chars/fix.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Skruvar vid serverrack, handritad (Kör)" },
"char.fix#1": { "file": "chars/hair1/fix.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.fix#2": { "file": "chars/hair2/fix.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.fix#3": { "file": "chars/hair3/fix.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** vridningen är diskret i spelskala och läses som en arbetsrörelse snarare än en tydligt roterande handled. I full storlek kan den bortre, öppna handen se ut som en stopphand; i spelskala läses den som en hand mot racket.

## Prata i telefon i receptionen: `char.phone` med frisyr 1, 2 och 3

Stående vid receptionsdisken, 4 rutor: den närmre handen håller en grå trådlös lur mot örat (luren går längs käken och mikrofonen sticker fram under hakan), den bortre underarmen gestikulerar med öppen handflata framför kroppen, och munnen pratar (munnen från `talk`). Huvudet är upprätt och oflyttat. Grundremsan och de tre frisyrerna levereras samtidigt.

| Ruta | Mun | Gesthand (handleden) |
| --- | --- | --- |
| 0 | öppen | rad 46 |
| 1 | stängd | rad 44 |
| 2 | öppen | rad 42 |
| 3 | stängd | rad 44 |

- **Remsor:** `assets/chars/phone.png`, `assets/chars/hair1/phone.png`, `assets/chars/hair2/phone.png`, `assets/chars/hair3/phone.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/phone-east-hand/` och `dev/hair1/phone/`, `dev/hair2/phone/`, `dev/hair3/phone/`.
- **Takt:** 4,2 bilder/s som `talk`: `STAND_SPRITE.phone = ['char.phone', 4.2]`.
- **Mått:** benen och skorna (rad 64 och nedåt) är `east.png`, sulorna på rad 80. Handen vid örat täcker x 39 till 48, rad 20 till 29, och luren x 47 till 56, rad 26 till 34. Gesthanden landar i höjd med disken (diskens ovansida ligger på sprite-rad 41,4).
- **Färger:** luren använder fem nya grå rekvisitafärger (`#22232a`, `#3a3c46`, `#5a5d69`, `#8a8d99`, `#c0c3cc`, nyans 225 till 233, mättnad högst 0,2) som alla ger `material()` = null på alla rader. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** handen, armen och luren ritas efter huvudet och ligger framför håret i alla tre frisyrer; det lagret är identiskt i alla fyra remsor. Utanför huvudet är varianterna pixelidentiska med grundremsan.

```json
"char.phone": { "file": "chars/phone.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Pratar i telefon, handritad (Kör)" },
"char.phone#1": { "file": "chars/hair1/phone.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.phone#2": { "file": "chars/hair2/phone.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.phone#3": { "file": "chars/hair3/phone.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Receptionsplatsen:** på nivå 3 (x0+34, dir 1, `F.receptionDesk`) och nivå 4 (x0+40, dir 1, `P.receptionM`) står disken framför personen. På nivå 5 står platsen på x0+25 ovanpå diskens vänstra ände och skärm (`T.reception` på x0+23 till 46); x0+51 med dir -1 fungerar där (diskens östra ände, vänd mot dörren, 37 px från ståplatsen på x0+14). `KINDS.lobby` använder `face: 'partner'`, vilket vänder receptionisten till dir -1 på nivå 3 och 4 så att disken hamnar bakom; telefonposen bör använda platsens egen riktning.
- **Begränsningar:** i full storlek läses det tydligt som ett telefonsamtal, i spelskala bara måttligt: den närmre armen smälter ihop med bålen, och i svart hår kan lurens mörka underkant se ut som ett pipskägg. Handen och luren står stilla; bara munnen och gesthanden rör sig. I ruta 2 kommer gesthanden nära den närmre armbågen.

## Stå med laptop vid serverracket: `char.laptop` med frisyr 1, 2 och 3

Stående vid ett serverrack, 4 rutor: en uppfälld laptop vilar på den bortre underarmen framför magen (handflatan under, locket reser sig från gångjärnet och lutar lätt bakåt, skärmglöd bara på insidan), och den närmre handen skriver. Huvudet är flyttat (2, 2) med det sänkta ögat från `type` och stängd mun, samma huvudflytt som `char.fix`. Bara den närmre underarmen och handen rör sig mellan rutorna. Grundremsan och de tre frisyrerna levereras samtidigt.

| Ruta | Skrivhanden |
| --- | --- |
| 0 | fingrarna på tangenterna |
| 1 | lyft 2 px, handleden 1 px upp |
| 2 | som 0, 1 px längre fram |
| 3 | som 1, 1 px längre fram |

- **Remsor:** `assets/chars/laptop.png`, `assets/chars/hair1/laptop.png`, `assets/chars/hair2/laptop.png`, `assets/chars/hair3/laptop.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/laptop-east-hand/` och `dev/hair1/laptop/`, `dev/hair2/laptop/`, `dev/hair3/laptop/`.
- **Takt:** 8 bilder/s, en loop på 0,5 s utan hopp: `STAND_SPRITE.laptop = ['char.laptop', 8]`. Obs: `walk()` i behavior.js sätter pose 'laptop' medan någon bär laptopen (`a.carry`), så den här stående posen bör bara användas när personen står på platsen; gången får `char.walkLaptop`.
- **Mått:** laptopens bas x 52 till 68, rad 44 till 47; locket reser sig till rad 31; skärmglöd rad 35 till 39. Sulorna på rad 80. Från rackplatsen rx+27 (rooms.js, tier4) och rx+24 (tier5), dir 1, står personen framför mittracket och locket når kanten på nästa rack.
- **Färger:** fem nya rekvisitafärger, `#22232a`, `#5a5d69`, `#8a8d99`, `#c0c3cc` (gråa, nyans 225 till 232) och skärmglöden `#dce8f4` (nyans 210, mättnad 0,10). Alla ger `material()` = null på sina rader. Kanterna är ljusa så att laptopen inte försvinner mot de mörka racken. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** armarna, händerna och laptopen ritas efter huvudet och är identiska i alla fyra remsor, så de ligger framför håret. Lockarna i `#3` täcker fyra huvpixlar vid nacken, (39..42, 32).

```json
"char.laptop": { "file": "chars/laptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Står med laptop, handritad (Kör)" },
"char.laptop#1": { "file": "chars/hair1/laptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.laptop#2": { "file": "chars/hair2/laptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.laptop#3": { "file": "chars/hair3/laptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** i spelskala syns basen bara som en tunn grå linje under handen; locket bär läsningen. Fingertrycket är 1 till 2 px och läses som ett litet fladder i handen. Huvudet är flyttat 2 px framåt utan att kroppen lutar, så nacken ser lite framskjuten ut. Posen används också i labb, QA och serverrummen på slot.x+14; de rummen är inte kontrollerade i förhandsvisningen.

## Gå med laptop under armen: `char.walkLaptop` med frisyr 1, 2 och 3

Gångcykel med en hopfälld laptop under den närmre armen, 6 rutor i samma ordning och takt som `char.walk`. Varje ruta är `walk.png`:s ruta med samma nummer: ben, fötter, huvud, den bortre armen och kroppens gungning är pixelidentiska, bara den närmre armen är utbytt mot en böjd arm vars underarm ligger vågrätt och håller laptopen (en 3 px tjock skiva sedd från kanten, bakre änden 1 px högre). Armen och laptopen följer kroppens gungning i varje ruta. Grundremsan och de tre frisyrerna levereras samtidigt.

- **Remsor:** `assets/chars/walkLaptop.png`, `assets/chars/hair1/walkLaptop.png`, `assets/chars/hair2/walkLaptop.png`, `assets/chars/hair3/walkLaptop.png` (6 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/walkLaptop-east-hand/` och `dev/hair1/walkLaptop/`, `dev/hair2/walkLaptop/`, `dev/hair3/walkLaptop/`.
- **Takt:** 9 bilder/s som `walk`: `STAND_SPRITE.walkLaptop = ['char.walkLaptop', 9]`.
- **Mått:** underarmen ligger på rad 44 till 49, laptopen på rad 49 till 52 (48 till 51 i ruta 3 till 5), x 38 till 57, knytnäven x 58 till 62. Ändringarna mot `walk.png` ligger på rad 38 till 64: den gamla svingande ärmen och handen är bortmålade, och där handen täckte låret är låret ifyllt med rutans egna byxfärger. Fötterna är orörda (tårna når rad 81 till 82 i ruta 2, 4 och 5 precis som i `walk`).
- **Färger:** laptopen använder gråtonerna från `char.sitLaptop` (`#2e2e33`, `#64646a`, `#8c8c92`), som ger `material()` = null. Inga nya färger. Mössan är `walk`:s, så ingen `hatRow` behövs.
- **Frisyrerna:** varje variant är `hairN/walk.png`:s ruta med exakt samma armbyte, så hästsvansen svänger som i `walk#2`. Armen, handen och laptopen är identiska i alla fyra remsor.

```json
"char.walkLaptop": { "file": "chars/walkLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Går med laptop under armen, handritad (Kör)" },
"char.walkLaptop#1": { "file": "chars/hair1/walkLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.walkLaptop#2": { "file": "chars/hair2/walkLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.walkLaptop#3": { "file": "chars/hair3/walkLaptop.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** i spelskala syns laptopen som en 1 till 2 px grå linje under en vågrät underarm med knytnäven framför; tydligt mot det mörka serverrummet, svagare mot de beige skrivborden i utvecklarrummet. Underarmen ligger i midjehöjd och näven sticker ut cirka 10 px framför bröstet, lite som att bära en bricka. Skivan är 20 px lång så att den når bakom kroppen. Ruta 1 och 2 har mest ifyllda pixlar på lårets framkant.

## Vinka vid skrivbordet: `char.wave` med frisyr 1, 2 och 3

Stående vid skrivbordet och hälsar på en ny kollega, 4 rutor: den närmre armen lyft framåt med en öppen hand (handflatan mot betraktaren), underarmen vinkar runt armbågen, och ett öppet leende (munnen från `cheer`). Huvudet är `east.png`:s, oflyttat. Kroppen står stilla så att blicken dras till handen. Grundremsan och de tre frisyrerna levereras samtidigt.

| Ruta | Underarmen (framåt från lodrätt) | Handen |
| --- | --- | --- |
| 0 | 16° (bakåt) | x 59 till 67, rad 14 till 22 |
| 1 | 26° (mitten) | x 61 till 69, rad 15 till 23 |
| 2 | 36° (framåt) | x 64 till 72, rad 16 till 24 |
| 3 | som ruta 1 | som ruta 1 |

- **Remsor:** `assets/chars/wave.png`, `assets/chars/hair1/wave.png`, `assets/chars/hair2/wave.png`, `assets/chars/hair3/wave.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/wave-east-hand/` och `dev/hair1/wave/`, `dev/hair2/wave/`, `dev/hair3/wave/`.
- **Takt:** 5 bilder/s som `floor(t*5)%4` i behavior.js: `STAND_SPRITE.wave = ['char.wave', 5]`. En hälsning på 1,6 s blir två vinkningar.
- **Mått:** benen och skorna (rad 64 och nedåt) är `east.png`, sulorna på rad 80. Handen håller minst en tom pixel till huvudet och håret i spelskala i alla frisyrer. Platsen vid skrivbordet (dk.x+5, dir 1) fungerar: skrivbordet och skärmarna står framför personen och stolsryggen bakom, och handen går fri från skärmen.
- **Färger:** inga nya färger och ingen rekvisita; armen och handen är bara tröja och hud. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** armen och handen ritas efter huvudet och är identiska i alla fyra remsor, så de ligger framför håret. Inga kroppspixlar ändras i varianterna.

```json
"char.wave": { "file": "chars/wave.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Vinkar, handritad (Kör)" },
"char.wave#1": { "file": "chars/hair1/wave.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.wave#2": { "file": "chars/hair2/wave.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.wave#3": { "file": "chars/hair3/wave.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** överarmen är lång och nästan vågrät, så i full storlek ser armen lite stel ut; i spelskala läses den bra. I ruta 2 är handleden böjd bakåt för att handen ska behålla formen av en öppen hand. Ruta 0 är tätast: handen ligger 2 till 3 px från mössan och lockarna. Mot det ljusa fönstret i utvecklarrummet på nivå 3 har handen mindre kontrast, men konturen håller den läsbar.

## Gå med flyttlåda: `char.walkBox` med frisyr 1, 2 och 3

Gångcykel med en stängd brun flyttlåda framför bröstet, 6 rutor i samma ordning och takt som `char.walk`. Varje ruta är `walk.png`:s ruta med samma nummer: ben, fötter, huvud och kroppens gungning är pixelidentiska. Båda de svingande armarna är bortmålade; den närmre armen går snett ner över lådans sida och handen håller om lådans nedre främre hörn, den bortre armen är dold bakom lådan. Lådan följer gungningen i varje ruta. Grundremsan och de tre frisyrerna levereras samtidigt.

- **Remsor:** `assets/chars/walkBox.png`, `assets/chars/hair1/walkBox.png`, `assets/chars/hair2/walkBox.png`, `assets/chars/hair3/walkBox.png` (6 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/walkBox-east-hand/` och `dev/hair1/walkBox/`, `dev/hair2/walkBox/`, `dev/hair3/walkBox/`.
- **Takt:** 9 bilder/s som `walk`: `STAND_SPRITE.walkBox = ['char.walkBox', 9]`.
- **Mått:** lådan är 22 × 16 px (x 42 till 63, rad 37 till 52 i ruta 0) med ljus ovansida, tejpremsa, skuggad framkant och undersida; framkanten ligger 11 px framför bröstet. Handen x 60 till 65, rad 47 till 52. Hakan ligger på rad 32, så fyra rader är fria ovanför lådan. Fötterna är orörda.
- **Färger:** tre nya bruna kartongfärger, `#e0b06a`, `#ab7c45`, `#7e5833` (nyans 30 till 36, mättnad under 0,7), plus figurens egen kontur `#1c1923`. Alla ger `material()` = null på alla rader (aldrig mössa, hår eller hud). Mössan är `walk`:s, så ingen `hatRow` behövs.
- **Frisyrerna:** varje variant är `hairN/walk.png`:s ruta med samma lådlager, så hästsvansen svänger som i `walk#2`. Lådan och armen är identiska i alla fyra remsor och möter aldrig håret.

```json
"char.walkBox": { "file": "chars/walkBox.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Går med flyttlåda, handritad (Kör)" },
"char.walkBox#1": { "file": "chars/hair1/walkBox.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.walkBox#2": { "file": "chars/hair2/walkBox.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.walkBox#3": { "file": "chars/hair3/walkBox.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 6, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** i spelskala syns lådans mörka överkant bara i ruta 3 till 5 (nedskalningen av gungningen), så kanten fladdrar lite vid 9 bilder/s, precis som huvudet i `walk`. Med orange, senapsgula eller rostfärgade tröjor blir kontrasten mot lådan lägre; ruta 0 är svagast. Tejpen syns i spelskala bara som ett mörkt hack i överkanten.

## Handslag vid förvärv och avtal: `char.shake` med frisyr 1, 2 och 3

Stående handslag, 4 rutor: den närmre armen sträcks fram i brösthöjd med lätt böjd armbåge, handen vriden för handslag (tummen uppe, fingrarna framåt, sedd från sidan) och pumpar upp och ner. Den bortre armen är dold som i `stand`. Huvudet är `east.png`:s, orört med sitt eget leende. Grundremsan och de tre frisyrerna levereras samtidigt.

| Ruta | Handleden | Handen (rader) |
| --- | --- | --- |
| 0 | vila | 40 till 46 |
| 1 | 2 px upp | 38 till 44 |
| 2 | vila (som ruta 0) | 40 till 46 |
| 3 | 2 px ner | 42 till 48 |

- **Remsor:** `assets/chars/shake.png`, `assets/chars/hair1/shake.png`, `assets/chars/hair2/shake.png`, `assets/chars/hair3/shake.png` (4 rutor var). Enskilda rutor finns i `assets/pixellab/characters/dev/shake-east-hand/` och `dev/hair1/shake/`, `dev/hair2/shake/`, `dev/hair3/shake/`.
- **Takt:** 4 bilder/s: `STAND_SPRITE.shake = ['char.shake', 4]`.
- **Mått:** handens främsta pixel ligger på x 66 i alla rutor, 20 px framför ankaret. Två personer vända mot varandra med ankarna 40 rut-px isär (16,8 scen-px; 16 eller 17 scen-px fungerar båda) möts med händerna i mitten: i spelskala blir greppet en 4 till 5 × 3 px hudstav mellan underarmarna, och två olika hudtoner läses som två händer. Benen (rad 64 och nedåt) är `east.png`, sulorna på rad 80.
- **Takten mellan paret:** båda måste pumpa på samma ruta. scene.js lägger `(a.id % 7) * 0.37` till `a.t` per person, och ur fas hamnar händerna 2 spel-px isär i höjd så att greppet bryts. Ge båda samma t (till exempel affärens starttid) under handslaget.
- **Färger:** inga nya färger och ingen rekvisita. Mössan ligger ovanför rad 27,6, så ingen `hatRow` behövs.
- **Frisyrerna:** armen och handen är identiska i alla fyra remsor och ligger framför håret. Inga kroppspixlar ändras i varianterna.

```json
"char.shake": { "file": "chars/shake.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Handslag, handritad (Kör)" },
"char.shake#1": { "file": "chars/hair1/shake.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 1, kort hår (Kör)" },
"char.shake#2": { "file": "chars/hair2/shake.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 2, hästsvans (Kör)" },
"char.shake#3": { "file": "chars/hair3/shake.png", "fw": 92, "fh": 92, "ax": 46, "ay": 82, "frames": 4, "scale": 0.42, "note": "Frisyr 3, lockigt hår (Kör)" }
```

- **Begränsningar:** med fronten låst vid x 66 överlappar händerna bara 2 px, så i full storlek ser det mer ut som två knytnävar mot varandra med tummarna uppe; i spelskala läses det som ett grepp. Den spegelvända partnern skakar med vänster hand. I mötesrummet på nivå 3 smälter ljus hud nästan ihop med bordskanten i ruta 3, och i styrelserummet på nivå 5 smälter mörk hud in mot de mörka stolsryggarna.
