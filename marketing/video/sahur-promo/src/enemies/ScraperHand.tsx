// SCRAPER HAND (#b0a4ff): winds up, then grabs. A floating palm with four clawed fingers pointing at
// you, a wrist that frays into a trail of data cubes. `windup` 0..1: it shakes, spreads its claws and
// goes red (#ff4d5e). `grab` 0..1: it lunges forward and clenches.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { PAL } from '../lib/palette';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useToy } from './lib/toy';
import { FloorGlow, GlowSprite } from './lib/scene';
import { bump, clamp, easeOutExpo, hash, invLerp, jitter, lerp } from './lib/math';
import { Shards } from '../fx/Shards';
import type { EnemyBase } from './types';

export type ScraperHandProps = EnemyBase & {
  windup?: number;
  grab?: number;
  /** distance of the grab lunge along the finger direction */
  grabDist?: number;
  /** number of fingers (the game draws 4; one of the boss's hands has 5) */
  fingers?: number;
  /** hover height */
  hover?: number;
  /** extra grasp phase (the boss staggers its hands) */
  graspPhase?: number;
  /** show the wrist data trail */
  trail?: boolean;
  /** draw the thumb (default true) */
  thumb?: boolean;
  /** 0..1 fingers hang limp (after being hit) */
  limp?: number;
};

const tmpC = new THREE.Color();
const mixHex = (a: string, b: string, t: number) => '#' + tmpC.set(a).lerp(new THREE.Color(b), clamp(t)).getHexString();

type Seg = { len: number; r: number; curl: number };

