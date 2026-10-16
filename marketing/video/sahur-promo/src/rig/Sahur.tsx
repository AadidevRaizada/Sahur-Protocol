// Tung Tung Tung Sahur, the 3D hero. A tapered carved log with a face, peg limbs, mitten hands,
// chunky feet and a bat. Everything is a pure function of props (and the frame for glitch flicker).
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodSide, woodRings } from './wood';
import { Bat, BAT_LEN } from './Bat';
import { Lantern, LanternProps } from './Lantern';
import { lerp, hash1, clamp } from './util';
import {
  DIM, logY1, logR, Pose, PoseName, ArmPose, BatHand, V3, Rig,
  resolvePose, mixPose, swingPose, walkPose, runPose, solveRig, chainMatrix, CHAINS, HEAD_TOP, FACE_CENTER,
} from './pose';
import { Expr, ExprName, MouthName, resolveExpr, mixExpr, finalExpr } from './expressions';
import { makeGhostMaterial, makeStaticSwapMaterial, makeGlitchSlices } from './glitch';
import { addCracks } from './cracks';
import { PAL } from '../lib/palette';

export { HEAD_TOP, FACE_CENTER };
export type { PoseName, ExprName, MouthName };

export type SahurProps = {
  position?: V3;
  /** yaw in radians (0 = facing +Z) */
  turn?: number;
  scale?: number;
  pose?: PoseName | Pose;
  poseB?: PoseName | Pose;
  poseMix?: number;
  /** 0 ready -> 0.35 wind-up -> 0.55 strike -> 1 follow-through. Overrides the pose by swingMix (default 1). */
  swing?: number;
  swingMix?: number;
  /** walk phase in cycles (1 = two steps). walkAmount 0..1 */
  walk?: number;
  walkAmount?: number;
  /** idle breathing phase in cycles (pass frame / fps * 0.4 for a slow breath) */
  breathe?: number;
  lean?: number;
  tilt?: number;
  expression?: ExprName | Expr;
  expressionB?: ExprName | Expr;
  exprMix?: number;
  blink?: number;
  /** gaze [x, y]: +x = toward his left (viewer's right when he faces you), +y = up */
  look?: [number, number];
  mouth?: MouthName;
  /** 0..1 extra mouth opening for talking */
  talk?: number;
  /** 0..1 static/glitch on one forearm + hand */
  glitch?: number;
  glitchArm?: 'L' | 'R';
  seed?: number;
  bat?: boolean;
  batHand?: BatHand;
  armL?: Partial<ArmPose>;
  armR?: Partial<ArmPose>;
  castShadow?: boolean;
  /** hang the paper lantern from the bat tip (true or lantern props) */
  lantern?: boolean | (LanternProps & { swing?: [number, number] });
  /** run cycle phase in cycles (like walk), runAmount 0..1 */
  run?: number;
  runAmount?: number;
  /** 0..3 continuous: 1 hairline, 2 three spreading cracks, 3 fully cracked; amber glow in the cracks */
  cracks?: number;
  /** 0..1 internal amber light (PointLight up to ~600 cd) leaking through the cracks */
  innerLight?: number;
  /** wood-chip burst: t 0..1 through the burst (about 0.7 s), from a torso-local origin */
  chips?: { t: number; seed?: number; count?: number; origin?: V3 };
};

