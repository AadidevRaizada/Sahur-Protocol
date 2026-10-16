// S01-S03 (0-330): the reel. POV lying on the pillow (E0), cream mittens holding the phone, the reel
// looping (knocks at 12/24/36 of every 72 f), heavy blinks, then the phone slips onto your chest.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { BlobHands, HANDS_POSES, HandXf } from '../../rig/BlobHands';
import { Phone, PHONE_H } from '../../rig/Phone';
import { Bedroom, MARKS } from '../../sets/Bedroom';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera, PovCamProps } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { Eyelids, Grain, Grade, Vignette } from '../../pov/Overlays';
import { vMatchFov } from '../context';
import { clamp, lerp } from '../../rig/util';
import { D, V3, seg, track, inQuad, outCubic, inOutSine } from './common';

// a softer angle than straight up: lying back, the phone held over your chest, looking slightly down your
// body so the screen-lit blanket and your mittens frame it (the phone fills ~48% of the frame height)
const LOOK: V3 = [-1.2, 0.87, 0.6];
const camProps = (f: number, vertical: boolean): PovCamProps => ({
  position: MARKS.E0, target: LOOK, fov: vertical ? vMatchFov(40) : 40, breath: 'calm', handheld: 0.3, seed: 5,
});
const PH: V3 = [0, -0.01, -0.4]; // phone centre in camera space

/** lids for S01-S03: 0.92, two heavy blinks that each open less, the sink, then shut (296-330 black) */
export const phoneLids = (f: number) => track(f, [
  { t: 0, v: 0.92 }, { t: 140, v: 0.92 }, { t: 146, v: 0, e: inQuad }, { t: 150, v: 0 }, { t: 162, v: 0.8, e: outCubic },
  { t: 196, v: 0.8 }, { t: 204, v: 0, e: inQuad }, { t: 216, v: 0 }, { t: 232, v: 0.62, e: outCubic },
  { t: 246, v: 0.62 }, { t: 270, v: 0.18 }, { t: 283, v: 0.18 }, { t: 296, v: 0, e: inQuad },
]);

const mirrorX = (h: HandXf): HandXf => ({ ...h, p: [-h.p[0], h.p[1], h.p[2]], dir: [-h.dir[0], h.dir[1], h.dir[2]], palm: [-h.palm[0], h.palm[1], h.palm[2]] });

export const PhoneShot: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const cam = povCamera(f, fps, camProps(f, vertical));
  const camLag = povCamera(f - 4, fps, camProps(f - 4, vertical));
  // S02: the phone drifts down 4 cm and tilts back 8 degrees; S03: it tips forward about its bottom edge and drops out
  const heavy = seg(f, 132, 246, inOutSine);
  const tip = seg(f, 262, 280, inQuad);
  const drop = seg(f, 262, 284, inQuad);
  const relax = seg(f, 262, 280);
  const out = seg(f, 266, 286, inQuad);
  // mittens hold the phone's lower half from the sides; the arms hang down out of frame (no V toward the lens)
  const R0: HandXf = { p: [0.071, -0.06, -0.428], dir: [-0.14, 0.8, -0.58], palm: [-1, 0, 0.1], curl: 0.28 };
  const twitch = Math.max(0, Math.sin(clamp((f - 70) / 14) * Math.PI)) * 0.006;
  const dy = -0.04 * heavy - 0.25 * out;
  const R: HandXf = { ...R0, p: [R0.p[0], R0.p[1] + dy + twitch, R0.p[2]], curl: lerp(R0.curl, 0.08, relax) };
  const L: HandXf = mirrorX({ ...R0, p: [R0.p[0], R0.p[1] + dy - 0.01 * relax, R0.p[2]], curl: lerp(R0.curl, 0.08, relax) });
  const screen = 1 - seg(f, 280, 283, (t) => t);
  const pivot: V3 = [0, PH[1] - PHONE_H / 2 - 0.04 * heavy - 0.22 * drop, PH[2]];
  const lids = phoneLids(f);
  const fadeIn = 1 - seg(f, 0, 12, outCubic);
  const blur = f >= 232 ? 2 : 0;
  return (
    <AbsoluteFill style={{ background: '#020204' }}>
      <AbsoluteFill style={{ filter: `saturate(0.9) contrast(1.05) blur(${blur * (height / 1080)}px)` }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 40, position: MARKS.E0 }}>
          <ApplyCamera cam={cam} near={0.02} far={150} />
          <color attach="background" args={['#020204']} />
          <Bedroom mood="night" time={f} doorOpen={0} dust={0.6} />
          <group position={camLag.position} quaternion={camLag.quaternion}>
            {out < 0.99 && <BlobHands pose={{ R, L }} phone={false} />}
            {/* the phone pivots about its bottom edge when it slips */}
            {/* warm cream bounce off the blanket onto the mittens (their base colour), under the cool screen light */}
            {screen > 0.01 && <pointLight position={[0, -0.13, -0.33]} color="#ffd2a8" intensity={0.1 * screen} distance={0.7} decay={2} />}
            {/* the screen's glow halo: spills onto the blanket folds around and behind the phone */}
            {screen > 0.01 && <pointLight position={[0, -0.02, -0.5]} color="#bcd0ff" intensity={0.3 * screen} distance={2.4} decay={2} />}
            <group position={pivot} rotation={[(0.06 - 0.14 * heavy) - (100 * D) * tip, 0, 0]}>
              <group position={[0, PHONE_H / 2, 0]}>
                <Phone screenOn={screen} glow={screen} reel={{ heartPulseAt: 100 }} />
              </group>
            </group>
          </group>
          <Post focus={0.4} focusRange={0.14} bokeh={2} bloom={0.6} bloomThreshold={0.8} vignette={0.4} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#08070a" liftAmt={0.08} gain="#fff4e6" gainAmt={0.5} />
      <Vignette darkness={0.45} offset={0.4} />
      <Grain amount={0.05} seed={7} />
      <Eyelids open={lids} />
      {fadeIn > 0 && <AbsoluteFill style={{ background: '#000', opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
