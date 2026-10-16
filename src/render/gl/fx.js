// WebGL2-pass för "HD-2D"-look: pixelkonsten ritas som vanligt i låg upplösning (lagertexturer),
// men belysning, bloom, solstrålar, dis och reflektioner beräknas i skärmupplösning ovanpå.
//
// Pass:  1) ljuspass (lågupplöst, mjuka gradienter, normaler från luminans)
//        2) sammansättning (alla lager + ljus + vägreflektion) -> HDR-textur
//        3) bloom (prefilter, nedsampling, uppsampling) och solstrålar
//        4) slutpass (tonmappning, färggradering, vinjett, korn, överlägg)
import { VERT, LIGHT_FRAG, COMPOSE_FRAG, PREFILTER_FRAG, DOWN_FRAG, UP_FRAG, SHAFT_FRAG, FINAL_FRAG, MAX_LIGHTS } from './shaders.js';

export { MAX_LIGHTS };

export function glSupported() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('GLSL: ' + log + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n').slice(0, 4000));
  }
  return s;
}

function program(gl, frag) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('GL link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

const LAYERS = ['sky', 'bg', 'emis', 'ground', 'house', 'front', 'fx'];

export class GLFX {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 saknas');
    this.gl = gl;
    this.canvas = canvas;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('OES_texture_float_linear');
    this.progs = {
      light: program(gl, LIGHT_FRAG),
      compose: program(gl, COMPOSE_FRAG),
      pre: program(gl, PREFILTER_FRAG),
      down: program(gl, DOWN_FRAG),
      up: program(gl, UP_FRAG),
      shaft: program(gl, SHAFT_FRAG),
      final: program(gl, FINAL_FRAG),
    };
    this.vao = gl.createVertexArray();
    this.tex = {};
    this.fbo = {};
    this.size = { iw: 0, ih: 0, ow: 0, oh: 0, lw: 0, lh: 0 };
    this.fxOn = false;
    this.lightData = {
      a: new Float32Array(MAX_LIGHTS * 4),
      b: new Float32Array(MAX_LIGHTS * 4),
      c: new Float32Array(MAX_LIGHTS * 4),
    };
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }

  makeTex(w, h, { float = false, linear = false } = {}) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const f = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (float && this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return { t, w, h };
  }

  makeTarget(w, h, opts) {
    const gl = this.gl;
    const tex = this.makeTex(w, h, { float: true, linear: true, ...opts });
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }

  free() {
    const gl = this.gl;
    for (const k of Object.keys(this.tex)) gl.deleteTexture(this.tex[k].t);
    for (const k of Object.keys(this.fbo)) {
      const f = this.fbo[k];
      if (Array.isArray(f)) f.forEach((x) => { gl.deleteFramebuffer(x.fb); gl.deleteTexture(x.tex.t); });
      else { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex.t); }
    }
    this.tex = {};
    this.fbo = {};
  }

  // iw/ih = pixelartens upplösning, ow/oh = utbuffertens pixlar
  resize(iw, ih, ow, oh) {
    const s = this.size;
    if (s.iw === iw && s.ih === ih && s.ow === ow && s.oh === oh) return;
    this.free();
    const gl = this.gl;
    this.canvas.width = ow;
    this.canvas.height = oh;
    const LS = Math.max(1, Math.min(4, Math.floor(960 / iw)));
    const lw = iw * LS;
    const lh = ih * LS;
    Object.assign(s, { iw, ih, ow, oh, lw, lh });
    for (const name of LAYERS) this.tex[name] = this.makeTex(iw, ih, { linear: name === 'bg' || name === 'emis' });
    this.fbo.light = this.makeTarget(lw, lh);
    this.fbo.scene = this.makeTarget(ow, oh);
    this.fbo.bloom = [];
    let w = Math.max(2, ow >> 1);
    let h = Math.max(2, oh >> 1);
    for (let i = 0; i < 5; i++) {
      this.fbo.bloom.push(this.makeTarget(w, h));
      w = Math.max(2, w >> 1);
      h = Math.max(2, h >> 1);
    }
    this.fbo.shaft = this.makeTarget(Math.max(2, ow >> 2), Math.max(2, oh >> 2));
    for (const n of LAYERS) this.dirty = { ...(this.dirty || {}), [n]: true };
    gl.viewport(0, 0, ow, oh);
  }

  upload(name, source) {
    const gl = this.gl;
    const t = this.tex[name];
    if (!t) return;
    gl.bindTexture(gl.TEXTURE_2D, t.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  use(prog) {
    this.gl.useProgram(prog.p);
    this.cur = prog;
    this.unit = 0;
  }

  bindTex(name, tex) {
    const gl = this.gl;
    const loc = this.cur.u[name];
    if (loc == null) return;
    gl.activeTexture(gl.TEXTURE0 + this.unit);
    gl.bindTexture(gl.TEXTURE_2D, tex.t);
    gl.uniform1i(loc, this.unit++);
  }

  f1(n, v) { const l = this.cur.u[n]; if (l != null) this.gl.uniform1f(l, v); }
  f2(n, a, b) { const l = this.cur.u[n]; if (l != null) this.gl.uniform2f(l, a, b); }
  f3(n, a, b, c) { const l = this.cur.u[n]; if (l != null) this.gl.uniform3f(l, a, b, c); }
  f4(n, a, b, c, d) { const l = this.cur.u[n]; if (l != null) this.gl.uniform4f(l, a, b, c, d); }
  i1(n, v) { const l = this.cur.u[n]; if (l != null) this.gl.uniform1i(l, v); }

  pass(target, w, h, blend = false) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, w, h);
    if (blend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    } else gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // p: se Scene.drawGL för fälten
  render(p) {
    const gl = this.gl;
    const { iw, ih, ow, oh, lw, lh } = this.size;
    const T = this.tex;
    const F = this.fbo;
    // ── 1. ljus ──
    const n = Math.min(MAX_LIGHTS, p.lights.length);
    const A = this.lightData.a;
    const B = this.lightData.b;
    const C = this.lightData.c;
    for (let i = 0; i < n; i++) {
      const l = p.lights[i];
      A.set([l.x, l.y, l.r, l.i], i * 4);
      B.set([l.c[0], l.c[1], l.c[2], l.kind], i * 4);
      C.set([l.y0 ?? 0, l.y1 ?? 0, l.dx ?? 0, l.dy ?? 0], i * 4);
    }
    this.use(this.progs.light);
    this.bindTex('uGround', T.ground);
    this.bindTex('uHouse', T.house);
    this.bindTex('uFront', T.front);
    this.f2('uSize', iw, ih);
    this.i1('uN', n);
    gl.uniform4fv(this.cur.u.uLa, A);
    gl.uniform4fv(this.cur.u.uLb, B);
    gl.uniform4fv(this.cur.u.uLc, C);
    this.f3('uSunL', ...p.sunL);
    this.f3('uSunC', ...p.sunC);
    this.f3('uMoonL', ...p.moonL);
    this.f3('uMoonC', ...p.moonC);
    this.f1('uRelief', p.relief ?? 1);
    this.pass(F.light, lw, lh);

    // ── 2. sammansättning ──
    this.use(this.progs.compose);
    this.bindTex('uSky', T.sky);
    this.bindTex('uBg', T.bg);
    this.bindTex('uEmis', T.emis);
    this.bindTex('uGround', T.ground);
    this.bindTex('uHouse', T.house);
    this.bindTex('uFront', T.front);
    this.bindTex('uLight', F.light.tex);
    this.f2('uSize', iw, ih);
    this.f3('uAmb', ...p.amb);
    this.f3('uAmbB', ...p.ambB);
    this.f1('uNight', p.night);
    this.f1('uGy', p.gy);
    this.f1('uRoadTop', p.roadTop);
    this.f1('uRoadBot', p.roadBot);
    this.f1('uWet', p.wet);
    this.f1('uTime', p.time);
    this.f1('uBgBlur', p.bgBlur ?? 1);
    this.f1('uEmisK', p.emisK ?? 1);
    this.f1('uReflect', p.reflect ?? 1);
    this.f3('uHazeCol', ...p.hazeCol);
    this.pass(F.scene, ow, oh);

    // ── 3. bloom ──
    const bl = F.bloom;
    this.use(this.progs.pre);
    this.bindTex('uSrc', F.scene.tex);
    this.f2('uTexel', 1 / ow, 1 / oh);
    this.f1('uThr', p.bloomThr);
    this.pass(bl[0], bl[0].w, bl[0].h);
    // solstrålar från det ljusa bloom-prefiltret
    if (p.sunUv && p.shaft > 0.001) {
      this.use(this.progs.shaft);
      this.bindTex('uSrc', bl[0].tex);
      this.f2('uSun', p.sunUv[0], p.sunUv[1]);
      this.f1('uDensity', p.shaftDensity ?? 0.95);
      this.pass(F.shaft, F.shaft.w, F.shaft.h);
    }
    this.use(this.progs.down);
    for (let i = 1; i < bl.length; i++) {
      this.bindTex('uSrc', bl[i - 1].tex);
      this.f2('uTexel', 1 / bl[i - 1].w, 1 / bl[i - 1].h);
      this.pass(bl[i], bl[i].w, bl[i].h);
      this.unit = 0;
    }
    this.use(this.progs.up);
    for (let i = bl.length - 1; i > 0; i--) {
      this.unit = 0;
      this.bindTex('uSrc', bl[i].tex);
      this.f2('uTexel', 1 / bl[i].w, 1 / bl[i].h);
      this.f1('uW', 1);
      this.pass(bl[i - 1], bl[i - 1].w, bl[i - 1].h, true);
    }

    // ── 4. slutpass ──
    this.use(this.progs.final);
    this.bindTex('uScene', F.scene.tex);
    this.bindTex('uBloom', bl[0].tex);
    this.bindTex('uShaft', F.shaft.tex);
    this.bindTex('uFx', T.fx);
    this.f2('uOut', ow, oh);
    this.f1('uBloomK', p.bloomK);
    this.f1('uShaftK', p.sunUv ? p.shaft : 0);
    this.f3('uShaftCol', ...p.shaftCol);
    this.f3('uGradeHi', ...p.gradeHi);
    this.f3('uGradeLo', ...p.gradeLo);
    this.f1('uSat', p.sat);
    this.f1('uVig', p.vignette);
    this.f1('uGrain', p.grain);
    this.f1('uTime', p.time);
    this.f1('uFxOn', p.fxOn ? 1 : 0);
    this.f2('uSunPos', p.sunUv ? p.sunUv[0] : -1, p.sunUv ? p.sunUv[1] : -1);
    this.f3('uSunGlowCol', ...(p.sunGlowCol || [0, 0, 0]));
    this.f1('uSunGlow', p.sunGlow || 0);
    this.pass(null, ow, oh);
  }
}
