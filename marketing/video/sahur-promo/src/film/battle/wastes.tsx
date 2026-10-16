// BEAT 7, biome 2: SERVER FARM WASTES (S33-S38, frames 2592-2784), light L5b.
import React from 'react';
import * as THREE from 'three';
import { Hero, HeroKey, CrackGlow } from './hero';
import { GlowSprite } from '../../enemies/lib/scene';
import { PovHands, runHands, reachRight, DEFENSIVE, BRACE } from './hands';
import { DustPuff, WaterRing, Chip } from './fx';
import { LEAP_COCK, swatPose, blend } from './poses';
import { Shot, ShotCtx } from './types';
import { seg, track, win, spike, clamp, lerp, invLerp, D, SS, inQuad, outQuad, outCubic, inOutCubic, outExpo, inCubic, V3, lerpV } from './kit';
import { POSES } from '../../rig/pose';
import { swingPose } from '../../rig/pose';
import { riverX, RIVER_HALF, RackProp } from '../../sets/Wastes';
import { ScraperHand } from '../../enemies/ScraperHand';
import { Wraith } from '../../enemies/Wraith';
import { Scraper } from '../../enemies/Scraper';
import { HitSpark } from '../../fx/HitSpark';
import { Knockback } from '../../fx/Knockback';
import { TungWave, tungRadius } from '../../fx/TungWave';
import { Shards } from '../../fx/Shards';
import { PAL } from '../../lib/palette';

const face = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);

// ======================= S33 Landing (2592-2616) =======================
const S33_H: [number, number] = [-1.15, -2.3];
const S33_V: [number, number] = [-0.7, -2.7];
const S33: Shot = {
  id: 'S33', a: 2592, b: 2616, biome: 'wastes',
  cam: (f) => {
    const y = f < 2600 ? lerp(2.2, 1.05, inQuad(invLerp(2592, 2600, f))) : 1.05 - 0.12 * Math.sin(Math.PI * clamp(invLerp(2600, 2612, f)) ** 0.7);
    const z = lerp(0.8, 0, outCubic(invLerp(2592, 2604, f)));
    const pitch = lerp(-14, 0, outCubic(invLerp(2594, 2606, f)));
    // vertical: Sahur's landing beats the river (storyboard asked V.yaw +5; we keep him in frame instead)
    return { pos: [0, y, z], look: [0.9, y, z - 8], fov: 58, pitch, vYaw: -6, handheld: 1 };
  },
  set: () => ({ focus: [0.5, -4] }),
  Scene: ({ f, v, cam, camLag }) => {
    const S33_SAHUR = v ? S33_V : S33_H;
    const air = invLerp(2592, 2604, f);
    const y = f < 2604 ? lerp(2.1, 0, inQuad(air)) : 0;
    const crouch = win(f, 2602, 2605, 2607, 2616);
    const pose = f < 2602 ? POSES.leap : blend(blend(POSES.land, POSES.batShoulder, invLerp(2608, 2616, f)), POSES.land, crouch);
    const turn = face(S33_SAHUR, [4, -10]);
    // mittens: thrown out for balance in the drop, then they pump
    const brace = 1 - seg(f, 2602, 2612);
    const dip = 0.05 * Math.sin(Math.PI * clamp(invLerp(2599, 2607, f)));
    const run = runHands(f, 0.7);
    const R = brace > 0.5 ? { ...BRACE.R, p: [BRACE.R.p[0], BRACE.R.p[1] - dip, BRACE.R.p[2]] as V3 } : run.R;
    const L = brace > 0.5 ? { ...BRACE.L, p: [BRACE.L.p[0], BRACE.L.p[1] - dip, BRACE.L.p[2]] as V3 } : run.L;
    return (
      <>
        <HeroKey at={[S33_SAHUR[0], y + 1.2, S33_SAHUR[1]]} cam={cam.position} intensity={6} />
        <Hero position={[S33_SAHUR[0], y, S33_SAHUR[1]]} turn={turn} pose={pose} expression="fierce" lantern={{ glow: 1, swing: [0.5 * Math.sin(f * 0.3), 0.3] }} />
        <DustPuff progress={invLerp(2603, 2640, f)} origin={[S33_SAHUR[0], 0.05, S33_SAHUR[1]]} radius={1.6} rise={0.5} size={0.9} count={46} color="#e0b886" opacity={0.75} seed={3} />
        <DustPuff progress={invLerp(2599, 2632, f)} origin={[0, 0.05, -0.9]} radius={1.2} rise={0.3} size={0.5} count={30} color="#d4aa78" opacity={0.6} seed={7} />
      </>
    );
  },
  post: (f) => ({ zoom: 0.05 * win(f, 2592, 2594, 2598, 2601), ca: 0.001 + 0.003 * spike(f, 2600, 6) }),
  shutter: 0.5,
};

