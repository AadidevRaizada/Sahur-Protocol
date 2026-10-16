// THE SCRAPER (#c07bff): a violet data-core sphere with dark concentric rings on its face and a cyan
// centre, gyroscope rings, and six grasping hands orbiting it (one has a fifth finger). Each hand
// drags little glowing data cubes back into the core.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow, GlowSprite } from './lib/scene';
import { bump, clamp, fract, invLerp, lerp, TAU } from './lib/math';
import { HandModel } from './ScraperHand';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type ScraperProps = EnemyBase & {
  /** 0..1 all hands clench and pull in (attack tell) */
  clench?: number;
  /** frames per orbit of the hands (game speed ~226; the storyboard's mid-boss flash uses 48) */
  orbitPeriod?: number;
  /** 0..1 three hands (0, 2, 4) reach at the camera one after another, 1/3 apart */
  reach?: number;
  /** how far a reaching hand travels toward the camera */
  reachDist?: number;
  /** 0..1 the face rings shatter outward (60 shards) and the hands go limp */
  shatter?: number;
  /** height of the core centre */
  hover?: number;
};

const R = 0.85; // core radius
const ORBIT = 1.85;
const RINGS = [0.64, 0.47, 0.3];

const CORE_FRAG = /* glsl */ `
  // faint data seams: latitude / longitude lines that glow
  vec3 q = normalize(vO);
  float lat = asin(clamp(q.y, -1.0, 1.0));
  float lon = atan(q.z, q.x);
  float gl = smoothstep(0.035, 0.0, abs(fract(lat * 3.0 / 3.14159 * 2.0) - 0.5) - 0.465);
  float go = smoothstep(0.035, 0.0, abs(fract(lon * 8.0 / 6.28318) - 0.5) - 0.465);
  col += uRim * 0.35 * max(gl, go) * (0.6 + 0.4 * sin(uTime * 2.0 + lon * 4.0));
`;

// Hand basis: HandModel's fingers (+z) point radially out (+x), its palm (-y) faces the camera (+z).
const HAND_BASIS = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)),
);

