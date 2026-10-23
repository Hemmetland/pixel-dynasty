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
