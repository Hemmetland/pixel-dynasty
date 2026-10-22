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
