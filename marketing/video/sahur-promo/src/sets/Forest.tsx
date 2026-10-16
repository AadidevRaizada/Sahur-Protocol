// THE HYPE CYCLE FOREST (owner: journey builder). Used by Journey (S15, S17, S19, S21, S22-S26) and by
// Battle (S27-S32, mood 'fight'). Keep this API stable; add props, never rename them.
//
// Metres, Y up, ground at y = 0. The main clearing is centred on `center` (default the origin).
// Everything is a pure function of `time` (frames, default useCurrentFrame()) and the props: trees are
// placed by a seeded PRNG, veins flicker in hashed pixel steps, fireflies are GPU points.
//
//   <Forest
//     mood="night" | "dusk" | "fire" | "fight"   light, fog, sky and vein colours (FOREST_MOODS)
//     seed={1}                                   layout seed (same seed = same forest)
//     time={frame}                               animation clock in frames
//     center={[0, 0]} clearing={4}               main clearing (x, z) and radius: no trees, flat ground
//     clearings={[{ x, z, r }]}                  extra tree-free circles
//     paths={[{ from: [x, z], to: [x, z], width }]}  tree-free corridors (walks, runs)
//     extent={30} trees={90}                     forest radius around `center` and trunk count
//     pulse={0}                                  vein pulse 0..1 (x1.5 brightness at 1: stump taps, TUNGs)
//     veins={1}                                  vein brightness multiplier
//     stump={[x, z] | null}                      a mossy stump (also exported as <Stump>)
//     logs={[{ x, z, rot, len, r }]}             fallen logs (also exported as <FallenLog>)
//     extraTrees={[{ x, z, r, h, lean? }]}       hand-placed hero trunks (always present)
//     fireflies={90}                             glitch fireflies (pixel squares, green/cyan)
//     groundCover={true}                         tufts, glowing mushrooms, stones
//     lights={true} fog={true} sky={true}        mood hemisphere + key light, FogExp2 (set on the scene by
//                                                <ForestAtmos>, also exported), sky dome
//     keyShadow={false}                          let the mood key light cast shadows
//   />
//
// Lighting note: amber #ffb547 never comes from the forest (Paperman rule). Sahur's lantern and the
// campfire (src/sets/Campfire.tsx) are the only warm sources.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useThree } from '@react-three/fiber';
import { prng, clamp, lerp, noise2, smooth } from '../rig/util';
import { Motes } from '../fx/Motes';

export type ForestMood = 'dusk' | 'night' | 'fire' | 'fight';
type V3 = [number, number, number];
export type Clearing = { x: number; z: number; r: number };
export type ForestPath = { from: [number, number]; to: [number, number]; width: number };
export type LogSpec = { x: number; z: number; rot: number; len: number; r?: number };
export type TreeSpec = { x: number; z: number; r: number; h: number; lean?: [number, number]; variant?: number; phase?: number };

export type MoodSpec = {
  fog: string; fogDensity: number;
  skyTop: string; skyHorizon: string;
  hemiSky: string; hemiGround: string; hemiInt: number;
  keyColor: string; keyInt: number; keyDir: V3;
  vein: string; vein2: string; veinInt: number; veinMix: number; scan: number;
  mush: string[]; groundTint: string; barkTint: string;
  flies: [string, string]; flyInt: number;
};

