// Ljud: WebAudio-syntetiserade effekter + procedurell musik. Allt skapas i koden (inga ljudfiler).
let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let reverb = null;
let sfxVol = 0.7;
let musicVol = 0.5;
let unlocked = false;
let analyser = null;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    comp.connect(analyser);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicVol * 0.55;
    musicBus.connect(master);
    // enkel klangrumsimpuls
    const len = ctx.sampleRate * 1.8;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = buf;
    const rg = ctx.createGain();
    rg.gain.value = 0.55;
    reverb.connect(rg);
    rg.connect(musicBus);
  } catch {
    ctx = null;
  }
  return ctx;
}
// Diagnostik: aktuell ljudnivå (RMS) – används i test.
export function audioLevel() {
  if (!analyser) return -1;
  const d = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(d);
  let s = 0;
  for (const v of d) s += v * v;
  return Math.sqrt(s / d.length);
}
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
  unlocked = true;
}
if (typeof window !== 'undefined') {
  const u = () => unlockAudio();
  window.addEventListener('pointerdown', u, { once: false, passive: true });
  window.addEventListener('keydown', u, { passive: true });
}

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
function env(g, t, a, d, peak, sustain = 0) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}
function tone(type, f0, f1, t, dur, vol, bus = sfxBus, dest = null) {
  const c = ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.004, dur, vol);
  o.connect(g);
  g.connect(dest || bus);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}
let noiseBuf = null;
function noise(t, dur, vol, fType = 'highpass', f = 3000, bus = sfxBus, f2 = null) {
  const c = ctx;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const fl = c.createBiquadFilter();
  fl.type = fType;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  env(g, t, 0.003, dur, vol);
  s.connect(fl);
  fl.connect(g);
  g.connect(bus);
  s.start(t);
  s.stop(t + dur + 0.05);
}

const SFX = {
  click: (t) => tone('square', 900, 1300, t, 0.05, 0.12),
  tick: (t) => tone('square', 1800, 1800, t, 0.018, 0.06),
  open: (t) => { tone('triangle', 320, 760, t, 0.14, 0.12); noise(t, 0.12, 0.05, 'bandpass', 1400, sfxBus, 3000); },
  close: (t) => tone('triangle', 620, 280, t, 0.12, 0.1),
  coin: (t) => { tone('square', 988, 988, t, 0.07, 0.1); tone('square', 1319, 1319, t + 0.07, 0.16, 0.1); },
  good: (t) => [72, 76, 79].forEach((n, i) => tone('triangle', hz(n), hz(n), t + i * 0.07, 0.16, 0.14)),
  bad: (t) => { tone('sawtooth', 160, 80, t, 0.28, 0.14); tone('square', 120, 60, t + 0.05, 0.25, 0.08); },
  notify: (t) => { tone('sine', 1318, 1318, t, 0.22, 0.12); tone('sine', 1975, 1975, t + 0.05, 0.3, 0.07); },
  research: (t) => [76, 79, 83, 88].forEach((n, i) => tone('triangle', hz(n), hz(n), t + i * 0.06, 0.2, 0.12)),
  start: (t) => [60, 67, 72].forEach((n, i) => tone('square', hz(n), hz(n), t + i * 0.09, 0.14, 0.1)),
  phase: (t) => { noise(t, 0.2, 0.06, 'bandpass', 800, sfxBus, 2600); tone('triangle', hz(79), hz(79), t + 0.12, 0.3, 0.1); },
  build: (t) => { for (let i = 0; i < 3; i++) { noise(t + i * 0.13, 0.08, 0.16, 'lowpass', 900); tone('square', 140, 70, t + i * 0.13, 0.08, 0.14); } tone('triangle', hz(84), hz(84), t + 0.42, 0.4, 0.1); },
  whoosh: (t) => noise(t, 0.28, 0.1, 'bandpass', 500, sfxBus, 2800),
  score: (t, s = 6) => { const n = 60 + Math.round((s - 3) * 2.4); tone('triangle', hz(n), hz(n), t, 0.22, 0.16); tone('sine', hz(n + 12), hz(n + 12), t, 0.3, 0.06); },
  final: (t) => [60, 64, 67, 72].forEach((n) => tone('triangle', hz(n), hz(n), t, 0.6, 0.1)),
  release: (t) => [67, 71, 74, 79].forEach((n, i) => tone('square', hz(n), hz(n), t + i * 0.08, 0.2, 0.1)),
  fanfare: (t) => { [67, 67, 67, 72, 76, 79].forEach((n, i) => tone('square', hz(n), hz(n), t + [0, 0.12, 0.24, 0.36, 0.56, 0.78][i], i === 5 ? 0.8 : 0.16, 0.11)); [55, 60, 64].forEach((n) => tone('triangle', hz(n), hz(n), t + 0.78, 0.8, 0.1)); },
  achievement: (t) => [79, 83, 86, 91].forEach((n, i) => tone('triangle', hz(n), hz(n), t + i * 0.07, 0.3, 0.12)),
};
export const sfx = {
  play(name, arg) {
    if (!unlocked || sfxVol <= 0.001) return;
    const c = ensure();
    if (!c || c.state !== 'running') return;
    const f = SFX[name];
    if (f) {
      try {
        f(c.currentTime + 0.005, arg);
      } catch { /* ljud får aldrig krascha spelet */ }
    }
  },
  setVolume(v) {
    sfxVol = v;
    if (sfxBus) sfxBus.gain.value = v;
  },
};

