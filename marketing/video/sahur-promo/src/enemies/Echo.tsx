// ECHO, THE ENGAGEMENT WRAITH (#ff3df0): a large magenta wraith wearing a smooth white mask with no
// expression of her own, trailed by louder, bigger, offset after-images of herself (each copy is
// a delayed echo of her motion, more opaque the further out it is, like the game's after-images).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow, GlowSprite } from './lib/scene';
import { bump, clamp, easeOutCubic, fract, invLerp } from './lib/math';
import { GHOST_VERT_BODY, GHOST_VERT_PARS, useGhostGeometry } from './Wraith';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type EchoProps = EnemyBase & {
  /** number of after-images (2-3) */
  echoes?: number;
  /** 0..1 attack pulse: the echoes flare and the ripple rings burst */
  burst?: number;
  /** hover height of the hem */
  hover?: number;
  /** 0..1 a crack draws across the mask (Sahur's bat) and the mask splits a little */
  maskCrack?: number;
  /** 0..1 the after-images scatter outward and dissolve; she recoils */
  scatter?: number;
};

// crack across the mask, in mask-local x,y (ellipse radii 0.18 x 0.225)
const MASK_CRACK: [number, number][] = [
  [-0.17, 0.09], [-0.12, 0.06], [-0.09, 0.08], [-0.04, 0.02], [0.0, 0.04], [0.03, -0.03], [0.07, -0.01], [0.11, -0.07], [0.17, -0.06],
];
const onMask = (x: number, y: number) => {
  const q = 1 - (x / 0.18) ** 2 - (y / 0.225) ** 2;
  return 0.12 * Math.sqrt(Math.max(0, q)) + 0.004;
};

const S = 2.35; // body scale relative to a prompt wraith

const ECHO_COLS = ['#ff3df0', '#ff5fd0', '#c07bff'];

const RIPPLE_FRAG = /* glsl */ `
#ifndef SQ_DEF
#define SQ_DEF
float sq(float x){ return x * x; }
#endif
uniform vec3 uCol; uniform float uR; uniform float uA;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float ring = exp(-sq((r - uR) / 0.012)) + 0.35 * exp(-sq((r - uR) / 0.05));
  float a = ring * uA;
  gl_FragColor = vec4(uCol * a * 1.6, a);
  #include <colorspace_fragment>
}`;
const PLAIN_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const Ripple: React.FC<{ r: number; a: number; color: string; y: number; z: number; size: number }> = ({ r, a, color, y, z, size }) => {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color() }, uR: { value: 0 }, uA: { value: 0 } },
        vertexShader: PLAIN_VERT,
        fragmentShader: RIPPLE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  (m.uniforms.uCol.value as THREE.Color).set(color);
  m.uniforms.uR.value = r;
  m.uniforms.uA.value = a;
  return (
    <mesh material={m} position={[0, y, z]} renderOrder={0}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

/** The mask (ghost-local units, dome radius 0.42): a porcelain half-ellipsoid with slot eyes and a flat mouth. */
const MASK_POS: [number, number, number] = [0, 0.776, 0.33];
const MASK_SCALE: [number, number, number] = [0.18, 0.225, 0.12];
const Mask: React.FC<{ mat: THREE.Material; ink: THREE.Material; crack?: number; crackMat?: THREE.Material }> = ({ mat, ink, crack = 0, crackMat }) => {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 48, 32, Math.PI / 2 - 1.15, 2.3, Math.PI / 2 - 1.2, 2.4), []);
  return (
    <group position={MASK_POS}>
      <mesh geometry={geo} material={mat} scale={MASK_SCALE} />
      <mesh material={ink} position={[-0.07, 0.03, 0.108]} rotation={[-0.05, -0.36, 0]}>
        <boxGeometry args={[0.05, 0.082, 0.014]} />
      </mesh>
      <mesh material={ink} position={[0.07, 0.03, 0.108]} rotation={[-0.05, 0.36, 0]}>
        <boxGeometry args={[0.05, 0.082, 0.014]} />
      </mesh>
      <mesh material={ink} position={[0, -0.11, 0.103]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.11, 0.024, 0.014]} />
      </mesh>
      {crack > 0 &&
        crackMat &&
        MASK_CRACK.slice(0, -1).map(([x0, y0], i) => {
          const segs = MASK_CRACK.length - 1;
          const f = Math.min(1, Math.max(0, crack * segs - i));
          if (f <= 0) return null;
          const [x1, y1] = MASK_CRACK[i + 1];
          const ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
          const len = Math.hypot(ex - x0, ey - y0);
          const mx = (x0 + ex) / 2, my = (y0 + ey) / 2;
          return (
            <mesh key={i} material={crackMat} position={[mx, my, onMask(mx, my)]} rotation={[0, mx * 2.2, Math.atan2(ey - y0, ex - x0)]}>
              <boxGeometry args={[len + 0.006, 0.007, 0.01]} />
            </mesh>
          );
        })}
    </group>
  );
};

