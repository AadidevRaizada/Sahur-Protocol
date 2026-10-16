// PIVOT GOLEM (#ffb547): slow, heavy, splits when it dies. Two stacked amber stone slabs (the game's
// wide base + narrower top) built as left/right halves along a jagged crack that glows hot from inside.
// The top slab keeps swivelling ("pivoting"). `split` 0..1 breaks it in two; each half keeps one eye.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { useToy, useGlowMat } from './lib/toy';
import { FloorGlow, GlowSprite } from './lib/scene';
import { bump, clamp, easeInCubic, easeOutBack, easeOutCubic, invLerp, jitter, lerp } from './lib/math';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type PivotGolemProps = EnemyBase & {
  /** 0..1 break in two along the crack */
  split?: number;
  /** how far the halves end up apart */
  splitDist?: number;
  /** draw the two floating stone fists (default true) */
  fists?: boolean;
  /** 0..1 both fists rise (0-0.45), slam down (0.45-0.55), rest, return (0.8-1) */
  slam?: number;
};

const CRACK: [number, number][] = [
  [0.0, -0.02],
  [0.05, 0.12],
  [-0.045, 0.25],
  [0.04, 0.37],
  [-0.05, 0.5],
  [0.03, 0.62],
  [-0.03, 0.74],
  [0.035, 0.87],
  [-0.025, 1.0],
  [0.012, 1.13],
  [0.0, 1.24],
];
const crackX = (y: number) => {
  for (let i = 0; i < CRACK.length - 1; i++) {
    const [x0, y0] = CRACK[i];
    const [x1, y1] = CRACK[i + 1];
    if (y >= y0 && y <= y1) return lerp(x0, x1, (y - y0) / (y1 - y0));
  }
  return 0;
};

const GAP = 0.07;
const BEVEL = 0.026;

/** One half of one slab as an extruded shape whose inner edge follows the crack. */
const halfGeo = (side: -1 | 1, w: number, y0: number, y1: number, depth: number) => {
  const inner = CRACK.filter(([, y]) => y > y0 && y < y1);
  const pts: [number, number][] = [];
  const cx = (y: number) => crackX(y) + side * GAP * 0.5;
  if (side < 0) {
    pts.push([-w / 2, y0], [cx(y0), y0]);
    for (const [x, y] of inner) pts.push([x - GAP * 0.5, y]);
    pts.push([cx(y1), y1], [-w / 2, y1]);
  } else {
    pts.push([cx(y0), y0], [w / 2, y0], [w / 2, y1], [cx(y1), y1]);
    for (const [x, y] of [...inner].reverse()) pts.push([x + GAP * 0.5, y]);
  }
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: BEVEL, bevelThickness: BEVEL, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
};

/** A thin glowing strip along the crack between y0..y1, offset to one side. */
const crackGeo = (y0: number, y1: number, depth: number, off: number) => {
  const pts = [[crackX(y0), y0] as [number, number], ...CRACK.filter(([, y]) => y > y0 && y < y1), [crackX(y1), y1] as [number, number]];
  const th = 0.018;
  const s = new THREE.Shape();
  s.moveTo(pts[0][0] - th + off, pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x - th + off, y);
  for (const [x, y] of [...pts].reverse()) s.lineTo(x + th + off, y);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
};

const STONE_FRAG = /* glsl */ `
  float st = snoise(vO * 3.2) * 0.5 + 0.5;
  float st2 = snoise(vO * 11.0 + 3.0) * 0.5 + 0.5;
  col *= 0.62 + 0.45 * st * (0.85 + 0.3 * st2);
  // hot amber veins: thin bright lines where a noise field crosses zero
  float vn = snoise(vO * vec3(2.2, 3.4, 2.2) + 11.0);
  float vein = smoothstep(0.045, 0.0, abs(vn)) * smoothstep(0.2, 0.8, st2);
  col += vec3(1.0, 0.55, 0.12) * vein * 1.6;
`;

const LOW = { w: 1.25, y0: 0.0, y1: 0.7, d: 0.74 };
const TOP = { w: 0.94, y0: 0.66, y1: 1.22, d: 0.62 };

