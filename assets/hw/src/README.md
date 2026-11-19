# Ritkoden för hårdvarumodellerna

Bilderna i `assets/hw/<typ>/` är handritade i kod (Python 3 + Pillow, inga andra beroenden). Här ligger koden så att en ny generation
eller ett nytt utseende kan göras utan att börja om.

- `lib/hwlib.py`: delad palett (`PAL`, rampfärger per material och per produkttyp), `Canvas` med lådor, ellipser, ramper och
  kantfärg, `finish()` (1 px mörk kontur och ljuskant uppe till vänster), `place()` (centrering, nedersta rad 59), `sheet()`.
- `lib/STYLE.md`: konventionerna (vy, ljus, marginaler, teman).
- `lib/qa.py`: `python3 lib/qa.py <typ> --gens 1,2,3,4` kontrollerar storlek, hård alfa, kontur, ensamma pixlar, färgantal och att
  utseendena delar silhuett. (Standard är bara generation 1 till 3.)
- `src/<typ>.py`: en funktion per generation och bild (`gN_model`, `gN_icon`), körda med tre teman. `python3 src/<typ>.py` bygger
  allt och en kontaktbild; `python3 src/<typ>.py gN` bygger en generation.
- `mk_leverans.py`: bygger avsnittet i `assets/LEVERANS.md` ur en JSON-fil.

Utvecklingsförhandsvisningar (`gN`-argumentet) skrivs till `prev/`, skapa den mappen först.
Skripten skriver till `out/<typ>/` bredvid `lib/` och `src/`. Kopiera resultatet till `assets/hw/<typ>/`.
