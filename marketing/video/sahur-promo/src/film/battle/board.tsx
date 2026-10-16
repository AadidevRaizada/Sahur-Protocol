// BEAT 7, biome 3: BOARDROOM OF BROKEN PROMISES (S39-S44, frames 2784-2976), light L5c.
import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { Hero, HeroKey, CrackGlow } from './hero';
import { PovHands, reachRight, runHands } from './hands';
import { Papers } from './fx';
import { LEAP_COCK, KNEE_HAND_UP, blend } from './poses';
import { Shot } from './types';
import { seg, win, spike, clamp, lerp, invLerp, outCubic, inOutCubic, outExpo, inQuad, V3 } from './kit';
import { POSES, swingPose } from '../../rig/pose';
import { TABLE } from '../../sets/Boardroom';
import { YesMan } from '../../enemies/YesMan';
import { PivotGolem } from '../../enemies/PivotGolem';
import { Valuation } from '../../enemies/Valuation';
import { TungWave } from '../../fx/TungWave';
import { HitSpark } from '../../fx/HitSpark';
import { Knockback } from '../../fx/Knockback';
import { PAL } from '../../lib/palette';

const TY = TABLE.y;
const face = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);

// ---------- the yes-men: a ring gliding around the table, every one of them facing you ----------
const YM_N = 8;
const YM_C: [number, number] = [0, -3.6];
const ymPos = (i: number, f: number): [number, number] => {
  const a = (i / YM_N) * Math.PI * 2 + ((f - 2784) / 240) * Math.PI * 2 + 0.3;
  return [YM_C[0] + 2.85 * Math.cos(a), YM_C[1] + 6.3 * Math.sin(a)];
};
const YesMen: React.FC<{ f: number; cam: THREE.Vector3; crack?: number; tip?: number; skip?: (p: [number, number]) => boolean }> = ({ f, cam, crack = 0, tip = 0, skip }) => (
  <>
    {Array.from({ length: YM_N }, (_, i) => {
      const p = ymPos(i, f);
      if (skip && skip(p)) return null;
      const d = Math.hypot(p[0] - STRIKE[0], p[1] - STRIKE[2]);
      const local = clamp(tip * 1.4 - d * 0.06);
      return (
        <group key={i} position={[p[0], 0, p[1]]} rotation={[0, face(p, [cam.x, cam.z]), 0]}>
          <YesMan frame={f} seed={i + 3} scale={1.2} smileCrack={clamp(crack * 1.3 - d * 0.03)} tip={local} />
        </group>
      );
    })}
  </>
);

// ---------- the golem on the far end of the table ----------
const GOLEM: V3 = [0, TY, -7.5];
const golemSlam = (f: number) => (f < 2816 ? 0.5 * clamp(invLerp(2806, 2816, f)) : 0.5 + 0.5 * clamp(invLerp(2816, 2832, f)));
const golemSplit = (f: number) => clamp(invLerp(2822, 2838, f));
const Golem: React.FC<{ f: number; knock?: number }> = ({ f, knock = 0 }) => (
  <group position={GOLEM}>
    <Knockback progress={knock} dir={[0, 0.3, -1]} dist={4} arc={1.0} spin={[-2.5, 0, 0]} pivotY={0.9}>
      <PivotGolem frame={f} seed={2} scale={1.45} slam={f >= 2806 ? golemSlam(f) : 0} split={golemSplit(f)} splitDist={0.55} />
    </Knockback>
  </group>
);

// ---------- Sahur on the table ----------
const SAHUR_T: [number, number] = [0, -1.45];
const STRIKE: V3 = [0, TY, -2.3];
const TUNG3 = 2880, TUNG3_DUR = 30, TUNG3_R = 10;

// ======================= S39 The table (2784-2808) =======================
const S39: Shot = {
  id: 'S39', a: 2784, b: 2808, biome: 'board',
  cam: (f) => {
    const z = lerp(1.3, -1.1, seg(f, 2784, 2808, outCubic));
    return { pos: [0, TY + 0.18, z], look: [0, TY + 0.12, z - 12], fov: 46, handheld: 0.5 };
  },
  set: () => ({}),
  Scene: ({ f, cam }) => (
    <>
      <YesMen f={f} cam={cam.position} />
      <Golem f={f} />
    </>
  ),
  post: (f) => ({ zoom: 0.05 * (1 - seg(f, 2784, 2800)) }),
  shutter: 0.5,
};