// ---------------- pose + anchors (pure) ----------------
export function sahurPose(p: SahurProps): Pose {
  let pose = resolvePose(p.pose);
  if (p.poseB !== undefined) pose = mixPose(pose, resolvePose(p.poseB), clamp(p.poseMix ?? 0));
  if (p.swing !== undefined) pose = mixPose(pose, swingPose(p.swing), clamp(p.swingMix ?? 1));
  if (p.walk !== undefined && (p.walkAmount ?? 1) > 0) pose = walkPose(pose, p.walk, p.walkAmount ?? 1);
  if (p.run !== undefined && (p.runAmount ?? 1) > 0) pose = runPose(pose, p.run, p.runAmount ?? 1);
  if (p.breathe !== undefined) {
    const a = p.breathe * Math.PI * 2;
    pose = { ...pose, bodyY: pose.bodyY + 0.012 * Math.sin(a), lean: pose.lean + 0.012 * Math.sin(a - 0.6), tilt: pose.tilt + 0.006 * Math.sin(a * 0.5) };
  }
  if (p.armL) pose = { ...pose, armL: { ...pose.armL, ...p.armL } };
  if (p.armR) pose = { ...pose, armR: { ...pose.armR, ...p.armR } };
  if (p.batHand && p.batHand !== pose.batHand) {
    const flip = pose.batHand !== 'none' && p.batHand !== 'none';
    const td = pose.batTorsoDir;
    pose = { ...pose, batHand: p.batHand, batDir: flip ? [-pose.batDir[0], pose.batDir[1], pose.batDir[2]] : pose.batDir, batTorsoDir: td && flip ? [-td[0], td[1], td[2]] : td };
  }
  return pose;
}
export function sahurRig(p: SahurProps): Rig {
  return solveRig(sahurPose(p), { position: p.position, turn: p.turn, scale: p.scale }, { lean: p.lean, tilt: p.tilt });
}
export type AnchorName = 'headTop' | 'faceCenter' | 'eyes' | 'mouth' | 'handL' | 'handR' | 'chest';
/** World position of an anchor on the posed Sahur. `offset` is in his torso frame (unscaled units). */
export function sahurPoint(p: SahurProps, which: AnchorName, offset: V3 = [0, 0, 0]): THREE.Vector3 {
  const rig = sahurRig(p);
  let chain = CHAINS.torso;
  let local: V3 = [0, 0, 0];
  switch (which) {
    case 'headTop': local = [0, logY1, 0]; break;
    case 'faceCenter': local = [0, 1.6, logR(1.6)]; break;
    case 'eyes': local = [0, DIM.eyeY, logR(DIM.eyeY)]; break;
    case 'mouth': local = [0, DIM.mouthY, logR(DIM.mouthY)]; break;
    case 'chest': local = [0, 1.0, logR(1.0)]; break;
    case 'handL': chain = CHAINS.handL; local = [0, -DIM.handR * 0.95, 0]; break;
    case 'handR': chain = CHAINS.handR; local = [0, -DIM.handR * 0.95, 0]; break;
  }
  const M = chainMatrix(rig, chain);
  return new THREE.Vector3(local[0] + offset[0], local[1] + offset[1], local[2] + offset[2]).applyMatrix4(M);
}

