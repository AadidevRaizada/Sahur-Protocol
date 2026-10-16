// TungWaveSheet: a TUNG on a dark Hype Cycle Forest floor (sloplings pop as the ring reaches them),
// and the big final-move TUNG on the white Core, rolling toward and up the Bubble.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PAL } from '../../lib/palette';
import { PIXEL, PRESS } from '../../lib/fonts';
import { CameraRig, Post } from '../lib/scene';
import { invLerp } from '../lib/math';
import { GridFloor } from './common';
import { Forest } from './biomes';
import { Motes } from '../../fx/Motes';
import { TungWave, tungRadius } from '../../fx/TungWave';
import { TungHeat } from '../../fx/TungHeat';
import { Slopling } from '../Slopling';
import { AIBubble } from '../AIBubble';

const H = 1080;
const SLOPS: [number, number][] = [
  [2.4, 1.2],
  [-3.1, 0.6],
  [1.2, -3.4],
  [-1.8, -2.6],
  [4.4, -1.6],
];

export const TungWaveSheet: React.FC = () => {
  const f = useCurrentFrame();
  const p = invLerp(4, 64, f);
  const maxR = 7;
  const R = tungRadius(p, maxR);
  const bigR = 90;
  const pb = invLerp(4, 74, f);
  const Rb = tungRadius(pb, bigR);
  const bubbleZ = -70;
  const bubbleRad = 30;
  // the ring reaches the bubble's base and climbs it
  const dent = invLerp(Math.abs(bubbleZ) - bubbleRad * 0.25, Math.abs(bubbleZ) + bubbleRad * 0.35, Rb);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 960, height: H, background: PAL.forestBg }}>
        <ThreeCanvas width={960} height={H} camera={{ fov: 46, position: [0, 4, 10] }}>
          <color attach="background" args={[PAL.forestBg]} />
          <fog attach="fog" args={[PAL.forestBg, 10, 26]} />
          <CameraRig position={[0, 3.6, 9.6]} target={[0, 0.2, -0.8]} fov={46} />
          <GridFloor base={PAL.forestBg} line={PAL.forestAccent} major={0.12} minor={0.03} fade={0.1} />
          <Forest f={f} />
          <Motes frame={f} count={100} box={[10, 4, 10]} center={[0, 2, -1]} vel={[0.04, 0.15, 0]} size={0.03} color={PAL.forestAccent} intensity={1.4} square />
          {SLOPS.map(([x, z], i) => {
            const d = Math.hypot(x, z);
            const hitAt = d <= R ? 1 : 0;
            // death starts when the ring front reaches it
            const pReach = 1 - Math.cbrt(1 - Math.min(0.999, d / maxR));
            const death = hitAt ? invLerp(4 + pReach * 60, 4 + pReach * 60 + 40, f) : 0;
            return (
              <group key={i} position={[x, 0, z]} rotation={[0, -Math.atan2(x, z) * 0.3, 0]}>
                <Slopling frame={f} seed={i + 2} death={death} scale={0.9} />
              </group>
            );
          })}
          <TungWave progress={p} seed={3} />
          <Post bloom={1.0} threshold={0.9} radius={0.6} vignette={0.55}>
            <TungHeat progress={p} />
          </Post>
        </ThreeCanvas>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center', fontFamily: PRESS, fontSize: 22, color: PAL.real, textShadow: `0 0 16px ${PAL.real}aa` }}>TUNG</div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, textAlign: 'center', fontFamily: PIXEL, fontSize: 16, color: PAL.forestAccent, opacity: 0.8 }}>hype cycle forest · radius {R.toFixed(1)} m</div>
      </div>
      <div style={{ position: 'absolute', left: 960, top: 0, width: 960, height: H, background: PAL.core }}>
        <ThreeCanvas width={960} height={H} camera={{ fov: 58, position: [0, 30, 95] }}>
          <color attach="background" args={[PAL.core]} />
          <fog attach="fog" args={[PAL.core, 80, 260]} />
          <CameraRig position={[0, 34, 98]} target={[0, 14, -25]} fov={58} far={800} />
          <GridFloor base={PAL.core} line="#b9b2e6" major={0.3} minor={0.06} fade={0.02} scale={4} />
          <group position={[0, bubbleRad + 4, bubbleZ]}>
            <AIBubble frame={f} radius={bubbleRad} dent={dent > 0 && dent < 1 ? dent : 0} dentAmp={0.06} inflate={0.3} faceDir={[0.2, 0]} />
          </group>
          <TungWave progress={pb} big radius={bigR} seed={5} />
          <Post bloom={0.9} threshold={1.0} radius={0.6} vignette={0.3}>
            <TungHeat progress={pb} big radius={bigR} />
          </Post>
        </ThreeCanvas>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center', fontFamily: PRESS, fontSize: 22, color: '#c27a12' }}>THE FINAL TUNG</div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, textAlign: 'center', fontFamily: PIXEL, fontSize: 16, color: '#9a93c4' }}>the core · radius {Rb.toFixed(0)} m</div>
      </div>
      <div style={{ position: 'absolute', left: 959, top: 0, width: 2, height: H, background: '#000' }} />
    </AbsoluteFill>
  );
};
