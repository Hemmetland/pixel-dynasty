import { ROOM_STYLE } from './pal.js';
import { registerTier, registerRoof, DEF, V2 } from './rooms.js';
import { crownRoof } from './tier5-roof.js';
import { TW_ROOMS, TW_FAC, TW_STYLES } from './tier5-rooms.js';

// Nivå 5, Dynasti-tornet: fyra våningar, 36 skrivbord (två utvecklarrum per våning: 5 + 4), tolv anläggningsplatser (tre per våning),
// guld/champagne, marinblått och vit marmor med cyan holografisk neon. Hela nivån bor i tier5*.js; rooms.js har bara de krokar som behövs:
// room.def (egen definition och stil per rum), T.facility (tolv olika anläggningsrum), T.post (stationer, ljus och animationer).
//
// Planen per våning (vänster till höger, bredder i px; anläggningarna fyller högerkanten, 3 x 56):
//   0  lobby 98 · produktion 156 · utgivning 126          (entréplanet: atrium med trofévägg)
//   1  teknik 126 · server 56 · mocap 42 · motor 156      (teknikplanet)
//   2  skybar 68 · art 156 · kaffebar 30 · ljud 126       (sociala planet)
//   3  design 156 · styrelserum 98 · kvalitet 126         (ledningsplanet)

const dev = (n, a, b) => ['dev', n, { def: a, name: b }];
const PLAN = [
  [['lobby', 98, { def: 'tw_lobby' }], dev(156, 'tw_dev0a', ['PRODUKTION', 'PRODUCTION']), dev(126, 'tw_dev0b', ['UTGIVNING', 'PUBLISHING'])],
  [dev(126, 'tw_dev1a', ['PROGRAMMERING', 'PROGRAMMING']), ['server', 56, { def: 'tw_server', name: ['SERVERHALL', 'SERVER HALL'] }], ['whiteboard', 42, { def: 'tw_mocap', name: ['MOCAP', 'MOCAP'] }], dev(156, 'tw_dev1b', ['MOTOR & TEKNIK', 'ENGINE & TECH'])],
  [['lounge', 68, { def: 'tw_skybar', name: ['SKYBAR', 'SKY BAR'] }], dev(156, 'tw_dev2a', ['ART & ANIMATION', 'ART & ANIMATION']), ['kitchen', 30, { def: 'tw_cafe', name: ['CAFÉ', 'CAFÉ'] }], dev(126, 'tw_dev2b', ['LJUD & MUSIK', 'AUDIO & MUSIC'])],
  [dev(156, 'tw_dev3a', ['SPELDESIGN', 'GAME DESIGN']), ['meeting', 98, { def: 'tw_board', name: ['STYRELSERUM', 'BOARDROOM'] }], dev(126, 'tw_dev3b', ['KVALITET', 'QUALITY'])],
];

Object.assign(ROOM_STYLE, TW_STYLES);
Object.assign(DEF, TW_ROOMS);
registerRoof('crown', crownRoof);

// Layoutens egna härledda data: stationer kommer från rumsdefinitionerna (layoutV2), men ljus och animationslistor byggs om
// eftersom Studiohusets standardvärden sitter på Studiohusets möbelpositioner.
function post(L) {
  const { found, pitch, intH } = V2;
  const fyOf = (f) => -found - f * pitch;
  const keep = L.lights.filter((l) => l.kind === 0 && (l.pri === 0 || L.rooms.find((r) => r.floor === l.floor && l.x >= r.x0 && l.x < r.x1)?.type === 'facility'));
  const lights = keep.map((l) => ({ ...l, i: l.i * 1.3 })); // mörkare väggar behöver starkare rumsljus
  const anim = { leds: L.anim.leds, screens: [], neon: [], fish: [], steam: [], bulbs: [] };
  for (const r of L.rooms) {
    const d = DEF[r.def];
    if (!d) continue;
    const fy = fyOf(r.floor);
    if (d.lights) for (const l of d.lights(r.x0, fy, r)) lights.push({ floor: r.floor, y0: fy - intH, y1: fy, ...l });
    const a = d.anim && d.anim(r.x0, fy, r);
    if (a) for (const k of ['screens', 'neon', 'fish', 'steam']) if (a[k]) anim[k].push(...a[k]);
  }
  // neon längs bjälklagen: cyan och guld
  for (let f = 0; f < L.floors; f++) {
    const c = f % 2 === 0 ? [0.3, 0.88, 1] : [1, 0.82, 0.45];
    for (const nx of [-190, 0, 190]) lights.push({ x: nx, y: fyOf(f) + 3, r: 38, i: 0.3, c, kind: 1, floor: f, pri: 2 });
  }
  const rf = crownRoof;
  lights.push(...rf.lights(L.topY, L.BW));
  const ra = rf.anim(L.topY, L.BW);
  anim.neon.push(...ra.neon);
  anim.bulbs = ra.bulbs;
  for (const st of rf.steam || []) anim.steam.push({ x: st.x, y: L.topY + st.dy });
  lights.sort((a, b) => a.pri - b.pri);
  L.lights = lights;
  L.anim = anim;
}

registerTier(5, {
  BW: 560, floors: 4, roofH: 64, roof: 'crown', slotsPerFloor: 3, plan: PLAN, post, facility: TW_FAC,
});
