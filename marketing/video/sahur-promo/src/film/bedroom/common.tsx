// Shared helpers for the two bedroom acts (BedroomA S01-S14, BedroomB S52-S57).
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { useFilmFrame } from '../context';
import { clamp, invLerp, lerp, mixHex, easeOut, easeInOut } from '../../rig/util';
import { CamState } from '../../pov/camera';

export type V3 = [number, number, number];
export const D = Math.PI / 180;
export const outCubic = (t: number) => easeOut(t);
export const inOutCubic = (t: number) => easeInOut(t);
export const inOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const inQuad = (t: number) => { const x = clamp(t); return x * x; };
export const seg = (f: number, a: number, b: number, e: (t: number) => number = inOutSine) => e(invLerp(a, b, f));
export const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** global frame, and the offset to convert storyboard frames into this Sequence's local frames */
export function useFrames() {
  const sb = useFilmFrame();
  const local = useCurrentFrame();
  return { sb, off: sb - local };
}

/** piecewise keyframes with a per-segment easing: [{t, v, e?}] (e eases INTO that key) */
export function track(f: number, k: { t: number; v: number; e?: (x: number) => number }[]) {
  if (f <= k[0].t) return k[0].v;
  for (let i = 0; i < k.length - 1; i++) {
    if (f <= k[i + 1].t) return lerp(k[i].v, k[i + 1].v, (k[i + 1].e ?? inOutSine)(invLerp(k[i].t, k[i + 1].t, f)));
  }
  return k[k.length - 1].v;
}

/** colour ramp over frames: [[frame, '#hex'], ...] */
export function colorRamp(f: number, k: [number, string][]) {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) if (f <= k[i + 1][0]) return mixHex(k[i][1], k[i + 1][1], invLerp(k[i][0], k[i + 1][0], f));
  return k[k.length - 1][1];
}

export const toCamLocal = (p: THREE.Vector3, cam: CamState) => p.clone().sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());

/** look-at helper for a camera at `pos` turned by yaw/pitch (degrees) from a base target */
export function aimAt(pos: V3, target: V3) { return target; }
