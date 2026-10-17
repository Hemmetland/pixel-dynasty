# PixelLab-tillgångar

AI-genererade pixel art-PNG:er (PixelLab `create_image_pixen`), skapade utifrån `docs/ART_DIRECTION.md`.
Alla med transparent bakgrund utom `backgrounds/`. `manifest.json` listar filerna. Bara `skyline-dusk` och `skyline-night` används i spelet (titelskärmen, via `assets/manifest.json`), se `docs/PIXELLAB.md`.

| Mapp | Innehåll | Storlek |
| --- | --- | --- |
| `props/` | monitor, laptop, plant, coffee-cup, desk-lamp, office-chair, desk, whiteboard, vending-machine, sofa, floor-lamp, side-table, server-rack | 64x64 |
| `characters/` | walk, sit, code, drink-coffee, talk (olika personer, ingen enhetlig karaktär) | 64x64 |
| `backgrounds/` | skyline-dusk, skyline-night, window-view | 512x256 |
| `ui/` | nav-building, nav-team, nav-upgrades, nav-stats, nav-settings, logo-nexus | 32x32 (logo 128x64) |

Kända brister: `logo-nexus` har ogenomtydlig text, och karaktärerna är separata bilder, inte ett pose-ark av samma person.
Pixelfont (`create_font`) är inte genererad.
