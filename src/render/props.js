import { PAL } from './pal.js';
import { shade } from '../core/util.js';
import { drawText } from './font.js';

// Alla ritfunktioner: (ctx, x, fy, ...) där x = vänsterkant och fy = golvets y-koordinat.
const R = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

export function chair(ctx, x, fy, color = '#3a4a6a') {
  R(ctx, x - 1, fy - 19, 3, 10, color); // ryggstöd
  R(ctx, x - 1, fy - 19, 1, 10, shade(color, 0.25));
  R(ctx, x - 1, fy - 9, 9, 2, color); // sits
  R(ctx, x - 1, fy - 8, 9, 1, shade(color, -0.3));
  R(ctx, x + 3, fy - 7, 2, 5, PAL.metalLo); // stam
  R(ctx, x, fy - 2, 8, 1, PAL.metalDk); // fotkors
  R(ctx, x, fy - 1, 2, 1, '#222'); R(ctx, x + 6, fy - 1, 2, 1, '#222');
}

// Skrivbord med monitor. era: 0 = beige CRT, 1 = mörk CRT, 2 = platt skärm. variant: 0..3 tillbehör.
export function desk(ctx, x, fy, era = 0, variant = 0) {
  const top = fy - 12;
  R(ctx, x + 1, top, 24, 2, PAL.woodHi);
  R(ctx, x + 1, top + 2, 24, 1, PAL.woodLo);
  R(ctx, x + 2, top + 3, 2, 9, PAL.woodLo); // vänster ben
  R(ctx, x + 14, top + 3, 10, 9, PAL.wood); // lådor
  R(ctx, x + 14, top + 3, 10, 1, PAL.woodLo);
  R(ctx, x + 14, top + 7, 10, 1, PAL.woodLo);
  R(ctx, x + 18, top + 5, 2, 1, PAL.metalHi);
  R(ctx, x + 18, top + 9, 2, 1, PAL.metalHi);
  R(ctx, x + 24, top + 3, 1, 9, PAL.woodDk);
  // tangentbord
  R(ctx, x + 3, top - 1, 8, 1, era === 0 ? PAL.beige : '#6a7488');
  R(ctx, x + 4, top - 2, 6, 1, era === 0 ? PAL.beigeLo : '#4a5368');
  // monitor
  if (era === 0) {
    // beige CRT i profil
    R(ctx, x + 13, top - 12, 11, 10, PAL.beige);
    R(ctx, x + 13, top - 12, 11, 1, PAL.beigeHi);
    R(ctx, x + 20, top - 10, 5, 6, PAL.beigeLo); // rörets baksida
    R(ctx, x + 12, top - 11, 2, 8, PAL.beigeLo); // bildskärmsram
    R(ctx, x + 11, top - 10, 1, 6, '#101820'); // skärmen (mörk, glöd läggs i dynamiskt)
    R(ctx, x + 15, top - 2, 6, 2, PAL.beigeLo);
  } else if (era === 1) {
    R(ctx, x + 13, top - 13, 11, 11, '#8a8f9c');
    R(ctx, x + 13, top - 13, 11, 1, '#b4bac8');
    R(ctx, x + 20, top - 11, 6, 7, '#6a7080');
    R(ctx, x + 12, top - 12, 2, 9, '#6a7080');
    R(ctx, x + 11, top - 11, 1, 7, '#101820');
    R(ctx, x + 15, top - 2, 6, 2, '#5a6070');
  } else {
    R(ctx, x + 16, top - 14, 2, 12, '#2a2f3c'); // tunn platt panel i profil
    R(ctx, x + 15, top - 13, 1, 10, '#101820');
    R(ctx, x + 17, top - 14, 1, 1, '#8a92a8');
    R(ctx, x + 16, top - 3, 2, 3, '#4a5064');
    R(ctx, x + 13, top - 1, 8, 1, '#3a4054');
  }
  // tillbehör
  if (variant === 0) {
    R(ctx, x + 22, top - 4, 3, 4, '#f4f4ff'); R(ctx, x + 25, top - 3, 1, 2, '#f4f4ff'); R(ctx, x + 22, top - 4, 3, 1, '#6b4229'); // mugg
  } else if (variant === 1) {
    R(ctx, x + 21, top - 3, 4, 3, PAL.paper); R(ctx, x + 22, top - 4, 3, 1, '#d8d4c4');
  } else if (variant === 2) {
    R(ctx, x + 2, top - 5, 1, 5, PAL.metalLo); R(ctx, x + 1, top - 6, 4, 2, '#f2c84a'); // skrivbordslampa
  } else {
    R(ctx, x + 22, top - 5, 3, 5, PAL.greenLo); R(ctx, x + 21, top - 7, 5, 3, PAL.green); R(ctx, x + 22, top - 1, 3, 1, PAL.pot); // liten kruka
  }
}