// ======================= S34 The hand (2616-2652) =======================
const S34_HAND: V3 = [0.2, 0, -2.85];
const S34_SAHUR: [number, number] = [-1.35, -1.45];
const S34: Shot = {
  id: 'S34', a: 2616, b: 2652, biome: 'wastes',
  cam: (f) => {
    const z = lerp(0.25, 0.05, seg(f, 2616, 2640));
    const recoil = seg(f, 2636, 2644, outCubic) * (1 - seg(f, 2648, 2652));
    return { pos: [0, 1.05 - 0.04 * recoil, z + 0.12 * recoil], look: [0.15, 1.12, -3], fov: 50, pitch: 2 * recoil, handheld: 0.9 };
  },
  set: () => ({ focus: [0, -3] }),
  Scene: ({ f, v, cam, camLag }) => {
    const rise = seg(f, 2616, 2628, outCubic);
    const windup = seg(f, 2618, 2640, (t) => t);
    const grab = 0.45 * seg(f, 2640, 2648, (t) => t);
    const hitP = invLerp(2648, 2668, f);
    const hit = spike(f, 2648, 3) * (f >= 2648 ? 1 : 0);
    // Sahur steps in from the left edge and swats: wind 2634-2645, contact 2648, follow-through to 2660
    // swat timeline: 0 wound (reached by 2643), 0.5 contact at 2648, 1 follow-through by 2662
    const sw = f < 2645 ? 0 : f < 2648 ? 0.5 * invLerp(2645, 2648, f) : 0.5 + 0.5 * seg(f, 2648, 2662, outCubic);
    const swat = swatPose(sw);
    const step = seg(f, 2630, 2646, outCubic);
    const sahurPos: V3 = [lerp(-2.2, S34_SAHUR[0], step), 0, lerp(-0.9, S34_SAHUR[1], step)];
    const hands = seg(f, 2634, 2640, outCubic) * (1 - seg(f, 2648, 2652));
    const run = runHands(f, 0.3);
    const contact: V3 = [S34_HAND[0] - 0.25, S34_HAND[1] + 1.2, S34_HAND[2] + 1.6];
    return (
      <>
        <RackProp position={[0.25, 0, -3.35]} yaw={0.25} height={1.05} lean={0.08} />
        <group position={S34_HAND}>
          <Knockback progress={hitP} dir={[1, 0.35, 0.15]} dist={4.5} arc={1.2} spin={[2, 4, -11]} pivotY={1.0}>
            <ScraperHand frame={f} seed={4} hover={lerp(0.05, 0.98, rise)} windup={windup} grab={grab} grabDist={1.6} scale={1.3} hit={0} limp={invLerp(2648, 2656, f)} />
          </Knockback>
        </group>
        <HeroKey at={[sahurPos[0], 1.2, sahurPos[2]]} cam={cam.position} intensity={4} />
        <pointLight position={[0.3, 1.5, -1.7]} color="#ffd2a8" intensity={6} distance={3.5} decay={2} />
        <Hero position={sahurPos} turn={Math.PI / 2 - 0.15} pose={f < 2645 ? blend(POSES.batShoulder, swatPose(0), seg(f, 2630, 2643)) : swat} expression="fierce" lantern={false} />
        {f >= 2648 && <HitSpark progress={invLerp(2648, 2660, f)} position={contact} color="#ffd9a0" size={0.55} rays={12} sparks={12} seed={5} />}
        {hands > 0.01 && <PovHands cam={camLag} v={v} R={{ ...DEFENSIVE.R, p: [DEFENSIVE.R.p[0], DEFENSIVE.R.p[1] - 0.12 * (1 - hands), DEFENSIVE.R.p[2]] }} L={{ ...DEFENSIVE.L, p: [DEFENSIVE.L.p[0], DEFENSIVE.L.p[1] - 0.12 * (1 - hands), DEFENSIVE.L.p[2]] }} tremble={hands * 0.8} />}
      </>
    );
  },
  post: (f) => ({ ca: 0.001 + 0.004 * spike(f, 2648, 6), zoom: 0.06 * win(f, 2640, 2644, 2646, 2649) }),
  look: (f) => ({ ev: 0.2 * spike(f, 2648, 3) }),
  shutter: 0.5,
};

