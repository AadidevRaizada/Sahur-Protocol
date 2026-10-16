// S53-S57 (3780-4200): eyes open in plain morning light, the dark phone face down on your chest, "we did it.",
// the turn to the bedside where he knelt (S12's framing, now empty), "…sahur?", the mitten reaches into empty
// space, the birds stop, one far TUNG at 4140 (every mote jumps), the breath catches, a small turn toward the window.
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { BlobHands, HandXf, HANDS_POSES } from '../../rig/BlobHands';
import { Phone } from '../../rig/Phone';
import { sahurPoint } from '../../rig/Sahur';
import { sahurAt } from '../../rig/comps/DoorwayScene';
import { Bedroom, MARKS } from '../../sets/Bedroom';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera, PovCamProps } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { Eyelids, Grain, Grade, Vignette } from '../../pov/Overlays';
import { Subtitle } from '../../ui/Subtitle';
import { vMatchFov } from '../context';
import { lerp } from '../../rig/util';
import { D, V3, seg, lerpV, track, inQuad, outCubic, inOutCubic, inOutSine, toCamLocal } from './common';

// where his eyes were at 1128 (S12's framing): the empty spot we turn to
const KNEEL_EYES = (() => { const e = sahurPoint(sahurAt(1128), 'eyes'); return [e.x, e.y, e.z] as V3; })();
const WINDOW_LOOK: V3 = [-0.75, 1.55, -2.0];
// the phone face down on the duvet over your chest (the duvet top there is ~0.65)
// it slid a little down your body in the night: on the duvet over your stomach, ~0.6 m from the eye
const PHONE_AT: V3 = [-1.29, 0.645, 0.8];
const SOFT_LOOK: V3 = [-1.2, 0.65, 0.25];
const LIFT_LOOK: V3 = [-1.1, 0.95, -0.6];

export function morningCam(f: number, vertical: boolean): PovCamProps {
  const E0 = MARKS.E0, E1 = MARKS.E1;
  const turn = seg(f, 3916, 3966, inOutCubic);
  let pos = lerpV(E0, E1, turn);
  // a softer angle down the body (the phone sits in the lower third), then the gaze lifts for "we did it."
  const lift = seg(f, 3842, 3890, inOutSine);
  let tgt = lerpV(lerpV(SOFT_LOOK, LIFT_LOOK, lift), KNEEL_EYES, turn);
  // S57: the breath catches (+4 mm), then a small turn toward the window with a tiny push
  pos = [pos[0], pos[1] + 0.004 * seg(f, 4146, 4152, outCubic), pos[2]];
  const toWin = seg(f, 4150, 4196, inOutSine);
  tgt = lerpV(tgt, lerpV(KNEEL_EYES, WINDOW_LOOK, 0.45), toWin);
  tgt = [tgt[0], tgt[1] + 0.06 * toWin, tgt[2]];
  const fwd = new THREE.Vector3(tgt[0] - pos[0], 0, tgt[2] - pos[2]).normalize();
  pos = [pos[0] + fwd.x * 0.04 * toWin, pos[1], pos[2] + fwd.z * 0.04 * toWin];
  const fov = lerp(44, 42, turn);
  return {
    position: pos, target: tgt, fov: vertical ? vMatchFov(fov) : fov, breath: 'calm', handheld: 0.25,
    lookUp: -0.8 * D * Math.sin(Math.PI * seg(f, 3848, 3872, (t) => t)), seed: 33,
  };
}

const morningLids = (f: number) => track(f, [
  { t: 3780, v: 0 }, { t: 3790, v: 0.2 }, { t: 3796, v: 0, e: inQuad }, { t: 3802, v: 0 }, { t: 3840, v: 1, e: outCubic },
]);