// ======================= S40 The golem (2808-2832) =======================
const S40: Shot = {
  id: 'S40', a: 2808, b: 2832, biome: 'board',
  cam: () => ({ pos: [0.6, TY + 0.32, -3.0], look: [0, TY + 1.0, -7.5], fov: 48, handheld: 0.7 }),
  set: (f) => ({ jump: 0.05 * win(f, 2816, 2817, 2819, 2824) }),
  Scene: ({ f, cam }) => (
    <>
      <YesMen f={f} cam={cam.position} skip={(p) => p[1] > -2.0} />
      <Golem f={f} />
      <Papers frame={f} at={2816} origin={[0, TY + 0.005, -5.9]} count={16} spread={1.6} />
      {f >= 2816 && <HitSpark progress={invLerp(2816, 2828, f)} position={[1.25, TY + 0.2, -6.7]} color="#ffd59a" size={0.9} rays={10} sparks={8} seed={3} />}
      {f >= 2816 && <HitSpark progress={invLerp(2816, 2828, f)} position={[-1.25, TY + 0.2, -6.7]} color="#ffd59a" size={0.9} rays={10} sparks={8} seed={4} />}
    </>
  ),
  post: (f) => ({ ca: 0.0008 + 0.003 * spike(f, 2816, 8) }),
  shutter: 0.4,
};

// ======================= S41a On the table (2832-2856) =======================
const jumpOn = (f: number): V3 => {
  const t = invLerp(2832, 2846, f);
  const a: V3 = [-2.3, 0, 0.4], b: V3 = [SAHUR_T[0], TY, SAHUR_T[1]];
  const e = outCubic(t);
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], t) + 1.1 * Math.sin(Math.PI * t), lerp(a[2], b[2], e)];
};
const S41A: Shot = {
  id: 'S41a', a: 2832, b: 2856, biome: 'board',
  cam: () => ({ pos: [0.5, 1.0, 1.5], look: [0.05, 2.05, -1.45], fov: 54, pitch: 0, handheld: 0.7 }),
  set: () => ({}),
  Scene: ({ f, cam, v, camLag }) => {
    const p = jumpOn(f);
    const air = f < 2846;
    const land = win(f, 2845, 2846, 2848, 2856);
    const pose = air ? POSES.leap : blend(POSES.batShoulder, POSES.land, land);
    return (
      <>
        <YesMen f={f} cam={cam.position} />
        <Golem f={f} />
        <HeroKey at={[p[0], p[1] + 1.2, p[2]]} cam={cam.position} intensity={5} side={0.4} />
        <Hero position={p} turn={air ? -0.6 : lerp(Math.PI + 0.5, Math.PI + 0.35, seg(f, 2846, 2856))} pose={pose} expression="fierce" lantern={{ glow: 1, swing: [0.6 * Math.sin((f - 2832) * 0.4) * Math.exp(-Math.max(0, f - 2846) / 14), 0.25] }} cracks={1} innerLight={0.004} />
      </>
    );
  },
  post: (f) => ({ ca: 0.0008 + 0.002 * spike(f, 2846, 6) }),
  shutter: 0.4,
};

// ======================= S41b Wind-up (2856-2880) =======================
const S41B: Shot = {
  id: 'S41b', a: 2856, b: 2880, biome: 'board',
  cam: (f) => ({ pos: [1.05, 1.0, -3.35], look: [0.05, 2.0, -1.45], fov: 46, handheld: 0.6, roll: -2 * seg(f, 2856, 2880) }),
  set: () => ({}),
  Scene: ({ f, cam }) => {
    const sw = f < 2876 ? 0.35 * seg(f, 2856, 2874, inOutCubic) : lerp(0.35, 0.55, inQuad(invLerp(2876, 2880, f)));
    const pulse = 0.5 + 0.5 * Math.sin((f - 2856) * 0.55);
    return (
      <>
        <YesMen f={f} cam={cam.position} />
        <Golem f={f} />
        <HeroKey at={[SAHUR_T[0], TY + 1.5, SAHUR_T[1]]} cam={cam.position} intensity={3} back={1.1} up={0.5} side={-0.4} distance={3} />
        <Hero position={[SAHUR_T[0], TY, SAHUR_T[1]]} turn={Math.PI + 0.12} pose="ready" swing={sw} expression="strained" lantern={{ glow: 1.1, light: 4 }}
          cracks={1 + 0.25 * seg(f, 2856, 2878)} innerLight={0.003 + 0.01 * pulse * seg(f, 2858, 2866)} chips={{ t: invLerp(2860, 2902, f), seed: 8, count: 3 }} />
      </>
    );
  },
  post: (f) => ({ zoom: 0.02 * seg(f, 2870, 2880) }),
  shutter: 0.3,
};

