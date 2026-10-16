// PROMPT WRAITH (#c07bff): drifts, then lunges. A translucent violet ghost: a dome top, a ragged
// animated hem (the game's zigzag), flickering opacity, a dark inner core and pixel eyes.
// `lunge` 0..1 = anticipation, a stretched dash with after-image trail, recovery.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy } from './lib/toy';
import { FloorGlow, GlowSprite } from './lib/scene';
import { bump, clamp, easeOutCubic, easeOutExpo, hash, invLerp, lerp } from './lib/math';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

/** Lathe profile of the ghost: dome on top, slightly flared skirt, open at the hem (y=0). */
export const useGhostGeometry = (domeR = 0.42, domeY = 0.72, hemR = 0.49) =>
  useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const side = [
      [hemR, 0.0],
      [hemR - 0.015, 0.1],
      [hemR - 0.035, 0.24],
      [domeR + 0.02, 0.42],
      [domeR + 0.005, 0.58],
    ];
    for (const [x, y] of side) pts.push(new THREE.Vector2(x, y));
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(0.0005, domeR * Math.cos(a)), domeY + domeR * Math.sin(a)));
    }
    const g = new THREE.LatheGeometry(pts, 96);
    g.computeVertexNormals();
    return g;
  }, [domeR, domeY, hemR]);

/** Vertex chunk: zigzag hem teeth that ripple + a cloth sway that grows toward the hem. */
export const GHOST_VERT_PARS = /* glsl */ `
uniform float uTeeth; uniform float uHemAmt; uniform float uSwayAmt; uniform float uHemTop;
`;
export const GHOST_VERT_BODY = /* glsl */ `
  float ang = atan(p.z, p.x);
  float hemW = 1.0 - smoothstep(0.0, uHemTop, p.y);
  float tri = abs(fract(ang / 6.2831853 * uTeeth + uTime * 0.18) - 0.5) * 2.0;
  float flutter = snoise(vec3(cos(ang) * 1.6, sin(ang) * 1.6, uTime * 0.9));
  p.y -= hemW * uHemAmt * (pow(tri, 1.4) * 0.34 + flutter * 0.08);
  p.xz *= 1.0 + hemW * (0.07 + 0.05 * flutter);
  float low = 1.0 - smoothstep(0.0, 0.8, p.y);
  p.x += uSwayAmt * sin(uTime * 1.9 + p.y * 3.2) * low;
  p.z += uSwayAmt * 0.6 * cos(uTime * 1.5 + p.y * 2.7) * low;
`;

export type WraithProps = EnemyBase & {
  /** 0..1 lunge cycle */
  lunge?: number;
  /** direction of the lunge as a yaw angle (0 = +x, screen right in a front view) */
  lungeYaw?: number;
  /** distance covered by the lunge */
  lungeDist?: number;
  /** hover height of the hem */
  hover?: number;
};

const LungeGhost: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.Material; pos: [number, number, number]; s: [number, number, number]; yaw: number }> = ({ geo, mat, pos, s, yaw }) => (
  <group position={pos} rotation={[0, yaw, 0]}>
    <group scale={s}>
      <group rotation={[0, -yaw, 0]}>
        <mesh geometry={geo} material={mat} />
      </group>
    </group>
  </group>
);

