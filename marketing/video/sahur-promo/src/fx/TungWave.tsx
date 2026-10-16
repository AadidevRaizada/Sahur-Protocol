// TUNG: Sahur's bat strikes the ground and an amber (#ffb547) shockwave rolls out. A flat ground ring
// with a bright inner edge and dust streaks, a short glowing wall riding the front, a strike flash and
// light pillar, wood chips, and dust riding the ring. `big` = the final move: enormous, near-white core.
// Pair with <TungHeat> inside the EffectComposer for the screen-space heat ripple.
// Origin = the strike point on the ground. Pure function of `progress` 0..1.
import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PAL } from '../lib/palette';
import { useToy } from '../enemies/lib/toy';
import { FloorGlow, GlowSprite } from '../enemies/lib/scene';
import { useInstanced, setInst, commit } from '../enemies/lib/instanced';
import { bump, clamp, easeOutCubic, invLerp, mulberry32, TAU } from '../enemies/lib/math';
import { NOISE } from '../enemies/lib/glsl';

export type TungWaveProps = {
  progress: number;
  big?: boolean;
  /** max radius in metres (default 7, or 40 when big) */
  radius?: number;
  color?: string;
  seed?: number;
  /** wood chips flying from the strike */
  chips?: boolean;
  /** scales the strike flash, pillar and scorch (use ~0.15 when the camera is a few metres away) */
  flash?: number;
};

/** Ring radius curve shared by the wave and the heat effect. */
export const tungRadius = (p: number, maxR: number) => maxR * (1 - Math.pow(1 - clamp(p), 3));

