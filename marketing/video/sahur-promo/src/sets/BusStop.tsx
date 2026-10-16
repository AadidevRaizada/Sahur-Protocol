// The bus stop in the forest (owner: journey builder): S19, the meme's first image made warm.
// Origin = the ground under the middle of the bench's front edge; the shelter faces -Z (the "road"):
// seat from z = 0 to +0.34, back panel at z = +0.6, roof overhang to z = -0.85.
// Metres. Pure function of `time` (frames).
//
//   <BusStop time={f} seatHeight={0.29} drizzle={600} lanternAt={[x, y, z]} />
//
// A rusted corrugated roof on two posts, a back panel, a plank bench, a blank sign disc on a pole, a
// hook for the lantern (BUS_STOP.hook), glitch drizzle (thin cyan-white streaks) and a row of drips
// off the roof's front edge, lit amber near the lantern (`lanternAt`, world point) and cool elsewhere.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { prng, noise2, clamp } from '../rig/util';

export const BUS_STOP = {
  width: 2.6, roofH: 2.25,
  /** seat: front edge at z = 0, back at z = +0.34 (sitters face -Z) */
  seatFront: 0, seatBack: 0.34,
  /** the roof's front edge (drips) */
  roofFrontZ: -0.85,
  /** the lantern hook under the front beam (local) */
  hook: [0.3, 2.17, -0.6] as [number, number, number],
  /** the sign disc centre (local) */
  sign: [-1.75, 2.0, -0.7] as [number, number, number],
};

const rustTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    const R = prng(17);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = noise2(x / 40, y / 40, 5) * 0.6 + noise2(x / 9, y / 9, 6) * 0.3 + (R() - 0.5) * 0.15;
      const rust = clamp(0.5 + n);
      const ridge = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 22);
      const i = (y * w + x) * 4;
      const base = [70 + 40 * rust, 46 + 18 * rust, 34 + 6 * rust];
      const k = 0.7 + 0.3 * ridge;
      img.data[i] = base[0] * k; img.data[i + 1] = base[1] * k; img.data[i + 2] = base[2] * k; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // drip streaks
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(40,22,12,${0.15 + R() * 0.3})`; g.fillRect(R() * w, R() * h * 0.5, 1 + R() * 2, 20 + R() * 80); }
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
})();

const plankTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const w = 512, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    g.fillStyle = '#5a4430'; g.fillRect(0, 0, w, h);
    const R = prng(23);
    for (let l = 0; l < 40; l++) { g.strokeStyle = `rgba(30,18,10,${0.15 + R() * 0.3})`; g.lineWidth = 0.6 + R(); const y0 = R() * h; g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.02 + l) * 2); g.stroke(); }
    g.fillStyle = 'rgba(20,12,6,0.8)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
})();

// ---- glitch drizzle: thin falling streaks as line segments, animated in the vertex shader
const RAIN_VERT = /* glsl */ `
attribute vec4 aSeed; attribute float aEnd;
uniform float uTime; uniform vec3 uBox; uniform float uLen; uniform float uSpeed;
varying float vA; varying float vEnd;
void main(){
  float H = uBox.y;
  float fall = mod(uTime * uSpeed * (0.8 + 0.4 * aSeed.w) + aSeed.y * H, H);
  vec3 p = vec3((aSeed.x - 0.5) * uBox.x, H - fall, (aSeed.z - 0.5) * uBox.z);
  p.y += aEnd * uLen * (0.7 + 0.6 * aSeed.w);
  p.x += aEnd * uLen * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  // pixel glitch: some streaks blink in steps
  float st = floor(uTime * 15.0 + aSeed.x * 40.0);
  float blink = step(0.12, fract(sin(st * 12.9898 + aSeed.z * 78.233) * 43758.5453));
  vA = (0.35 + 0.65 * aSeed.w) * blink * smoothstep(0.0, 0.4, fall) * (1.0 - smoothstep(H - 0.3, H, fall));
  vEnd = aEnd;
}`;
const RAIN_FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity;
varying float vA; varying float vEnd;
void main(){
  vec3 c = mix(uColor2, uColor, vEnd);
  float a = vA * uOpacity * (0.4 + 0.6 * vEnd);
  gl_FragColor = vec4(c * a, a);
  #include <colorspace_fragment>
}`;

