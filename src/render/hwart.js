// Hårdvarans bilder: modell (64 px) och ikon (32 px) per produkttyp, generation och utseende.
// Generationen följer lanseringsåret, utseendet är stabilt per produkt. Nycklarna finns i assets/manifest.json
// (hw.<typ>.g<N>#<S> och ui.hw.<typ>.g<N>#<S>); saknas en bild används den äldre ikonen ui.hw.<typ> eller linjeikonen.
// Årtalen är första året för generation 2, 3 och så vidare (generation 1 gäller från början).
const GEN_FROM = { sound: [1996, 2003], gpu: [2001, 2010, 2019], pc: [2004, 2012, 2020], cpu: [2005, 2014, 2022], handheld: [2010, 2018], console: [2012, 2020], vr: [2020, 2027] };
export const hwGen = (type, year) => 1 + (GEN_FROM[type] || []).filter((y) => year >= y).length;
export const hwLook = (id) => (Math.abs(id | 0) % 3) + 1;
// ui = true ger ikonens nyckel, annars modellens
export const hwArtKey = (type, year, id, ui = false) => `${ui ? 'ui.' : ''}hw.${type}.g${hwGen(type, year)}#${hwLook(id)}`;
