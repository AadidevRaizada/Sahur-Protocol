// The bedroom (storyboard section 3.4 layout). Metres, Y up, origin = floor at the room centre.
// Room 3.4 (x) by 4.0 (z) by 2.6 (y). Far wall at z = -2 has the window (left) and the door (right).
// Moods blend: night (L0), blue (L1/L1R), morning (L8). All animation is a function of `time` (frames).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { PAL } from '../lib/palette';
import { prng, clamp, lerp, noise2, fbm1, smooth, mixHex } from '../rig/util';
import { plasterTex, planksTex, duvetTex, sheetTex, rugTex, posterTex, drawPost, facadeTex, cloudTex, dotTex } from './textures';

RectAreaLightUniformsLib.init();

type V3 = [number, number, number];
export const ROOM = { w: 3.4, d: 4.0, h: 2.6, x0: -1.7, x1: 1.7, z0: -2.0, z1: 2.0 };
/** storyboard marks */
export const MARKS = {
  E0: [-1.2, 0.8, 1.45] as V3, // eye lying on the pillow
  E1: [-1.2, 1.02, 1.3] as V3, // eye propped up
  E2: [-1.0, 1.1, 1.05] as V3, // eye standing at the bedside
  phoneHeld: [-1.2, 0.98, 1.1] as V3,
  phoneChest: [-1.2, 0.62, 1.12] as V3,
  window: [-0.9, 1.5, -2.0] as V3,
  door: [0.6, 1.03, -2.0] as V3,
  doorHinge: [0.15, 0, -2.0] as V3,
  sahurStand: [-0.2, 0, 0.2] as V3, // feet
  sahurKneel: [-0.4, 0, 0.8] as V3, // feet
  ceiling: [-1.1, 2.6, 1.1] as V3,
};
/** Sahur's scale in this room: 1.88 m tall (he dips under the 2.05 m lintel), eyes at about 1.56 m */
export const SAHUR_ROOM_SCALE = 0.62;

export type Mood = 'night' | 'blue' | 'morning';
export type BedroomProps = {
  mood?: Mood;
  moodB?: Mood;
  moodMix?: number;
  /** 0 closed .. 1 = 80 degrees open (inward) */
  doorOpen?: number;
  /** door shudder 0..1 (knocks) */
  doorShake?: number;
  /** hallway backlight 0..1 (blue state: the strip under the door, then the open doorway) */
  hall?: number;
  /** red siren sweeps through the window 0..1 */
  siren?: number;
  /** first frame of a siren pass (passes every 96 f, 30 f long) */
  sirenPhase?: number;
  /** floor fog rolling in from the door 0..1 */
  floorFog?: number;
  /** the feed scrolling on the ceiling 0..1 */
  feedCeiling?: number;
  /** multiplier on the window blue (storyboard: -35% when amber arrives) */
  windowBlue?: number;
  /** frames when every screen refreshes together (2 f white blink) */
  refreshAt?: number[];
  /** animation clock in frames (default: the composition frame) */
  time?: number;
  /** show the bed (hide it for reverse shots if needed) */
  bed?: boolean;
  dust?: number;
  /** multiplier on the door light shaft (fog in the door light) */
  beam?: number;
  /** lift every dust mote at once (metres), e.g. the far TUNG at 4140 */
  dustJump?: number;
};

/** siren pass envelope (0..1) and progress for a given clock; passes last 34 f every 96 f from `phase` */
export function sirenEnvelope(time: number, phase = 0) {
  const local = (((time - phase) % 96) + 96) % 96;
  const pass = local < 34 ? local / 34 : -1;
  return { bell: pass >= 0 ? Math.sin(pass * Math.PI) : 0, pass };
}

// ---------------- mood weights ----------------
const W = (m: Mood) => ({ night: m === 'night' ? 1 : 0, blue: m === 'blue' ? 1 : 0, morning: m === 'morning' ? 1 : 0 });
export function moodWeights(p: BedroomProps) {
  const a = W(p.mood ?? 'blue');
  if (!p.moodB) return a;
  const b = W(p.moodB), t = clamp(p.moodMix ?? 0);
  return { night: lerp(a.night, b.night, t), blue: lerp(a.blue, b.blue, t), morning: lerp(a.morning, b.morning, t) };
}
const mixCol = (w: { night: number; blue: number; morning: number }, n: string, b: string, m: string) => {
  const c = new THREE.Color(n).multiplyScalar(w.night).add(new THREE.Color(b).multiplyScalar(w.blue)).add(new THREE.Color(m).multiplyScalar(w.morning));
  return c;
};

// ---------------- geometry helpers ----------------
const Box: React.FC<{ a: V3; b: V3; mat: THREE.Material; cast?: boolean; recv?: boolean }> = ({ a, b, mat, cast = true, recv = true }) => {
  const size: V3 = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])];
  const c: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <mesh position={c} castShadow={cast} receiveShadow={recv} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  );
};

