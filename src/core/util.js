export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
export const smooth = (t) => t * t * (3 - 2 * t);
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fmtMoney(n, short = true) {
  const neg = Math.round(n) < 0;
  const a = Math.abs(Math.round(n));
  let s;
  if (short && a >= 1e9) s = (a / 1e9).toFixed(a >= 1e10 ? 1 : 2) + 'B';
  else if (short && a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  else if (short && a >= 1e5) s = Math.round(a / 1e3) + 'K';
  else s = a.toLocaleString('en-US').replace(/,/g, ' ');
  return (neg ? '−' : '') + '$' + s;
}
export function fmtNum(n) {
  const a = Math.abs(Math.round(n));
  let s;
  if (a >= 1e9) s = (a / 1e9).toFixed(2) + 'B';
  else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  else if (a >= 1e4) s = (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K';
  else s = a.toLocaleString('en-US').replace(/,/g, ' ');
  return (n < 0 ? '−' : '') + s;
}
export const fmtScore = (n) => (Math.round(n * 10) / 10).toFixed(1);
export const uid = (() => {
  let n = 0;
  return (p = 'id') => p + Date.now().toString(36) + (n++).toString(36);
})();

// Små färghjälpare (hex "#rrggbb").
export function hex2rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgb2hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export const shade = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));
