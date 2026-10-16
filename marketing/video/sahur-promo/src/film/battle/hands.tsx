// The player's mittens in the fights: pumping at the bottom corners while running, a 70° swat in 6 f,
// the recoil, a half-reach and a reach. Camera space (x right, y up, -z forward), authored for a
// 16:9 vFOV of 50°; the group is rescaled to the shot's lens so the mittens keep their screen size.
import React from 'react';
import * as THREE from 'three';
import { BlobHands, HandXf, HandsPose, HANDS_POSES } from '../../rig/BlobHands';
import { CamState } from '../../pov/camera';
import { clamp, lerp, D, V3, lerpV, outCubic, inOutCubic, invLerp } from './kit';
import { vMatchFov } from '../context';

const H = (p: V3, dir: V3, palm: V3, curl: number, hidden = false): HandXf => ({ p, dir, palm, curl, hidden });
const OFF_R = H([0.2, -0.45, -0.3], [0, 1, -0.3], [-1, 0, 0], 0.6, true);
const OFF_L = H([-0.2, -0.45, -0.3], [0, 1, -0.3], [1, 0, 0], 0.6, true);

/** running: fists pumping up into the bottom corners in counter-phase, on the beat */
export function runHands(f: number, amt = 1): HandsPose {
  const ph = ((f - 2400) / 48) * Math.PI * 2; // one arm cycle = two beats
  const a = Math.sin(ph), b = Math.sin(ph + Math.PI);
  // fists come up from below, backs of the mittens toward you (round cream paddles, not edge-on fins)
  const R = H([0.235 + 0.015 * a, -0.262 + 0.07 * Math.max(0, a) * amt, -0.42 - 0.03 * a], [-0.18, 0.95, -0.25], [-0.25, 0.05, -1], 0.3);
  const L = H([-0.235 - 0.015 * b, -0.262 + 0.07 * Math.max(0, b) * amt, -0.42 - 0.03 * b], [0.18, 0.95, -0.25], [0.25, 0.05, -1], 0.3);
  return { R, L };
}

/** the right mitten swats right-to-left across the frame: s 0..1 over 6 frames (70° arc) */
export function swatHand(s: number): HandXf {
  const t = clamp(s);
  const ang = lerp(42, -28, inOutCubic(t)) * D; // around a pivot behind/below the lens
  const r = 0.42;
  const p: V3 = [Math.sin(ang) * r, -0.07 + 0.05 * Math.sin(Math.PI * t), -Math.cos(ang) * r + 0.06];
  // the back of the mitten faces the lens (a round cream paddle), fingers up and leading the arc
  const dir: V3 = [-0.45, 0.8, -0.3];
  const palm: V3 = [-0.35, 0.0, -1];
  return H(p, dir, palm, 0.15);
}

/** arms out for balance (a drop / a landing): palms down, mittens pointing forward */
export const BRACE: HandsPose = {
  R: H([0.25, -0.2, -0.42], [-0.15, 0.25, -1], [0.1, -1, 0.2], 0.15),
  L: H([-0.25, -0.2, -0.42], [0.15, 0.25, -1], [-0.1, -1, 0.2], 0.15),
};

/** your mittens come up (palms out), smaller and wider than the bedroom recoil */
export const DEFENSIVE: HandsPose = {
  R: H([0.2, -0.16, -0.44], [-0.2, 1, 0.1], [0.2, 0.05, -1], 0.0),
  L: H([-0.21, -0.165, -0.45], [0.22, 1, 0.1], [-0.2, 0.05, -1], 0.0),
};

/** the right mitten reaching toward Sahur (k 0..1); half = 0.5 */
export function reachRight(k: number, aimX = -0.05, aimY = -0.02): HandXf {
  const t = clamp(k);
  // palm down, the round back of the mitten toward the lens
  return H(
    lerpV([0.22, -0.34, -0.3], [0.06 + aimX, -0.1 + aimY, -0.46], outCubic(t)),
    lerpV([-0.1, 0.9, -0.4], [-0.15, 0.3, -1], t),
    lerpV([-0.3, -0.2, -0.93], [-0.12, -0.5, -0.86], t),
    lerp(0.3, 0.08, t),
  );
}

/** hand-group scale so the mittens keep their 16:9 fov-50 screen size at any lens */
export const handScale = (fov: number, v: boolean) => Math.tan((fov * D) / 2) / Math.tan(((v ? vMatchFov(50) : 50) * D) / 2);

/**
 * 9:16 remap (storyboard V.handsInset): keep each mitten at the same place RELATIVE TO THE FRAME as in 16:9
 * (x scaled by the 9:16/16:9 half-width ratio, y by the half-height ratio) and push it deeper (DV) so it keeps
 * its 16:9 size relative to the frame width instead of filling the narrow vertical frame.
 */
const DV = 1.7;
const XR = Math.tan((25 * Math.PI) / 180) * (16 / 9); // 16:9 half-width per metre of depth at fov 50
const VR = Math.tan(((vMatchFov(50) / 2) * Math.PI) / 180); // 9:16 half-height per metre at V-match
const inset = (h: HandXf, v: boolean): HandXf => (v ? { ...h, p: [h.p[0] * ((VR * 9) / 16 / XR) * DV, h.p[1] * (VR / Math.tan((25 * Math.PI) / 180)) * DV, h.p[2] * DV] } : h);

export const PovHands: React.FC<{
  cam: CamState;
  v: boolean;
  R?: HandXf | null;
  L?: HandXf | null;
  /** squash-and-stretch smear along x for the swat (0..1) */
  smear?: number;
  tremble?: number;
  /** the cream key on the mittens (cd) */
  light?: number;
}> = ({ cam, v, R, L, smear = 0, tremble = 0, light = 0.6 }) => {
  const k = handScale(cam.fov, v);
  const pose: HandsPose = { R: inset(R ?? OFF_R, v), L: inset(L ?? OFF_L, v) };
  return (
    <group position={cam.position} quaternion={cam.quaternion}>
      <group scale={[k * (1 + 0.6 * smear), k * (1 - 0.15 * smear), k]}>
        <BlobHands pose={pose} phone={false} bat={false} tremble={tremble} />
        {/* a soft cream key on the mittens so they read against any set */}
        <pointLight position={[-0.1, 0.2, 0.05]} color="#ffdcae" intensity={light} distance={1.0} decay={2} />
      </group>
    </group>
  );
};

/** swoosh ribbon: an additive arc trailing the swat */
export const SwatTrail: React.FC<{ cam: CamState; v: boolean; s: number }> = ({ cam, v, s }) => {
  const t = clamp(s);
  const vis = Math.sin(Math.PI * clamp(invLerp(0, 1.25, t)));
  if (vis <= 0.01) return null;
  const k = handScale(cam.fov, v) * (v ? 0.7 : 1);
  const a0 = lerp(42, -28, inOutCubic(Math.max(0, t - 0.45))) * D;
  const a1 = lerp(42, -28, inOutCubic(t)) * D;
  const len = Math.max(0.01, a0 - a1);
  return (
    <group position={cam.position} quaternion={cam.quaternion}>
      <group scale={k} rotation={[0, 0, 0]}>
        <mesh position={[0, -0.03, 0.06]} rotation={[Math.PI / 2, 0, Math.PI / 2 + a1]}>
          <ringGeometry args={[0.36, 0.47, 32, 1, 0, len]} />
          <meshBasicMaterial color={new THREE.Color('#fff4e2').multiplyScalar(1.6)} transparent opacity={0.45 * vis} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};
