// THE AI BUBBLE: soap-film shader. Thin-film interference mapped through the Bubble palette, fresnel,
// a specular arc (top-left, the game's white arc), a procedural reflection of the Core (white sky,
// lavender horizon, pale ground), breathing/wobble/instability/dent/sag via vertex displacement,
// the almost-right face, the pop tear and the seam rip.
import { NOISE, BUBBLE_RAMP } from '../lib/glsl';

export const FILM_VERT = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uWobble;
uniform float uUnstable;
uniform float uSag;
uniform float uDent;
uniform float uDentAmp;
uniform float uTear;
uniform vec3 uTearDir;
varying vec3 vObj;
varying vec3 vPosW;
varying vec3 vNW;
varying vec3 vNV;

vec3 displace(vec3 p){
  float t = uTime;
  float r = 1.0 + 0.012 * sin(t * 1.3);
  float w = 0.55 * snoise(p * 1.3 + vec3(0.0, t * 0.22, t * 0.17)) + 0.45 * sin(p.x * 2.1 + t * 1.1) * sin(p.y * 1.8 + t * 0.9);
  r += uWobble * w;
  r += uUnstable * (0.7 * snoise(p * 2.7 + vec3(t * 0.9, -t * 0.7, t * 0.5)) + 0.3 * sin(p.y * 9.0 + t * 6.0));
  float fy = mix(-1.2, 1.2, uDent);
  float band = exp(-sq((p.y - fy) / 0.13));
  float dentOn = step(0.0001, uDent) * (1.0 - smoothstep(0.9, 1.0, uDent));
  r -= uDentAmp * band * dentOn;
  r += uDentAmp * 0.35 * exp(-sq((p.y - fy + 0.3) / 0.15)) * dentOn; // the bulge behind the front
  // the torn edge curls outward a little as it retracts
  if (uTear > 0.0) {
    float a = acos(clamp(dot(p, uTearDir), -1.0, 1.0));
    float hole = uTear * 3.6;
    r += 0.05 * exp(-sq((a - hole) / 0.12));
  }
  vec3 q = p * r;
  float bot = smoothstep(-0.2, -1.0, p.y);
  q.y -= uSag * 0.14 * bot;
  q.xz *= 1.0 - uSag * 0.07 * bot;
  return q;
}

