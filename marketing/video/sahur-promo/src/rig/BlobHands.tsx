// The player's POV hands: soft cream mitten blobs with a thumb nub, a gentle sheen, a darker shadow
// side toward the arm, and a thin dark inverted-hull outline (the game's blob look).
// Render inside <CamAttach> (camera space: x right, y up, -z forward). Poses blend by `mix`.
import * as THREE from 'three';
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { PAL } from '../lib/palette';
import { lerp, clamp, fbm1, smooth } from './util';
import { Phone, PhoneProps } from './Phone';
import { Bat } from './Bat';

export type V3 = [number, number, number];
export type HandXf = {
  /** wrist/palm centre in camera space */
  p: V3;
  /** fingertip direction */
  dir: V3;
  /** palm normal */
  palm: V3;
  /** 0 = flat mitten, 1 = fist */
  curl: number;
  hidden?: boolean;
};
export type HandsPoseName = 'holdPhone' | 'reach' | 'takeHand' | 'holdBat' | 'defensive' | 'rest';
export type HandsPose = { R: HandXf; L: HandXf; phone?: { p: V3; r: V3 }; bat?: { p: V3; dir: V3 } };

const mirror = (h: HandXf): HandXf => ({ ...h, p: [-h.p[0], h.p[1], h.p[2]], dir: [-h.dir[0], h.dir[1], h.dir[2]], palm: [-h.palm[0], h.palm[1], h.palm[2]] });

/** phone placement used by holdPhone (camera space) */
export const PHONE_ANCHOR = { p: [0, -0.012, -0.38] as V3, r: [0.04, 0, 0] as V3 };

const batAxis: V3 = (() => { const v = new THREE.Vector3(-0.42, 0.5, -0.76).normalize(); return [v.x, v.y, v.z]; })();
const batAt = (s: number): V3 => [0.07 + batAxis[0] * s, -0.25 + batAxis[1] * s, -0.3 + batAxis[2] * s];

// mittens hold the phone's lower half from the sides and behind; only the thumb nubs come over the bezel
const R_HOLD: HandXf = { p: [0.07, -0.055, -0.41], dir: [-0.14, 0.8, -0.58], palm: [-1, 0, 0.1], curl: 0.28 };
export const HANDS_POSES: Record<HandsPoseName, HandsPose> = {
  holdPhone: { R: R_HOLD, L: mirror(R_HOLD), phone: PHONE_ANCHOR },
  reach: {
    R: { p: [0.045, -0.085, -0.4], dir: [-0.12, 0.42, -1], palm: [-0.55, 0.8, 0.1], curl: 0.12 },
    L: { p: [-0.16, -0.36, -0.3], dir: [0.1, 1, -0.2], palm: [1, 0, 0], curl: 0.3, hidden: true },
  },
  takeHand: {
    R: { p: [0.025, -0.05, -0.47], dir: [-0.18, 0.32, -1], palm: [-0.45, 0.88, 0.1], curl: 0.5 },
    L: { p: [-0.16, -0.36, -0.3], dir: [0.1, 1, -0.2], palm: [1, 0, 0], curl: 0.3, hidden: true },
  },
  // by the fire: the bat lies across your lap on upturned mittens, fingers curled over the handle
  holdBat: (() => {
    const A = new THREE.Vector3(0.85, 0.22, -0.45).normalize();
    const knob = new THREE.Vector3(-0.2, -0.15, -0.33);
    const want = new THREE.Vector3(0, 0.5, -0.85);
    const dir = want.clone().addScaledVector(A, -want.dot(A)).normalize();
    const palm = new THREE.Vector3().crossVectors(A, dir).normalize();
    const xf = (s: number): HandXf => {
      const c = knob.clone().addScaledVector(A, s).addScaledVector(palm, -0.03);
      return { p: [c.x, c.y, c.z], dir: [dir.x, dir.y, dir.z], palm: [palm.x, palm.y, palm.z], curl: 0.55 };
    };
    return { R: xf(0.3), L: xf(0.1), bat: { p: [knob.x, knob.y, knob.z], dir: [A.x, A.y, A.z] } };
  })(),
  // storyboard S10: palms out, at about 18% and 82% of the frame width, in the bottom 30%
  defensive: {
    R: { p: [0.165, -0.135, -0.33], dir: [-0.2, 1, 0.1], palm: [0.2, 0.05, -1], curl: 0.0 },
    L: { p: [-0.17, -0.142, -0.34], dir: [0.22, 1, 0.1], palm: [-0.2, 0.05, -1], curl: 0.0 },
  },
  rest: {
    R: { p: [0.16, -0.42, -0.3], dir: [0, 1, -0.3], palm: [-1, 0, 0], curl: 0.3, hidden: true },
    L: { p: [-0.16, -0.42, -0.3], dir: [0, 1, -0.3], palm: [1, 0, 0], curl: 0.3, hidden: true },
  },
};