// ---------------- geometry (module cache) ----------------
const D = Math.PI / 180;
const EYE_SINK = 0.064;
let G: ReturnType<typeof buildGeos> | null = null;
function buildGeos() {
  // log body: lathe with rounded bevels; seam at the back (phiStart = PI); v re-mapped by arc length
  const pts: THREE.Vector2[] = [];
  const { logY0, logH, rBot, rTop, bevel } = DIM;
  const y1 = logY0 + logH;
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(rBot - bevel + Math.sin(a) * bevel, logY0 + bevel - Math.cos(a) * bevel)); }
  const n = 48;
  for (let i = 1; i < n; i++) {
    const y = logY0 + bevel + ((logH - 2 * bevel) * i) / n;
    // a hint of organic irregularity
    const r = logR(y) * (1 + 0.006 * Math.sin(y * 5.3 + 1.1) + 0.004 * Math.sin(y * 11.7));
    pts.push(new THREE.Vector2(r, y));
  }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(rTop - bevel + Math.cos(a) * bevel, y1 - bevel + Math.sin(a) * bevel)); }
  const log = new THREE.LatheGeometry(pts, 112, Math.PI, Math.PI * 2);
  // arc-length v
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const uv = log.attributes.uv as THREE.BufferAttribute;
  const segs = 112;
  for (let i = 0; i <= segs; i++) for (let j = 0; j < pts.length; j++) uv.setY(i * pts.length + j, L[j] / L[L.length - 1]);
  uv.needsUpdate = true;

  const cap = new THREE.CircleGeometry(rTop - bevel + 0.004, 72);
  const capBot = new THREE.CircleGeometry(rBot - bevel + 0.004, 48);

  const unitSphere = new THREE.SphereGeometry(1, 40, 28);
  const upperArm = new THREE.CapsuleGeometry(DIM.armR, DIM.upper, 8, 16);
  const foreArm = new THREE.CapsuleGeometry(DIM.armR * 0.95, DIM.fore, 8, 16);
  const thigh = new THREE.CapsuleGeometry(DIM.legR, DIM.thigh, 8, 16);
  const shin = new THREE.CapsuleGeometry(DIM.legR * 0.95, DIM.shin, 8, 16);
  const thumb = new THREE.CapsuleGeometry(0.04, 0.055, 6, 12);
  const foot = new RoundedBoxGeometry(0.28, 0.14, 0.43, 4, 0.065);

  // eye parts
  const R = DIM.eyeR;
  const sclera = new THREE.SphereGeometry(R, 48, 32);
  const iris = new THREE.SphereGeometry(R * 1.004, 48, 12, 0, Math.PI * 2, 0, 0.56);
  const lidUp = new THREE.SphereGeometry(R * 1.075, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const lidLo = new THREE.SphereGeometry(R * 1.07, 48, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const lidEdgeUp = new THREE.TorusGeometry(R * 1.075, 0.0125, 10, 64);
  const lidEdgeLo = new THREE.TorusGeometry(R * 1.07, 0.01, 10, 64);
  const socket = new THREE.TorusGeometry(Math.sqrt(R * R - EYE_SINK * EYE_SINK) + 0.004, 0.0075, 8, 56);
  const socketRim = new THREE.TorusGeometry(Math.sqrt(R * R - EYE_SINK * EYE_SINK) + 0.02, 0.017, 12, 56);

  // brow: tapered, arched capsule lying along +X (outer end at +X, arch up)
  const brow = new THREE.CapsuleGeometry(0.037, 0.17, 8, 16);
  {
    const p = brow.attributes.position as THREE.BufferAttribute;
    const half = 0.17 / 2 + 0.037;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y / half;
      const taper = 1 - 0.38 * clamp((t + 1) / 2);
      x *= taper * 1.05; z *= taper * 0.75;
      x -= 0.03 * (1 - t * t);
      p.setXYZ(i, x, y, z);
    }
    brow.rotateZ(-Math.PI / 2);
    brow.computeVertexNormals();
  }

  // nose: lathe along -Y from the root, with a bulb at the tip. Points ordered tip -> root (ascending y)
  // so the lathe normals face outward.
  const nose = (() => {
    const p: THREE.Vector2[] = [];
    const len = 0.31;
    const rr = (s: number) => 0.034 + 0.03 * Math.exp(-Math.pow((s - 0.255) / 0.055, 2)) - 0.004 * Math.exp(-Math.pow((s - 0.12) / 0.05, 2)) + 0.012 * Math.exp(-Math.pow(s / 0.04, 2));
    const rEnd = rr(len);
    for (let i = 8; i >= 1; i--) { const a = (i / 8) * (Math.PI / 2); p.push(new THREE.Vector2(Math.cos(a) * rEnd, -len - Math.sin(a) * rEnd * 0.95)); }
    for (let i = 24; i >= 0; i--) { const s = (i / 24) * len; p.push(new THREE.Vector2(rr(s), -s)); }
    p.push(new THREE.Vector2(rr(0) * 0.6, 0.03));
    p.push(new THREE.Vector2(0.0, 0.035));
    return new THREE.LatheGeometry(p, 36);
  })();

  // iris texture: v=1 at the pole (pupil) to v=0 at the limbus
  return { log, cap, capBot, unitSphere, upperArm, foreArm, thigh, shin, thumb, foot, sclera, iris, lidUp, lidLo, lidEdgeUp, lidEdgeLo, socket, socketRim, brow, nose };
}
const geos = () => (G ??= buildGeos());

let IRIS_TEX: THREE.CanvasTexture | null = null;
const irisTex = () => {
  if (IRIS_TEX) return IRIS_TEX;
  const c = document.createElement('canvas'); c.width = 8; c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 128); // top = pole
  gr.addColorStop(0, '#2b1709'); gr.addColorStop(0.35, '#5a3214'); gr.addColorStop(0.7, '#7a4a1e'); gr.addColorStop(0.86, '#3d200c'); gr.addColorStop(1, '#140904');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  IRIS_TEX = new THREE.CanvasTexture(c); IRIS_TEX.colorSpace = THREE.SRGBColorSpace;
  return IRIS_TEX;
};

