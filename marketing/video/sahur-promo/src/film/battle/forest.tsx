// BEAT 7, biome 1: HYPE CYCLE FOREST (S27-S32, frames 2400-2592), light L5a. The set is the journey
// builder's <Forest mood="fight"> laid out for the fight: a running path down -z, the TUNG #1 arena around
// SP1, a clearing for the drone and one for Echo.
import React from 'react';
import * as THREE from 'three';
import { ForestProps, ForestAtmos } from '../../sets/Forest';
import { Hero, HeroKey } from './hero';
import { PovHands, runHands, swatHand, SwatTrail } from './hands';
import { swatPose, blend } from './poses';
import { Shot } from './types';
import { seg, win, spike, clamp, lerp, invLerp, D, outCubic, inOutCubic, outExpo, inOutExpo, outQuad, inQuad, V3 } from './kit';
import { POSES, swingPose } from '../../rig/pose';
import { Slopling } from '../../enemies/Slopling';
import { Drone, JargonBolt } from '../../enemies/Drone';
import { Echo } from '../../enemies/Echo';
import { SlopSplat } from '../../fx/SlopSplat';
import { HitSpark } from '../../fx/HitSpark';
import { Knockback } from '../../fx/Knockback';
import { TungWave, tungRadius } from '../../fx/TungWave';
import { PAL } from '../../lib/palette';
import { GlowSprite } from '../../enemies/lib/scene';

const face = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);

// ---------- the fight forest ----------
const SAHUR1: [number, number] = [-0.35, -5.5]; // where he strikes TUNG #1 (facing -z)
const SP1: [number, number] = [SAHUR1[0], SAHUR1[1] - 0.85];
const DRONE_A: [number, number] = [2.85, 4.25];
const ECHO_P: [number, number] = [-2.75, -3.05];
export const FOREST_FIGHT: ForestProps = {
  mood: 'fight', seed: 7, center: [0, -6], clearing: 2.2, extent: 34, trees: 130,
  paths: [{ from: [0, 12], to: [0, -26], width: 3.6 }, { from: [SP1[0], SP1[1]], to: [-7.2, -20.6], width: 3.4 }],
  clearings: [{ x: SP1[0], z: SP1[1] - 4, r: 7 }, { x: DRONE_A[0], z: DRONE_A[1], r: 1.8 }, { x: ECHO_P[0] - 0.5, z: ECHO_P[1], r: 2.6 }],
  extraTrees: [
    { x: 2.35, z: 8.2, r: 0.32, h: 13 }, { x: -2.45, z: 6.0, r: 0.38, h: 14 }, { x: 2.5, z: 1.4, r: 0.3, h: 12 },
    { x: -2.6, z: -0.9, r: 0.42, h: 15 }, { x: 4.2, z: -4.0, r: 0.36, h: 13 },
  ],
  fireflies: 120, keyShadow: true,
};
export const TUNG1 = 2496, TUNG1_DUR = 72, TUNG1_R = 16;