/** Light states L3 (night), dusk (S21), L4 (fire) and L5a (fight), storyboard section 2. */
export const FOREST_MOODS: Record<ForestMood, MoodSpec> = {
  night: {
    fog: '#11271d', fogDensity: 0.06, skyTop: '#030907', skyHorizon: '#143024',
    hemiSky: '#1f4d38', hemiGround: '#050a07', hemiInt: 4.5, keyColor: '#9fd8c0', keyInt: 1.0, keyDir: [-0.35, 1, -0.55],
    vein: '#3dff9d', vein2: '#35e8ff', veinInt: 1.5, veinMix: 0.14, scan: 0.22,
    mush: ['#3dff9d', '#35e8ff', '#3dff9d'], groundTint: '#b4c4ae', barkTint: '#c4ccbc', flies: ['#3dff9d', '#35e8ff'], flyInt: 2.4,
  },
  dusk: {
    fog: '#1a2d34', fogDensity: 0.045, skyTop: '#070b14', skyHorizon: '#243a44',
    hemiSky: '#35565e', hemiGround: '#06090a', hemiInt: 5.0, keyColor: '#9cc4d8', keyInt: 1.2, keyDir: [0.3, 0.6, -1],
    vein: '#3dff9d', vein2: '#35e8ff', veinInt: 1.1, veinMix: 0.2, scan: 0.18,
    mush: ['#3dff9d', '#35e8ff', '#7affc4'], groundTint: '#b4c0b6', barkTint: '#c2cac4', flies: ['#3dff9d', '#35e8ff'], flyInt: 2.0,
  },
  fire: {
    fog: '#0b0806', fogDensity: 0.07, skyTop: '#010103', skyHorizon: '#0b0710',
    hemiSky: '#120d1c', hemiGround: '#000000', hemiInt: 1.5, keyColor: '#6a4cff', keyInt: 0.55, keyDir: [0.15, 0.45, -1],
    vein: '#a35cff', vein2: '#35e8ff', veinInt: 1.8, veinMix: 0.12, scan: 0.12,
    mush: ['#b46bff', '#35e8ff', '#ff3df0'], groundTint: '#b8a89a', barkTint: '#bcb0b0', flies: ['#b46bff', '#35e8ff'], flyInt: 2.2,
  },
  fight: {
    fog: '#0b1410', fogDensity: 0.05, skyTop: '#020504', skyHorizon: '#0b1410',
    hemiSky: '#1f4d38', hemiGround: '#050a07', hemiInt: 4.0, keyColor: '#3dff9d', keyInt: 1.6, keyDir: [0, 1, -0.8],
    vein: '#3dff9d', vein2: '#35e8ff', veinInt: 2.2, veinMix: 0.18, scan: 0.45,
    mush: ['#3dff9d', '#35e8ff', '#ff3df0'], groundTint: '#b4c4ae', barkTint: '#c4ccbc', flies: ['#3dff9d', '#35e8ff'], flyInt: 2.8,
  },
};

export type ForestProps = {
  mood?: ForestMood;
  seed?: number;
  time?: number;
  center?: [number, number];
  clearing?: number;
  clearings?: Clearing[];
  paths?: ForestPath[];
  extent?: number;
  trees?: number;
  pulse?: number;
  veins?: number;
  stump?: [number, number] | null;
  logs?: LogSpec[];
  extraTrees?: TreeSpec[];
  fireflies?: number;
  groundCover?: boolean;
  lights?: boolean;
  fog?: boolean;
  sky?: boolean;
  keyShadow?: boolean;
};

// ---------------------------------------------------------------- textures (module cache, seeded)
const cache = new Map<string, THREE.Texture>();
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const once = <T extends THREE.Texture>(k: string, f: () => T): T => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) as T; };
const canvasTex = (c: HTMLCanvasElement, srgb: boolean, rep: [number, number] = [1, 1]) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  return t;
};

/** dark, fissured bark: colour (sRGB) and a matching height map; moss creeping up from the base */
const barkTex = (bump: boolean) => once(bump ? 'barkB' : 'barkC', () => {
  const w = 256, h = 1024, c = mk(w, h), g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // vertical fissures: stretched noise across x, slow along y
    const u = x / w, v = y / h;
    const f1 = noise2(u * 18, v * 2.2, 11), f2 = noise2(u * 41, v * 5.5, 12), f3 = noise2(u * 90, v * 30, 13);
    const ridge = 1 - Math.abs(f1) * 1.6;
    const height = clamp(0.5 + 0.38 * ridge + 0.18 * f2 + 0.08 * f3);
    const i = (y * w + x) * 4;
    if (bump) { const b = Math.round(height * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = b; }
    else {
      const k = 0.35 + 0.65 * height;
      // moss near the base (canvas bottom = trunk base)
      const moss = clamp((v - 0.9) / 0.1) * (0.6 + 0.4 * noise2(u * 12, v * 40, 14));
      const r = lerp(118, 74, moss) * k, gg = lerp(112, 120, moss) * k, b = lerp(100, 70, moss) * k;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b;
    }
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvasTex(c, !bump, [2, 3]);
});

/** pixel-art veins: circuit traces climbing the trunk in 1-px steps, with nodes. White on black (emissive). */
const veinTex = (variant: number) => once('vein' + variant, () => {
  const W = 128, H = 576, c = mk(W, H), g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const R = prng(40 + variant * 17);
  const px = (x: number, y: number, a: number) => { g.fillStyle = `rgba(255,255,255,${clamp(a)})`; g.fillRect(((Math.round(x) % W) + W) % W, Math.round(y), 1, 1); };
  const n = 3 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    let x = Math.floor(R() * W);
    let y = H - 1;
    const top = H * (0.3 + R() * 0.45);
    const a0 = 0.65 + R() * 0.35;
    // root run along the flare first
    const rootLen = 2 + Math.floor(R() * 6), rootDir = R() < 0.5 ? -1 : 1;
    for (let i = 0; i < rootLen; i++) px(x - rootDir * i, H - 1 - Math.floor(i / 3), a0 * 0.9);
    while (y > top) {
      const fade = smooth((y - top) / (H * 0.18));
      px(x, y, a0 * fade);
      y -= 1;
      const r = R();
      if (r < 0.07) { const s = R() < 0.5 ? -1 : 1; const len = 1 + Math.floor(R() * 3); for (let i = 0; i < len; i++) { x += s; px(x, y, a0 * fade); } }
      else if (r < 0.085) { const s = R() < 0.5 ? -1 : 1; const len = 2 + Math.floor(R() * 5); for (let i = 1; i <= len; i++) px(x + s * i, y, a0 * fade * 0.85); px(x + s * len, y - 1, a0 * fade * 0.85); }
      else if (r < 0.095) { g.fillStyle = `rgba(255,255,255,${a0 * fade})`; g.fillRect(((x - 1) % W + W) % W, y - 1, 2, 2); }
    }
    // a terminal node
    g.fillStyle = `rgba(255,255,255,${a0 * 0.5})`; g.fillRect(((x - 1) % W + W) % W, Math.round(top) - 1, 2, 2);
  }
  // sparse loose pixels (data specks)
  for (let i = 0; i < 40; i++) px(Math.floor(R() * W), H * (0.35 + R() * 0.65), 0.3 + R() * 0.4);
  const t = canvasTex(c, false);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
});