export const Drizzle: React.FC<{ time: number; count?: number; box?: [number, number, number]; center?: [number, number, number]; speed?: number; opacity?: number; seed?: number }> = ({ time, count = 600, box = [8, 4, 6], center = [0, 0, -3], speed = 4.5, opacity = 0.55, seed = 3 }) => {
  const geo = useMemo(() => {
    const R = prng(seed * 71 + 9);
    const sd = new Float32Array(count * 2 * 4), end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const s = [R(), R(), R(), R()];
      sd.set(s, i * 8); sd.set(s, i * 8 + 4);
      end[i * 2] = 0; end[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    return g;
  }, [count, seed]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBox: { value: new THREE.Vector3() }, uLen: { value: 0.16 }, uSpeed: { value: 4.5 }, uColor: { value: new THREE.Color('#d8fbff') }, uColor2: { value: new THREE.Color('#35e8ff') }, uOpacity: { value: 0.5 } },
    vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }), []);
  mat.uniforms.uTime.value = time / 60;
  (mat.uniforms.uBox.value as THREE.Vector3).set(...box);
  mat.uniforms.uSpeed.value = speed;
  mat.uniforms.uOpacity.value = opacity;
  return <lineSegments geometry={geo} material={mat} position={[center[0], center[1], center[2]]} frustumCulled={false} renderOrder={6} />;
};

/** one drip falling off the roof edge: forms (hangs, swells), falls with gravity, repeats */
const Drips: React.FC<{ time: number; xs: number[]; y: number; z: number; lantern?: THREE.Vector3; group: THREE.Matrix4 }> = ({ time, xs, y, z, lantern, group }) => {
  const mats = useMemo(() => xs.map(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true })), [xs.length]);
  const geo = useMemo(() => new THREE.SphereGeometry(0.009, 8, 6), []);
  return (
    <>
      {xs.map((x, i) => {
        const period = 34 + (i * 7) % 19;
        const ph = ((time + i * 13) % period) / period; // 0..1
        const hang = ph < 0.55;
        const fall = hang ? 0 : (ph - 0.55) / 0.45;
        const t = fall * period / 60;
        const yy = y - (hang ? 0.004 * ph : 4.9 * t * t);
        const swell = hang ? 0.6 + 0.7 * (ph / 0.55) : 1;
        const world = new THREE.Vector3(x, yy, z).applyMatrix4(group);
        const near = lantern ? clamp(1 - world.distanceTo(lantern) / 1.6) : 0;
        const c = new THREE.Color('#bfeeff').lerp(new THREE.Color(3.2, 1.9, 0.7), near).multiplyScalar(1.2 + 1.6 * near);
        mats[i].color.copy(c);
        mats[i].opacity = yy < 0.02 ? 0 : 0.9;
        return <mesh key={i} geometry={geo} material={mats[i]} position={[x, yy, z]} scale={[swell * 0.9, swell * (hang ? 1.1 : 1.8), swell * 0.9]} />;
      })}
    </>
  );
};

export type BusStopProps = {
  time?: number;
  seatHeight?: number;
  drizzle?: number;
  /** world position of the lantern (drips near it glow amber) */
  lanternAt?: [number, number, number];
  position?: [number, number, number];
  rot?: number;
};

