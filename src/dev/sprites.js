import { drawPerson } from '../render/people.js';
const c = document.createElement('canvas');
c.width = 260; c.height = 180;
c.style.cssText = 'width:1040px;height:720px;image-rendering:pixelated;background:#8aa0c0';
document.body.style.margin = '0';
document.body.appendChild(c);
const g = c.getContext('2d');
g.fillStyle = '#8aa0c0'; g.fillRect(0, 0, 260, 180);
const poses = [['sit', 0], ['sit', 1], ['sitIdle', 0], ['stand', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['cheer', 0], ['cheer', 1], ['drink', 0], ['read', 0], ['think', 0], ['sleep', 0]];
let i = 0;
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 9; col++) {
    const look = { skin: (col) % 5, hair: (col + row * 3) % 7, hairColor: (col + row) % 9, shirt: (col * 2 + row) % 12, pants: col % 4, acc: (col + row) % 5, body: 0 };
    const [pose, fr] = poses[i++ % poses.length];
    drawPerson(g, 16 + col * 27, 50 + row * 55, look, pose, fr, 1);
  }
}
