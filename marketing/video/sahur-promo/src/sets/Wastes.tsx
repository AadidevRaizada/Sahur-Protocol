// SERVER FARM WASTES (storyboard 3.2, light L5b). Ruined rack rows with dead LEDs on cracked ground, a
// coolant river running ahead-right in a concrete channel (an emissive cyan water plane with ripples and
// flowing streaks), and an amber dust storm: a low dirty-sodium sun (#c9862e, never Sahur's #ffb547),
// thick exp2 haze, drifting dust and veils. Owned by the battle builder. Pure function of `frame`.
// World: metres, Y up, ground y = 0. The corridor x ∈ [-1.6, 1.6] is clear for the action; the river's
// centre line is riverX(z) = 3.0 - 0.25 z (half width RIVER_HALF).
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { prng, hash1 } from '../rig/util';
import { Motes } from '../fx/Motes';

export const RIVER_HALF = 1.55;
export const riverX = (z: number) => 3.0 - 0.25 * z;
export const RIVER_DIR = new THREE.Vector3(0.25, 0, -1).normalize();
export const WASTES_FOG = '#5a3c20';
export const WASTES_FOG_DENSITY = 0.034;
/** scene-level fog + background: render as a DIRECT child of the canvas (attach="fog" binds to the parent object) */
export const WastesAtmos: React.FC = () => (
  <>
    <fogExp2 attach="fog" args={[WASTES_FOG, WASTES_FOG_DENSITY]} />
    <color attach="background" args={[WASTES_FOG]} />
  </>
);
/** direction TOWARD the low sodium sun (front-left, low) */
export const WASTES_SUN = new THREE.Vector3(-0.55, 0.22, -0.8).normalize();
const SODIUM = '#c9862e';

// ---------------- textures (module cache, built lazily) ----------------
let GROUND: THREE.CanvasTexture | null = null;
const groundTex = () => {
  if (GROUND) return GROUND;
  const S = 1024;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!;
  const R = prng(91);
  g.fillStyle = '#4a3a29'; g.fillRect(0, 0, S, S);
  // blotches of dust and oil
  for (let i = 0; i < 260; i++) {
    const x = R() * S, y = R() * S, r = 20 + R() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = R() < 0.5;
    gr.addColorStop(0, dark ? 'rgba(20,14,9,0.35)' : 'rgba(120,92,60,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // concrete slab seams
  g.strokeStyle = 'rgba(15,10,6,0.55)'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * S) / 4); g.lineTo(S, (i * S) / 4); g.stroke(); g.beginPath(); g.moveTo((i * S) / 4, 0); g.lineTo((i * S) / 4, S); g.stroke(); }
  // cracks: branching random walks, dark with a lit lip
  const crack = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    for (let k = 0; k < len; k++) {
      const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9;
      g.strokeStyle = 'rgba(10,6,3,0.9)'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      g.strokeStyle = 'rgba(160,120,80,0.25)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + 1.5, y + 1.5); g.lineTo(nx + 1.5, ny + 1.5); g.stroke();
      x = nx; y = ny; a += (R() - 0.5) * 0.9; w = Math.max(0.6, w * 0.97);
      if (depth < 2 && R() < 0.06) crack(x, y, a + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6), Math.floor(len * 0.5), w * 0.7, depth + 1);
    }
  };
  for (let i = 0; i < 22; i++) crack(R() * S, R() * S, R() * Math.PI * 2, 25 + Math.floor(R() * 40), 2.5 + R() * 2.5, 0);
  // grit
  for (let i = 0; i < 9000; i++) { const v = R(); g.fillStyle = v < 0.5 ? `rgba(20,14,8,${0.2 + R() * 0.3})` : `rgba(150,115,75,${0.1 + R() * 0.2})`; g.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
  GROUND = new THREE.CanvasTexture(c);
  GROUND.colorSpace = THREE.SRGBColorSpace;
  GROUND.wrapS = GROUND.wrapT = THREE.RepeatWrapping;
  GROUND.anisotropy = 8;
  return GROUND;
};