// ======================= S42a TUNG #3 (2880-2904) =======================
const S42A: Shot = {
  id: 'S42a', a: 2880, b: 2904, biome: 'board',
  cam: () => ({ pos: [0.3, 0.98, 1.25], look: [0, 1.75, -3.5], fov: 60, handheld: 0.7 }),
  set: (f) => ({ shatter: Math.max(0, (f - 2886) / 14), shatterOrigin: STRIKE, voidAmt: seg(f, 2886, 2890) }),
  Scene: ({ f, cam }) => {
    const p = invLerp(TUNG3, TUNG3 + TUNG3_DUR, f);
    const sw = f < 2888 ? 0.55 : lerp(0.55, 0.85, seg(f, 2888, 2904, outCubic));
    return (
      <>
        <YesMen f={f} cam={cam.position} crack={invLerp(2886, 2894, f)} tip={invLerp(2890, 2906, f)} />
        <Golem f={f} knock={invLerp(2886, 2904, f)} />
        <HeroKey at={[SAHUR_T[0], TY + 1.2, SAHUR_T[1]]} cam={cam.position} intensity={4} side={0.5} />
        <Hero position={[SAHUR_T[0], TY, SAHUR_T[1]]} turn={Math.PI} pose="ready" swing={sw} expression="tung" lantern={{ glow: 1.4, swing: [0.7 * Math.sin((f - 2880) * 0.35) * Math.exp(-(f - 2880) / 26), 0.2] }}
          cracks={1.25} innerLight={0.004} />
        <group position={STRIKE}>
          <TungWave progress={p} radius={TUNG3_R} seed={31} />
        </group>
        <pointLight position={[STRIKE[0], TY + 0.6, STRIKE[2]]} color={PAL.real} intensity={30 * Math.exp(-(f - TUNG3) / 10)} distance={12} decay={2} />
      </>
    );
  },
  post: (f) => ({ ca: 0.001 + 0.004 * spike(f, 2880, 10), bloom: 1.0 + 0.7 * spike(f, 2880, 8), heat: { progress: invLerp(TUNG3, TUNG3 + TUNG3_DUR, f), center: STRIKE, radius: TUNG3_R } }),
  look: (f) => ({ ev: 0.6 * win(f, 2884, 2885, 2887, 2889) + 0.4 * spike(f, 2880, 4) }),
  shutter: 0.35,
};

// ======================= S42b The cost (2904-2928) =======================
// The POV stands at the table's side: he drops to one knee facing you, the face and upper log fully in frame,
// the new cracks (u 0.68 down his left, and the widened hairline) turned to the lens, leaking light, chips rising.
const KNEEL_TURN = 0.2;
const KNEEL_POS: V3 = [SAHUR_T[0], TY, SAHUR_T[1]];
const S42B: Shot = {
  id: 'S42b', a: 2904, b: 2928, biome: 'board',
  cam: (f) => ({ pos: [1.72 - 0.12 * seg(f, 2904, 2928), 1.18, -0.08], look: [0.0, 1.74, -1.48], fov: 46, handheld: 0.45 }),
  set: (f) => ({ shatter: (f - 2886) / 14, shatterOrigin: STRIKE, voidAmt: 1 }),
  Scene: ({ f, cam }) => {
    const drop = seg(f, 2904, 2911, outCubic);
    const cracks = 1.25 + 0.75 * seg(f, 2904, 2912);
    const pulse = spike(f, 2906, 12);
    const props = { position: KNEEL_POS, turn: KNEEL_TURN, pose: blend(POSES.ready, POSES.dropKnee, drop) };
    return (
      <>
        <YesMen f={f} cam={cam.position} crack={1} tip={1} />
        <HeroKey at={[KNEEL_POS[0], TY + 1.0, KNEEL_POS[2]]} cam={cam.position} intensity={3.2} back={1.1} up={0.4} side={-0.3} distance={3} />
        <Hero {...props} expression="strained" expressionB="sad" exprMix={0.35 * seg(f, 2914, 2926)}
          lantern={{ glow: 0.9, light: 1.5 }} cracks={cracks} innerLight={0.006 + 0.025 * pulse} chips={{ t: invLerp(2905, 2947, f), seed: 12, count: 9 }} />
        <CrackGlow props={props} cracks={cracks} boost={1.1 + 0.7 * pulse} frame={f} />
      </>
    );
  },
  post: (f) => ({ ca: 0.001 + 0.002 * spike(f, 2904, 6), bloom: 1.0 + 0.35 * spike(f, 2906, 12) }),
  shutter: 0.3,
};

