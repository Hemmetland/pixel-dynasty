// Små pratbubblor med pixelikoner ovanför huvudet (utropstecken, fråga, hjärta, glödlampa, kaffe, svett, zzz).
// Samma stil som resten: 1 px mörk kant, vit fyllning, liten svans. Läsbara redan i skala 2.
// drawEmote ritar i scenens lågupplösta koordinater; (x, y) = punkten rakt ovanför huvudet (svansens spets).

export const EMOTE_KINDS = ['exclam', 'question', 'heart', 'bulb', 'coffee', 'sweat', 'zzz'];

const INK = '#1b1e2e';
const FILL = '#fbfcff';
const FILL_LO = '#dde3f4';
export const BW = 13; // bubblans bredd
export const BH = 11; // bubblans höjd (utan svans)

// Ikoner: strängar med teckenfärger. Rutnätet är 9 x 7 (bubblans insida är 11 x 9). '.' = tomt.
const ICONS = {
  exclam: {
    c: { h: '#ff9a8a', o: '#ff4a3c', d: '#b82424' },
    rows: [
      '...hod...',
      '...hod...',
      '...hod...',
      '...hod...',
      '.........',
      '...hod...',
      '...ddd...',
    ],
  },
  question: {
    c: { h: '#9ac8ff', o: '#3a82f0', d: '#2250b0' },
    rows: [
      '..hoood..',
      '.ho...od.',
      '.d....od.',
      '.....od..',
      '....od...',
      '.........',
      '....od...',
    ],
  },
  heart: {
    c: { h: '#ffc0da', o: '#ff5c9d', d: '#c8306a' },
    rows: [
      '.........',
      '..hoo.oo.',
      '.hooooood',
      '.oooooood',
      '..oooood.',
      '...oood..',
      '....od...',
    ],
  },
  bulb: {
    c: { h: '#fffbd0', y: '#ffd43a', d: '#d89a1a', g: '#9aa4b8', k: '#5a6478' },
    rows: [
      '...yyy...',
      '..yhyyy..',
      '..yhyyd..',
      '..yyyyd..',
      '...ydd...',
      '...ggg...',
      '....k....',
    ],
  },
  coffee: {
    c: { R: '#ffa8a0', r: '#ee5a4a', D: '#b83a2e', k: '#5a3018', s: '#b4bcd2' },
    rows: [
      '...s..s..',
      '..s..s...',
      '.RRRRRR..',
      '.rkkkkrDD',
      '.rrrrrr.D',
      '.rrrrrrDD',
      '..DDDD...',
    ],
    steam: true,
  },
  sweat: {
    c: { h: '#e8fbff', c: '#7cd6ff', d: '#3a96d8' },
    rows: [
      '....c....',
      '....c....',
      '...ccc...',
      '..chccc..',
      '..ccccd..',
      '..cccdd..',
      '...ddd...',
    ],
  },
  zzz: {
    c: { z: '#6a5ae0', Z: '#8a7aff', h: '#c8c0ff' },
    rows: [
      '.....zzz.',
      '......z..',
      'ZZZZZzzz.',
      '...Zh....',
      '..Zh.....',
      '.Zh......',
      'ZZZZZ....',
    ],
    zz: true,
  },
};

// Hur länge varje sorts bubbla syns (sekunder)
export const EMOTE_LIFE = { exclam: 1.8, question: 2.2, heart: 2.4, bulb: 2.6, coffee: 2.6, sweat: 2.0, zzz: 3.0 };

// k = ålder i sekunder, life = total livslängd. Poppar in (studsar upp), gungar svagt, försvinner med blinkning.
export function drawEmote(ctx, x, y, kind, age, life, t = 0) {
  const ic = ICONS[kind];
  if (!ic) return;
  const left = life - age;
  if (left <= 0) return;
  let ay = 0;
  if (age < 0.18) ay = [-4, -2, -1][Math.min(2, Math.floor(age / 0.06))];
  else ay = Math.round(Math.sin(age * 4.2) * 0.6);
  if (left < 0.3 && Math.floor(left * 14) % 2 === 0) return; // blinkar ut
  const bx = Math.round(x) - 6;
  const by = Math.round(y) - BH - 2 + ay; // svansen tar 2 rader under bubblan
  const R = (dx, dy, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(bx + dx, by + dy, w, h);
  };
  // kant (rundade hörn) och fyllning
  R(2, 0, BW - 4, 1, INK);
  R(2, BH - 1, BW - 4, 1, INK);
  R(0, 2, 1, BH - 4, INK);
  R(BW - 1, 2, 1, BH - 4, INK);
  R(1, 1, 1, 1, INK);
  R(BW - 2, 1, 1, 1, INK);
  R(1, BH - 2, 1, 1, INK);
  R(BW - 2, BH - 2, 1, 1, INK);
  R(2, 1, BW - 4, BH - 2, FILL);
  R(1, 2, BW - 2, BH - 4, FILL);
  R(2, BH - 2, BW - 4, 1, FILL_LO);
  R(1, BH - 3, BW - 2, 1, FILL_LO);
  // svans
  R(5, BH - 1, 3, 1, FILL);
  R(5, BH, 1, 1, INK);
  R(6, BH, 1, 1, FILL);
  R(7, BH, 1, 1, INK);
  R(6, BH + 1, 1, 1, INK);
  // ikon (9 x 7) i insidan
  const ox = 2;
  const oy = 2;
  const blink = Math.floor(t * 3) % 2;
  ic.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === '.') continue;
      let c = ic.c[ch];
      if (!c) continue;
      // kaffeångan och z:et rör sig
      if (ic.steam && ch === 's') {
        if ((Math.floor(t * 2.4) + ry) % 2) continue;
      }
      if (ic.zz && ch === 'z' && ry < 3 && blink) continue;
      R(ox + rx, oy + ry, 1, 1, c);
    }
  });
  if (kind === 'bulb' && blink) {
    // strålar blinkar
    R(ox + 0, oy + 2, 1, 1, ic.c.y);
    R(ox + 8, oy + 2, 1, 1, ic.c.y);
    R(ox + 1, oy + 0, 1, 1, ic.c.y);
    R(ox + 7, oy + 0, 1, 1, ic.c.y);
  }
}
