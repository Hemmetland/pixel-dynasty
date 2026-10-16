import { GLYPH_IDS, glyphCanvas } from '../render/glyphs.js';
document.body.style.cssText = 'margin:0;background:#1a1f38;padding:10px;display:flex;flex-wrap:wrap;gap:8px;font:10px monospace;color:#9ab';
for (const id of GLYPH_IDS) {
  const d = document.createElement('div');
  d.style.cssText = 'width:84px;text-align:center';
  const c = glyphCanvas(id, '#e8f0ff', 4);
  c.style.cssText = 'image-rendering:pixelated;background:#2a3050;display:block;margin:auto';
  d.appendChild(c);
  d.appendChild(document.createTextNode(id));
  document.body.appendChild(d);
}
