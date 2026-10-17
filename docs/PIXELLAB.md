# Pixelkonst med PixelLab

Mål: byta ut den kodritade grafiken mot snyggare, handgjord-lik pixelart från PixelLab (AI-genererad pixelart med MCP- och REST-API),
steg för steg och utan att spelet någonsin blir sämre än idag. Spelet har redan en bra procedurell grafik; den blir reserv när en sprite saknas.

## Koppla in PixelLab

PixelLab-token får aldrig klistras in i chatten eller sparas i repot.

- **Molnsession (Claude Code på webben):** lägg token som hemlig miljövariabel `PIXELLAB_API_TOKEN` i miljöns inställningar (miljömenyn i sessionens
  titelrad, Edit, Network secrets / miljövariabel). En *ny* session läser den. Då fungerar `node tools/pixellab.mjs balance`
  (REST v2, `https://api.pixellab.ai/v2`, `Authorization: Bearer`). Containern når `api.pixellab.ai`.
- **Lokalt (Claude Code på datorn):** `claude mcp add --transport http pixellab https://api.pixellab.ai/mcp --header "Authorization: Bearer $PIXELLAB_API_TOKEN"`.
  Då finns verktygen direkt (`create_character`, `animate_character`, `create_map_object`, `create_tiles_pro`, `create_ui_asset`, `create_font` m.fl.).
  Token hämtas på https://api.pixellab.ai/mcp. Dokumentation: https://api.pixellab.ai/mcp/docs, REST: https://api.pixellab.ai/v2/llms.txt och
  `openapi.json` på samma adress.
- Skapande är asynkront (jobb, ca 1–5 minuter). Nedladdningslänkar kräver ingen token (UUID är nyckeln). Lägg `?inline=true` på bildlänkar
  vid nedladdning med enkla klienter.

## Regler för generering

1. Kolla `balance` före och efter varje körning och skriv kostnaden per tillgång i `assets/manifest.json`. Börja med billiga lägen och ett prov
   per tillgångstyp. Fråga användaren om en kreditgräns innan större satser (kostnader: standardkaraktär 1, pro 10–25, v3 2–9, mallanimation 1 per
   riktning, objekt 10–25, bilder 1–25, `reduce_colors`/`correct_pixelart`/`unzoom_image` 0,1).
2. En stilguide först: en fast palett (`palette`/`max_colors`, samma `outline`/`shading`/`detail` överallt, samma `seed`-familj och `style_images`)
   så att allt ser ut att höra ihop. Kör sedan `reduce_colors` mot en gemensam palett på allt som sparas.
3. Spara varje tillgång som PNG med transparent bakgrund i `assets/<grupp>/<namn>.png` och beskriv den i `assets/manifest.json`
   (`file`, storlek, ankare, frames, prompt, seed, kostnad, datum). Inga tokens i filer.
4. Spelet använder alltid sprite om den finns, annars den procedurella koden. Mekanismen finns och är testad:
   `build.mjs` bäddar in allt som listas i `assets/manifest.json` som data-URI:er (`virtual:assets`), `src/render/sprites.js` laddar dem vid start och
   `spr()`/`drawSprite()` ritar dem med ankare och spegling. Nycklar: `prop.<funktion>` för möbler och växter (sprites ersätter funktionerna i
   `furniture.js`, `props.js`, `props2.js` som har en `spr(...)`-rad först, ritas vid x och golvlinjen), `veh.car.0|1|2`, `veh.van`, `veh.truck`, `veh.bus`
   för fordon. Flera varianter: `veh.car.1#0`, `veh.car.1#1` (väljs efter färgen). Exempel i manifestet:
   `{ "sprites": { "prop.sofa": { "file": "props/sofa.png", "fw": 41, "fh": 22, "ax": 1, "ay": 22, "frames": 1, "prompt": "...", "seed": 7, "cost": 10 } } }`
   (`fw`/`fh` = en rutas storlek, `frames` = rutor sida vid sida, `ax`/`ay` = ankarpunkt). Måtten att sikta på står i `docs/ASSET_SPECS.md` och bilderna
   av dagens procedurella grafik i `assets/baked/` (bra som `style_images` och som kontroll: lägg en baked-fil i manifestet så ser du exakt samma bild).
   Nya sprite-nycklar för personer, byggnadsdelar och UI kräver en liten kodkrok vardera; lägg dem när tillgångarna finns.
5. Måttstock i scenen (pixelkonstens egna pixlar): en våning är 48 px hög invändigt, en person ca 30 px, en bil 52–60 px lång, bussen 100.
   Sidovy med snitt genom huset, ljus uppifrån vänster. Spegla åt vänster i koden, generera bara en riktning (öster).

## Förslag på ordning och mått

| Steg | Vad | Verktyg | Mått |
|---|---|---|---|
| 1 | Stilguide: en palett, 3–4 provbilder (kontorsrum, person, skrivbord) | `create_image_pixflux` / `create_map_object` | 64–128 px |
| 2 | Möbler och rekvisita: skrivbord med skärmar, stolar, soffor, serverrack, varuautomat, arkadskåp, whiteboard, växter, lampor | `create_map_object`, `create_1_direction_object` | 16–64 px, transparent |
| 3 | Fordon och gata: bilar per epok, skåp, lastbil, buss, träd, lyktstolpar, bänkar | `create_map_object` | 52–100 px breda |
| 4 | Bakgrund: skyline i lager (dag och natt), luftskepp, moln | `create_image_pro` / `pixflux` | 256 px breda remsor |
| 5 | Personer: gå, stå, sitta och skriva, kaffe, prata, presentera, jubla | `create_character` (v3 eller pro), `animate_character` | 48 px duk |
| 6 | Gränssnitt: paneler, ikoner, pixelfont för siffror | `create_ui_asset`, `create_font` | paneler 192+ px, font 8–16 px |
| 7 | Byggnadsnivåerna 0–5 i samma stil som Studiohuset | `create_building_kit`, objekt | efter behov |

Personernas animationer är det svåraste (sittande vid skrivbordet i profil). Prova `animate_character` med egen beskrivning (v3) och jämför
med de procedurella: byt bara om det blir tydligt bättre. Normalkartor (`create_normal_map`, 0,5 kredit) kan ge HD-ljuset riktig relief.