// ======================= S27 Slop (2400-2424) =======================
const camZ27 = (f: number) => 7.0 - (4 * (f - 2400)) / 60;
const S27_FROM: V3 = [-0.62, 0.5, camZ27(2400) - 1.9]; // landscape x ~33%, inside the 9:16 square
const s27Slop = (f: number): V3 => {
  const t = clamp(invLerp(2400, 2414, f));
  const H: V3 = [-0.22, 0.86, camZ27(2414) - 0.95];
  const e = outQuad(t);
  return [lerp(S27_FROM[0], H[0], e), lerp(S27_FROM[1], H[1], e) + 0.75 * Math.sin(Math.PI * t), lerp(S27_FROM[2], H[2], e)];
};
const S27: Shot = {
  id: 'S27', a: 2400, b: 2424, biome: 'forest',
  cam: (f) => ({ pos: [0, 1.05, camZ27(f)], look: [-0.25, 0.95, camZ27(f) - 10], fov: 52, run: 1 }),
  set: () => ({ pulse: 0.2 }),
  Scene: ({ f, v, cam, camLag }) => {
    const sp = s27Slop(f);
    const alive = f < 2414;
    const run = runHands(f, 1);
    const sw = invLerp(2408, 2414, f);
    // the mitten only appears to act: it rises into the wind-up (2405-2408), swats (2408-2414), follows through
    let R = null as ReturnType<typeof swatHand> | null;
    if (f >= 2405 && f < 2419) {
      const w0 = swatHand(0);
      const wind = seg(f, 2405, 2408, outCubic);
      R = f < 2408 ? { ...w0, p: [w0.p[0] + 0.06 * (1 - wind), w0.p[1] - 0.22 * (1 - wind), w0.p[2]] } : f < 2415 ? swatHand(sw) : { ...swatHand(1), p: [swatHand(1).p[0] - 0.03 * (f - 2414), swatHand(1).p[1] - 0.05 * (f - 2414), swatHand(1).p[2]] };
    }
    const smear = f >= 2409 && f <= 2413 ? 1 - Math.abs(f - 2411) / 2.5 : 0;
    const sz = camZ27(f);
    return (
      <>
        {alive && (
          <group position={sp} rotation={[0.3 * clamp(invLerp(2404, 2414, f)), face([sp[0], sp[2]], [0, sz]), 0]}>
            <Slopling frame={f} seed={3} scale={0.5} agitation={1} floor={f < 2404} />
          </group>
        )}
        {!alive && <SlopSplat progress={invLerp(2414, 2446, f)} origin={[-0.22, 0.95, camZ27(2414) - 0.95]} ground={0} count={30} power={1.3} size={0.9} puddleRadius={0.5} seed={5} />}
        {f >= 2414 && <HitSpark progress={invLerp(2414, 2424, f)} position={[-0.18, 0.98, camZ27(2414) - 0.9]} color="#ff9cf6" size={0.45} rays={10} sparks={10} seed={2} />}
        {/* a cool rim behind the slopling so the magenta separates from the dark */}
        {alive && <pointLight position={[sp[0] - 0.4, sp[1] + 0.8, sp[2] - 1.0]} color="#7affd0" intensity={3} distance={3} decay={2} />}
        <EmberBurst f={f} cam={cam} />
        {R && <PovHands cam={camLag} v={v} R={R} L={null} smear={smear} light={1.0} />}
        <SwatTrail cam={camLag} v={v} s={sw} />
      </>
    );
  },
  post: (f) => ({ ca: 0.0008 + 0.004 * spike(f, 2414, 6) }),
  shutter: 0.5,
};

/** the smash cut out of the fire (2400): the ember burst carries over as sparks streaking past the lens */
const EmberBurst: React.FC<{ f: number; cam: { position: THREE.Vector3; quaternion: THREE.Quaternion } }> = ({ f, cam }) => {
  const t = invLerp(2398, 2411, f);
  if (t <= 0 || t >= 1) return null;
  const out: React.ReactElement[] = [];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996, r = 0.12 + 0.55 * outCubic(t) * (0.6 + 0.4 * Math.sin(i * 1.7));
    const local = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7 - 0.05, -0.9 + 0.5 * t).applyQuaternion(cam.quaternion).add(cam.position);
    const col = i % 3 === 0 ? PAL.real : i % 3 === 1 ? '#fff4dc' : PAL.forestAccent;
    out.push(<GlowSprite key={i} color={col} size={0.03 + 0.02 * (i % 4) * (1 - t)} intensity={2.4 * (1 - t)} position={[local.x, local.y, local.z]} renderOrder={9} />);
  }
  return <>{out}</>;
};