let PANEL: THREE.CanvasTexture | null = null;
const panelTex = () => {
  if (PANEL) return PANEL;
  const W = 256, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const R = prng(17);
  g.fillStyle = '#2a2a2c'; g.fillRect(0, 0, W, H);
  // frame rails
  g.fillStyle = '#121214'; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
  for (let y = 10; y < H - 20; ) {
    const u = R() < 0.25 ? 2 : 1;
    const h = 22 * u;
    if (R() < 0.12) { g.fillStyle = '#060606'; g.fillRect(16, y, W - 32, h - 2); y += h; continue; } // empty slot
    const base = 34 + Math.floor(R() * 22);
    g.fillStyle = `rgb(${base},${base},${base + 3})`; g.fillRect(16, y, W - 32, h - 2);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(16, y, W - 32, 2);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(16, y + h - 4, W - 32, 2);
    // vent dots
    g.fillStyle = 'rgba(0,0,0,0.6)';
    for (let x = 60; x < W - 40; x += 7) for (let yy = y + 5; yy < y + h - 6; yy += 6) g.fillRect(x, yy, 3, 3);
    // dead LED sockets and a handle
    g.fillStyle = '#0a0a0a'; g.fillRect(24, y + 6, 6, 5); g.fillRect(34, y + 6, 6, 5);
    g.fillStyle = '#4b4b50'; g.fillRect(W - 34, y + 4, 8, h - 10);
    y += h;
  }
  // dust and rust toward the bottom, scratches
  const gr = g.createLinearGradient(0, H * 0.55, 0, H);
  gr.addColorStop(0, 'rgba(90,60,30,0)'); gr.addColorStop(1, 'rgba(90,60,30,0.65)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(200,170,130,${0.05 + R() * 0.1})`; g.lineWidth = 1; g.beginPath(); const x = R() * W, y = R() * H; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 20); g.stroke(); }
  PANEL = new THREE.CanvasTexture(c);
  PANEL.colorSpace = THREE.SRGBColorSpace;
  PANEL.anisotropy = 8;
  return PANEL;
};

// ---------------- layout ----------------
type Rack = { x: number; z: number; yaw: number; h: number; lean: number; leanAx: number; fallen: boolean };
const isClear = (x: number, z: number) => {
  if (Math.abs(x) < 1.7 && z > -16 && z < 8) return false; // corridor
  const rx = riverX(z);
  if (Math.abs(x - rx) < RIVER_HALF + 0.9) return false; // river + banks
  if (x > 0 && x < rx && z > -11 && z < -2) return false; // the S36a riverbank stage
  return true;
};
const buildLayout = () => {
  const R = prng(2026);
  const racks: Rack[] = [];
  // rows run along z; fronts face the aisle between paired rows
  const rowsX = [-2.3, -3.5, -6.6, -7.8, -11, -12.2, 7.5, 8.7, 11.8, 13, 16.5, 17.7];
  for (let ri = 0; ri < rowsX.length; ri++) {
    const face = ri % 2 === 0 ? 1 : -1;
    for (let z = 10; z > -46; z -= 0.64) {
      let x = rowsX[ri];
      if (x > 5) x += -0.25 * z * 0.9; // the far-bank rows follow the river
      if (R() < 0.13) continue; // missing
      if (!isClear(x, z)) continue;
      const fallen = R() < 0.06;
      const broken = R() < 0.3;
      racks.push({
        x: x + (R() - 0.5) * 0.06, z, yaw: face > 0 ? Math.PI / 2 : -Math.PI / 2,
        h: broken ? 0.9 + R() * 0.9 : 2.0 + R() * 0.25,
        lean: fallen ? 1.35 + R() * 0.15 : R() < 0.22 ? (R() - 0.5) * 0.5 : (R() - 0.5) * 0.04,
        leanAx: R() < 0.5 ? 0 : 1, fallen,
      });
    }
  }
  // background rows across the view (fronts facing +z, toward the corridor): the "server farm" read
  for (const zr of [-14.5, -19.5, -25.5, -32, -40]) {
    for (let x = -20; x < 22; x += 0.64) {
      if (Math.abs(x) < 2.1 + (zr < -20 ? 0.6 : 0)) continue;
      if (Math.abs(x - riverX(zr)) < RIVER_HALF + 0.9) continue;
      if (R() < 0.1) continue;
      const broken = R() < 0.22;
      racks.push({ x: x + (R() - 0.5) * 0.04, z: zr + (R() - 0.5) * 0.1, yaw: 0, h: broken ? 0.8 + R() * 1.0 : 2.0 + R() * 0.35, lean: R() < 0.15 ? (R() - 0.5) * 0.4 : (R() - 0.5) * 0.03, leanAx: R() < 0.5 ? 0 : 1, fallen: R() < 0.04 });
    }
  }
  // a few lone broken racks dressing the corridor edges (not in it)
  const lone: [number, number, number][] = [[-1.9, -3.4, 1.1], [2.3, 4.0, 1.3], [-2.0, -12.5, 0.8]];
  for (const [x, z, h] of lone) racks.push({ x, z, yaw: 0.4, h, lean: 0.12, leanAx: 0, fallen: false });
  const leds: { x: number; y: number; z: number; yaw: number; rack: number; alive: number; hue: number }[] = [];
  racks.forEach((r, i) => {
    if (r.fallen) return;
    const n = Math.floor(r.h / 0.16);
    for (let k = 0; k < n; k++) {
      if (R() < 0.45) continue;
      leds.push({ x: 0, y: 0.12 + k * 0.16, z: 0, yaw: 0, rack: i, alive: r.yaw === 0 ? Math.min(1, R() + 0.18) : R(), hue: R() });
    }
  });
  const debris = Array.from({ length: 160 }, () => {
    let x = 0, z = 0;
    for (let k = 0; k < 8; k++) { x = (R() - 0.5) * 30; z = 8 - R() * 50; if (Math.abs(x - riverX(z)) > RIVER_HALF + 0.5) break; }
    return { x, z, s: 0.06 + R() * 0.28, yaw: R() * 6.28, tilt: (R() - 0.5) * 0.8, flat: R() < 0.5 };
  });
  const cables = Array.from({ length: 26 }, () => {
    const side = R() < 0.6 ? -1 : 1;
    const x = side < 0 ? -2.3 - R() * 9 : 8 + R() * 8;
    const z = 8 - R() * 44;
    return { x, z, len: 1.5 + R() * 3, sag: 0.3 + R() * 0.8, y: 1.6 + R() * 0.6, yaw: R() * Math.PI };
  });
  const far = Array.from({ length: 26 }, (_, i) => {
    const a = -Math.PI * 0.95 + (i / 25) * Math.PI * 0.9 + (R() - 0.5) * 0.08;
    const d = 55 + R() * 45;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, w: 6 + R() * 12, h: 4 + R() * 9, tower: R() < 0.35 };
  });
  return { racks, leds, debris, cables, far };
};
let LAYOUT: ReturnType<typeof buildLayout> | null = null;
const layout = () => (LAYOUT ??= buildLayout());

