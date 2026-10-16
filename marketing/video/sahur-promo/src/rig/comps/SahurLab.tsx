// Dev composition: each frame is a different look at Sahur (for fast QA iteration).
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps } from '../Sahur';
import { Cyclorama, StudioLights } from '../../sets/Studio';
import { StaticCamera } from '../../pov/PovCamera';
import { Post } from '../../pov/Post';

type Shot = { cam: [number, number, number]; tgt: [number, number, number]; fov: number; s: SahurProps; seat?: boolean };
const F: [number, number, number] = [2.6, 2.3, 6.2];
const SHOTS: Shot[] = [
  { cam: [0.6, 2.3, 4.2], tgt: [0, 2.1, 0], fov: 32, s: { pose: 'batShoulder', expression: 'strained', cracks: 1, turn: 0.1 } },
  { cam: F, tgt: [0, 1.6, 0], fov: 32, s: { pose: 'batShoulder', expression: 'strained', cracks: 2, turn: 0.25, chips: { t: 0.35 } } },
  { cam: F, tgt: [0, 1.6, 0], fov: 32, s: { pose: 'batOverhead', expression: 'fierce', cracks: 3, innerLight: 0.4, turn: 0.25 } },
  { cam: F, tgt: [0, 1.5, 0], fov: 32, s: { pose: 'batShoulder', run: 0.25, expression: 'determined', turn: 0.6 } },
  { cam: F, tgt: [0, 1.7, 0], fov: 32, s: { pose: 'leap', expression: 'fierce', position: [0, 0.4, 0], turn: 0.6 } },
  { cam: F, tgt: [0, 1.3, 0], fov: 32, s: { pose: 'land', expression: 'fierce', turn: 0.6 } },
  { cam: F, tgt: [0, 1.3, 0], fov: 32, s: { pose: 'stumble', expression: 'strained', turn: 0.8 } },
  { cam: F, tgt: [0, 1.2, 0], fov: 32, s: { pose: 'dropKnee', expression: 'sad', cracks: 2, turn: 0.8 } },
  { cam: F, tgt: [0, 1.4, 0], fov: 32, s: { pose: 'tapStump', expression: 'calm', turn: 0.8 } },
  { cam: F, tgt: [0, 1.6, 0], fov: 32, s: { pose: 'knuckleTap', expression: 'calm', turn: 0.3 } },
  { cam: [0.8, 2.5, 6.5], tgt: [0, 1.8, 0], fov: 30, s: { pose: 'headTap', expression: 'earnest', turn: -0.2 } },
  { cam: F, tgt: [0, 1.3, 0], fov: 32, s: { pose: 'sitBench', expression: 'calm', turn: 0.4 }, seat: true },
];



export const SahurLab: React.FC = () => {
  const f = useCurrentFrame();
  const shot = SHOTS[f % SHOTS.length];
  return (
    <AbsoluteFill style={{ background: '#4d5a73' }}>
      <ThreeCanvas width={1920} height={1080} shadows="soft" gl={{ antialias: true }} camera={{ fov: 30, position: [0, 2, 7] }}>
        <StaticCamera position={shot.cam} target={shot.tgt} fov={shot.fov} />
        <color attach="background" args={['#56637d']} />
        <Cyclorama />
        <StudioLights target={[0, 1.6, 0]} spread={4} />
        <Sahur {...shot.s} />
        {shot.seat && (
          <mesh position={[0, shot.s.pose === 'sitBench' ? 0.5 : 0.2, -0.12]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.22, 1.6, 24]} />
            <meshStandardMaterial color="#6b4a2e" roughness={0.9} />
          </mesh>
        )}
        <Post bloom={0.4} bloomThreshold={0.9} vignette={0.35} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
