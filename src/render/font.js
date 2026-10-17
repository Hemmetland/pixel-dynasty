// Liten 3×5-pixelfont för text i scenen (skyltar, flytande tal).
const G = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
  '?': '110001010000010', ':': '000010000010000', '%': '101001010100101', $: '011110010011110', '/': '001001010100100',
  "'": '010010000000000', '&': '010101010101011', '#': '101111101111101', '*': '000101010101000', ' ': '000000000000000',
};
// Å, Ä, Ö och É: grundbokstav plus markering i raden ovanför.
const DIACRITIC = { Å: ['A', [1]], Ä: ['A', [0, 2]], Ö: ['O', [0, 2]], É: ['E', [2]] };
export function textWidth(s, scale = 1) {
  return Math.max(0, s.length * 4 - 1) * scale;
}
export function drawText(ctx, str, x, y, color, scale = 1, shadow = null) {
  const s = String(str).toUpperCase();
  const pass = (ox, oy, c) => {
    ctx.fillStyle = c;
    let cx = x + ox;
    for (const ch of s) {
      const d = DIACRITIC[ch];
      const g = G[d ? d[0] : ch] || G['?'];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * scale, y + oy + Math.floor(i / 3) * scale, scale, scale);
      // prickar, ring eller accent i raden ovanför
      if (d) for (const dx of d[1]) ctx.fillRect(cx + dx * scale, y + oy - scale, scale, scale);
      cx += 4 * scale;
    }
  };
  if (shadow) pass(0, scale, shadow);
  pass(0, 0, color);
}
// Text med mörk kontur runt (bra läsbarhet mot ljus himmel).
export function drawTextOutlined(ctx, str, x, y, color, outline = 'rgba(8,10,26,0.9)') {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawText(ctx, str, x + dx, y + dy, outline, 1);
  drawText(ctx, str, x, y, color, 1);
}
export function drawTextCentered(ctx, str, cx, y, color, scale = 1, shadow = null) {
  drawText(ctx, str, Math.round(cx - textWidth(String(str), scale) / 2), y, color, scale, shadow);
}

// Välj största skala (högst maxScale) så att texten ryms i maxW; trunkera annars.
export function fitText(str, maxW, maxScale = 3) {
  const s = String(str).toUpperCase();
  for (let sc = maxScale; sc >= 1; sc--) if (textWidth(s, sc) <= maxW) return { text: s, scale: sc };
  let t = s;
  while (t.length > 3 && textWidth(t + '.', 1) > maxW) t = t.slice(0, -1);
  return { text: t + '.', scale: 1 };
}
