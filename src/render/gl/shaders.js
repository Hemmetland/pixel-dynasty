// GLSL ES 3.00-shaders för HD-2D-passen. Koordinater: uv (0,0) = nedre vänstra hörnet (lagertexturerna laddas med FLIP_Y),
// "px" = pixelartens pixlar med y nedåt, som resten av renderaren.
export const MAX_LIGHTS = 48;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

export const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Ljus: summerar punktljus/strålkastare/skärmsken med normaler som härleds ur lagrens luminans.
// Utdata: rgb = belysning (läggs på ambient), a = ocklusion (kaviteter mörkare).
export const LIGHT_FRAG = `${HEAD}
#define MAXL ${MAX_LIGHTS}
in vec2 vUv;
out vec4 o;
uniform sampler2D uGround, uHouse, uFront;
uniform vec2 uSize;
uniform int uN;
uniform vec4 uLa[MAXL];   // x, y, radie, intensitet
uniform vec4 uLb[MAXL];   // rgb, typ
uniform vec4 uLc[MAXL];   // y0, y1, dx, dy
uniform vec3 uSunL, uSunC, uMoonL, uMoonC;
uniform float uRelief;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hAt(vec2 uv) {
  vec4 g = texture(uGround, uv);
  vec4 h = texture(uHouse, uv);
  vec4 f = texture(uFront, uv);
  vec4 c = f + (h + g * (1.0 - h.a)) * (1.0 - f.a);
  vec3 u = c.rgb / max(c.a, 0.001);
  return lum(mix(vec3(0.45), u, c.a));
}

void main() {
  vec2 e = 1.0 / uSize;
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  vec2 uvT = (floor(vUv * uSize) + 0.5) / uSize;
  float hc = hAt(uvT);
  float hl = hAt(uvT - vec2(e.x, 0.0));
  float hr = hAt(uvT + vec2(e.x, 0.0));
  float hu = hAt(uvT + vec2(0.0, e.y));
  float hd = hAt(uvT - vec2(0.0, e.y));
  vec3 N = normalize(vec3(-(hr - hl) * 1.5 * uRelief, -(hd - hu) * 1.5 * uRelief, 1.0));
  float cav = clamp(((hl + hr + hu + hd) * 0.25 - hc) * 1.8, 0.0, 0.32);
  float houseA = texture(uHouse, uvT).a;
  vec3 E = vec3(0.0);
  for (int i = 0; i < MAXL; i++) {
    if (i >= uN) break;
    vec4 a = uLa[i];
    vec4 b = uLb[i];
    vec4 c = uLc[i];
    int kind = int(b.w + 0.5);
    vec2 d2 = a.xy - px;
    float att = 0.0;
    float mask = 1.0;
    vec3 Ln = vec3(0.0, 0.0, 1.0);
    if (kind == 0 || kind == 2) {
      // innelampa / skärmsken: stannar inom sin våning och inuti huset
      float d = length(d2);
      att = pow(clamp(1.0 - d / a.z, 0.0, 1.0), 1.8);
      float band = smoothstep(c.x - 1.5, c.x + 1.0, px.y) * (1.0 - smoothstep(c.y - 1.0, c.y + 2.0, px.y));
      mask = band * houseA;
      Ln = normalize(vec3(d2, kind == 0 ? 22.0 : 9.0));
    } else if (kind == 1) {
      // utomhuslampa: bred, platt ljuspöl på marken (c.z = vertikal skalning)
      float d = length(d2 * vec2(1.0, max(c.z, 0.2)));
      att = pow(clamp(1.0 - d / a.z, 0.0, 1.0), 1.6);
      Ln = normalize(vec3(d2, 26.0));
    } else {
      // strålkastare med riktning (c.z, c.w)
      vec2 dd = px - a.xy;
      float dist = length(dd * vec2(1.0, 1.7));
      float cosA = dot(normalize(dd + vec2(1e-4)), c.zw);
      float cone = smoothstep(0.30, 0.93, cosA);
      att = pow(clamp(1.0 - dist / a.z, 0.0, 1.0), 1.3) * cone;
      Ln = normalize(vec3(-dd, 14.0));
    }
    float ndl = 0.45 + 0.55 * clamp(dot(N, Ln) * 0.5 + 0.5, 0.0, 1.0);
    E += b.rgb * a.w * att * ndl * mask;
  }
  vec3 sl = normalize(uSunL);
  vec3 ml = normalize(uMoonL);
  E += uSunC * clamp(dot(N, sl) - sl.z, -0.4, 0.55);
  E += uMoonC * clamp(dot(N, ml) - ml.z, -0.4, 0.55);
  o = vec4(E, 1.0 - cav);
}`;

