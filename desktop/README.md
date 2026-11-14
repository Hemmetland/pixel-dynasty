# Skrivbordsversion (Electron)

Ett tunt skal runt `dist/index.html`. Ingen spelkod ändras. Sparfiler ligger kvar i `localStorage` (Chromiums
profilmapp, se menyn Spel › Öppna mapp med sparfiler).

```
npm run build            # i repots rot: bygger dist/index.html
cd desktop && npm install
npm start                # kör spelet i ett fönster
npm run dist:win         # eller dist:mac / dist:linux, resultat i desktop/release/
```

Sätt `PD_FEEDBACK_URL` (formulär eller GitHub-issue-länk) när du bygger/kör för att få menyvalet "Skicka feedback…".
Byggena är osignerade: Windows visar SmartScreen ("Mer info › Kör ändå"), Mac kräver högerklick › Öppna första gången.
Teckensnitten hämtas från Google Fonts och faller tillbaka på systemets när datorn är offline.
