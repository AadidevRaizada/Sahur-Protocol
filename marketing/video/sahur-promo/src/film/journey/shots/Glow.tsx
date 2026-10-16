// S21 (1850-1890) Toward the glow: dusk, a walking POV behind Sahur; a small orange glow 15 m off among the
// trees (the campfire). vFOV 40 -> 30 over 1870-1890, a push on the glow, which is held at exactly the
// screen point where S22's fire sits at 1890: the match cut.
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps } from '../../../rig/Sahur';
import { BlobHands, HandsPose } from '../../../rig/BlobHands';
import { ApplyCamera } from '../../../pov/PovCamera';
import { povCamera } from '../../../pov/camera';
import { Grade, Grain, Vignette } from '../../../pov/Overlays';
import { Forest } from '../../../sets/Forest';
import { Campfire, fireFlicker } from '../../../sets/Campfire';
import { GlowSprite } from '../../../enemies/lib/scene';
import { SAHUR_ROOM_SCALE } from '../../../sets/Bedroom';
import { PAL } from '../../../lib/palette';
import { vMatchFov } from '../../context';
import { JourneyPost } from '../JourneyPost';
import { POLE } from '../poses';
import { lanternPoint } from '../rigPoints';
import { fireMatchPoint } from './Fire';
import { D, V3, seg, inOutSine, lerp } from '../common';

const SPEED = 1.0 / 60;
const camZ = (f: number) => 4 - (f - 1850) * SPEED;
const GLOW: V3 = [0.5, 0, camZ(1890) - 15];
const phaseAt = (f: number) => (f - 1870) / 80;
const swingAt = (f: number): [number, number] => { const ph = phaseAt(f); return [0.15 * Math.sin(ph * Math.PI * 4 + 0.6), 0.08 * Math.cos(ph * Math.PI * 4)]; };

export function glowSahur(f: number): SahurProps {
  return {
    position: [-0.34, 0, camZ(f) - 3.6], turn: Math.PI + 0.04, scale: SAHUR_ROOM_SCALE, pose: POLE, walk: phaseAt(f), walkAmount: 1,
    expression: 'calm', breathe: (f / 60) * 0.35, seed: 5, lantern: { glow: 1.6, light: 0, swing: swingAt(f) },
  };
}

function glowCam(f: number, vertical: boolean, width: number, height: number, fps: number) {
  const t = f - 1850;
  const bobY = -0.011 * Math.cos((t / 40) * Math.PI * 2);
  const roll = 0.5 * D * Math.sin((t / 40) * Math.PI);
  const pos: V3 = [0, 1.05 + bobY, camZ(f)];
  const fov169 = lerp(40, 30, seg(f, 1870, 1890, inOutSine));
  const fov = vertical ? vMatchFov(fov169) : fov169;
  // hold the glow at S22's fire position on screen (the match cut)
  const m = fireMatchPoint(width, height, fps);
  const nx = (m.x / width) * 2 - 1, ny = 1 - (m.y / height) * 2;
  const vh = (fov * D) / 2, hh = Math.atan(Math.tan(vh) * (width / height));
  const side = Math.atan(nx * Math.tan(hh)), up = -Math.atan(ny * Math.tan(vh));
  return { position: pos, target: [GLOW[0], 0.3, GLOW[2]] as V3, fov, breath: 'calm' as const, handheld: 0.25, roll, lookSide: side, lookUp: up, seed: 21 };
}

function walkHands(f: number, vertical: boolean): HandsPose {
  const s = Math.sin(((f - 1850) / 80) * Math.PI * 2);
  const inset = vertical ? 0.55 : 1;
  const dy = vertical ? -0.06 : 0;
  return {
    R: { p: [0.2 * inset + 0.01, -0.28 + dy + 0.016 * s, -0.36 - 0.05 * s], dir: [-0.05, 0.75, -0.65], palm: [-0.9, 0.1, -0.3], curl: 0.35 },
    L: { p: [-0.2 * inset - 0.01, -0.28 + dy - 0.016 * s, -0.36 + 0.05 * s], dir: [0.05, 0.75, -0.65], palm: [0.9, 0.1, -0.3], curl: 0.35 },
  };
}

export const GLOW_FOREST = { seed: 9, center: [0, -8] as [number, number], clearing: 1.2, clearings: [{ x: GLOW[0], z: GLOW[2], r: 3 }], paths: [{ from: [0, 10] as [number, number], to: [GLOW[0], GLOW[2]] as [number, number], width: 3 }], extent: 30, trees: 120 };

export const ShotGlow: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const sahur = glowSahur(f);
  const cam = povCamera(f, fps, glowCam(f, vertical, width, height, fps));
  const camLag = povCamera(f - 4, fps, glowCam(f - 4, vertical, width, height, fps));
  const lantern = lanternPoint(sahur, swingAt(f));
  const fl = fireFlicker(f, 3);
  // the hands fade out of frame as the lens pushes in
  const hk = Math.tan((cam.fov * D) / 2) / Math.tan(((vertical ? vMatchFov(40) : 40) * D) / 2);
  return (
    <AbsoluteFill style={{ background: '#05090a' }}>
      <AbsoluteFill style={{ filter: 'brightness(1.12) saturate(1.05) contrast(1.08)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 40, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={160} />
          <Forest mood="dusk" time={f} {...GLOW_FOREST} fireflies={90} />
          <Sahur {...sahur} />
          {/* a cool dusk fill from behind you on his back, a cool rim from the sky ahead, the far fire's warm rim */}
          <directionalLight position={[2, 4, camZ(f) + 6]} color="#a8cce0" intensity={1.1} />
          <directionalLight position={[-3, 5, camZ(f) - 14]} color="#b8dcf0" intensity={2.6} />
          <pointLight position={[0.35, 1.25, camZ(f) - 4.9]} color="#ff9a4a" intensity={2.8} distance={3.2} decay={2} />
          <pointLight position={[lantern.x, lantern.y - 0.2, lantern.z]} color={PAL.real} intensity={4} distance={8} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} />
          <GlowSprite color={PAL.real} position={[lantern.x, lantern.y, lantern.z]} size={1.1} intensity={0.5} opacity={0.55} />
          {/* the far campfire: the glow among the trees */}
          <group position={GLOW}>
            <Campfire time={f} light={0} intensity={1.9} embers={80} castShadow={false} />
          </group>
          <pointLight position={[GLOW[0], 0.5, GLOW[2]]} color="#ff9a4a" intensity={70 * fl} distance={18} decay={2} />
          <GlowSprite color={PAL.fire} position={[GLOW[0], 0.45, GLOW[2]]} size={6} intensity={1.5} opacity={0.85} />
          <group position={camLag.position} quaternion={camLag.quaternion}>
            <group scale={hk}><BlobHands pose={walkHands(f, vertical)} /></group>
          </group>
          <JourneyPost focus={cam.position.distanceTo(new THREE.Vector3(...GLOW))} focusRange={6} bokeh={2} bloom={1.15} threshold={0.6} vignette={0.5} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#0a141a" liftAmt={0.08} gain="#ffe0b0" gainAmt={0.16} />
      <Vignette darkness={0.42} offset={0.38} />
      <Grain amount={0.05} seed={21} />
    </AbsoluteFill>
  );
};