/** moss and leaf-litter ground */
const groundTex = () => once('forestGround', () => {
  const s = 512, c = mk(s, s), g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  const R = prng(77);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const m = noise2(x / 70, y / 70, 21) * 0.6 + noise2(x / 22, y / 22, 22) * 0.3 + noise2(x / 6, y / 6, 23) * 0.18;
    const moss = clamp(0.5 + m);
    const n = (R() - 0.5) * 0.12;
    const i = (y * s + x) * 4;
    img.data[i] = (lerp(92, 58, moss) + n * 60);
    img.data[i + 1] = (lerp(76, 96, moss) + n * 60);
    img.data[i + 2] = (lerp(58, 56, moss) + n * 45);
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // leaf litter and twigs
  for (let i = 0; i < 700; i++) {
    const x = R() * s, y = R() * s, l = 2 + R() * 7, a = R() * Math.PI;
    g.strokeStyle = `rgba(${48 + R() * 30},${36 + R() * 20},${22 + R() * 10},${0.35 + R() * 0.4})`;
    g.lineWidth = 0.8 + R() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(70,96,62,${0.25 + R() * 0.35})`; g.fillRect(R() * s, R() * s, 1 + R() * 2, 1 + R() * 2); }
  return canvasTex(c, true, [1, 1]);
});

/** cut-wood rings for stumps and log ends */
const ringsTex = () => once('forestRings', () => {
  const s = 256, c = mk(s, s), g = c.getContext('2d')!;
  g.fillStyle = '#5a3a20'; g.fillRect(0, 0, s, s);
  const R = prng(5);
  for (let r = 4; r < s / 2; r += 3 + R() * 4) {
    g.strokeStyle = `rgba(${40 + R() * 20},${24 + R() * 10},${12},${0.35 + R() * 0.35})`;
    g.lineWidth = 1 + R() * 1.5;
    g.beginPath();
    for (let a = 0; a <= 64; a++) { const th = (a / 64) * Math.PI * 2; const rr = r * (1 + 0.04 * Math.sin(th * 3 + r)); g.lineTo(s / 2 + Math.cos(th) * rr, s / 2 + Math.sin(th) * rr); }
    g.stroke();
  }
  // cracks and a dark bark rim with moss
  g.strokeStyle = 'rgba(20,10,4,0.7)'; g.lineWidth = 2;
  for (let k = 0; k < 5; k++) { const a = R() * Math.PI * 2; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * 10, s / 2 + Math.sin(a) * 10); g.lineTo(s / 2 + Math.cos(a) * s * 0.45, s / 2 + Math.sin(a) * s * 0.45); g.stroke(); }
  const gr = g.createRadialGradient(s / 2, s / 2, s * 0.4, s / 2, s / 2, s * 0.5);
  gr.addColorStop(0, 'rgba(25,22,16,0)'); gr.addColorStop(0.5, 'rgba(25,22,16,0.9)'); gr.addColorStop(1, 'rgba(30,48,26,1)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return canvasTex(c, true);
});

// ---------------------------------------------------------------- materials
type VeinUniforms = { uTime: { value: number }; uPulse: { value: number }; uGain: { value: number }; uScan: { value: number } };
/** bark + emissive pixel veins with hashed per-tree flicker steps and a scan pulse climbing the trunk */
function makeTrunkMaterial(variant: number, mood: MoodSpec, instanced: boolean) {
  const m = new THREE.MeshStandardMaterial({
    map: barkTex(false), bumpMap: barkTex(true), bumpScale: 2.2, roughness: 0.92,
    color: new THREE.Color(mood.barkTint), emissive: new THREE.Color(1, 1, 1), emissiveMap: veinTex(variant), emissiveIntensity: 1,
  });
  const u: VeinUniforms = { uTime: { value: 0 }, uPulse: { value: 0 }, uGain: { value: 1 }, uScan: { value: 0.2 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${instanced ? 'attribute vec4 aVein;' : 'uniform vec4 aVeinU;'}\nvarying vec4 vVein;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvVein = ${instanced ? 'aVein' : 'aVeinU'};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime; uniform float uPulse; uniform float uGain; uniform float uScan;\nvarying vec4 vVein;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // vVein: x = phase, y = speed, z = colour mix (0 = vein, 1 = vein2), w = brightness
        float st = floor(uTime * 12.0 + vVein.x * 7.0);
        float h = fract(sin(st * 12.9898 + vVein.x * 78.233) * 43758.5453);
        float lvl = h < 0.05 ? 0.12 : (h < 0.22 ? 0.6 : (h < 0.45 ? 0.82 : 1.0));
        float yq = floor(vEmissiveMapUv.y * 96.0) / 96.0;
        float band = fract(yq * 1.6 - uTime * uScan * (0.6 + vVein.y) + vVein.x);
        float scan = smoothstep(0.9, 1.0, band);
        totalEmissiveRadiance *= mix(uVeinA, uVeinB, vVein.z) * uGain * vVein.w * (lvl + 1.4 * scan) * (1.0 + 0.5 * uPulse);
      }`)
      .replace('uniform float uTime;', 'uniform float uTime; uniform vec3 uVeinA; uniform vec3 uVeinB;');
    sh.uniforms.uVeinA = { value: new THREE.Color(mood.vein).multiplyScalar(mood.veinInt) };
    sh.uniforms.uVeinB = { value: new THREE.Color(mood.vein2).multiplyScalar(mood.veinInt) };
    if (!instanced) sh.uniforms.aVeinU = (m.userData.aVeinU ??= { value: new THREE.Vector4(0.3, 0.5, 0, 1) });
    m.userData.shader = sh;
  };
  m.customProgramCacheKey = () => `forestVein:${instanced ? 1 : 0}:${mood.vein}:${mood.vein2}:${mood.veinInt}`;
  m.userData.u = u;
  return m;
}

