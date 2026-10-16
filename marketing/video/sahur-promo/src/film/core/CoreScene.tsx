// The Core: one continuous POV take. White plane, white fog, rising motes, the Bubble filling the sky,
// Sahur beside you (the only warm, dark thing), your mittens, three TUNGs and the pop.
import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, sahurPoint, SahurProps } from '../../rig/Sahur';
import { ApplyCamera } from '../../pov/PovCamera';
import type { CamState } from '../../pov/camera';
import { PAL } from '../../lib/palette';
import { AIBubble } from '../../enemies/AIBubble';
import { HypeRings } from '../../enemies/bubble/HypeRings';
import { GridFloor } from '../../enemies/sheets/common';
import { CoreSky } from '../../enemies/sheets/CoreSky';
import { FloorGlow, GlowSprite } from '../../enemies/lib/scene';
import { TungWave } from '../../fx/TungWave';
import { TungHeat } from '../../fx/TungHeat';
import { HitSpark } from '../../fx/HitSpark';
import { Shards } from '../../fx/Shards';
import { Debris } from '../../fx/Debris';
import { Motes } from '../../fx/Motes';
import { GodRays } from '../../fx/GodRays';
import { CorePost } from './CorePost';
import { feedReflection } from './feedReflection';
import { BUBBLE_R, BubbleState, K, SAHUR_SCALE, SahurState, seg, strikePoint } from './plan';
import { invLerp as invLerpF } from '../../rig/util';

const HAZE = '#e8e4f7';
const RAY_ENDS: [number, number, number][] = [
  [-60, 0, -150], [-20, 0, -120], [25, 0, -110], [70, 0, -130], [120, 0, -170], [170, 0, -220], [-100, 0, -200],
];
const WOOD = PAL.woodMid;

export type CoreSceneProps = {
  f: number;
  width: number;
  height: number;
  cam: CamState;
  camLag: CamState;
  hk: number;
  halfW: number;
  sahur: SahurState;
  sahurLag: SahurState;
  bubble: BubbleState;
  bloom: number;
  amberKey: number;
  chroma: number;
};

export const sahurProps = (s: SahurState, f: number): SahurProps => ({
  position: s.position,
  turn: s.turn,
  scale: SAHUR_SCALE,
  pose: s.pose,
  lean: s.lean,
  expression: s.expression as SahurProps['expression'],
  look: s.look,
  blink: s.blink,
  bat: true,
  castShadow: false,
  seed: 45,
  cracks: s.cracks,
  innerLight: s.innerLight,
  breathe: f / 60 * 0.3,
});