export function plant(ctx, x, fy, size = 1) {
  const h = 8 * size;
  R(ctx, x + 1, fy - 5, 5, 5, PAL.pot);
  R(ctx, x + 1, fy - 5, 5, 1, '#e08050');
  R(ctx, x + 1, fy - 1, 5, 1, PAL.potLo);
  R(ctx, x + 3, fy - 5 - h, 1, h, PAL.greenLo);
  R(ctx, x, fy - 5 - h - 2, 4, 4, PAL.green);
  R(ctx, x + 3, fy - 5 - h, 5, 4, PAL.greenHi);
  R(ctx, x + 1, fy - 5 - h + 3, 5, 3, PAL.green);
  R(ctx, x + 2, fy - 5 - h - 4, 3, 3, PAL.greenHi);
}

export function bookshelf(ctx, x, fy, w = 24, h = 30, seed = 1) {
  R(ctx, x, fy - h, w, h, PAL.woodLo);
  R(ctx, x + 1, fy - h + 1, w - 2, h - 2, '#4a3220');
  const cols = ['#e8504a', '#f2a63a', '#4a90e0', '#6cc86a', '#c860c8', '#e8e8f0', '#3fb8a8', '#f0d24a'];
  let s = seed * 7919;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const shelves = Math.floor((h - 2) / 9);
  for (let r = 0; r < shelves; r++) {
    const sy = fy - h + 2 + r * 9;
    R(ctx, x + 1, sy + 8, w - 2, 1, PAL.woodHi);
    let bx = x + 2;
    while (bx < x + w - 3) {
      const bw = 1 + Math.floor(rnd() * 2);
      const bh = 4 + Math.floor(rnd() * 4);
      R(ctx, bx, sy + 8 - bh, bw, bh, cols[Math.floor(rnd() * cols.length)]);
      bx += bw + (rnd() < 0.15 ? 2 : 0);
    }
  }
}

export function posterArt(ctx, x, y, w, h, kind, c1 = '#4a90e0', c2 = '#101830') {
  R(ctx, x - 1, y - 1, w + 2, h + 2, '#e8e0d0');
  R(ctx, x, y, w, h, c2);
  R(ctx, x, y, w, h * 0.55, c1);
  if (kind === 0) {
    R(ctx, x + w / 2 - 2, y + 2, 4, 4, '#f2e84a');
    R(ctx, x, y + h * 0.55, w, h * 0.45, '#2a6a3a');
  } else if (kind === 1) {
    R(ctx, x + 2, y + h - 6, w - 4, 3, '#e8504a'); R(ctx, x + 4, y + 2, 2, h - 8, '#f4f4ff');
  } else if (kind === 2) {
    R(ctx, x + 2, y + 2, w - 4, 2, '#f4f4ff'); R(ctx, x + 2, y + 6, w - 8, 2, '#f2a63a'); R(ctx, x + 2, y + h - 5, 3, 3, '#6cc86a');
  } else {
    R(ctx, x + 2, y + 2, w - 4, h - 4, '#c860c8'); R(ctx, x + 3, y + 3, w - 6, h - 6, '#2a1a3a'); R(ctx, x + w / 2 - 1, y + h / 2 - 1, 3, 3, '#7cf2ff');
  }
}

export function clock(ctx, x, y) {
  R(ctx, x, y + 1, 7, 5, '#f4f4ff'); R(ctx, x + 1, y, 5, 7, '#f4f4ff');
  R(ctx, x + 3, y + 2, 1, 2, '#222'); R(ctx, x + 3, y + 3, 2, 1, '#222');
}

