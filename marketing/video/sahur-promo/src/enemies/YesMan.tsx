// YES-MAN (#3dff9d): circles you agreeing. A little green suit block with a white shirt V, a dark tie,
// two square eyes and a smile that NEVER moves while the whole block nods, mechanically, forever.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow } from './lib/scene';
import { bump, clamp, easeInCubic, easeOutCubic, invLerp } from './lib/math';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type YesManProps = EnemyBase & {
  /** nods per second (default 1.6) */
  nodRate?: number;
  /** nod depth in radians (default 0.2) */
  nodDepth?: number;
  /** 0..1 the fixed smile finally cracks: crack lines run across the face and the smile splits */
  smileCrack?: number;
  /** 0..1 tips over backwards and lies flat */
  tip?: number;
};

// two zigzag cracks from the smile's corners across the face (face-local x,y)
const CRACKS: [number, number][][] = [
  [[-0.11, 0.1], [-0.16, 0.16], [-0.13, 0.21], [-0.21, 0.29], [-0.24, 0.38]],
  [[0.11, 0.1], [0.15, 0.04], [0.12, -0.0], [0.2, -0.06], [0.26, -0.03], [0.34, -0.1]],
];

const CrackLine: React.FC<{ pts: [number, number][]; p: number; mat: THREE.Material; z: number }> = ({ pts, p, mat, z }) => {
  const segs = pts.length - 1;
  const shown = p * segs;
  return (
    <group>
      {pts.slice(0, -1).map(([x0, y0], i) => {
        const f = Math.min(1, Math.max(0, shown - i));
        if (f <= 0) return null;
        const [x1, y1] = pts[i + 1];
        const ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
        const len = Math.hypot(ex - x0, ey - y0);
        return (
          <mesh key={i} material={mat} position={[(x0 + ex) / 2, (y0 + ey) / 2, z]} rotation={[0, 0, Math.atan2(ey - y0, ex - x0)]}>
            <boxGeometry args={[len + 0.012, 0.014, 0.01]} />
          </mesh>
        );
      })}
    </group>
  );
};

const W = 0.72, H = 0.8, D = 0.5;
const LEG = 0.13;

const shapeGeo = (pts: [number, number][], depth: number, bevel = 0.006) => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
  g.computeVertexNormals();
  return g;
};

