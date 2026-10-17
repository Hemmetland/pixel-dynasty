// Bakar möbler och fordon till assets/baked/*.png och skriver docs/ASSET_SPECS.md (mått och ankare).
// Körs efter: node build.mjs --with-dev   (kräver playwright-core och en Chromium, se test/scene-shot.mjs)
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('file://' + resolve('dist/dev/bake.html'));
const items = await page.evaluate(() => window.__bake());
await browser.close();
await mkdir('assets/baked', { recursive: true });
const rows = [];
for (const it of items) {
  await writeFile(`assets/baked/${it.name}.png`, Buffer.from(it.png.split(',')[1], 'base64'));
  rows.push(`| \`${it.name}\` | ${it.w}×${it.h} | ${it.ax}, ${it.ay} |`);
}
await writeFile('docs/ASSET_SPECS.md', `# Måttstock för sprites

Genererad av \`tools/bake-sprites.mjs\` från den procedurella grafiken (bilderna finns i \`assets/baked/\`). Använd måtten som mål när du genererar
sprites i PixelLab: samma bredd och höjd, sidovy, transparent bakgrund, ljus uppifrån vänster. Ankaret (ax, ay) är pixeln i sprite som hamnar på
anropets (x, golvlinje); för en sprite som är 30 px bred och står på golvet är ay lika med höjden. Lägg färdiga sprites i \`assets/\` och
beskriv dem i \`assets/manifest.json\` (se docs/PIXELLAB.md).

| Nyckel | Storlek (px) | Ankare (ax, ay) |
|---|---|---|
${rows.join('\n')}
`);
console.log(`bakade ${items.length} sprites`);
