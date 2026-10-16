// The opening shot (storyboard S01-S02, condensed to 90 f): POV lying in bed at night, cream mittens
// holding the phone, the Sahur reel on screen, the screen light on the mittens, eyelids getting heavy.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { BlobHands, PHONE_ANCHOR, HANDS_POSES } from '../BlobHands';
import { Bedroom, MARKS } from '../../sets/Bedroom';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { Eyelids, Grain, Grade, Vignette } from '../../pov/Overlays';
import { keys, smooth, invLerp, lerp } from '../util';
import { vMatch } from './DoorwayScene';

export const KeyFramePhone: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const fov = vertical ? vMatch(40) : 40;
  const cam = povCamera(f, fps, { position: MARKS.E0, target: MARKS.phoneHeld, fov, breath: 'calm', handheld: 0.35, seed: 5 });
  const camLag = povCamera(f - 4, fps, { position: MARKS.E0, target: MARKS.phoneHeld, fov, breath: 'calm', handheld: 0.35, seed: 5 });
  // heavy: the phone drifts down 4 cm and tilts back 8 degrees over the shot
  const heavy = smooth(invLerp(20, 90, f));
  const phone = { p: [PHONE_ANCHOR.p[0], PHONE_ANCHOR.p[1] - 0.04 * heavy, PHONE_ANCHOR.p[2]] as [number, number, number], r: [PHONE_ANCHOR.r[0] - 0.14 * heavy, 0, 0] as [number, number, number] };
  const dy = -0.04 * heavy;
  // lids: 0.92, blink 1 (close fast, open slower), sink, blink 2 opens less
  const lids = keys(f, [
    { t: 0, v: 0.92 }, { t: 34, v: 0.92 }, { t: 40, v: 0 }, { t: 44, v: 0 }, { t: 56, v: 0.8 }, { t: 62, v: 0.74 },
    { t: 68, v: 0 }, { t: 76, v: 0 }, { t: 88, v: 0.5 }, { t: 90, v: 0.5 },
  ]);
  return (
    <AbsoluteFill style={{ background: '#020204' }}>
      <AbsoluteFill style={{ filter: 'saturate(0.9) contrast(1.05)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov, position: MARKS.E0 }}>
          <ApplyCamera cam={cam} near={0.02} far={150} />
          <color attach="background" args={['#020204']} />
          <Bedroom mood="night" time={f} doorOpen={0} dust={0.6} />
          <group position={camLag.position} quaternion={camLag.quaternion}>
            <BlobHands pose={{ R: { ...HANDS_POSES.holdPhone.R, p: [HANDS_POSES.holdPhone.R.p[0], HANDS_POSES.holdPhone.R.p[1] + dy, HANDS_POSES.holdPhone.R.p[2]] }, L: { ...HANDS_POSES.holdPhone.L, p: [HANDS_POSES.holdPhone.L.p[0], HANDS_POSES.holdPhone.L.p[1] + dy, HANDS_POSES.holdPhone.L.p[2]] }, phone }}
              phoneProps={{ reel: { heartPulseAt: 60 }, glow: 1 }} />
          </group>
          <Post focus={0.39} focusRange={0.12} bokeh={2} bloom={0.6} bloomThreshold={0.8} vignette={0.45} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#08070a" liftAmt={0.08} gain="#fff4e6" gainAmt={0.5} />
      <Vignette darkness={0.45} offset={0.4} />
      <Grain amount={0.05} seed={7} />
      <Eyelids open={lids} />
    </AbsoluteFill>
  );
};
