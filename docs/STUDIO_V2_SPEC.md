# Studiohuset v2: specifikation för visningsexemplaret

Läs först `docs/ART_DIRECTION.md` (användarens referensbild och önskemål). Det här dokumentet är kontraktet mellan de delar
som byggs parallellt: rum/byggnad, karaktärer, gränssnitt och beteende/ljus. Alla ritas i kod (inga externa bildfiler).
Spelmekaniken (`src/sim/`) ändras inte, utom att nya utseendefält för personer får finnas.

**Mål:** nivå 3, "Studiohuset" (`tier === 3`), ska se ut som referensbilden: flera rum per våning, takträdgård, neon,
levande människor, mycket växter och detaljer, och ett nytt gränssnitt. Övriga nivåer (0, 1, 2, 4, 5) fortsätter fungera
oförändrade men ska kunna byggas om med samma system senare, så håll koden återanvändbar och datadriven.

## 1. Layout-kontrakt (`src/render/building.js`)

`makeLayout(tier)` returnerar redan `{ tier, BW, IW, left, floors, desks[], slots[], sp, roofH, H, W, topY, roof }`.
För nivå 3 (kallas "v2") gäller dessutom:

- `L.v2 = true`, `L.pitch` (avstånd mellan golv, standard `PITCH`=44), `L.intH` (invändig takhöjd, standard `INT_H`=40).
  **Alla** ställen som använder `PITCH`/`INT_H` ska använda `L.pitch ?? PITCH` / `L.intH ?? INT_H` (scene.js, gl/scene-gl.js, building.js).
  Föreslagna mått för v2: `pitch 54`, `intH 48`, `BW` ca 424 (högst 440), takträdgård högst 44 px hög, tre våningar. Då väljer
  `Scene.fit()` skala 2 på 1280×720 och 3 på 1920×1080.
- `L.rooms[]`: `{ id, type, floor, x0, x1, light:[r,g,b], wall }` med x i layoutkoordinater (relativt husets mitt, som `desks[].x`).
  Typer: `lobby`, `dev`, `meeting`, `kitchen`, `lounge`, `server`, `whiteboard`, `facility` (platser där anläggningar byggs).
- `L.stations[]`: `{ id, kind, room, floor, x, fy, dir, pose }` med `kind` i `seat`, `stand`, `sofa`, `coffee`, `board`, `rack`,
  `reception`, `window`. Beteendekoden (Scene) använder dessa för aktiviteter; rummen definierar dem.
- `L.lights[]`: statiska ljuskällor `{ x, y, r, i, c:[r,g,b], kind }` (x relativt husets mitt, y relativt marken/gy, negativt uppåt)
  för pendellampor, rumsljus, neon och golvlampor. `kind` är samma som i `gl/scene-gl.js` (0 = innelampa inom sin våning, 1 = punkt, 2 = skärm).
- Behåll `desks[]` (15 för nivå 3, `{ x, fy, floor, idx, sp }`) och `slots[]` (6, `{ x, w, fy, floor, idx }`) med samma betydelse,
  så att befintlig spellogik och anläggningar (kaffehörna, labb, QA, utbildning, spelrum, marknad, server) fortsätter fungera.
  Anläggningar får gärna ritas snyggare men ska synas i sin `slot`.
- Rooftop: `roof: 'garden'` (häckar/träd i odlingslådor, ljusslinga, räcke, ventilation/vattentank, loungestolar, skylt med studions namn).

Rumsidén per våning (förslag, rummen får justeras): bottenvåning = lobby med glasentré och reception + lounge; våning 2 = mötesrum
(stor skärm, whiteboard, bord) + öppet kontor + fikarum; våning 3 = utvecklarrum + serverrum (blå racks med blinkande dioder) +
whiteboardrum med klisterlappar. Mellanväggar med dörröppningar, glaspartier, olika väggfärger och rumsljus. Neonlinjer längs
golvplan, neonskylt på fasaden, murgröna längs husets kant, växter och inramade bilder överallt.

## 2. Personer (`src/render/people.js`, `src/sim/people.js`)

