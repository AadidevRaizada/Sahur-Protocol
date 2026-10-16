// S17 (1550-1670) The rhythm, shown: a forest clearing; Sahur has just hung his lantern on a branch and
// taps a mossy stump with his bat, TUNG at 1570, 1610, 1650 (small amber rings, the veins pulse, the
// motes jump). 1654: your mittens clap, 4 frames late. 1656 he looks at you; 1660-1670 amused head shake.
// Renders 1544-1678 (under the memory dissolves on both sides).
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps } from '../../../rig/Sahur';
import { BlobHands, HandsPose } from '../../../rig/BlobHands';
import { Lantern } from '../../../rig/Lantern';
import { mixPose, Pose } from '../../../rig/pose';
import { mixExpr, resolveExpr } from '../../../rig/expressions';
import { ApplyCamera } from '../../../pov/PovCamera';
import { povCamera } from '../../../pov/camera';
import { Grade, Grain, Vignette } from '../../../pov/Overlays';
import { Forest, Stump } from '../../../sets/Forest';
import { Motes } from '../../../fx/Motes';
import { GlowSprite } from '../../../enemies/lib/scene';
import { SAHUR_ROOM_SCALE } from '../../../sets/Bedroom';
import { PAL } from '../../../lib/palette';
import { vMatchFov } from '../../context';
import { JourneyPost } from '../JourneyPost';
import { AmberRing } from '../AmberRing';
import { TAP_REST, TAP_LIFT, TAP_HIT, REACH_UP, mirrorPose } from '../poses';
import { D, V3, seg, bump, pulseAt, inOutCubic, inOutSine, outCubic, inCubic, lerp, clamp } from '../common';

const TAPS = [1570, 1610, 1650];
// he stands 3/4 to you (turned toward screen-left) so the tap reads across the frame, not into the lens
const TURN0 = -0.7;
const HIT_LOCAL = [-0.34, 0.9]; // the TAP_HIT barrel contact (x, z) in his frame (rig probe)
const STUMP: V3 = [HIT_LOCAL[0] * Math.cos(TURN0) + HIT_LOCAL[1] * Math.sin(TURN0), 0, -HIT_LOCAL[0] * Math.sin(TURN0) + HIT_LOCAL[1] * Math.cos(TURN0)];
const HOOK: V3 = [0.78, 1.78, 0.18];
const REACH_L: Pose = (() => { const p = mirrorPose(REACH_UP); p.armL = { ...p.armL, fwd: 104 * D, out: 52 * D, elbow: 14 * D }; return p; })();

/** the tap cycle: 0 rest -> 1 lifted (10 f anticipation) -> strike (3 f) -> 4 f hold -> back (12 f) */
function tapPose(f: number): Pose {
  let p: Pose = TAP_REST;
  for (const at of TAPS) {
    if (f >= at - 13 && f < at - 3) p = mixPose(TAP_REST, TAP_LIFT, inOutCubic((f - (at - 13)) / 10));
    else if (f >= at - 3 && f <= at) p = mixPose(TAP_LIFT, TAP_HIT, inCubic((f - (at - 3)) / 3));
    else if (f > at && f <= at + 4) p = TAP_HIT;
    else if (f > at + 4 && f < at + 16) p = mixPose(TAP_HIT, TAP_REST, outCubic((f - (at + 4)) / 12));
  }
  return p;
}

export function stumpSahur(f: number): SahurProps {
  // 1550-1566: the left arm comes down from the branch, the bat comes off the shoulder into the right hand
  let pose = mixPose(REACH_L, TAP_REST, seg(f, 1546, 1566, inOutCubic));
  if (f >= 1557) pose = mixPose(pose, tapPose(f), seg(f, 1557, 1566));
  let e = resolveExpr('calm');
  e = mixExpr(e, resolveExpr('earnest'), seg(f, 1560, 1570));
  // 1656: looks at you, brows up; 1660-1670: amused
  e = mixExpr(e, resolveExpr('amused'), seg(f, 1659, 1666));
  const brows = 0.022 * bump(f, 1655, 1659, 1662, 1670);
  e = { ...e, browRaise: e.browRaise + brows };
  const lookStump: [number, number] = [-0.12, -0.4];
  const lookYou: [number, number] = [0.28, 0.02];
  const k = seg(f, 1655, 1660, inOutCubic);
  const look: [number, number] = [lerp(lookStump[0], lookYou[0], k), lerp(lookStump[1], lookYou[1], k)];
  // he turns toward you (head leads), then the head shake (he is a log: the whole body turns), once
  const toYou = 0.4 * seg(f, 1655, 1663, inOutCubic);
  const shake = f >= 1661 && f <= 1675 ? 0.12 * Math.sin(((f - 1661) / 14) * Math.PI * 2) * (1 - (f - 1661) / 18) : 0;
  const turn = TURN0 + toYou + shake;
  return {
    position: [0, 0, 0], turn, scale: SAHUR_ROOM_SCALE, pose, expression: e, look, breathe: (f / 60) * 0.35,
    blink: bump(f, 1590, 1594, 1596, 1602) + bump(f, 1676, 1680, 1682, 1688), seed: 4,
  };
}

function stumpCam(f: number, vertical: boolean) {
  return {
    position: [0.38, 1.08, 3.35] as V3, target: [-0.3, 0.92, 0.1] as V3, fov: vertical ? vMatchFov(40) : 40,
    breath: 'calm' as const, handheld: 0.5, seed: 17,
    shake: TAPS.map((at) => ({ frame: at, strength: 0.06, decay: 0.12 })),
  };
}