// ======================= S43 Reach (2928-2940) =======================
const S43: Shot = {
  id: 'S43', a: 2928, b: 2940, biome: 'board',
  cam: (f) => {
    const k = seg(f, 2928, 2940, outCubic);
    return { pos: [1.6 - 0.16 * k, 1.18, -0.12 - 0.1 * k], look: [0.0, 1.7, -1.48], fov: 46, handheld: 0.45 };
  },
  set: (f) => ({ shatter: (f - 2886) / 14, shatterOrigin: STRIKE, voidAmt: 1 }),
  Scene: ({ f, cam, v, camLag }) => {
    const up = seg(f, 2931, 2938, outCubic);
    const props = { position: KNEEL_POS, turn: KNEEL_TURN, pose: blend(POSES.dropKnee, KNEE_HAND_UP, up) };
    return (
      <>
        <YesMen f={f} cam={cam.position} crack={1} tip={1} />
        <HeroKey at={[KNEEL_POS[0], TY + 1.0, KNEEL_POS[2]]} cam={cam.position} intensity={3.2} back={1.1} up={0.4} side={-0.3} distance={3} />
        <Hero {...props} expression="sad" expressionB="sadSmile" exprMix={up} lantern={{ glow: 0.9, light: 1.5 }} cracks={2} innerLight={0.006} chips={{ t: invLerp(2905, 2947, f), seed: 12, count: 9 }} />
        <CrackGlow props={props} cracks={2} boost={1.0} frame={f} />
        <PovHands cam={camLag} v={v} R={reachRight(0.85 * seg(f, 2928, 2940, outCubic), 0.03, -0.06)} />
      </>
    );
  },
  look: () => ({ sat: 0.88 }),
  shutter: 0.3,
};

/**
 * Ink the Valuation's voxels for the white void (coordinator note): dark #0c0f1a cores with cyan edges and a
 * glow, so the number reads against the pale nothing. The component re-applies its own uniforms each render;
 * this layout effect runs after it and overrides the voxel material (an InstancedMesh's toy shader) only.
 */
const INK = new THREE.Color('#0c0f1a');
const inkUniforms = (m: THREE.ShaderMaterial, amount: number) => {
  (m.uniforms.uColor.value as THREE.Color).lerp(INK, amount);
  (m.uniforms.uDeep.value as THREE.Color).lerp(new THREE.Color('#000000'), amount);
  (m.uniforms.uRim.value as THREE.Color).lerp(new THREE.Color(PAL.cyan).multiplyScalar(1.4), amount);
  m.uniforms.uRimStrength.value = lerp(m.uniforms.uRimStrength.value, 2.4, amount);
  m.uniforms.uRimPower.value = lerp(m.uniforms.uRimPower.value, 1.5, amount);
  m.uniforms.uGlow.value = lerp(m.uniforms.uGlow.value, 0.02, amount);
  m.uniforms.uSpec.value = lerp(m.uniforms.uSpec.value, 1.4, amount);
};
const Inked: React.FC<{ amount: number; children: React.ReactNode }> = ({ amount, children }) => {
  const ref = useRef<THREE.Group>(null);
  const amt = useRef(amount);
  amt.current = amount;
  // the override runs in the voxel mesh's onBeforeRender, i.e. after whatever its own render last applied
  // (the component can re-render alone, e.g. when its fonts load), right before the draw call
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (!im.isInstancedMesh) return;
      const m = im.material as THREE.ShaderMaterial;
      if (!m.uniforms || !m.uniforms.uColor || im.instanceMatrix.count < 200) return;
      im.onBeforeRender = () => { if (amt.current > 0) { inkUniforms(m, amt.current); m.uniformsNeedUpdate = true; } };
    });
  });
  return <group ref={ref}>{children}</group>;
};

