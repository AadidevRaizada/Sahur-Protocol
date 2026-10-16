// Pure POV camera model: base position + look target + fov, plus breathing, handheld drift,
// shake impulses, look-up and roll. Deterministic in (frame, fps, props). The same function drives
// <PovCamera> and the screen-projection helper, so DOM overlays line up with the 3D scene.
import * as THREE from 'three';
import { fbm1, clamp } from '../rig/util';

export type Breath = 'calm' | 'scared' | 'running' | 'held';
export type Shake = { frame: number; strength: number; decay?: number };
export type PovCamProps = {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  breath?: Breath;
  /** blend to a second breathing style (0..1) */
  breathB?: Breath;
  breathMix?: number;
  /** handheld noise amplitude multiplier (0 = locked off, 1 = gentle handheld) */
  handheld?: number;
  shake?: Shake[];
  /** extra pitch up in radians */
  lookUp?: number;
  /** extra yaw in radians (+ = turn left) */
  lookSide?: number;
  /** roll in radians */
  roll?: number;
  seed?: number;
};

type BreathSpec = { rate: number; amp: number; pitch: number; jitter: number; sway: number };
const BREATH: Record<Breath, BreathSpec> = {
  calm: { rate: 0.23, amp: 0.006, pitch: 0.006, jitter: 0.0, sway: 0.0 },
  scared: { rate: 0.95, amp: 0.008, pitch: 0.01, jitter: 0.004, sway: 0.002 },
  running: { rate: 2.5, amp: 0.035, pitch: 0.02, jitter: 0.006, sway: 0.03 },
  held: { rate: 0.1, amp: 0.001, pitch: 0.001, jitter: 0.0015, sway: 0 },
};

function breathOffsets(b: Breath, t: number, seed: number) {
  const s = BREATH[b];
  // irregular breathing: rate wobbles a little; scared breathing is shallow and quick with catches
  const ph = t * s.rate * Math.PI * 2 + fbm1(t * 0.4, seed + 3) * 1.2;
  const wave = Math.sin(ph) + 0.25 * Math.sin(ph * 2 + 0.7);
  const y = s.amp * wave;
  const pitch = s.pitch * Math.sin(ph - 0.5);
  const jit = s.jitter;
  return {
    y: y + jit * fbm1(t * 9, seed + 11),
    x: s.sway * Math.sin(ph * 0.5) + jit * fbm1(t * 8, seed + 12),
    pitch: pitch + jit * 2 * fbm1(t * 7, seed + 13),
    yaw: jit * 1.5 * fbm1(t * 6, seed + 14),
    roll: s.sway * 0.4 * Math.sin(ph * 0.5 + 0.3),
  };
}

export type CamState = { position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number };

export function povCamera(frame: number, fps: number, p: PovCamProps): CamState {
  const t = frame / fps;
  const seed = p.seed ?? 7;
  const pos = new THREE.Vector3(...p.position);
  const tgt = new THREE.Vector3(...p.target);

  // breath (optionally blended)
  const b1 = breathOffsets(p.breath ?? 'calm', t, seed);
  let br = b1;
  if (p.breathB) {
    const b2 = breathOffsets(p.breathB, t, seed);
    const k = clamp(p.breathMix ?? 0);
    br = { y: b1.y + (b2.y - b1.y) * k, x: b1.x + (b2.x - b1.x) * k, pitch: b1.pitch + (b2.pitch - b1.pitch) * k, yaw: b1.yaw + (b2.yaw - b1.yaw) * k, roll: b1.roll + (b2.roll - b1.roll) * k };
  }

  // handheld drift: slow fractal noise
  const hh = p.handheld ?? 0.6;
  const hYaw = hh * 0.006 * fbm1(t * 0.55, seed + 21, 3);
  const hPitch = hh * 0.005 * fbm1(t * 0.6, seed + 22, 3);
  const hRoll = hh * 0.004 * fbm1(t * 0.45, seed + 23, 3);

  // shake impulses: decaying noisy oscillation
  let sYaw = 0, sPitch = 0, sRoll = 0, sY = 0;
  for (const s of p.shake ?? []) {
    const dt = (frame - s.frame) / fps;
    if (dt < 0) continue;
    const env = s.strength * Math.exp(-dt / (s.decay ?? 0.18));
    if (env < 1e-5) continue;
    sYaw += env * 0.03 * fbm1(dt * 22, seed + s.frame, 2);
    sPitch += env * 0.03 * fbm1(dt * 24, seed + s.frame + 1, 2);
    sRoll += env * 0.02 * fbm1(dt * 18, seed + s.frame + 2, 2);
    sY += env * 0.01 * fbm1(dt * 20, seed + s.frame + 3, 2);
  }

  // base orientation from lookAt
  const m = new THREE.Matrix4().lookAt(pos, tgt, new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  // local offsets: yaw (Y), pitch (X), roll (Z) in camera space
  const yaw = br.yaw + hYaw + sYaw + (p.lookSide ?? 0);
  const pitch = br.pitch + hPitch + sPitch + (p.lookUp ?? 0);
  const roll = br.roll + hRoll + sRoll + (p.roll ?? 0);
  const qo = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  q.multiply(qo);

  // position offsets in camera space (x right, y up)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  pos.addScaledVector(right, br.x);
  pos.y += br.y + sY;
  return { position: pos, quaternion: q, fov: p.fov ?? 50 };
}

/** project a world point to composition pixels with the given camera state */
export function projectToScreen(world: THREE.Vector3, cam: CamState, width: number, height: number) {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.05, 200);
  c.position.copy(cam.position);
  c.quaternion.copy(cam.quaternion);
  c.updateMatrixWorld(true);
  c.updateProjectionMatrix();
  const v = world.clone().project(c);
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, behind: v.z > 1, depth: world.distanceTo(cam.position) };
}

/** camera-local point (x right, y up, -z forward) -> world */
export function camLocalToWorld(local: [number, number, number], cam: CamState) {
  return new THREE.Vector3(...local).applyQuaternion(cam.quaternion).add(cam.position);
}