// ---------------- materials (per component instance) ----------------
function useSahurMaterials() {
  return useMemo(() => {
    const side = woodSide({ seed: 7 });
    const limb = woodSide({ seed: 31, w: 256, h: 512, lines: 28, knots: 0, faceSafe: false, endDark: 0.0 });
    const rings = woodRings(11);
    const wood = new THREE.MeshPhysicalMaterial({ map: side.map, bumpMap: side.bump, bumpScale: 1.4, roughness: 0.56, clearcoat: 0.14, clearcoatRoughness: 0.5 });
    const crackU = addCracks(wood);
    const cap = new THREE.MeshPhysicalMaterial({ map: rings.map, bumpMap: rings.bump, bumpScale: 1.6, roughness: 0.66, clearcoat: 0.08, clearcoatRoughness: 0.6 });
    const limbM = new THREE.MeshPhysicalMaterial({ map: limb.map, bumpMap: limb.bump, bumpScale: 0.8, roughness: 0.55, clearcoat: 0.14, clearcoatRoughness: 0.5 });
    const joint = new THREE.MeshPhysicalMaterial({ map: limb.map, color: '#d9b393', roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: '#3f1f0b', roughness: 0.62 });
    const brow = new THREE.MeshPhysicalMaterial({ map: limb.map, color: '#5a3216', roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 });
    const lid = new THREE.MeshPhysicalMaterial({ map: limb.map, color: '#f0dcc8', roughness: 0.55, clearcoat: 0.12 });
    const socketM = new THREE.MeshStandardMaterial({ color: '#4a250e', roughness: 0.6 });
    const rim = new THREE.MeshPhysicalMaterial({ map: limb.map, color: '#c9a07c', roughness: 0.6, clearcoat: 0.1 });
    const sclera = new THREE.MeshPhysicalMaterial({ color: '#f1e5c6', roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const iris = new THREE.MeshPhysicalMaterial({ map: irisTex(), roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.1 });
    const pupil = new THREE.MeshPhysicalMaterial({ color: '#070302', roughness: 0.15, clearcoat: 1 });
    const catchL = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false });
    const mouth = new THREE.MeshStandardMaterial({ color: '#241009', roughness: 0.75 });
    const mouthIn = new THREE.MeshStandardMaterial({ color: '#130603', roughness: 0.9, side: THREE.DoubleSide });
    const ghostR = makeGhostMaterial('#ff2a6a');
    const ghostC = makeGhostMaterial('#35e8ff');
    const stat = makeStaticSwapMaterial();
    const gSlice = makeGlitchSlices(limbM);
    return { crackU, gSlice, wood, cap, limb: limbM, joint, dark, socketM, rim, brow, lid, sclera, iris, pupil, catchL, mouth, mouthIn, ghostR, ghostC, stat };
  }, []);
}
type Mats = ReturnType<typeof useSahurMaterials>;

const nodeProps = (rig: Rig, n: string) => {
  const node = rig[n];
  return { position: node.p, rotation: [node.r[0], node.r[1], node.r[2], node.o ?? 'XYZ'], scale: node.s ?? 1 } as any;
};

// ---------------- face ----------------
const surfZ = (x: number, y: number) => Math.sqrt(Math.max(0, logR(y) ** 2 - x * x));

const Eye: React.FC<{ side: 1 | -1; e: Expr; m: Mats }> = ({ side, e, m }) => {
  const g = geos();
  const R = DIM.eyeR;
  const x = side * DIM.eyeX, y = DIM.eyeY;
  const r = logR(y);
  const z = surfZ(x, y) - EYE_SINK;
  const yaw = Math.asin(x / r) * 0.6;
  const up = lerp(64, -30, clamp(e.lidUpper + (side === 1 ? e.lidAsym ?? 0 : 0))) * D;
  const lo = lerp(-62, -14, clamp(e.lidLower)) * D;
  const upEdge = Math.max(up, lo + 3 * D);
  const tilt = -side * e.lidTilt;
  const pupilGeo = useMemo(() => new THREE.SphereGeometry(R * 1.008, 40, 8, 0, Math.PI * 2, 0, 0.26 * e.pupil), [Math.round(e.pupil * 100)]);
  const cl = new THREE.Vector3(-0.34, 0.44, 0.83).normalize();
  const clQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cl);
  const cl2 = new THREE.Vector3(0.3, -0.22, 0.93).normalize();
  const cl2Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cl2);
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={g.sclera} material={m.sclera} />
      <mesh geometry={g.socket} material={m.socketM} position={[0, 0, EYE_SINK]} />
      <mesh geometry={g.socketRim} material={m.rim} position={[0, 0, EYE_SINK - 0.006]} scale={[1, 1, 0.7]} receiveShadow />
      <group rotation={[-e.look[1], e.look[0], 0]}>
        <mesh geometry={g.iris} material={m.iris} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={pupilGeo} material={m.pupil} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      {/* catch-lights live in the head frame: they reflect the key light, not the gaze */}
      <mesh geometry={g.unitSphere} material={m.catchL} position={cl.clone().multiplyScalar(R * 1.012).toArray()} quaternion={clQ} scale={[R * 0.17, R * 0.2, R * 0.04]} />
      <mesh geometry={g.unitSphere} material={m.catchL} position={cl2.clone().multiplyScalar(R * 1.012).toArray()} quaternion={cl2Q} scale={[R * 0.07, R * 0.07, R * 0.03]} />
      <group rotation={[0, 0, tilt]}>
        <group rotation={[-upEdge, 0, 0]}>
          <mesh geometry={g.lidUp} material={m.lid} castShadow />
          <mesh geometry={g.lidEdgeUp} material={m.dark} rotation={[Math.PI / 2, 0, 0]} />
        </group>
        <group rotation={[-lo, 0, 0]}>
          <mesh geometry={g.lidLo} material={m.lid} />
          <mesh geometry={g.lidEdgeLo} material={m.dark} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </group>
  );
};

