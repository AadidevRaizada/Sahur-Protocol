// Battle-only FX: landing dust puffs, the TUNG #2 water ring wall with its spray, flying wood chips,
// flying blank papers. All pure functions of their progress / frame props.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { prng } from '../../rig/util';
import { PAL } from '../../lib/palette';
import { clamp, invLerp, outCubic } from './kit';
import { tungRadius } from '../../fx/TungWave';

// ---------------- dust puff (soft points) ----------------
const PUFF_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uP; uniform float uR; uniform float uRise; uniform float uSize; uniform float uViewH;
varying float vA;
void main(){
  float a = aSeed.x * 6.2831853;
  float e = 1.0 - pow(1.0 - uP, 3.0);
  float rr = uR * (0.25 + 0.75 * aSeed.y) * e;
  vec3 p = position + vec3(cos(a) * rr, (0.05 + aSeed.z * uRise) * e, sin(a) * rr);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float s = uSize * (0.6 + aSeed.w) * (0.5 + 1.2 * e);
  gl_PointSize = max(1.0, s * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
  vA = (1.0 - smoothstep(0.35, 1.0, uP)) * smoothstep(0.0, 0.06, uP);
  gl_Position = projectionMatrix * mv;
}`;
const PUFF_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uA;
varying float vA;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  float m = exp(-d * d * 3.0) * (1.0 - smoothstep(0.85, 1.0, d));
  gl_FragColor = vec4(uCol, m * vA * uA);
  #include <colorspace_fragment>
}`;

export const DustPuff: React.FC<{ progress: number; origin: [number, number, number]; radius?: number; rise?: number; size?: number; count?: number; color?: string; opacity?: number; seed?: number }> = ({
  progress, origin, radius = 1.2, rise = 0.6, size = 0.5, count = 40, color = '#8a6a44', opacity = 0.55, seed = 1,
}) => {
  const viewH = useThree((s) => s.size.height * s.viewport.dpr);
  const { g, m } = useMemo(() => {
    const R = prng(seed * 97 + 3);
    const g = new THREE.BufferGeometry();
    const s = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) s[i] = R();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: { uP: { value: 0 }, uR: { value: 1 }, uRise: { value: 1 }, uSize: { value: 0.5 }, uViewH: { value: 1080 }, uCol: { value: new THREE.Color() }, uA: { value: 1 } },
      vertexShader: PUFF_VERT, fragmentShader: PUFF_FRAG, transparent: true, depthWrite: false,
    });
    return { g, m };
  }, [count, seed]);
  useEffect(() => () => { g.dispose(); m.dispose(); }, [g, m]);
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return null;
  m.uniforms.uP.value = p;
  m.uniforms.uR.value = radius;
  m.uniforms.uRise.value = rise;
  m.uniforms.uSize.value = size;
  m.uniforms.uViewH.value = viewH;
  (m.uniforms.uCol.value as THREE.Color).set(color);
  m.uniforms.uA.value = opacity;
  return <points geometry={g} material={m} position={origin} frustumCulled={false} renderOrder={7} />;
};

