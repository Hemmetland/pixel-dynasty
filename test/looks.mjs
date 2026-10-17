// Test av karaktärsutseenden: paletter, slumpning, gamla sparfiler och att alla poser ritas inom avatarens ruta.
// node test/looks.mjs
import { drawPerson, POSES, POSE_FRAMES, HAIR_STYLES } from '../src/render/people.js';
import { SKINS, HAIRS, SHIRTS, PANTS } from '../src/render/pal.js';
import { LOOK_N, makeLook, randomLook, migrateLooks, extraLook, EXTRA_N } from '../src/sim/people.js';
import { newGame } from '../src/sim/state.js';
import { seeded, rint, chance } from '../src/core/rng.js';

let fails = 0;
const ok = (c, msg) => {
  console.log(c ? 'ok  ' : 'FEL ', msg);
  if (!c) fails++;
};

ok(LOOK_N.skin === SKINS.length && LOOK_N.hairColor === HAIRS.length && LOOK_N.shirt === SHIRTS.length && LOOK_N.pants === PANTS.length && LOOK_N.hair === HAIR_STYLES, 'LOOK_N stämmer med paletterna och frisyrerna');

// slumpade utseenden håller sig inom intervallen
const G = newGame({ studio: 'T', seed: 7 });
let bad = 0;
const seen = {};
for (let i = 0; i < 1500; i++) {
  const l = i % 2 ? makeLook(G) : randomLook(seeded(i));
  const inr = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  if (!inr(l.skin, LOOK_N.skin) || !inr(l.hair, LOOK_N.hair) || !inr(l.hairColor, LOOK_N.hairColor) || !inr(l.shirt, LOOK_N.shirt) || !inr(l.pants, LOOK_N.pants)) bad++;
  if (!inr(l.hat, 4) || !inr(l.glasses, 4) || !inr(l.beard, 3) || !inr(l.headphones, 2) || !inr(l.backpack, 2) || !inr(l.hoodie, 2) || !inr(l.pattern, 4)) bad++;
  for (const k of ['hat', 'glasses', 'beard', 'headphones', 'backpack', 'hoodie', 'pattern', 'hair']) seen[k + l[k]] = 1;
}
ok(bad === 0, 'slumpade utseenden har giltiga fält');
ok(['hat1', 'hat2', 'hat3', 'glasses1', 'glasses3', 'beard1', 'beard2', 'headphones1', 'backpack1', 'hoodie1', 'pattern3', 'hair13', 'hair7'].every((k) => seen[k]), 'alla nya fält förekommer');

// determinism: de gamla fälten slumpas som förut och slumptillståndet flyttas lika långt (de nya fälten härleds utan extra drag)
let same = true;
let acc = 0;
for (const seed of [1, 2, 3, 42, 777]) {
  const d = newGame({ studio: 'T', seed });
  const n = newGame({ studio: 'T', seed });
  for (let i = 0; i < 40; i++) {
    const o = { skin: rint(d, 0, 4), hair: rint(d, 0, 6), hairColor: rint(d, 0, 7), shirt: rint(d, 0, 11), pants: rint(d, 0, 3), acc: chance(d, 0.45) ? rint(d, 1, 4) : 0, body: rint(d, 0, 1) };
    const l = makeLook(n);
    if (d.rng !== n.rng || o.acc !== l.acc || o.body !== l.body) same = false;
    if (o.hair === l.hair && o.shirt === l.shirt && o.skin === l.skin) acc++;
  }
  if (JSON.stringify(makeLook(newGame({ studio: 'T', seed }))) !== JSON.stringify(makeLook(newGame({ studio: 'T', seed })))) same = false;
}
ok(same, 'makeLook: samma slumptillstånd och acc/body som förut, samma resultat per frö');
ok(acc > 20, 'en del utseenden behåller också frisyr, tröja och hudton');