const Brow: React.FC<{ side: 1 | -1; e: Expr; m: Mats }> = ({ side, e, m }) => {
  const g = geos();
  const x = side * 0.168;
  const y = DIM.eyeY + DIM.eyeR + 0.038 + e.browRaise;
  const z = surfZ(x, y) + 0.01;
  const yaw = Math.asin(x / logR(y));
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={g.brow} material={m.brow} rotation={[0, 0, -side * e.browAngle]} scale={[side, 1, 1]} castShadow />
    </group>
  );
};

const Nose: React.FC<{ m: Mats }> = ({ m }) => {
  const g = geos();
  const y = DIM.noseY;
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -0.76, 0.65).normalize()), []);
  return <mesh geometry={g.nose} material={m.limb} position={[0, y, surfZ(0, y) - 0.035]} quaternion={q} castShadow receiveShadow />;
};

function mouthGeometry(e: Expr) {
  const w = 0.25 * e.width;
  const openH = clamp(e.open) * 0.14;
  const base = (x: number) => {
    const u = (2 * x) / w;
    return DIM.mouthY + e.curve * 0.042 * (u * u - 0.4) + e.wobble * 0.011 * Math.sin(u * Math.PI * 1.5 + 0.6);
  };
  const N = 28;
  const wrap = (x: number, y: number, out = 0.003) => new THREE.Vector3(x, y, surfZ(x, y) + out);
  if (openH < 0.012) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= N; i++) { const x = -w / 2 + (w * i) / N; pts.push(wrap(x, base(x))); }
    const curve = new THREE.CatmullRomCurve3(pts);
    return { tube: new THREE.TubeGeometry(curve, 64, 0.0135, 10, false), fill: null as THREE.BufferGeometry | null, ends: [pts[0], pts[pts.length - 1]] };
  }
  const loop: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const x = -w / 2 + (w * i) / N; const k = Math.sqrt(Math.max(0, 1 - ((2 * x) / w) ** 2)); loop.push(new THREE.Vector2(x, base(x) + openH * 0.42 * k)); }
  for (let i = N - 1; i >= 1; i--) { const x = -w / 2 + (w * i) / N; const k = Math.sqrt(Math.max(0, 1 - ((2 * x) / w) ** 2)); loop.push(new THREE.Vector2(x, base(x) - openH * 0.58 * k)); }
  const curve = new THREE.CatmullRomCurve3(loop.map((p) => wrap(p.x, p.y)), true);
  const shape = new THREE.Shape(loop);
  const fill = new THREE.ShapeGeometry(shape, 12);
  const pa = fill.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) pa.setZ(i, surfZ(pa.getX(i), pa.getY(i)) - 0.004);
  fill.computeVertexNormals();
  return { tube: new THREE.TubeGeometry(curve, 96, 0.015, 10, true), fill, ends: [] as THREE.Vector3[] };
}

const Mouth: React.FC<{ e: Expr; m: Mats }> = ({ e, m }) => {
  const key = [e.width, e.open, e.curve, e.wobble].map((v) => Math.round(v * 200)).join(':');
  const geo = useMemo(() => mouthGeometry(e), [key]);
  const g = geos();
  return (
    <group>
      <mesh geometry={geo.tube} material={m.mouth} />
      {geo.fill && <mesh geometry={geo.fill} material={m.mouthIn} />}
      {geo.ends.map((p, i) => <mesh key={i} geometry={g.unitSphere} material={m.mouth} position={p.toArray()} scale={0.0135} />)}
    </group>
  );
};

