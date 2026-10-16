// Dev composition: views of the bedroom set in each mood (frame selects the view).
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Bedroom, BedroomProps, MARKS, SAHUR_ROOM_SCALE } from '../../sets/Bedroom';
import { Sahur } from '../Sahur';
import { StaticCamera } from '../../pov/PovCamera';
import { Post } from '../../pov/Post';

type V3 = [number, number, number];
const VIEWS: { cam: V3; tgt: V3; fov: number; b: BedroomProps; debug?: number; sahur?: boolean }[] = [
  { cam: MARKS.E1, tgt: MARKS.door, fov: 50, b: { mood: 'blue', doorOpen: 1, siren: 0 }, debug: 1 },
  { cam: MARKS.E1, tgt: MARKS.door, fov: 50, b: { mood: 'blue', doorOpen: 1, siren: 0 } },
  { cam: [-0.2, 2.5, 0.3], tgt: [-0.25, 0, 0.29], fov: 95, b: { mood: 'morning' } },
  { cam: MARKS.E1, tgt: MARKS.window, fov: 42, b: { mood: 'blue' } },
  { cam: MARKS.E1, tgt: MARKS.door, fov: 50, b: { mood: 'morning' } },
  { cam: MARKS.E1, tgt: MARKS.door, fov: 50, b: { mood: 'night' } },
  { cam: MARKS.E1, tgt: [0.2, 1.3, -0.6], fov: 50, b: { mood: 'blue', doorOpen: 1, siren: 1, sirenPhase: 589, floorFog: 1 }, sahur: true },
  { cam: [1.5, 2.3, 1.9], tgt: [-0.6, 0.6, -0.6], fov: 70, b: { mood: 'morning' } },
];

export const BedroomLab: React.FC = () => {
  const f = useCurrentFrame();
  const v = VIEWS[f % VIEWS.length];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <ThreeCanvas width={1920} height={1080} shadows="soft" camera={{ fov: 50, position: [0, 1, 0] }}>
        <StaticCamera position={v.cam} target={v.tgt} fov={v.fov} near={0.02} far={150} />
        <Bedroom {...v.b} time={600 + f} />
        {v.debug && <ambientLight intensity={v.debug} />}
        {v.sahur && <Sahur pose="batShoulder" scale={SAHUR_ROOM_SCALE} position={[-0.2, 0, 0.2]} turn={-0.74} expression="weary" />}
        <Post bloom={1.0} bloomThreshold={0.6} vignette={0.4} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
