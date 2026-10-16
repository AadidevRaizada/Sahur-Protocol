// SlopSplat: magenta goo droplets thrown out of an impact, stretched along their velocity,
// landing as flat splats, plus a wobbly spreading puddle. Pure function of `progress`.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useToy } from '../enemies/lib/toy';
import { useInstanced, setInst, alignY, commit } from '../enemies/lib/instanced';
import { clamp, easeOutCubic, invLerp, mulberry32, randDir, TAU } from '../enemies/lib/math';
import { PAL } from '../lib/palette';

export type SlopSplatProps = {
  progress: number; // 0..1
  color?: string;
  count?: number;
  seed?: number;
  power?: number; // throw strength multiplier
  size?: number; // droplet size multiplier
  origin?: [number, number, number]; // splat centre (ground point is origin.y = ground)
  ground?: number; // floor height
  puddle?: boolean;
  puddleRadius?: number;
};

const PUDDLE_VERT = /* glsl */ `
  float ang = atan(p.y, p.x);
  float rr = length(p.xy);
  float wob = 1.0 + 0.16 * snoise(vec3(cos(ang) * 1.7, sin(ang) * 1.7, uTime * 0.3)) + 0.08 * sin(ang * 7.0 + uTime);
  p.xy *= mix(1.0, wob, smoothstep(0.3, 1.0, rr));
`;

export const SlopSplat: React.FC<SlopSplatProps> = ({
  progress,
  color = PAL.slopling,
  count = 28,
  seed = 3,
  power = 1,
  size = 1,
  origin = [0, 0.3, 0],
  ground = 0,
  puddle = true,
  puddleRadius = 0.8,
}) => {
  const p = clamp(progress);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const mat = useToy({ color, fill: 0.95, spec: 1.6, gloss: 110, rimStrength: 1.6, glow: 0.18, time: p * 3 });
  const mesh = useInstanced(geo, mat, count);
  const drops = useMemo(() => {
    const r = mulberry32(seed * 977 + 13);
    return Array.from({ length: count }, () => {
      const d = randDir(r);
      d[1] = Math.abs(d[1]) * 0.9 + 0.25; // mostly upward & outward
      const speed = (1.6 + r() * 2.6) * power;
      return { d, speed, rad: (0.025 + r() * 0.055) * size, delay: r() * 0.06 };
    });
  }, [count, seed, power, size]);

  const T = 1.1; // seconds of flight represented by progress 0..1
  const g = 9.0;
  let n = 0;
  for (const dr of drops) {
    const tt = Math.max(0, p * T - dr.delay);
    if (p <= 0) break;
    const len = Math.hypot(dr.d[0], dr.d[1], dr.d[2]);
    const vx = (dr.d[0] / len) * dr.speed, vy = (dr.d[1] / len) * dr.speed, vz = (dr.d[2] / len) * dr.speed;
    let x = origin[0] + vx * tt, z = origin[2] + vz * tt;
    let y = origin[1] + vy * tt - 0.5 * g * tt * tt;
    const vyt = vy - g * tt;
    const fade = 1 - invLerp(0.7, 1, p);
    if (y <= ground + dr.rad * 0.3) {
      // landed: flatten into a splat that stays where it hit
      const tl = (vy + Math.sqrt(vy * vy + 2 * g * (origin[1] - ground))) / g; // landing time
      x = origin[0] + vx * tl;
      z = origin[2] + vz * tl;
      y = ground + 0.004;
      const spread = easeOutCubic(clamp((tt - tl) * 8));
      const rr = dr.rad * (1.2 + 1.3 * spread) * fade;
      setInst(mesh, n++, [x, y, z], [rr, dr.rad * 0.18, rr]);
    } else {
      const sp = Math.hypot(vx, vyt, vz);
      const stretch = 1 + Math.min(2.2, sp * 0.22);
      const q = alignY([vx, vyt, vz]);
      const rr = dr.rad * fade;
      setInst(mesh, n++, [x, y, z], [rr / Math.sqrt(stretch), rr * stretch, rr / Math.sqrt(stretch)], q);
    }
  }
  commit(mesh, p > 0 ? n : 0);

  const pud = useToy(
    { color, fill: 0.9, spec: 1.4, gloss: 90, rimStrength: 0.6, glow: 0.12, time: p * 4, dissolve: invLerp(0.72, 1, p), noiseScale: 4 },
    { vertBody: PUDDLE_VERT },
  );
  const pr = puddleRadius * easeOutCubic(invLerp(0.0, 0.35, p));
  return (
    <group>
      <primitive object={mesh} />
      {puddle && p > 0 && pr > 0.001 && (
        <mesh position={[origin[0], ground + 0.006, origin[2]]} rotation={[-Math.PI / 2, 0, (seed * TAU) / 7]} scale={[pr, pr, 1]} material={pud}>
          <circleGeometry args={[1, 64]} />
        </mesh>
      )}
    </group>
  );
};
