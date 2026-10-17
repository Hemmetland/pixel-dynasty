// Testsida för pratbubblorna (render/emotes.js): alla sorter i flera förstoringar och i livscykelns olika skeden.
// ?zoom=8  ?bg=day|night
import { drawEmote, EMOTE_KINDS, EMOTE_LIFE } from '../render/emotes.js';

const q = new URLSearchParams(location.search);
const zoom = +(q.get('zoom') || 8);
const night = q.get('bg') === 'night';
document.body.style.cssText = `margin:0;background:${night ? '#1a1d36' : '#9ac8f0'};padding:12px;font:12px sans-serif;color:#fff`;
const mk = (w, h, z) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.cssText = `width:${w * z}px;height:${h * z}px;image-rendering:pixelated;display:block;margin:4px 0`;
  document.body.appendChild(c);
  return c.getContext('2d');
};
const label = (t) => {
  const d = document.createElement('div');
  d.textContent = t;
  document.body.appendChild(d);
};
label(`alla sorter, zoom ${zoom} (mitt i livet)`);
let g = mk(EMOTE_KINDS.length * 18, 18, zoom);
EMOTE_KINDS.forEach((k, i) => drawEmote(g, i * 18 + 9, 16, k, 1.0, EMOTE_LIFE[k], 1.2));
label('skala 2 (som i spelet på 1280x720)');
g = mk(EMOTE_KINDS.length * 18, 18, 2);
EMOTE_KINDS.forEach((k, i) => drawEmote(g, i * 18 + 9, 16, k, 1.0, EMOTE_LIFE[k], 1.2));
label('livscykel: pop-in (0.0, 0.06, 0.12, 0.2), bubbla, blinkar ut');
g = mk(9 * 18, 18, zoom / 2);
[0, 0.06, 0.12, 0.2, 1.0, 1.7].forEach((age, i) => drawEmote(g, i * 18 + 9, 16, 'bulb', age, 2.0, age * 3));
drawEmote(g, 6 * 18 + 9, 16, 'bulb', 1.8, 2.0, 0);
drawEmote(g, 7 * 18 + 9, 16, 'bulb', 1.9, 2.0, 0);