const Face: React.FC<{ e: Expr; m: Mats }> = ({ e, m }) => (
  <group>
    <Eye side={1} e={e} m={m} />
    <Eye side={-1} e={e} m={m} />
    <Brow side={1} e={e} m={m} />
    <Brow side={-1} e={e} m={m} />
    <Nose m={m} />
    <Mouth e={e} m={m} />
  </group>
);

// ---------------- limbs ----------------
const Hand: React.FC<{ side: 'L' | 'R'; grip: number; m: Mats; mat?: THREE.Material; shadow: boolean }> = ({ side, grip, m, mat, shadow }) => {
  const g = geos();
  const sg = side === 'L' ? 1 : -1;
  const hr = DIM.handR;
  const k = clamp(grip);
  const sx = lerp(0.5, 0.8, k), sy = lerp(1.42, 1.0, k), sz = lerp(1.08, 0.98, k);
  const cy = -hr * lerp(1.22, 0.95, k);
  return (
    <group>
      <mesh geometry={g.unitSphere} material={mat ?? m.limb} position={[0, cy, 0]} scale={[hr * sx, hr * sy, hr * sz]} castShadow={shadow} receiveShadow />
      <mesh geometry={g.thumb} material={mat ?? m.limb}
        position={[-sg * hr * lerp(0.12, 0.3, k), cy + hr * lerp(0.42, 0.18, k), hr * lerp(0.86, 0.72, k)]}
        rotation={[lerp(-0.55, -1.45, k), 0, -sg * lerp(0.55, 0.25, k)]} castShadow={shadow} />
      {/* wrist cuff: hides the forearm/hand seam */}
      <mesh geometry={g.unitSphere} material={mat ?? m.joint} position={[0, -0.005, 0]} scale={[0.08, 0.07, 0.08]} />
    </group>
  );
};

type LanternOpt = SahurProps['lantern'];
const ForearmHand: React.FC<{ side: 'L' | 'R'; rig: Rig; pose: Pose; m: Mats; mat?: THREE.Material; withBat: boolean; shadow: boolean; lantern?: LanternOpt; frame?: number }> = ({ side, rig, pose, m, mat, withBat, shadow, lantern, frame = 0 }) => {
  const g = geos();
  const a = side === 'L' ? pose.armL : pose.armR;
  const batQ = (() => {
    let d = new THREE.Vector3(...pose.batDir).normalize();
    if (pose.batTorsoDir) {
      // convert a torso-frame direction into this hand's frame
      const M = chainMatrix(rig, ['shoulder' + side, 'elbow' + side, 'wrist' + side]);
      const q = new THREE.Quaternion();
      M.decompose(new THREE.Vector3(), q, new THREE.Vector3());
      d = new THREE.Vector3(...pose.batTorsoDir).normalize().applyQuaternion(q.invert());
    }
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.batRoll);
    return { q: q.multiply(roll), d };
  })();
  const hc = new THREE.Vector3(0, -DIM.handR * 0.95, 0);
  const batPos = hc.clone().sub(batQ.d.clone().multiplyScalar(pose.batGrip));
  // lantern hangs world-down from the bat tip: undo the chain's rotation, then apply the swing
  let lanternQ: THREE.Quaternion | null = null;
  const lo = lantern ? (typeof lantern === 'object' ? lantern : {}) : null;
  if (withBat && lo) {
    const M = chainMatrix(rig, side === 'L' ? CHAINS.handL : CHAINS.handR);
    const qw = new THREE.Quaternion();
    M.decompose(new THREE.Vector3(), qw, new THREE.Vector3());
    qw.multiply(batQ.q);
    const sw = lo.swing ?? [0.06 * Math.sin(frame * 0.045), 0.08 * Math.sin(frame * 0.031 + 1)];
    lanternQ = qw.invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sw[0], 0, sw[1])));
  }
  return (
    <group>
      <mesh geometry={g.unitSphere} material={mat ?? m.joint} scale={0.088} castShadow={shadow} />
      <mesh geometry={g.foreArm} material={mat ?? m.limb} position={[0, -DIM.fore / 2, 0]} castShadow={shadow} receiveShadow />
      <group {...nodeProps(rig, 'wrist' + side)}>
        <Hand side={side} grip={a.grip} m={m} mat={mat} shadow={shadow} />
        {withBat && (
          <group position={batPos.toArray()} quaternion={batQ.q}>
            <Bat castShadow={shadow} />
            {lanternQ && lo && (
              <group position={[0, BAT_LEN - 0.04, 0]} quaternion={lanternQ}>
                <Lantern height={0.21} {...lo} />
              </group>
            )}
          </group>
        )}
      </group>
    </group>
  );
};