Utseendeobjektet `look` är idag `{ skin, hair, hairColor, shirt, pants, acc }`. Nya valfria fält (saknas de, räknas de som 0, så gamla sparfiler
fungerar): `hat` (0 ingen, 1 luva, 2 keps, 3 pannband), `glasses` (0–3), `beard` (0–2), `headphones` (0/1), `backpack` (0/1),
`hoodie` (0/1), `pattern` (0 enfärgad, 1 ränder, 2 logga, 3 rutig). Nyskapade kandidater och studiogrundaren får slumpade fält via
`makeCandidate`; sim-slumpen (`G.rng`) används på samma sätt som idag så att körningar med samma seed förblir jämförbara där det går.
Poser (befintliga: `sit sitIdle stand walk cheer drink read sleep think`) utökas med minst: `type` (snabbare skrivande med händerna i rörelse),
`talk` (gester, stannar i mun/hand), `present` (pekar mot tavla), `laptop` (går med laptop), `tired` (gäspning/sänkt huvud), `wave`.
Varje pose har 2–4 ruter. Personerna ska se tydligt olika ut på avstånd (siluett, hår, accessoar, tröjfärg).

## 3. Beteende och ljus (`src/render/scene.js`, `src/render/gl/scene-gl.js`)

- Aktörerna använder `L.stations`: möten (3–5 går till mötesrummet och sitter/står, `talk`/`present`), kaffe i fikarummet, lounge (två vid soffan,
  `talk`), serverbesök (står vid rack med laptop), whiteboard (pekar), parprogrammering (två vid samma skrivbord) och pauser. Under pågående
  utveckling sitter de flesta vid skrivbordet och `type`:ar. Gå bara på sin egen våning (trappa/hiss är valfritt).
- Små serier med pratbubblor/emotes ovanför huvudet (utropstecken, fråga, hjärta, glödlampa, kaffe, svett, zzz) med låg frekvens.
- HD-ljuset (`gl/scene-gl.js`) läser `L.lights`, lägger rumsfärger, neon (ljusa mättade pixlar glöder redan via bloom) och golvlampor.
  Canvas-läget (utan WebGL) ska också se bra ut: rumsljus ritas enkelt additivt.

## 4. Gränssnitt (`src/ui/hud.js`, `src/ui/app.js`, `src/style.css`, `src/data/strings.js`)

Referensens glaspaneler, uppbyggda av riktigt spelstate (inget påhittat):
- **Studiopanel** uppe till höger under de befintliga pengar/forskning/fans-brickorna: studiologotyp + namn, `Team x/y` (personal/skrivbord),
  `Projekt %` (pågående spels totala framsteg), `Resurser` (pengar) och `Mål x/y` (t.ex. nästa kontors krav eller prestationer, välj något meningsfullt och förklara det i en tooltip).
- **Pågående uppgifter**: upp till tre rader med turkosa framstegsstaplar: pågående spelfas, forskning, marknadsföring eller uppdrag.
- **Klockpanel** nere till höger: dag/tid (spelets datum/tid) och väder- eller dag/natt-ikon. Navigeringsfältet (dockan) behåller sina funktioner men
  får referensens stil om det passar. Sv + en. Mobil (≤760 px): kompaktera eller dölj panelerna så att scenen syns. Stäng/minimera ska gå.

## 5. Kvalitetskrav och verktyg

- Jämför mot referensbeskrivningen (`ART_DIRECTION.md`) dag, skymning och natt, med och utan HD-ljus (`gl=1`).
- `node build.mjs --with-dev` bygger även `dist/dev/*.html` (egna testsidor i `src/dev/`). `node test/scene-shot.mjs` tar skärmdumpar av scenen
  (se skriptet för parametrar). Kör `npm install` för playwright-core och eslint.
- Kör `npx eslint src test build.mjs`, `node test/features.mjs`, `node test/keys.mjs --missing` (de 18 dynamiska prefixen är kända), och bygg innan du
  lämnar in. Inga konsolfel. Prestanda: höll sig scenens ritning under ca 16 ms/bildruta för skärm 1080p utan WebGL; nya detaljer ska ritas i
  det statiska lagret (`buildStatics`) när de inte rör sig.
- Allt som är synligt ska fungera på svenska och engelska, och på mobil (≤760 px).