// ---------------------------------------------------------------- geometry
const trunkGeoCache = new Map<string, THREE.BufferGeometry>();
/**
 * unit trunk: radius 1 above the flare, height 1, root flare and lumpy bark; uv v = row fraction.
 * `flare` = height fraction of the root flare (trunks 0.07, stumps 0.45); `taper` = top radius.
 */
function trunkGeometry(variant: number, flare = 0.07, taper = 0.62) {
  const key = `${variant}:${flare}:${taper}`;
  if (trunkGeoCache.has(key)) return trunkGeoCache.get(key)!;
  const g = new THREE.CylinderGeometry(1, 1, 1, 28, 40, true);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const R = prng(300 + variant);
  const roots = 4 + Math.floor(R() * 3), rp = R() * 6.28;
  const rowPow = flare < 0.2 ? 1.6 : 1.0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x);
    // non-linear height spacing: more rows near the base for the flare
    const yy = Math.pow(y, rowPow);
    const tp = lerp(1, taper, yy);
    const fl = 1 + 0.85 * Math.pow(clamp(1 - yy / flare), 2);
    const root = 1 + 0.75 * Math.pow(Math.max(0, Math.cos(roots * th + rp)), 6) * Math.pow(clamp(1 - yy / (flare * 0.7)), 1.5);
    const lump = 1 + 0.07 * noise2(th * 2.2 + variant, yy * 9, 400 + variant) + 0.03 * noise2(th * 6, yy * 30, 410 + variant);
    const r = tp * fl * root * lump;
    p.setXYZ(i, Math.cos(th) * r, yy, Math.sin(th) * r);
  }
  g.computeVertexNormals();
  trunkGeoCache.set(key, g);
  return g;
}

