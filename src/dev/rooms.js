// Testsida för Studiohuset (v2): byggnaden i sig, utan spelet runt. Parametrar:
//   ?zoom=3  ?night=0..1  ?era=0|1|2  ?people=0|1  ?fac=none|all  ?lights=0|1  ?time=sekunder (animation)  ?stations=1 (markerar stationer)
import { makeLayout, drawShell } from '../render/building.js';
import { drawRoomsDynamic, drawRoomLights } from '../render/rooms.js';
import { drawPerson } from '../render/people.js';

const q = new URLSearchParams(location.search);
const zoom = +(q.get('zoom') || 3);
const night = +(q.get('night') || 0);
const era = +(q.get('era') ?? 2);
const tier = +(q.get('tier') || 3);
const L = makeLayout(tier);
const W = L.W + 80;
const H = L.H + 70;
const c = document.createElement('canvas');
c.width = W;
c.height = H;
c.style.cssText = `width:${W * zoom}px;height:${H * zoom}px;image-rendering:pixelated;display:block`;
document.body.style.cssText = 'margin:0;background:#222';
document.body.appendChild(c);
const g = c.getContext('2d');
const gy = H - 14;
const cx = W / 2;
const sky = g.createLinearGradient(0, 0, 0, H);
if (night > 0.5) { sky.addColorStop(0, '#0c1030'); sky.addColorStop(1, '#2a3060'); } else if (night > 0.1) { sky.addColorStop(0, '#3a2a6a'); sky.addColorStop(1, '#f08a6a'); } else { sky.addColorStop(0, '#4aa8ff'); sky.addColorStop(1, '#bfe4ff'); }
g.fillStyle = sky;
g.fillRect(0, 0, W, H);
// stadssiluett bakom huset så att fönstren visar något
for (let x = 0; x < W; x += 14) {
  const h = 20 + ((x * 37) % 60);
  g.fillStyle = night > 0.5 ? '#1a2048' : '#5a7098';
  g.fillRect(x, gy - h, 12, h);
  if (night > 0.3) for (let y = gy - h + 3; y < gy - 4; y += 6) { g.fillStyle = '#ffe8a0'; g.fillRect(x + 2 + (y % 3) * 3, y, 2, 2); }
}
g.fillStyle = '#6a6a7c';
g.fillRect(0, gy, W, 14);
g.fillStyle = '#8a8a9c';
g.fillRect(0, gy, W, 2);

const fac = {};
if (q.get('fac') === 'all') {
  const ids = ['coffee', 'lab', 'qa', 'training', 'gameroom', 'marketing'];
  ids.forEach((id, i) => { fac[id] = { lvl: 1 + (i % 3), slot: i }; });
}
const layer = document.createElement('canvas');
layer.width = W;
layer.height = H;
const lg = layer.getContext('2d');
lg.translate(cx, gy);
drawShell(lg, L, { era, name: q.get('name') || 'Nexus Games', awards: 3, games: [{ c1: '#4a90e0', c2: '#2a5090' }, { c1: '#e8504a', c2: '#902a2a' }], fac });
g.drawImage(layer, 0, 0);

const time = +(q.get('time') || 0);
const occupied = new Map();
if (q.get('people') !== '0') {
  L.desks.forEach((d) => {
    if (d.idx >= (+q.get('staff') || 15)) return;
    occupied.set(d.idx, { id: d.idx });
    drawPerson(g, cx + d.x + 5, gy + d.fy, { skin: d.idx % 5, hair: d.idx % 7, hairColor: (d.idx * 2) % 9, shirt: (d.idx * 5) % 12, pants: d.idx % 4, acc: d.idx % 5 }, 'sit', d.idx % 2, 1);
  });
  if (L.stations) {
    L.stations.forEach((s, i) => {
      if (s.kind === 'seat' || s.kind === 'sofa' || i % 2 === 0) drawPerson(g, cx + s.x, gy + s.fy, { skin: (i + 1) % 5, hair: (i * 3) % 7, hairColor: (i * 2) % 9, shirt: (i * 7) % 12, pants: i % 4, acc: i % 5 }, s.pose === 'sit' ? 'sit' : 'stand', 0, s.dir);
    });
  }
}
if (L.v2) drawRoomsDynamic(g, cx, gy, L, time, night, { occupied, working: true, era });
if (q.get('lights') === '1' && L.v2) {
  g.globalCompositeOperation = 'lighter';
  drawRoomLights(g, cx, gy, L, Math.max(0.5, night));
  g.globalCompositeOperation = 'source-over';
}
if (q.get('stations') === '1' && L.stations) {
  for (const s of L.stations) { g.fillStyle = '#ff00ff'; g.fillRect(cx + s.x, gy + s.fy - 2, 1, 2); }
}
window.__info = { ox: cx, oy: gy, zoom, W, H, L: { W: L.W, H: L.H, topY: L.topY, rooms: L.rooms.length, lights: L.lights?.length, stations: L.stations?.length } };