const Arm: React.FC<{ side: 'L' | 'R'; rig: Rig; pose: Pose; m: Mats; bat: boolean; glitch: number; frame: number; seed: number; shadow: boolean; lantern?: LanternOpt }> = ({ side, rig, pose, m, bat, glitch, frame, seed, shadow, lantern }) => {
  const g = geos();
  const withBat = bat && pose.batHand === side;
  const gl = clamp(glitch);
  // glitch states, re-rolled every 2 frames: wood with a tear, a static texture swap, a dropped frame
  const step = Math.floor(frame / 2);
  const roll = hash1(step, seed + 5);
  const drop = gl > 0 && roll < 0.12 * gl;
  const swap = gl > 0 && !drop && roll < 0.55 * gl;
  const ghostOn = gl > 0.2 && hash1(step, seed + 13) < 0.85 * gl;
  const jx = gl > 0 && hash1(step, seed + 7) < 0.6 * gl ? (hash1(step, seed + 9) - 0.5) * 0.08 * gl : 0;
  const jy = gl > 0 && hash1(step, seed + 3) < 0.25 * gl ? (hash1(step, seed + 4) - 0.5) * 0.03 * gl : 0;
  if (gl > 0) {
    m.ghostR.opacity = (drop ? 0.7 : 0.45) * gl;
    m.ghostC.opacity = (drop ? 0.7 : 0.45) * gl;
    m.stat.uniforms.uFrame.value = frame;
    m.stat.uniforms.uAmt.value = gl;
    m.gSlice.uniforms.uFrame.value = frame;
    m.gSlice.uniforms.uAmt.value = gl;
  }
  const split = 0.035 * gl * (0.6 + hash1(step, seed + 11));
  const realMat = gl > 0 ? (swap ? m.stat : m.gSlice.material) : undefined;
  return (
    <group {...nodeProps(rig, 'shoulder' + side)}>
      <mesh geometry={g.unitSphere} material={m.joint} scale={0.1} castShadow={shadow} />
      <mesh geometry={g.upperArm} material={m.limb} position={[0, -DIM.upper / 2, 0]} castShadow={shadow} receiveShadow />
      <group {...nodeProps(rig, 'elbow' + side)}>
        <group position={[jx, jy, 0]} visible={!drop}>
          <ForearmHand side={side} rig={rig} pose={pose} m={m} mat={realMat} withBat={withBat} shadow={shadow} lantern={lantern} frame={frame} />
        </group>
        {ghostOn && <group position={[jx + split, jy, 0.006]}><ForearmHand side={side} rig={rig} pose={pose} m={m} mat={m.ghostR} withBat={false} shadow={false} /></group>}
        {ghostOn && <group position={[jx - split, jy, -0.006]}><ForearmHand side={side} rig={rig} pose={pose} m={m} mat={m.ghostC} withBat={false} shadow={false} /></group>}
      </group>
    </group>
  );
};

const Leg: React.FC<{ side: 'L' | 'R'; rig: Rig; m: Mats; shadow: boolean }> = ({ side, rig, m, shadow }) => {
  const g = geos();
  return (
    <group {...nodeProps(rig, 'hip' + side)}>
      <mesh geometry={g.unitSphere} material={m.joint} scale={DIM.hipR} castShadow={shadow} />
      <mesh geometry={g.thigh} material={m.limb} position={[0, -DIM.thigh / 2, 0]} castShadow={shadow} receiveShadow />
      <group {...nodeProps(rig, 'knee' + side)}>
        <mesh geometry={g.unitSphere} material={m.joint} scale={DIM.kneeR} castShadow={shadow} />
        <mesh geometry={g.shin} material={m.limb} position={[0, -DIM.shin / 2, 0]} castShadow={shadow} receiveShadow />
        <group {...nodeProps(rig, 'ankle' + side)}>
          <mesh geometry={g.unitSphere} material={m.joint} scale={0.085} castShadow={shadow} />
          <mesh geometry={g.foot} material={m.limb} position={[0, -DIM.ankleH + 0.07, 0.08]} castShadow={shadow} receiveShadow />
          {[-1, 0, 1].map((t) => (
            <mesh key={t} geometry={g.unitSphere} material={m.limb} position={[t * 0.086, -DIM.ankleH + 0.048, 0.29 - Math.abs(t) * 0.025]} scale={[0.055, 0.05, 0.065]} castShadow={shadow} />
          ))}
        </group>
      </group>
    </group>
  );
};

