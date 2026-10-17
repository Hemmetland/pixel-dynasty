# Granskning av första PixelLab-satsen

Granskad 2026-10-17 mot `docs/ART_DIRECTION.md` och, på grenen `claude/pixel-dynasty-prototype`, `docs/ASSET_SPECS.md`,
`docs/PIXELLAB_PROMPTS.md` och `docs/PIXELLAB.md`. Scenen är en rak sidovy med 48 px per våning och personer på ungefär 30 px.
Alla bilder i första satsen är 64x64 eller större och nästan alla är ritade snett ovanifrån, så de flesta passar inte i scenen.

Gemensamt för satsen: 21–217 färger per bild (de procedurella spritarna i `assets/baked/` har 6–30), nästan svarta konturer
som försvinner mot spelets mörka bakgrunder, och ingen gemensam palett. Allt som behålls ska köras genom `reduce_colors`
mot en gemensam palett (PIXELLAB.md regel 2).

## Rekvisita (`props/`)

| Fil | Beslut | Varför | Användning |
| --- | --- | --- | --- |
| `floor-lamp.png` | Handrättas | Rak framvy, passar. Nedskalade versionen har 125 färger och svart kontur. | `prop.floorLamp` (redan inkopplad). Färgreducerad till 13 färger i patchen. |
| `plant.png` | Handrättas | Passar efter nedskalning. | `prop.plantFloor` (redan inkopplad). Blad och kruka färgreduceras var för sig (13 färger). |
| `coffee-cup.png` | Handrättas | Snett ovanifrån, men läsbar som ikon i 32 px. | Möjlig ikon för Kaffehörnan i studiofönstret (`ui.fac.coffee`), ingen kodkrok finns än. |
| `desk.png` | Görs om | Snett ovanifrån, saknar skärmar och tangentbord, mättat orange trä. | `prop.desk2` 29x26 |
| `office-chair.png` | Görs om | Sitsen syns ovanifrån. | `prop.chair2` 13x22 |
| `server-rack.png` | Görs om | Front plus sidovägg i perspektiv. | `prop.rack` 17x38 |
| `sofa.png` | Görs om | Sitsdjupet syns ovanifrån. | `prop.sofa` 41x22 (och `prop.couch` 26x15) |
| `vending-machine.png` | Görs om | Front plus sidovägg i perspektiv. | `prop.vending` 14x26 |
| `desk-lamp.png` | Används inte | En hel vinjett med bord och böcker, beskuren i kanten. | – |
| `laptop.png` | Används inte | Snett vriden, skärmen är brus. | – |
| `monitor.png` | Används inte | Ingen nyckel i måttstocken, skärmen är brus. | – |
| `side-table.png` | Används inte | Inget sidobord i scenen. | – |
| `whiteboard.png` | Används inte | Snedställd, ingen nyckel i måttstocken. | – |

Att göra om de fem möblerna med `create_map_object` kostar ungefär 10 krediter styck, alltså runt 50 totalt. Det ryms inte
i provkontot (ungefär 5 kvar). Föremål under 24 px i någon led (stol, varuautomat, rack, soffa, couch) genereras dubbelt så
stora och krymps med `unzoom_image`. Ankaret för `prop.couch` är 0,14. Färdiga promptar finns längst ner.

## Karaktärer (`characters/`)

De fem första bilderna var olika personer i porträttstil och är ersatta av karaktären i `characters/dev/` (sidovy, se README).
Kvar att göra enligt README: sitta, prata och en tydligare mugg och laptop.

## Bakgrunder (`backgrounds/`)

| Fil | Beslut | Varför |
| --- | --- | --- |
| `skyline-dusk.png` | Handrättas | Används på titelskärmen. Två schackrutade ditherband i himlen blir hårda steg. Ljuset kommer från horisonten, godtagbart på titelskärmen. |
| `skyline-night.png` | Handrättas | Används på titelskärmen. Skyltarnas låtsasbokstäver tas bort (text i bild går inte att översätta), ett ditherband och fem randiga ljuspelare målas bort. |
| `window-view.png` | Används inte | Interiörbild i annan skala. Rummens fönster är 15–26 px hål som visar den levande himlen. |

Spelets himmel byter med tiden på dygnet och ritas i kod. Vill man ha skylineremsor i spelet behövs först rader för `bg.*` i
`ASSET_SPECS.md` (256 px breda remsor med genomskinlig himmel).

## Gränssnitt (`ui/`)