export function windowHole(ctx, x, y, w, h) {
  // gör ett hål i den statiska väggen (himlen syns igenom)
  ctx.clearRect(x, y, w, h);
}
export function windowFrame(ctx, x, y, w, h, curtain = '#e8504a') {
  R(ctx, x - 2, y - 2, w + 4, 2, '#e8e8f0');
  R(ctx, x - 2, y + h, w + 4, 2, '#b8bcc8');
  R(ctx, x - 2, y - 2, 2, h + 4, '#e8e8f0');
  R(ctx, x + w, y - 2, 2, h + 4, '#c8ccd8');
  R(ctx, x + Math.floor(w / 2), y, 1, h, '#e8e8f0');
  R(ctx, x, y + Math.floor(h / 2), w, 1, '#e8e8f0');
  if (curtain) {
    R(ctx, x, y, 3, h - 2, curtain);
    R(ctx, x, y, 1, h - 2, shade(curtain, 0.3));
    R(ctx, x + w - 3, y, 3, h - 2, curtain);
    R(ctx, x + w - 1, y, 1, h - 2, shade(curtain, -0.3));
  }
}

export function whiteboard(ctx, x, y, w = 22, h = 14) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, PAL.metalLo);
  R(ctx, x, y, w, h, '#f4f6ff');
  R(ctx, x + 2, y + 3, w - 8, 1, '#4a90e0'); R(ctx, x + 2, y + 6, w - 5, 1, '#e8504a'); R(ctx, x + 2, y + 9, w - 10, 1, '#4a90e0');
  R(ctx, x + w - 6, y + 2, 4, 4, '#6cc86a');
  R(ctx, x, y + h, w, 1, PAL.metalHi);
}

export function ceilingLamp(ctx, x, cy) {
  R(ctx, x + 2, cy, 1, 3, PAL.metalLo);
  R(ctx, x, cy + 3, 5, 2, '#d8d8e0');
  R(ctx, x + 1, cy + 5, 3, 1, '#fff4c0');
}

export function coffee(ctx, x, fy, lvl = 1) {
  // bord + kaffemaskin (+ extra nivåer)
  R(ctx, x, fy - 12, 22, 2, PAL.woodHi); R(ctx, x + 1, fy - 10, 20, 10, PAL.wood); R(ctx, x + 1, fy - 10, 20, 1, PAL.woodLo);
  R(ctx, x + 12, fy - 10, 8, 10, PAL.woodLo);
  R(ctx, x + 3, fy - 22, 9, 10, '#3a3f4c'); R(ctx, x + 3, fy - 22, 9, 2, '#6a7488'); R(ctx, x + 4, fy - 14, 7, 2, '#c8d0e0');
  R(ctx, x + 6, fy - 12, 3, 1, '#f4f4ff'); R(ctx, x + 10, fy - 19, 1, 1, '#e8504a');
  R(ctx, x + 15, fy - 15, 3, 3, '#f4f4ff'); R(ctx, x + 18, fy - 14, 1, 1, '#f4f4ff');
  if (lvl >= 2) { R(ctx, x + 13, fy - 21, 7, 6, '#c8643a'); R(ctx, x + 14, fy - 20, 5, 1, '#e08050'); }
  if (lvl >= 3) { R(ctx, x + 22, fy - 20, 10, 20, '#e8e8f0'); R(ctx, x + 23, fy - 19, 8, 8, '#4a90e0'); R(ctx, x + 23, fy - 9, 8, 8, '#f2a63a'); R(ctx, x + 22, fy - 20, 10, 1, '#fff'); }
}

export function labBench(ctx, x, fy, lvl = 1) {
  R(ctx, x, fy - 12, 36, 2, '#e8e8f0'); R(ctx, x + 1, fy - 10, 34, 10, '#5a6a8a'); R(ctx, x + 1, fy - 10, 34, 1, '#3a4a6a');
  R(ctx, x + 12, fy - 10, 1, 10, '#3a4a6a'); R(ctx, x + 24, fy - 10, 1, 10, '#3a4a6a');
  // kolvar
  R(ctx, x + 3, fy - 19, 5, 7, 'rgba(160,230,255,0.7)'); R(ctx, x + 4, fy - 22, 3, 3, 'rgba(160,230,255,0.7)'); R(ctx, x + 3, fy - 15, 5, 3, '#3fd8a8');
  R(ctx, x + 12, fy - 18, 4, 6, 'rgba(255,200,230,0.7)'); R(ctx, x + 13, fy - 14, 2, 2, '#e86aa8');
  R(ctx, x + 22, fy - 20, 6, 8, '#3a3f4c'); R(ctx, x + 23, fy - 19, 4, 4, '#7cf2ff'); R(ctx, x + 24, fy - 14, 2, 2, '#e8504a'); // mikroskop-ish
  if (lvl >= 2) { R(ctx, x + 8, fy - 27, 20, 14, '#3a3f4c'); R(ctx, x + 9, fy - 26, 18, 12, '#101830'); R(ctx, x + 11, fy - 22, 8, 1, '#3fd8a8'); R(ctx, x + 11, fy - 19, 12, 1, '#3fd8a8'); }
  if (lvl >= 3) { R(ctx, x + 36, fy - 28, 8, 28, '#2a3042'); R(ctx, x + 37, fy - 26, 6, 4, '#4de1d0'); R(ctx, x + 37, fy - 20, 6, 2, '#e8504a'); R(ctx, x + 37, fy - 16, 6, 2, '#f2c84a'); }
}

