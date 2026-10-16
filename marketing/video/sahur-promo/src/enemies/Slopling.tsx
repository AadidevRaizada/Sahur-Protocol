// SLOPLING (#ff3df0): "generated filler given legs". A jelly blob of magenta slop with a dark core,
// undigested filler bits floating inside, two pixel-square eyes, a drip that stretches and falls,
// and a faint wireframe "bounding box" that glitches (the game strokes a rect around it).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy } from './lib/toy';
import { FloorGlow } from './lib/scene';
import { bump, clamp, easeInCubic, easeOutCubic, fract, hash, invLerp, lerp, TAU } from './lib/math';
import { SlopSplat } from '../fx/SlopSplat';
import type { EnemyBase } from './types';

export type SloplingProps = EnemyBase & {
  /** 0..1 extra wobble (e.g. when chasing) */
  agitation?: number;
};

const BODY_VERT = /* glsl */ `
  float b = smoothstep(0.0, -0.5, p.y);
  p.xz *= 1.0 + 0.1 * b;
  p.y = mix(p.y, max(p.y, -0.36), b);
  p.y += 0.06 * smoothstep(0.1, 0.5, p.y);
`;

const R = 0.5;

const BBox: React.FC<{ frame: number; seed: number; opacity: number }> = ({ frame, seed, opacity }) => {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.14, 1.0, 1.14)), []);
  const mats = useMemo(
    () =>
      ['#ff3df0', '#35e8ff', '#ffffff'].map(
        (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, depthWrite: false, toneMapped: false }),
      ),
    [],
  );
  // glitch: short bursts on a seeded schedule
  const block = Math.floor(frame / 7);
  const g = hash(block, seed) > 0.72 ? 1 : 0;
  const jx = g ? (hash(frame, seed + 3) - 0.5) * 0.14 : 0;
  const js = g ? 1 + (hash(frame, seed + 5) - 0.5) * 0.06 : 1;
  mats[0].color.set('#ff3df0').multiplyScalar(1.4);
  mats[0].opacity = 0.38 * opacity * (g ? 1.6 : 1);
  mats[1].opacity = g ? 0.45 * opacity : 0;
  mats[2].color.set('#ffffff').multiplyScalar(1.2);
  mats[2].opacity = g ? 0.25 * opacity : 0;
  if (opacity <= 0.001) return null;
  return (
    <group position={[0, 0.5, 0]}>
      <lineSegments geometry={geo} material={mats[0]} position={[jx, 0, 0]} scale={js} />
      <lineSegments geometry={geo} material={mats[1]} position={[jx + 0.05, 0.01, 0]} scale={js} />
      <lineSegments geometry={geo} material={mats[2]} position={[jx - 0.04, -0.01, 0]} scale={js * 1.01} />
    </group>
  );
};