export const YesMan: React.FC<YesManProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, nodRate = 1.6, nodDepth = 0.2, smileCrack = 0, tip = 0 }) => {
  const t = frame / 60 + seed * 0.77;
  const dead = clamp(death);
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.04, 0.7, dead);
  // mechanical nod: always forward, eased, with a tiny hold at the bottom
  const ph = (t * nodRate) % 1;
  const nod = Math.pow(Math.sin(ph * Math.PI), 1.6);
  const bounce = 0.018 * Math.abs(Math.sin(ph * Math.PI * 2));

  const geos = useMemo(
    () => ({
      body: new RoundedBoxGeometry(W, H, D, 5, 0.085),
      shirt: shapeGeo([[-0.15, 0.0], [0.15, 0.0], [0.0, -0.36]], 0.012, 0.004),
      lapelL: shapeGeo([[-0.23, 0.01], [-0.15, 0.01], [-0.015, -0.34], [-0.09, -0.36]], 0.016, 0.004),
      lapelR: shapeGeo([[0.15, 0.01], [0.23, 0.01], [0.09, -0.36], [0.015, -0.34]], 0.016, 0.004),
      knot: shapeGeo([[-0.04, -0.015], [0.04, -0.015], [0.026, -0.07], [-0.026, -0.07]], 0.02, 0.006),
      blade: shapeGeo([[0, -0.07], [0.052, -0.2], [0, -0.37], [-0.052, -0.2]], 0.02, 0.006),
      leg: new RoundedBoxGeometry(0.12, LEG, 0.13, 2, 0.03),
      shoe: new RoundedBoxGeometry(0.15, 0.06, 0.2, 2, 0.025),
      arm: new RoundedBoxGeometry(0.1, 0.2, 0.12, 2, 0.045),
    }),
    [],
  );

  const suit = useToy({ color: PAL.yesman, deep: '#03261a', fill: 0.92, rimStrength: 1.4, rimPower: 2.4, spec: 0.9, gloss: 45, glow: 0.1, flash, dissolve, edge: PAL.yesman });
  const lapel = useToy({ color: '#1fae6a', deep: '#021a10', fill: 0.9, rimStrength: 0.9, spec: 0.8, gloss: 40, glow: 0.04, flash, dissolve, edge: PAL.yesman });
  const shirt = useToy({ color: '#eefcf4', deep: '#5d8f78', fill: 1, rimStrength: 0.3, spec: 0.6, gloss: 40, glow: 0.05, flash, dissolve, edge: PAL.yesman });
  const tie = useToy({ color: PAL.boardBg, deep: '#000', fill: 1, rim: PAL.yesman, rimStrength: 0.7, spec: 1.6, gloss: 110, flash, dissolve, edge: PAL.yesman });
  const ink = useToy({ color: '#07090f', deep: '#000', fill: 1, rim: PAL.yesman, rimStrength: 0.3, spec: 1.4, gloss: 120, flash: flash * 0.3, dissolve });
  const crackGlow = useGlowMat('#d9ffe9', 2.4, 1, false);
  const C = clamp(smileCrack);
  const split = easeOutCubic(invLerp(0.55, 1, C));
  const T = easeInCubic(clamp(tip));
  const shoe = useToy({ color: '#0e1512', deep: '#000', fill: 1, rim: PAL.yesman, rimStrength: 0.6, spec: 1.2, gloss: 90, flash, dissolve });

  const alive = dead < 0.999;
  const fz = D / 2;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.yesman} radius={0.85} intensity={0.4 * (1 - dissolve)} shadow={0.5} />}
      {alive && (
        <group>
          {/* legs + shoes stay planted */}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh geometry={geos.leg} material={shoe} position={[0, LEG / 2 + 0.03, -0.01]} />
              <mesh geometry={geos.shoe} material={shoe} position={[0, 0.03, 0.03]} />
            </group>
          ))}
          {/* the block nods around the hips (and stops nodding once its smile breaks) */}
          <group position={[0, LEG + 0.02 + bounce * (1 - C), -0.25 * T]} rotation={[nod * nodDepth * (1 - C) - T * (Math.PI / 2 - 0.12), 0, 0.05 * T]}>
            <group position={[0, H / 2, 0]}>
              <mesh geometry={geos.body} material={suit} />
              {/* arms with stiff thumbs-up nubs */}
              {[-1, 1].map((sx) => (
                <group key={sx} position={[sx * (W / 2 + 0.03), -0.06, 0.04]} rotation={[0.25 + 0.15 * nod, 0, sx * 0.12]}>
                  <mesh geometry={geos.arm} material={suit} />
                  <mesh material={suit} position={[sx * 0.0, 0.14, 0.02]} rotation={[0, 0, 0]}>
                    <capsuleGeometry args={[0.028, 0.06, 4, 10]} />
                  </mesh>
                </group>
              ))}
              {/* the face: two square eyes and a fixed, too-pleased smile */}
              <mesh material={ink} position={[-0.15, 0.24, fz + 0.012]}>
                <boxGeometry args={[0.075, 0.075, 0.03]} />
              </mesh>
              <mesh material={ink} position={[0.15, 0.24, fz + 0.012]}>
                <boxGeometry args={[0.075, 0.075, 0.03]} />
              </mesh>
              {/* the smile: two halves of one arc, so it can split */}
              <group position={[-0.012 * split, 0.135 - 0.01 * split, fz + 0.006]} rotation={[0, 0, Math.PI + 0.32 + 0.22 * split]}>
                <mesh material={ink}>
                  <torusGeometry args={[0.125, 0.017, 8, 20, (Math.PI - 0.64) / 2]} />
                </mesh>
              </group>
              <group position={[0.012 * split, 0.135 - 0.02 * split, fz + 0.006]} rotation={[0, 0, Math.PI + 0.32 + (Math.PI - 0.64) / 2 - 0.18 * split]}>
                <mesh material={ink}>
                  <torusGeometry args={[0.125, 0.017, 8, 20, (Math.PI - 0.64) / 2]} />
                </mesh>
              </group>
              {C > 0 && CRACKS.map((pts, i) => <CrackLine key={i} pts={pts} p={invLerp(i * 0.15, 0.6 + i * 0.15, C)} mat={crackGlow} z={fz + 0.004} />)}
              {/* suit front: lapels, shirt V, tie */}
              <group position={[0, -0.02, fz - 0.004]}>
                <mesh geometry={geos.shirt} material={shirt} />
                <mesh geometry={geos.lapelL} material={lapel} position={[0, 0, 0.004]} />
                <mesh geometry={geos.lapelR} material={lapel} position={[0, 0, 0.004]} />
                <mesh geometry={geos.knot} material={tie} position={[0, 0, 0.012]} />
                <mesh geometry={geos.blade} material={tie} position={[0, 0, 0.01]} />
              </group>
            </group>
          </group>
        </group>
      )}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.yesman} origin={[0, 0.55, 0]} seed={seed + 41} count={36} radius={0.38} />}
    </group>
  );
};