export function qaLab(ctx, x, fy, lvl = 1) {
  R(ctx, x, fy - 12, 34, 2, '#d8d8e0'); R(ctx, x + 1, fy - 10, 32, 10, '#4a5368');
  // testenheter
  R(ctx, x + 3, fy - 17, 6, 5, '#10141c'); R(ctx, x + 4, fy - 16, 4, 3, '#4de1d0');
  R(ctx, x + 12, fy - 20, 9, 8, '#2a2f3c'); R(ctx, x + 13, fy - 19, 7, 6, '#e8504a'); R(ctx, x + 15, fy - 17, 3, 2, '#fff');
  R(ctx, x + 24, fy - 17, 7, 5, '#10141c'); R(ctx, x + 25, fy - 16, 5, 3, '#6cc86a');
  // bugg-affisch
  R(ctx, x + 6, fy - 34, 12, 11, '#f4f0e4'); R(ctx, x + 11, fy - 31, 3, 4, '#e8504a'); R(ctx, x + 9, fy - 30, 7, 1, '#e8504a'); R(ctx, x + 9, fy - 28, 7, 1, '#e8504a');
  if (lvl >= 2) { R(ctx, x + 36, fy - 24, 7, 24, '#2a3042'); R(ctx, x + 37, fy - 22, 5, 3, '#6cc86a'); R(ctx, x + 37, fy - 17, 5, 3, '#f2c84a'); }
}

export function trainingRoom(ctx, x, fy, lvl = 1) {
  R(ctx, x, fy - 34, 38, 22, '#e8e8f0'); R(ctx, x + 1, fy - 33, 36, 20, '#10243a');
  R(ctx, x + 4, fy - 29, 16, 2, '#f2a63a'); R(ctx, x + 4, fy - 25, 22, 1, '#7cf2ff'); R(ctx, x + 4, fy - 22, 12, 1, '#7cf2ff'); R(ctx, x + 28, fy - 29, 6, 8, '#e8504a');
  R(ctx, x + 18, fy - 12, 2, 12, PAL.metalLo);
  R(ctx, x + 2, fy - 8, 8, 2, '#6a7a9a'); R(ctx, x + 3, fy - 6, 2, 6, PAL.metalLo); R(ctx, x + 5, fy - 14, 3, 6, '#6a7a9a');
  R(ctx, x + 26, fy - 8, 8, 2, '#6a7a9a'); R(ctx, x + 30, fy - 6, 2, 6, PAL.metalLo); R(ctx, x + 28, fy - 14, 3, 6, '#6a7a9a');
  if (lvl >= 2) { R(ctx, x + 38, fy - 20, 10, 20, PAL.woodLo); R(ctx, x + 39, fy - 19, 8, 18, '#4a3220'); R(ctx, x + 40, fy - 18, 2, 6, '#e8504a'); R(ctx, x + 43, fy - 18, 2, 6, '#4a90e0'); R(ctx, x + 40, fy - 10, 5, 6, '#f2c84a'); }
}