export const Slopling: React.FC<SloplingProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, agitation = 0 }) => {
  const t = frame / 60 + seed * 1.37;
  const dead = clamp(death);
  // jelly squash and stretch (game: sin(now/120)) with volume preservation
  const w = Math.sin(t * 8.3) * (1 + agitation) + 0.35 * Math.sin(t * 13.1 + 1.3);
  const squash = easeOutCubic(invLerp(0, 0.2, dead));
  let sy = 1 + 0.065 * w;
  let sxz = 1 / Math.sqrt(sy);
  sy = lerp(sy, 0.16, squash);
  sxz = lerp(sxz, 1.75, squash);
  const lean = 0.06 * Math.sin(t * 4.1);
  const flash = Math.max(hit, bump(0, 0.18, dead));
  const bodyDissolve = invLerp(0.42, 0.95, dead);

  const shell = useToy(
    {
      color: PAL.slopling,
      deep: '#2a0428',
      fill: 0.85,
      alphaCore: 0.42,
      rimStrength: 2.1,
      rimPower: 2.0,
      spec: 1.5,
      gloss: 90,
      glow: 0.06,
      wobble: 0.028 + agitation * 0.02,
      wobbleFreq: 2.4,
      time: t,
      flash,
      dissolve: bodyDissolve,
      noiseScale: 3.5,
    },
    { transparent: true, vertBody: BODY_VERT },
  );
  const core = useToy({ color: '#5a0852', deep: '#0c010a', fill: 0.5, rim: PAL.slopling, rimStrength: 0.5, glow: 0.02, spec: 0, flash, dissolve: bodyDissolve });
  const bits = useToy({ color: '#ffd6fb', fill: 1, glow: 0.6, spec: 0.3, rimStrength: 0.4, flash, dissolve: bodyDissolve });
  const eye = useToy({ color: '#07090f', deep: '#000000', fill: 1, rim: PAL.slopling, rimStrength: 0.35, spec: 1.8, gloss: 140, glow: 0, flash: flash * 0.3, dissolve: bodyDissolve });
  const goo = useToy({ color: PAL.slopling, deep: '#2a0428', fill: 0.95, spec: 1.5, gloss: 100, rimStrength: 1.6, glow: 0.16, flash, dissolve: bodyDissolve });

  // drip: stretches down the front-right, the bulb drops off, lands, and becomes a small puddle
  const u = fract(t / 1.7 + seed * 0.37);
  const grow = easeInCubic(invLerp(0, 0.62, u));
  const fall = invLerp(0.62, 0.8, u);
  const neckLen = fall > 0 ? lerp(0.05 + 0.2 * grow, 0.02, easeOutCubic(fall)) : 0.05 + 0.2 * grow;
  const bulbR = 0.045 + 0.03 * grow;
  const attach: [number, number, number] = [0.36, -0.1, 0.27];
  const bulbY = fall > 0 ? lerp(attach[1] - neckLen - bulbR * 0.5, -0.36 + 0.01, easeInCubic(fall)) : attach[1] - neckLen - bulbR * 0.4;
  const landed = u > 0.8;
  const puddleR = landed ? 0.07 * easeOutCubic(invLerp(0.8, 0.86, u)) * (1 - invLerp(0.9, 1, u)) : 0;

  // filler bits orbiting inside the jelly
  const bitPos = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * TAU, r: 0.12 + (i % 3) * 0.06, y: -0.05 + (i % 2) * 0.09, s: 0.035 + (i % 3) * 0.012 })), []);

  const bodyY = 0.36 * sy;
  const alive = dead < 0.999;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.slopling} radius={lerp(0.95, 1.3, squash)} intensity={0.55 * (1 - bodyDissolve)} shadow={0.6} />}
      {alive && (
        <group position={[0, bodyY, 0]} rotation={[0, 0, lean]} scale={[sxz, sy, sxz]}>
          <mesh material={shell} renderOrder={2}>
            <sphereGeometry args={[R, 72, 54]} />
          </mesh>
          <mesh material={core} position={[0, -0.04, -0.04]} scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.31, 32, 24]} />
          </mesh>
          {bitPos.map((b, i) => (
            <mesh
              key={i}
              material={bits}
              position={[Math.cos(b.a + t * 0.6) * b.r, b.y + 0.03 * Math.sin(t * 2 + i), Math.sin(b.a + t * 0.6) * b.r]}
              rotation={[t * 0.7 + i, t * 0.5 + i * 2, 0]}
            >
              <boxGeometry args={[b.s, b.s, b.s]} />
            </mesh>
          ))}
          {/* pixel-square eyes (game: 3x3 squares just above centre) */}
          <mesh material={eye} position={[-0.125, 0.11, 0.47]} rotation={[-0.15, -0.26, 0]}>
            <boxGeometry args={[0.115, 0.115, 0.05]} />
          </mesh>
          <mesh material={eye} position={[0.125, 0.11, 0.47]} rotation={[-0.15, 0.26, 0]}>
            <boxGeometry args={[0.115, 0.115, 0.05]} />
          </mesh>
          {/* drip */}
          {dead < 0.2 && (
            <group position={attach}>
              <mesh material={goo} position={[0, -neckLen / 2, 0]}>
                <cylinderGeometry args={[0.02, 0.045, neckLen, 16]} />
              </mesh>
              <mesh material={goo} position={[0, bulbY - attach[1], 0]} scale={[1, fall > 0 && fall < 1 ? 1.35 : 1.1, 1]}>
                <sphereGeometry args={[bulbR, 20, 16]} />
              </mesh>
            </group>
          )}
          {puddleR > 0.001 && dead < 0.2 && (
            <mesh material={goo} position={[attach[0] + 0.03, -0.355, attach[2] + 0.02]} scale={[puddleR, 0.012, puddleR]}>
              <sphereGeometry args={[1, 24, 12]} />
            </mesh>
          )}
        </group>
      )}
      <BBox frame={frame} seed={seed} opacity={1 - invLerp(0.05, 0.25, dead)} />
      {dead > 0 && <SlopSplat progress={invLerp(0.02, 1, dead)} origin={[0, 0.3, 0]} seed={seed + 11} puddleRadius={0.95} />}
    </group>
  );
};