/** a clump of thin tapered blades (fern/grass tuft), unit height, vertex-coloured dark to lighter tips */
let TUFT: THREE.BufferGeometry | null = null;
function tuftGeometry() {
  if (TUFT) return TUFT;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const R = prng(91);
  const base = new THREE.Color('#0b140c'), tip = new THREE.Color('#2f5a33');
  for (let b = 0; b < 9; b++) {
    const a = (b / 9) * Math.PI * 2 + R() * 0.5;
    const out = 0.25 + R() * 0.45, hgt = 0.6 + R() * 0.5, w = 0.05 + R() * 0.03;
    const dx = Math.cos(a), dz = Math.sin(a);
    const v0 = pos.length / 3;
    const seg = 4;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const cx = dx * out * t * t, cz = dz * out * t * t, cy = hgt * Math.sin(t * Math.PI * 0.45) / Math.sin(Math.PI * 0.45);
      const ww = w * (1 - t);
      pos.push(cx - dz * ww, cy, cz + dx * ww, cx + dz * ww, cy, cz - dx * ww);
      const c = base.clone().lerp(tip, t);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    for (let s = 0; s < seg; s++) { const k = v0 + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  TUFT = g;
  return g;
}

// ---------------------------------------------------------------- layout (pure)
export type ForestLayout = {
  trees: (TreeSpec & { variant: number; phase: number; vmix: number; bright: number; speed: number })[];
  tufts: { x: number; z: number; s: number; rot: number }[];
  mush: { x: number; z: number; s: number; c: number }[];
  stones: { x: number; z: number; s: number; rot: number }[];
};

const segDist = (px: number, pz: number, a: [number, number], b: [number, number]) => {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const t = clamp(((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz || 1));
  return Math.hypot(px - (a[0] + vx * t), pz - (a[1] + vz * t));
};

/** how "open" a point is: 0 inside a clearing/path, 1 well outside (soft margin `m` metres) */
export function forestOpenness(x: number, z: number, p: Pick<ForestProps, 'center' | 'clearing' | 'clearings' | 'paths'>, m = 1.5) {
  const c = p.center ?? [0, 0];
  let d = Math.hypot(x - c[0], z - c[1]) - (p.clearing ?? 4);
  for (const k of p.clearings ?? []) d = Math.min(d, Math.hypot(x - k.x, z - k.z) - k.r);
  for (const q of p.paths ?? []) d = Math.min(d, segDist(x, z, q.from, q.to) - q.width / 2);
  return smooth(d / m);
}

export function forestLayout(p: ForestProps): ForestLayout {
  const seed = p.seed ?? 1;
  const R = prng(seed * 7919 + 13);
  const c = p.center ?? [0, 0];
  const ext = p.extent ?? 30;
  const want = p.trees ?? 90;
  const trees: ForestLayout['trees'] = [];
  const add = (t: TreeSpec, i: number) => trees.push({
    ...t, variant: t.variant ?? i % 3, phase: t.phase ?? R(), vmix: R() < 0.16 ? 1 : 0, bright: 0.55 + R() * 0.6, speed: R(),
  });
  (p.extraTrees ?? []).forEach((t, i) => add(t, i));
  let tries = 0;
  while (trees.length < want + (p.extraTrees?.length ?? 0) && tries < want * 40) {
    tries++;
    // denser near the clearing edge: radius ~ sqrt for even area, biased inward
    const a = R() * Math.PI * 2;
    const rr = Math.pow(R(), 0.8) * ext;
    const x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr;
    if (forestOpenness(x, z, p, 0.01) < 1) continue;
    const r = 0.22 + Math.pow(R(), 1.8) * 0.5;
    let ok = true;
    for (const t of trees) if (Math.hypot(t.x - x, t.z - z) < (t.r + r) * 2.2 + 0.6) { ok = false; break; }
    if (!ok) continue;
    add({ x, z, r, h: 9 + R() * 6, lean: [(R() - 0.5) * 0.06, (R() - 0.5) * 0.06] }, trees.length);
  }
  const tufts: ForestLayout['tufts'] = [];
  const mush: ForestLayout['mush'] = [];
  const stones: ForestLayout['stones'] = [];
  if (p.groundCover ?? true) {
    const nT = Math.round(ext * ext * 0.75);
    for (let i = 0; i < nT; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * ext;
      const x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr;
      const o = forestOpenness(x, z, p, 2.5);
      if (R() > 0.15 + 0.85 * o) continue;
      tufts.push({ x, z, s: (0.14 + R() * 0.26) * (0.5 + 0.5 * o), rot: R() * 6.28 });
    }
    // glowing mushrooms in small clusters at trunk bases
    for (const t of trees) {
      if (R() > 0.7) continue;
      const n = 3 + Math.floor(R() * 6), a0 = R() * 6.28, col = Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const a = a0 + (R() - 0.5) * 1.4, d = t.r * 1.5 + 0.08 + R() * 0.45;
        mush.push({ x: t.x + Math.cos(a) * d, z: t.z + Math.sin(a) * d, s: 0.6 + R() * 1.1, c: col });
      }
    }
    const nS = Math.round(ext * 2.2);
    for (let i = 0; i < nS; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * ext;
      const x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr;
      if (forestOpenness(x, z, p, 1) < 0.5 && R() < 0.7) continue;
      stones.push({ x, z, s: 0.05 + Math.pow(R(), 2) * 0.25, rot: R() * 6.28 });
    }
  }
  return { trees, tufts, mush, stones };
}

/** ground height (gentle undulation, flat in clearings and paths) */
export function forestGroundY(x: number, z: number, p: ForestProps) {
  const o = forestOpenness(x, z, p, 3);
  return o * (0.18 * noise2(x / 5, z / 5, 31) + 0.06 * noise2(x / 1.7, z / 1.7, 32));
}

// ---------------------------------------------------------------- pieces
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

const Trunks: React.FC<{ layout: ForestLayout; mood: MoodSpec; time: number; pulse: number; gain: number; moodKey: string }> = ({ layout, mood, time, pulse, gain, moodKey }) => {
  const groups = useMemo(() => [0, 1, 2].map((v) => {
    const list = layout.trees.filter((t) => t.variant === v);
    const geo = trunkGeometry(v).clone();
    const vein = new Float32Array(Math.max(1, list.length) * 4);
    list.forEach((t, i) => vein.set([t.phase, t.speed, t.vmix, t.bright], i * 4));
    geo.setAttribute('aVein', new THREE.InstancedBufferAttribute(vein, 4));
    const mat = makeTrunkMaterial(v, mood, true);
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((t, i) => {
      _p.set(t.x, -0.04, t.z);
      _e.set(t.lean?.[0] ?? 0, t.phase * 6.28, t.lean?.[1] ?? 0);
      _q.setFromEuler(_e);
      _s.set(t.r, t.h, t.r);
      _m4.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m4);
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return { mesh, mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [layout, moodKey]);
  for (const g of groups) {
    const u = g.mat.userData.u as VeinUniforms;
    u.uTime.value = time / 60; u.uPulse.value = pulse; u.uGain.value = gain; u.uScan.value = mood.scan;
  }
  return <>{groups.map((g, i) => (g.mesh.count > 0 ? <primitive key={i} object={g.mesh} /> : null))}</>;
};

const Ground: React.FC<{ p: ForestProps; mood: MoodSpec; moodKey: string }> = ({ p, mood, moodKey }) => {
  const ext = p.extent ?? 30;
  const c = p.center ?? [0, 0];
  const { geo, mat } = useMemo(() => {
    const size = ext * 2 + 30;
    const g = new THREE.PlaneGeometry(size, size, 160, 160);
    g.rotateX(-Math.PI / 2);
    g.translate(c[0], 0, c[1]);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col: number[] = [];
    const moss = new THREE.Color(mood.groundTint), dirt = new THREE.Color(mood.groundTint).multiply(new THREE.Color('#c9a98a'));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, forestGroundY(x, z, p));
      const o = forestOpenness(x, z, p, 2.5);
      const cc = dirt.clone().lerp(moss, 0.35 + 0.65 * o);
      col.push(cc.r, cc.g, cc.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const t = groundTex().clone();
    t.needsUpdate = true;
    t.repeat.set(size / 4, size / 4);
    const m = new THREE.MeshStandardMaterial({ map: t, vertexColors: true, roughness: 0.97, bumpMap: t, bumpScale: 1.5 });
    return { geo: g, mat: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ext, c[0], c[1], JSON.stringify(p.clearings ?? []), JSON.stringify(p.paths ?? []), p.clearing, moodKey]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
};

const GroundCover: React.FC<{ layout: ForestLayout; mood: MoodSpec; p: ForestProps; moodKey: string; time: number }> = ({ layout, mood, p, moodKey, time }) => {
  const parts = useMemo(() => {
    const tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, color: new THREE.Color(mood.groundTint) });
    const tufts = new THREE.InstancedMesh(tuftGeometry(), tuftMat, Math.max(1, layout.tufts.length));
    layout.tufts.forEach((t, i) => {
      _p.set(t.x, forestGroundY(t.x, t.z, p) - 0.01, t.z); _q.setFromEuler(_e.set(0, t.rot, 0)); _s.set(t.s, t.s, t.s);
      tufts.setMatrixAt(i, _m4.compose(_p, _q, _s));
    });
    tufts.count = layout.tufts.length; tufts.receiveShadow = true; tufts.frustumCulled = false;
    // mushrooms: stem + glowing cap, three colour groups
    const stemGeo = new THREE.CylinderGeometry(0.008, 0.011, 0.05, 6).translate(0, 0.025, 0);
    const capGeo = new THREE.SphereGeometry(0.034, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0, 0.05, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#cfc8b8', roughness: 0.6, emissive: new THREE.Color('#203028'), emissiveIntensity: 0.4 });
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, Math.max(1, layout.mush.length));
    const caps = [0, 1, 2].map((ci) => {
      const list = layout.mush.filter((m) => m.c === ci);
      const mat = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color(mood.mush[ci]), emissiveIntensity: 2.4, roughness: 0.4 });
      const im = new THREE.InstancedMesh(capGeo, mat, Math.max(1, list.length));
      list.forEach((m, i) => { _p.set(m.x, forestGroundY(m.x, m.z, p), m.z); _q.identity(); _s.set(m.s, m.s, m.s); im.setMatrixAt(i, _m4.compose(_p, _q, _s)); });
      im.count = list.length; im.frustumCulled = false;
      return im;
    });
    layout.mush.forEach((m, i) => { _p.set(m.x, forestGroundY(m.x, m.z, p), m.z); _q.identity(); _s.set(m.s, m.s, m.s); stems.setMatrixAt(i, _m4.compose(_p, _q, _s)); });
    stems.count = layout.mush.length; stems.frustumCulled = false;
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0).scale(1, 0.55, 0.85);
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#2a2a26', roughness: 0.9, flatShading: true });
    const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, Math.max(1, layout.stones.length));
    layout.stones.forEach((s, i) => { _p.set(s.x, forestGroundY(s.x, s.z, p) + s.s * 0.15, s.z); _q.setFromEuler(_e.set(0.2, s.rot, 0.1)); _s.set(s.s, s.s, s.s); stones.setMatrixAt(i, _m4.compose(_p, _q, _s)); });
    stones.count = layout.stones.length; stones.castShadow = true; stones.receiveShadow = true; stones.frustumCulled = false;
    return { tufts, stems, caps, stones };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, moodKey]);
  // caps breathe a little, in pixel steps like the veins
  parts.caps.forEach((im, i) => { (im.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + 0.6 * Math.round(Math.sin(time * 0.05 + i * 2.1) * 2) / 2; });
  return (
    <>
      <primitive object={parts.tufts} />
      <primitive object={parts.stems} />
      {parts.caps.map((c, i) => <primitive key={i} object={c} />)}
      <primitive object={parts.stones} />
    </>
  );
};

const SKY_VERT = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHor; varying vec3 vDir;
void main(){
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.55, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
const Sky: React.FC<{ mood: MoodSpec; center: [number, number] }> = ({ mood, center }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }), []);
  (mat.uniforms.uTop.value as THREE.Color).set(mood.skyTop);
  (mat.uniforms.uHor.value as THREE.Color).set(mood.skyHorizon);
  return <mesh material={mat} position={[center[0], 0, center[1]]} renderOrder={-10}><sphereGeometry args={[120, 32, 16]} /></mesh>;
};

// ---------------------------------------------------------------- exported props
/** a mossy cut stump with root flare. Origin = ground centre. Top (the cut) at `height`. */
export const Stump: React.FC<{ position?: V3; radius?: number; height?: number; rot?: number }> = ({ position = [0, 0, 0], radius = 0.3, height = 0.42, rot = 0 }) => {
  const mats = useMemo(() => ({
    side: new THREE.MeshStandardMaterial({ map: barkTex(false), bumpMap: barkTex(true), bumpScale: 2, roughness: 0.95, color: '#b9bfae' }),
    top: new THREE.MeshStandardMaterial({ map: ringsTex(), roughness: 0.85, bumpMap: ringsTex(), bumpScale: 1.2 }),
  }), []);
  const geo = trunkGeometry(1, 0.45, 0.94);
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh geometry={geo} material={mats.side} scale={[radius, height, radius]} castShadow receiveShadow />
      <mesh material={mats.top} position={[0, height - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius * 0.96, 40]} />
      </mesh>
    </group>
  );
};