export function gameRoom(ctx, x, fy, lvl = 1) {
  // arkadmaskin
  R(ctx, x, fy - 30, 14, 30, '#3a1a6a'); R(ctx, x, fy - 30, 14, 2, '#b46bff');
  R(ctx, x + 2, fy - 26, 10, 9, '#101830'); R(ctx, x + 4, fy - 24, 2, 2, '#f2e84a'); R(ctx, x + 8, fy - 22, 2, 2, '#e8504a'); R(ctx, x + 5, fy - 20, 4, 1, '#6cc86a');
  R(ctx, x + 2, fy - 15, 10, 3, '#2a1a4a'); R(ctx, x + 4, fy - 14, 2, 2, '#e8504a'); R(ctx, x + 9, fy - 14, 2, 2, '#4de1d0');
  R(ctx, x, fy - 10, 14, 10, '#2a1250');
  // sittsäck
  R(ctx, x + 18, fy - 8, 14, 8, '#e8504a'); R(ctx, x + 19, fy - 9, 12, 2, '#f2705a'); R(ctx, x + 18, fy - 2, 14, 2, '#b83a34');
  if (lvl >= 2) { R(ctx, x + 36, fy - 14, 22, 3, '#3a3f4c'); R(ctx, x + 38, fy - 11, 2, 11, PAL.metalLo); R(ctx, x + 54, fy - 11, 2, 11, PAL.metalLo); R(ctx, x + 38, fy - 17, 18, 3, '#4aa860'); R(ctx, x + 44, fy - 19, 2, 3, '#e8504a'); R(ctx, x + 50, fy - 19, 2, 3, '#4a90e0'); }
}

export function marketingRoom(ctx, x, fy, lvl = 1) {
  R(ctx, x, fy - 28, 34, 22, '#f2c84a'); R(ctx, x + 1, fy - 27, 32, 20, '#2a1250');
  R(ctx, x + 4, fy - 24, 18, 3, '#ff5c9d'); R(ctx, x + 4, fy - 19, 12, 2, '#7cf2ff'); R(ctx, x + 4, fy - 15, 24, 2, '#f4f4ff'); R(ctx, x + 24, fy - 24, 6, 6, '#f2c84a');
  R(ctx, x + 6, fy - 12, 22, 2, PAL.woodHi); R(ctx, x + 8, fy - 10, 2, 10, PAL.woodLo); R(ctx, x + 24, fy - 10, 2, 10, PAL.woodLo);
  R(ctx, x + 12, fy - 17, 8, 5, '#f4f4ff'); R(ctx, x + 14, fy - 20, 4, 3, '#e8504a');
  if (lvl >= 2) { R(ctx, x + 36, fy - 18, 4, 18, PAL.metalLo); R(ctx, x + 34, fy - 26, 8, 8, '#e8504a'); R(ctx, x + 36, fy - 24, 4, 4, '#f4f4ff'); }
}

export function serverRoom(ctx, x, fy, lvl = 1, tick = 0) {
  const racks = 1 + lvl;
  for (let i = 0; i < racks; i++) {
    const rx = x + i * 13;
    R(ctx, rx, fy - 32, 11, 32, '#1b1f2c'); R(ctx, rx, fy - 32, 11, 1, '#3a4256');
    for (let r = 0; r < 6; r++) {
      R(ctx, rx + 1, fy - 30 + r * 5, 9, 4, '#2a3042');
      const on = ((tick + r * 3 + i * 5) >> 2) & 1;
      R(ctx, rx + 2, fy - 29 + r * 5, 1, 1, '#6cc86a');
      R(ctx, rx + 4, fy - 29 + r * 5, 1, 1, on ? '#f2a63a' : '#4a3a1a');
      R(ctx, rx + 7, fy - 29 + r * 5, 3, 1, '#4a5368');
    }
  }
}

export function couch(ctx, x, fy, color = '#4a6ab0') {
  R(ctx, x, fy - 14, 26, 14, color);
  R(ctx, x, fy - 14, 26, 3, shade(color, 0.25));
  R(ctx, x + 3, fy - 10, 20, 7, shade(color, 0.1));
  R(ctx, x, fy - 9, 4, 9, shade(color, -0.15)); R(ctx, x + 22, fy - 9, 4, 9, shade(color, -0.15));
  R(ctx, x + 2, fy, 2, 1, '#222'); R(ctx, x + 22, fy, 2, 1, '#222');
  R(ctx, x + 6, fy - 11, 5, 5, '#f2c84a');
}

export function filingCabinet(ctx, x, fy) {
  R(ctx, x, fy - 18, 11, 18, '#8a92a8'); R(ctx, x, fy - 18, 11, 1, '#c8d0e0');
  for (let i = 0; i < 3; i++) { R(ctx, x + 1, fy - 17 + i * 6, 9, 5, '#9aa4b8'); R(ctx, x + 4, fy - 15 + i * 6, 3, 1, '#3a4256'); }
}

