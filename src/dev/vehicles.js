import { drawVehicle, vehicleSize } from '../render/vehicles.js';
import { drawPerson } from '../render/people.js';
const W = 330;
const H = 190;
const c = document.createElement('canvas');
c.width = W;
c.height = H;
c.style.cssText = 'width:1320px;height:760px;image-rendering:pixelated;background:#8aa0c0';
document.body.style.margin = '0';
document.body.appendChild(c);
const g = c.getContext('2d');
g.fillStyle = '#3a3c4a';
g.fillRect(0, 0, W, H);
const cols = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#e8e8f0', '#2a2f3c', '#c860c8', '#f2883a'];
let y = 24;
let x = 6;
const list = [];
for (let era = 0; era < 3; era++) list.push({ type: 'car', era, color: cols[era * 2], dir: 1 }, { type: 'car', era, color: cols[era * 2 + 1], dir: -1 });
list.push({ type: 'van', era: 0, color: cols[3], dir: 1 }, { type: 'van', era: 0, color: cols[1], dir: -1 }, { type: 'truck', era: 0, color: cols[0], dir: 1 }, { type: 'truck', era: 0, color: cols[6], dir: -1 }, { type: 'bus', era: 0, color: cols[2], dir: 1 }, { type: 'bus', era: 0, color: cols[2], dir: -1 });
for (const v of list) {
  const s = vehicleSize(v);
  if (x + s.w > W - 4) { x = 6; y += 32; }
  v.x = v.dir > 0 ? x : x + s.w;
  drawVehicle(g, v, y);
  x += s.w + 8;
}
// människor för jämförelse
const look = { skin: 1, hair: 2, hairColor: 3, shirt: 4, pants: 1, acc: 0 };
drawPerson(g, 300, 150, look, 'stand', 0, 1);
drawPerson(g, 316, 150, look, 'walk', 1, -1);
