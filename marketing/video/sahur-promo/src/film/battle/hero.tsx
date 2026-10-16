// <Hero>: Sahur at fight scale (1.88 m) with the rig's damage props (cracks 0..3, innerLight 0..1, chips),
// plus <HeroKey>, a soft key that keeps him the bold subject of every quarter-second cut.
// Note: the rig's innerLight is a PointLight of up to 600 cd; in the fights keep it tiny (≈0.005-0.03).
import * as THREE from 'three';
import React from 'react';
import { Sahur, SahurProps, sahurRig } from '../../rig/Sahur';
import { CHAINS, chainMatrix, logR, logY1 } from '../../rig/pose';
import { GlowSprite } from '../../enemies/lib/scene';
import { PAL } from '../../lib/palette';
import { SS, DBG, clamp } from './kit';

export type HeroProps = SahurProps;

export const Hero: React.FC<HeroProps> = (p) => {
  const props: SahurProps = { castShadow: true, scale: SS, ...p };
  // the paper lantern's 18 cd blows out his log at fight distances: default it to a gentler 5 cd
  if (props.lantern && typeof props.lantern === 'object' && props.lantern.light === undefined) props.lantern = { ...props.lantern, light: 5 };
  if (props.lantern === true) props.lantern = { light: 5 };
  const dbg = DBG();
  if (dbg.noLantern) props.lantern = false;
  if (dbg.noCracks) { props.cracks = 0; props.innerLight = 0; }
  return <Sahur {...props} />;
};

/**
 * A point light hovering between the camera and Sahur (toward the camera by `back` m, up by `up` m,
 * sideways by `side` m), so his face and wood read against the set.
 */
export const HeroKey: React.FC<{ at: [number, number, number]; cam: THREE.Vector3; intensity?: number; color?: string; back?: number; up?: number; side?: number; distance?: number }> = ({ at, cam, intensity = 5, color = '#ffe2c0', back = 1.4, up = 0.5, side = 0, distance = 5 }) => {
  const a = new THREE.Vector3(at[0], at[1], at[2]);
  const d = cam.clone().sub(a).setY(0).normalize();
  const r = new THREE.Vector3(-d.z, 0, d.x);
  const p = a.clone().addScaledVector(d, back).addScaledVector(r, side).add(new THREE.Vector3(0, up, 0));
  return <pointLight position={p} color={color} intensity={intensity} distance={distance} decay={2} />;
};

// ---------- crack light leak: additive amber glows riding the rig's crack map (src/rig/cracks.ts) ----------
// The rig's crack lines are thin at fight distances; these camera-facing glows sit just off the log surface
// along the same paths (stage 1: from the top rim beside his right eye, u = 0.4; stage 2: from the top at
// u = 0.68 and up from the base at u = 0.2), so THE COST reads in a quarter second. Occluded by the log.
const U2PHI = (u: number) => (u - 0.5) * Math.PI * 2;
type CrackRun = { phi: number; y0: number; y1: number; stage: 0 | 1 };
const RUNS: CrackRun[] = [
  { phi: U2PHI(0.4), y0: logY1 - 0.02, y1: logY1 - 1.25, stage: 0 },
  { phi: U2PHI(0.68), y0: logY1 - 0.02, y1: logY1 - 1.55, stage: 1 },
  { phi: U2PHI(0.2), y0: -0.02, y1: 1.3, stage: 1 },
];
export const CrackGlow: React.FC<{ props: SahurProps; cracks: number; boost?: number; frame: number }> = ({ props, cracks, boost = 1, frame }) => {
  if (cracks <= 0.01 || boost <= 0.01) return null;
  const M = chainMatrix(sahurRig({ scale: SS, ...props }), CHAINS.torso);
  const out: React.ReactElement[] = [];
  RUNS.forEach((r, ri) => {
    const g = clamp(r.stage === 0 ? cracks : cracks - 1);
    if (g <= 0.01) return;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * g;
      const y = r.y0 + (r.y1 - r.y0) * t;
      const phi = r.phi + 0.05 * Math.sin(i * 0.9 + ri);
      const rr = logR(y) + 0.1;
      const p = new THREE.Vector3(Math.sin(phi) * rr, y, Math.cos(phi) * rr).applyMatrix4(M);
      const flick = 0.85 + 0.15 * Math.sin(frame * 0.9 + i * 1.7 + ri);
      out.push(<GlowSprite key={`${ri}-${i}`} color={PAL.real} size={(0.42 - 0.08 * i) * (0.85 + 0.15 * boost)} intensity={0.16 * boost * flick} position={[p.x, p.y, p.z]} renderOrder={9} />);
    }
  });
  return <>{out}</>;
};
