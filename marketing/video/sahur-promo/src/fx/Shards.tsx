// Shards: a generic pixel-cube shatter for deaths. Cubes burst out of a volume, tumble, fall,
// skid on the floor and shrink away. Pure function of `progress`.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useToy } from '../enemies/lib/toy';
import { useInstanced, setInst, setInstColor, commit } from '../enemies/lib/instanced';
import { clamp, dragDist, invLerp, mulberry32, randDir } from '../enemies/lib/math';

export type ShardsProps = {
  progress: number; // 0..1
  color: string;
  count?: number;
  seed?: number;
  origin?: [number, number, number];
  radius?: number; // spawn volume radius
  power?: number; // outward speed multiplier
  size?: number; // cube size multiplier
  gravity?: number; // 0 for weightless
  ground?: number | null; // floor height (null = no floor)
  duration?: number; // seconds represented by progress 0..1
  glow?: number;
};

const tmpQ = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();

export const Shards: React.FC<ShardsProps> = ({
  progress,
  color,
  count = 36,
  seed = 1,
  origin = [0, 0.5, 0],
  radius = 0.35,
  power = 1,
  size = 1,
  gravity = 7,
  ground = 0,
  duration = 1.2,
  glow = 0.5,
}) => {
  const p = clamp(progress);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useToy({ color, fill: 1, glow, rimStrength: 1.2, spec: 0.8, gloss: 30 }, { flat: true });
  const mesh = useInstanced(geo, mat, count, true);
  const parts = useMemo(() => {
    const r = mulberry32(seed * 7919 + 1);
    return Array.from({ length: count }, () => {
      const d = randDir(r);
      const rr = radius * Math.cbrt(r());
      const ax = randDir(r);
      return {
        start: [d[0] * rr, d[1] * rr, d[2] * rr] as [number, number, number],
        dir: [d[0], d[1] * 0.8 + 0.45, d[2]] as [number, number, number],
        speed: (1.2 + r() * 2.4) * power,
        axis: ax,
        spin: (r() - 0.5) * 18,
        s: (0.035 + r() * 0.06) * size,
        tint: 0.55 + r() * 0.9,
        life: 0.65 + r() * 0.35,
      };
    });
  }, [count, seed, radius, power, size]);

  if (p <= 0) {
    commit(mesh, 0);
    return <primitive object={mesh} />;
  }
  const t = p * duration;
  const k = 2.2; // drag
  let n = 0;
  for (const s of parts) {
    const dist = dragDist(s.speed, k, t);
    let x = origin[0] + s.start[0] + s.dir[0] * dist;
    let z = origin[2] + s.start[2] + s.dir[2] * dist;
    let y = origin[1] + s.start[1] + s.dir[1] * dist - 0.5 * gravity * t * t * 0.6;
    const shrink = 1 - invLerp(s.life * 0.7, s.life, p);
    const sc = s.s * shrink;
    let spin = s.spin * (1 - Math.exp(-1.5 * t));
    if (ground !== null && y < ground + sc * 0.5) {
      y = ground + sc * 0.5;
      spin *= 0.3;
    }
    if (sc <= 0.0005) continue;
    tmpAxis.set(s.axis[0], s.axis[1], s.axis[2]);
    tmpQ.setFromAxisAngle(tmpAxis, spin);
    setInst(mesh, n, [x, y, z], sc, tmpQ);
    const flashT = 1 + 2.5 * (1 - invLerp(0, 0.25, p));
    setInstColor(mesh, n, [s.tint * flashT, s.tint * flashT, s.tint * flashT]);
    n++;
  }
  commit(mesh, n);
  return <primitive object={mesh} />;
};
