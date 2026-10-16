// 2.5D mapping: the 960x540 arena lies on the floor plane (y = 0), 40 game px per metre, arena centre at the
// origin, +x right, +z toward the viewer (game y grows downward = toward the camera).
import * as THREE from 'three';

export const PX = 40;
export const AW = 960;
export const AH = 540;
export const toX = (x: number) => (x - AW / 2) / PX;
export const toZ = (y: number) => (y - AH / 2) / PX;
export const fromX = (X: number) => X * PX + AW / 2;
export const fromZ = (Z: number) => Z * PX + AH / 2;

const ASPECT = AW / AH;
export const FOV = 34;
/** final elevation of the three-quarter camera (radians above the floor) */
export const ELEV = 0.98;

export type CamSpec = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };

const scratch = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 400);
const v = new THREE.Vector3();

const place = (c: THREE.PerspectiveCamera, s: CamSpec) => {
  c.fov = s.fov;
  c.aspect = ASPECT;
  c.position.copy(s.pos);
  c.up.set(0, 1, 0);
  c.lookAt(s.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
};

const specAt = (el: number, dist: number, tz: number): CamSpec => {
  const target = new THREE.Vector3(0, 0, tz);
  return { pos: new THREE.Vector3(0, Math.sin(el) * dist, tz + Math.cos(el) * dist), target, fov: FOV };
};

// The arena must fit: its floor corners, and the tall things standing on the far edge (the Bubble's top).
const FIT_PTS: [number, number, number][] = [];
for (const sx of [-1, 1]) {
  FIT_PTS.push([sx * 12, 0, 6.75], [sx * 12, 0, -6.75], [sx * 12, 2.6, -6.75]);
}
FIT_PTS.push([0, 4.6, toZ(130)]); // the Bubble's crown at its spawn point

const fits = (s: CamSpec, mx: number, my: number) => {
  place(scratch, s);
  for (const p of FIT_PTS) {
    v.set(p[0], p[1], p[2]).project(scratch);
    if (Math.abs(v.x) > mx || Math.abs(v.y) > my || v.z > 1) return false;
  }
  return true;
};

/** distance that just fits the arena at elevation el, centred vertically by tz (searched) */
const fitFinal = () => {
  let best = { d: 1e9, tz: 0 };
  for (let tz = -1.5; tz <= 2.5; tz += 0.05) {
    let lo = 5, hi = 80;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(specAt(ELEV, mid, tz), 0.985, 0.97)) hi = mid;
      else lo = mid;
    }
    if (hi < best.d) best = { d: hi, tz };
  }
  return best;
};
const FINAL = fitFinal();
/** straight-down camera that frames the arena exactly like the flat 2D canvas */
const TOP_D = AH / 2 / PX / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** tilt 0 = flat top-down (matches the 2D canvas), 1 = the three-quarter fight camera */
export const camAt = (tilt: number): CamSpec => {
  const k = ease(Math.min(1, Math.max(0, tilt)));
  const el = Math.PI / 2 - 1e-4 + (ELEV - Math.PI / 2) * k;
  return specAt(el, TOP_D + (FINAL.d - TOP_D) * k, FINAL.tz * k);
};

// ---- projection for the HUD overlay (game px in, overlay px out) ----
const proj = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 400);
export const setProjCam = (s: CamSpec) => place(proj, s);
setProjCam(camAt(1));

/** arena point (game px) at height h metres -> overlay px (960x540) */
export const project = (x: number, y: number, h = 0) => {
  v.set(toX(x), h, toZ(y)).project(proj);
  return { x: (v.x * 0.5 + 0.5) * AW, y: (-v.y * 0.5 + 0.5) * AH };
};

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
/** overlay px -> arena point on the floor (game px), or null if the ray misses the floor */
export const unproject = (sx: number, sy: number) => {
  ndc.set((sx / AW) * 2 - 1, -((sy / AH) * 2 - 1));
  ray.setFromCamera(ndc, proj);
  const hit = ray.ray.intersectPlane(plane, v);
  if (!hit) return null;
  return { x: fromX(hit.x), y: fromZ(hit.z) };
};