export const Echo: React.FC<EchoProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, echoes = 3, burst = 0, hover = 0.35, maskCrack = 0, scatter = 0 }) => {
  const t = frame / 60 + seed * 2.7;
  const dead = clamp(death);
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.04, 0.8, dead);
  const geo = useGhostGeometry();
  const bob = 0.12 * Math.sin(t * 3.33); // game: sin(now/300)
  const hemU = useMemo(() => ({ uTeeth: { value: 12 }, uHemAmt: { value: 1 }, uSwayAmt: { value: 0.03 }, uHemTop: { value: 0.32 } }), []);
  const extra = { uTeeth: 12, uHemAmt: 1.1, uSwayAmt: 0.04, uHemTop: 0.34 };
  const body = {
    color: PAL.echo,
    deep: '#1c021c',
    rim: '#ff7af3',
    fill: 0.62,
    alphaCore: 0.4,
    rimStrength: 2.2,
    rimPower: 1.8,
    spec: 0.6,
    gloss: 45,
    glow: 0.06,
    opacity: 0.92,
    time: t,
    flash,
    dissolve,
    extra,
  };
  const back = useToy(body, { transparent: true, side: THREE.BackSide, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemU });
  const front = useToy(body, { transparent: true, side: THREE.FrontSide, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemU });
  const core = useToy({ color: '#3a0532', deep: '#0a0109', fill: 0.4, rim: PAL.echo, rimStrength: 0.9, glow: 0.02, spec: 0, flash, dissolve, opacity: 0.6, alphaCore: 0.4 }, { transparent: true });
  const mask = useToy({ color: '#f2ecdf', deep: '#8f8577', fill: 1, rim: '#ffb8f7', rimStrength: 0.55, rimPower: 3, spec: 1.6, gloss: 120, glow: 0.12, flash, dissolve, edge: PAL.echo }, { side: THREE.DoubleSide });
  const ink = useToy({ color: '#07090f', deep: '#000', fill: 1, rim: PAL.echo, rimStrength: 0.25, spec: 1.0, gloss: 90, flash: flash * 0.3, dissolve });
  const crackMat = useGlowMat('#ff9cf6', 2.6, 1, false);
  const SC = clamp(scatter);
  const sc2 = easeOutCubic(SC);
  const recoil = 0.5 * bump(0, 0.6, SC) + 0.25 * easeOutCubic(clamp(maskCrack));

  // after-image materials: fresnel-only additive glow, louder (more opaque) the further out
  const echoMats = [0, 1, 2].map((k) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useToy(
      {
        color: ECHO_COLS[k],
        deep: '#000000',
        rim: ECHO_COLS[k],
        fill: 0.0,
        alphaCore: 0.0,
        rimStrength: 1.6 + 0.5 * k + burst * 2,
        rimPower: 1.6,
        spec: 0,
        glow: 0.04 + 0.02 * k,
        opacity: (0.3 + 0.18 * k) * (1 - dissolve) * (1 - SC),
        time: t - 0.12 * (k + 1),
        extra: { ...extra, uSwayAmt: 0.05 + 0.02 * k },
      },
      { additive: true, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemU },
    ),
  );
  const echoMasks = [0, 1, 2].map((k) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useToy({ color: '#ffffff', deep: '#000', rim: ECHO_COLS[k], fill: 0.25, rimStrength: 1.2, spec: 0, glow: 0.0, opacity: (0.18 + 0.1 * k) * (1 - dissolve) * (1 - SC) }, { additive: true, side: THREE.DoubleSide }),
  );

  const alive = dead < 0.999;
  const baseY = hover + bob;
  const n = Math.max(0, Math.min(3, echoes));
  const rippleN = 3;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.echo} radius={2.3} intensity={0.45 * (1 - dissolve)} shadow={0.35} />}
      {/* ripple rings: her "engagement" pinging outward */}
      {Array.from({ length: rippleN }, (_, i) => {
        const ph = fract(t * 0.45 + i / rippleN);
        return <Ripple key={i} r={0.35 + ph * 0.6} a={(1 - ph) * (0.5 + burst) * (1 - dissolve)} color={PAL.echo} y={1.75 + bob} z={-1.1} size={7} />;
      })}
      {/* echoes, drawn back to front: further = bigger, louder, more delayed */}
      {alive &&
        Array.from({ length: n }, (_, j) => {
          const k = n - 1 - j;
          const i = k + 1;
          const td = t - 0.13 * i;
          const dirx = i % 2 ? 1 : -1;
          const ox = Math.sin(td * 4.17 + i) * 0.42 * i * (1 + burst * 0.6) + dirx * sc2 * (1.5 + i * 1.2);
          const oy = Math.cos(td * 3.33 + i) * 0.14 * i + 0.12 * Math.sin(td * 3.33) + sc2 * 0.5 * i;
          const sc = S * (1 + 0.09 * i + burst * 0.1 * i + sc2 * 0.3 * i);
          if (SC >= 0.999) return null;
          return (
            <group key={k} position={[ox, hover + oy, -0.35 * i - recoil]} scale={sc}>
              <mesh geometry={geo} material={echoMats[k]} />
              <mesh material={echoMasks[k]} position={MASK_POS} scale={MASK_SCALE}>
                <sphereGeometry args={[1, 32, 20, Math.PI / 2 - 1.15, 2.3, Math.PI / 2 - 1.2, 2.4]} />
              </mesh>
            </group>
          );
        })}
      {alive && (
        <group position={[0, baseY, -recoil]} rotation={[-0.12 * recoil, 0, 0]} scale={S}>
          <mesh material={core} position={[0, 0.45, -0.08]} scale={[0.17, 0.24, 0.15]}>
            <sphereGeometry args={[1, 32, 24]} />
          </mesh>
          <mesh geometry={geo} material={back} renderOrder={2} />
          <mesh geometry={geo} material={front} renderOrder={3} />
          <Mask mat={mask} ink={ink} crack={clamp(maskCrack)} crackMat={crackMat} />
        </group>
      )}
      {alive && <GlowSprite color={PAL.echo} size={3.2} intensity={0.25 + burst * 0.6} position={[0, baseY + 1.4, -0.3]} renderOrder={1} />}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.echo} origin={[0, baseY + 1.3, 0]} seed={seed + 61} count={70} radius={0.9} size={1.6} gravity={-0.8} ground={null} />}
    </group>
  );
};
