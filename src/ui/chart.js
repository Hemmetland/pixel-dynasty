import { esc, icon } from './core.js';

// Diagramram: formerna ritas i en SVG som töjs ut till rutans bredd, medan text, slutpunkt och markörer läggs som
// HTML ovanpå. Allt anges i viewBox-koordinater (w × h) och räknas om till procent, så att text och prickar behåller
// sin form hur bred rutan än blir.
// labels: [{ x, y, text, at: 'start' | 'middle' | 'end', cls }], dot: { x, y, c }, marks: [{ x, y, c, ic, tip }]
export function plot({ w, h, height = h, svg, labels = [], dot = null, marks = [] }) {
  const X = (x) => ((x / w) * 100).toFixed(2) + '%';
  const Y = (y) => ((y / h) * 100).toFixed(2) + '%';
  const tx = { start: '0', middle: '-50%', end: '-100%' };
  const lab = labels.map((l) => `<span class="pl ${l.cls || ''}" style="left:${X(l.x)};top:${Y(l.y)};--tx:${tx[l.at || 'middle']}">${esc(l.text)}</span>`).join('');
  const mk = marks.map((m) => `<span class="pl-mk" style="left:${X(m.x)};top:${Y(m.y)};--c:${m.c}"${m.tip ? ` data-tip="${esc(m.tip)}"` : ''}>${icon(m.ic)}</span>`).join('');
  const dt = dot ? `<span class="pl-dot" style="left:${X(dot.x)};top:${Y(dot.y)};--c:${dot.c}"></span>` : '';
  return `<div class="plot" style="height:${height}px"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${svg}</svg>${lab}${dt}${mk}</div>`;
}

// Stödlinjer i bakgrunden; stroken skalas inte med när diagrammet töjs
export const gridLines = (x0, x1, ys) => ys.map((y) => `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="rgba(150,172,255,.1)" vector-effect="non-scaling-stroke"/>`).join('');