// gamla sparfiler
const old = { staff: [{ id: 2, name: 'Anna', look: { skin: 1, hair: 2, hairColor: 3, shirt: 4, pants: 1, acc: 2 } }, { id: 1, isFounder: true, name: 'F', look: { skin: 1, hair: 2, hairColor: 3, shirt: 4, pants: 1, acc: 1 } }], candidates: [{ id: 5, name: 'Bo', look: { skin: 0, hair: 0, hairColor: 0, shirt: 0, pants: 0, acc: 0 } }] };
migrateLooks(old);
const snap = JSON.stringify(old);
migrateLooks(old);
ok(old.staff[0].look.headphones === 1 && old.staff[0].look.hair === 2 && old.staff[0].look.shirt === 4, 'migrering behåller gamla fält och acc-tillbehör');
ok(old.staff[1].look.hat === undefined, 'grundarens utseende lämnas orört');
ok(snap === JSON.stringify(old), 'migrering är idempotent');
ok(Object.keys(extraLook(old.staff[0].look, EXTRA_N + 3)).includes('beard'), 'extraLook ger fulla fält');

// ritning: inga fel och alla rutor inom rimliga gränser. Spelar in fillRect via en låtsas-canvas.
function rec() {
  const st = [{ x: 0, y: 0, sx: 1 }];
  const box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, n: 0 };
  const top = () => st[st.length - 1];
  return {
    box,
    save() { st.push({ ...top() }); },
    restore() { st.pop(); },
    translate(x, y) { top().x += x * top().sx; top().y += y; },
    scale(sx) { top().sx *= sx; },
    fillRect(x, y, w, h) {
      const t = top();
      const xa = t.x + x * t.sx;
      const xb = t.x + (x + w) * t.sx;
      box.x0 = Math.min(box.x0, xa, xb);
      box.x1 = Math.max(box.x1, xa, xb);
      box.y0 = Math.min(box.y0, t.y + y);
      box.y1 = Math.max(box.y1, t.y + y + h);
      box.n++;
    },
    set fillStyle(v) { if (typeof v !== 'string' || !v) throw new Error('ogiltig färg ' + v); },
    set globalAlpha(v) { if (!(v >= 0 && v <= 1)) throw new Error('ogiltig alpha'); },
  };
}
const r = seeded(99);
const looks = [{ skin: 1, hair: 1, hairColor: 1, shirt: 1, pants: 1, acc: 0 }, { skin: 1, hair: 3, hairColor: 2, shirt: 5, pants: 0, acc: 1, body: 0 }];
for (let i = 0; i < 120; i++) looks.push(randomLook(r));
const ext = {};
const ext0 = {}; // bara bildruta 0 utan t (så som avataren ritas)
let drawErr = 0;
for (const look of looks) {
  for (const pose of [...POSES, 'finns-inte', 'toString']) {
    for (let f = 0; f < 9; f++) {
      for (const o of [{}, { t: f * 0.37, mood: f * 12 }, { seated: true, blink: 1 }]) {
        const g = rec();
        try {
          drawPerson(g, 0, 0, look, pose, f, f % 2 ? -1 : 1, o);
        } catch (e) {
          drawErr++;
          console.log(pose, f, e.message);
        }
        for (const [tab, use] of [[ext, true], [ext0, f === 0 && o.t == null && !o.seated]]) {
          if (!use) continue;
          const e = (tab[pose] = tab[pose] || { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
          e.x0 = Math.min(e.x0, g.box.x0);
          e.y0 = Math.min(e.y0, g.box.y0);
          e.x1 = Math.max(e.x1, g.box.x1);
          e.y1 = Math.max(e.y1, g.box.y1);
        }
      }
    }
  }
}
ok(drawErr === 0, 'alla poser, bildrutor och utseenden ritas utan fel (inklusive okända poser och gamla utseenden)');
for (const p of POSES) {
  const e = ext[p];
  console.log(`     ${p.padEnd(8)} x ${e.x0}..${e.x1}  y ${e.y0}..${e.y1}  (${POSE_FRAMES[p]} rutor)`);
}
// avatarens ruta är 24x34 med fötterna i (11,32): speglade poser får också plats
for (const p of ['stand', 'cheer', 'sit', 'wave', 'talk', 'drink', 'tired']) {
  const e = ext0[p];
  ok(e.x0 >= -11 && e.x1 <= 13 && e.y0 >= -32 && e.y1 <= 2, `${p} ryms i avatarrutan`);
}
console.log(fails ? `\n${fails} fel` : '\nAlla tester gick bra');
process.exit(fails ? 1 : 0);
