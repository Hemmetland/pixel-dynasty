import { STRINGS } from '../data/strings.js';

export let lang = 'sv';
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'sv';
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
export function detectLang() {
  try {
    const n = (navigator.language || 'sv').toLowerCase();
    return n.startsWith('sv') || n.startsWith('nb') || n.startsWith('da') || n.startsWith('no') ? 'sv' : 'en';
  } catch {
    return 'sv';
  }
}
// Välj språk ur ett {sv,en}-objekt (eller returnera strängen som den är).
export function L(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return o[lang] ?? o.en ?? o.sv ?? '';
}
function fill(s, vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}
export function t(key, vars) {
  const e = STRINGS[key];
  if (!e) return key;
  return fill(lang === 'en' ? e[1] : e[0], vars);
}
// Fyll {var} i ett {sv,en}-objekt.
export const Lf = (o, vars) => fill(L(o), vars);
