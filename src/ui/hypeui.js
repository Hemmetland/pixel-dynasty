// Förväntan utan tak: hur den rör sig just nu och vad Snacket består av, till rutan, utvecklingspanelen och mässans resultat.
import { t } from './core.js';
import { lang } from '../core/i18n.js';
import { hypeBreakdown, hypeDrift } from '../sim/hype.js';

const dec = (v) => {
  const s = (Math.round(Math.abs(v) * 10) / 10).toFixed(1);
  return lang === 'sv' ? s.replace('.', ',') : s;
};
const signed = (v) => (v < 0 ? '−' : '+') + dec(v);
const SRC = ['rep', 'demo', 'stage', 'trailer', 'celeb', 'prize', 'press', 'dir', 'fade'];
const srcName = (k) => (SRC.includes(k) ? t('hy.src.' + k) : k);

// Pilen vid siffran: växer märkbart eller faller (den sakta nedgången av sig själv visas inte)
export function hypeArrow(G, J) {
  const d = hypeDrift(G, J);
  return d >= 0.1 ? 'up' : d <= -0.6 ? 'down' : '';
}
export function hypeRateText(G, J) {
  const d = hypeDrift(G, J);
  if (Math.abs(d) < 0.05) return t('hy.rateFlat');
  return t(d > 0 ? 'hy.rateUp' : 'hy.rateDown', { n: dec(d) });
}
// Raderna: varje del av Snacket i procent i veckan, och sist hur mycket tiden drar ner
export function hypePartsHTML(G, J) {
  const B = hypeBreakdown(G, J);
  const parts = B.parts.filter((p) => Math.abs(p.v) >= 0.05);
  const rows = parts.map((p) => `<div class="hy-row"><span>${srcName(p.k)}</span><b class="num" style="color:var(--${p.v < 0 ? 'bug' : 'good'})">${signed(p.v)} %</b></div>`);
  if (!rows.length) return `<p class="hint" style="margin:0">${t('hy.none')}</p>`;
  rows.push(`<div class="hy-row faint"><span>${srcName('fade')}</span><b class="num">${signed(Math.min(0, B.fade))} %</b></div>`);
  return rows.join('');
}
// Verktygstips för räknaren i utvecklingspanelen
export const hypeTipHTML = (G, J) => `${t('tip.hype')}<br><b>${hypeRateText(G, J)}</b>${hypePartsHTML(G, J)}`;
// Snacket som en mässa gav (procent i veckan)
export const talkText = (n) => t('expo.r.talk', { n: signed(n) });