function duvetGeometry() {
  // heightfield over the mattress + overhang drapes; body under the covers (legs to the foot)
  const nx = 60, nz = 90;
  const xA = -1.86, xB = -0.54, zA = -0.2, zB = 1.32;
  const mx0 = -1.66, mx1 = -0.74, mz0 = -0.06, top = 0.5;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / nz;
    let x = lerp(xA, xB, u), z = lerp(zA, zB, v);
    // body: two legs + hips, knees slightly raised, feet bump near the foot
    const leg = (cx: number) => Math.exp(-Math.pow((x - cx) / 0.11, 2));
    const along = smooth((z - 0.05) / 0.25) * (1 - smooth((z - 1.25) / 0.2));
    const knee = 0.06 * Math.exp(-Math.pow((z - 0.62) / 0.22, 2));
    let hgt = (0.1 + knee) * Math.max(leg(-1.29), leg(-1.11)) * along;
    hgt += 0.07 * Math.exp(-Math.pow((x + 1.2) / 0.28, 2)) * smooth((z - 0.85) / 0.3);
    hgt += 0.09 * Math.max(Math.exp(-Math.pow((x + 1.3) / 0.07, 2) - Math.pow((z - 0.12) / 0.07, 2)), Math.exp(-Math.pow((x + 1.1) / 0.07, 2) - Math.pow((z - 0.12) / 0.07, 2)));
    // wrinkles
    hgt += 0.012 * noise2(x * 9, z * 7, 2) + 0.008 * Math.sin((x * 2.5 + z * 6) * 3.2);
    let y = top + 0.035 + hgt;
    // drape over the sides and the foot
    const over = Math.max(mx0 - x, x - mx1, 0);
    if (x < mx0) x = mx0 - Math.min(0.05, over * 0.3);
    if (x > mx1) x = mx1 + Math.min(0.05, over * 0.3);
    y -= over * 1.6;
    const overF = Math.max(mz0 - z, 0);
    if (z < mz0) { z = mz0 - Math.min(0.05, overF * 0.3); y -= overF * 1.6; }
    // folds on the drape
    if (over > 0 || overF > 0) { x += 0.01 * Math.sin(z * 26) * Math.min(1, over * 8); z += 0.008 * Math.sin(x * 30) * Math.min(1, overF * 8); }
    pos.push(x, y, z); uv.push(u * 1.3, v * 1.6);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function curtainGeometry(w: number, h: number, folds: number, seed: number) {
  const g = new THREE.PlaneGeometry(w, h, 48, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, 0.035 * Math.sin((x / w) * Math.PI * 2 * folds + seed) + 0.01 * Math.sin(y * 3 + x * 9));
  }
  g.computeVertexNormals();
  return g;
}

// ---------------- light shafts (crossed additive cards) ----------------
const shaftMat = (color: string) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uAmt: { value: 0.3 }, uTime: { value: 0 }, uNoise: { value: cloudTex() } },
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uAmt; uniform float uTime; uniform sampler2D uNoise; varying vec2 vUv; varying vec3 vW;
    void main(){
      float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
      float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.06, vUv.y);
      float n = texture2D(uNoise, vW.xz * 0.35 + vec2(uTime * 0.002, uTime * 0.001)).a;
      float a = uAmt * edge * along * (0.55 + 0.6 * n);
      gl_FragColor = vec4(uColor * a, a);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
});
const Shaft: React.FC<{ from: V3; to: V3; w0: number; w1: number; color: string; amt: number; time: number }> = ({ from, to, w0, w1, color, amt, time }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 8);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const v = 0.5 - p.getY(i); p.setXY(i, p.getX(i) * lerp(w0, w1, v), -v); }
    return flipUV(g); // y from 0 (source) to -1 (end); uv.y 0 at the source
  }, [w0, w1]);
  const mats = useMemo(() => [0, 1, 2].map(() => shaftMat(color)), [color]);
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
  const len = A.distanceTo(B);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), B.clone().sub(A).normalize());
  mats.forEach((m) => { m.uniforms.uAmt.value = amt; m.uniforms.uTime.value = time; });
  if (amt <= 0.001) return null;
  return (
    <group position={from} quaternion={q} scale={[1, len, 1]}>
      {mats.map((m, i) => (
        <mesh key={i} geometry={geo} material={m} rotation={[0, (i * Math.PI) / 3, 0]} renderOrder={5} />
      ))}
    </group>
  );
};
// the plane's uv.y is 1 at its top (the source). Make the shader's vUv.y run 0 at the source:
// done by flipping uv in the geometry below.
const flipUV = (g: THREE.BufferGeometry) => { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); return g; };