/** a fallen, mossy log lying along local +X. Origin = ground under its middle. */
export const FallenLog: React.FC<{ position?: V3; rot?: number; len?: number; r?: number; tilt?: number }> = ({ position = [0, 0, 0], rot = 0, len = 2.4, r = 0.22, tilt = 0 }) => {
  const mats = useMemo(() => ({
    bark: new THREE.MeshStandardMaterial({ map: barkTex(false), bumpMap: barkTex(true), bumpScale: 2, roughness: 0.95, color: '#c2c8b4' }),
    end: new THREE.MeshStandardMaterial({ map: ringsTex(), roughness: 0.85 }),
    moss: new THREE.MeshStandardMaterial({ color: '#1f3a22', roughness: 1 }),
  }), []);
  return (
    <group position={position} rotation={[0, rot, tilt]}>
      <mesh material={mats.bark} position={[0, r * 0.92, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.92, r, len, 20, 1, true]} />
      </mesh>
      <mesh material={mats.end} position={[len / 2, r * 0.92, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[r * 0.92, 20]} /></mesh>
      <mesh material={mats.end} position={[-len / 2, r * 0.92, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[r, 20]} /></mesh>
      <mesh material={mats.moss} position={[0, r * 1.7, 0]} scale={[len * 0.42, r * 0.22, r * 0.6]} castShadow receiveShadow>
        <sphereGeometry args={[1, 16, 8]} />
      </mesh>
    </group>
  );
};

/** mood hemisphere + key light (exported so a shot can relight the forest without the set) */
export const ForestLights: React.FC<{ mood?: ForestMood; center?: [number, number]; shadow?: boolean; scale?: number }> = ({ mood = 'night', center = [0, 0], shadow = false, scale = 1 }) => {
  const m = FOREST_MOODS[mood];
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(center[0], 0, center[1]);
  const d = new THREE.Vector3(...m.keyDir).normalize().multiplyScalar(25);
  return (
    <>
      <hemisphereLight args={[m.hemiSky, m.hemiGround, m.hemiInt * scale]} />
      <primitive object={target} />
      <directionalLight position={[center[0] + d.x, d.y, center[1] + d.z]} target={target} color={m.keyColor} intensity={m.keyInt * scale}
        castShadow={shadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={60} />
    </>
  );
};

// ---------------------------------------------------------------- atmosphere
/**
 * Scene fog (FogExp2) + background colour for a mood. Sets them on the SCENE imperatively, so it works
 * wherever it is mounted (a JSX `attach="fog"` inside a <group> would attach to the group and do nothing).
 * <Forest> mounts it itself (unless fog={false}); mount it alone to get the forest air without the set.
 */
export const ForestAtmos: React.FC<{ mood?: ForestMood; density?: number; color?: string }> = ({ mood = 'night', density, color }) => {
  const scene = useThree((st) => st.scene);
  const m = FOREST_MOODS[mood];
  const col = color ?? m.fog;
  const d = density ?? m.fogDensity;
  if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(col, d);
  (scene.fog as THREE.FogExp2).color.set(col);
  (scene.fog as THREE.FogExp2).density = d;
  if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color(m.skyHorizon);
  (scene.background as THREE.Color).set(m.skyHorizon);
  return null;
};

// ---------------------------------------------------------------- the set
export const Forest: React.FC<ForestProps> = (props) => {
  const frame = useCurrentFrame();
  const time = props.time ?? frame;
  const moodName = props.mood ?? 'night';
  const mood = FOREST_MOODS[moodName];
  const center = props.center ?? [0, 0];
  const layoutKey = JSON.stringify([props.seed, props.center, props.clearing, props.clearings, props.paths, props.extent, props.trees, props.extraTrees, props.groundCover]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => forestLayout(props), [layoutKey]);
  const moodKey = moodName + layoutKey;
  const ext = props.extent ?? 30;
  return (
    <group>
      {(props.fog ?? true) && <ForestAtmos mood={moodName} />}
      {(props.sky ?? true) && <Sky mood={mood} center={center} />}
      {(props.lights ?? true) && <ForestLights mood={moodName} center={center} shadow={props.keyShadow} />}
      <Ground p={props} mood={mood} moodKey={moodKey} />
      <Trunks layout={layout} mood={mood} time={time} pulse={clamp(props.pulse ?? 0, 0, 2)} gain={props.veins ?? 1} moodKey={moodKey} />
      {(props.groundCover ?? true) && <GroundCover layout={layout} mood={mood} p={props} moodKey={moodKey} time={time} />}
      {props.stump && <Stump position={[props.stump[0], 0, props.stump[1]]} />}
      {(props.logs ?? []).map((l, i) => <FallenLog key={i} position={[l.x, forestGroundY(l.x, l.z, props), l.z]} rot={l.rot} len={l.len} r={l.r} />)}
      {(props.fireflies ?? 90) > 0 && (
        <Motes frame={time} count={props.fireflies ?? 90} box={[Math.min(ext, 24), 3.2, Math.min(ext, 24)]} center={[center[0], 1.7, center[1]]}
          vel={[0.04, 0.02, -0.03]} wander={0.5} size={0.035} color={mood.flies[0]} color2={mood.flies[1]} intensity={mood.flyInt * (1 + 0.5 * clamp(props.pulse ?? 0))} square seed={(props.seed ?? 1) + 5} />
      )}
    </group>
  );
};