// Sammansättning: himmel, mjukt suddig skyline, mark med vägreflektion, hus, gata. Allt belyses av ljuspasset.
export const COMPOSE_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSky, uBg, uEmis, uGround, uHouse, uFront, uLight;
uniform vec2 uSize;
uniform vec3 uAmb, uAmbB, uHazeCol;
uniform float uNight, uGy, uRoadTop, uRoadBot, uWet, uTime, uBgBlur, uEmisK, uReflect;

vec4 bgSoft(vec2 uv) {
  vec2 e = uBgBlur / uSize;
  vec4 s = texture(uBg, uv) * 4.0;
  s += (texture(uBg, uv + vec2(e.x, 0.0)) + texture(uBg, uv - vec2(e.x, 0.0)) + texture(uBg, uv + vec2(0.0, e.y)) + texture(uBg, uv - vec2(0.0, e.y))) * 2.0;
  s += texture(uBg, uv + e) + texture(uBg, uv - e) + texture(uBg, uv + vec2(e.x, -e.y)) + texture(uBg, uv + vec2(-e.x, e.y));
  return s / 16.0;
}

vec3 emissive(vec4 p, float k) {
  vec3 u = p.rgb / max(p.a, 0.001);
  float m = max(u.r, max(u.g, u.b));
  float e = smoothstep(0.82, 0.99, m) * p.a;
  return u * e * k;
}

vec3 bgPart(vec2 uv) {
  vec3 col = texture(uSky, uv).rgb;
  vec4 b = bgSoft(uv);
  col = col * (1.0 - b.a) + b.rgb * uAmb;
  col += texture(uEmis, uv).rgb * uEmisK * uNight;
  return col;
}

// Allt utom gatan: används för spegelbilden i vägen (ingen rekursion i GLSL).
vec3 mirrorCol(vec2 uv) {
  vec4 Lt = texture(uLight, uv);
  vec3 lightA = max(uAmb * Lt.a + Lt.rgb, 0.0);
  vec3 lightB = max(uAmbB * Lt.a + Lt.rgb, 0.0);
  vec3 col = bgPart(uv);
  vec4 g = texture(uGround, uv);
  col = col * (1.0 - g.a) + g.rgb * lightA;
  vec4 h = texture(uHouse, uv);
  col = col * (1.0 - h.a) + h.rgb * lightB + emissive(h, uNight * 0.85);
  return col;
}

vec3 fullCol(vec2 uv) {
  vec4 Lt = texture(uLight, uv);
  vec3 lightA = max(uAmb * Lt.a + Lt.rgb, 0.0);
  vec3 lightB = max(uAmbB * Lt.a + Lt.rgb, 0.0);
  vec3 col = bgPart(uv);
  vec4 g = texture(uGround, uv);
  vec3 gc = g.rgb * lightA;
  float py = (1.0 - uv.y) * uSize.y;
  float inRoad = step(uGy + uRoadTop, py) * step(py, uGy + uRoadBot);
  if (inRoad > 0.5) {
    float plane = uGy + uRoadTop;
    float dy = py - plane;
    vec2 m = vec2(uv.x, 1.0 - (plane - dy) / uSize.y);
    float wob = sin(py * 0.45 + uTime * 1.5 + uv.x * 14.0) * (0.0003 + 0.0009 * uWet) + sin(py * 1.1 - uTime * 2.1 + uv.x * 31.0) * 0.0004 * uWet;
    m.x += wob;
    float rk = uReflect * (0.08 + 0.46 * uWet + 0.10 * uNight) * exp(-dy / 20.0);
    vec2 sy = vec2(0.0, 0.9 / uSize.y);
    gc += (mirrorCol(m) * 0.5 + mirrorCol(m + sy) * 0.25 + mirrorCol(m - sy) * 0.25) * rk;
  }
  col = col * (1.0 - g.a) + gc;
  vec4 h = texture(uHouse, uv);
  col = col * (1.0 - h.a) + h.rgb * lightB + emissive(h, uNight * 0.85);
  vec4 f = texture(uFront, uv);
  col = col * (1.0 - f.a) + f.rgb * lightA + emissive(f, uNight * 0.9);
  return col;
}