// ======================= S28 Jargon (2424-2448) =======================
const camZ28 = (f: number) => 5.4 - (2 * (f - 2424)) / 60;
const S28: Shot = {
  id: 'S28', a: 2424, b: 2448, biome: 'forest',
  cam: (f) => {
    const yaw = 70 * seg(f, 2424, 2432, outExpo);
    const dodge = seg(f, 2436, 2446, outCubic);
    const a = yaw * D;
    const right = [Math.cos(a), Math.sin(a)];
    const z = camZ28(f);
    const pos: V3 = [-0.3 * dodge * right[0], 1.05 - 0.08 * dodge, z - 0.3 * dodge * right[1]];
    return { pos, look: [pos[0], 1.1, z - 10], fov: 56, yaw, roll: -10 * dodge, run: 0.6 };
  },
  set: () => ({ pulse: 0.2 }),
  Scene: ({ f, v, cam, camLag }) => {
    const c = cam.position;
    const yawD = face(DRONE_A, [c.x, c.z]);
    const dir = new THREE.Vector3(c.x - DRONE_A[0], 0, c.z - DRONE_A[1]).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x); // camera's right when it looks at the drone (approx)
    const hover = 1.45;
    // bolt 1 grazes past the right edge; bolt 2 rips by on the left as you dodge
    const t1 = new THREE.Vector3(c.x - right.x * 0.45 + dir.x * 1.5 - DRONE_A[0], c.y - 0.05 - hover, c.z - right.z * 0.45 + dir.z * 1.5 - DRONE_A[1]);
    const lens = new THREE.Vector3(DRONE_A[0] + dir.x * 0.45, hover, DRONE_A[1] + dir.z * 0.45);
    const to2 = new THREE.Vector3(c.x + right.x * 0.5 + dir.x * 1.2, c.y + 0.1, c.z + right.z * 0.5 + dir.z * 1.2);
    const run = runHands(f, 0.6);
    return (
      <>
        <group position={[DRONE_A[0], 0, DRONE_A[1]]}>
          <Drone frame={f} seed={4} scale={1.25} hover={hover} yaw={yawD} fire={invLerp(2432, 2452, f)} boltTarget={[t1.x, t1.y, t1.z]} glyph="KPI" />
        </group>
        {f >= 2442 && <JargonBolt progress={invLerp(2442, 2450, f)} from={[lens.x, lens.y, lens.z]} to={[to2.x, to2.y, to2.z]} glyph="ROI" size={0.55} />}
        <pointLight position={[DRONE_A[0], 2.2, DRONE_A[1] + 0.8]} color={PAL.cyan} intensity={6} distance={5} decay={2} />
      </>
    );
  },
  post: (f) => ({ ca: 0.0008 + 0.003 * spike(f, 2436, 6) + 0.003 * spike(f, 2442, 6) }),
  shutter: 0.5,
};

// ======================= S29a Run with him (2448-2472) =======================
const camZ29 = (f: number) => 2.0 - (4 * (f - 2448)) / 60;
const SLOPS29: { from: [number, number]; to: [number, number]; seed: number }[] = [
  { from: [-4.4, -6.5], to: [-1.6, -5.2], seed: 11 }, { from: [4.6, -7.4], to: [1.8, -5.8], seed: 12 }, { from: [-5.2, -9.5], to: [-2.3, -7.9], seed: 13 },
  { from: [5.4, -10.2], to: [2.4, -8.6], seed: 14 }, { from: [-3.0, -12.4], to: [-1.0, -9.8], seed: 15 }, { from: [3.4, -12.9], to: [0.9, -10.4], seed: 16 },
];
const S29A: Shot = {
  id: 'S29a', a: 2448, b: 2472, biome: 'forest',
  cam: (f) => ({ pos: [0.45, 1.05, camZ29(f)], look: [-0.35, 1.1, camZ29(f) - 10], fov: 50, run: 1, vYaw: -4 }),
  set: () => ({ pulse: 0.25 }),
  Scene: ({ f, v, cam, camLag }) => {
    const z = camZ29(f);
    const sx = -0.55, sz = z - 2.05;
    return (
      <>
        <HeroKey at={[sx, 1.2, sz]} cam={cam.position} intensity={4} side={0.5} />
        <pointLight position={[sx - 0.7, 2.0, sz - 1.1]} color="#7affd0" intensity={7} distance={3.5} decay={2} />
        <Hero position={[sx, 0, sz]} turn={Math.PI + 0.12} pose="batShoulder" run={(f - 2400) / 48} runAmount={1} expression="fierce"
          lantern={{ glow: 1.2, swing: [0.45 * Math.sin(((f - 2400) / 24) * Math.PI), 0.3 * Math.cos(((f - 2400) / 24) * Math.PI)] }} />
        {SLOPS29.map((q, i) => {
          const t = seg(f, 2446, 2474, (x) => x);
          const hop = Math.abs(Math.sin((f / 60) * 7 + i * 1.3)) * 0.35;
          const p: [number, number] = [lerp(q.from[0], q.to[0], t), lerp(q.from[1], q.to[1], t)];
          return (
            <group key={i} position={[p[0], hop, p[1]]} rotation={[0, face(p, [sx, sz]), 0]}>
              <Slopling frame={f} seed={q.seed} scale={0.7} agitation={1} />
            </group>
          );
        })}
      </>
    );
  },
  shutter: 0.4,
};

