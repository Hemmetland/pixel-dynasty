import { spriteSrc } from '../render/sprites.js';

// Enkla linjeikoner (24×24, currentColor).
const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  money: P('<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-1-1.5-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.1 0 3 5.8 1.6 5.8 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3-1.7M12 6v1.6M12 16.4V18"/>'),
  flask: P('<path d="M9 3h6M10 3v6l-5.2 9a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7.5 15h9"/>'),
  heart: P('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  calendar: P('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  pause: P('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  play: P('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  fast: P('<path d="M4 5v14l9-7zM12 5v14l9-7z" fill="currentColor"/>'),
  faster: P('<path d="M2 6v12l7-6zM9 6v12l7-6zM16 6v12l7-6z" fill="currentColor" stroke-width="1"/>'),
  team: P('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c3 .3 5 2.2 5 5.3"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4 3.4-7 7.5-7s7.5 3 7.5 7"/>'),
  building: P('<path d="M4 21V6l8-3 8 3v15M2.5 21h19"/><path d="M8 9.5h2M8 13h2M8 16.5h2M14 9.5h2M14 13h2M14 16.5h2"/>'),
  chart: P('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8.5 7h7"/>'),
  cog: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  lock: P('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  bug: P('<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M12 8V6M9.5 5L8 3.5M14.5 5L16 3.5M3.5 12H8M16 12h4.5M4.5 18L8.5 16M19.5 18L15.5 16M4.5 7l3.5 2.5M19.5 7L16 9.5"/>'),
  bulb: P('<path d="M9.5 18h5M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  gear: P('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.5z"/>'),
  star: P('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>'),
  trophy: P('<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M9.5 18h5"/>'),
  cart: P('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2.5l2.2 11h10.6l2-8H6.5"/>'),
  arrow: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: P('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  minus: P('<path d="M5 12h14"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.2"/>'),
  search: P('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>'),
  flag: P('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  hammer: P('<path d="M14 5l5 5-2 2-5-5zM12 7L4.5 14.5a2 2 0 0 0 0 2.8l2.2 2.2a2 2 0 0 0 2.8 0L17 12"/>'),
  megaphone: P('<path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1zM18 9.5a4 4 0 0 1 0 5"/>'),
  coffee: P('<path d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2"/>'),
  mail: P('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
  save: P('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
  folder: P('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>'),
  dice: P('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>'),
  sparkle: P('<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>'),
  clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  gamepad: P('<rect x="2.5" y="7" width="19" height="10.5" rx="5"/><path d="M7 10.5v3.5M5.2 12.2h3.6M15.5 11.5h.01M18 13h.01"/>'),
  rocket: P('<path d="M12 3c3.5 2 5 5.5 4.5 10l-2 2h-5l-2-2C7 8.5 8.5 5 12 3zM9.5 15l-2.5 3.5M14.5 15l2.5 3.5M12 9.5v.01"/>'),
  target: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  shield: P('<path d="M12 3l7.5 3v6c0 4.4-3.1 7.8-7.5 9-4.4-1.2-7.5-4.6-7.5-9V6z"/>'),
  cpu: P('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),
  gpu: P('<rect x="2.5" y="6.5" width="17" height="10" rx="1.5"/><circle cx="9.5" cy="11.5" r="2.8"/><path d="M14.5 9.5h2.5M14.5 13.5h2.5M5 16.5v2.5M8.5 16.5v2.5M19.5 9v5h2"/>'),
  pc: P('<rect x="7" y="2.5" width="10" height="19" rx="1.6"/><path d="M10 6.5h4M10 9.5h4"/><circle cx="12" cy="16" r="1.6"/>'),
  box: P('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
  handheld: P('<rect x="6" y="2.5" width="12" height="19" rx="2"/><rect x="8.5" y="5" width="7" height="6" rx=".6"/><path d="M9 15v3M7.5 16.5h3"/><circle cx="15" cy="15.5" r=".9"/><circle cx="15.5" cy="18" r=".9"/>'),
  console: P('<rect x="2.5" y="9" width="19" height="9" rx="1.8"/><path d="M5.5 9V6.5h13V9M5.5 13.5h6"/><circle cx="17" cy="13.5" r="1.4"/>'),
  vr: P('<path d="M4.5 8h15a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-4l-1.8-2.2a2 2 0 0 0-3.4 0L8.5 16.5h-4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zM7 8V6M17 8V6"/>'),
  truck: P('<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  wrench: P('<path d="M14.5 6.5a4 4 0 0 0 4.8 4.8l-9.3 9.2a2.2 2.2 0 0 1-3.1-3.1l9.3-9.3a4 4 0 0 0 .3-1.6z"/>'),
  bank: P('<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  moon: P('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),
  snow: P('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>'),
  rain: P('<path d="M7 15a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.3 1.5A3.7 3.7 0 0 1 17.5 15zM9 18v2M13 18v2M17 18v2"/>'),
  leaf: P('<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8"/>'),
  flower: P('<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c-1-3-.5-6 0-6s1 3 0 6zM12 14.2c-1 3-.5 6 0 6s1-3 0-6zM9.8 12c-3-1-6-.5-6 0s3 1 6 0zM14.2 12c3-1 6-.5 6 0s-3 1-6 0z"/>'),
  settings: P('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  film: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>'),
  award: P('<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>'),
  trend: P('<path d="M3 17l6-6 4 4 8-9M15 6h6v6"/>'),
  fire: P('<path d="M12 3c1 3.5 4.5 5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 0 1.5 1 2 1.5 2 0-3-1-5 1-8z"/>'),
  hourglass: P('<path d="M6 3h12M6 21h12M7 3v3.5c0 2 2 3.2 5 5.5 3-2.3 5-3.5 5-5.5V3M7 21v-3.5c0-2 2-3.2 5-5.5 3 2.3 5 3.5 5 5.5V21"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  download: P('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  upload: P('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'),
  volume: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  mute: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5"/>'),
  music: P('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  refresh: P('<path d="M20 5v5h-5M4 19v-5h5M5.5 9A7.5 7.5 0 0 1 19 10M18.5 15A7.5 7.5 0 0 1 5 14"/>'),
  skull: P('<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.2 3 5.3V20h10v-3.7c1.8-1.1 3-2.7 3-5.3a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.4" fill="currentColor"/><circle cx="15" cy="11.5" r="1.4" fill="currentColor"/><path d="M10.5 20v-2M13.5 20v-2"/>'),
  crown: P('<path d="M3.5 18.5l-1-11 5.5 4.5L12 5l4 8 5.5-5.5-1 11z"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  sliders: P('<path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="9" r="2" fill="currentColor"/><circle cx="12" cy="15" r="2" fill="currentColor"/><circle cx="19" cy="8" r="2" fill="currentColor"/>'),
  menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  chevron: P('<path d="M6 9.5l6 6 6-6"/>'),
  dusk: P('<path d="M7 17a5 5 0 0 1 10 0M12 6.5v2.5M5 10.2l1.7 1.7M19 10.2l-1.7 1.7M2.5 17H5M19 17h2.5M3.5 20.5h17"/>'),
};
export const icon = (name, cls = '') => `<span class="ic ${cls}">${ICONS[name] || ICONS.info}</span>`;
export const hasIcon = (n) => !!ICONS[n];

// Pixelkonst ur assets/manifest.json (nycklar 'ui.*', se docs/PIXELLAB.md) som <img>, eller '' om spriten saknas.
// Skalan är alltid ett heltal, det som ligger närmast rutan 'box' px (minst 1), så att pixlarna förblir skarpa:
// 32 px konst i dockans 26 px-ruta visas 1:1 och sticker ut lite i stället för att skalas suddigt; 16 px konst dubblas.
export function pixImg(key, box, variant = 0) {
  const s = spriteSrc(key, variant);
  if (!s) return '';
  const k = Math.max(1, Math.round(box / Math.max(s.w, s.h)));
  return `<img class="px" src="${s.src}" style="width:${s.w * k}px;height:${s.h * k}px" alt="" draggable="false">`;
}
// Ikon med pixelkonst om 'key' finns, annars linjeikonen 'name' (reserven).
export const pixIcon = (key, name, box, cls = '') => {
  const img = pixImg(key, box);
  return img ? `<span class="ic px ${cls}" aria-hidden="true">${img}</span>` : icon(name, cls);
};