// ---------------- shaders ----------------
const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
float sq(float x){ return x * x; }
`;

const SKY_VERT = /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */ `
${NOISE}
uniform float uT; uniform vec3 uSun; uniform vec3 uHor; uniform vec3 uMid; uniform vec3 uTop; uniform vec3 uSunCol; uniform float uStorm;
varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  float e = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.18, e));
  col = mix(col, uTop, smoothstep(0.15, 0.7, e));
  float s = max(dot(d, normalize(uSun)), 0.0);
  col += uSunCol * (0.55 * pow(s, 6.0) + 1.6 * pow(s, 60.0)) * (1.0 - 0.4 * uStorm);
  // wind-blown dust bands
  float az = atan(d.z, d.x);
  float band = fbm(vec2(az * 3.0 + uT * 0.35, e * 9.0 - uT * 0.05));
  col = mix(col, uHor * 1.4, uStorm * 0.55 * smoothstep(0.35, 0.8, band) * (1.0 - smoothstep(0.05, 0.4, e)));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const WATER_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vV;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FRAG = /* glsl */ `
${NOISE}
uniform float uT; uniform vec3 uDir; uniform float uHalf; uniform vec3 uCyan; uniform vec3 uDeep; uniform float uGlow;
uniform vec2 uRingC; uniform float uRingR; uniform float uRingA;
varying vec3 vW; varying vec3 vV;
void main(){
  vec2 dir = normalize(uDir.xz);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 p = vW.xz;
  // river-local coords: s along the flow, c across (centre line x = 3.0 - 0.25 z)
  float s = dot(p, dir);
  float cx = 3.0 - 0.25 * p.y;
  float c = (p.x - cx) / uHalf;
  float flow = uT * 1.6;
  float n1 = fbm(vec2(s * 0.55 - flow, c * 2.2));
  float n2 = fbm(vec2(s * 1.7 - flow * 1.6, c * 5.0 + 3.0));
  float streak = smoothstep(0.52, 0.78, n1 * 0.65 + n2 * 0.45);
  float rip = sin(s * 6.0 - flow * 7.0 + n2 * 6.0) * 0.5 + 0.5;
  float edge = smoothstep(0.62, 1.0, abs(c));
  vec3 col = uDeep + uCyan * (0.35 + 0.25 * rip) * uGlow;
  col += uCyan * streak * 1.6 * uGlow;
  col += vec3(0.8, 1.0, 1.0) * edge * (0.6 + 0.6 * n2) * uGlow; // foam at the walls
  // fresnel sheen toward the sky
  vec3 V = normalize(vV);
  float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
  col += vec3(0.35, 0.25, 0.14) * fr * 0.6;
  // the TUNG ring rolling across the surface
  if (uRingA > 0.0) {
    float d = length(p - uRingC) - uRingR;
    float band = exp(-sq(d / 0.35)) + 0.5 * exp(-sq((d + 0.9) / 0.6));
    col += (uCyan * 2.5 + vec3(1.2)) * band * uRingA;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const VEIL_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sx = length(modelMatrix[0].xyz); float sy = length(modelMatrix[1].xyz);
  mv.xy += position.xy * vec2(sx, sy); gl_Position = projectionMatrix * mv; }`;