// ======================= S29b Wind-up (2472-2496) =======================
// a lower angle: he leaps 1.5 m ahead and raises the bat overhead; the camera pans left to keep him central
const S29B_FROM: [number, number] = [SAHUR1[0] + 0.55, SAHUR1[1] + 1.5];
const s29bPos = (f: number): V3 => {
  const t = seg(f, 2474, 2486, (x) => x);
  const dip = -0.04 * win(f, 2472, 2476, 2478, 2480);
  return [lerp(S29B_FROM[0], SAHUR1[0], outCubic(t)), dip + 0.55 * Math.sin(Math.PI * t), lerp(S29B_FROM[1], SAHUR1[1], outCubic(t))];
};
const S29B: Shot = {
  id: 'S29b', a: 2472, b: 2496, biome: 'forest',
  // low and long: the lens pans left with his leap (about 20 deg) and keeps him central and big
  cam: (f) => { const p = s29bPos(f); return { pos: [1.15, 0.55, -1.9], look: [p[0] + 0.15, 1.45 + 0.4 * p[1], p[2]], fov: 40, handheld: 0.8 }; },
  set: (f) => ({ pulse: 0.25 + 0.3 * seg(f, 2476, 2494) }),
  Scene: ({ f, cam }) => {
    const p = s29bPos(f);
    const air = f >= 2474 && f < 2486;
    const sw = f < 2490 ? 0.35 * seg(f, 2476, 2490, inOutCubic) : f < 2494 ? 0.35 : lerp(0.35, 0.53, inQuad(invLerp(2494, 2496, f)));
    return (
      <>
        <HeroKey at={[p[0], 1.3, p[2]]} cam={cam.position} intensity={3} side={0.6} />
        <pointLight position={[p[0] - 0.8, 2.3, p[2] - 1.2]} color="#7affd0" intensity={8} distance={3.5} decay={2} />
        <Hero position={p} turn={Math.PI - 0.15} pose={air ? POSES.leap : 'ready'} poseB="ready" poseMix={air ? 0.35 : 0} swing={sw} swingMix={air ? 0.5 : 1} expression="fierce" expressionB="tung" exprMix={seg(f, 2488, 2495)}
          lantern={{ glow: 1.3, swing: [0.5 * Math.sin((f - 2472) * 0.3), 0.25] }} />
      </>
    );
  },
  post: (f) => ({ zoom: 0.03 * seg(f, 2486, 2496) }),
  shutter: 0.2,
};