// ---------------- wood chips ----------------
const Chips: React.FC<{ t: number; seed?: number; count?: number; origin?: V3; m: Mats }> = ({ t, seed = 5, count = 18, origin = [-0.12, 1.95, 0.38], m }) => {
  const g = geos();
  const T = t * 0.7; // seconds
  const out: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const h = (k: number) => hash1(i * 13 + k, seed);
    const dir = new THREE.Vector3(origin[0] + (h(1) - 0.5) * 0.6, 0.25 + h(2) * 0.9, origin[2] + 0.4 + (h(3) - 0.5) * 0.4).normalize();
    const v = 1.2 + h(4) * 2.2;
    const p: V3 = [origin[0] + dir.x * v * T, origin[1] + dir.y * v * T - 4.9 * T * T, origin[2] + dir.z * v * T];
    const sz = 0.025 + h(5) * 0.035;
    const fade = 1 - Math.max(0, (t - 0.75) / 0.25);
    out.push(
      <mesh key={i} geometry={g.unitSphere} material={m.limb} position={p}
        rotation={[T * (6 + h(6) * 10), T * (4 + h(7) * 8), T * 5]} scale={[sz * 1.6 * fade, sz * 0.45 * fade, sz * fade]} castShadow />,
    );
  }
  return <group>{out}</group>;
};

// ---------------- the character ----------------
export const Sahur: React.FC<SahurProps> = (props) => {
  const frame = useCurrentFrame();
  const m = useSahurMaterials();
  const g = geos();
  const pose = sahurPose(props);
  const rig = solveRig(pose, { position: props.position, turn: props.turn, scale: props.scale }, { lean: props.lean, tilt: props.tilt });
  let e = resolveExpr(props.expression);
  if (props.expressionB !== undefined) e = mixExpr(e, resolveExpr(props.expressionB), clamp(props.exprMix ?? 0));
  e = finalExpr(e, { blink: props.blink, mouth: props.mouth, talk: props.talk, look: props.look });
  const shadow = props.castShadow ?? true;
  const bat = props.bat ?? true;
  const gArm = props.glitchArm ?? 'R';
  const seed = props.seed ?? 1;
  const ck = clamp(props.cracks ?? 0, 0, 3);
  const inner = clamp(props.innerLight ?? 0);
  m.crackU.uStage.value.set(clamp(ck), clamp(ck - 1), clamp(ck - 2));
  m.crackU.uGlow.value = ck > 0 ? 2.2 + 2.5 * clamp(ck - 1.5, 0, 1.5) + 9 * inner : 0;
  return (
    <group {...nodeProps(rig, 'root')}>
      <group {...nodeProps(rig, 'bob')}>
        <Leg side="L" rig={rig} m={m} shadow={shadow} />
        <Leg side="R" rig={rig} m={m} shadow={shadow} />
        <group {...nodeProps(rig, 'torso')}>
          <mesh geometry={g.log} material={m.wood} castShadow={shadow} receiveShadow />
          <mesh geometry={g.cap} material={m.cap} rotation={[-Math.PI / 2, 0, 0]} position={[0, logY1 + 0.0005, 0]} receiveShadow />
          <mesh geometry={g.capBot} material={m.cap} rotation={[Math.PI / 2, 0, 0]} position={[0, DIM.logY0 - 0.0005, 0]} />
          <Face e={e} m={m} />
          {inner > 0.001 && <pointLight position={[0, 1.15, 0]} color={PAL.real} intensity={600 * inner} distance={40} decay={2} />}
          {props.chips && props.chips.t > 0 && props.chips.t < 1 && <Chips {...props.chips} m={m} />}
          <Arm side="L" rig={rig} pose={pose} m={m} bat={bat} glitch={gArm === 'L' ? props.glitch ?? 0 : 0} frame={frame} seed={seed} shadow={shadow} lantern={props.lantern} />
          <Arm side="R" rig={rig} pose={pose} m={m} bat={bat} glitch={gArm === 'R' ? props.glitch ?? 0 : 0} frame={frame} seed={seed} shadow={shadow} lantern={props.lantern} />
        </group>
      </group>
    </group>
  );
};