// ── Musik ──
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
const PROGS = { minor: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 2, 5, 4]], major: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3]], dorian: [[0, 3, 0, 4], [0, 6, 3, 0]] };
const MOODS = {
  title: { bpm: 78, scale: 'dorian', drums: 0.25, arp: 0.7, lead: 0.5, pad: 1 },
  play: { bpm: 92, scale: 'minor', drums: 0.8, arp: 1, lead: 0.55, pad: 0.6 },
  report: { bpm: 84, scale: 'minor', drums: 0.15, arp: 0.5, lead: 0.2, pad: 1 },
  award: { bpm: 108, scale: 'major', drums: 1, arp: 1, lead: 0.8, pad: 0.7 },
  sad: { bpm: 60, scale: 'minor', drums: 0, arp: 0.2, lead: 0.1, pad: 1 },
};
const M = { on: false, mood: 'title', timer: null, next: 0, step: 0, sect: null, rng: null, era: 0, key: 57 };
function rng32(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function chordNotes(scaleName, deg) {
  const sc = SCALES[scaleName];
  const n = (d) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  return [n(deg), n(deg + 2), n(deg + 4)];
}
function newSection() {
  const mood = MOODS[M.mood];
  const r = (M.rng = rng32((Math.random() * 1e9) | 0));
  const prog = PROGS[mood.scale][Math.floor(r() * PROGS[mood.scale].length)];
  const arp = [[0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1], [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2], [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 0, 1]][Math.floor(r() * 3)];
  // melodi: 16 steg per takt, 4 takter, i skaldeg
  const mel = [];
  let d = 2 + Math.floor(r() * 3);
  for (let bar = 0; bar < 4; bar++) {
    for (let s = 0; s < 16; s++) {
      const hit = (s % 4 === 0 && r() < 0.8) || (s % 4 === 2 && r() < 0.45) || (s % 2 === 1 && r() < 0.14);
      if (hit) {
        d = Math.max(0, Math.min(11, d + Math.floor(r() * 5) - 2));
        mel.push([bar * 16 + s, d]);
      }
    }
  }
  M.sect = { prog, arp, mel, scale: mood.scale };
}
function musicStep(t, step) {
  const mood = MOODS[M.mood];
  const sec = M.sect;
  const bar = Math.floor(step / 16) % 4;
  const s16 = step % 16;
  const chord = chordNotes(sec.scale, sec.prog[bar]);
  const key = M.key;
  const era = M.era;
  const sv = 60 / mood.bpm / 4;
  // trummor
  if (mood.drums > 0 && ctx) {
    if (s16 === 0 || (s16 === 8 && Math.random() < 0.7) || (s16 === 11 && Math.random() < 0.25)) {
      tone('sine', 140, 45, t, 0.16, 0.5 * mood.drums, musicBus);
    }
    if (s16 === 4 || s16 === 12) { noise(t, 0.12, 0.2 * mood.drums, 'bandpass', 1800, musicBus); tone('triangle', 210, 140, t, 0.08, 0.1 * mood.drums, musicBus); }
    if (s16 % 2 === 0) noise(t, 0.04, (s16 % 4 === 2 ? 0.1 : 0.06) * mood.drums, 'highpass', 7000, musicBus);
  }
  // bas
  if ([0, 6, 8, 14].includes(s16) || (s16 === 3 && Math.random() < 0.3)) {
    tone(era === 0 ? 'triangle' : 'sawtooth', hz(key - 24 + chord[0]), hz(key - 24 + chord[0]), t, sv * (s16 === 0 ? 5 : 2.5), era === 0 ? 0.22 : 0.12, musicBus, null);
  }
  // arpeggio
  if (Math.random() < mood.arp) {
    const n = chord[sec.arp[s16] % 3] + (sec.arp[s16] >= 3 ? 12 : 0);
    tone(era === 0 ? 'square' : era === 1 ? 'sawtooth' : 'triangle', hz(key + 12 + n), hz(key + 12 + n), t, sv * 1.8, era === 0 ? 0.045 : 0.05, musicBus, era === 2 && reverb ? reverb : null);
  }
  // pad (en gång per takt)
  if (s16 === 0 && mood.pad > 0) {
    for (const n of chord) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = era === 0 ? 'triangle' : 'sawtooth';
      o.frequency.value = hz(key + n);
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = 900;
      const dur = sv * 16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035 * mood.pad, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(fl);
      fl.connect(g);
      g.connect(reverb || musicBus);
      g.connect(musicBus);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
  // melodi
  const m = sec.mel.find((x) => x[0] === (step % 64));
  if (m && Math.random() < mood.lead) {
    const sc = SCALES[sec.scale];
    const d = m[1];
    const n = sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    tone(era === 0 ? 'square' : 'triangle', hz(key + 24 + n), hz(key + 24 + n), t, sv * 2.6, era === 0 ? 0.07 : 0.09, musicBus, reverb && era > 0 ? reverb : null);
  }
}
function schedule() {
  if (!ctx || !M.on) return;
  const mood = MOODS[M.mood];
  const sv = 60 / mood.bpm / 4;
  while (M.next < ctx.currentTime + 0.25) {
    if (M.step % 64 === 0) newSection();
    try {
      musicStep(M.next, M.step);
    } catch { /* */ }
    M.next += sv;
    M.step++;
  }
}
export const music = {
  start() {
    if (M.on) return;
    const c = ensure();
    if (!c) return;
    if (musicVol <= 0.001) {
      M.wantOn = true;
      return;
    }
    M.on = true;
    M.next = c.currentTime + 0.1;
    M.step = 0;
    newSection();
    M.timer = setInterval(() => {
      if (ctx && ctx.state === 'running') schedule();
    }, 60);
  },
  stop() {
    M.on = false;
    clearInterval(M.timer);
    M.timer = null;
  },
  setVolume(v) {
    musicVol = v;
    if (musicBus) musicBus.gain.value = v * 0.55;
    if (v > 0.001 && !M.on && M.wantOn) {
      M.wantOn = false;
      music.start();
    }
  },
  setMood(m) {
    if (!MOODS[m] || M.mood === m) return;
    M.mood = m;
    if (M.on) {
      M.step = Math.ceil(M.step / 64) * 64;
    }
  },
  setEra(year) {
    M.era = year < 1991 ? 0 : year < 2004 ? 1 : 2;
    M.key = 57 + ((year * 7) % 5);
  },
};