// ======================= S35 Wraith (2652-2688) =======================
const S35: Shot = {
  id: 'S35', a: 2652, b: 2688, biome: 'wastes',
  cam: (f) => {
    const duck = seg(f, 2670, 2678, outCubic) * (1 - seg(f, 2680, 2688, inOutCubic));
    return { pos: [0.05, 1.05 - 0.1 * duck, -0.4], look: [0.45, 1.05, -3.4], fov: 50, pitch: -8 * duck, roll: 3 * duck, handheld: 0.9 };
  },
  set: () => ({ focus: [0, -4] }),
  Scene: ({ f, v, cam, camLag }) => {
    const drift = seg(f, 2652, 2668, outCubic);
    const x = lerp(2.8, 0.35, drift);
    const lunge = invLerp(2664, 2690, f);
    const duck = seg(f, 2669, 2676, outCubic) * (1 - seg(f, 2682, 2688));
    const run = runHands(f, 0.4);
    return (
      <>
        <group position={[x, 0, -2.9]}>
          <Wraith frame={f} seed={6} scale={1.55} hover={0.28} lunge={lunge} lungeYaw={-Math.PI / 2 - Math.atan2(x - 0.05, 2.5) * 0.4} lungeDist={3.2} />
        </group>
        <HeroKey at={[-1.9, 1.2, -5.6]} cam={cam.position} intensity={5} />
        <Hero position={[-1.9, 0, -5.6]} turn={face([-1.9, -5.6], [0.4, -2.9]) + 0.3} pose={blend(POSES.batShoulder, POSES.ready, seg(f, 2660, 2676))} expression="fierce" lantern={{ glow: 1 }} />
        {duck > 0.05 && <PovHands cam={camLag} v={v} R={{ ...DEFENSIVE.R, p: [0.17, -0.16 - 0.12 * (1 - duck), -0.42] }} L={{ ...DEFENSIVE.L, p: [-0.18, -0.17 - 0.12 * (1 - duck), -0.43] }} />}
      </>
    );
  },
  post: (f) => ({ ca: 0.001 + 0.006 * win(f, 2672, 2675, 2680, 2686) }),
  shutter: 0.5,
};

