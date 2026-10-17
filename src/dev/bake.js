// Bakar de procedurella möblerna och fordonen till PNG-bilder med mått och ankare (window.__bake()).
// De används som stilreferens och måttstock för PixelLab och som test av sprite-vägen. Körs av tools/bake-sprites.mjs.
import * as F from '../render/furniture.js';
import * as V from '../render/props2.js';
import * as P from '../render/props.js';
import { drawVehicle } from '../render/vehicles.js';

const ITEMS = [
  ['chair2', (g, x, y) => F.chair2(g, x, y)],
  ['desk2', (g, x, y) => F.desk2(g, x, y, 0, 1, 2)],
  ['sofa', (g, x, y) => F.sofa(g, x, y, 38)],
  ['beanbag', (g, x, y) => F.beanbag(g, x, y, 15)],
  ['floorLamp', (g, x, y) => F.floorLamp(g, x, y, 38)],
  ['fridge', (g, x, y) => F.fridge(g, x, y)],
  ['kitchenCounter', (g, x, y) => F.kitchenCounter(g, x, y, 40)],
  ['meetingTable', (g, x, y) => F.meetingTable(g, x, y, 44)],
  ['receptionDesk', (g, x, y) => F.receptionDesk(g, x, y, 38)],
  ['rack', (g, x, y) => F.rack(g, x, y, 14, 38, 1)],
  ['benchSeat', (g, x, y) => F.benchSeat(g, x, y, 24)],
  ['armchair', (g, x, y) => F.armchair(g, x, y)],
  ['podChair', (g, x, y) => F.podChair(g, x, y)],
  ['copier', (g, x, y) => F.copier(g, x, y)],
  ['boxes', (g, x, y) => F.boxes(g, x, y)],
  ['waterCooler', (g, x, y) => F.waterCooler(g, x, y)],
  ['trashBin', (g, x, y) => F.trashBin(g, x, y)],
  ['umbrellaStand', (g, x, y) => F.umbrellaStand(g, x, y)],
  ['plantFloor', (g, x, y) => V.plantFloor(g, x, y, 24, 1)],
  ['plantSmall', (g, x, y) => V.plantSmall(g, x, y, 1)],
  ['palm', (g, x, y) => V.palm(g, x, y, 36, 1)],
  ['plant', (g, x, y) => P.plant(g, x, y, 1)],
  ['bookshelf', (g, x, y) => P.bookshelf(g, x, y, 24, 30, 1)],
  ['couch', (g, x, y) => P.couch(g, x, y)],
  ['filingCabinet', (g, x, y) => P.filingCabinet(g, x, y)],
  ['vending', (g, x, y) => P.vending(g, x, y)],
];
const VEH = [
  ['veh.car.0', { type: 'car', era: 0, color: '#e8504a', dir: 1 }],
  ['veh.car.1', { type: 'car', era: 1, color: '#4a90e0', dir: 1 }],
  ['veh.car.2', { type: 'car', era: 2, color: '#f2c84a', dir: 1 }],
  ['veh.van', { type: 'van', era: 0, color: '#6cc86a', dir: 1 }],
  ['veh.truck', { type: 'truck', era: 0, color: '#e8504a', dir: 1 }],
  ['veh.bus', { type: 'bus', era: 0, color: '#f2c84a', dir: 1 }],
];

function bake(name, draw) {
  const W = 220;
  const H = 150;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const x = 70;
  const y = 120;
  draw(g, x, y);
  const d = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (d[(j * W + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const o = document.createElement('canvas');
  o.width = w;
  o.height = h;
  o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return { name, w, h, ax: x - x0, ay: y - y0, png: o.toDataURL('image/png') };
}

window.__bake = () => {
  const out = [];
  for (const [n, f] of ITEMS) out.push(bake('prop.' + n, f));
  for (const [n, c] of VEH) out.push(bake(n, (g, x, y) => drawVehicle(g, { ...c, x }, y)));
  return out.filter(Boolean);
};
document.body.textContent = 'bake';