/** your mittens: up from below 1640-1650, clap at 1654 (4 f late), a rebound, down again */
function clapHands(f: number, vertical: boolean): HandsPose | null {
  const up = seg(f, 1636, 1648, outCubic) * (1 - seg(f, 1664, 1676, inOutSine));
  if (up <= 0) return null;
  // separation: wide while rising, slap together at 1654, rebound, settle a little apart
  let sep = 0.15;
  if (f >= 1648) sep = lerp(0.15, 0.028, inCubic(clamp((f - 1648) / 6)));
  if (f > 1654) sep = lerp(0.028, 0.06, outCubic(clamp((f - 1654) / 6)));
  // 9:16 shows more below: keep the mittens lower and further so they don't fill the bottom of the frame
  const y = lerp(-0.5, vertical ? -0.27 : -0.165, up) + (f >= 1652 && f <= 1656 ? -0.006 : 0);
  const k = vertical ? 0.9 : 1;
  const zz = vertical ? -0.72 : -0.46;
  return {
    R: { p: [sep * k + 0.03, y, zz], dir: [-0.3, 0.5, -0.81], palm: [-0.78, 0.38, 0.5], curl: 0.35 },
    L: { p: [-sep * k - 0.03, y, zz], dir: [0.3, 0.5, -0.81], palm: [0.78, 0.38, 0.5], curl: 0.35 },
  };
}

export const STUMP_FOREST = {
  seed: 11, center: [0, 0.4] as [number, number], clearing: 3.6, extent: 26, trees: 95,
  extraTrees: [{ x: 1.85, z: -0.6, r: 0.36, h: 12 }],
  logs: [{ x: -2.6, z: -1.6, rot: 0.5, len: 2.6, r: 0.22 }, { x: 2.4, z: 1.6, rot: -1.2, len: 2.0, r: 0.18 }],
};

export const ShotStump: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const sahur = stumpSahur(f);
  const cam = povCamera(f, fps, stumpCam(f, vertical));
  const camLag = povCamera(f - 4, fps, stumpCam(f - 4, vertical));
  // the clap's timing is not lagged (contact exactly at 1654, the cue); only the hand group follows camLag
  const hands = clapHands(f, vertical);
  const pulse = TAPS.reduce((a, at) => a + pulseAt(f, at, 1, 8), 0);
  // the lantern, just hung: a decaying swing
  const age = Math.max(0, f - 1540);
  const swing = 0.22 * Math.exp(-age / 50) * Math.sin(age * 0.16);
  const lamp = new THREE.Vector3(HOOK[0] + Math.sin(swing) * 0.21, HOOK[1] - Math.cos(swing) * 0.21, HOOK[2]);
  const jump = TAPS.reduce((a, at) => a + 0.02 * pulseAt(f, at, 1, 10), 0);
  return (
    <AbsoluteFill style={{ background: '#05090a' }}>
      <AbsoluteFill style={{ filter: 'saturate(1.05) contrast(1.08)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 42, position: [0, 1, 3] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={160} />
          <Forest mood="night" time={f} {...STUMP_FOREST} pulse={pulse} fireflies={120} />
          <Stump position={STUMP} radius={0.25} height={0.31} rot={0.7} />
          {/* the branch the lantern hangs from */}
          <mesh position={[1.3, 1.83, -0.12]} rotation={[0.25, 0.3, 1.32]} castShadow><cylinderGeometry args={[0.022, 0.05, 1.3, 7]} /><meshStandardMaterial color="#232823" roughness={1} /></mesh>
          <group position={HOOK} rotation={[0, 0, swing]}>
            <Lantern height={0.12} glow={1.6} light={0} />
          </group>
          <pointLight position={[lamp.x, lamp.y - 0.18, lamp.z + 0.05]} color={PAL.real} intensity={4.5} distance={9} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} shadow-radius={5} />
          <GlowSprite color={PAL.real} position={[lamp.x, lamp.y, lamp.z]} size={1.1} intensity={0.5} opacity={0.55} />
          <directionalLight position={[-5, 8, 9]} color="#8fc8b4" intensity={0.8} />
          <Sahur {...sahur} />
          {TAPS.map((at) => <AmberRing key={at} progress={(f - at) / 20} radius={1.2} width={0.03} opacity={0.8} intensity={3} position={[STUMP[0], 0.31 * 0 + 0.0, STUMP[2]]} />)}
          {TAPS.map((at) => <AmberRing key={'t' + at} progress={(f - at) / 10} radius={0.32} width={0.02} opacity={0.9} intensity={4} position={[STUMP[0], 0.31, STUMP[2]]} />)}
          <Motes frame={f} count={140} box={[3.2, 2.2, 3.2]} center={[0.1, 1.2 + jump, 0.4]} vel={[0.01, 0.04, 0.0]} wander={0.25} size={0.01} color="#ffc070" color2="#ffe2b0" intensity={1.6} opacity={0.75} seed={12} />
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0, 0.25, 0.3]} color="#a8d8c4" intensity={0.06} distance={3} decay={2} />
            <pointLight position={[0.12, 0.08, -0.24]} color="#ffc68a" intensity={0.26} distance={1.0} decay={2} />
          </group>
          {hands && (
            <group position={camLag.position} quaternion={camLag.quaternion}>
              <BlobHands pose={hands} />
            </group>
          )}
          <JourneyPost focus={cam.position.distanceTo(new THREE.Vector3(0, 1.4, 0.2))} focusRange={1.1} bokeh={2.4} bloom={1.1} threshold={0.6} vignette={0.5} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#06140c" liftAmt={0.09} gain="#ffe0b0" gainAmt={0.18} />
      <Vignette darkness={0.4} offset={0.4} />
      <Grain amount={0.05} seed={17} />
    </AbsoluteFill>
  );
};
