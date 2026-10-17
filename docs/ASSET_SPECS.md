# Måttstock för sprites

Genererad av `tools/bake-sprites.mjs` från den procedurella grafiken (bilderna finns i `assets/baked/`). Använd måtten som mål när du genererar
sprites i PixelLab: samma bredd och höjd, sidovy, transparent bakgrund, ljus uppifrån vänster. Ankaret (ax, ay) är pixeln i sprite som hamnar på
anropets (x, golvlinje); för en sprite som är 30 px bred och står på golvet är ay lika med höjden. Lägg färdiga sprites i `assets/` och
beskriv dem i `assets/manifest.json` (se docs/PIXELLAB.md).

| Nyckel | Storlek (px) | Ankare (ax, ay) |
|---|---|---|
| `prop.chair2` | 13×22 | 2, 22 |
| `prop.desk2` | 29×26 | 0, 26 |
| `prop.sofa` | 41×22 | 1, 22 |
| `prop.beanbag` | 18×11 | 1, 11 |
| `prop.floorLamp` | 19×41 | 9, 41 |
| `prop.fridge` | 17×35 | 1, 35 |
| `prop.kitchenCounter` | 43×45 | 1, 45 |
| `prop.meetingTable` | 44×15 | 0, 15 |
| `prop.receptionDesk` | 41×24 | 1, 24 |
| `prop.rack` | 17×38 | 1, 38 |
| `prop.benchSeat` | 27×9 | 1, 9 |
| `prop.armchair` | 17×17 | 1, 17 |
| `prop.podChair` | 16×21 | 1, 21 |
| `prop.copier` | 21×20 | 1, 20 |
| `prop.boxes` | 16×14 | 1, 14 |
| `prop.waterCooler` | 12×24 | 1, 24 |
| `prop.trashBin` | 6×9 | 0, 9 |
| `prop.umbrellaStand` | 6×13 | 0, 13 |
| `prop.plantFloor` | 18×33 | 4, 33 |
| `prop.plantSmall` | 8×13 | 1, 13 |
| `prop.palm` | 26×44 | 11, 44 |
| `prop.plant` | 8×17 | 0, 17 |
| `prop.bookshelf` | 24×30 | 0, 30 |
| `prop.couch` | 26×15 | 0, 14 |
| `prop.filingCabinet` | 11×18 | 0, 18 |
| `prop.vending` | 14×26 | 0, 26 |
| `veh.car.0` | 52×19 | 0, 17 |
| `veh.car.1` | 56×18 | 0, 16 |
| `veh.car.2` | 60×20 | 0, 18 |
| `veh.van` | 62×25 | 0, 23 |
| `veh.truck` | 86×31 | 0, 29 |
| `veh.bus` | 100×30 | 0, 28 |
