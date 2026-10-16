// S15 (1410-1490) The walk: a walking POV beside Sahur in the Hype Cycle Forest, his lantern swinging from
// the bat on his shoulder (the amber key). 1440-1456 he glances back over his shoulder and nods once.
// Also renders 1490-1498 underneath the memory dissolve.
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps, sahurPoint } from '../../../rig/Sahur';
import { BlobHands, HandsPose } from '../../../rig/BlobHands';
import { ApplyCamera } from '../../../pov/PovCamera';
import { povCamera, projectToScreen } from '../../../pov/camera';
import { Grade, Grain, LightLeak, Vignette } from '../../../pov/Overlays';
import { Forest } from '../../../sets/Forest';
import { Motes } from '../../../fx/Motes';
import { GlowSprite } from '../../../enemies/lib/scene';
import { SAHUR_ROOM_SCALE } from '../../../sets/Bedroom';
import { PAL } from '../../../lib/palette';
import { vMatchFov } from '../../context';
import { JourneyPost } from '../JourneyPost';
import { POLE } from '../poses';
import { lanternPoint } from '../rigPoints';
import { D, V3, seg, bump, inOutCubic, outCubic, lerp, clamp } from '../common';

const SPEED = 1.1 / 60; // m per frame
const Z0 = 6;
const camZ = (f: number) => Z0 - (f - 1410) * SPEED;
// walk phase: his wooden steps plant on the off-beats 1430 and 1470 (phase 0 and 0.5)
const phaseAt = (f: number) => (f - 1430) / 80;

const lanternSwing = (f: number): [number, number] => { const ph = phaseAt(f); return [0.16 * Math.sin(ph * Math.PI * 4 + 0.6), 0.09 * Math.cos(ph * Math.PI * 4)]; };

export function walkSahur(f: number): SahurProps {
  const cz = camZ(f);
  const ph = phaseAt(f);
  // the glance back: the whole log turns 70 degrees toward you (he is a log: his head is his body)
  const glance = seg(f, 1438, 1454, inOutCubic) * (1 - seg(f, 1462, 1480, inOutCubic));
  const nod = bump(f, 1454, 1458, 1460, 1468);
  return {
    position: [0.25 - 0.75, 0, cz - 2.3], turn: Math.PI - 100 * D * glance, scale: SAHUR_ROOM_SCALE,
    pose: POLE, walk: ph, walkAmount: 1 - 0.7 * glance, lean: 0.1 * nod,
    expression: 'calm', expressionB: 'smile', exprMix: 0.6 * glance, look: [-0.42 * glance, 0.05 * glance],
    blink: bump(f, 1474, 1477, 1479, 1484), breathe: (f / 60) * 0.35, seed: 5,
    lantern: { glow: 1.7, light: 0, swing: lanternSwing(f) },
  };
}

function walkCam(f: number, vertical: boolean) {
  const t = f - 1410;
  const bobY = -0.012 * Math.cos((t / 40) * Math.PI * 2);
  const roll = 0.6 * D * Math.sin((t / 40) * Math.PI);
  const yaw = 0.4 * D * Math.sin((t / 40) * Math.PI + 0.5);
  const cz = camZ(f);
  const pos: V3 = [0.25, 1.05 + bobY, cz];
  const tgt: V3 = [0.25 - 0.2, 1.36, cz - 2.6];
  const fov = vertical ? vMatchFov(48) : 48;
  return { position: pos, target: tgt, fov, breath: 'calm' as const, handheld: 0.6, roll, lookSide: yaw + (vertical ? 8 * D : 0), seed: 15 };
}

/** both mittens swinging low at the frame edges, in counter-phase with the steps */
function walkHands(f: number, vertical: boolean): HandsPose {
  const s = Math.sin(((f - 1410) / 80) * Math.PI * 2);
  const inset = vertical ? 0.55 : 1;
  const dy = vertical ? -0.06 : 0;
  return {
    R: { p: [0.2 * inset + 0.01, -0.27 + dy + 0.018 * s, -0.36 - 0.05 * s], dir: [-0.05, 0.75, -0.65], palm: [-0.9, 0.1, -0.3], curl: 0.35 },
    L: { p: [-0.2 * inset - 0.01, -0.27 + dy - 0.018 * s, -0.36 + 0.05 * s], dir: [0.05, 0.75, -0.65], palm: [0.9, 0.1, -0.3], curl: 0.35 },
  };
}

export const WALK_FOREST = { seed: 3, center: [0, -8] as [number, number], clearing: 1.4, paths: [{ from: [0, 14] as [number, number], to: [0, -40] as [number, number], width: 3.4 }], extent: 30, trees: 110 };

export const ShotWalk: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const sahur = walkSahur(f);
  const cp = walkCam(f, vertical);
  const cam = povCamera(f, fps, cp);
  const camLag = povCamera(f - 4, fps, walkCam(f - 4, vertical));
  const lantern = lanternPoint(sahur, lanternSwing(f));
  const eyes = sahurPoint(sahur, 'eyes');
  const focus = cam.position.distanceTo(eyes);
  // the S14 amber flare resolves into the forest
  const leak = 1 - seg(f, 1410, 1426, outCubic);
  const hs = projectToScreen(eyes, cam, width, height);
  return (
    <AbsoluteFill style={{ background: '#05090a' }}>
      <AbsoluteFill style={{ filter: 'saturate(1.05) contrast(1.08)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 48, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={160} />
          <Forest mood="night" time={f} {...WALK_FOREST} fireflies={110} />
          <Sahur {...sahur} />
          {/* the lantern's light, hung just under the paper so the bat tip above it doesn't blow out */}
          <pointLight position={[lantern.x, lantern.y - 0.34, lantern.z]} color={PAL.real} intensity={3.4} distance={10} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} shadow-radius={5} />
          {/* cool moonlight from behind-left: his back and the bark read against the fog */}
          <directionalLight position={[-6, 9, cp.position[2] + 8]} color="#8fc8b4" intensity={0.9} />
          <GlowSprite color={PAL.real} position={[lantern.x, lantern.y, lantern.z]} size={1.3} intensity={0.5} opacity={0.6} />
          {/* lantern-lit motes around him */}
          <Motes frame={f} count={110} box={[2.4, 1.8, 2.4]} center={[lantern.x, lantern.y - 0.3, lantern.z]} vel={[0.02, 0.05, 0.02]} wander={0.25} size={0.01} color="#ffc070" color2="#ffe2b0" intensity={1.8} opacity={0.8} seed={9} />
          {/* a faint cool fill on the mittens and his back so they read in the dark */}
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0, 0.2, 0.3]} color="#a8d8c4" intensity={0.5} distance={3} decay={2} />
          </group>
          <group position={camLag.position} quaternion={camLag.quaternion}>
            <BlobHands pose={walkHands(f, vertical)} />
          </group>
          <JourneyPost focus={focus} focusRange={1.2} bokeh={2.4} bloom={1.0} threshold={0.72} vignette={0.5} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#06140c" liftAmt={0.09} gain="#ffe0b0" gainAmt={0.18} />
      <LightLeak x={width / 2} y={height * 0.62} radius={width * (0.5 + 0.6 * leak)} opacity={0.85 * leak} inner={PAL.real} outer={PAL.fire} />
      <Vignette darkness={0.4} offset={0.4} />
      <Grain amount={0.05} seed={15} />
    </AbsoluteFill>
  );
};