// ---------- geometry ----------
const NT = 64, NA = 40;
function blobGeometry(curl: number) {
  // a short, round paddle mitten (not finger-like), a soft wrist and a thick blob arm
  const L = 0.5, top = 0.085;
  const Wm = 0.056, Dm = 0.036, Ww = 0.04, Dw = 0.034, Wa = 0.043, Da = 0.04;
  const tCap = 0.2, tKnuck = 0.25, tWrist = 0.36;
  const yK = top - tKnuck * L;
  const R = curl > 0.01 ? (tKnuck * L) / (curl * 1.4) : 0;
  const pos: number[] = [];
  const col: number[] = [];
  const cA = new THREE.Color(PAL.blob), cB = new THREE.Color('#a9a292');
  for (let i = 0; i <= NT; i++) {
    const t = Math.pow(i / NT, 1.25);
    let y = top - t * L;
    let a: number, b: number;
    if (t < tCap) { const k = t / tCap; const f = Math.pow(Math.max(0, 1 - (1 - k) * (1 - k)), 0.5); a = Wm * f; b = Dm * f; }
    else if (t < tKnuck) { a = Wm; b = Dm; }
    else if (t < tWrist) { const s = smooth((t - tKnuck) / (tWrist - tKnuck)); a = lerp(Wm, Ww, s); b = lerp(Dm, Dw, s); }
    else { const s = smooth(((t - tWrist) / (1 - tWrist)) * 2.2); a = lerp(Ww, Wa, s); b = lerp(Dw, Da, s); }
    for (let j = 0; j < NA; j++) {
      const th = (j / NA) * Math.PI * 2;
      let x = a * Math.cos(th), z = b * Math.sin(th);
      // palm slightly flatter, back of the hand rounder
      if (z > 0) z *= 0.85;
      // thumb nub on +X, a little toward the palm (+Z)
      let d = th - 0.2; if (d > Math.PI) d -= Math.PI * 2;
      const bump = 0.032 * Math.exp(-Math.pow((t - 0.28) / 0.07, 2)) * Math.exp(-Math.pow(d / 0.62, 2));
      x += bump * Math.cos(th) * 1.2; z += bump * Math.sin(th) * 0.7;
      // curl: bend the mitten above the knuckle line toward the palm
      if (R > 0 && y > yK) {
        const dist = y - yK;
        const al = dist / R;
        const rr = R - z;
        y = yK + rr * Math.sin(al);
        z = R - rr * Math.cos(al);
      }
      pos.push(x, y, z);
      const shade = clamp((t - 0.3) / 0.7) * 0.6 + (z < 0 ? 0.06 : 0);
      const c = cA.clone().lerp(cB, shade);
      col.push(c.r, c.g, c.b);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < NT; i++) for (let j = 0; j < NA; j++) {
    const a = i * NA + j, b = i * NA + ((j + 1) % NA), c = (i + 1) * NA + j, d = (i + 1) * NA + ((j + 1) % NA);
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the tip is a pole (row 0 collapses to one point): give it one averaged normal so shading and the
  // outline hull stay round instead of forming a nib
  const n = g.attributes.normal as THREE.BufferAttribute;
  const avg = new THREE.Vector3();
  for (let j = 0; j < NA; j++) avg.add(new THREE.Vector3(n.getX(j), n.getY(j), n.getZ(j)));
  avg.normalize();
  for (let j = 0; j < NA; j++) n.setXYZ(j, avg.x, avg.y, avg.z);
  n.needsUpdate = true;
  return g;
}
function hullOf(g: THREE.BufferGeometry, t: number) {
  const h = g.clone();
  const p = h.attributes.position as THREE.BufferAttribute, n = h.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return h;
}
const geoCache = new Map<string, { body: THREE.BufferGeometry; hull: THREE.BufferGeometry }>();
const getGeo = (curl: number, outline: number) => {
  const k = `${Math.round(curl * 40)}:${outline}`;
  if (!geoCache.has(k)) { const body = blobGeometry(Math.round(curl * 40) / 40); geoCache.set(k, { body, hull: hullOf(body, outline) }); }
  return geoCache.get(k)!;
};

const quatFrom = (dir: V3, palm: V3) => {
  const Y = new THREE.Vector3(...dir).normalize();
  const P = new THREE.Vector3(...palm);
  const Z = P.sub(Y.clone().multiplyScalar(P.dot(Y))).normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
};

const mixXf = (a: HandXf, b: HandXf, t: number) => {
  const qa = quatFrom(a.dir, a.palm), qb = quatFrom(b.dir, b.palm);
  return {
    p: new THREE.Vector3(...a.p).lerp(new THREE.Vector3(...b.p), t),
    q: qa.slerp(qb, t),
    curl: lerp(a.curl, b.curl, t),
    hidden: !!a.hidden && !!b.hidden,
  };
};

export type BlobHandsProps = {
  pose?: HandsPoseName | HandsPose;
  poseB?: HandsPoseName | HandsPose;
  mix?: number;
  /** 0..1 trembling (defensive, scared) */
  tremble?: number;
  /** per-hand overrides applied after blending */
  right?: Partial<HandXf>;
  left?: Partial<HandXf>;
  /** show the phone (defaults to true when the pose has one) */
  phone?: boolean;
  phoneProps?: PhoneProps;
  /** show the bat for holdBat */
  bat?: boolean;
  outline?: number;
  seed?: number;
};

const BlobHand: React.FC<{ xf: { p: THREE.Vector3; q: THREE.Quaternion; curl: number }; mats: { skin: THREE.Material; line: THREE.Material }; outline: number }> = ({ xf, mats, outline }) => {
  const g = getGeo(xf.curl, outline);
  return (
    <group position={xf.p} quaternion={xf.q}>
      <mesh geometry={g.body} material={mats.skin} castShadow receiveShadow />
      <mesh geometry={g.hull} material={mats.line} />
    </group>
  );
};

const resolve = (p: HandsPoseName | HandsPose | undefined): HandsPose => (p === undefined ? HANDS_POSES.rest : typeof p === 'string' ? HANDS_POSES[p] : p);

export const BlobHands: React.FC<BlobHandsProps> = ({ pose = 'holdPhone', poseB, mix = 0, tremble = 0, right, left, phone, phoneProps, bat = true, outline = 0.0024, seed = 3 }) => {
  const frame = useCurrentFrame();
  const A = resolve(pose), B = poseB !== undefined ? resolve(poseB) : A;
  const t = poseB !== undefined ? clamp(mix) : 0;
  const mats = useMemo(() => ({
    skin: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.52, sheen: 0.9, sheenRoughness: 0.45, sheenColor: new THREE.Color('#fff6e8'), clearcoat: 0.18, clearcoatRoughness: 0.5 }),
    line: new THREE.MeshBasicMaterial({ color: PAL.blobOutline, side: THREE.BackSide }),
  }), []);
  // left hands are authored in real camera coordinates; mirror them into the mirrored group's space
  const r = mixXf({ ...A.R, ...(right ?? {}) } as HandXf, { ...B.R, ...(right ?? {}) } as HandXf, t);
  const l = mixXf(mirror({ ...A.L, ...(left ?? {}) } as HandXf), mirror({ ...B.L, ...(left ?? {}) } as HandXf), t);
  const tr = clamp(tremble);
  const jit = (s: number) => new THREE.Vector3(fbm1(frame * 0.9, seed + s, 2), fbm1(frame * 0.85, seed + s + 7, 2), fbm1(frame * 0.8, seed + s + 13, 2) * 0.5).multiplyScalar(0.004 * tr);
  if (tr > 0) { r.p.add(jit(1)); l.p.add(jit(21)); }
  const showPhone = phone ?? (t < 0.5 ? !!A.phone : !!B.phone);
  const ph = (t < 0.5 ? A.phone : B.phone) ?? PHONE_ANCHOR;
  const bt = (t < 0.5 ? A.bat : B.bat);
  const batQ = bt ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...bt.dir).normalize()) : null;
  return (
    <group>
      {!r.hidden && <BlobHand xf={r} mats={mats} outline={outline} />}
      {!l.hidden && (
        <group scale={[-1, 1, 1]}>
          <BlobHand xf={l} mats={mats} outline={outline} />
        </group>
      )}
      {showPhone && (
        <group position={ph.p} rotation={ph.r}>
          <Phone {...phoneProps} />
        </group>
      )}
      {bat && bt && batQ && (
        <group position={bt.p} quaternion={batQ}>
          <Bat />
        </group>
      )}
    </group>
  );
};
