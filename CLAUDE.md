# Pixel Dynasty (game/)

A studio tycoon in vanilla JavaScript (ES modules), canvas pixel art and HTML/CSS UI, bundled by esbuild into one HTML file.
This folder is independent of the Next.js budget app in the repo root; ignore the root Next.js notes when working here.

## Commands (run in game/)
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
- `docs/ART_DIRECTION.md` the visual target (user's reference image described in text). `docs/STUDIO_V2_SPEC.md` layout, look and HUD contracts.

## Rules
- Everything is procedural: no image or audio files (exception: the PixelLab PNGs in `assets/pixellab/`, not yet used by the build) and no runtime dependencies. All visible text goes through `t()` in both languages.
- Keep `src/sim` free of DOM and keep results deterministic per seed; old saves (localStorage `pixel-dynasty-save-v1`) must keep loading.
- Before finishing a change: `npm run lint`, `npm test`, `node test/keys.mjs --missing` (18 known dynamic prefixes), rebuild.
