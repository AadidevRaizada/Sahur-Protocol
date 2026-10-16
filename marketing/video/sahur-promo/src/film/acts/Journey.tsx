// ACT "journey" (global 1410-2400, beats 5-6, shots S15-S26). Owner: journey builder.
// The 90 BPM bonding montage (S15-S21: 3D moments cut with painted memories on the 40 f beat) and the
// fire (S22-S26). Shot code: src/film/journey/shots/*. Memory panels: src/film/journey/MemoryPanel.tsx.
// Only the 3D shot on screen is mounted; a second one only under a memory dissolve.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFilmFrame } from '../context';
import { ShotWalk } from '../journey/shots/Walk';
import { ShotStump } from '../journey/shots/Stump';
import { ShotBench } from '../journey/shots/Bench';
import { ShotGlow } from '../journey/shots/Glow';
import { ShotFire } from '../journey/shots/Fire';
import { MemoryPanel } from '../journey/MemoryPanel';
import { LightLeak } from '../../pov/Overlays';
import { useVideoConfig } from 'remotion';
import { PAL } from '../../lib/palette';

/** a 6-8 f amber leak flash centred on a cut frame */
const leakFlash = (f: number, at: number, a = 3, d = 5, peak = 0.55) => {
  if (f < at - a || f > at + d) return 0;
  return peak * (f <= at ? (f - (at - a)) / a : 1 - (f - at) / d);
};

export const JourneyAct: React.FC = () => {
  const f = useFilmFrame();
  // the 3D layer (memory dissolves overlap the neighbouring 3D shot)
  let shot: React.ReactNode = null;
  if (f < 1498) shot = <ShotWalk f={f} />;
  else if (f >= 1544 && f < 1678) shot = <ShotStump f={f} />;
  else if (f >= 1724 && f < 1814) shot = <ShotBench f={f} />;
  else if (f >= 1850 && f < 1890) shot = <ShotGlow f={f} />;
  else if (f >= 1890) shot = <ShotFire f={f} />;
  const { width: W, height: H } = useVideoConfig();
  // the amber leak flashes that carry each montage cut: a burn of light from one edge, peaking on the cut
  const leaks: [number, number, number][] = [
    [leakFlash(f, 1490, 3, 5, 0.7), 1.0, 0.45], [leakFlash(f, 1550, 2, 6, 0.6), 0.0, 0.55], [leakFlash(f, 1670, 3, 5, 0.7), 0.0, 0.4],
    [leakFlash(f, 1730, 2, 6, 0.6), 1.0, 0.5], [leakFlash(f, 1810, 1, 3, 0.4), 0.5, 0.0],
  ];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {shot}
      {/* S16: memory, the coolant river; the push slides the kid out to the left */}
      <MemoryPanel f={f} src="art/bg_river.jpg" start={1490} end={1550} fadeIn={8} fadeOut={6}
        kb={{ s: [1.3, 1.56], x: [0.62, 0.73], y: [0.5, 0.47], vx: [0.52, 0.56] }} leak="right" leakAmt={0.5} seed={16} />
      {/* S18: memory, dawn; a sun flare, the leak from the left */}
      <MemoryPanel f={f} src="art/bg_dawn.jpg" start={1670} end={1730} fadeIn={8} fadeOut={6}
        kb={{ s: [1.05, 1.16], x: [0.52, 0.57], y: [0.46, 0.43], vx: [0.43, 0.45] }} leak="left" leakAmt={0.45}
        flare={{ x: 0.62, y: 0.42, amt: 0.35 + 0.05 * Math.sin((f - 1670) * 0.2) }} seed={18} />
      {/* S20: memory, the boardroom: a cold flash, one glitch tear, a hard cut out */}
      <MemoryPanel f={f} src="art/bg_boardroom.jpg" start={1810} end={1850} fadeIn={4} fadeOut={0}
        kb={{ s: [1.1, 1.2], x: [0.5, 0.5], y: [0.32, 0.22], vx: [0.5, 0.5] }} tint={PAL.cyan} tintAmt={0.15} leak={null}
        tears={[[1834, 2, 12]]} filter="saturate(0.85)" seed={20} />
      {leaks.map(([a, x, y], i) => (a > 0 ? <LightLeak key={i} x={x * W} y={y * H} radius={W * 0.75} opacity={a} inner={PAL.real} outer="rgba(255,138,42,0.55)" /> : null))}
    </AbsoluteFill>
  );
};
