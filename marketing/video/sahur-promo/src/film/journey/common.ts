// Journey act helpers: easings (storyboard 6.1), frame ranges, the 90 BPM grid, small vector math.
import * as THREE from 'three';
import { clamp, lerp, invLerp, smooth, easeOut, easeInOut, easeIn } from '../../rig/util';

export const ACT0 = 1410; // first global frame of the act (local frame = global - ACT0)
export const D = Math.PI / 180;
export type V3 = [number, number, number];

export const inOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const inOutCubic = (t: number) => easeInOut(t);
export const outCubic = (t: number) => easeOut(t);
export const inQuad = (t: number) => { const x = clamp(t); return x * x; };
export const inCubic = (t: number) => easeIn(t);
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const outBack = (t: number, s = 0.8) => { const x = clamp(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
/** 0..1 over the global frame range [a, b] with an easing */
export const seg = (f: number, a: number, b: number, e: (t: number) => number = smooth) => e(invLerp(a, b, f));
/** a bump: up over [a, b], hold to c, down over [c, d] */
export const bump = (f: number, a: number, b: number, c: number, d: number, e: (t: number) => number = smooth) => seg(f, a, b, e) * (1 - seg(f, c, d, e));
/** a short pulse that peaks at `at` (attack `a` frames, decay `d` frames) */
export const pulseAt = (f: number, at: number, a = 2, d = 8) => (f < at - a || f > at + d ? 0 : f <= at ? 1 - (at - f) / a : 1 - (f - at) / d);
export const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
export const toCamLocal = (p: THREE.Vector3, cam: { position: THREE.Vector3; quaternion: THREE.Quaternion }) => p.clone().sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());
/** yaw (+ = turn LEFT, three.js convention) and pitch (+ = up) to a forward unit vector */
export const dirFromYawPitch = (yaw: number, pitch: number) => new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
/** the storyboard's convention is positive yaw = turn RIGHT; this converts and returns a look target */
export const targetFrom = (pos: V3, yawRightDeg: number, pitchDeg: number, dist = 3): V3 => {
  const d = dirFromYawPitch(-yawRightDeg * D, pitchDeg * D);
  return [pos[0] + d.x * dist, pos[1] + d.y * dist, pos[2] + d.z * dist];
};
export { clamp, lerp, invLerp, smooth };
