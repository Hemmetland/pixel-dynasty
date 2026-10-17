# PixelLab-tillgångar

AI-genererade pixel art-PNG:er (PixelLab `create_image_pixen`), skapade utifrån `docs/ART_DIRECTION.md`.
Alla med transparent bakgrund utom `backgrounds/`. `manifest.json` listar filerna. Ingår ännu inte i bygget; spelet ritar fortfarande allt i kod.

| Mapp | Innehåll | Storlek |
| --- | --- | --- |
| `props/` | monitor, laptop, plant, coffee-cup, desk-lamp, office-chair, desk, whiteboard, vending-machine, sofa, floor-lamp, side-table, server-rack | 64x64 |
| `characters/dev/` | En karaktär i sidovy (PixelLab character `77053f90-3b11-436b-b138-007764add86e`): `south/east/north/west.png` (92x92) och animationerna `walk-east/` (6 bilder), `drink-coffee-east/` (6), `type-code-east/` (5, 104x104). `east` är profil mot höger, spegla för vänster. | 92x92 |
| `backgrounds/` | skyline-dusk, skyline-night, window-view | 512x256 |
| `ui/` | nav-building, nav-team, nav-upgrades, nav-stats, nav-settings, logo-nexus | 32x32 (logo 128x64) |

Kända brister: `logo-nexus` har ogenomtydlig text, `type-code-east` rör sig knappt och saknar laptop, och `drink-coffee-east` saknar tydlig mugg. Poserna sitta och prata finns inte.
Pixelfont (`create_font`) är inte genererad.
