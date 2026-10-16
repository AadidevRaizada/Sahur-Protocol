// BubbleSheet: THE AI BUBBLE alone in THE CORE (white, silent, weightless).
// 0-80 idle with hype rings; 80-140 inflate (a small TUNG ripple is absorbed at ~95);
// 140-170 leak + seam + letters shedding; 170-240 pop.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PAL } from '../../lib/palette';
import { PIXEL, PRESS } from '../../lib/fonts';
import { CameraRig, Post } from '../lib/scene';
import { easeInOutCubic, easeOutBack, invLerp } from '../lib/math';
import { AIBubble, bubblePopFlash } from '../AIBubble';
import { Motes } from '../../fx/Motes';
import { GridFloor } from './common';

export const bubbleTimeline = (f: number) => {
  const inflate = 0.18 * easeOutBack(invLerp(95, 118, f), 2.2) * (f < 118 ? 1 : 1) + 0.82 * easeInOutCubic(invLerp(112, 140, f));
  const dent = invLerp(92, 116, f);
  const leak = invLerp(140, 170, f);
  const seam = invLerp(146, 166, f);
  const shed = invLerp(144, 176, f) * 0.55;
  const pop = invLerp(170, 240, f);
  return { inflate: Math.min(1, inflate), dent: dent > 0 && dent < 1 ? dent : 0, leak, seam, shed, pop };
};

const PHASES = [
  { name: 'IDLE', a: 0, b: 80 },
  { name: 'INFLATE', a: 80, b: 140 },
  { name: 'LEAK', a: 140, b: 170 },
  { name: 'POP', a: 170, b: 240 },
];

export const BubbleSheet: React.FC = () => {
  const f = useCurrentFrame();
  const s = bubbleTimeline(f);
  const flash = bubblePopFlash(s.pop);
  const camZ = 9.0 + 2.9 * easeInOutCubic(invLerp(80, 155, f));
  return (
    <AbsoluteFill style={{ background: PAL.core }}>
      <ThreeCanvas width={1920} height={1080} camera={{ fov: 35, position: [0, 0, 10] }}>
        <color attach="background" args={[PAL.core]} />
        <fog attach="fog" args={[PAL.core, 8, 30]} />
        <CameraRig position={[0, -0.3, camZ]} target={[0, 0.1, 0]} fov={35} />
        <group position={[0, -3.4, 0]}>
          <GridFloor base={PAL.core} line="#b9b2e6" major={0.35} minor={0.1} fade={0.05} />
        </group>
        <Motes frame={f} count={180} box={[16, 9, 10]} center={[0, 0, -2]} vel={[0, 0.12, 0]} size={0.045} color="#b8b0e8" color2="#ffb3f2" intensity={1} opacity={0.55} additive={false} square />
        <group position={[0, 0.2, 0]}>
          <AIBubble frame={f} radius={1.42} inflate={s.inflate} dent={s.dent} dentAmp={0.035} leak={s.leak} seam={s.seam} shed={s.shed} pop={s.pop} ringSpeed={1 + 1.5 * s.inflate} />
        </group>
        <Post bloom={0.85} threshold={1.12} radius={0.55} vignette={0.32} chroma={flash * 3} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: '#ffffff', opacity: flash * 0.5 }} />
      <div style={{ position: 'absolute', left: 48, top: 36, fontFamily: PRESS, fontSize: 18, color: '#3a2f7a', letterSpacing: 2 }}>
        THE AI BUBBLE <span style={{ color: '#9a93c4' }}>/ THE CORE</span>
      </div>
      <div style={{ position: 'absolute', right: 48, top: 36, fontFamily: PIXEL, fontSize: 18, color: '#9a93c4' }}>f {String(f).padStart(3, '0')}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', gap: 28 }}>
        {PHASES.map((p) => {
          const on = f >= p.a && f < p.b;
          return (
            <div key={p.name} style={{ fontFamily: PIXEL, fontSize: 20, letterSpacing: 2, color: on ? '#5b3fe0' : '#bdb7dd', borderBottom: on ? '2px solid #ff3df0' : '2px solid transparent', paddingBottom: 4 }}>
              {p.name}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
