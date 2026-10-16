// The campfire (owner: journey builder): the fire clearing of S21-S26 (light state L4, bg_fire.jpg's mood).
// Origin = the centre of the fire on the ground. Metres. Pure function of `time` (frames).
//
//   <Campfire time={f} intensity={1} light={40} castShadow embers={120} burst={{ at, count, dir }} />
//
// Flames are camera-facing (cylindrical billboard) noise-shader tongues, additive and HDR so bloom makes
// them glow; a charred log teepee with glowing ember cracks, a stone ring, an ember bed, a flickering
// PointLight (#ff8a2a, seeded 7 Hz + 2 Hz flicker), rising embers and an optional ember burst (a log pop).
// The fire is Sahur's (Paperman rule: warm light only comes from him).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useThree } from '@react-three/fiber';
import { NOISE } from '../enemies/lib/glsl';
import { prng, fbm1 } from '../rig/util';
import { PAL } from '../lib/palette';

/** the fire's light flicker (multiplier around 1, about ±0.25), seeded noise at 7 Hz and 2 Hz */
export const fireFlicker = (time: number, seed = 3) => {
  const t = time / 60;
  return 1 + 0.16 * fbm1(t * 7, seed, 2) + 0.12 * fbm1(t * 2, seed + 9, 2);
};

const FLAME_VERT = /* glsl */ `
uniform vec3 uOffset; uniform vec2 uSize;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 c = (modelMatrix * vec4(uOffset, 1.0)).xyz;
  float sc = length(modelMatrix[0].xyz);
  vec3 toCam = cameraPosition - c; toCam.y = 0.0;
  toCam = length(toCam) > 1e-4 ? normalize(toCam) : vec3(0.0, 0.0, 1.0);
  vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
  vec3 p = c + right * (uv.x - 0.5) * uSize.x * sc + vec3(0.0, 1.0, 0.0) * uv.y * uSize.y * sc + toCam * 0.01;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FLAME_FRAG = /* glsl */ `
${NOISE}
uniform float uTime; uniform float uSeed; uniform float uInt;
varying vec2 vUv;
void main(){
  float x = (vUv.x - 0.5) * 2.0;
  float y = vUv.y;
  float n = fbm3(vec3(x * 1.4, y * 2.2 - uTime * 2.3, uTime * 0.35 + uSeed));
  float n2 = snoise(vec3(x * 3.2, y * 4.5 - uTime * 3.4, uSeed * 3.0 + uTime * 0.8));
  float yy = clamp(y, 0.0, 1.0);
  float w = mix(0.8, 0.04, sqrt(yy));
  float dx = x + n * 0.42 * yy + n2 * 0.09 * yy;
  float shape = 1.0 - smoothstep(w * 0.45, w, abs(dx));
  float body = shape * smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.45 + 0.3 * n, 0.98, y));
  float heat = body * (1.0 - yy * 0.85) * (1.0 - clamp(abs(dx) / max(w, 0.02), 0.0, 1.0) * 0.6);
  vec3 col = mix(vec3(0.9, 0.16, 0.03), vec3(1.0, 0.5, 0.1), smoothstep(0.1, 0.45, heat));
  col = mix(col, vec3(1.0, 0.86, 0.55), smoothstep(0.45, 0.85, heat));
  float a = clamp(body * (0.35 + heat * 1.3), 0.0, 1.0);
  gl_FragColor = vec4(col * uInt * (0.5 + 2.2 * heat) * a, a);
  #include <colorspace_fragment>
}`;

const EMBER_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime; uniform float uLife; uniform float uSize; uniform float uViewH; uniform float uRise;
varying float vA;
void main(){
  float life = uLife * (0.6 + 0.8 * aSeed.w);
  float age = mod(uTime + aSeed.x * 37.0, life);
  float k = age / life;
  vec3 p = vec3((aSeed.y - 0.5) * 0.35, 0.12, (aSeed.z - 0.5) * 0.35);
  p.y += age * uRise * (0.7 + 0.6 * aSeed.z);
  p.x += sin(age * 3.0 + aSeed.x * 20.0) * 0.08 * k + (aSeed.y - 0.5) * age * 0.25;
  p.z += cos(age * 2.6 + aSeed.y * 20.0) * 0.08 * k + (aSeed.z - 0.5) * age * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize * (0.6 + aSeed.w) * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
  gl_Position = projectionMatrix * mv;
  float flick = 0.6 + 0.4 * sin(uTime * 25.0 + aSeed.x * 60.0);
  vA = (1.0 - k) * (1.0 - k) * smoothstep(0.0, 0.05, k) * flick;
}`;
const EMBER_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  float m = exp(-d * d * 3.0) * (1.0 - smoothstep(0.8, 1.0, d));
  float a = m * vA;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`;

const BURST_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uAge; uniform vec3 uDir; uniform float uSize; uniform float uViewH; uniform float uPower;
varying float vA;
void main(){
  // a cone around uDir, with gravity and drag
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 side = normalize(cross(uDir, up) + vec3(1e-4));
  vec3 up2 = normalize(cross(side, uDir));
  float a = aSeed.x * 6.2831; float spread = 0.55 * sqrt(aSeed.y);
  vec3 v = normalize(uDir + side * cos(a) * spread + up2 * (sin(a) * spread + 0.35)) * uPower * (0.55 + 0.9 * aSeed.z);
  float t = uAge * (0.85 + 0.3 * aSeed.w);
  float drag = (1.0 - exp(-1.4 * t)) / 1.4;
  vec3 p = vec3(0.0, 0.18, 0.0) + v * drag + vec3(0.0, -0.9, 0.0) * t * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize * (0.6 + aSeed.w) * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vA = uAge <= 0.0 ? 0.0 : clamp(1.0 - t / (0.7 + 0.6 * aSeed.z), 0.0, 1.0) * (0.7 + 0.3 * sin(uAge * 40.0 + aSeed.x * 50.0));
}`;

const crackTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const w = 128, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const R = prng(61);
    // glowing cracks concentrated at the burning (top) end; canvas top = log top
    for (let i = 0; i < 70; i++) {
      const y0 = Math.pow(R(), 1.8) * h, x0 = R() * w;
      const a = R() * 255;
      g.strokeStyle = `rgba(255,${120 + R() * 100},${40 + R() * 40},${0.5 + R() * 0.5})`;
      g.lineWidth = 1 + R() * 2.5;
      g.beginPath(); g.moveTo(x0, y0);
      let x = x0, y = y0;
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 22; y += R() * 14; g.lineTo(x, y); }
      g.stroke();
      void a;
    }
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,140,40,0.55)'); gr.addColorStop(0.25, 'rgba(255,90,20,0.15)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
})();

// ---------------------------------------------------------------- stones
const stoneGeos = new Map<number, THREE.BufferGeometry>();
/** a lumpy rounded pebble (unit radius), smooth shaded */
function stoneGeometry(i: number) {
  const k = i % 5;
  if (stoneGeos.has(k)) return stoneGeos.get(k)!;
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const R = prng(900 + k);
  const bumps = Array.from({ length: 5 }, () => [new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), (R() - 0.5) * 0.35] as const);
  for (let j = 0; j < p.count; j++) {
    const v = new THREE.Vector3(p.getX(j), p.getY(j), p.getZ(j)).normalize();
    let r = 1;
    for (const [d, a] of bumps) r += a * Math.max(0, v.dot(d)) ** 2;
    if (v.y < -0.2) r *= 0.85 + 0.15 * (1 + v.y);
    p.setXYZ(j, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  stoneGeos.set(k, g);
  return g;
}
/** charred stone: near-black, with ember glow on the faces turned toward the fire (object-space dir) */
function stoneMaterial(dir: THREE.Vector3, heat: number) {
  const m = new THREE.MeshStandardMaterial({ color: '#1b1816', roughness: 0.82, metalness: 0 });
  const u = { uDir: { value: dir.clone() }, uGlow: { value: 1 }, uHeat: { value: heat } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN; varying vec3 vObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjN = normal; vObjP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uDir; uniform float uGlow; uniform float uHeat; varying vec3 vObjN; varying vec3 vObjP;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float inner = max(0.0, dot(normalize(vObjN), uDir));
        inner = inner * inner * inner;
        float speck = fract(sin(dot(floor(vObjP * 14.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float crack = smoothstep(0.55, 0.95, speck) * 0.6 + 0.4;
        totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * inner * crack * uGlow * uHeat * 1.6;
        diffuseColor.rgb *= 1.0 - 0.6 * inner;
      }`);
  };
  m.customProgramCacheKey = () => 'charStone';
  m.userData.u = u;
  return m;
}

export type CampfireProps = {
  time?: number;
  /** flame size/brightness multiplier */
  intensity?: number;
  /** PointLight candela at intensity 1 (storyboard L4: 40) */
  light?: number;
  lightDistance?: number;
  castShadow?: boolean;
  embers?: number;
  /** an ember burst (log pop): starts at frame `at`, `count` embers thrown toward `dir` (world) */
  burst?: { at: number; count?: number; dir: [number, number, number]; power?: number };
  seed?: number;
  /** hide the logs/stones (for a distant glow) */
  bare?: boolean;
};

const TONGUES = [
  { o: [0, 0.02, 0], s: [0.62, 0.98], seed: 1.3, i: 1.0 },
  { o: [0.1, 0.02, 0.05], s: [0.42, 0.72], seed: 4.1, i: 0.9 },
  { o: [-0.11, 0.02, -0.03], s: [0.44, 0.78], seed: 7.7, i: 0.9 },
  { o: [0.04, 0.02, -0.1], s: [0.36, 0.6], seed: 11.2, i: 0.85 },
  { o: [-0.05, 0.02, 0.1], s: [0.34, 0.56], seed: 15.9, i: 0.85 },
  { o: [0.0, 0.02, 0.02], s: [0.3, 1.15], seed: 21.4, i: 0.7 },
];

export const Campfire: React.FC<CampfireProps> = ({ time, intensity = 1, light = 40, lightDistance = 12, castShadow = true, embers = 120, burst, seed = 3, bare = false }) => {
  const frame = useCurrentFrame();
  const t = time ?? frame;
  const fl = fireFlicker(t, seed);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const flames = useMemo(() => TONGUES.map((q) => new THREE.ShaderMaterial({
    uniforms: { uOffset: { value: new THREE.Vector3(...(q.o as [number, number, number])) }, uSize: { value: new THREE.Vector2(...(q.s as [number, number])) }, uTime: { value: 0 }, uSeed: { value: q.seed + seed }, uInt: { value: 1 } },
    vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  })), [seed]);
  const quad = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), []);
  const emberGeo = useMemo(() => {
    const R = prng(seed * 131 + 7);
    const n = Math.max(1, embers);
    const sd = new Float32Array(n * 4); for (let i = 0; i < sd.length; i++) sd[i] = R();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
    return g;
  }, [embers, seed]);
  const burstGeo = useMemo(() => {
    const R = prng(seed * 977 + 1);
    const n = Math.max(1, burst?.count ?? 30);
    const sd = new Float32Array(n * 4); for (let i = 0; i < sd.length; i++) sd[i] = R();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
    return g;
  }, [burst?.count, seed]);
  const emberMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLife: { value: 1.5 }, uSize: { value: 0.016 }, uViewH: { value: 1080 }, uRise: { value: 0.4 }, uColor: { value: new THREE.Color(3.2, 1.3, 0.35) } },
    vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }), []);
  const burstMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 }, uDir: { value: new THREE.Vector3(0, 0, 1) }, uSize: { value: 0.02 }, uViewH: { value: 1080 }, uPower: { value: 1.6 }, uColor: { value: new THREE.Color(3.6, 1.5, 0.4) } },
    vertexShader: BURST_VERT, fragmentShader: EMBER_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }), []);
  const mats = useMemo(() => ({
    log: new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.9, emissive: new THREE.Color('#ff6a1a'), emissiveMap: crackTex(), emissiveIntensity: 1.6 }),
    bed: new THREE.MeshStandardMaterial({ color: '#1a0c06', roughness: 1, emissive: new THREE.Color('#ff5a14'), emissiveIntensity: 1.2, emissiveMap: crackTex() }),
  }), []);
  // dark, charred, rounded stones; each one glows with embers on the face turned to the fire
  const stones = useMemo(() => {
    const R = prng(seed + 50);
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + R() * 0.2;
      const p: [number, number, number] = [Math.cos(a) * (0.37 + R() * 0.04), 0.022, Math.sin(a) * (0.37 + R() * 0.04)];
      const s = 0.05 + R() * 0.03;
      const sc: [number, number, number] = [s * (1 + R() * 0.4), s * (0.62 + R() * 0.2), s * (0.9 + R() * 0.3)];
      const yaw = R() * 6.28;
      // direction to the fire centre in the stone's own (unscaled, yawed) frame
      const dir = new THREE.Vector3(-p[0], 0.25, -p[2]).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
      return { p, sc, yaw, mat: stoneMaterial(dir, 0.7 + R() * 0.6) };
    });
  }, [seed]);
  const ts = t / 60;
  const viewH = size.height * dpr;
  emberMat.uniforms.uViewH.value = viewH;
  burstMat.uniforms.uViewH.value = viewH;
  flames.forEach((m, i) => { m.uniforms.uTime.value = ts; m.uniforms.uInt.value = TONGUES[i].i * intensity * (0.85 + 0.3 * (fl - 1) + 0.15); });
  emberMat.uniforms.uTime.value = ts;
  mats.log.emissiveIntensity = 1.5 * fl * intensity;
  mats.bed.emissiveIntensity = 1.3 * fl * intensity;
  stones.forEach((s) => { (s.mat.userData.u as { uGlow: { value: number } }).uGlow.value = fl * intensity; });
  const bAge = burst ? (t - burst.at) / 60 : -1;
  if (burst) {
    burstMat.uniforms.uAge.value = bAge;
    (burstMat.uniforms.uDir.value as THREE.Vector3).set(...burst.dir).normalize();
    burstMat.uniforms.uPower.value = burst.power ?? 1.6;
  }
  return (
    <group>
      {!bare && (
        <>
          {/* the teepee: 5 charred sticks leaning into the centre */}
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 + 0.3;
            return (
              <group key={i} rotation={[0, -a, 0]}>
                <group rotation={[0, 0, 0.55]} position={[0.14, 0.12, 0]}>
                  <mesh material={mats.log} castShadow><cylinderGeometry args={[0.026, 0.04, 0.44, 8]} /></mesh>
                </group>
              </group>
            );
          })}
          {/* two crossed logs at the base */}
          <mesh material={mats.log} position={[0, 0.05, 0]} rotation={[0, 0.5, Math.PI / 2]} castShadow><cylinderGeometry args={[0.05, 0.055, 0.62, 10]} /></mesh>
          <mesh material={mats.log} position={[0, 0.07, 0]} rotation={[0, -0.9, Math.PI / 2]} castShadow><cylinderGeometry args={[0.045, 0.05, 0.56, 10]} /></mesh>
          <mesh material={mats.bed} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.3, 24]} /></mesh>
          {stones.map((s, i) => (
            <mesh key={i} geometry={stoneGeometry(i)} material={s.mat} position={s.p} rotation={[0, s.yaw, 0]} scale={s.sc} castShadow receiveShadow />
          ))}
        </>
      )}
      {flames.map((m, i) => <mesh key={i} geometry={quad} material={m} frustumCulled={false} renderOrder={10} />)}
      {embers > 0 && <points geometry={emberGeo} material={emberMat} frustumCulled={false} renderOrder={11} />}
      {burst && bAge > 0 && bAge < 2 && <points geometry={burstGeo} material={burstMat} frustumCulled={false} renderOrder={12} />}
      {light > 0 && (
        <pointLight position={[0, 0.35, 0]} color={PAL.fire} intensity={light * fl * intensity} distance={lightDistance} decay={2}
          castShadow={castShadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.003} shadow-radius={6} />
      )}
    </group>
  );
};