const RING_VERT = /* glsl */ `varying vec2 vXZ; void main(){ vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FRAG = /* glsl */ `
${NOISE}
uniform float uR; uniform float uW; uniform float uA; uniform vec3 uCol; uniform vec3 uHot; uniform float uP; uniform float uScorch;
varying vec2 vXZ;
void main(){
  float r = length(vXZ);
  float ang = atan(vXZ.y, vXZ.x);
  float x = (uR - r) / max(uW, 1e-4);          // 0 at the front, 1 at the inner edge
  float n = snoise(vec3(cos(ang) * 3.0, sin(ang) * 3.0, uP * 2.0)) * 0.5 + 0.5;
  float streak = snoise(vec3(ang * 18.0, r * 0.15, 1.0)) * 0.5 + 0.5;
  float front = exp(-sq(x / 0.06));
  float inner = exp(-sq((x - 1.0) / 0.07));
  float body = smoothstep(-0.02, 0.05, x) * (1.0 - smoothstep(0.95, 1.08, x));
  float fill = body * (0.25 + 0.55 * streak) * (0.6 + 0.4 * n);
  vec3 c = uCol * (fill * 1.6 + front * 2.6) + uHot * inner * (3.0 + 1.6 * n);
  float a = clamp(fill * 0.8 + front + inner, 0.0, 1.0) * uA;
  // a faint scorched ring left behind
  float sc = uScorch * smoothstep(1.0, 2.5, x) * exp(-sq((r - uR * 0.35) / (uR * 0.5 + 0.01))) * 0.0;
  gl_FragColor = vec4(c * a, a);
  #include <colorspace_fragment>
}`;

const WALL_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const WALL_FRAG = /* glsl */ `
${NOISE}
uniform vec3 uCol; uniform vec3 uHot; uniform float uA; uniform float uP;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){
  float n = snoise(vec3(vUv.x * 40.0, vUv.y * 2.0 - uP * 3.0, uP)) * 0.5 + 0.5;
  float up = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
  float lick = smoothstep(0.2, 0.9, n + (1.0 - vUv.y) * 0.6);
  float side = 1.0 - abs(dot(normalize(vN), normalize(-vP)));
  vec3 c = mix(uCol, uHot, up * 0.6) * (1.2 + side);
  float a = up * lick * uA * (0.55 + 0.45 * side);
  gl_FragColor = vec4(c * a, a);
  #include <colorspace_fragment>
}`;

const DUST_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uR; uniform float uP; uniform float uSize; uniform float uViewH; uniform float uRise;
varying float vA;
void main(){
  float ang = aSeed.x * 6.2831853;
  float rr = uR * (0.78 + 0.28 * aSeed.y);
  vec3 p = vec3(cos(ang) * rr, (0.05 + aSeed.z * 0.6) * uRise * uP + 0.03, sin(ang) * rr);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize * (0.5 + aSeed.w) * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vA = (1.0 - uP) * (0.4 + 0.6 * aSeed.w);
}`;
const DUST_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uA;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float m = exp(-d * d * 3.0) * (1.0 - smoothstep(0.8, 1.0, d));
  float a = m * vA * uA;
  gl_FragColor = vec4(uCol * a, a);
  #include <colorspace_fragment>
}`;

export const TungWave: React.FC<TungWaveProps> = ({ progress, big = false, radius, color = PAL.real, seed = 1, chips = true, flash: flashK = 1 }) => {
  const p = clamp(progress);
  const viewH = useThree((st) => st.size.height * st.viewport.dpr);
  const maxR = radius ?? (big ? 40 : 7);
  const R = tungRadius(p, maxR);
  const W = maxR * (big ? 0.13 : 0.12) * (0.35 + 0.65 * easeOutCubic(p));
  const fade = 1 - invLerp(0.55, 1, p);
  const hot = big ? '#fff6e6' : '#ffe3b0';

  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uR: { value: 0 }, uW: { value: 1 }, uA: { value: 1 }, uCol: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }, uP: { value: 0 }, uScorch: { value: 0 } },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    [],
  );
  const wallMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }, uA: { value: 1 }, uP: { value: 0 } },
        vertexShader: WALL_VERT,
        fragmentShader: WALL_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const DN = big ? 520 : 220;
  const dust = useMemo(() => {
    const r = mulberry32(seed * 313 + 9);
    const g = new THREE.BufferGeometry();
    const s = new Float32Array(DN * 4);
    for (let i = 0; i < DN * 4; i++) s[i] = r();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: { uR: { value: 0 }, uP: { value: 0 }, uSize: { value: 0.3 }, uViewH: { value: 1080 }, uRise: { value: 1 }, uCol: { value: new THREE.Color() }, uA: { value: 1 } },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { g, m };
  }, [DN, seed]);
  useEffect(() => () => { ringMat.dispose(); wallMat.dispose(); dust.g.dispose(); dust.m.dispose(); }, [ringMat, wallMat, dust]);

  // wood chips: tumbling boxes thrown up and out of the strike, landing
  const CN = big ? 36 : 22;
  const chipGeo = useMemo(() => new THREE.BoxGeometry(1, 0.35, 0.55), []);
  const chipMat = useToy({ color: PAL.wood, deep: PAL.woodDark, rim: PAL.woodLight, rimStrength: 0.8, fill: 1, spec: 0.4, gloss: 20, glow: 0.05 }, { flat: true });
  const chipMesh = useInstanced(chipGeo, chipMat, CN);
  const chipData = useMemo(() => {
    const r = mulberry32(seed * 71 + 3);
    return Array.from({ length: CN }, () => ({ a: r() * TAU, v: 2 + r() * 4, up: 3 + r() * 4, s: 0.04 + r() * 0.07, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 8 + r() * 14 }));
  }, [CN, seed]);
  const k = big ? 2.6 : 1;
  let nc = 0;
  if (chips && p > 0) {
    const tt = p * 1.2;
    const q = new THREE.Quaternion();
    for (const c of chipData) {
      const hr = c.v * tt * k;
      let y = (c.up * tt - 4.9 * tt * tt) * Math.sqrt(k);
      const landed = y < 0;
      if (landed) y = 0.01;
      q.setFromAxisAngle(c.ax, landed ? c.spin * 0.4 : c.spin * tt);
      const sc = c.s * Math.sqrt(k) * (1 - invLerp(0.75, 1, p));
      if (sc <= 0.001) continue;
      setInst(chipMesh, nc++, [Math.cos(c.a) * hr, y + sc * 0.2, Math.sin(c.a) * hr], sc, q);
    }
  }
  commit(chipMesh, nc);

  const ringA = fade * (p > 0 ? 1 : 0);
  const u = ringMat.uniforms;
  u.uR.value = R;
  u.uW.value = W;
  u.uA.value = ringA;
  (u.uCol.value as THREE.Color).set(color);
  (u.uHot.value as THREE.Color).set(hot);
  u.uP.value = p;
  const wu = wallMat.uniforms;
  (wu.uCol.value as THREE.Color).set(color);
  (wu.uHot.value as THREE.Color).set(hot);
  wu.uA.value = ringA * (big ? 1.2 : 1);
  wu.uP.value = p;
  const du = dust.m.uniforms;
  du.uViewH.value = viewH;
  du.uR.value = R;
  du.uP.value = p;
  du.uSize.value = big ? 1.4 : 0.32;
  du.uRise.value = big ? 6 : 1.4;
  (du.uCol.value as THREE.Color).set(big ? '#ffd9a0' : '#c99a5a');
  du.uA.value = big ? 0.5 : 0.7;

  const wallH = maxR * (big ? 0.06 : 0.1) * (1 - 0.6 * p);
  const flash = bump(0, 0.18, p) * flashK;
  const pillar = bump(0, 0.3, p) * Math.min(1, flashK * 1.5);
  if (p <= 0 || p >= 1) return null;
  return (
    <group>
      <mesh material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={4}>
        <planeGeometry args={[maxR * 2.3, maxR * 2.3]} />
      </mesh>
      <mesh material={wallMat} position={[0, wallH / 2, 0]} renderOrder={5}>
        <cylinderGeometry args={[R, R * 1.02, wallH, 128, 1, true]} />
      </mesh>
      <points geometry={dust.g} material={dust.m} frustumCulled={false} renderOrder={5} />
      <primitive object={chipMesh} />
      {/* strike flash + pillar of light */}
      <GlowSprite color={hot} size={(big ? 14 : 2.4) * Math.min(1, flashK) * (0.4 + flash)} intensity={(big ? 4 : 2.6) * flash} position={[0, big ? 1.5 * Math.min(1, flashK * 2) : 0.3, 0]} renderOrder={6} />
      <GlowSprite color={color} size={(big ? 30 : 4.5) * Math.min(1, flashK) * (0.5 + 0.5 * flash)} intensity={(big ? 1.4 : 1.0) * (flash + 0.2 * fade * flashK)} position={[0, big ? 2 * Math.min(1, flashK * 2) : 0.4, 0]} renderOrder={6} />
      {/* scorched glow under the strike */}
      <FloorGlow color={color} radius={maxR * 0.3 * Math.min(1, 0.2 + flashK) * (0.4 + 0.6 * easeOutCubic(p))} intensity={1.4 * fade} shadow={0} y={0.015} />
      {pillar > 0.01 && (
        <mesh position={[0, (big ? 30 : 4) / 2, 0]} renderOrder={6}>
          <cylinderGeometry args={[(big ? 1.2 * Math.min(1, flashK * 1.5) : 0.06) * pillar, (big ? 3 * Math.min(1, flashK * 1.5) : 0.18) * pillar, big ? 30 : 4, 16, 1, true]} />
          <meshBasicMaterial color={new THREE.Color(hot).multiplyScalar(2.5 * pillar)} transparent opacity={0.6 * pillar} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};
