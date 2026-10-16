// Battle act kit: constants, easings, the fight POV camera and the act-wide shake list.
// Everything is a pure function of the global storyboard frame.
import * as THREE from 'three';
import { clamp, lerp, invLerp, smooth } from '../../rig/util';
import { povCamera, PovCamProps, CamState, Shake } from '../../pov/camera';
import { vMatchFov } from '../context';
import { getInputProps } from 'remotion';

/** dev-only switches passed with stills.mjs --props={"battleDebug":{...}} */
export const DBG = (): Record<string, boolean | number> => ((getInputProps() as Record<string, unknown>).battleDebug as Record<string, boolean | number>) ?? {};

export { clamp, lerp, invLerp, smooth };
export type V3 = [number, number, number];
export const D = Math.PI / 180;
export const FPS = 60;
/** Sahur's world scale (same as the bedroom: 1.88 m tall, he looms over the 1.05 m POV) */
export const SS = 0.62;
export const EYE = 1.05;

// ---------- easings (storyboard 6.1) ----------
export const outCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const inCubic = (t: number) => Math.pow(clamp(t), 3);
export const inOutCubic = (t: number) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const outExpo = (t: number) => { const x = clamp(t); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
export const inExpo = (t: number) => { const x = clamp(t); return x <= 0 ? 0 : Math.pow(2, 10 * x - 10); };
export const inOutExpo = (t: number) => { const x = clamp(t); if (x <= 0) return 0; if (x >= 1) return 1; return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
export const inQuad = (t: number) => { const x = clamp(t); return x * x; };
export const outQuad = (t: number) => { const x = clamp(t); return 1 - (1 - x) * (1 - x); };
export const inOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const outBack = (t: number, s = 1.2) => { const x = clamp(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };

/** eased 0..1 over frames [a, b] */
export const seg = (f: number, a: number, b: number, e: (t: number) => number = smooth) => e(invLerp(a, b, f));
/** 0 → 1 → 0 window: up over [a, b], down over [c, d] */
export const win = (f: number, a: number, b: number, c: number, d: number) => Math.min(invLerp(a, b, f), 1 - invLerp(c, d, f));
/** a spike at `at` that decays exponentially (frames) */
export const spike = (f: number, at: number, decay: number) => (f < at ? 0 : Math.exp(-(f - at) / Math.max(0.001, decay)));
export const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** keyframed value with a per-segment easing */
export function track(f: number, k: [number, number][], e: (t: number) => number = smooth) {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) if (f <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], e(invLerp(k[i][0], k[i + 1][0], f)));
  return k[k.length - 1][1];
}

// ---------- shakes (storyboard values: frame, peak deg, decay f) ----------
const SHAKE_DEF: [number, number, number][] = [
  [2414, 0.8, 10], [2496, 1.4, 24], [2504, 0.4, 8], [2512, 0.35, 8], [2576, 1.0, 12],
  [2600, 0.8, 12], [2604, 0.45, 10], [2648, 1.0, 12], [2688, 1.6, 26], [2740, 0.25, 6],
  [2772, 1.1, 12], [2774, 0.6, 10], [2816, 1.2, 16], [2846, 0.4, 8], [2880, 1.8, 28], [2886, 0.6, 14],
  [2904, 0.45, 10], [2958, 1.0, 14], [2962, 0.3, 6], [2966, 0.3, 6], [2970, 0.3, 6],
];
/** povCamera shake list. strength ≈ peak × 1.4 (fbm averages ~0.5), decay = a time constant in seconds */
export const SHAKES: Shake[] = SHAKE_DEF.map(([frame, peak, dec]) => ({ frame, strength: peak * 1.4, decay: (dec / FPS) * 0.45 }));

// ---------- the fight POV ----------
export type ShotCam = {
  pos: V3;
  look: V3;
  /** 16:9 vertical FOV (degrees) */
  fov: number;
  /** running bob on the 150 BPM beat (0..1) */
  run?: number;
  /** extra roll (deg), yaw (deg, + = turn RIGHT as in the storyboard), pitch (deg, + = up) */
  roll?: number;
  yaw?: number;
  pitch?: number;
  handheld?: number;
  /** vertical overrides (storyboard 9) */
  vYaw?: number;
  vDolly?: number;
  /** vertical fov override (else V-match) */
  vFov?: number;
  noShake?: boolean;
};

/** Build the povCamera props for a shot at frame f. `v` = vertical render. */
export function camProps(f: number, s: ShotCam, v: boolean, shake = true): PovCamProps {
  let pos = s.pos;
  const look = s.look;
  if (v && s.vDolly) {
    const d = new THREE.Vector3(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize();
    pos = [pos[0] - d.x * s.vDolly, pos[1] - d.y * s.vDolly, pos[2] - d.z * s.vDolly];
  }
  const run = s.run ?? 0;
  // the beat-locked bob: down on every beat (2400 + 24k), roll alternating per step
  const ph = ((f - 2400) / 24) * Math.PI * 2;
  const bobY = run * (0.025 * Math.cos(ph) - 0.01);
  const bobRoll = run * 1.5 * D * Math.sin(ph / 2);
  return {
    position: [pos[0], pos[1] + bobY, pos[2]],
    target: [look[0], look[1] + bobY * 0.5, look[2]],
    fov: v ? s.vFov ?? vMatchFov(s.fov) : s.fov,
    breath: run > 0.5 ? 'running' : 'held',
    handheld: s.handheld ?? (run > 0.5 ? 1.0 : 0.6),
    shake: shake && !s.noShake ? SHAKES : [],
    // storyboard convention: + yaw turns RIGHT (povCamera's lookSide is + = left)
    lookSide: -((s.yaw ?? 0) + (v ? s.vYaw ?? 0 : 0)) * D,
    lookUp: (s.pitch ?? 0) * D,
    roll: (s.roll ?? 0) * D + bobRoll,
    seed: 11,
  };
}

export const camAt = (f: number, s: ShotCam, v: boolean, shake = true): CamState => povCamera(f, FPS, camProps(f, s, v, shake));

/** Screen-space motion of the background between f-1 and f (for the motion-blur effect), in uv units. */
export function camBlur(prev: CamState, cur: CamState, aspect: number, shutter = 0.5) {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(prev.quaternion);
  const P = prev.position.clone().addScaledVector(fwd, 20);
  const c = new THREE.PerspectiveCamera(cur.fov, aspect, 0.05, 200);
  c.position.copy(cur.position);
  c.quaternion.copy(cur.quaternion);
  c.updateMatrixWorld(true);
  c.updateProjectionMatrix();
  const n = P.project(c);
  const dx = n.x * 0.5 * shutter, dy = n.y * 0.5 * shutter;
  const L = Math.hypot(dx, dy);
  const k = L > 0.22 ? 0.22 / L : 1;
  // ignore sub-pixel jitter
  return L < 0.0015 ? ([0, 0] as [number, number]) : ([dx * k, dy * k] as [number, number]);
}

/** world point → pixel coords for DOM overlays */
export function toScreen(p: THREE.Vector3 | V3, cam: CamState, w: number, h: number) {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.05, 300);
  c.position.copy(cam.position);
  c.quaternion.copy(cam.quaternion);
  c.updateMatrixWorld(true);
  c.updateProjectionMatrix();
  const v = (Array.isArray(p) ? new THREE.Vector3(...p) : p.clone()).project(c);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
}