export const Scraper: React.FC<ScraperProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, clench = 0, orbitPeriod = 226, reach = 0, reachDist = 2.6, shatter = 0, hover = 2.15 }) => {
  const t = frame / 60 + seed * 1.7;
  const dead = clamp(death);
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.04, 0.8, dead);
  const bob = 0.12 * Math.sin(t * 3.33);

  const core = useToy(
    { color: PAL.scraper, deep: '#0d0420', rim: '#d3a6ff', fill: 0.75, rimStrength: 1.9, rimPower: 2.2, spec: 1.1, gloss: 70, glow: 0.05, time: t, flash, dissolve, edge: PAL.scraper },
    { fragBody: CORE_FRAG },
  );
  const groove = useToy({ color: '#0a0714', deep: '#000', fill: 1, rim: PAL.scraper, rimStrength: 1.0, spec: 1.2, gloss: 90, flash: flash * 0.4, dissolve });
  const cyan = useToy({ color: PAL.cyan, fill: 1, glow: 1.4, rim: '#ffffff', rimStrength: 1.0, spec: 0.5, flash, dissolve }, { flat: true });
  const gyro = useGlowMat('#d9b8ff', 1.6 * (1 - dissolve), 0.9);
  const packet = useToy({ color: PAL.cyan, fill: 1, glow: 1.1, rimStrength: 0.6, spec: 0.2, dissolve }, { flat: true });
  const beam = useGlowMat(PAL.scraper, 0.9 * (1 - dissolve), 0.35);

  const hands = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ i, fingers: i === 4 ? 5 : 4 })), []);
  const alive = dead < 0.999;
  const y = hover + bob;
  const orbitA = (frame / orbitPeriod) * TAU + seed; // game: now/600 -> ~226 frames per turn
  const SH = clamp(shatter);
  const ringsGone = invLerp(0, 0.25, SH);
  const cl = clamp(clench);
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.scraper} radius={2.4} intensity={0.4 * (1 - dissolve)} shadow={0.35} />}
      {alive && (
        <group position={[0, y, 0]}>
          {/* core */}
          <mesh material={core} rotation={[0, t * 0.2, 0]}>
            <sphereGeometry args={[R, 64, 48]} />
          </mesh>
          {/* the face: concentric dark rings (game: three stroked circles) */}
          {ringsGone < 1 &&
            RINGS.map((r, i) => (
              <mesh key={i} material={groove} position={[0, 0, Math.sqrt(R * R - r * r) - 0.005 + ringsGone * 0.3 * (i + 1)]} scale={1 + ringsGone * 0.6}>
                <torusGeometry args={[r, 0.032, 12, 72]} />
              </mesh>
            ))}
          <mesh material={cyan} position={[0, 0, R - 0.03]} rotation={[t * 0.9, t * 1.3, 0.785]}>
            <boxGeometry args={[0.17, 0.17, 0.17]} />
          </mesh>
          <GlowSprite color={PAL.cyan} size={0.9} intensity={1.3 + 0.4 * Math.sin(t * 5)} position={[0, 0, R + 0.08]} />
          {/* gyroscope rings */}
          <group rotation={[1.2, 0.3, t * 0.5]} visible={ringsGone < 1}>
            <mesh material={gyro}>
              <torusGeometry args={[R * 1.32, 0.01, 6, 120]} />
            </mesh>
          </group>
          <group rotation={[-0.5, 1.1, -t * 0.4]} visible={ringsGone < 1}>
            <mesh material={gyro}>
              <torusGeometry args={[R * 1.46, 0.008, 6, 120]} />
            </mesh>
          </group>
          {/* six grasping hands on a ring facing the camera, tilted a little for depth */}
          <group rotation={[0.28, 0, 0]}>
            {hands.map(({ i, fingers }) => {
              const a = orbitA + (i * TAU) / 6;
              const ri = i % 2 === 0 ? clamp(reach * 1.6 - (i / 2) * 0.3) : 0; // hands 0,2,4 staggered
              const rEase = Math.sin(Math.min(1, ri) * Math.PI * 0.5);
              const grip = clamp(lerp(0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.3)) + cl * 0.6, ri > 0.7 ? 0.9 : 0, rEase));
              const rr = ORBIT - cl * 0.45 + SH * 0.5;
              return (
                <group key={i} rotation={[0, 0, a]}>
                  <group position={[rr - rEase * 0.6, -SH * 0.4, rEase * reachDist]} quaternion={HAND_BASIS} scale={1.12 * (1 + rEase * 0.25)}>
                    <group rotation={[-rEase * 1.0 + SH * 0.6, 0, 0]}>
                      <HandModel t={t + i} frame={frame + i * 7} color={PAL.scraper} windup={ri > 0 && ri < 0.7 ? 0.6 : 0} grip={grip} fingers={fingers} flash={flash} dissolve={dissolve} trail={false} seed={seed + i} glow={0.12} limp={SH} />
                    </group>
                  </group>
                  {/* data being scraped back to the core */}
                  <mesh material={beam} position={[(rr + R) / 2 - 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.006, 0.006, rr - R - 0.4, 6]} />
                  </mesh>
                  {[0, 1, 2].map((j) => {
                    const u = fract(t * 0.7 + i * 0.17 + j / 3);
                    const px = rr - 0.35 - u * (rr - R - 0.35);
                    return (
                      <mesh key={j} material={packet} position={[px, 0, 0]} rotation={[t * 3 + j, t * 2 + i, 0]} scale={0.055 * (1 - u * 0.5)}>
                        <boxGeometry args={[1, 1, 1]} />
                      </mesh>
                    );
                  })}
                </group>
              );
            })}
          </group>
        </group>
      )}
      {SH > 0 && <Shards progress={SH} color={PAL.scraper} origin={[0, y, R * 0.7]} seed={seed + 72} count={60} radius={0.6} size={1.3} power={2.2} gravity={2} ground={0} glow={0.7} />}
      {SH > 0 && <GlowSprite color={PAL.cyan} size={4 * bump(0, 0.35, SH)} intensity={2 * bump(0, 0.35, SH)} position={[0, y, R + 0.3]} />}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.scraper} origin={[0, y, 0]} seed={seed + 71} count={80} radius={1.0} size={1.6} power={1.4} />}
    </group>
  );
};