// ---------------- water ring wall (TUNG #2 across the coolant river) ----------------
const WALL_VERT = /* glsl */ `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WALL_FRAG = /* glsl */ `
uniform float uHalf; uniform float uA; uniform float uT; uniform vec3 uCol;
varying vec3 vW; varying vec2 vUv;
float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float vn(float x){ float i = floor(x), f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(h(i), h(i + 1.0), u); }
void main(){
  float cx = 3.0 - 0.25 * vW.z;
  float c = abs(vW.x - cx) / uHalf;
  if (c > 1.0) discard;
  float ang = vUv.x * 6.2831853;
  // ragged crest: the wall top is noisy, foam is white at the crest
  float crest = 0.6 + 0.4 * vn(ang * 40.0 + uT * 3.0) * vn(ang * 13.0 - uT);
  float y = vUv.y;
  if (y > crest) discard;
  float foam = smoothstep(crest - 0.25, crest, y);
  float body = 0.35 + 0.65 * y;
  float edge = 1.0 - smoothstep(0.75, 1.0, c);
  vec3 col = uCol * body * 3.0 + vec3(2.2, 2.6, 2.8) * foam;
  float a = uA * edge * (0.6 + 0.4 * y);
  gl_FragColor = vec4(col * a, a);
  #include <colorspace_fragment>
}`;

export const WaterRing: React.FC<{
  /** TUNG progress (same as the TungWave) */
  progress: number;
  center: [number, number];
  maxR: number;
  half: number;
  riverX: (z: number) => number;
  height?: number;
  frame: number;
  /** frames the TungWave takes for progress 0..1 */
  dur: number;
}> = ({ progress, center, maxR, half, riverX, height = 0.8, frame, dur }) => {
  const viewH = useThree((s) => s.size.height * s.viewport.dpr);
  const p = clamp(progress);
  const R = tungRadius(p, maxR);
  const wallMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uHalf: { value: 1 }, uA: { value: 1 }, uT: { value: 0 }, uCol: { value: new THREE.Color(PAL.cyan) } },
    vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), []);
  // spray: 400 droplets thrown up where the ring front crosses the river
  const N = 400;
  const spray = useMemo(() => {
    const Rn = prng(4242);
    const parts: { dir: THREE.Vector2; rho: number; up: number; out: number; s: number }[] = [];
    for (let i = 0; i < N * 3 && parts.length < N; i++) {
      const a = Rn() * Math.PI * 2;
      const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
      // march out to find where this ray is inside the river
      let enter = -1, exit = -1;
      for (let r = 0.2; r < maxR; r += 0.1) {
        const x = center[0] + dir.x * r, z = center[1] + dir.y * r;
        const inside = Math.abs(x - riverX(z)) < half;
        if (inside && enter < 0) enter = r;
        if (!inside && enter >= 0) { exit = r; break; }
      }
      if (enter < 0) continue;
      if (exit < 0) exit = Math.min(maxR, enter + half * 2);
      parts.push({ dir, rho: enter + Rn() * (exit - enter), up: 2.2 + Rn() * 3.2, out: 0.6 + Rn() * 1.8, s: 0.6 + Rn() * 0.8 });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(N), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uViewH: { value: 1080 }, uSize: { value: 0.06 }, uCol: { value: new THREE.Color(PAL.cyan) } },
      vertexShader: /* glsl */ `attribute float aS; uniform float uViewH; uniform float uSize; varying float vS;
        void main(){ vS = aS; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, uSize * aS * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform vec3 uCol; varying float vS;
        void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (vS <= 0.0 || d > 1.0) discard; float m = 1.0 - d * d;
          gl_FragColor = vec4((uCol * 2.0 + vec3(0.8)) * m, m);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { parts, g, m };
  }, [center[0], center[1], maxR, half, riverX]);
  useEffect(() => () => { wallMat.dispose(); spray.g.dispose(); spray.m.dispose(); }, [wallMat, spray]);
  const t0 = frame - p * dur; // frame the strike happened
  const pos = spray.g.attributes.position as THREE.BufferAttribute;
  const sz = spray.g.attributes.aS as THREE.BufferAttribute;
  spray.parts.forEach((q, i) => {
    const ps = 1 - Math.cbrt(Math.max(0, 1 - q.rho / maxR));
    const fs = t0 + ps * dur;
    const dt = (frame - fs) / 60;
    if (dt <= 0) { sz.setX(i, 0); return; }
    const y = q.up * dt - 4.9 * dt * dt;
    if (y < 0) { sz.setX(i, 0); return; }
    const r = q.rho + q.out * dt;
    pos.setXYZ(i, center[0] + q.dir.x * r, 0.06 + y, center[1] + q.dir.y * r);
    sz.setX(i, q.s * (1 - clamp(dt / 0.9)));
  });
  pos.needsUpdate = true;
  sz.needsUpdate = true;
  spray.m.uniforms.uViewH.value = viewH;
  wallMat.uniforms.uHalf.value = half;
  wallMat.uniforms.uT.value = frame / 60;
  wallMat.uniforms.uA.value = (1 - invLerp(0.55, 1, p)) * (p > 0 ? 1 : 0);
  const H = height * (0.5 + 0.5 * outCubic(invLerp(0, 0.25, p))) * (1 - 0.5 * invLerp(0.5, 1, p));
  return (
    <group>
      {p > 0 && p < 1 && (
        <mesh material={wallMat} position={[center[0], H / 2 + 0.04, center[1]]} scale={[R, H, R]} renderOrder={6}>
          <cylinderGeometry args={[1, 1, 1, 160, 1, true]} />
        </mesh>
      )}
      <points geometry={spray.g} material={spray.m} frustumCulled={false} renderOrder={7} />
    </group>
  );
};

// ---------------- a spinning wood chip ----------------
export const Chip: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; size?: number; glow?: number }> = ({ position, rotation, size = 0.02, glow = 0 }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c4874a', roughness: 0.7, emissive: new THREE.Color(PAL.real) }), []);
  mat.emissiveIntensity = glow;
  return (
    <mesh position={position} rotation={rotation} material={mat} scale={[size, size * 0.35, size * 0.6]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
};

// ---------------- blank papers thrown up off the table ----------------
export const Papers: React.FC<{ frame: number; at: number; origin: [number, number, number]; count?: number; spread?: number; seed?: number }> = ({ frame, at, origin, count = 14, spread = 1.4, seed = 3 }) => {
  const items = useMemo(() => {
    const R = prng(seed * 13 + 1);
    return Array.from({ length: count }, () => ({
      x: (R() - 0.5) * spread, z: (R() - 0.5) * spread * 1.6, yaw: R() * 6.28,
      up: 1.6 + R() * 2.4, vx: (R() - 0.5) * 1.6, vz: (R() - 0.5) * 1.6 + 0.4, spin: [(R() - 0.5) * 14, (R() - 0.5) * 8, (R() - 0.5) * 14] as [number, number, number], delay: R() * 2,
    }));
  }, [count, spread, seed]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9ecf2', roughness: 0.6, side: THREE.DoubleSide, emissive: new THREE.Color('#c8d0dc'), emissiveIntensity: 0.55 }), []);
  return (
    <group position={origin}>
      {items.map((q, i) => {
        const dt = Math.max(0, (frame - at - q.delay) / 60);
        // flutter: drag-limited fall
        const y = dt > 0 ? q.up * dt - 3.2 * dt * dt + 0.12 * Math.sin(dt * 9 + i) * dt : 0;
        const yy = Math.max(0.004 + i * 0.0005, y);
        const k = Math.min(1, dt * 1.4);
        return (
          <mesh key={i} material={mat} position={[q.x + q.vx * dt, yy, q.z + q.vz * dt]} rotation={[-Math.PI / 2 + q.spin[0] * dt * k, q.yaw + q.spin[1] * dt, q.spin[2] * dt * k]} castShadow>
            <planeGeometry args={[0.21, 0.297]} />
          </mesh>
        );
      })}
    </group>
  );
};
