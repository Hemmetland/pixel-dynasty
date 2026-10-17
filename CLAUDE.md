# Pixel Dynasty

A studio tycoon in vanilla JavaScript (ES modules), canvas pixel art and HTML/CSS UI, bundled by esbuild into one HTML file.
Standalone repository (it started as the `game/` folder of Hemmetland/budgetverktyg and was split out with its history).

## Commands
- `npm install` once. `npm run build` writes `dist/index.html` (standalone) and `dist/artifact.html` (fragment). `npm run watch` rebuilds on save.
- `node build.mjs --with-dev` also builds the test pages in `src/dev/` to `dist/dev/`.
- `npm run lint`, `npm test` (sim API tests), `npm run pacing` (progression measured with bots; also `node test/sim.mjs -v`).
- UI tests drive Chromium through playwright-core (`test/drive.mjs`, `soak.mjs`, `scene-shot.mjs`, `shot.mjs`). They expect Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (cloud path). Locally edit that path in the scripts or set it to your Chrome/Chromium.
- `dist/` is committed so the game can be opened without a build; rebuild before committing source changes.

## Layout
- `src/sim/` pure game rules (no DOM, seeded RNG in `G.rng`). `src/data/` content tables and all strings (`strings.js`, Swedish + English pairs).
- `src/render/` scene drawing (building, people, vehicles, world, props), `src/render/gl/` optional WebGL HD lighting (setting `hd`).
- `src/ui/` HUD, windows, prompts. `src/audio/` WebAudio synth sfx and music. `src/lab/` the lighting comparison page.
- `docs/PIXELLAB.md` how to generate and integrate pixel art assets. `tools/pixellab.mjs` small REST client.
- `docs/ART_DIRECTION.md` the visual target (user's reference image described in text). `docs/STUDIO_V2_SPEC.md` layout, look and HUD contracts.

## Rules
- Graphics are procedural by default. Sprites from PixelLab may live in `assets/` (see `docs/PIXELLAB.md`) and always need a procedural fallback; no other image or audio files and no runtime dependencies. All visible text goes through `t()` in both languages.
- Never put API tokens in files or chat. PixelLab uses `PIXELLAB_API_TOKEN` from the environment (`node tools/pixellab.mjs balance`).
- Keep `src/sim` free of DOM and keep results deterministic per seed; old saves (localStorage `pixel-dynasty-save-v1`) must keep loading.
- Before finishing a change: `npm run lint`, `npm test`, `node test/keys.mjs --missing` (18 known dynamic prefixes), rebuild.