void main(){
  vec3 p = normalize(position);
  vec3 d0 = displace(p);
  vec3 ref = abs(p.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tA = normalize(cross(p, ref));
  vec3 tB = normalize(cross(p, tA));
  float e = 0.012;
  vec3 d1 = displace(normalize(p + tA * e));
  vec3 d2 = displace(normalize(p + tB * e));
  vec3 n = normalize(cross(d1 - d0, d2 - d0));
  if (dot(n, p) < 0.0) n = -n;
  vObj = p;
  vec4 wp = modelMatrix * vec4(d0, 1.0);
  vPosW = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * n);
  vNV = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const FILM_FRAG = /* glsl */ `
${NOISE}
${BUBBLE_RAMP}
uniform float uTime;
uniform float uInflate;
uniform float uLeak;
uniform float uTear;
uniform vec3 uTearDir;
uniform float uSeam;
uniform float uFace;
uniform float uBack;
uniform float uFlash;
uniform float uDent;
uniform float uDentGlow;
uniform float uDark;
uniform float uOpacity;
uniform vec2 uEyeL;
uniform vec2 uEyeR;
uniform vec2 uEyeRad;
uniform vec3 uSmile; // centre y, radius, half-width
uniform float uSmileX;
uniform float uFaceStretch;
uniform mat3 uFaceRot;
uniform sampler2D uRefl;
uniform float uReflAmt;
varying vec3 vObj;
varying vec3 vPosW;
varying vec3 vNW;
varying vec3 vNV;

const vec3 VIOLET = vec3(0.275, 0.198, 1.0);
const vec3 INK = vec3(0.012, 0.008, 0.045);
const vec3 AMBER = vec3(1.0, 0.46, 0.06);

vec3 envCore(vec3 R){
  float y = R.y;
  vec3 sky = vec3(1.0);
  vec3 hor = vec3(0.80, 0.78, 0.93);
  vec3 gnd = vec3(0.58, 0.56, 0.72);
  vec3 c = mix(hor, sky, smoothstep(0.0, 0.55, y));
  c = mix(c, gnd, smoothstep(0.0, -0.3, y));
  c = mix(c, vec3(0.30, 0.28, 0.45), 0.55 * exp(-sq(y / 0.035)));
  // two soft "skylight" panels, so the film has something to mirror
  float p1 = smoothstep(0.25, 0.0, length((R.xy - vec2(-0.55, 0.62)) * vec2(1.0, 1.6)));
  float p2 = smoothstep(0.18, 0.0, length((R.xy - vec2(0.62, 0.35)) * vec2(1.6, 1.0)));
  c += vec3(0.12) * (p1 + 0.6 * p2);
  return min(c, vec3(1.0));
}
vec3 envDark(vec3 R){
  float y = R.y;
  vec3 c = mix(vec3(0.04, 0.05, 0.09), vec3(0.22, 0.24, 0.36), smoothstep(-0.2, 0.8, y));
  c += vec3(0.8, 0.85, 1.0) * smoothstep(0.25, 0.0, length((R.xy - vec2(-0.55, 0.62)) * vec2(1.0, 1.6)));
  return c;
}

float ellipseMask(vec2 p, vec2 c, float r, float aspect){
  float d = length((p - c) * vec2(1.0, aspect));
  return 1.0 - smoothstep(r - 0.006, r + 0.006, d);
}

void main(){
  vec3 N = normalize(vNW);
  if (!gl_FrontFacing) N = -N;
  #ifdef FLIP_SIDED
    N = -N;
  #endif
  vec3 V = normalize(cameraPosition - vPosW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float Fs = pow(1.0 - ndv, 1.5);
  vec3 q = vObj;

  // ---- pop tear (discard the hole, bright retracting rim) ----
  float rimT = 0.0;
  if (uTear > 0.0) {
    float a = acos(clamp(dot(q, uTearDir), -1.0, 1.0));
    float edgeN = 0.2 * snoise(q * 4.5 + 3.0) + 0.07 * snoise(q * 16.0);
    float dd = a + edgeN - uTear * 3.6;
    if (dd < 0.0) discard;
    rimT = 1.0 - smoothstep(0.0, 0.1, dd);
  }

  // ---- seam rip: a tear across the lower-left front that opens and leaks violet ----
  float seamRim = 0.0;
  float seamLeak = 0.0;
  if (uSeam > 0.0) {
    vec3 cS = normalize(vec3(-0.32, -0.12, 0.94));
    vec3 tg = normalize(vec3(1.0, 0.38, 0.12));
    vec3 nS = normalize(cross(cS, tg));
    float s = dot(q - cS, tg);
    float L = 0.62 * smoothstep(0.0, 0.35, uSeam);
    float along = clamp(1.0 - sq(s / max(L, 0.001)), 0.0, 1.0);
    float jag = 0.012 * snoise(q * 30.0);
    float off = abs(dot(q, nS) + jag);
    float w = 0.075 * uSeam * pow(along, 0.6);
    if (off < w && dot(q, cS) > 0.5) discard;
    seamRim = (1.0 - smoothstep(w, w + 0.035, off)) * step(0.001, along) * step(0.5, dot(q, cS));
    // streaks of violet running down from the seam's lower lip
    float side = dot(q, nS);
    float below = side < 0.0 ? 1.0 : 0.0;
    float streak = smoothstep(0.35, 0.9, snoise(vec3(s * 22.0, 0.0, 1.0)) * 0.5 + 0.5);
    float runLen = 0.08 + 0.5 * uSeam * (0.4 + 0.6 * (snoise(vec3(s * 9.0, 4.0, 2.0)) * 0.5 + 0.5));
    float drop = (1.0 - smoothstep(0.0, runLen, -side - w)) * below * step(0.001, along) * step(0.5, dot(q, cS));
    seamLeak = max(streak * drop, (1.0 - smoothstep(0.0, 0.05, -side - w)) * below * step(0.001, along)) * uSeam;
  }

  // ---- thin film thickness field: swirling bands, drained to the bottom ----
  float t = uTime;
  float sw = 0.7 * snoise(q * 1.05 + vec3(0.0, t * 0.05, t * 0.03)) + 0.3 * snoise(q * 2.3 + vec3(t * 0.04, 1.0, 0.0));
  vec3 qw = q + 0.42 * vec3(snoise(q * 0.9 + vec3(3.1, t * 0.04, 0.0)), snoise(q * 0.9 + vec3(7.3, -t * 0.03, 2.0)), snoise(q * 0.9 + vec3(1.7, 0.0, t * 0.035)));
  float bands = sin(qw.y * 7.0 + sw * 3.6 + t * 0.3) + 0.35 * sin(qw.y * 15.0 + qw.x * 2.0 - t * 0.5);
  float drain = smoothstep(1.0, -1.0, q.y);
  float d = 250.0 + 540.0 * drain + 150.0 * sw + 70.0 * bands;
  d *= 1.0 - 0.45 * uInflate;
  float cosT = sqrt(max(0.0, 1.0 - (1.0 - ndv * ndv) / 1.77));
  float opd = 2.0 * 1.33 * d * cosT;
  vec3 phys = 0.5 - 0.5 * cos(6.2831853 * opd / vec3(650.0, 532.0, 450.0));
  float h = opd / 1050.0 + 0.06 * sw;
  vec3 pal = bubbleRamp(h);
  vec3 film = mix(pal, pal * (0.35 + 1.25 * phys), 0.22);
  float lum = dot(film, vec3(0.2126, 0.7152, 0.0722));
  film = max(vec3(0.0), mix(vec3(lum), film, 1.35 + 0.7 * uInflate));

  // ---- reflection of the world ----
  vec3 R = reflect(-V, N);
  vec3 E = mix(envCore(R), envDark(R), uDark);
  if (uReflAmt > 0.0) {
    vec2 ruv = vec2(atan(R.z, R.x) / 6.2831853 + 0.5, asin(clamp(R.y, -1.0, 1.0)) / 3.14159265 + 0.5);
    E = mix(E, texture2D(uRefl, ruv).rgb, uReflAmt * 0.6);
  }
  vec3 col = film * E;
  float alpha = mix(0.07, 0.9, Fs) + 0.14 * (1.0 - clamp(lum, 0.0, 1.0)) * Fs;
  alpha *= mix(1.0, 0.82, uInflate * (1.0 - Fs));

  // ink-like silhouette line so it reads against white
  float edge = smoothstep(0.86, 0.985, 1.0 - ndv);
  col = mix(col, VIOLET * 0.42, edge * 0.55);
  alpha = max(alpha, edge * 0.9);

  // leak: violet pools at the bottom
  float pool = uLeak * smoothstep(-0.2, -0.95, q.y + 0.08 * snoise(q * 3.0 + uTime * 0.2));
  col = mix(col, VIOLET * 0.72, pool * 0.85);
  alpha = max(alpha, pool * 0.85);

  // back pass: the far wall of the film, seen through the front
  if (uBack > 0.5) {
    col *= 0.9;
    alpha *= 0.5;
  } else {
    vec3 Nv = normalize(vNV);
    // ---- the almost-right face, painted on the INSIDE of the film ----
    // spherical (lon, lat) coordinates so the too-wide smile wraps around the curvature
    vec3 qf = uFaceRot * q;
    float faceMask = 0.0;
    if (uFace > 0.0 && qf.z > 0.0) {
      vec2 f = vec2(atan(qf.x, qf.z), asin(clamp(qf.y, -1.0, 1.0)));
      // the face stretches away from the tear as the bubble rips
      f = mix(f, f * (1.0 + uFaceStretch * 0.6) - uTearDir.xy * uFaceStretch * 0.25, uFaceStretch);
      float facing = smoothstep(0.05, 0.3, qf.z);
      float soft = 0.012;
      float dL = length((f - uEyeL) * vec2(1.0, 0.8)) / uEyeRad.x;
      float dR = length((f - uEyeR) * vec2(1.0, 0.78)) / uEyeRad.y;
      float eL = 1.0 - smoothstep(1.0 - soft / uEyeRad.x, 1.0 + soft / uEyeRad.x, dL);
      float eR = 1.0 - smoothstep(1.0 - soft / uEyeRad.y, 1.0 + soft / uEyeRad.y, dR);
      // smile: a thin arc, too wide, never in sync with the eyes
      vec2 sc = vec2(uSmileX, uSmile.x);
      vec2 fsm = vec2(f.x, f.y - f.x * 0.07); // the smile sits a little crooked
      float sd = length(fsm - sc);
      float th = 0.019;
      float inArc = step(fsm.y, sc.y - uSmile.y * 0.25) * step(abs(fsm.x - uSmileX), uSmile.z);
      float sm = (1.0 - smoothstep(th - 0.007, th + 0.007, abs(sd - uSmile.y))) * inArc;
      float endA = sqrt(max(0.0, uSmile.y * uSmile.y - uSmile.z * uSmile.z));
      vec2 e1 = sc + vec2(-uSmile.z, -endA);
      vec2 e2 = sc + vec2(uSmile.z, -endA);
      sm = max(sm, 1.0 - smoothstep(th - 0.007, th + 0.007, length(fsm - e1)));
      sm = max(sm, 1.0 - smoothstep(th - 0.007, th + 0.007, length(fsm - e2)));
      float eyes = max(eL, eR);
      float face = clamp(max(eyes, sm * 0.92), 0.0, 1.0) * facing * uFace;
      faceMask = face;
      // glossy dark eyes: deeper at the centre, the film's colour creeping in at the rim
      float eyeD = max(eL * (1.0 - dL), eR * (1.0 - dR));
      // glossy deep-indigo eyes: near black in the middle, a faint film-tinted rim
      vec3 ink = mix(INK * 2.0 + film * 0.02, INK * 0.4, smoothstep(0.0, 0.45, eyeD));
      ink = mix(ink, INK * 0.9 + film * 0.012, 1.0 - eyes); // the smile
      // near-opaque in the middle, translucent (film showing through) toward the rims
      float depthAmt = mix(0.84, 0.997, smoothstep(0.0, 0.5, eyeD) * eyes + (1.0 - eyes) * 0.85);
      col = mix(col, ink, face * depthAmt);
      alpha = max(alpha, face * mix(0.86, 0.998, smoothstep(0.0, 0.5, eyeD) * eyes + (1.0 - eyes) * 0.8));
      // an inner window reflection curving across the top of each eye (wet, glossy)
      vec2 wl = (f - uEyeL) / uEyeRad.x;
      vec2 wr = (f - uEyeR) / uEyeRad.y;
      float winL = exp(-sq((length(wl - vec2(0.12, -0.2)) - 0.74) / 0.035)) * smoothstep(0.1, 0.5, wl.y) * smoothstep(0.6, -0.3, wl.x);
      float winR = exp(-sq((length(wr - vec2(0.12, -0.2)) - 0.74) / 0.035)) * smoothstep(0.1, 0.5, wr.y) * smoothstep(0.6, -0.3, wr.x);
      col += vec3(0.75, 0.8, 1.0) * 0.22 * (winL * eL + winR * eR) * facing * uFace;
      // tiny specular dots, same light for both eyes (the bigger one is a little off)
      float gL = 1.0 - smoothstep(0.004, 0.012, length(f - (uEyeL + vec2(-0.32, 0.36) * uEyeRad.x)));
      float gR = 1.0 - smoothstep(0.005, 0.015, length(f - (uEyeR + vec2(-0.2, 0.44) * uEyeRad.y)));
      col += vec3(3.0) * (gL * eL + gR * eR) * facing * uFace;
      // a soft rim sheen around the lower edge of each eye (wet)
      float sheen = smoothstep(0.75, 0.98, dL) * eL * step(f.y, uEyeL.y) + smoothstep(0.75, 0.98, dR) * eR * step(f.y, uEyeR.y);
      col += film * 0.6 * sheen * facing * uFace;
    }

    // ---- outer surface highlights, over the face (the face is inside the film) ----
    // the specular arc (game: a white arc at the top-left)
    vec2 ac = Nv.xy - vec2(-0.16, 0.16);
    float ar = length(ac);
    float aa = atan(ac.y, ac.x);
    float arcBand = exp(-sq((ar - 0.63) / 0.02)) + 0.35 * exp(-sq((ar - 0.6) / 0.05));
    float arcSpan = smoothstep(0.75, 1.15, aa) * (1.0 - smoothstep(2.35, 2.85, aa));
    float arc = arcBand * arcSpan;
    // a smaller pink bounce arc at the lower right
    vec2 bc = Nv.xy - vec2(0.22, -0.2);
    float br = length(bc);
    float ba = atan(bc.y, bc.x);
    float barc = exp(-sq((br - 0.55) / 0.022)) * smoothstep(-1.9, -1.5, ba) * (1.0 - smoothstep(-0.75, -0.45, ba));
    vec3 L = normalize(vec3(-0.5, 0.62, 0.62));
    vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
    float hot = pow(clamp(dot(Nv, Hh), 0.0, 1.0), 420.0) * 3.0 + pow(clamp(dot(Nv, Hh), 0.0, 1.0), 40.0) * 0.18 * (1.0 - 0.9 * faceMask);
    col += vec3(1.0) * (arc * 3.0 + hot) + vec3(1.0, 0.7, 0.95) * barc * 1.2;
    alpha = max(alpha, clamp(arc * 1.2 + hot + barc * 0.8, 0.0, 1.0));
    // the film's own colour washes faintly over the face, so it sits under the surface
    col = mix(col, col * 0.94 + film * 0.06, 0.4 * (1.0 - 0.9 * faceMask));
  }

  // TUNG energy riding the dent front
  if (uDent > 0.0 && uDent < 1.0) {
    float fy = mix(-1.2, 1.2, uDent);
    float band = exp(-sq((q.y - fy) / 0.1));
    // a saturated amber band (mixed, not added, so it stays amber on a white world) with a hot core
    col = mix(col, AMBER * 1.35, band * 0.9 * uDentGlow);
    col += vec3(1.0, 0.7, 0.3) * exp(-sq((q.y - fy) / 0.018)) * 1.2 * uDentGlow;
    alpha = max(alpha, band * 0.95 * uDentGlow);
  }

  col = mix(col, vec3(3.0, 2.7, 3.2), rimT);
  alpha = max(alpha, rimT);
  col = mix(col, VIOLET * 1.6 + vec3(0.25, 0.1, 0.5), seamRim);
  alpha = max(alpha, seamRim);
  col = mix(col, VIOLET * 0.62, seamLeak * 0.9);
  alpha = max(alpha, seamLeak * 0.92);

  col = mix(col, vec3(2.4), uFlash);
  gl_FragColor = vec4(col, clamp(alpha * uOpacity, 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