// ======================= S36a TUNG #2 (2688-2712) =======================
const BANK: [number, number] = [1.0, -5.5];
const ACROSS = face(BANK, [BANK[0] + 0.97, BANK[1] + 0.243]);
const SP2: [number, number] = [BANK[0] + Math.sin(ACROSS) * 0.95, BANK[1] + Math.cos(ACROSS) * 0.95];
const TUNG2 = 2688, TUNG2_DUR = 30, TUNG2_R = 9;
const FAR_FOES: { kind: 'hand' | 'wraith'; p: [number, number]; seed: number }[] = [
  { kind: 'hand', p: [6.3, -8.4], seed: 11 }, { kind: 'hand', p: [5.6, -4.0], seed: 12 }, { kind: 'wraith', p: [7.4, -6.3], seed: 13 },
  { kind: 'hand', p: [8.6, -9.6], seed: 14 }, { kind: 'wraith', p: [4.6, -2.4], seed: 15 },
];
const reachFrame = (d: number) => TUNG2 + (1 - Math.cbrt(Math.max(0, 1 - d / TUNG2_R))) * TUNG2_DUR;
const S36A: Shot = {
  id: 'S36a', a: 2688, b: 2712, biome: 'wastes',
  cam: (f) => ({ pos: [-0.2, 1.05, -3.75], look: [4.6, 0.3, -7.9], fov: 54, vYaw: -14, handheld: 0.8, pitch: 1.5 * seg(f, 2688, 2712) }),
  set: (f) => ({ focus: [3, -6], ring: { c: SP2, r: tungRadius(invLerp(TUNG2, TUNG2 + TUNG2_DUR, f), TUNG2_R), a: 1 - invLerp(2700, 2716, f) } }),
  Scene: ({ f, v, cam }) => {
    const p = invLerp(TUNG2, TUNG2 + TUNG2_DUR, f);
    const sw = f < 2694 ? 0.55 : lerp(0.55, 0.82, seg(f, 2694, 2710, outCubic));
    const cracks = 0.6 * seg(f, 2700, 2706);
    return (
      <>
        <HeroKey at={[BANK[0], 1.2, BANK[1]]} cam={cam.position} intensity={4} side={-0.6} />
        <Hero position={[BANK[0], 0, BANK[1]]} turn={ACROSS} pose="ready" swing={sw} expression="tung" lantern={{ glow: 1.3, swing: [0.6 * Math.sin((f - 2688) * 0.35) * Math.exp(-(f - 2688) / 30), 0.2] }} cracks={cracks} innerLight={0.004 * cracks} />
        <group position={[SP2[0], 0, SP2[1]]}>
          <TungWave progress={p} radius={TUNG2_R} seed={21} />
        </group>
        <WaterRing progress={p} center={SP2} maxR={TUNG2_R} half={RIVER_HALF} riverX={riverX} frame={f} dur={TUNG2_DUR} height={1.5} />
        <pointLight position={[SP2[0], 0.6, SP2[1]]} color={PAL.real} intensity={22 * Math.exp(-(f - TUNG2) / 10)} distance={10} decay={2} />
        {FAR_FOES.map((q, i) => {
          const d = Math.hypot(q.p[0] - SP2[0], q.p[1] - SP2[1]);
          const hitAt = reachFrame(d);
          const kp = invLerp(hitAt, hitAt + 18, f);
          const dir: V3 = [(q.p[0] - SP2[0]) / d, 0.45, (q.p[1] - SP2[1]) / d];
          return (
            <group key={i} position={[q.p[0], 0, q.p[1]]} rotation={[0, face(q.p, SP2), 0]}>
              <Knockback progress={kp} dir={dir} dist={5} arc={1.6} spin={[3 + i, 2, -8 - i]} pivotY={0.9}>
                {q.kind === 'hand' ? (
                  <ScraperHand frame={f} seed={q.seed} scale={1.1} windup={0.4} hit={spike(f, hitAt, 4) * (f >= hitAt ? 1 : 0)} limp={kp} />
                ) : (
                  <Wraith frame={f} seed={q.seed} scale={1.2} hit={spike(f, hitAt, 4) * (f >= hitAt ? 1 : 0)} />
                )}
              </Knockback>
            </group>
          );
        })}
      </>
    );
  },
  post: (f) => ({ ca: 0.0012 + 0.004 * spike(f, 2688, 10), bloom: 1.35 + 0.8 * spike(f, 2688, 8), heat: { progress: invLerp(TUNG2, TUNG2 + TUNG2_DUR, f), center: [SP2[0], 0, SP2[1]], radius: TUNG2_R } }),
  look: (f) => ({ ev: 0.6 * spike(f, 2688, 5) }),
  shutter: 0.35,
};

