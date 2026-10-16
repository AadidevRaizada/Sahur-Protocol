// S05-S07 (420-720): waking in the blue. Eyes open on a ceiling where post-shaped light scrolls itself,
// you push yourself up (E0 -> E1), the window: every screen shows the same post and refreshes in sync,
// a slow push toward it, then the yaw drifts right toward the dark door (continuous into S08).
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { BlobHands, HandsPose, HANDS_POSES } from '../../rig/BlobHands';
import { Bedroom, MARKS } from '../../sets/Bedroom';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera, PovCamProps } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { Eyelids, Grain, Grade, Vignette } from '../../pov/Overlays';
import { vMatchFov } from '../context';
import { lerp } from '../../rig/util';
import { D, V3, seg, lerpV, track, inQuad, outCubic, inOutCubic, inOutSine } from './common';

const PRE_WHIP: V3 = [-0.3, 1.25, -2.0]; // where S08 (DoorwayShot) starts looking at 720

export function wakeCam(f: number, vertical: boolean): PovCamProps & { focus: number } {
  const E0 = MARKS.E0, E1 = MARKS.E1;
  const rise = seg(f, 540, 600, inOutCubic);
  let pos = lerpV(E0, E1, rise);
  const wdir = new THREE.Vector3(MARKS.window[0] - E1[0], 0, MARKS.window[2] - E1[2]).normalize();
  const dolly = 0.06 * seg(f, 600, 640) + 0.1 * seg(f, 640, 700);
  pos = [pos[0] + wdir.x * dolly, pos[1], pos[2] + wdir.z * dolly];
  let tgt = lerpV(MARKS.ceiling, MARKS.window, rise);
  tgt = lerpV(tgt, PRE_WHIP, seg(f, 680, 720, inOutSine));
  // the lens pushes into the window so the city fills the frame (every screen, the same post), then
  // widens back to 42 as the gaze drifts to the door (S08 starts at 42)
  const fov = track(f, [{ t: 540, v: 50 }, { t: 600, v: 42, e: inOutCubic }, { t: 668, v: 25, e: inOutSine }, { t: 684, v: 25 }, { t: 718, v: 42, e: inOutCubic }]);
  const c = new THREE.Vector3(...pos);
  const focus = lerp(c.distanceTo(new THREE.Vector3(...MARKS.ceiling)), c.distanceTo(new THREE.Vector3(...MARKS.window)), rise);
  return {
    position: pos, target: tgt, fov: vertical ? vMatchFov(fov) : fov,
    breath: 'calm', breathB: 'scared', breathMix: f < 640 ? 0.3 : 0.45, handheld: 0.6,
    roll: -4 * D * (1 - rise), seed: 21, focus,
  };
}

export const wakeLids = (f: number) => track(f, [
  { t: 420, v: 0 }, { t: 436, v: 0.12 }, { t: 444, v: 0, e: inQuad }, { t: 450, v: 0 }, { t: 500, v: 0.65, e: outCubic },
  { t: 510, v: 0.65 }, { t: 518, v: 0, e: inQuad }, { t: 540, v: 1, e: outCubic },
]);

// both mittens press into the mattress at the bottom corners (pushing yourself up)
const PRESS: HandsPose = {
  R: { p: [0.17, -0.118, -0.33], dir: [0.15, -0.35, -1], palm: [0.05, -1, -0.3], curl: 0.05 },
  L: { p: [-0.17, -0.118, -0.33], dir: [-0.15, -0.35, -1], palm: [-0.05, -1, -0.3], curl: 0.05 },
};

export const WakeShot: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const cp = wakeCam(f, vertical);
  const cam = povCamera(f, fps, cp);
  const camLag = povCamera(f - 4, fps, wakeCam(f - 4, vertical));
  const hands = seg(f - 4, 546, 580, outCubic) * (1 - seg(f - 4, 596, 616, inQuad));
  const blur = 12 * (1 - seg(f, 450, 540, outCubic));
  const lids = wakeLids(f);
  return (
    <AbsoluteFill style={{ background: '#05060c' }}>
      <AbsoluteFill style={{ filter: `saturate(0.72) contrast(1.12) blur(${blur * (height / 1080)}px)` }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 50, position: MARKS.E0 }}>
          <ApplyCamera cam={cam} near={0.02} far={150} />
          <color attach="background" args={['#05060c']} />
          <Bedroom mood="blue" time={f} doorOpen={0} hall={1} feedCeiling={1} refreshAt={[612, 636, 660, 684]} dust={0.9} />
          {hands > 0.001 && (
            <group position={camLag.position} quaternion={camLag.quaternion}>
              <BlobHands pose={HANDS_POSES.rest} poseB={PRESS} mix={hands} />
            </group>
          )}
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0.05, -0.02, 0.12]} color="#e6e4f0" intensity={0.3} distance={1.2} decay={2} />
          </group>
          <Post focus={cp.focus} focusRange={Math.max(0.3, cp.focus * 0.25)} bokeh={1.5} bloom={0.9} bloomThreshold={0.65} vignette={0.5} chroma={0.8} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#0a1230" liftAmt={0.1} gain="#c8d4ff" gainAmt={0.22} />
      <Vignette darkness={0.35} offset={0.45} />
      <Grain amount={0.06} seed={11} />
      <Eyelids open={lids} />
    </AbsoluteFill>
  );
};