export const CoreScene: React.FC<CoreSceneProps> = ({ f, width, height, cam, camLag, hk, halfW, sahur, bubble, bloom, amberKey, chroma }) => {
  const sp = sahurProps(sahur, f);
  const chest = sahurPoint(sp, 'chest', [0, 0, -0.1]);
  const hit = strikePoint(sahur);
  // the TUNGs
  const small = invLerpF(K.smallTung, K.smallTung + 32, f);
  const t1 = invLerpF(K.tung1, K.tung1 + 40, f);
  const t2 = invLerpF(K.tung2, K.tung2 + 36, f);
  const t3 = invLerpF(K.pop, K.pop + 24, f);
  const bubbleCenter = bubble.center;
  // world light: white sky, a soft iridescent back light from the Bubble, his amber from inside
  const inner = sahur.innerLight;
  const amberI = 6 * inner + 22 * amberKey;
  // DOF: on Sahur through S48 (his hand on your shoulder is a soft blur), on him again for the final wind-up
  const toSahur = cam.position.distanceTo(sahurPoint(sp, 'faceCenter'));
  // (the near phrase ring in S46 is thrown out of focus so it reads as texture, not a title)
  // through the strikes: focus on him, so the ear-covering mittens at the edges are soft round blurs
  const dof = f >= 3336 && f < 3456 ? toSahur : f >= 3074 && f < 3110 ? 30 : f >= 3462 ? toSahur : undefined;
  const sweepOn = seg(f, 3074, 3082) * (1 - seg(f, 3100, 3110));
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 50, position: [0, 1.05, 0] }} gl={{ antialias: true }}>
      <ApplyCamera cam={cam} near={0.03} far={1500} />
      <fog attach="fog" args={[HAZE, 30, 420]} />
      <CoreSky />
      <GridFloor base="#f3f1fc" line="#a99fe0" major={0.5} minor={0.1} fade={0.012} scale={2} size={1400} />
      <GodRays frame={f} source={[-170, 300, -330]} ends={RAY_ENDS} width={[14, 46]} intensity={0.45 * (1 - 0.6 * amberKey)} />

      {/* lights for Sahur and the mittens (the Bubble, the sky and the FX are self-lit) */}
      <hemisphereLight args={['#f4f2ff', '#bdb5e0', 0.42 - 0.2 * amberKey]} />
      <directionalLight position={[bubbleCenter[0] * 0.3, 40, bubbleCenter[2] * 0.3]} color="#f3e9ff" intensity={2.4 - 1.2 * amberKey} />
      <pointLight position={[chest.x - 0.9, chest.y + 0.8, chest.z - 1.2]} color="#ffc4f2" intensity={3.2} distance={3.5} decay={2} />
      <pointLight position={[chest.x + 0.9, chest.y + 0.3, chest.z - 1.0]} color="#bff0ff" intensity={2.6} distance={3.5} decay={2} />
      <pointLight position={[chest.x, chest.y + 0.1, chest.z]} color={PAL.real} intensity={amberI} distance={6 + 30 * amberKey} decay={2} />
      <group position={cam.position} quaternion={cam.quaternion}>
        <pointLight position={[-0.35, 0.32, 0.05]} color="#ffe9cc" intensity={0.4} distance={1.2} decay={2} />
      </group>

      {/* the Bubble */}
      <group position={bubbleCenter}>
        <AIBubble
          frame={f}
          radius={BUBBLE_R}
          inflate={bubble.inflate}
          dent={bubble.dent}
          dentAmp={bubble.dentAmp}
          leak={bubble.leak}
          seam={bubble.seam}
          shed={bubble.shed}
          pop={bubble.pop}
          smile={bubble.smile}
          smileFlat={bubble.smileFlat}
          eyeDrift={bubble.eyeDrift}
          faceWarp={bubble.faceWarp}
          gaze={bubble.gaze}
          faceDir={[bubble.elevation, 0]}
          ringTilt={[bubble.elevation - 0.38, 0, 0.25]}
          ringScale={0.92}
          ringLetterScale={0.62}
          ringsInward
          ringNearFade={34}
          ringSpeed={bubble.ringSpeed}
          reflectionMap={bubble.reflectionAmt > 0 ? feedReflection() : null}
          reflectionAmt={bubble.reflectionAmt}
        />
      </group>

      {/* S46: a phrase ring sweeps low past you (your swat goes straight through it) */}
      {sweepOn > 0.001 && (
        <group position={[0.95, 1.3, -2.45]} rotation={[0.05, 0, 0.06]}>
          <HypeRings frame={f} scale={1.4} count={1} speed={5.5} opacity={0.42 * sweepOn} tilt={[-0.2, 0, 0]} />
        </group>
      )}

      {/* atmosphere: far, mid and near debris, rising motes */}
      <Debris frame={f} count={40} box={[160, 50, 90]} center={[0, 34, -95]} size={0.9} rise={0.25} seed={7} />
      <Debris frame={f} count={60} box={[40, 20, 36]} center={[0, 12, -22]} size={0.22} rise={0.12} />
      <Debris frame={f} count={20} box={[8, 5, 8]} center={[0.6, 3.2, -4.0]} size={0.055} rise={0.06} seed={4} />
      <Motes frame={f} count={300} box={[40, 24, 40]} center={[0, 10, -16]} vel={[0, 0.25, 0]} size={0.05} color="#bfb7ea" color2="#ffb3f2" opacity={0.6} additive={false} square />

      {/* Sahur: the only warm, dark thing in the world */}
      <Sahur {...sp} />
      <group position={[sahur.position[0], 0, sahur.position[2]]}>
        <FloorGlow color={PAL.real} radius={0.9 + 2.5 * amberKey} intensity={0.25 * inner + 0.9 * amberKey} shadow={0.55} />
      </group>
      {inner > 0.02 && <GlowSprite color={PAL.real} size={0.8 + 2.6 * amberKey + 1.1 * inner} intensity={0.5 * inner + 1.1 * amberKey} position={[chest.x, chest.y, chest.z]} renderOrder={4} />}
      {/* chips and chunks of him: one falls after the small TUNG, six blow off at TUNG 1, big pieces fall away before the last */}
      {f >= 3138 && f < 3200 && <Shards progress={invLerpF(3138, 3200, f)} color={WOOD} count={3} seed={31} origin={[chest.x, chest.y + 0.25, chest.z]} radius={0.12} power={0.35} size={0.8} glow={0.05} gravity={6} />}
      {f >= 3500 && f < 3560 && <Shards progress={invLerpF(3500, 3560, f)} color={WOOD} count={8} seed={32} origin={[chest.x, chest.y + 0.1, chest.z + 0.2]} radius={0.2} power={1.6} size={1.6} glow={0.15} gravity={4} />}
      {f >= 3598 && f < 3660 && <Shards progress={invLerpF(3598, 3660, f)} color={WOOD} count={12} seed={33} origin={[chest.x, chest.y + 0.2, chest.z]} radius={0.35} power={0.5} size={2.6} glow={0.35} gravity={5} />}

      {/* TUNGs */}
      {small > 0 && small < 1 && <group position={hit}><TungWave progress={small} radius={4} seed={11} /></group>}
      {t1 > 0 && t1 < 1 && <group position={hit}><TungWave progress={t1} big radius={80} seed={12} flash={0.14} /></group>}
      {t2 > 0 && t2 < 1 && <group position={hit}><TungWave progress={t2} big radius={90} seed={13} flash={0.16} /></group>}
      {t3 > 0 && t3 < 1 && <group position={hit}><TungWave progress={t3} big radius={90} seed={14} flash={0.2} /></group>}
      {[K.smallTung, K.tung1, K.tung2, K.pop].map((k, i) =>
        f >= k && f < k + 14 ? (
          <HitSpark key={k} progress={invLerpF(k, k + 14, f)} color={PAL.real} size={i === 0 ? 0.7 : 1.6} position={[hit[0], 0.15, hit[2]]} seed={i + 2} />
        ) : null,
      )}

      {/* your mittens are drawn as a soft, out-of-focus DOM layer over this canvas (PovMittens) */}

      <CorePost bloom={bloom} threshold={1.08} radius={0.62} chroma={chroma} vignette={0.2} focus={dof} focusRange={0.35} bokeh={4}>
        {small > 0 && small < 1 ? <TungHeat progress={small} center={hit} radius={4} /> : null}
        {t1 > 0 && t1 < 1 ? <TungHeat progress={t1} center={hit} big radius={80} /> : null}
        {t2 > 0 && t2 < 1 ? <TungHeat progress={t2} center={hit} big radius={90} /> : null}
      </CorePost>
    </ThreeCanvas>
  );
};