// ======================= S36b The first crack (2712-2736) =======================
// A medium close-up on his face and upper log as he turns from the river: the hairline (opened at 2700,
// beside his right eye) is turned to the lens, glowing and leaking light; a chip spins at you; he winces.
const S36B_CAM: V3 = [BANK[0] - 1.18, 1.43, BANK[1] + 0.66];
const S36B_TOCAM = face(BANK, [S36B_CAM[0], S36B_CAM[2]]);
const S36B_END = S36B_TOCAM + 0.63; // the crack (u 0.4, φ -0.63) faces the camera
const S36B: Shot = {
  id: 'S36b', a: 2712, b: 2736, biome: 'wastes',
  cam: (f) => {
    const push = seg(f, 2712, 2736, (t) => t);
    return { pos: [S36B_CAM[0] + 0.1 * push, S36B_CAM[1], S36B_CAM[2] - 0.06 * push], look: [BANK[0], 1.5, BANK[1]], fov: 42, handheld: 0.45 };
  },
  set: () => ({ focus: [1, -6], key: 0.75 }),
  Scene: ({ f, cam }) => {
    const tw = seg(f, 2712, 2726, outCubic);
    const turn = lerp(ACROSS, S36B_END, tw);
    const blink = f >= 2718 && f < 2720 ? 1 : f === 2720 ? 0.45 : 0;
    const pulse = spike(f, 2714, 10);
    // the chip: off the crack, spinning toward the lens (2714-2734)
    const ct = invLerp(2714, 2734, f);
    const start = new THREE.Vector3(BANK[0] - 0.15, 1.82, BANK[1] + 0.12);
    const end = cam.position.clone().add(new THREE.Vector3(0.18, 0.02, -0.15));
    const cp = start.clone().lerp(end, outQuad(ct));
    cp.y += 0.1 * Math.sin(Math.PI * ct);
    const props = { position: [BANK[0], 0, BANK[1]] as V3, turn, pose: blend(swingPose(0.82), POSES.batShoulder, seg(f, 2712, 2730)) };
    return (
      <>
        <HeroKey at={[BANK[0], 1.5, BANK[1]]} cam={cam.position} intensity={1.4} back={0.9} up={0.35} side={-0.35} color="#ffd8b0" distance={2.5} />
        <pointLight position={[BANK[0] + 1.4, 0.5, BANK[1] - 0.6]} color={PAL.cyan} intensity={5} distance={4} decay={2} />
        <Hero {...props} expression="fierce" expressionB="strained" exprMix={0.35 + 0.65 * win(f, 2715, 2718, 2724, 2734)} blink={blink} lantern={{ glow: 0.8, light: 0.3 }}
          cracks={1} innerLight={0.006 + 0.02 * pulse} chips={{ t: invLerp(2713, 2755, f), seed: 3, count: 7 }} />
        <CrackGlow props={props} cracks={1} boost={1.0 + 0.6 * pulse} frame={f} />
        {f >= 2714 && <Chip position={[cp.x, cp.y, cp.z]} rotation={[ct * 14, ct * 9, ct * 5]} size={0.024 * (1 + 0.6 * ct)} glow={0.8} />}
      </>
    );
  },
  post: (f) => ({ bloom: 1.05 + 0.4 * spike(f, 2714, 10), ca: 0.001 + 0.002 * spike(f, 2714, 6) }),
  look: (f) => ({ ev: 0.15 * spike(f, 2714, 6) }),
  shutter: 0.3,
};

// ======================= S37 He stumbles (2736-2748) =======================
const S37_SAHUR: [number, number] = [-0.55, -2.55];
const S37: Shot = {
  id: 'S37', a: 2736, b: 2748, biome: 'wastes',
  cam: (f) => ({ pos: [0.45, 1.05, -0.4], look: [0.6, 1.0, -4.0], fov: 50, yaw: -8 * seg(f, 2736, 2746, inOutCubic) - 10, handheld: 0.7 }),
  set: () => ({ focus: [0, -3] }),
  Scene: ({ f, v, cam, camLag }) => {
    const dip = seg(f, 2736, 2741, outCubic);
    const pose = blend(POSES.batShoulder, POSES.stumble, dip);
    return (
      <>
        <HeroKey at={[S37_SAHUR[0], 1.2, S37_SAHUR[1]]} cam={cam.position} intensity={4} side={0.5} />
        <Hero position={[S37_SAHUR[0], -0.025 * dip, S37_SAHUR[1]]} turn={face(S37_SAHUR, [0.4, -0.4]) - 0.5} pose={pose} expression="strained" lantern={false} cracks={1} innerLight={0.004} />
        <PovHands cam={camLag} v={v} R={reachRight(0.55 * seg(f, 2740, 2748, outCubic), -0.12, 0.0)} />
      </>
    );
  },
  look: (f) => ({ sat: 1 - 0.25 * seg(f, 2742, 2746) }),
  shutter: 0.4,
};

