// World positions of Sahur's bat and lantern (mirrors the rig's ForearmHand maths; pure).
import * as THREE from 'three';
import { SahurProps, sahurPose, sahurRig } from '../../rig/Sahur';
import { chainMatrix, CHAINS, DIM } from '../../rig/pose';
import { BAT_LEN } from '../../rig/Bat';

/** the bat's frame in world space: origin = knob, +Y toward the tip (unscaled bat units inside) */
export function batMatrix(p: SahurProps): THREE.Matrix4 | null {
  const pose = sahurPose(p);
  const side = pose.batHand;
  if (side === 'none') return null;
  const rig = sahurRig(p);
  let d = new THREE.Vector3(...pose.batDir).normalize();
  if (pose.batTorsoDir) {
    const M = chainMatrix(rig, ['shoulder' + side, 'elbow' + side, 'wrist' + side]);
    const q = new THREE.Quaternion();
    M.decompose(new THREE.Vector3(), q, new THREE.Vector3());
    d = new THREE.Vector3(...pose.batTorsoDir).normalize().applyQuaternion(q.invert());
  }
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.batRoll));
  const hc = new THREE.Vector3(0, -DIM.handR * 0.95, 0);
  const pos = hc.clone().sub(d.clone().multiplyScalar(pose.batGrip));
  const local = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
  const W = chainMatrix(rig, side === 'L' ? CHAINS.handL : CHAINS.handR);
  return W.multiply(local);
}

/** a point along the bat (0 = knob, 1 = tip) in world space */
export function batPoint(p: SahurProps, t: number): THREE.Vector3 {
  const M = batMatrix(p);
  if (!M) return new THREE.Vector3(...(p.position ?? [0, 0, 0]));
  return new THREE.Vector3(0, BAT_LEN * t, 0).applyMatrix4(M);
}

/** the lantern body's centre in world space (hook at the bat tip, hanging world-down; height 0.21 units, cord 1.25) */
export function lanternPoint(p: SahurProps, swing: [number, number] = [0, 0]): THREE.Vector3 {
  const hook = new THREE.Vector3(0, BAT_LEN - 0.04, 0).applyMatrix4(batMatrix(p) ?? new THREE.Matrix4());
  const s = p.scale ?? 1;
  const L = (0.21 * 1.25 + 0.105) * s;
  const down = new THREE.Vector3(0, -L, 0).applyEuler(new THREE.Euler(swing[0], 0, swing[1]));
  return hook.add(down);
}
