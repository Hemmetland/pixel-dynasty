# Pixel Dynasty

A studio tycoon in vanilla JavaScript (ES modules), canvas pixel art and HTML/CSS UI, bundled by esbuild into one HTML file.
Standalone repository (it started as the `game/` folder of Hemmetland/budgetverktyg and was split out with its history).

## Commands
- `npm install` once. `npm run build` writes `dist/index.html` (standalone) and `dist/artifact.html` (fragment). `npm run watch` rebuilds on save.
- `node build.mjs --with-dev` also builds the test pages in `src/dev/` to `dist/dev/`.
- `npm run lint`, `npm test` (sim API and music tests), `npm run pacing` (progression measured with bots; also `node test/sim.mjs -v`). `PROMPTDBG=1` / `NEWSDBG=1` with `test/sim.mjs` count how often the game stops for the player and how many toasts come per year; `--dump=file` writes the finished game as a save.
- UI tests drive Chromium through playwright-core (`test/drive.mjs`, `soak.mjs`, `slots.mjs`, `scene-shot.mjs`, `shot.mjs`). They expect Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (cloud path). Locally edit that path in the scripts or set it to your Chrome/Chromium.
- `dist/` is committed so the game can be opened without a build; rebuild before committing source changes.
- Dev console for playtesting (`src/ui/devconsole.js`, `test/devconsole.mjs`): hidden by default; type `fuskkod` on the keyboard (outside text fields), paste it in the settings code box, or open the game with `?dev`. A red DEV flag appears at the left edge; backquote or § opens the console (it pauses the game), `help` lists commands (`money 5m`, `skip 2y auto`, `date 1995`, `research all`, `license all`, `event <id>`, `news warn`, `god`, `get`/`set`/`js`, ...). Any command that changes the game marks it `G.flags.cheat` and `recordRun` then keeps it out of the studio hall.
- **Builds for other people (packaging, sharing) must use `npm run build:release`** (`node build.mjs --release`): it swaps the console module for an empty stub, so neither the console nor the code ships (check: `grep -c fuskkod dist/index.html` is 0). The plain build keeps the console, so the committed `dist/` and the playtest Artifact have it. Rebuild plainly afterwards.

## Layout
- `src/sim/` pure game rules (no DOM, seeded RNG in `G.rng`). `src/data/` content tables and all strings (`strings.js`, Swedish + English pairs).
- `src/render/` scene drawing (building, people, vehicles, world, props), `src/render/gl/` optional WebGL HD lighting (setting `hd`).
- `src/ui/` HUD, windows, prompts. `src/audio/` WebAudio synth sfx and music. `src/lab/` the lighting comparison page.
- `docs/PIXELLAB.md` how to generate and integrate pixel art assets. `tools/pixellab.mjs` small REST client.
- `docs/ART_DIRECTION.md` the visual target (user's reference image described in text). `docs/STUDIO_V2_SPEC.md` layout, look and HUD contracts.

## Rules
- Graphics are procedural by default. Sprites from PixelLab may live in `assets/` (see `docs/PIXELLAB.md`) and always need a procedural fallback; no other image or audio files and no runtime dependencies. All visible text goes through `t()` in both languages. The dev console is the one exception (its own sv/en helper `L()`): it is a developer tool and not part of the release build.
- Never put API tokens in files or chat. PixelLab uses `PIXELLAB_API_TOKEN` from the environment (`node tools/pixellab.mjs balance`).
- Keep `src/sim` free of DOM and keep results deterministic per seed; old saves (localStorage `pixel-dynasty-save-v1`) must keep loading.
- Before finishing a change: `npm run lint`, `npm test`, `node test/keys.mjs --missing` (should report 0; new dynamic prefixes go in its DYN list), rebuild.
