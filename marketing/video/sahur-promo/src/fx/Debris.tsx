// Debris: small weightless chunks (cubes and flat shards) hanging and slowly tumbling in the air,
// drifting upward. For the Core. Pure function of `frame`.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useToy } from '../enemies/lib/toy';
import { useInstanced, setInst, setInstColor, commit } from '../enemies/lib/instanced';
import { mulberry32 } from '../enemies/lib/math';

export const Debris: React.FC<{
  frame: number;
  count?: number;
  box?: [number, number, number];
  center?: [number, number, number];
  size?: number;
  rise?: number; // m/s upward drift
  colors?: string[];
  seed?: number;
}> = ({ frame, count = 60, box = [20, 10, 20], center = [0, 5, 0], size = 0.12, rise = 0.08, colors = ['#ffffff', '#c8f4ff', '#ffb3f2', '#b9a8ff'], seed = 1 }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useToy({ color: '#ffffff', deep: '#8f86c4', rim: '#8f7bff', rimStrength: 1.0, fill: 1, spec: 1.2, gloss: 70, glow: 0.05 }, { flat: true });
  const mesh = useInstanced(geo, mat, count, true);
  const items = useMemo(() => {
    const r = mulberry32(seed * 97 + 1);
    return Array.from({ length: count }, () => ({
      p: [r(), r(), r()] as [number, number, number],
      flat: r() < 0.45,
      s: 0.4 + r() * 1.0,
      ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      spin: 0.2 + r() * 0.6,
      c: Math.floor(r() * 4),
      bob: r() * 10,
    }));
  }, [count, seed]);
  const t = frame / 60;
  const q = new THREE.Quaternion();
  let n = 0;
  for (const it of items) {
    let y = it.p[1] * box[1] + rise * t * (0.6 + it.s * 0.4);
    y = (((y % box[1]) + box[1]) % box[1]) - box[1] / 2;
    const x = (it.p[0] - 0.5) * box[0] + 0.15 * Math.sin(t * 0.5 + it.bob);
    const z = (it.p[2] - 0.5) * box[2] + 0.15 * Math.cos(t * 0.4 + it.bob);
    q.setFromAxisAngle(it.ax, it.spin * t + it.bob);
    const s = size * it.s;
    setInst(mesh, n, [center[0] + x, center[1] + y, center[2] + z], it.flat ? [s * 1.6, s * 0.12, s] : [s, s, s], q);
    setInstColor(mesh, n, colors[it.c % colors.length]);
    n++;
  }
  commit(mesh, n);
  return <primitive object={mesh} />;
};
