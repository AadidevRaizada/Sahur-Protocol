// KeyFrameCore: POV from the ground of THE CORE looking up. The Bubble fills the upper ~70% of the
// sky; hype rings orbit it; faint god-rays fall through it; a far, low horizon with layered haze;
// debris at three depths (near = large, defocused). The lower third is kept clear for Sahur's
// silhouette (the film builder adds him, about 1 m to the left of the eye).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PAL } from '../../lib/palette';
import { CameraRig, Post } from '../lib/scene';
import { GridFloor } from './common';
import { CoreSky } from './CoreSky';
import { AIBubble } from '../AIBubble';
import { Debris } from '../../fx/Debris';
import { Motes } from '../../fx/Motes';
import { GodRays } from '../../fx/GodRays';
import { Bokeh, BokehItem } from '../../fx/Bokeh';

export const CORE_BUBBLE = { center: [0, 74.6, -81.7] as [number, number, number], radius: 60 };
const HAZE = '#e8e4f7';

const RAY_ENDS: [number, number, number][] = [
  [-60, 0, -150],
  [-20, 0, -120],
  [25, 0, -110],
  [70, 0, -130],
  [120, 0, -170],
  [170, 0, -220],
  [-100, 0, -200],
];

const BOKEH: BokehItem[] = [
  { x: -0.86, y: 0.72, d: 1.6, size: 0.55, color: '#cfc7f0' },
  { x: 0.8, y: 0.8, d: 2.2, size: 0.72, color: '#f2cdea' },
  { x: 0.95, y: 0.08, d: 1.4, size: 0.46, color: '#cdeaf6' },
  { x: -0.98, y: 0.1, d: 2.0, size: 0.4, color: '#f2cdea' },
  { x: 0.72, y: -0.74, d: 1.5, size: 0.56, color: '#cfc7f0' },
  { x: 0.18, y: 0.95, d: 2.6, size: 0.3, color: '#cdeaf6' },
];

export const KeyFrameCore: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const eye: [number, number, number] = [0, 1.05 + 0.015 * Math.sin((f / 300) * Math.PI * 2), 0];
  // horizon sits ~12% above the bottom edge in both formats
  const pitch = vertical ? 0.62 : 0.524;
  const fov = vertical ? 86 : 70;
  const target: [number, number, number] = [0, eye[1] + Math.tan(pitch) * 10, -10];
  // the vertical cut is narrow: push the Bubble back so its face fits the width
  const k = vertical ? 1.3 : 1;
  const c: [number, number, number] = [CORE_BUBBLE.center[0] * k, eye[1] + (CORE_BUBBLE.center[1] - 1.05) * k, CORE_BUBBLE.center[2] * k];
  const down = Math.atan2(c[1] - eye[1], -c[2]);
  return (
    <AbsoluteFill style={{ background: PAL.core }}>
      <ThreeCanvas width={width} height={height} camera={{ fov, position: eye }}>
        <fog attach="fog" args={[HAZE, 30, 420]} />
        <CameraRig position={eye} target={target} fov={fov} roll={0.012} far={1500} />
        <CoreSky />
        <GridFloor base="#f3f1fc" line="#a99fe0" major={0.5} minor={0.1} fade={0.012} scale={2} size={1400} />
        <GodRays frame={f} source={[-170, 300, -330]} ends={RAY_ENDS} width={[14, 46]} intensity={0.6} />
        <group position={c}>
          <AIBubble frame={f + 40} radius={CORE_BUBBLE.radius} inflate={0.12} faceDir={[down, 0]} ringTilt={[down + 0.2, 0, 0.32]} ringScale={0.86} />
        </group>
        {/* far, mid and near debris */}
        <Debris frame={f} count={40} box={[160, 50, 90]} center={[0, 34, -95]} size={0.9} rise={0.25} seed={7} />
        <Debris frame={f} count={70} box={[40, 20, 36]} center={[0, 12, -22]} size={0.22} rise={0.12} />
        <Debris frame={f} count={24} box={[8, 5, 8]} center={[1.2, 3.6, -4.5]} size={0.06} rise={0.06} seed={4} />
        <Motes frame={f} count={300} box={[40, 24, 40]} center={[0, 10, -16]} vel={[0, 0.25, 0]} size={0.05} color="#bfb7ea" color2="#ffb3f2" opacity={0.6} additive={false} square />
        <Bokeh frame={f} eye={eye} pitch={pitch} vfov={fov} aspect={width / height} items={BOKEH} opacity={0.42} />
        <Post bloom={0.95} threshold={1.1} radius={0.65} vignette={0.2} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
