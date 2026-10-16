// S19 (1730-1810) The bus stop: the meme's first image, made warm. You sit on the bench; Sahur sits on your
// right, still much taller than you; the lantern hangs from the shelter's front beam (the key light);
// glitch drizzle beyond the roof, drips off the edge lit amber. 1762 he looks down at you, 1770-1784 a
// slow nod, 1786-1806 he stands his bat against the bench between you (its handle at the frame's
// bottom-right). Renders 1724-1814 (under the memory dissolves).
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps } from '../../../rig/Sahur';
import { Bat } from '../../../rig/Bat';
import { Lantern } from '../../../rig/Lantern';
import { mixPose } from '../../../rig/pose';
import { mixExpr, resolveExpr } from '../../../rig/expressions';
import { ApplyCamera } from '../../../pov/PovCamera';
import { povCamera } from '../../../pov/camera';
import { Grade, Grain, Vignette } from '../../../pov/Overlays';
import { Forest } from '../../../sets/Forest';
import { BusStop, BUS_STOP } from '../../../sets/BusStop';
import { GlowSprite } from '../../../enemies/lib/scene';
import { SAHUR_ROOM_SCALE } from '../../../sets/Bedroom';
import { PAL } from '../../../lib/palette';
import { vMatchFov } from '../../context';
import { JourneyPost } from '../JourneyPost';
import { SIT_ON_BAT, SIT_TIP_BAT, SIT_REST } from '../poses';
import { V3, seg, bump, inOutCubic, inOutSine, lerp } from '../common';

const SEAT = 0.29;
// you sit on the front edge; he sits beside you, angled toward you (so you see his face, 3/4)
const SAHUR_POS: V3 = [0.56, 0, 0.04];
const CAM: V3 = [-0.36, 0.85, -0.1];
const TURN0 = Math.PI + 0.85;
const FACING = new THREE.Vector3(Math.sin(TURN0), 0, Math.cos(TURN0));
const CORD = 3.6; // a long cord: the lantern hangs to about his face height
const LAMP: V3 = [BUS_STOP.hook[0], BUS_STOP.hook[1] - 0.12 * CORD - 0.06, BUS_STOP.hook[2]];
// the bat stands on its barrel between his knees (knob up, under his hands), then tips toward you about
// its foot until it rests against the bench at your side
const BAT_FOOT = new THREE.Vector3(SAHUR_POS[0], 0.0, SAHUR_POS[2]).addScaledVector(FACING, 0.47);
// it tips toward you: toward your right knee
const TIP_DIR = new THREE.Vector3(CAM[0] + 0.2, 0, CAM[2] - 0.05).sub(BAT_FOOT).setY(0).normalize();
const BAT_LEN_W = 1.4 * SAHUR_ROOM_SCALE;

export function benchSahur(f: number): SahurProps {
  let pose = SIT_ON_BAT;
  pose = mixPose(pose, SIT_TIP_BAT, seg(f, 1786, 1800, inOutCubic));
  pose = mixPose(pose, SIT_REST, seg(f, 1802, 1820, inOutSine));
  // gaze: the drizzle ahead, then down at you (the head leads by 6 f: he is a log, so a small body turn)
  const down = seg(f, 1762, 1772, inOutCubic);
  // the drizzle is ahead of the bench (-Z): to his right; you are ahead of him and below
  const look: [number, number] = [lerp(-0.4, 0.05, down), lerp(0.12, -0.42, down)];
  const turn = TURN0 + 0.22 * seg(f, 1766, 1782, inOutCubic);
  const nod = 0.07 * bump(f, 1770, 1776, 1778, 1784);
  let e = resolveExpr('calm');
  e = mixExpr(e, resolveExpr('smile'), 0.35 * seg(f, 1770, 1784));
  return {
    position: SAHUR_POS, turn, scale: SAHUR_ROOM_SCALE, pose, expression: e, look, lean: nod, breathe: (f / 60) * 0.3,
    blink: bump(f, 1744, 1748, 1750, 1756), bat: false, seed: 6,
  };
}

