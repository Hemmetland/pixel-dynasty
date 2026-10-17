# Nivå 5: Dynasti-tornet

Slutmålet: byggnaden som spelaren når runt 2011 och som ska synas på långt håll. Byggd med rumssystemet (`src/render/rooms.js`) som Studiohuset (nivå 3),
men med egen identitet: guld och champagne, djupt marinblått och vit marmor med cyan holografisk neon.

## Kontrakt

- 4 våningar, `L.desks.length === 36` (9 per våning: två utvecklarrum à 5 + 4 skrivbord), `L.slots.length === 12` (3 per våning), `BW 560`, `roofH 64`.
  `Scene.fit` ger skala 1,5 på 1280×720 och 2,5 på 1920×1080.
- All kod ligger i `src/render/tier5*.js`; `building.js` importerar bara `./tier5.js`.

| fil | innehåll |
| --- | --- |
| `tier5.js` | plan per våning, `registerTier(5, …)`, `post(L)` (ljus, animationslistor), registrering av stilar, rum och tak |
| `tier5-rooms.js` | rumsdefinitioner (lobby, styrelserum, skybar, café, serverhall, mocap, åtta utvecklarrum), stilar, anläggningsinredning |
| `tier5-fac.js` | de tolv tomma anläggningsrummen (galleri, ärans hall, gym, prototyp, ljudstudio, arkiv, vinbar, spelhall, trädgård, auditorium, bibliotek, zenrum) |
| `tier5-roof.js` | `registerRoof('crown', …)`: fasad (guldkolonner, bjälklag, portik, balkonger, glashiss, namnskyltar), tak (helikopterplatta, paviljong, namnskylt med krona, kylaggregat, mast, flagga) och `dynamic` (helikopter, fläktar, varningslampor, hiss, ticker, flagga) |
| `tier5-props.js` | material och möbler (marmor, guld, krona, kristallkrona, reception, trofévägg, bord, bar …) |

Våningarna (vänster till höger, anläggningarna fyller högerkanten):

| våning | rum |
| --- | --- |
| 0 | lobby 98 (atrium, trofévägg med `P.trophyShelf`) · produktion 156 · utgivning 126 |
| 1 | programmering 126 · serverhall 56 · mocap 42 · motor & teknik 156 |
| 2 | skybar 68 · art & animation 156 · café 30 · ljud & musik 126 |
| 3 | speldesign 156 · styrelserum 98 · kvalitet 126 |

Beteendet följer `room.type` (`lobby`, `lounge`, `kitchen`, `server`, `whiteboard`, `meeting`, `dev`): skybaren är en `lounge`, caféet ett `kitchen`, mocap-scenen
en `whiteboard` (de som står där "presenterar"), styrelserummet ett `meeting`. En rumstyp får bara förekomma en gång per våning (rummets id är `f<våning>-<typ>`).

## Krokar i rooms.js (additiva, nivå 3 är bytemässigt oförändrad)

- `room.def`: planens extra (`['dev', 156, { def: 'tw_dev0a', name: [sv, en] }]`) pekar ut en egen `DEF[def]` och en egen `ROOM_STYLE[def]`. Beteendet och `layoutV2`
  använder fortfarande `room.type`. `room.name = [sv, en]` ger rummet eget namn på namnskylten (`roomName` är exporterad).
- `T.facility = { room(slot, floor) -> extra, empty(ctx, rx, fy, slot, room), extra(ctx, room, fy, fac) }`: nivåns egna tomma anläggningsrum (tolv varianter)
  och inredning för byggda anläggningar. Utan `T.facility` används `emptySlot` och de sex namnen som förut.
- `T.post(L)`: anropas sist i `layoutV2` så att nivån kan byta ut `L.lights` och `L.anim` (Studiohusets standardvärden sitter på Studiohusets möbelpositioner).
- Lobbyns standardneonskylt ("GOOD IDEAS …") ritas bara för rum utan `def`.
- Rumsdefinitioner kan ha `lights(rx, fy, room)`, `anim(rx, fy, room)` (skärmar, ånga, neon) och `dynamic(A, cx, gy, L, room, t, st)`.

## Taket

Helikoptern är en ren funktion av tiden (`heliState(t)`, period 72 s): borta 30 s, flyger in från vänster, landar, rotorn stannar, väntar, snurrar upp, lyfter och försvinner
åt vänster. Inget `Math.random`. Med minskad rörelse (`scene.reduced`) står den parkerad och stilla. Namnskylten (`opts.name`) väljer skala 3, 2, två rader eller
skala 1 efter namnets längd och har underrubriken "DYNASTI-TORNET" / "DYNASTY TOWER".

## Kontroller

```
node build.mjs --with-dev && node test/statichash.mjs      # nivå 0-4 ska ha oförändrad md5
dist/dev/rooms.html?tier=5&zoom=3&people=1&fac=all&stations=1&time=33   (time = sekunder för animationerna, t.ex. helikoptern)
NOHUD=1 node test/scene-shot.mjs .shots/t5 1280 720 5 0.93 clear 1 2012
TIER=5 REQUIRE=meeting,coffee,lounge,server,board,pair,fac node test/behavior.mjs 900 1   # och frö 2
```