// ======================= S30a TUNG #1 (2496-2520) =======================
const R1 = (f: number) => tungRadius(invLerp(TUNG1, TUNG1 + TUNG1_DUR, f), TUNG1_R);
const reach1 = (d: number) => TUNG1 + (1 - Math.cbrt(Math.max(0, 1 - d / TUNG1_R))) * TUNG1_DUR;
const SLOPS30: [number, number][] = [
  [-1.6, -9.1], [1.9, -9.6], [-2.9, -11.2], [3.2, -11.8], [-0.6, -12.6], [1.0, -14.2], [-3.6, -15.2], [3.9, -16.6], [-1.8, -17.6], [0.9, -19.2],
  // the line the ring pops in S30b (two rows across the far arena: ~2525 and ~2529)
  [-4.0, -18.6], [-2.7, -18.7], [-1.4, -18.8], [-0.1, -18.9], [1.2, -19.0],
  [-3.3, -19.8], [-2.0, -19.9], [-0.7, -20.0], [0.6, -20.1],
];
const DRONES30: { p: [number, number]; h: number; dir: V3; seed: number }[] = [
  { p: [1.6, -10.8], h: 1.9, dir: [0.4, 0.6, -1], seed: 21 }, { p: [-4.4, -14.3], h: 2.3, dir: [-0.6, 0.7, -1], seed: 22 },
];
const ArenaFoes: React.FC<{ f: number; low?: boolean }> = ({ f }) => (
  <>
    {SLOPS30.map((q, i) => {
      const d = Math.hypot(q[0] - SP1[0], q[1] - SP1[1]);
      const at = reach1(d);
      const death = invLerp(at, at + 26, f);
      const hop = death > 0 ? 0 : Math.abs(Math.sin((f / 60) * 7 + i * 1.7)) * 0.25;
      return (
        <group key={i} position={[q[0], hop, q[1]]} rotation={[0, face(q, SP1), 0]}>
          <Slopling frame={f} seed={30 + i} scale={0.75} agitation={1} death={death} hit={death > 0 ? 0 : 0} />
        </group>
      );
    })}
    {DRONES30.map((q, i) => {
      const d = Math.hypot(q.p[0] - SP1[0], q.p[1] - SP1[1]);
      const at = reach1(d);
      return (
        <group key={i} position={[q.p[0], 0, q.p[1]]}>
          <Knockback progress={invLerp(at, at + 26, f)} dir={q.dir} dist={7} arc={1.5} spin={[6, 9, -12]} pivotY={q.h}>
            <Drone frame={f} seed={q.seed} scale={1.0} hover={q.h} yaw={face(q.p, SP1)} hit={spike(f, at, 4) * (f >= at ? 1 : 0)} />
          </Knockback>
        </group>
      );
    })}
  </>
);
const S30A: Shot = {
  id: 'S30a', a: 2496, b: 2520, biome: 'forest',
  // the ring passes through the lens at 2506 (R(2506) = the camera's distance from the strike)
  cam: () => ({ pos: [1.2, 0.95, SP1[1] + R1(2506) * 0.97 - 0.05], look: [SP1[0] - 0.2, 1.0, SP1[1] - 2], fov: 40, handheld: 0.7 }),
  set: (f) => ({ pulse: 1.5 * spike(f, TUNG1, 14) + 0.3 }),
  Scene: ({ f, cam }) => {
    const p = invLerp(TUNG1, TUNG1 + TUNG1_DUR, f);
    const sw = f < 2502 ? 0.55 : lerp(0.55, 0.82, seg(f, 2502, 2518, outCubic));
    return (
      <>
        <HeroKey at={[SAHUR1[0], 1.3, SAHUR1[1]]} cam={cam.position} intensity={3.5} side={0.8} />
        <Hero position={[SAHUR1[0], 0, SAHUR1[1]]} turn={Math.PI - 0.35} pose="ready" swing={sw} expression="tung"
          lantern={{ glow: 1.5, swing: [0.7 * Math.sin((f - TUNG1) * 0.35) * Math.exp(-(f - TUNG1) / 26), 0.25] }} />
        <group position={[SP1[0], 0, SP1[1]]}>
          <TungWave progress={p} radius={TUNG1_R} seed={11} />
        </group>
        <pointLight position={[SP1[0] + Math.sign(1) * 0, 0.5, SP1[1] + R1(f) * 0.6]} color={PAL.real} intensity={22 * Math.exp(-(f - TUNG1) / 12)} distance={12} decay={2} />
        <ArenaFoes f={f} />
      </>
    );
  },
  post: (f) => ({ ca: 0.0008 + 0.004 * clamp(1 - invLerp(2506, 2518, f)) * (f >= 2504 ? 1 : 0) + 0.003 * spike(f, 2496, 6), bloom: 1.0 + 0.6 * spike(f, 2496, 8),
    heat: { progress: invLerp(TUNG1, TUNG1 + TUNG1_DUR, f), center: [SP1[0], 0, SP1[1]], radius: TUNG1_R } }),
  look: (f) => ({ ev: 0.8 * win(f, 2505, 2506, 2509, 2511) + 0.2 * spike(f, 2496, 4) }),
  shutter: 0.35,
};

// ======================= S30b The ring (2520-2544) =======================
const S30B: Shot = {
  id: 'S30b', a: 2520, b: 2544, biome: 'forest',
  // low over his shoulder, a long lens down the arena: the ring wall rolls away between the trunks and
  // pops a line of sloplings (2522-2530); he straightens and glances back at you (2530)
  cam: () => ({ pos: [1.9, 0.75, SAHUR1[1] + 4.5], look: [-1.5, 0.75, -20], fov: 30, vYaw: -9, handheld: 0.6 }),
  set: (f) => ({ pulse: 0.6 * (1 - invLerp(2520, 2544, f)) + 0.2 }),
  Scene: ({ f, cam }) => {
    const p = invLerp(TUNG1, TUNG1 + TUNG1_DUR, f);
    const back = seg(f, 2520, 2534, inOutCubic);
    const glance = win(f, 2527, 2531, 2536, 2542);
    return (
      <>
        <HeroKey at={[SAHUR1[0], 1.3, SAHUR1[1]]} cam={cam.position} intensity={2.5} side={-0.5} />
        <ForestAtmos mood="fight" density={0.03} />
        <Hero position={[SAHUR1[0], 0, SAHUR1[1]]} turn={Math.PI - 0.35 - 1.9 * glance} pose={blend(swingPose(0.82), POSES.batShoulder, back)} expression="fierce" expressionB="determined" exprMix={back}
          look={[0.25 * glance, 0]} lantern={{ glow: 1.2, swing: [0.3 * Math.sin((f - 2520) * 0.25), 0.2] }} />
        <group position={[SP1[0], 0, SP1[1]]}>
          <TungWave progress={p} radius={TUNG1_R} seed={11} chips={false} />
        </group>
        <ArenaFoes f={f} />
      </>
    );
  },
  shutter: 0.3,
};

