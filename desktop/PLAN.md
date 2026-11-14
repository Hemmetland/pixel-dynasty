# Plan: installerbart Pixel Dynasty för testare

## Rekommendation
**Electron** som tunt skal runt `dist/index.html`. Spelet är redan en fristående HTML-fil med canvas, WebAudio och
localStorage, så ingen spelkod behöver ändras. Insats: första fungerande paketering klar (denna gren), ca 1–2 dagar
till färdiga, testade installationsfiler för Windows + Mac via CI.

| Väg | Fördelar | Nackdelar | Insats |
|---|---|---|---|
| **Electron** (vald) | Samma Chromium överallt, så ljud, canvas och WebGL beter sig som i dev. Enkelt bygge, inga nya språk. | ~90 MB per installation. | klar som start |
| Tauri | ~5–10 MB, snabb start. | Kräver Rust. Använder systemets webbvy (WebKit på Mac) så ljud/WebGL kan skilja sig och måste testas. | 2–4 dagar |
| PWA | Ingen installation att signera, uppdateras automatiskt. | Kräver hosting, Safari/iOS-quirks, sparfiler i webbläsaren. | ½ dag |
| Enbart HTML-fil / itch.io | Snabbast att skicka. | Ingen "riktig" installation, localStorage varierar per sökväg. | några timmar |

Tips: ladda även upp samma HTML-build på itch.io (lösenordsskyddad) som reservväg för de som inte vill installera.

## Delar
- **Windows/Mac:** `electron-builder` ger NSIS-installer + zip (Win) och dmg + zip (Mac). Linux AppImage på köpet. GitHub Actions (`.github/workflows/desktop.yml`) bygger alla tre på manuell körning eller `v*`-tagg.
- **Signering:** inte nödvändigt för vänner. Windows: SmartScreen "Mer info › Kör ändå". Mac: högerklick › Öppna första gången. Senare: Apple Developer (99 USD/år) för signering + notarisering, och ev. Azure Trusted Signing/EV-cert för Windows. Gör det först om testgruppen växer.
- **Uppdateringar:** nu skickar du ny installer. Nästa steg `electron-updater` mot GitHub Releases (Mac kräver signering för autouppdatering). Skicka bara via CI-artefakter tills dess.
- **Sparfiler:** ligger kvar i localStorage. Appen laddar spelet via eget `app://game`-ursprung så att saker överlever uppdateringar. Menyn Spel › "Öppna mapp med sparfiler". Spelets egen exportkod/fem sparplatser fungerar oförändrat. Risk: avinstallation med "ta bort data" raderar sparfilerna, så be testare använda exportkoden som backup.
- **Feedback:** menyval "Skicka feedback…" som öppnar ett formulär (Google Forms eller GitHub-issue) när `PD_FEEDBACK_URL` är satt vid bygget. Rekommenderat nästa steg: en knapp i spelmenyn som kopierar en diagnosrad (version, språk, år i spelet, sparkod) till urklipp. Det kräver ändring i `src/ui` och bör gå via spelutvecklingstråden.
- **Offline:** teckensnitten hämtas från Google Fonts och faller tillbaka på systemfont offline. Bundla dem (base64 i bygget) om det spelar roll.
- **Ikon:** saknas, standardikon används. Kan genereras från loggan i `assets/`.