// ======================= S38 THE SCRAPER (2748-2784) =======================
// One clean image: the Scraper big and centred, hands spread; Sahur a small crisp silhouette leaping
// across it, bat raised, a lantern trail behind him; he strikes the cyan centre at 2772 (flash), rings burst.
const SCR: V3 = [0.3, 0, -7.8];
const S38_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-3.6, 0.3, -5.4), new THREE.Vector3(-1.7, 1.6, -5.9), new THREE.Vector3(0.25, 1.95, -6.25),
  new THREE.Vector3(1.9, 1.5, -6.1), new THREE.Vector3(3.6, 0.3, -5.8),
]);
const s38At = (f: number) => S38_PATH.getPoint(clamp(invLerp(2758, 2786, f)));
const S38: Shot = {
  id: 'S38', a: 2748, b: 2784, biome: 'wastes',
  cam: (f, v) => {
    const whip = seg(f, 2766, 2772, outExpo);
    const push = seg(f, 2748, 2766, (t) => t);
    return { pos: [0.1, 1.1, -1.5 - 0.35 * push], look: [SCR[0], 2.85, SCR[2]], fov: 52, yaw: (v ? 5 : 9) * whip, handheld: 0.6 };
  },
  set: () => ({ focus: [0, -6], key: 0.35 }),
  Scene: ({ f }) => {
    const reach = 0.65 * seg(f, 2748, 2768, (t) => t);
    const shatter = invLerp(2774, 2792, f);
    const pos = s38At(f);
    const sw = f < 2768 ? 0.3 : f < 2772 ? lerp(0.35, 0.55, invLerp(2768, 2772, f)) : lerp(0.55, 0.92, outCubic(invLerp(2772, 2784, f)));
    const trail: React.ReactElement[] = [];
    if (f >= 2760) for (let k = 1; k <= 12; k++) {
      const q = s38At(f - k * 0.8);
      trail.push(<GlowSprite key={k} color={PAL.real} size={0.22 * (1 - k / 13)} intensity={1.4 * (1 - k / 13)} position={[q.x - 0.15, q.y + 1.55, q.z]} renderOrder={9} />);
    }
    return (
      <>
        <group position={SCR}>
          <Scraper frame={f} seed={2} scale={1.4} orbitPeriod={48} reach={reach} reachDist={1.3} shatter={shatter} hit={0.6 * spike(f, 2772, 4) * (f >= 2772 ? 1 : 0)} />
        </group>
        <pointLight position={[SCR[0], 3.0, SCR[2] + 0.4]} color={PAL.cyan} intensity={26} distance={9} decay={2} />
        {f >= 2758 && (
          <Hero position={[pos.x, pos.y, pos.z]} turn={Math.PI / 2 - 0.25} pose={LEAP_COCK} swing={sw} swingMix={seg(f, 2764, 2768)} expression="fierce" lantern={{ glow: 1.4, light: 1 }} cracks={1} castShadow={false} />
        )}
        {trail}
        {f >= 2772 && <HitSpark progress={invLerp(2772, 2788, f)} position={[SCR[0], 3.05, SCR[2] + 0.9]} color="#bff6ff" size={2.6} rays={14} sparks={16} seed={9} />}
      </>
    );
  },
  post: (f) => ({ ca: 0.001 + 0.004 * spike(f, 2772, 8), bloom: 1.0 + 0.5 * spike(f, 2774, 10) }),
  shutter: 0.5,
};

export const WASTES_SHOTS: Shot[] = [S33, S34, S35, S36A, S36B, S37, S38];