export const PivotGolem: React.FC<PivotGolemProps> = ({ frame, hit = 0, death = 0, scale = 1, seed = 1, floor = true, split = 0, splitDist = 0.5, fists = true, slam = 0 }) => {
  const t = frame / 60 + seed * 1.13;
  const dead = clamp(death);
  const S = clamp(split);
  const flash = Math.max(hit, bump(0, 0.12, dead), 0.6 * bump(0.26, 0.36, S));
  const dissolve = invLerp(0.04, 0.75, dead);

  const geos = useMemo(
    () => ({
      lowL: halfGeo(-1, LOW.w, LOW.y0, LOW.y1, LOW.d),
      lowR: halfGeo(1, LOW.w, LOW.y0, LOW.y1, LOW.d),
      topL: halfGeo(-1, TOP.w, TOP.y0, TOP.y1, TOP.d),
      topR: halfGeo(1, TOP.w, TOP.y0, TOP.y1, TOP.d),
      crackLowL: crackGeo(LOW.y0, LOW.y1, LOW.d + BEVEL * 1.4, -GAP * 0.26),
      crackLowR: crackGeo(LOW.y0, LOW.y1, LOW.d + BEVEL * 1.4, GAP * 0.26),
      crackTopL: crackGeo(TOP.y0, TOP.y1, TOP.d + BEVEL * 1.4, -GAP * 0.26),
      crackTopR: crackGeo(TOP.y0, TOP.y1, TOP.d + BEVEL * 1.4, GAP * 0.26),
    }),
    [],
  );

  const stone = useToy(
    { color: '#ff9f2e', deep: '#1c0a00', fill: 0.8, rim: PAL.golem, rimStrength: 1.9, rimPower: 2.2, spec: 0.35, gloss: 14, glow: 0.04, flash, dissolve, edge: PAL.golem, noiseScale: 2.5 },
    { fragBody: STONE_FRAG },
  );
  const fistGeo = useMemo(() => new RoundedBoxGeometry(0.34, 0.3, 0.36, 3, 0.07), []);
  const SL = clamp(slam);
  const rise = easeOutCubic(invLerp(0, 0.45, SL));
  const down = easeInCubic(invLerp(0.45, 0.55, SL));
  const back = easeOutCubic(invLerp(0.8, 1, SL));
  const fistY = lerp(lerp(0.5 + 0.05 * Math.sin(t * 1.4), 1.75, rise), 0.17, down) * (1 - back) + (0.5 + 0.05 * Math.sin(t * 1.4)) * back;
  const fistZ = lerp(0.15 * rise, 0.55, down) * (1 - back);
  const impact = bump(0.5, 0.7, SL);
  const ink = useToy({ color: '#07090f', deep: '#000', fill: 1, rim: PAL.golem, rimStrength: 0.5, spec: 1.2, gloss: 90, flash: flash * 0.3, dissolve });

  // crack heat: breathing pulse, then blazing during the split
  const heat = (0.9 + 0.25 * Math.sin(t * 2.4)) * (1 + 2.6 * bump(0.0, 0.7, S) + 1.2 * invLerp(0, 0.3, S)) * (1 - dissolve);
  const crackMat = useGlowMat('#ffd59a', 3.0 * heat, 1, false);

  // split choreography
  const shake = 0.03 * invLerp(0, 0.3, S) * (1 - invLerp(0.3, 0.4, S));
  const jx = jitter(frame, seed + 7) * shake;
  const sep = easeOutBack(invLerp(0.3, 0.75, S), 1.4);
  const ox = splitDist * sep;
  const tilt = 0.24 * easeOutCubic(invLerp(0.3, 0.55, S)) * (1 - 0.55 * invLerp(0.55, 0.9, S));
  const pivot = 0.13 * Math.sin(t * 0.8) * (1 - invLerp(0.2, 0.5, S));
  const breathe = 1 + 0.008 * Math.sin(t * 1.6);
  const alive = dead < 0.999;

  const half = (side: -1 | 1) => (
    <group key={side} position={[side * ox + jx, 0, 0]}>
      {/* tilt each half outward around its outer bottom corner */}
      <group position={[side * LOW.w * 0.5, 0, 0]} rotation={[0, 0, -side * tilt]}>
        <group position={[-side * LOW.w * 0.5, 0, 0]}>
          <mesh geometry={side < 0 ? geos.lowL : geos.lowR} material={stone} scale={[1, breathe, 1]} />
          <mesh geometry={side < 0 ? geos.crackLowL : geos.crackLowR} material={crackMat} />
          <group rotation={[0, pivot, 0]} position={[0, 0.0, 0]}>
            <mesh geometry={side < 0 ? geos.topL : geos.topR} material={stone} />
            <mesh geometry={side < 0 ? geos.crackTopL : geos.crackTopR} material={crackMat} />
            {/* one eye per half: the game's two dark slits */}
            {fists && (
              <group position={[side * 0.86, fistY - 0.66 * 0, fistZ]} rotation={[0.25 * rise - 0.25 * down, 0, side * (0.15 - 0.1 * rise)]}>
                <mesh geometry={fistGeo} material={stone} />
                {[0, 1, 2].map((k) => (
                  <mesh key={k} material={stone} position={[side * -0.0 + (k - 1) * 0.1, -0.04, 0.19]} scale={[0.045, 0.045, 0.03]}>
                    <sphereGeometry args={[1, 10, 8]} />
                  </mesh>
                ))}
              </group>
            )}
            <mesh material={ink} position={[side * 0.11, 1.0, TOP.d / 2 + BEVEL + 0.004]}>
              <boxGeometry args={[0.07, 0.095, 0.02]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );

  const burst = bump(0.28, 0.6, S);
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={PAL.golem} radius={1.15 + 0.5 * sep} intensity={0.32 + 0.6 * burst} shadow={0.7} />}
      {alive && (
        <group>
          {half(-1)}
          {half(1)}
          {S > 0.02 && <GlowSprite color={PAL.golem} size={0.8 + 1.8 * burst} intensity={0.5 + 1.4 * burst} position={[jx, 0.6, 0.2]} />}
          {S > 0.02 && <GlowSprite color="#fff1d6" size={0.2 + 0.6 * burst} intensity={2.0 * burst} position={[jx, 0.55, 0.35]} />}
          {heat > 0 && S <= 0.02 && <GlowSprite color={PAL.golem} size={0.9} intensity={0.35 * heat} position={[crackX(0.45), 0.45, LOW.d / 2 + 0.06]} />}
        </group>
      )}
      {impact > 0 && <GlowSprite color={PAL.golem} size={1.8 * impact} intensity={1.2 * impact} position={[0, 0.15, 0.6]} />}
      {SL > 0.5 && SL < 0.95 && <Shards progress={invLerp(0.5, 0.95, SL)} color="#c98a3a" origin={[0, 0.1, 0.6]} seed={seed + 53} count={20} radius={0.5} power={0.7} size={0.7} />}
      {S > 0.28 && <Shards progress={invLerp(0.28, 1, S)} color={PAL.golem} origin={[0, 0.6, 0.15]} seed={seed + 51} count={26} radius={0.15} power={0.9} size={0.9} />}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.golem} origin={[0, 0.6, 0]} seed={seed + 52} count={48} radius={0.5} size={1.4} />}
    </group>
  );
};