export function trophyShelf(ctx, x, fy, awards = 0, games = []) {
  // vägghylla med pokaler och spelboxar
  const y = fy - 28;
  R(ctx, x, y, 44, 2, PAL.woodHi); R(ctx, x, y + 2, 44, 1, PAL.woodLo);
  let cx = x + 3;
  for (let i = 0; i < Math.min(awards, 5); i++) {
    R(ctx, cx, y - 7, 5, 4, '#f2c84a'); R(ctx, cx + 1, y - 3, 3, 2, '#d8a82a'); R(ctx, cx + 1, y - 1, 3, 1, '#7a5a1a'); R(ctx, cx - 1, y - 6, 1, 2, '#f2c84a'); R(ctx, cx + 5, y - 6, 1, 2, '#f2c84a');
    cx += 8;
  }
  for (const g of games.slice(-Math.max(0, 5 - Math.min(awards, 5)))) {
    R(ctx, cx, y - 10, 6, 10, g.c1); R(ctx, cx, y - 10, 6, 3, g.c2); R(ctx, cx + 1, y - 5, 4, 3, '#f4f4ff'); R(ctx, cx, y - 10, 1, 10, 'rgba(255,255,255,.35)');
    cx += 8;
  }
}

export function rug(ctx, x, fy, w, c1 = '#8a3a4a', c2 = '#c86a5a') {
  R(ctx, x, fy - 2, w, 2, c1); R(ctx, x + 2, fy - 2, w - 4, 1, c2);
}

export function arcadeSign(ctx, x, y, text, color = '#ff5c9d') {
  drawText(ctx, text, x, y, color, 1);
}

export function vending(ctx, x, fy) {
  R(ctx, x, fy - 26, 14, 26, '#e8504a'); R(ctx, x, fy - 26, 14, 1, '#ff8a7a');
  R(ctx, x + 2, fy - 23, 8, 14, '#10202a');
  const cols = ['#f2c84a', '#6cc86a', '#4a90e0', '#e86aa8'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R(ctx, x + 3 + c * 2 + (c > 1 ? 0 : 0), fy - 22 + r * 4, 1, 3, cols[(r + c) % 4]);
  R(ctx, x + 11, fy - 22, 2, 8, '#2a2f3c'); R(ctx, x + 3, fy - 6, 8, 3, '#10141c');
}

// Katt (orange, grå eller svart). state: 'sit' | 'walk' | 'sleep'. Vänd höger; dir=-1 speglar.
const CATS = [['#e0883a', '#f6b46a', '#b0602a'], ['#8a92a8', '#b4bccd', '#5a6278'], ['#2a2c38', '#4a4e60', '#14151c']];
export function drawCat(ctx, x, fy, state, frame, dir = 1, kind = 0) {
  const [c, hi, lo] = CATS[kind % CATS.length];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(fy));
  if (dir < 0) ctx.scale(-1, 1);
  const r = (dx, dy, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(dx, dy, w, h);
  };
  if (state === 'sleep') {
    r(-5, -4, 11, 4, c);
    r(-5, -4, 11, 1, hi);
    r(4, -5, 4, 4, c);
    r(7, -5, 1, 1, '#f4a0a0');
    r(4, -6, 1, 1, c);
    r(7, -6, 1, 1, c);
    r(-6, -2, 2, 2, lo);
    r(-2, -3, 1, 3, lo);
    r(2, -3, 1, 3, lo);
  } else if (state === 'sit') {
    r(-3, -6, 6, 6, c);
    r(-3, -6, 6, 1, hi);
    r(2, -10, 5, 5, c);
    r(2, -11, 1, 2, c);
    r(6, -11, 1, 2, c);
    r(5, -8, 1, 1, '#1a1a22');
    r(7, -7, 1, 1, '#f4a0a0');
    r(-5, -3, 2, 3, lo);
    r(-6, -6 + (frame % 2), 1, 4, lo);
    r(0, -3, 1, 3, lo);
    r(2, -1, 2, 1, hi);
  } else {
    const f = frame % 2;
    r(-5, -7, 9, 4, c);
    r(-5, -7, 9, 1, hi);
    r(3, -9, 5, 4, c);
    r(3, -10, 1, 2, c);
    r(7, -10, 1, 2, c);
    r(6, -8, 1, 1, '#1a1a22');
    r(-7, -9, 1, 4, lo);
    r(-6, -10, 1, 2, lo);
    r(-4, -3, 1, 3 - f, lo);
    r(-1, -3, 1, 2 + f, lo);
    r(1, -3, 1, 3 - f, lo);
    r(3, -3, 1, 2 + f, lo);
  }
  ctx.restore();
}