// ======================= S44 THE VALUATION (2940-2976) =======================
const VAL: V3 = [0.3, 0, -18.5];
// 9:16: the number is ~5 units wide per scale unit; scale it to fit the narrow frame and shoot from the window
const valScale = (v: boolean) => (v ? 1.2 : 2.9);
const valX = (v: boolean) => (v ? 1.12 : VAL[0]); // 9:16: centred between two mullions
const junction = (v: boolean): V3 => [valX(v) + 1.42 * valScale(v), 2.13 * valScale(v), VAL[2] + 0.6];
const S44: Shot = {
  id: 'S44', a: 2940, b: 2976, biome: 'board',
  cam: (f, v) => (v
    ? { pos: [1.12, 0.9, -9.3 + 0.25 * seg(f, 2940, 2976)], look: [1.3, 3.55, -18.5], fov: 56, handheld: 0.7 }
    : { pos: [0.2, 1.05, -6.7 + 0.3 * seg(f, 2940, 2976)], look: [0.7, 4.9, -18.5], fov: 56, handheld: 0.7 }),
  set: (f) => ({ shatter: (f - 2886) / 14, shatterOrigin: STRIKE, voidAmt: 1, key: 0.8 }),
  Scene: ({ f, cam, v }) => {
    const JUNCTION = junction(v);
    const rise = seg(f, 2940, 2958, outCubic);
    // Sahur leaps off the table, out through the broken wall, and strikes the line at 2958
    const lt = invLerp(2946, 2958, f);
    const path = new THREE.CatmullRomCurve3([
      v ? new THREE.Vector3(1.0, 0, -10.3) : new THREE.Vector3(0.5, TY, -8.4),
      v ? new THREE.Vector3(1.4, 1.6, -12.0) : new THREE.Vector3(1.2, 1.55, -10.6),
      v ? new THREE.Vector3(2.0, 2.6, -14.6) : new THREE.Vector3(2.6, 3.3, -13.6),
      new THREE.Vector3(JUNCTION[0] - 0.5, JUNCTION[1] - 1.5, JUNCTION[2] + 1.0),
    ]);
    const pos = path.getPoint(clamp(lt * (2 - lt) * 0.6 + lt * 0.4));
    const after = invLerp(2958, 2976, f);
    pos.add(new THREE.Vector3(0.6 * after, -2.5 * after * after, 0.8 * after));
    const sw = f < 2954 ? 0.33 : f < 2958 ? lerp(0.35, 0.55, invLerp(2954, 2958, f)) : lerp(0.55, 0.9, outCubic(after));
    return (
      <>
        <group position={[valX(v), VAL[1], VAL[2]]}>
          <Inked amount={1}>
            <Valuation frame={f} seed={3} scale={valScale(v)} hover={lerp(-0.1, 1.15, rise)} lineSnap={invLerp(2958, 2966, f)} topple={(f - 2958) / 28.6} overextended={invLerp(2958, 2970, f)} hit={0} floor={false} />
          </Inked>
        </group>
        <pointLight position={[VAL[0], 6, VAL[2] + 4]} color={PAL.cyan} intensity={20 * rise} distance={30} decay={2} />
        {f >= 2946 && (
          <Hero position={[pos.x, pos.y, pos.z]} turn={Math.PI} pose={LEAP_COCK} swing={sw} swingMix={seg(f, 2950, 2954)} expression="fierce" lantern={{ glow: 1.6, light: 6 }} cracks={2} innerLight={0.004} />
        )}
        {f >= 2958 && <HitSpark progress={invLerp(2958, 2972, f)} position={JUNCTION} color="#bff6ff" size={4.5} rays={14} sparks={16} seed={11} />}
      </>
    );
  },
  post: (f) => ({ ca: 0.0004 + 0.003 * spike(f, 2958, 6), bloom: 0.45 + 0.4 * spike(f, 2958, 8), threshold: 1.2 }),
  look: (f) => ({ ev: 0.45 * seg(f, 2944, 2974) + 0.12 * spike(f, 2958, 4), contrast: 1.08 }),
  shutter: 0.4,
};

export const BOARD_SHOTS: Shot[] = [S39, S40, S41A, S41B, S42A, S42B, S43, S44];