export const MorningShot: React.FC<{ f: number; off: number }> = ({ f, off }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const cp = morningCam(f, vertical);
  const cam = povCamera(f, fps, cp);
  const camLag = povCamera(f - 4, fps, morningCam(f - 4, vertical));
  // the right mitten rests on the phone (world), flexes once at 3850; later it reaches into the empty space
  const flex = Math.max(0, Math.sin(Math.PI * seg(f, 3850, 3866, (t) => t)));
  const phoneQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.06, 0, 0.3)); // face down
  // the mitten lies on the phone with the arm running off toward your right shoulder (frame right / bottom)
  const restW: HandXf = {
    p: [PHONE_AT[0] + 0.11, PHONE_AT[1] + 0.03, PHONE_AT[2] + 0.06],
    dir: [-0.5, -0.06, -0.86], palm: [0.05, -1, 0.05], curl: 0.12 + 0.25 * flex,
  };
  // S56: reach toward the kneel point (stops at 4046, hangs, lowers 4060-4080)
  const reach = seg(f - 4, 4006, 4046, outCubic) * (1 - 0.6 * seg(f - 4, 4060, 4080, inOutSine));
  const target = toCamLocal(new THREE.Vector3(...KNEEL_EYES), camLag);
  const dir = target.clone().normalize();
  const reachEnd = dir.clone().multiplyScalar(0.46).add(new THREE.Vector3(0.03, -0.075, 0));
  const reachStart = new THREE.Vector3(0.2, -0.3, -0.32);
  const rp = reachStart.clone().lerp(reachEnd, reach);
  rp.y += 0.03 * Math.sin(reach * Math.PI) - 0.04 * seg(f - 4, 4060, 4080, inOutSine);
  const reachXf: HandXf = { p: [rp.x, rp.y, rp.z], dir: [dir.x * 0.8 - 0.1, dir.y + 0.35, dir.z], palm: [-0.35, -0.1, -1], curl: 0.08 };
  const showRest = f < 3990;
  const lids = morningLids(f);
  const blur = 10 * (1 - seg(f, 3802, 3870, outCubic));
  const dustJump = 0.01 * (seg(f, 4140, 4143, outCubic) - seg(f, 4143, 4160, inOutSine));
  return (
    <AbsoluteFill style={{ background: '#d9d4c8' }}>
      <AbsoluteFill style={{ filter: `saturate(0.85) contrast(1.0) blur(${blur * (height / 1080)}px)` }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 44, position: MARKS.E0 }}>
          <ApplyCamera cam={cam} near={0.02} far={150} />
          <color attach="background" args={['#cfd2d6']} />
          <Bedroom mood="morning" time={f} doorOpen={0} hall={0} dust={1} dustJump={dustJump} />
          {/* the phone, dark, face down on your chest */}
          <group position={PHONE_AT} quaternion={phoneQ}>
            <Phone screenOn={0} glow={0} />
          </group>
          {showRest && <BlobHands pose={{ R: restW, L: { ...HANDS_POSES.rest.L } }} phone={false} />}
          {reach > 0.001 && (
            <group position={camLag.position} quaternion={camLag.quaternion}>
              <BlobHands pose={{ R: reachXf, L: HANDS_POSES.rest.L }} phone={false} />
            </group>
          )}
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0.05, 0.05, 0.12]} color="#fff6ea" intensity={0.35} distance={1.4} decay={2} />
          </group>
          <Post focus={f < 3916 ? 0.62 : 0.9} focusRange={f < 3916 ? 0.2 : 0.6} bokeh={1.5} bloom={0.3} bloomThreshold={0.9} vignette={0.3} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#10141c" liftAmt={0.08} gain="#fff8ee" gainAmt={0.6} />
      <Vignette darkness={0.3} offset={0.5} />
      <Grain amount={0.04} seed={19} />
      <Subtitle text="we did it." start={3846 - off} end={3916 - off} />
      <Subtitle text="…sahur?" start={4000 - off} end={4070 - off} />
      <Eyelids open={lids} />
    </AbsoluteFill>
  );
};