const VEIL_FRAG = /* glsl */ `
${NOISE}
uniform float uT; uniform vec3 uCol; uniform float uA; uniform float uSeed;
varying vec2 vUv;
void main(){
  vec2 q = vUv - 0.5;
  float n = fbm(vec2(vUv.x * 2.5 - uT * 0.4 + uSeed, vUv.y * 1.6 + uSeed * 0.3));
  float m = smoothstep(0.35, 0.75, n) * (1.0 - smoothstep(0.25, 0.5, length(q * vec2(1.0, 1.6))));
  gl_FragColor = vec4(uCol * m * uA, m * uA);
  #include <colorspace_fragment>
}`;

// ---------------- components ----------------
const Sky: React.FC<{ t: number; storm: number }> = ({ t, storm }) => {
  const m = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uSun: { value: new THREE.Vector3(-0.55, 0.1, -0.83) }, uHor: { value: new THREE.Color('#946234') }, uMid: { value: new THREE.Color('#2e2214') }, uTop: { value: new THREE.Color('#0d0a07') }, uSunCol: { value: new THREE.Color('#e0a050') }, uStorm: { value: 1 } },
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
  }), []);
  useEffect(() => () => m.dispose(), [m]);
  m.uniforms.uT.value = t;
  m.uniforms.uStorm.value = storm;
  return <mesh material={m} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[180, 48, 24]} /></mesh>;
};