// ======================= S31 Turn (2544-2556) =======================
const POV31: V3 = [0.75, 1.05, -2.55];
const S31: Shot = {
  id: 'S31', a: 2544, b: 2556, biome: 'forest',
  cam: (f) => ({ pos: POV31, look: [POV31[0] - 0.4, 1.05, POV31[2] - 10], fov: 54, yaw: -80 * seg(f, 2544, 2556, inOutExpo), handheld: 0.6 }),
  set: () => ({ pulse: 0.2 }),
  Scene: ({ f }) => (
    <>
      <group position={[ECHO_P[0], 0, ECHO_P[1]]} rotation={[0, face(ECHO_P, [POV31[0], POV31[2]]), 0]}>
        <Echo frame={f} seed={2} scale={0.85} echoes={2} />
      </group>
      <Hero position={[SAHUR1[0], 0, SAHUR1[1]]} turn={Math.PI - 0.35 + 1.25 * win(f, 2527, 2531, 2536, 2542)} pose="batShoulder" expression="determined" lantern={{ glow: 1.2 }} />
    </>
  ),
  shutter: 0.6,
};

// ======================= S32 ECHO (2556-2592) =======================
const S32_SAHUR: [number, number] = [-1.15, -1.75];
const S32: Shot = {
  id: 'S32', a: 2556, b: 2592, biome: 'forest',
  cam: (f) => {
    const recoil = seg(f, 2576, 2586, outCubic);
    return { pos: [POV31[0] + 0.25 * recoil, 1.05, POV31[2] - 0.1 * recoil], look: [ECHO_P[0], 1.75, ECHO_P[1]], fov: 52, handheld: 0.7 };
  },
  set: () => ({ pulse: 0.3 }),
  Scene: ({ f, cam, v, camLag }) => {
    const surge = seg(f, 2556, 2574, (t) => t * t);
    const recoil = seg(f, 2578, 2592, outCubic);
    const toCam = new THREE.Vector3(POV31[0] - ECHO_P[0], 0, POV31[2] - ECHO_P[1]).normalize();
    const pos: V3 = [ECHO_P[0] + toCam.x * (0.6 * surge - 0.9 * recoil), 0, ECHO_P[1] + toCam.z * (0.6 * surge - 0.9 * recoil)];
    const sw = f < 2572 ? 0 : f < 2576 ? 0.5 * invLerp(2572, 2576, f) : 0.5 + 0.5 * seg(f, 2576, 2590, outCubic);
    const run = runHands(f, 0.2);
    return (
      <>
        <group position={pos} rotation={[0, face([pos[0], pos[2]], [cam.position.x, cam.position.z]), 0]}>
          <Echo frame={f} seed={2} scale={0.88} echoes={2} burst={seg(f, 2556, 2574, (t) => t)} maskCrack={seg(f, 2576, 2580, (t) => t)} scatter={seg(f, 2578, 2590, (t) => t)} hit={0.5 * spike(f, 2576, 3) * (f >= 2576 ? 1 : 0)} />
        </group>
        {f >= 2571 && (
          <>
            <HeroKey at={[S32_SAHUR[0], 1.3, S32_SAHUR[1]]} cam={cam.position} intensity={2.5} side={-0.4} />
            <Hero position={[S32_SAHUR[0] - 0.5 * (1 - seg(f, 2571, 2576, outCubic)), 0, S32_SAHUR[1] + 0.3 * (1 - seg(f, 2571, 2576, outCubic))]} turn={face(S32_SAHUR, ECHO_P) + 0.2} pose={swatPose(sw)} expression="fierce" lantern={false} castShadow={false} />
          </>
        )}
        {f >= 2576 && <HitSpark progress={invLerp(2576, 2588, f)} position={[pos[0] + toCam.x * 0.5, 2.05, pos[2] + toCam.z * 0.5]} color="#ffe0f8" size={0.8} rays={12} sparks={12} seed={6} />}
      </>
    );
  },
  post: (f) => ({ ca: 0.0008 + 0.003 * seg(f, 2556, 2574, (t) => t) + 0.004 * spike(f, 2576, 8), zoom: 0.03 * seg(f, 2560, 2574, (t) => t) }),
  shutter: 0.4,
};

export const FOREST_SHOTS: Shot[] = [S27, S28, S29A, S29B, S30A, S30B, S31, S32];