export const Wraith: React.FC<WraithProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, lunge = 0, lungeYaw = 0, lungeDist = 1.7, hover = 0.22 }) => {
  const t = frame / 60 + seed * 3.3;
  const dead = clamp(death);
  const geo = useGhostGeometry();
  // flicker (game: alpha = 0.55 + 0.3 sin(now/70)) + seeded glitch drop-outs
  const glitch = hash(Math.floor(frame / 5), seed + 9) > 0.86 ? 1 : 0;
  const flick = clamp(0.62 + 0.24 * Math.sin(t * 14.3) - glitch * 0.35, 0.15, 1);
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.03, 0.75, dead);

  // lunge choreography
  const L = clamp(lunge);
  const antic = easeOutCubic(invLerp(0, 0.3, L)) * (1 - invLerp(0.3, 0.38, L));
  const dashP = easeOutExpo(invLerp(0.3, 0.62, L));
  const along = -0.28 * antic + lungeDist * dashP;
  const speed = L > 0.3 && L < 0.66 ? 1 - invLerp(0.3, 0.66, L) : 0;
  const sDir = 1 - 0.12 * antic + 0.95 * speed;
  const sPerp = 1 + 0.1 * antic - 0.3 * speed;
  const dx = Math.cos(lungeYaw), dz = -Math.sin(lungeYaw);

  const bob = 0.06 * Math.sin(t * 1.8) + 0.02 * Math.sin(t * 4.3);
  const baseY = hover + bob;
  const lean = -0.35 * speed * Math.sign(dx || 1) + 0.12 * antic * Math.sign(dx || 1);

  const hemUniforms = useMemo(() => ({ uTeeth: { value: 9 }, uHemAmt: { value: 1 }, uSwayAmt: { value: 0.03 }, uHemTop: { value: 0.32 } }), []);
  const extra = { uTeeth: 9, uHemAmt: 1 + speed * 0.8, uSwayAmt: 0.035 + speed * 0.12, uHemTop: 0.34 };
  const shellParams = {
    color: '#a865ff',
    deep: '#1a0838',
    rim: '#c890ff',
    fill: 0.72,
    alphaCore: 0.2,
    rimStrength: 2.8,
    rimPower: 1.6,
    spec: 0.45,
    gloss: 40,
    glow: 0.1,
    opacity: flick,
    time: t,
    flash,
    dissolve,
    noiseScale: 3.2,
    extra,
  };
  const shellBack = useToy(shellParams, { transparent: true, side: THREE.BackSide, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemUniforms });
  const shellFront = useToy(shellParams, { transparent: true, side: THREE.FrontSide, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemUniforms });
  const trailMat = useToy(
    { ...shellParams, opacity: 0.55, glow: 0.0, alphaCore: 0.0, fill: 0.0, deep: '#000000', rimStrength: 2.2, spec: 0, flash: 0 },
    { additive: true, vertPars: GHOST_VERT_PARS, vertBody: GHOST_VERT_BODY, uniforms: hemUniforms },
  );
  const core = useToy({ color: '#3a1670', deep: '#0a0418', fill: 0.5, rim: PAL.wraith, rimStrength: 1.0, glow: 0.04, spec: 0, flash, dissolve, opacity: 0.7 * flick, alphaCore: 0.5 }, { transparent: true });
  const eye = useToy({ color: '#07090f', deep: '#000', fill: 1, rim: PAL.wraith, rimStrength: 0.4, spec: 1.6, gloss: 120, flash: flash * 0.3, dissolve });

  const alive = dead < 0.999;
  const pos: [number, number, number] = [dx * along, baseY, dz * along];
  const trailN = speed > 0.02 ? 4 : 0;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.wraith} radius={0.85} intensity={0.32 * flick * (1 - dissolve)} shadow={0.25 * (1 - dissolve)} />}
      {Array.from({ length: trailN }, (_, k) => {
        const lag = (k + 1) * 0.045;
        const pp = easeOutExpo(invLerp(0.3, 0.62, L - lag));
        const a = -0.28 * 0 + lungeDist * pp;
        trailMat.opacity = 1;
        return (
          <LungeGhost
            key={k}
            geo={geo}
            mat={trailMat}
            pos={[dx * a, baseY, dz * a - 0.02 * (k + 1)]}
            s={[sDir * (1 - k * 0.05), sPerp, 1]}
            yaw={lungeYaw}
          />
        );
      })}
      {alive && (
        <group position={pos} rotation={[0, 0, lean]}>
          <group rotation={[0, lungeYaw, 0]}>
            <group scale={[sDir, sPerp, 1]}>
              <group rotation={[0, -lungeYaw, 0]}>
                <mesh material={core} position={[0, 0.5, -0.05]} scale={[0.2, 0.28, 0.18]} renderOrder={1}>
                  <sphereGeometry args={[1, 32, 24]} />
                </mesh>
                <mesh geometry={geo} material={shellBack} renderOrder={2} />
                <mesh geometry={geo} material={shellFront} renderOrder={3} />
                {/* pixel eyes (game: two 4x5 dark rects) */}
                <mesh material={eye} position={[-0.125, 0.75, 0.395]} rotation={[0, -0.3, 0]}>
                  <boxGeometry args={[0.1, 0.13, 0.05]} />
                </mesh>
                <mesh material={eye} position={[0.125, 0.75, 0.395]} rotation={[0, 0.3, 0]}>
                  <boxGeometry args={[0.1, 0.13, 0.05]} />
                </mesh>
              </group>
            </group>
          </group>
          {speed > 0.05 && <GlowSprite color={PAL.wraith} size={1.6} intensity={0.6 * speed} position={[0, 0.55, 0]} />}
        </group>
      )}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.wraith} origin={[pos[0], baseY + 0.55, pos[2]]} seed={seed + 21} count={30} radius={0.4} gravity={-1.2} ground={null} />}
    </group>
  );
};

void lerp;