const Racks: React.FC<{ frame: number }> = ({ frame }) => {
  const L = layout();
  const geo = useMemo(() => new THREE.BoxGeometry(0.62, 1, 1.0), []);
  const mats = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: '#4a4339', roughness: 0.6, metalness: 0.35 });
    const front = new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.5, metalness: 0.3, color: '#f0e6d6' });
    // box groups: +x, -x, +y, -y, +z (front), -z
    return [metal, metal, metal, metal, front, metal];
  }, []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mats, L.racks.length);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    L.racks.forEach((r, i) => {
      if (r.fallen) {
        e.set(0, r.yaw, 0, 'YXZ'); q.setFromEuler(e);
        const tip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -r.lean);
        q.multiply(tip);
        const p = new THREE.Vector3(0, 0.32, -r.h * 0.5).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r.yaw, 0)));
        M.compose(new THREE.Vector3(r.x + p.x, 0.31, r.z + p.z), q, new THREE.Vector3(1, r.h, 1));
      } else {
        e.set(r.leanAx ? r.lean : 0, r.yaw, r.leanAx ? 0 : r.lean, 'YXZ'); q.setFromEuler(e);
        const up = new THREE.Vector3(0, r.h / 2, 0).applyQuaternion(q);
        M.compose(new THREE.Vector3(r.x + up.x, up.y, r.z + up.z), q, new THREE.Vector3(1, r.h, 1));
      }
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [geo, mats, L]);
  // LEDs: mostly dead; a few dim sodium and red stragglers blink
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.05, 0.03, 0.012), []);
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);
  const leds = useMemo(() => {
    const m = new THREE.InstancedMesh(ledGeo, ledMat, L.leds.length);
    m.frustumCulled = false;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    L.leds.forEach((l, i) => {
      const r = L.racks[l.rack];
      e.set(r.leanAx ? r.lean : 0, r.yaw, r.leanAx ? 0 : r.lean, 'YXZ'); q.setFromEuler(e);
      const p = new THREE.Vector3(-0.22 + (i % 2) * 0.04, l.y, 0.507).applyQuaternion(q);
      M.compose(new THREE.Vector3(r.x + p.x, p.y, r.z + p.z), q, new THREE.Vector3(1, 1, 1));
      m.setMatrixAt(i, M);
      m.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [ledGeo, ledMat, L]);
  useEffect(() => () => { geo.dispose(); ledGeo.dispose(); ledMat.dispose(); mats.forEach((x) => x.dispose()); }, [geo, ledGeo, ledMat, mats]);
  const c = new THREE.Color();
  L.leds.forEach((l, i) => {
    let k = 0.02;
    if (l.alive > 0.8) {
      const on = hash1(Math.floor(frame / (6 + Math.floor(l.hue * 10))) + i * 13, 5) < 0.6 ? 1 : 0.08;
      k = on * (l.alive > 0.94 ? 4.0 : 2.0);
      if (l.hue < 0.35) c.set('#ff4d5e').multiplyScalar(k);
      else if (l.hue < 0.55) c.set('#3dff9d').multiplyScalar(k * 0.6);
      else c.set(SODIUM).multiplyScalar(k);
    } else c.setRGB(0.04, 0.02, 0.015);
    leds.setColorAt(i, c);
  });
  if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
  return (
    <>
      <primitive object={mesh} />
      <primitive object={leds} />
    </>
  );
};

const Debris: React.FC = () => {
  const L = layout();
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2620', roughness: 0.8, metalness: 0.4 }), []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, L.debris.length);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const M = new THREE.Matrix4();
    L.debris.forEach((d, i) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(d.tilt, d.yaw, d.tilt * 0.5));
      const s = d.flat ? new THREE.Vector3(d.s * 2.2, d.s * 0.12, d.s * 1.4) : new THREE.Vector3(d.s, d.s * 0.7, d.s * 1.2);
      M.compose(new THREE.Vector3(d.x, s.y * 0.4, d.z), q, s);
      m.setMatrixAt(i, M);
    });
    return m;
  }, [geo, mat, L]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <primitive object={mesh} />;
};

