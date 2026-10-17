# Promptpaket för PixelLab (första omgången: möbler och fordon)

Gör det här i en session som har PixelLab (lokal Claude Code med MCP, eller en molnsession där `PIXELLAB_API_TOKEN` finns, se `docs/PIXELLAB.md`).
Mått och ankare står i `docs/ASSET_SPECS.md`, dagens procedurella bilder i `assets/baked/<nyckel>.png` (använd dem som `style_images`/referens).

## Stilblock (sätts först i varje prompt)

> pixel art, side view, flat orthographic with no perspective, transparent background, soft cel shading with one highlight and one shadow tone,
> light from the top left, thin darker outline in the same hue, limited palette, cozy modern game-studio office, clean readable silhouette

Samma `outline`/`shading`/`detail`-inställningar och en gemensam palett (`palette`/`max_colors`, sedan `reduce_colors`) för alla. Spara varje resultat
som `assets/props/<namn>.png` eller `assets/vehicles/<namn>.png`, lägg en rad i `assets/manifest.json` (nyckel, `fw`, `fh`, `ax`, `ay`, prompt, seed, kostnad).
Små föremål (under 24 px) genereras på 32 px och görs mindre med `unzoom_image`/`reduce_colors` (0,1 kredit). Börja med tre föremål, titta, och kör sedan resten.

## Möbler och växter (`prop.<namn>`)

| Nyckel | Storlek | Beskrivning att lägga efter stilblocket |
|---|---|---|
| `prop.desk2` | 29×26 | office desk seen from the side with two monitors, keyboard and a mug, light wood top, drawer unit under it |
| `prop.chair2` | 13×22 | office swivel chair, dark blue fabric, five-star base on small wheels |
| `prop.sofa` | 41×22 | two-seat green sofa with one yellow cushion |
| `prop.couch` | 26×15 | small blue couch |
| `prop.armchair` | 17×17 | orange armchair |
| `prop.beanbag` | 18×11 | orange bean bag |
| `prop.podChair` | 16×21 | purple egg-shaped pod chair with a light cushion |
| `prop.benchSeat` | 27×9 | low orange padded bench |
| `prop.floorLamp` | 19×41 | tall floor lamp with a warm yellow shade |
| `prop.fridge` | 17×35 | silver office fridge with a few sticky notes |
| `prop.kitchenCounter` | 43×45 | teal kitchen counter with sink, espresso machine on top and wall cabinet |
| `prop.meetingTable` | 44×15 | long conference table with two laptops |
| `prop.receptionDesk` | 41×24 | modern reception desk with a small glowing logo plate |
| `prop.rack` | 17×38 | black server rack with rows of blinking blue and green LEDs |
| `prop.copier` | 21×20 | office copier with a small screen |
| `prop.boxes` | 16×14 | stack of cardboard boxes |
| `prop.waterCooler` | 12×24 | water cooler with a blue bottle |
| `prop.trashBin` | 6×9 | small grey waste bin |
| `prop.umbrellaStand` | 6×13 | umbrella stand with a red umbrella |
| `prop.filingCabinet` | 11×18 | grey metal filing cabinet |
| `prop.vending` | 14×26 | red vending machine with a grid of snacks |
| `prop.bookshelf` | 24×30 | wooden bookshelf full of colourful books and a plant |
| `prop.plantFloor` | 18×33 | large leafy plant in a dark pot |
| `prop.plantSmall` | 8×13 | small plant in an orange pot |
| `prop.plant` | 8×17 | tall thin plant in a small pot |
| `prop.palm` | 26×44 | indoor palm tree in a pot |

## Fordon (`veh.<typ>`, vända åt höger, spelet speglar själv)

| Nyckel | Storlek | Beskrivning |
|---|---|---|
| `veh.car.0` | 52×19 | 1980s boxy red hatchback, hubcaps, small headlights, driver silhouette in the window |
| `veh.car.1` | 56×18 | 1990s rounded blue sedan |
| `veh.car.2` | 60×20 | 2000s yellow crossover with sleek roofline |
| `veh.van` | 62×25 | green delivery van with a small logo on the side |
| `veh.truck` | 86×31 | box truck, white cargo box with a red stripe and a red cab, exhaust stack behind the cab |
| `veh.bus` | 100×30 | yellow city bus with red stripe, row of windows with passengers, destination sign |

Flera färger: generera extra varianter och döp dem `veh.car.1#0`, `veh.car.1#1`, ... (spelet väljer efter bilens färg).

## Nästa omgångar (se docs/PIXELLAB.md)
Skyline-remsor (dag och natt) och luftskepp, personer med animationer, gränssnittspaneler och pixelfont, byggnadsdelar och de övriga nivåerna.