// ---------------- dust ----------------
const Dust: React.FC<{ count: number; time: number; color: string; opacity: number; seed?: number; jump?: number }> = ({ count, time, color, opacity, seed = 17, jump = 0 }) => {
  const base = useMemo(() => {
    const R = prng(seed);
    const pts: number[] = [];
    for (let i = 0; i < count; i++) {
      // bias toward the window beam (over the bed) and the door beam (floor in front of the door)
      const r = R();
      let x, y, z;
      if (r < 0.45) { x = lerp(-1.6, -0.2, R()); y = lerp(0.5, 2.3, R()); z = lerp(-1.9, 1.6, R()); }
      else if (r < 0.8) { x = lerp(-0.6, 1.3, R()); y = lerp(0.05, 2.0, R()); z = lerp(-1.95, 0.8, R()); }
      else { x = lerp(-1.6, 1.6, R()); y = lerp(0.1, 2.5, R()); z = lerp(-1.9, 1.9, R()); }
      pts.push(x, y, z, R() * 10, 0.4 + R() * 0.6);
    }
    return pts;
  }, [count, seed]);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3)); return g; }, [count]);
  const mat = useMemo(() => new THREE.PointsMaterial({ map: dotTex(), size: 0.012, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const t = time / 60;
  for (let i = 0; i < count; i++) {
    const b = i * 5;
    p.setXYZ(i, base[b] + 0.03 * Math.sin(t * 0.3 + base[b + 3]) + 0.01 * t * base[b + 4], base[b + 1] + 0.025 * Math.sin(t * 0.21 + base[b + 3] * 1.7) - 0.004 * t + jump, base[b + 2] + 0.03 * Math.cos(t * 0.27 + base[b + 3]));
  }
  p.needsUpdate = true;
  mat.color.set(color);
  mat.opacity = opacity;
  return <points geometry={geo} material={mat} renderOrder={6} />;
};

// ---------------- the city ----------------
// Towers in 3 depth layers, placed around the cone seen through the window from the bed (E1), and
// ~40 screens that all show THE SAME POST. Buildings use a self-lit shader (no room lights needed).
function useCity() {
  return useMemo(() => {
    const R = prng(42);
    const bld: { pos: V3; size: V3; layer: number; seed: number; tank: boolean }[] = [];
    const layers = [{ z: -15, depth: 6, x0: -9, x1: 9, top: [3, 12] }, { z: -27, depth: 8, x0: -14, x1: 14, top: [6, 18] }, { z: -42, depth: 10, x0: -22, x1: 22, top: [9, 26] }];
    layers.forEach((L, li) => {
      let x = L.x0 + R() * 2;
      while (x < L.x1) {
        const w = 2.6 + R() * 4.5 + li * 0.8;
        let top = L.top[0] + R() * (L.top[1] - L.top[0]);
        // inside the window cone, step the skyline so all three layers of screens show through the window
        const d = -L.z, cx = -1.2 + (0.3 / 3.3) * (d + 1.3);
        if (Math.abs(x + w / 2 - cx) < 0.22 * d + w / 2 && li < 2) top = Math.min(top, 1 + [0.15, 0.22][li] * d);
        const h = top + 30;
        bld.push({ pos: [x + w / 2, top - h / 2, L.z - R() * 4], size: [w, h, L.depth], layer: li, seed: Math.floor(R() * 1000), tank: R() < 0.4 });
        x += w + 0.4 + R() * (1.2 + li);
      }
    });
    // screens: every tower face inside the cone seen through the window from the bed is tiled with a grid of
    // the SAME post (a billboard city); towers outside the cone get the odd screen
    const screens: { pos: V3; size: [number, number] }[] = [];
    for (const b of bld) {
      const front = b.pos[2] + b.size[2] / 2;
      const d = -front;
      const cx = -1.2 + (0.3 / 3.3) * (d + 1.3);
      const inCone = Math.abs(b.pos[0] - cx) < 0.26 * d + b.size[0] / 2;
      const top = b.pos[1] + b.size[1] / 2;
      if (inCone) {
        const sw = [0.52, 0.72, 0.95][b.layer], sh = sw * 1.33;
        const cols = Math.max(1, Math.floor((b.size[0] - 0.4) / (sw * 1.32)));
        // only the band visible over the stepped rooftops of the layer in front
        const visLo = [1.0 + 0.004 * d, 1.02 + 0.152 * d, 1.02 + 0.222 * d][b.layer];
        const yLo = visLo + 0.15 + sh / 2, yHi = Math.min(top - 0.3, 1.0 + 0.3 * d) - sh / 2;
        const rows = yHi < yLo ? 0 : Math.floor((yHi - yLo) / (sh * 1.25)) + 1;
        for (let r = 0; r < rows && screens.length < 140; r++) for (let c = 0; c < cols; c++) {
          if (R() < 0.12) continue; // a few dark gaps
          const x = b.pos[0] + (c - (cols - 1) / 2) * sw * 1.32;
          screens.push({ pos: [x, yLo + r * sh * 1.25, front + 0.06], size: [sw, sh] });
        }
      } else if (R() < 0.3 && screens.length < 110) {
        const sw = [1.0, 1.6, 2.4][b.layer], sh = sw * 1.33;
        if (top - 1 > 1.5 + sh) screens.push({ pos: [b.pos[0], 1.5 + sh / 2 + R() * (top - 2.5 - sh), front + 0.06], size: [sw, sh] });
      }
    }
    return { bld, screens, layers };
  }, []);
}

const buildingMat = (seed: number) => new THREE.ShaderMaterial({
  uniforms: {
    uBase: { value: new THREE.Color('#2a3142') }, uLit: { value: 1 }, uWin: { value: facadeTex(100 + seed, false) }, uWinCol: { value: new THREE.Color('#9fb6ff') },
    uWinAmt: { value: 0.5 }, uHaze: { value: new THREE.Color('#1a2040') }, uHazeAmt: { value: 0.2 }, uRep: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uBase; uniform float uLit; uniform sampler2D uWin; uniform vec3 uWinCol; uniform float uWinAmt; uniform vec3 uHaze; uniform float uHazeAmt; uniform vec2 uRep;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      float face = 0.55 + 0.45 * max(0.0, vN.z) + 0.25 * max(0.0, vN.y) - 0.15 * abs(vN.x);
      float grad = clamp((vW.y + 10.0) / 40.0, 0.0, 1.0);
      vec3 col = uBase * uLit * face * (0.75 + 0.35 * grad);
      vec2 wuv = vec2(vW.x * 0.12 + vW.z * 0.12, vW.y * 0.07);
      float win = texture2D(uWin, wuv).r * step(0.5, abs(vN.z) + abs(vN.x));
      col += uWinCol * win * uWinAmt;
      col = mix(col, uHaze, uHazeAmt);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  fog: false,
});

const skyMat = () => new THREE.ShaderMaterial({
  uniforms: { uTop: { value: new THREE.Color('#05070f') }, uBot: { value: new THREE.Color('#1a2040') } },
  vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; varying float vY; void main(){ gl_FragColor = vec4(mix(uBot, uTop, smoothstep(0.0, 1.0, vY)), 1.0); }`,
  depthWrite: false, toneMapped: true,
});

// ---------------- the room ----------------
export const Bedroom: React.FC<BedroomProps> = (props) => {
  const cf = useCurrentFrame();
  const time = props.time ?? cf;
  const w = moodWeights(props);
  const door = clamp(props.doorOpen ?? 0);
  const hall = clamp(props.hall ?? (w.blue > 0 ? 1 : 0)) * w.blue;
  const siren = clamp(props.siren ?? 0) * w.blue;
  const winBlue = props.windowBlue ?? 1;
  const city = useCity();

  const mats = useMemo(() => {
    const plaster = new THREE.MeshStandardMaterial({ map: plasterTex(), color: '#d6d1c7', roughness: 0.92 });
    const ceiling = new THREE.MeshStandardMaterial({ map: plasterTex(), color: '#dcd8d0', roughness: 0.95 });
    const floor = new THREE.MeshStandardMaterial({ map: planksTex(), roughness: 0.55, metalness: 0.0 });
    const trim = new THREE.MeshStandardMaterial({ color: '#e3ddd2', roughness: 0.6 });
    const doorM = new THREE.MeshStandardMaterial({ color: '#cfc7b8', roughness: 0.55 });
    const metal = new THREE.MeshStandardMaterial({ color: '#9a9aa2', roughness: 0.3, metalness: 0.9 });
    const bedWood = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.6 });
    const mattress = new THREE.MeshStandardMaterial({ map: sheetTex(), roughness: 0.95 });
    const duvet = new THREE.MeshPhysicalMaterial({ map: duvetTex(), roughness: 0.92, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color('#c8d0e8'), side: THREE.DoubleSide });
    const pillow = new THREE.MeshPhysicalMaterial({ map: sheetTex(), color: '#eae6de', roughness: 0.95, sheen: 0.4 });
    const desk = new THREE.MeshStandardMaterial({ color: '#5b4636', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#16181f', roughness: 0.4, metalness: 0.3 });
    const darkNoFog = new THREE.MeshStandardMaterial({ color: '#10131a', roughness: 0.5, fog: false });
    const rug = new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 });
    const curtain = new THREE.MeshStandardMaterial({ color: '#3d3a52', roughness: 0.95, side: THREE.DoubleSide });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#a8bce8', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, depthWrite: false });
    const hallWall = new THREE.MeshStandardMaterial({ color: '#7d8cb0', roughness: 0.85, emissive: new THREE.Color(PAL.phoneBlue), emissiveIntensity: 0 });
    const hallBack = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.phoneBlue), toneMapped: false });
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.phoneBlue), toneMapped: false });
    const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.phoneBlue), toneMapped: false });
    const posters = [0, 1, 2].map((k) => new THREE.MeshStandardMaterial({ map: posterTex(k), roughness: 0.8 }));
    const bldMats = [0, 1, 2].map(() => [0, 1, 2, 3].map((v) => buildingMat(v)));
    const tank = new THREE.MeshStandardMaterial({ color: '#30384a', roughness: 0.8, fog: false });
    const sky = skyMat();
    sky.fog = false;
    const ground = new THREE.MeshStandardMaterial({ color: '#0e121c', roughness: 1, fog: false });
    return { edge, darkNoFog, plaster, ceiling, floor, trim, doorM, metal, bedWood, mattress, duvet, pillow, desk, dark, rug, curtain, glass, hallWall, hallBack, strip, posters, bldMats, tank, sky, ground };
  }, []);

  // post texture (shared by every screen and the desk monitor)
  const post = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 192; c.height = 256;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return { c, t, mat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false }) };
  }, []);
  const refresh = (props.refreshAt ?? []).some((f) => time >= f && time < f + 2) ? 1 : 0;
  drawPost(post.c.getContext('2d')!, post.c.width, post.c.height, Math.floor(time / 12) % 4, refresh);
  post.t.needsUpdate = true;
  const screenOn = w.blue;
  post.mat.color.setScalar(1.35 * screenOn);

  // building facade windows: cool & sparse in blue, warm at night, off-ish in daylight
  const winGlow = w.night * 0.5 + w.blue * 0.35 + w.morning * 0.04;
  const hazeCol = mixCol(w, '#0b1020', '#1d1a44', '#c9d2dc');
  mats.bldMats.forEach((row, li) => row.forEach((m) => {
    const u = m.uniforms;
    u.uBase.value.copy(mixCol(w, '#141a28', '#262d42', '#8e97a6'));
    u.uLit.value = 1;
    u.uWinCol.value.copy(mixCol(w, '#ffcf8a', '#9fb6ff', '#2a3040'));
    u.uWinAmt.value = w.night * 0.9 + w.blue * 0.45 + w.morning * 0.35;
    u.uHaze.value.copy(hazeCol);
    u.uHazeAmt.value = [0.12, 0.32, 0.52][li] * (w.morning > 0.5 ? 0.8 : 1);
  }));
  mats.sky.uniforms.uTop.value = mixCol(w, '#03050b', '#060a1c', '#a9bfd8');
  mats.sky.uniforms.uBot.value = mixCol(w, '#121a30', '#2a1d4a', '#e8e2d6');
  mats.ground.color = mixCol(w, '#07090f', '#0b0f1c', '#4a4f58');

  // hallway glow
  mats.hallBack.color.set(PAL.phoneBlue).multiplyScalar(1.8 * hall);
  mats.hallWall.emissiveIntensity = 0.35 * hall;
  const knock = clamp(props.doorShake ?? 0);
  mats.strip.color.set(PAL.phoneBlue).multiplyScalar(2.2 * hall * (1 - door) * (1 + 0.6 * knock));
  mats.edge.color.set(PAL.phoneBlue).multiplyScalar(0.9 * hall * (1 + 0.6 * knock));

  const geo = useMemo(() => ({
    duvet: duvetGeometry(),
    mattress: new RoundedBoxGeometry(0.94, 0.22, 1.94, 4, 0.06),
    pillow: (() => { const g = new RoundedBoxGeometry(0.66, 0.16, 0.42, 5, 0.08); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) * (1 - 0.5 * Math.pow(Math.abs(x) / 0.33, 4)) * (1 - 0.3 * Math.pow(Math.abs(z) / 0.21, 4))); } g.computeVertexNormals(); return g; })(),
    curtainL: curtainGeometry(0.45, 1.3, 3.5, 0.3),
    curtainR: curtainGeometry(0.45, 1.3, 3.5, 1.7),
    feed: new THREE.PlaneGeometry(1.5, 2.9),
  }), []);

  // ceiling feed: scrolling post-shaped rounded rectangles (projected light look)
  const feed = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const t = new THREE.CanvasTexture(c);
    return { c, t, mat: new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }) };
  }, []);
  const feedAmt = clamp(props.feedCeiling ?? 0) * w.blue;
  if (feedAmt > 0) {
    // post-shaped cards (1:1.6) in two columns scrolling toward the far wall (screen-up when lying on your
    // back), in perfect sync: a new card every 30 f
    const g = feed.c.getContext('2d')!;
    g.clearRect(0, 0, 256, 512);
    const slot = 72;
    const off = ((time % 30) / 30) * slot;
    g.filter = 'blur(3px)';
    for (const [cx, ph] of [[70, 0], [186, slot / 2]] as const) {
      for (let i = -2; i < 9; i++) {
        const y = 512 - (i * slot + off + ph) - 60;
        g.fillStyle = 'rgba(110,140,255,0.38)';
        g.beginPath(); g.roundRect(cx - 36, y, 72, 58, 8); g.fill();
        g.fillStyle = 'rgba(180,195,255,0.4)';
        g.beginPath(); g.roundRect(cx - 30, y + 6, 60, 32, 5); g.fill();
        g.fillRect(cx - 30, y + 44, 38, 5);
      }
    }
    g.filter = 'none';
    feed.t.needsUpdate = true;
  }
  feed.mat.opacity = feedAmt;

  // ---- lights ----
  const windowCol = mixCol(w, '#3a4a7a', PAL.phoneBlue, PAL.morning);
  const windowInt = (w.night * 0.6 + w.blue * 8 * winBlue + w.morning * 14);
  const hemiSky = mixCol(w, '#1a1d2e', '#0d1a4a', '#cfd8e4'), hemiGround = mixCol(w, '#0a0806', '#020308', '#6b6258');
  const hemiInt = w.night * 0.08 + w.blue * 0.6 + w.morning * 1.0;
  const fogCol = mixCol(w, '#07090f', '#0d1a4a', '#c9c6bd');
  const fogDen = w.night * 0.06 + w.blue * 0.1 + w.morning * 0.025;
  // siren: a 30 f pass every 96 f from sirenPhase
  const sp = props.sirenPhase ?? 0;
  const local = (((time - sp) % 96) + 96) % 96;
  const pass = local < 34 ? local / 34 : -1;
  const sirenBell = pass >= 0 ? Math.sin(pass * Math.PI) : 0;
  const sirenTarget: V3 = pass >= 0 ? [lerp(-1.6, 2.2, pass), lerp(2.4, 0.6, pass), lerp(1.8, -0.6, pass)] : [0, 1, 0];
  const sirenObj = useMemo(() => new THREE.Object3D(), []);
  sirenObj.position.set(...sirenTarget);
  sirenObj.updateMatrixWorld();
  const hallTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.6, 0, 0.9); o.updateMatrixWorld(); return o; }, []);
  // the morning sun falls through the curtain gap onto the floor where Sahur knelt
  const sunTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.4, 0, 0.6); o.updateMatrixWorld(); return o; }, []);
  const sodiumTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-1.05, 2.6, -0.55); o.updateMatrixWorld(); return o; }, []);

  const doorRot = door * (80 * Math.PI) / 180;
  const shudder = knock * 0.003 * Math.sin(time * 2.7);
  const t = time;

  return (
    <group>
      <fogExp2 attach="fog" args={[fogCol, fogDen]} />
      {/* ---------------- shell ---------------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={mats.floor}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]} receiveShadow material={mats.ceiling}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
      </mesh>
      {/* far wall with window + door openings */}
      <Box a={[-1.82, 0, -2.12]} b={[-1.5, 2.6, -2.0]} mat={mats.plaster} />
      <Box a={[-1.5, 0, -2.12]} b={[-0.3, 1.0, -2.0]} mat={mats.plaster} />
      <Box a={[-1.5, 2.0, -2.12]} b={[-0.3, 2.6, -2.0]} mat={mats.plaster} />
      <Box a={[-0.3, 0, -2.12]} b={[0.15, 2.6, -2.0]} mat={mats.plaster} />
      <Box a={[0.15, 2.05, -2.12]} b={[1.05, 2.6, -2.0]} mat={mats.plaster} />
      <Box a={[1.05, 0, -2.12]} b={[1.82, 2.6, -2.0]} mat={mats.plaster} />
      {/* side + back walls */}
      <Box a={[-1.82, 0, -2.0]} b={[-1.7, 2.6, 2.0]} mat={mats.plaster} />
      <Box a={[1.7, 0, -2.0]} b={[1.82, 2.6, 2.0]} mat={mats.plaster} />
      <Box a={[-1.82, 0, 2.0]} b={[1.82, 2.6, 2.12]} mat={mats.plaster} />
      {/* skirting */}
      <Box a={[-1.7, 0, -2.0]} b={[-1.68, 0.09, 2.0]} mat={mats.trim} cast={false} />
      <Box a={[1.68, 0, -2.0]} b={[1.7, 0.09, 2.0]} mat={mats.trim} cast={false} />
      <Box a={[-1.7, 0, -2.0]} b={[0.15, 0.09, -1.98]} mat={mats.trim} cast={false} />
      <Box a={[1.05, 0, -2.0]} b={[1.7, 0.09, -1.98]} mat={mats.trim} cast={false} />

      {/* ---------------- window ---------------- */}
      <group>
        <Box a={[-1.53, 0.97, -2.1]} b={[-0.27, 1.03, -1.96]} mat={mats.trim} />
        <Box a={[-1.53, 1.97, -2.1]} b={[-0.27, 2.03, -2.0]} mat={mats.trim} />
        <Box a={[-1.53, 1.0, -2.1]} b={[-1.47, 2.0, -2.0]} mat={mats.trim} />
        <Box a={[-0.33, 1.0, -2.1]} b={[-0.27, 2.0, -2.0]} mat={mats.trim} />
        <Box a={[-0.93, 1.0, -2.08]} b={[-0.87, 2.0, -2.04]} mat={mats.trim} />
        <Box a={[-1.5, 1.47, -2.08]} b={[-0.3, 1.53, -2.04]} mat={mats.trim} />
        <Box a={[-1.6, 0.94, -1.98]} b={[-0.2, 0.98, -1.88]} mat={mats.trim} />
        <mesh position={[-0.9, 1.5, -2.06]} material={mats.glass} renderOrder={4}><planeGeometry args={[1.2, 1.0]} /></mesh>
        {/* curtains: open by day and in the blue state; drawn at night, leaving a thin gap for the sodium sliver */}
        <mesh geometry={geo.curtainL} material={mats.curtain} position={[lerp(-1.6, -1.135, w.night), 1.48, -1.92]} castShadow receiveShadow />
        <mesh geometry={geo.curtainR} material={mats.curtain} position={[lerp(-0.2, -0.645, w.night), 1.48, -1.91]} castShadow receiveShadow />
        <Box a={[-1.75, 2.17, -1.95]} b={[-0.05, 2.19, -1.93]} mat={mats.metal} cast={false} />
      </group>

      {/* ---------------- city ---------------- */}
      <mesh position={[0, 10, -70]} material={mats.sky}><planeGeometry args={[220, 120]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, -30]} material={mats.ground}><planeGeometry args={[200, 80]} /></mesh>
      {city.bld.map((b, i) => (
        <group key={i}>
          <mesh position={b.pos} material={mats.bldMats[b.layer][b.seed % 4]}>
            <boxGeometry args={b.size} />
          </mesh>
          {b.tank && (
            <mesh position={[b.pos[0] + b.size[0] * 0.2, b.pos[1] + b.size[1] / 2 + 0.9, b.pos[2]]} material={mats.tank}>
              <cylinderGeometry args={[0.8, 0.8, 1.8, 10]} />
            </mesh>
          )}
        </group>
      ))}
      {screenOn > 0.01 && city.screens.map((s, i) => (
        <group key={i} position={s.pos}>
          <mesh material={post.mat}><planeGeometry args={s.size} /></mesh>
          <mesh position={[0, 0, -0.06]} material={mats.darkNoFog}><boxGeometry args={[s.size[0] * 1.08, s.size[1] * 1.06, 0.1]} /></mesh>
        </group>
      ))}

      {/* ---------------- door + hallway ---------------- */}
      <Box a={[0.09, 0, -2.0]} b={[0.15, 2.1, -1.97]} mat={mats.trim} />
      <Box a={[1.05, 0, -2.0]} b={[1.11, 2.1, -1.97]} mat={mats.trim} />
      <Box a={[0.09, 2.05, -2.0]} b={[1.11, 2.11, -1.97]} mat={mats.trim} />
      <group position={[1.045, 0, -2.02 + shudder]} rotation={[0, doorRot, 0]}>
        <Box a={[-0.89, 0.005, -0.02]} b={[0, 2.04, 0.02]} mat={mats.doorM} />
        {[[-0.77, 1.15, -0.12, 1.9], [-0.77, 0.12, -0.12, 0.95]].map(([x0, y0, x1, y1], i) => (
          <Box key={i} a={[x0, y0, 0.02]} b={[x1, y1, 0.032]} mat={mats.doorM} />
        ))}
        <Box a={[-0.8, 0.98, 0.02]} b={[-0.76, 1.02, 0.08]} mat={mats.metal} />
        <Box a={[-0.8, 0.985, 0.06]} b={[-0.66, 1.015, 0.075]} mat={mats.metal} />
        <Box a={[-0.8, 0.985, -0.075]} b={[-0.66, 1.015, -0.06]} mat={mats.metal} />
      </group>
      {/* light strip under the door, and thin leaks around its edges while it is shut */}
      <mesh position={[0.6, 0.006, -1.985]} rotation={[-Math.PI / 2, 0, 0]} material={mats.strip}><planeGeometry args={[0.88, 0.03]} /></mesh>
      {door < 0.02 && (
        <>
          <mesh position={[1.042, 1.02, -1.968]} material={mats.edge}><planeGeometry args={[0.004, 2.03]} /></mesh>
          <mesh position={[0.6, 2.043, -1.968]} material={mats.edge}><planeGeometry args={[0.86, 0.0035]} /></mesh>
        </>
      )}
      {/* hallway: walls, glowing back wall */}
      <Box a={[0.04, 0, -3.3]} b={[0.15, 2.4, -2.12]} mat={mats.hallWall} />
      <Box a={[2.1, 0, -3.3]} b={[2.2, 2.4, -2.12]} mat={mats.hallWall} />
      <Box a={[1.05, 0, -3.36]} b={[2.2, 2.4, -3.3]} mat={mats.hallWall} />
      <Box a={[0.04, 2.4, -3.3]} b={[2.2, 2.5, -2.12]} mat={mats.hallWall} />
      <Box a={[0.04, -0.05, -3.3]} b={[2.2, 0, -2.12]} mat={mats.floor} />
      <mesh position={[0.6, 1.2, -3.26]} material={mats.hallBack}><planeGeometry args={[1.2, 2.4]} /></mesh>

      {/* ---------------- bed ---------------- */}
      {props.bed !== false && (
        <group>
          <Box a={[-1.7, 0.06, -0.12]} b={[-0.68, 0.3, 1.92]} mat={mats.bedWood} />
          <Box a={[-1.7, 0, 1.88]} b={[-0.68, 1.05, 1.96]} mat={mats.bedWood} />
          <Box a={[-1.7, 0, -0.14]} b={[-0.68, 0.58, -0.08]} mat={mats.bedWood} />
          <mesh geometry={geo.mattress} material={mats.mattress} position={[-1.2, 0.4, 0.9]} castShadow receiveShadow />
          <mesh geometry={geo.pillow} material={mats.pillow} position={[-1.2, 0.58, 1.66]} rotation={[0.12, 0.03, 0]} castShadow receiveShadow />
          <mesh geometry={geo.duvet} material={mats.duvet} castShadow receiveShadow />
          {/* bedside table */}
          <Box a={[-0.62, 0, 1.5]} b={[-0.22, 0.52, 1.92]} mat={mats.desk} />
          <mesh position={[-0.42, 0.6, 1.72]} material={mats.trim} castShadow><cylinderGeometry args={[0.05, 0.07, 0.16, 16]} /></mesh>
        </group>
      )}

      {/* ---------------- desk corner ---------------- */}
      <group>
        <Box a={[1.06, 0.72, -1.45]} b={[1.68, 0.76, -0.3]} mat={mats.desk} />
        {[[1.1, -1.4], [1.62, -1.4], [1.1, -0.36], [1.62, -0.36]].map(([x, z], i) => <Box key={i} a={[x - 0.02, 0, z - 0.02]} b={[x + 0.02, 0.72, z + 0.02]} mat={mats.desk} />)}
        {/* monitor showing the post */}
        <Box a={[1.5, 0.76, -0.95]} b={[1.56, 0.8, -0.75]} mat={mats.dark} />
        <Box a={[1.52, 0.8, -0.87]} b={[1.54, 0.95, -0.83]} mat={mats.dark} />
        <Box a={[1.46, 0.92, -1.2]} b={[1.5, 1.32, -0.5]} mat={mats.dark} />
        <mesh position={[1.455, 1.12, -0.85]} rotation={[0, -Math.PI / 2, 0]} material={screenOn > 0.01 ? post.mat : mats.dark}><planeGeometry args={[0.36, 0.48]} /></mesh>
        {/* books + mug */}
        <Box a={[1.2, 0.76, -1.42]} b={[1.42, 0.82, -1.18]} mat={mats.curtain} />
        <Box a={[1.22, 0.82, -1.4]} b={[1.4, 0.86, -1.2]} mat={mats.trim} />
        <mesh position={[1.25, 0.81, -0.45]} material={mats.trim} castShadow><cylinderGeometry args={[0.04, 0.035, 0.1, 16]} /></mesh>
        {/* chair */}
        <group position={[0.82, 0, -0.85]} rotation={[0, 0.25, 0]}>
          <Box a={[-0.22, 0.44, -0.22]} b={[0.22, 0.48, 0.22]} mat={mats.dark} />
          <Box a={[-0.25, 0.48, -0.22]} b={[-0.21, 0.95, 0.22]} mat={mats.dark} />
          {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], i) => <Box key={i} a={[x - 0.015, 0, z - 0.015]} b={[x + 0.015, 0.44, z + 0.015]} mat={mats.metal} />)}
        </group>
      </group>

      {/* posters */}
      <mesh position={[1.695, 1.62, -1.15]} rotation={[0, -Math.PI / 2, 0.02]} material={mats.posters[0]} receiveShadow><planeGeometry args={[0.42, 0.59]} /></mesh>
      <mesh position={[1.695, 1.55, -0.45]} rotation={[0, -Math.PI / 2, -0.03]} material={mats.posters[1]} receiveShadow><planeGeometry args={[0.36, 0.5]} /></mesh>
      <mesh position={[1.38, 1.5, -1.995]} rotation={[0, 0, 0.015]} material={mats.posters[2]} receiveShadow><planeGeometry args={[0.36, 0.5]} /></mesh>
      {/* rug */}
      <mesh position={[0.25, 0.004, 0.15]} rotation={[-Math.PI / 2, 0, 0.1]} material={mats.rug} receiveShadow><planeGeometry args={[1.5, 2.0]} /></mesh>

      {/* ceiling feed */}
      {feedAmt > 0.001 && <mesh geometry={geo.feed} material={feed.mat} position={[-1.0, 2.595, 0.7]} rotation={[Math.PI / 2, 0, Math.PI]} />}

      {/* ---------------- light ---------------- */}
      <hemisphereLight args={[hemiSky, hemiGround, hemiInt]} />
      {/* window wash */}
      <rectAreaLight position={[-0.9, 1.5, -2.02]} width={1.2} height={1.0} color={windowCol} intensity={windowInt} rotation={[0, Math.PI, 0]} />
      {/* soft bounce off the ceiling (keeps forms readable in the dark states) */}
      <rectAreaLight position={[-0.4, 2.55, 0.2]} width={2.4} height={2.8} color={windowCol} intensity={(w.blue * 1.5 + w.night * 0.08 + w.morning * 1.7) * winBlue} rotation={[Math.PI / 2, 0, 0]} />
      {/* blue: the window light bouncing off the bed onto the far wall, so the door reads as a solid door */}
      {w.blue > 0.01 && <rectAreaLight position={[0.3, 1.05, -0.2]} width={1.6} height={1.3} color="#5a7cff" intensity={1.1 * w.blue * winBlue} rotation={[0, 0, 0]} />}
      {/* blue: hallway backlight + a shadow-casting spot through the door */}
      {hall > 0.001 && (
        <>
          <rectAreaLight position={[0.6 + 0.4 * (1 - door), 1.03, -2.14]} width={0.9 * (0.12 + 0.88 * door)} height={2.0} color="#4a7dff" intensity={30 * hall * door} rotation={[0, Math.PI, 0]} />
          <spotLight position={[0.7, 1.9, -3.15]} target={hallTarget} color="#5b84ff" intensity={260 * hall * door} angle={0.55} penumbra={0.5} distance={12} decay={2}
            castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
          <pointLight position={[0.6, 0.15, -2.3]} color="#3a6dff" intensity={0.4 * hall * (1 - door)} distance={2} decay={2} />
          <Shaft from={[0.6, 2.0, -2.1]} to={[-0.4, 0.0, 0.2]} w0={0.8} w1={1.5} color="#4a7dff" amt={0.22 * hall * door * (props.beam ?? 1)} time={t} />
        </>
      )}
      {/* blue: window beam onto the bed */}
      {w.blue > 0.01 && <Shaft from={[-0.9, 1.6, -2.0]} to={[-1.1, 0.4, 0.9]} w0={1.0} w1={1.5} color="#3a6dff" amt={0.12 * w.blue * winBlue} time={t} />}
      {/* siren sweep */}
      {siren > 0.001 && sirenBell > 0.001 && (
        <>
          <primitive object={sirenObj} />
          <spotLight position={[-0.7, 1.1, -5.5]} target={sirenObj} color={PAL.sirenRed} intensity={260 * siren * sirenBell} angle={0.35} penumbra={0.6} distance={20} decay={2}
            castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
        </>
      )}
      {/* night: sodium sliver from the curtain gap onto the ceiling */}
      {w.night > 0.01 && (
        <>
          <primitive object={sodiumTarget} />
          <spotLight position={[-0.9, 0.7, -3.2]} target={sodiumTarget} color="#ff9a4a" intensity={16 * w.night} angle={0.3} penumbra={0.4} distance={10} decay={2}
            castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
        </>
      )}
      {/* morning: low sun through the window, a beam across the duvet and the floor */}
      {w.morning > 0.01 && (
        <>
          <primitive object={sunTarget} />
          <directionalLight position={[-1.72, 3.96, -6.26]} target={sunTarget} color="#fff4e2" intensity={9 * w.morning} castShadow
            shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
            shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={20} />
          <Shaft from={[-0.9, 1.5, -2.0]} to={[-0.4, 0.0, 0.6]} w0={0.62} w1={0.85} color="#fff1d8" amt={0.7 * w.morning} time={t} />
        </>
      )}
      {/* dust */}
      <Dust count={800} time={t} color={w.morning > 0.5 ? '#fff4e2' : w.night > 0.5 ? '#8a7a66' : '#9fb6ff'} opacity={(props.dust ?? 1) * (w.blue * 0.55 + w.morning * 0.4 + w.night * 0.12)} jump={props.dustJump ?? 0} />
      {/* floor fog rolling in from the door */}
      <FloorFog amt={clamp(props.floorFog ?? 0) * w.blue} time={t} />
    </group>
  );
};

const FloorFog: React.FC<{ amt: number; time: number }> = ({ amt, time }) => {
  const mats = useMemo(() => [0, 1, 2].map((i) => new THREE.ShaderMaterial({
    uniforms: { uTex: { value: cloudTex() }, uAmt: { value: 0 }, uTime: { value: 0 }, uRoll: { value: 0 }, uSeed: { value: i * 1.7 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uTex; uniform float uAmt; uniform float uTime; uniform float uRoll; uniform float uSeed; varying vec3 vW;
      void main(){
        float n = texture2D(uTex, vW.xz * 0.28 + vec2(uSeed + uTime * 0.0015, uTime * 0.003)).a;
        float n2 = texture2D(uTex, vW.xz * 0.6 + vec2(uTime * 0.002, uSeed)).a;
        // rolls from the door (z = -2) toward the bed; uRoll 0..1
        float front = mix(-2.0, 1.6, uRoll);
        float reach = smoothstep(front + 0.4, front - 0.6, vW.z);
        float a = uAmt * reach * (0.35 * n + 0.25 * n2);
        gl_FragColor = vec4(vec3(0.35, 0.5, 1.0) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })), []);
  if (amt <= 0.001) return null;
  return (
    <group>
      {mats.map((m, i) => {
        m.uniforms.uAmt.value = 0.6 * Math.min(1, amt * 1.5); m.uniforms.uTime.value = time; m.uniforms.uRoll.value = amt;
        return <mesh key={i} material={m} position={[0, 0.06 + i * 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}><planeGeometry args={[3.4, 4.0]} /></mesh>;
      })}
    </group>
  );
};