const Cables: React.FC = () => {
  const L = layout();
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const k of L.cables) {
      const a = new THREE.Vector3(k.x, k.y, k.z);
      const d = new THREE.Vector3(Math.cos(k.yaw), 0, Math.sin(k.yaw)).multiplyScalar(k.len);
      const b = a.clone().add(d);
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -k.sag, 0));
      const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -k.sag * 0.3, 0)), mid, b.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -k.sag * 0.3, 0)), b]);
      parts.push(new THREE.TubeGeometry(curve, 20, 0.018, 5, false));
    }
    return parts;
  }, [L]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f0d0b', roughness: 0.6 }), []);
  return <>{geo.map((g, i) => <mesh key={i} geometry={g} material={mat} castShadow />)}</>;
};

const Far: React.FC = () => {
  const L = layout();
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15100b', roughness: 1 }), []);
  return (
    <>
      {L.far.map((b, i) => (
        <mesh key={i} material={mat} position={[b.x, b.h / 2, b.z]}>
          {b.tower ? <cylinderGeometry args={[b.w * 0.35, b.w * 0.5, b.h, 16, 1, true]} /> : <boxGeometry args={[b.w, b.h, b.w * 0.6]} />}
        </mesh>
      ))}
    </>
  );
};

/** the coolant river: water plane + concrete channel walls + cyan light from below */
const River: React.FC<{ t: number; glow: number; ring?: { c: [number, number]; r: number; a: number }; lightsNear: number }> = ({ t, glow, ring, lightsNear }) => {
  const LEN = 110;
  const ang = Math.atan2(RIVER_DIR.x, RIVER_DIR.z); // yaw of the flow
  const mid = -30;
  const m = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDir: { value: RIVER_DIR.clone() }, uHalf: { value: RIVER_HALF }, uCyan: { value: new THREE.Color('#35e8ff') }, uDeep: { value: new THREE.Color('#031c22') }, uGlow: { value: 1 }, uRingC: { value: new THREE.Vector2() }, uRingR: { value: 0 }, uRingA: { value: 0 } },
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG,
  }), []);
  useEffect(() => () => m.dispose(), [m]);
  m.uniforms.uT.value = t;
  m.uniforms.uGlow.value = glow;
  m.uniforms.uRingA.value = ring?.a ?? 0;
  m.uniforms.uRingR.value = ring?.r ?? 0;
  if (ring) (m.uniforms.uRingC.value as THREE.Vector2).set(ring.c[0], ring.c[1]);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4b4136', roughness: 0.9 }), []);
  const lights = [-2, -8, -14, 4, -20].map((z) => [riverX(z), 0.35, z] as [number, number, number]);
  return (
    <group>
      <group position={[riverX(mid), 0.04, mid]} rotation={[0, ang, 0]}>
        <mesh material={m} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[RIVER_HALF * 2, LEN, 1, 1]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={wall} position={[s * (RIVER_HALF + 0.18), 0.12, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.36, 0.34, LEN]} />
            </mesh>
            {/* inner wall faces catch the cyan */}
            <mesh position={[s * (RIVER_HALF - 0.005), 0.08, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
              <planeGeometry args={[LEN, 0.2]} />
              <meshBasicMaterial color={new THREE.Color('#35e8ff').multiplyScalar(0.55 * glow)} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {lights.slice(0, lightsNear).map((p, i) => (
        <pointLight key={i} position={p} color="#35e8ff" intensity={7 * glow} distance={7} decay={2} />
      ))}
    </group>
  );
};

const Veils: React.FC<{ t: number; storm: number; center: [number, number, number] }> = ({ t, storm, center }) => {
  const items = useMemo(() => {
    const R = prng(55);
    return Array.from({ length: 9 }, (_, i) => ({ x: (R() - 0.5) * 22, y: 0.8 + R() * 3, z: -2 - R() * 18, w: 8 + R() * 10, h: 3 + R() * 3, seed: i * 1.7, sp: 0.6 + R() * 0.9 }));
  }, []);
  const mats = useMemo(() => items.map(() => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color('#a8763c') }, uA: { value: 0.3 }, uSeed: { value: 0 } },
    vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  })), [items]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <>
      {items.map((v, i) => {
        const m = mats[i];
        m.uniforms.uT.value = t * v.sp;
        m.uniforms.uSeed.value = v.seed;
        m.uniforms.uA.value = 0.26 * storm;
        const x = ((v.x + t * 2.2 * v.sp + 11) % 22) - 11;
        return (
          <mesh key={i} material={m} position={[center[0] + x, v.y, center[2] + v.z]} scale={[v.w, v.h, 1]} frustumCulled={false} renderOrder={8}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </>
  );
};

/** a single broken rack to dress a shot (front faces +z before `yaw`) */
export const RackProp: React.FC<{ position: [number, number, number]; yaw?: number; height?: number; lean?: number }> = ({ position, yaw = 0, height = 1.2, lean = 0 }) => {
  const mats = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: '#4a4339', roughness: 0.6, metalness: 0.35 });
    const front = new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.5, metalness: 0.3, color: '#f0e6d6' });
    return [metal, metal, metal, metal, front, metal];
  }, []);
  return (
    <group position={position} rotation={[0, yaw, lean]}>
      <mesh material={mats} position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, height, 1.0]} />
      </mesh>
      {/* the torn top edge */}
      <mesh material={mats[0]} position={[0.12, height + 0.04, 0.1]} rotation={[0.3, 0.2, 0.5]} castShadow>
        <boxGeometry args={[0.5, 0.03, 0.7]} />
      </mesh>
    </group>
  );
};