/** the bat: upright between his knees, then tipped toward you about its foot (knob = bat origin) */
function benchBat(f: number, _s: SahurProps) {
  const tip = 0.06 + 0.62 * seg(f, 1786, 1806, inOutCubic) + 0.02 * Math.sin(Math.max(0, f - 1806) * 0.5) * Math.exp(-Math.max(0, f - 1806) / 6);
  // direction from the foot up to the knob: tilt toward -x (toward you) and a little forward
  const up = new THREE.Vector3(0, Math.cos(tip), 0).addScaledVector(TIP_DIR, Math.sin(tip)).normalize();
  const knob = BAT_FOOT.clone().addScaledVector(up, BAT_LEN_W);
  // the bat's +Y runs knob -> tip, i.e. down along -up
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up.clone().negate());
  return { p: knob, q, s: SAHUR_ROOM_SCALE };
}

function benchCam(f: number, vertical: boolean) {
  // look up at his face; the eyes follow the bat down as it tips toward you (1788-1806)
  const eyes = new THREE.Vector3(SAHUR_POS[0], 1.33, SAHUR_POS[2]).addScaledVector(FACING, 0.2);
  const lamp = new THREE.Vector3(...LAMP);
  const t = eyes.clone().lerp(lamp, 0.28);
  t.y -= 0.22 * seg(f, 1788, 1808, inOutSine);
  return { position: CAM, target: [t.x, t.y, t.z] as V3, fov: vertical ? vMatchFov(56) : 56, breath: 'calm' as const, handheld: 0.35, seed: 19 };
}

export const BENCH_FOREST = { seed: 5, center: [0, -1.5] as [number, number], clearing: 4.2, paths: [{ from: [-30, -3.4] as [number, number], to: [30, -3.4] as [number, number], width: 3 }], extent: 26, trees: 90 };

export const ShotBench: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const sahur = benchSahur(f);
  const cam = povCamera(f, fps, benchCam(f, vertical));
  const bat = benchBat(f, sahur);
  const sw = 0.05 * Math.sin(f * 0.05) + 0.03 * Math.sin(f * 0.11 + 1);
  const lamp = new THREE.Vector3(LAMP[0] + Math.sin(sw) * 0.12 * CORD, LAMP[1], LAMP[2]);
  return (
    <AbsoluteFill style={{ background: '#05090a' }}>
      <AbsoluteFill style={{ filter: 'saturate(1.05) contrast(1.08)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 50, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={140} />
          <Forest mood="night" time={f} {...BENCH_FOREST} fireflies={70} />
          <BusStop time={f} seatHeight={SEAT} drizzle={650} lanternAt={[lamp.x, lamp.y, lamp.z]} />
          <group position={BUS_STOP.hook} rotation={[0, 0, sw]}>
            <Lantern height={0.12} cord={CORD} glow={1.6} light={0} />
          </group>
          <pointLight position={[lamp.x, lamp.y - 0.16, lamp.z + 0.06]} color={PAL.real} intensity={3.6} distance={8} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} shadow-radius={5} />
          <GlowSprite color={PAL.real} position={[lamp.x, lamp.y, lamp.z]} size={0.9} intensity={0.5} opacity={0.55} />
          <directionalLight position={[-4, 7, -9]} color="#8fc8b4" intensity={0.7} />
          <Sahur {...sahur} />
          <group position={bat.p} quaternion={bat.q} scale={bat.s}><Bat /></group>
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0, 0.1, 0.2]} color="#9cc8ff" intensity={0.25} distance={2} decay={2} />
          </group>
          <JourneyPost focus={cam.position.distanceTo(new THREE.Vector3(SAHUR_POS[0], 1.33, SAHUR_POS[2]).addScaledVector(FACING, 0.2))} focusRange={0.45} bokeh={2.6} bloom={1.0} threshold={0.65} vignette={0.5} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#06140c" liftAmt={0.08} gain="#ffe0b0" gainAmt={0.18} />
      <Vignette darkness={0.42} offset={0.38} />
      <Grain amount={0.05} seed={19} />
    </AbsoluteFill>
  );
};