export const BusStop: React.FC<BusStopProps> = ({ time, seatHeight = 0.29, drizzle = 600, lanternAt, position = [0, 0, 0], rot = 0 }) => {
  const frame = useCurrentFrame();
  const t = time ?? frame;
  const { width: W, roofH, roofFrontZ } = BUS_STOP;
  const mats = useMemo(() => {
    const roofT = rustTex().clone(); roofT.needsUpdate = true; roofT.repeat.set(1, 1);
    return {
      roof: new THREE.MeshStandardMaterial({ map: roofT, roughness: 0.75, metalness: 0.35, bumpMap: roofT, bumpScale: 2, side: THREE.DoubleSide }),
      post: new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.6, metalness: 0.5, map: rustTex() }),
      panel: new THREE.MeshStandardMaterial({ color: '#2a2f30', roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.55 }),
      plank: new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.8 }),
      sign: new THREE.MeshStandardMaterial({ color: '#6b7a80', roughness: 0.55, metalness: 0.6, map: rustTex() }),
      dark: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7, metalness: 0.4 }),
    };
  }, []);
  const groupM = useMemo(() => new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1)), [position[0], position[1], position[2], rot]);
  const dripXs = useMemo(() => Array.from({ length: 14 }, (_, i) => -W / 2 + 0.12 + (i / 13) * (W - 0.24)), [W]);
  const lv = lanternAt ? new THREE.Vector3(...lanternAt) : undefined;
  const sh = seatHeight;
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {/* roof: corrugated sheet from the back panel to an overhang at the front, tilted back */}
      <mesh material={mats.roof} position={[0, roofH + 0.02, (roofFrontZ + 0.75) / 2]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.3, 0.03, 0.75 - roofFrontZ]} />
      </mesh>
      {/* the front beam (the lantern hangs from it) */}
      <mesh material={mats.dark} position={[0, roofH - 0.04, -0.6]} castShadow>
        <boxGeometry args={[W + 0.2, 0.07, 0.06]} />
      </mesh>
      {/* four posts */}
      {[-1, 1].map((sx) => [-0.6, 0.6].map((z) => (
        <mesh key={sx + ':' + z} material={mats.post} position={[sx * (W / 2 + 0.03), roofH / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.07, roofH, 0.07]} />
        </mesh>
      )))}
      {/* the back panel (scratched glass) */}
      <mesh material={mats.panel} position={[0, 1.15, 0.6]}>
        <boxGeometry args={[W, 1.6, 0.02]} />
      </mesh>
      {/* the bench: two seat planks on brackets, a back plank */}
      {[0.08, 0.25].map((z) => (
        <mesh key={z} material={mats.plank} position={[0, sh - 0.02, z]} castShadow receiveShadow>
          <boxGeometry args={[W - 0.3, 0.04, 0.15]} />
        </mesh>
      ))}
      <mesh material={mats.plank} position={[0, sh + 0.34, 0.4]} rotation={[0.15, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.3, 0.14, 0.035]} />
      </mesh>
      {[-1, 0, 1].map((sx) => (
        <mesh key={'b' + sx} material={mats.dark} position={[sx * (W / 2 - 0.3), sh / 2 - 0.02, 0.17]} castShadow>
          <boxGeometry args={[0.05, sh, 0.32]} />
        </mesh>
      ))}
      {/* the sign: a blank, faded disc on a pole, facing the road */}
      <mesh material={mats.post} position={[BUS_STOP.sign[0], 1.25, BUS_STOP.sign[2]]} castShadow><cylinderGeometry args={[0.025, 0.03, 2.5, 8]} /></mesh>
      <mesh material={mats.sign} position={BUS_STOP.sign} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.02, 32]} /></mesh>
      <mesh material={mats.dark} position={[BUS_STOP.sign[0], BUS_STOP.sign[1], BUS_STOP.sign[2] - 0.012]} rotation={[0, Math.PI, 0]}><ringGeometry args={[0.2, 0.235, 32]} /></mesh>
      {/* the lantern hook */}
      <mesh material={mats.dark} position={[BUS_STOP.hook[0], BUS_STOP.hook[1] + 0.02, BUS_STOP.hook[2]]}><cylinderGeometry args={[0.008, 0.008, 0.06, 6]} /></mesh>
      <Drips time={t} xs={dripXs} y={roofH - 0.035} z={roofFrontZ + 0.02} lantern={lv} group={groupM} />
      {drizzle > 0 && <Drizzle time={t} count={drizzle} box={[9, 4.2, 6]} center={[0, 0, -4.0]} />}
    </group>
  );
};