| Fil | Beslut | Varför |
| --- | --- | --- |
| `nav-stats.png` | Handrättas | Den enda som passar i dockan: färgreduceras, får rak baslinje och blir Marknad. |
| `logo-nexus.png` | Handrättad | Texten ritad för hand. Bara märket används i spelet. |
| `nav-building.png` | Används inte | Föreställer ett ansikte, inte en byggnad. |
| `nav-team.png` | Används inte | En hel skrivbordsscen, oläslig i 32 px. |
| `nav-upgrades.png` | Används inte | En pil, men Forskning är en kolv överallt annars i spelet. |
| `nav-settings.png` | Används inte | Dockan har ingen inställningsknapp. |

Dockan har åtta knappar. Eftersom bara en PixelLab-ikon dög är hela uppsättningen ritad för hand pixel för pixel (se `assets/ui/`).
Ett märke som `ui.logo` utan varianter skulle ersätta spelarens val av logga, så det kopplas bara in med en variant per val.
Nya ikonpromptar ska inte innehålla stilblockets "side view" och "cozy modern game-studio office".

## Promptar för nästa omgång rekvisita

Stilblocket från `PIXELLAB_PROMPTS.md` först, sedan beskrivningen. Kontrollera storleken mot `ASSET_SPECS.md` innan körning.

```text
### prop.desk2 29x26
create_map_object (view: side; same outline/shading/detail as every prop; style_images: assets/baked/prop.desk2.png; then reduce_colors to the shared palette; check column 15 rows 1-10 by hand afterwards)
pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone, light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette, office desk seen from the side with two monitors, keyboard and a mug, light wood top, drawer unit under it. Strict side elevation: the desktop is only a thin light-wood front edge (#f6ead0 over #ecdcb8) about halfway up, no top surface and no side face visible; thin dark metal legs (#2a2f3c); a light-wood drawer unit with two drawers (#b8a07a, shadow #a88a62) under the right half; a dark PC tower (#262b3a) with one cyan LED under the left half; keyboard and white mouse as thin lines on the desk edge; one monitor in exact profile as a narrow dark bar in the middle of the desk reaching the top of the image; a second monitor facing the viewer on the right with a dark screen (#10202a) and a thin blue-grey frame (#4a5470); a small white mug at the far right; legs touch the bottom edge, nothing cut off

### prop.chair2 13x22
create_map_object (view: side; style_images: assets/baked/prop.chair2.png; generate on a 26x44 canvas, then unzoom_image 2x to 13x22, then reduce_colors). Under 24 px, so per PIXELLAB_PROMPTS it is generated larger; an integer 2x factor keeps the pixel grid clean.
pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone, light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette, office swivel chair, dark blue fabric, five-star base on small wheels. Strict profile facing right: tall upright backrest on the left side, seat cushion sticking out to the right at knee height, one grey gas-lift column in the middle, the five-star base reads as one flat grey bar with a small wheel at each end, no armrests, no headrest, seat not seen from above; fabric #3a4a6a with highlight #758097 and shadow #263045, metal #6a7488; wheels touch the bottom edge

### prop.rack 17x38
create_map_object (view: side; style_images: assets/baked/prop.rack.png; then reduce_colors)
pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone, light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette, black server rack with rows of blinking blue and green LEDs. Pure front elevation of a tall narrow cabinet, no side panel, no open door, no cables; eight stacked server units separated by thin dark gaps, each unit with a row of tiny vent dots and one or two single-pixel LEDs in cyan #4de1ff and green #6cc86a near the right edge; body #151824, units #1f2638 and #2a3350, thin highlight #323c5a on the top and left edge, dark #0a0c12 right edge and plinth; cold blue server-room mood; stands on the bottom edge

### prop.sofa 41x22
create_map_object (view: side; style_images: assets/baked/prop.sofa.png; then reduce_colors)
pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone, light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette, two-seat green sofa with one yellow cushion. Pure front elevation: backrest and seat are flat horizontal bands with no visible seat depth and no side face, two seat cushions split by one darker seam, low rounded armrests of equal height at both ends, four short dark feet on the bottom edge, one square yellow throw cushion (#f2c84a) leaning on the left seat; green body #3a9a5a, highlights #52a66e and #75b88c on the top edges, shadow #235c36 under the seat; fills the full width

### prop.vending 14x26
create_map_object (view: side; style_images: assets/baked/prop.vending.png; generate on a 28x52 canvas, then unzoom_image 2x to 14x26, then reduce_colors)
pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone, light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette, red vending machine with a grid of snacks. Pure front elevation, upright rectangular cabinet with square corners, not rounded and not a jukebox, no side panel; dark glass window (#10202a) over the upper two thirds on the left with three columns and four rows of single-colour snack packs (blue #4a90e0, green #6cc86a, pink #e86aa8, yellow #f2c84a); narrow dark coin and button strip on the right; black pickup slot near the bottom; red body #e8504a with highlight #ff8a7a on the top-left edge; stands on the bottom edge

```