export type WastesProps = {
  frame: number;
  /** centre of the action (shadow frustum, dust): [x, z] */
  focus?: [number, number];
  storm?: number;
  river?: number;
  /** TUNG ring crossing the river surface */
  ring?: { c: [number, number]; r: number; a: number };
  /** key light multiplier (silhouette shots lower it) */
  key?: number;
  /** number of cyan river lights near the action (perf) */
  riverLights?: number;
  shadows?: boolean;
};

export const Wastes: React.FC<WastesProps> = ({ frame, focus = [0, -3], storm = 1, river = 1, ring, key = 1, riverLights = 4, shadows = true }) => {
  const t = frame / 60;
  const ground = useMemo(() => {
    const tex = groundTex().clone();
    tex.needsUpdate = true;
    tex.repeat.set(26, 26);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0, color: '#d8c8b0' });
  }, []);
  const sun = WASTES_SUN;
  const fx = focus[0], fz = focus[1];
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(fx, 0, fz);
  target.updateMatrixWorld();
  return (
    <group>
      <Sky t={t} storm={storm} />
      <mesh material={ground} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
      </mesh>
      <hemisphereLight args={['#9a7a52', '#22180e', 1.5]} />
      <primitive object={target} />
      <directionalLight
        target={target}
        position={[fx + sun.x * 30, sun.y * 30, fz + sun.z * 30]}
        color={SODIUM}
        intensity={2.5 * key}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      <Racks frame={frame} />
      <Debris />
      <Cables />
      <Far />
      <River t={t} glow={river} ring={ring} lightsNear={riverLights} />
      <Motes frame={frame} count={900} box={[22, 6, 22]} center={[fx, 2.5, fz - 4]} vel={[1.8, 0.1, 0.25]} wander={0.4} size={0.045} color="#e0a862" color2="#9a7040" intensity={1.3} opacity={0.8} />
      <Veils t={t} storm={storm} center={[fx, 0, fz]} />
    </group>
  );
};