/** A jointed digit along +z: knuckle spheres between capsule segments, a dark claw tip. */
const Digit: React.FC<{ segs: Seg[]; mat: THREE.Material; tip: THREE.Material; knuckle: THREE.Material; i?: number }> = ({ segs, mat, tip, knuckle, i = 0 }) => {
  const s = segs[i];
  if (!s) return null;
  const last = i === segs.length - 1;
  return (
    <group rotation={[s.curl, 0, 0]}>
      <mesh material={knuckle}>
        <sphereGeometry args={[s.r * 1.16, 16, 12]} />
      </mesh>
      <mesh material={mat} position={[0, 0, s.len / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[s.r, s.len, 6, 14]} />
      </mesh>
      {last ? (
        <mesh material={tip} position={[0, -s.r * 0.25, s.len + s.r * 0.9]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <coneGeometry args={[s.r * 0.78, s.r * 2.8, 12]} />
        </mesh>
      ) : (
        <group position={[0, 0, s.len]}>
          <Digit segs={segs} mat={mat} tip={tip} knuckle={knuckle} i={i + 1} />
        </group>
      )}
    </group>
  );
};

/** The hand itself (a right hand): fingers along +z, back of the hand +y, palm -y, thumb on -x.
 *  No floor, no hover: used by ScraperHand and by the Scraper boss. */
export const HandModel: React.FC<{
  t: number;
  frame: number;
  color: string;
  windup: number;
  grip: number; // 0 open .. 1 clenched
  fingers: number;
  thumb?: boolean;
  flash: number;
  dissolve: number;
  glow?: number;
  trail?: boolean;
  seed?: number;
  limp?: number; // 0..1 fingers hang loose
}> = ({ t, frame, color, windup, grip, fingers, thumb = true, flash, dissolve, glow = 0.1, trail = true, seed = 1, limp = 0 }) => {
  const skin = useToy({ color, deep: '#120c2a', fill: 0.92, rimStrength: 1.7, rimPower: 2.2, spec: 1.0, gloss: 55, glow: glow + windup * 0.35, flash, dissolve, edge: color });
  const knuckle = useToy({ color, deep: '#120c2a', fill: 0.85, rimStrength: 2.1, spec: 1.3, gloss: 70, glow: glow + 0.06 + windup * 0.4, flash, dissolve, edge: color });
  const tip = useToy({ color: '#1a1530', deep: '#05040a', fill: 1, rim: color, rimStrength: 2.2, spec: 1.8, gloss: 120, glow: 0, flash, dissolve, edge: color });
  const dark = useToy({ color: '#0b0a14', deep: '#000', fill: 1, rim: color, rimStrength: 1.2, spec: 1.0, gloss: 60, flash, dissolve });
  const bits = useToy({ color, fill: 1, glow: 0.9, rimStrength: 0.6, spec: 0.2, flash, dissolve }, { flat: true });
  const palmGeo = useMemo(() => new RoundedBoxGeometry(0.44, 0.13, 0.44, 4, 0.06), []);

  // idle grasping flex; windup hyper-extends and spreads; grip clenches; limp hangs
  const flex = 0.5 + 0.5 * Math.sin(t * 2.2);
  const spread = 1 + 0.9 * windup - 0.4 * grip;
  const base = lerp(lerp(0.12 + 0.12 * flex, -0.3, windup), 0.95, grip);
  const mid = lerp(lerp(0.32 + 0.22 * flex, -0.12, windup), 1.25, grip);
  const end = lerp(lerp(0.38 + 0.2 * flex, 0.05, windup), 1.0, grip);
  const n = Math.max(2, fingers);
  const trailN = 9;
  return (
    <group>
      {/* palm slab with a knuckle ridge */}
      <mesh geometry={palmGeo} material={skin} position={[0.02, 0, 0]} />
      <mesh material={knuckle} position={[0.02, 0.012, 0.205]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.75]}>
        <capsuleGeometry args={[0.06, 0.3, 6, 16]} />
      </mesh>
      {/* tendons on the back of the hand */}
      {Array.from({ length: n }, (_, i) => {
        const x = 0.02 + (i - (n - 1) / 2) * (0.36 / n);
        return (
          <mesh key={i} material={knuckle} position={[x, 0.065, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.5]}>
            <capsuleGeometry args={[0.016, 0.22, 4, 8]} />
          </mesh>
        );
      })}
      <mesh material={dark} position={[0.02, 0.07, -0.1]} scale={[0.1, 0.015, 0.045]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {/* fingers */}
      {Array.from({ length: n }, (_, i) => {
        const k = i - (n - 1) / 2;
        const x = 0.02 + k * (0.36 / n) * (1 + 0.25 * windup);
        const L = 1 - Math.abs(k) * 0.1 + (n > 4 && i === n - 1 ? -0.12 : 0);
        const wob = limp * 0.5 * Math.sin(t * 2 + i);
        const segs: Seg[] = [
          { len: 0.17 * L, r: 0.046, curl: lerp(base, 0.9 + wob, limp) + 0.07 * Math.sin(t * 3 + i) },
          { len: 0.125 * L, r: 0.042, curl: lerp(mid, 0.5, limp) + 0.05 * Math.sin(t * 3.4 + i * 1.7) },
          { len: 0.09 * L, r: 0.038, curl: lerp(end, 0.4, limp) },
        ];
        return (
          <group key={i} position={[x, 0.0, 0.215]} rotation={[0, k * 0.07 * spread, 0]}>
            <Digit segs={segs} mat={skin} tip={tip} knuckle={knuckle} />
          </group>
        );
      })}
      {/* thumb: from the -x side, angled forward and toward the palm */}
      {thumb && (
        <group position={[-0.2, -0.03, -0.02]} rotation={[0.55 + 0.3 * grip - 0.2 * windup, -0.75 - 0.35 * windup + 0.4 * grip, 0.5]}>
          <Digit
            segs={[
              { len: 0.12, r: 0.05, curl: 0.15 + 0.3 * grip },
              { len: 0.1, r: 0.045, curl: 0.25 + 0.5 * grip },
            ]}
            mat={skin}
            tip={tip}
            knuckle={knuckle}
          />
        </group>
      )}
      {/* wrist */}
      <mesh material={skin} position={[0.02, -0.01, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.15, 0.2, 24]} />
      </mesh>
      <mesh material={knuckle} position={[0.02, -0.01, -0.41]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.022, 8, 24]} />
      </mesh>
      {/* frayed data trail */}
      {trail &&
        Array.from({ length: trailN }, (_, i) => {
          const z = -0.48 - i * 0.075 - 0.03 * Math.sin(t * 3 + i);
          const s = 0.075 * (1 - i / trailN) + 0.012;
          const on = hash(Math.floor(frame / 4) + i * 13, seed) > 0.18;
          if (!on || dissolve > 0.3) return null;
          return (
            <mesh
              key={i}
              material={bits}
              position={[0.05 * Math.sin(t * 2 + i * 1.3) + (hash(i, seed) - 0.5) * 0.1, 0.03 * Math.cos(t * 2.4 + i), z]}
              rotation={[t + i, t * 0.7 + i * 2, 0]}
            >
              <boxGeometry args={[s, s, s]} />
            </mesh>
          );
        })}
    </group>
  );
};

export const ScraperHand: React.FC<ScraperHandProps> = ({
  frame,
  hit = 0,
  death = 0,
  scale = 1,
  seed = 1,
  floor = true,
  windup = 0,
  grab = 0,
  grabDist = 1.4,
  fingers = 4,
  hover = 0.72,
  graspPhase = 0,
  trail = true,
  thumb = true,
  limp = 0,
}) => {
  const t = frame / 60 + seed * 1.9 + graspPhase;
  const dead = clamp(death);
  const w = clamp(windup) * (1 - invLerp(0, 0.15, grab));
  const g = easeOutExpo(invLerp(0, 0.45, grab));
  const flash = Math.max(hit, bump(0, 0.12, dead));
  const dissolve = invLerp(0.04, 0.7, dead);
  // shake during windup (game: random +-1.5px each frame) -> deterministic per-frame jitter
  const sh = 0.045 * w;
  const jx = jitter(frame, seed * 3 + 1) * sh;
  const jy = jitter(frame, seed * 3 + 2) * sh;
  const color = mixHex(PAL.hand, PAL.danger, w * 1.15 + (grab > 0 && grab < 0.6 ? 0.6 : 0));
  const bob = 0.07 * Math.sin(t * 1.7);
  const pull = -0.28 * w;
  const z = pull + grabDist * g;
  const alive = dead < 0.999;
  const y = hover + bob;
  return (
    <group scale={scale}>
      {floor && <FloorGlow color={color} radius={0.8} intensity={0.3 + 0.35 * w} shadow={0.3} />}
      {alive && (
        <group position={[jx, y + jy, z]} rotation={[-1.0 + 0.08 * Math.sin(t * 1.3) - 0.25 * w + 0.65 * g, 0.25, -0.22 + 0.08 * Math.sin(t * 0.9)]} scale={1.35}>
          <HandModel t={t} frame={frame} color={color} windup={w} grip={g} fingers={fingers} thumb={thumb} limp={limp} flash={flash} dissolve={dissolve} trail={trail} seed={seed} />
          {w > 0.05 && <GlowSprite color={PAL.danger} size={1.3 * w} intensity={0.8 * w} position={[0, 0, 0.3]} />}
        </group>
      )}
      {dead > 0 && <Shards progress={invLerp(0.02, 1, dead)} color={PAL.hand} origin={[0, y, z]} seed={seed + 31} count={34} radius={0.35} />}
    </group>
  );
};