void main() {
  o = vec4(fullCol(vUv), 1.0);
}`;

export const PREFILTER_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThr;
void main() {
  vec3 c = texture(uSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb + texture(uSrc, vUv + uTexel * vec2(0.5, -0.5)).rgb
         + texture(uSrc, vUv + uTexel * vec2(-0.5, 0.5)).rgb + texture(uSrc, vUv + uTexel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - uThr, 0.0) / max(l, 1e-4);
  o = vec4(min(c * k, vec3(6.0)), 1.0);
}`;

export const DOWN_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec2 t = uTexel * 0.75;
  vec3 s = texture(uSrc, vUv + vec2(-t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(t.x, -t.y)).rgb
         + texture(uSrc, vUv + vec2(-t.x, t.y)).rgb + texture(uSrc, vUv + vec2(t.x, t.y)).rgb;
  o = vec4(s * 0.25, 1.0);
}`;

export const UP_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uW;
void main() {
  vec2 e = uTexel;
  vec3 s = texture(uSrc, vUv).rgb * 4.0;
  s += (texture(uSrc, vUv + vec2(e.x, 0.0)).rgb + texture(uSrc, vUv - vec2(e.x, 0.0)).rgb + texture(uSrc, vUv + vec2(0.0, e.y)).rgb + texture(uSrc, vUv - vec2(0.0, e.y)).rgb) * 2.0;
  s += texture(uSrc, vUv + e).rgb + texture(uSrc, vUv - e).rgb + texture(uSrc, vUv + vec2(e.x, -e.y)).rgb + texture(uSrc, vUv + vec2(-e.x, e.y)).rgb;
  o = vec4(s / 16.0 * uW, 1.0);
}`;

// Radiell oskärpa mot solen över de ljusa pixlarna: siluetter blockerar strålarna.
export const SHAFT_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uSun;
uniform float uDensity;
void main() {
  vec2 d = (uSun - vUv) * uDensity / 36.0;
  vec2 p = vUv;
  vec3 acc = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < 36; i++) {
    p += d;
    acc += texture(uSrc, p).rgb * w;
    w *= 0.955;
  }
  float fade = smoothstep(1.35, 0.0, length(uSun - vUv));
  o = vec4(acc * fade / 14.0, 1.0);
}`;

export const FINAL_FRAG = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uBloom, uShaft, uFx;
uniform vec2 uOut, uSunPos;
uniform float uBloomK, uShaftK, uSat, uVig, uGrain, uTime, uFxOn, uSunGlow;
uniform vec3 uShaftCol, uGradeHi, uGradeLo, uSunGlowCol;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 tone(vec3 x) {
  float s = 0.80;
  vec3 over = max(x - s, 0.0);
  return min(x, vec3(s)) + (1.0 - s) * (1.0 - exp(-over / (1.0 - s)));
}

void main() {
  vec3 c = texture(uScene, vUv).rgb;
  c += texture(uBloom, vUv).rgb * uBloomK;
  if (uShaftK > 0.0) c += texture(uShaft, vUv).rgb * uShaftCol * uShaftK;
  if (uSunGlow > 0.0) {
    vec2 d = (vUv - uSunPos) * vec2(uOut.x / uOut.y, 1.0);
    c += uSunGlowCol * uSunGlow * exp(-dot(d, d) * 6.0);
  }
  c = tone(c);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c * uGradeLo, c * uGradeHi, smoothstep(0.12, 0.85, l));
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.14);
  vec2 q = vUv - 0.5;
  float v = 1.0 - uVig * smoothstep(0.22, 0.95, length(q * vec2(1.0, 1.1)) * 1.4);
  c *= v;
  c += (hash(vUv * uOut + fract(uTime) * 37.0) - 0.5) * uGrain;
  vec4 fx = texture(uFx, vUv);
  c = c * (1.0 - fx.a * uFxOn) + fx.rgb * uFxOn;
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
