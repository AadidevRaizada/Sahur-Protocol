// Sahur's pose system: joint angles (radians), named poses, blending, swing and walk generators,
// and a pure forward-kinematics solver shared by the <Sahur> component and the anchor helpers.
import * as THREE from 'three';
import { lerp, clamp, smooth, easeIn, easeOut } from './util';

// ---------- proportions (unscaled Sahur units; origin at the ground between the feet, +Z = his front) ----------
export const DIM = {
  hipX: 0.17, hipY: 0.8,
  thigh: 0.33, shin: 0.33, ankleH: 0.14, legR: 0.09, kneeR: 0.1, hipR: 0.11,
  // torso-local (origin at the hip pivot)
  logY0: -0.06, logH: 2.3, rBot: 0.44, rTop: 0.41, bevel: 0.05,
  shoulderY: 1.2, upper: 0.5, fore: 0.46, armR: 0.077, handR: 0.118,
  eyeY: 1.72, eyeX: 0.158, eyeR: 0.118,
  noseY: 1.69, mouthY: 1.355,
};
export const logY1 = DIM.logY0 + DIM.logH;
/** radius of the log at a torso-local height */
export const logR = (y: number) => lerp(DIM.rBot, DIM.rTop, clamp((y - DIM.logY0) / DIM.logH));
// the shoulder ball sits partly inside the log
export const shoulderX = (DIM.rBot + DIM.rTop) / 2 - 0.035;

/** Local anchor points (unscaled, upright, facing +Z). Use sahurPoint() for the posed world position. */
export const HEAD_TOP: [number, number, number] = [0, DIM.hipY + logY1, 0];
export const FACE_CENTER: [number, number, number] = [0, DIM.hipY + 1.6, logR(1.6)];

export type V3 = [number, number, number];
export type ArmPose = { fwd: number; out: number; twist: number; elbow: number; wrist: V3; grip: number };
export type LegPose = { fwd: number; out: number; knee: number; pitch: number };
export type BatHand = 'L' | 'R' | 'none';
export type Pose = {
  armL: ArmPose; armR: ArmPose; legL: LegPose; legR: LegPose;
  bodyY: number; lean: number; tilt: number; turn: number;
  /** bat direction in the holding hand's frame (hand -Y runs along the forearm, +Z is the thumb side) */
  batDir: V3; batRoll: number; batGrip: number;
  batHand: BatHand;
  /** optional: bat direction in the TORSO frame (+Y up the log, +Z his front, +X his left); overrides batDir */
  batTorsoDir?: V3;
};

const arm = (fwd: number, out: number, elbow: number, o: Partial<ArmPose> = {}): ArmPose => ({ fwd, out, twist: 0, elbow, wrist: [0, 0, 0], grip: 1, ...o });
const leg = (fwd = 0, knee = 0, o: Partial<LegPose> = {}): LegPose => ({ fwd, out: 0.04, knee, pitch: 0, ...o });
const D = Math.PI / 180;

export type PoseName = 'idle' | 'idleL' | 'batShoulder' | 'duck' | 'kneel' | 'kneelOffer' | 'pullUp'
  | 'leap' | 'land' | 'stumble' | 'dropKnee' | 'tapStump' | 'tapStumpUp' | 'knuckleTap' | 'knuckleTapUp' | 'headTap' | 'headTapUp' | 'sitBench' | 'batOverhead' | 'offerHand' | 'handOnShoulder' | 'sitting' | 'lookHand' | 'tpose' | 'ready';

export const POSES: Record<PoseName, Pose> = {
  // sprite idle: bat hanging from the right hand, down and out; left arm relaxed
  idle: {
    armR: arm(6 * D, 16 * D, 24 * D, { twist: 0, grip: 1 }),
    armL: arm(4 * D, 14 * D, 18 * D, { twist: 0, grip: 0.75 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.02, tilt: 0, turn: 0,
    batDir: [-0.5, -0.85, 0.16], batRoll: 0, batGrip: 0.17, batHand: 'R',
  },
  // same, bat in the left hand (frees the right hand for offerHand)
  idleL: {
    armL: arm(6 * D, 16 * D, 24 * D, { twist: 0, grip: 1 }),
    armR: arm(4 * D, 14 * D, 18 * D, { twist: 0, grip: 0.75 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.02, tilt: 0, turn: 0,
    batDir: [0.5, -0.85, 0.16], batRoll: 0, batGrip: 0.17, batHand: 'L',
  },
  // the bedroom carry: right hand at the chest, bat resting back over the right shoulder (never raised at you)
  batShoulder: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(4 * D, 14 * D, 18 * D, { twist: 0, grip: 0.75 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.03, tilt: 0, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // ducking under a lintel, bat on the shoulder
  duck: {
    armR: arm(30 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(14 * D, 18 * D, 30 * D, { twist: 0, grip: 0.75 }),
    legL: leg(0.22, 0.42, { out: 0.08 }), legR: leg(0.05, 0.3, { out: 0.08 }),
    bodyY: -0.09, lean: 0.3, tilt: 0.03, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // down on the right knee, left foot planted, log tilted forward; bat on the shoulder
  kneel: {
    armR: arm(30 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(30 * D, 20 * D, 52 * D, { twist: 0, grip: 0.7 }),
    legL: leg(100 * D, 110 * D, { out: 0.1 }), legR: leg(-24 * D, 112 * D, { out: 0.08, pitch: -0.5 }),
    bodyY: -0.5, lean: 0.26, tilt: 0.02, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // kneeling, LEFT hand held out palm-up toward the lens (storyboard S13)
  kneelOffer: {
    armR: arm(30 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(92 * D, -14 * D, 16 * D, { twist: 84 * D, wrist: [-12 * D, 0, 0], grip: 0 }),
    legL: leg(100 * D, 110 * D, { out: 0.1 }), legR: leg(-24 * D, 112 * D, { out: 0.08, pitch: -0.5 }),
    bodyY: -0.5, lean: 0.28, tilt: 0.0, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // standing back up with your hand in his LEFT hand (bat stays on the right shoulder)
  pullUp: {
    armR: arm(30 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(58 * D, -12 * D, 24 * D, { twist: 84 * D, wrist: [-10 * D, 0, 0], grip: 0.55 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0.04, 0.03, { out: 0.05 }),
    bodyY: 0, lean: 0.1, tilt: 0.0, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // airborne: knees tucked, arms up and out, bat raised (set the root height yourself)
  leap: {
    armR: arm(150 * D, 30 * D, 60 * D, { twist: 0, grip: 1 }),
    armL: arm(40 * D, 70 * D, 30 * D, { grip: 0.6 }),
    legL: leg(70 * D, 100 * D, { out: 0.12, pitch: -0.3 }), legR: leg(30 * D, 80 * D, { out: 0.12, pitch: -0.3 }),
    bodyY: 0.05, lean: 0.12, tilt: 0.04, turn: 0,
    batDir: [0, -0.7, 0.7], batRoll: 0, batGrip: 0.18, batHand: 'R', batTorsoDir: [-0.15, 0.85, -0.5],
  },
  // landing crouch: knees deep, arms out for balance
  land: {
    armR: arm(30 * D, 45 * D, 40 * D, { grip: 1 }),
    armL: arm(25 * D, 55 * D, 30 * D, { grip: 0.6 }),
    legL: leg(55 * D, 95 * D, { out: 0.2 }), legR: leg(40 * D, 85 * D, { out: 0.2 }),
    bodyY: -0.22, lean: 0.3, tilt: -0.04, turn: 0,
    batDir: [-0.5, -0.85, 0.16], batRoll: 0, batGrip: 0.17, batHand: 'R', batTorsoDir: [-0.55, -0.2, 0.8],
  },
  // stumbles and catches himself on the bat planted in front (right hand on the knob)
  stumble: {
    armR: arm(42 * D, 12 * D, 12 * D, { grip: 1 }),
    armL: arm(10 * D, 50 * D, 25 * D, { grip: 0.4 }),
    legL: leg(35 * D, 70 * D, { out: 0.1 }), legR: leg(-10 * D, 20 * D, { out: 0.12 }),
    bodyY: -0.12, lean: 0.36, tilt: 0.1, turn: 0.1,
    batDir: [0, -1, 0], batRoll: 0, batGrip: 0.08, batHand: 'R', batTorsoDir: [-0.1, -0.95, 0.3],
  },
  // drops to one knee, spent: head down, the bat planted to hold himself up
  dropKnee: {
    armR: arm(38 * D, 14 * D, 22 * D, { grip: 1 }),
    armL: arm(4 * D, 16 * D, 14 * D, { grip: 0.4 }),
    legL: leg(100 * D, 110 * D, { out: 0.12 }), legR: leg(-24 * D, 112 * D, { out: 0.08, pitch: -0.5 }),
    bodyY: -0.5, lean: 0.38, tilt: 0.06, turn: 0,
    batDir: [0, -1, 0], batRoll: 0, batGrip: 0.08, batHand: 'R', batTorsoDir: [-0.15, -0.9, 0.4],
  },
  // a small bat tap on a stump in front of him (contact), and the lifted beat before it
  tapStump: {
    armR: arm(48 * D, 14 * D, 22 * D, { grip: 1 }),
    armL: arm(10 * D, 16 * D, 30 * D, { grip: 0.7 }),
    legL: leg(0.05, 0.08, { out: 0.06 }), legR: leg(0, 0.05, { out: 0.06 }),
    bodyY: -0.03, lean: 0.18, tilt: 0, turn: 0,
    batDir: [0, -0.8, 0.6], batRoll: 0, batGrip: 0.17, batHand: 'R', batTorsoDir: [-0.05, -0.62, 0.78],
  },
  tapStumpUp: {
    armR: arm(62 * D, 14 * D, 40 * D, { grip: 1 }),
    armL: arm(10 * D, 16 * D, 30 * D, { grip: 0.7 }),
    legL: leg(0.05, 0.08, { out: 0.06 }), legR: leg(0, 0.05, { out: 0.06 }),
    bodyY: -0.02, lean: 0.14, tilt: 0, turn: 0,
    batDir: [0, -0.5, 0.86], batRoll: 0, batGrip: 0.17, batHand: 'R', batTorsoDir: [-0.05, -0.2, 0.98],
  },
  // knocks his own log with his left knuckle (contact), and pulled back
  knuckleTap: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(24 * D, -18 * D, 92 * D, { twist: -40 * D, wrist: [0, 0, 0.3], grip: 1 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.02, tilt: 0.02, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  knuckleTapUp: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(32 * D, -10 * D, 86 * D, { twist: -40 * D, wrist: [0, 0, 0.3], grip: 1 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.02, tilt: 0.02, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // "cover your ears": the left hand taps the side of his head (contact), and lifted off
  headTap: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(8 * D, 120 * D, 110 * D, { twist: 90 * D, grip: 0.55 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.03, tilt: -0.03, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  headTapUp: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(10 * D, 118 * D, 92 * D, { twist: 90 * D, grip: 0.55 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0, 0, { out: 0.05 }),
    bodyY: 0, lean: 0.03, tilt: -0.02, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // on a bench (hips ~0.66 units), legs dangling a little, bat leaning on the right shoulder
  sitBench: {
    armR: arm(26 * D, 2 * D, 112 * D, { twist: -20 * D, grip: 1 }),
    armL: arm(30 * D, 14 * D, 55 * D, { grip: 0.6 }),
    legL: leg(86 * D, 74 * D, { out: 0.12 }), legR: leg(86 * D, 80 * D, { out: 0.12 }),
    bodyY: -0.14, lean: -0.03, tilt: 0, turn: 0,
    batDir: [-0.5, 0.15, 0.85], batRoll: 0, batGrip: 0.24, batHand: 'R', batTorsoDir: [-0.34, 0.8, -0.5],
  },
  // sprite attack: bat raised up and out over the right shoulder, left fist up
  batOverhead: {
    armR: arm(14 * D, 76 * D, 100 * D, { twist: 90 * D, grip: 1 }),
    armL: arm(38 * D, 18 * D, 118 * D, { twist: 0, grip: 1 }),
    legL: leg(0.06, 0.08, { out: 0.12 }), legR: leg(-0.08, 0.1, { out: 0.12 }),
    bodyY: -0.03, lean: 0.04, tilt: 0.04, turn: 0.1,
    batDir: [-0.35, -0.8, 0.5], batRoll: 0, batGrip: 0.16, batHand: 'R',
  },
  // ready = start of the swing (same family as batOverhead)
  ready: {
    armR: arm(14 * D, 76 * D, 100 * D, { twist: 90 * D, grip: 1 }),
    armL: arm(30 * D, 14 * D, 80 * D, { grip: 1 }),
    legL: leg(0.08, 0.1, { out: 0.13 }), legR: leg(-0.1, 0.12, { out: 0.13 }),
    bodyY: -0.03, lean: 0.03, tilt: 0.03, turn: 0.1,
    batDir: [-0.35, -0.8, 0.5], batRoll: 0, batGrip: 0.16, batHand: 'R',
  },
  // right hand reaching toward the camera, palm up; bat in the left hand
  offerHand: {
    armR: arm(72 * D, 6 * D, 14 * D, { twist: 80 * D, wrist: [-12 * D, 0, 0], grip: 0 }),
    armL: arm(6 * D, 16 * D, 24 * D, { twist: 0, grip: 1 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0.04, 0.03, { out: 0.05 }),
    bodyY: 0, lean: 0.14, tilt: 0.02, turn: 0,
    batDir: [0.5, -0.85, 0.16], batRoll: 0, batGrip: 0.17, batHand: 'L',
  },
  // reaching forward and to his right (the camera's left shoulder), palm down
  handOnShoulder: {
    armR: arm(80 * D, 24 * D, 20 * D, { twist: -70 * D, wrist: [15 * D, 0, 0], grip: 0.3 }),
    armL: arm(6 * D, 16 * D, 24 * D, { twist: 0, grip: 1 }),
    legL: leg(0, 0, { out: 0.05 }), legR: leg(0.04, 0.03, { out: 0.05 }),
    bodyY: 0, lean: 0.12, tilt: -0.05, turn: -0.12,
    batDir: [0.5, -0.85, 0.16], batRoll: 0, batGrip: 0.17, batHand: 'L',
  },
  // seated on a log (seat height ~0.46): thighs forward, shins down; bat resting on the left shoulder
  sitting: {
    armR: arm(26 * D, 14 * D, 52 * D, { twist: 0, grip: 0.65 }),
    armL: arm(28 * D, 18 * D, 50 * D, { twist: 0, grip: 1 }),
    legL: leg(88 * D, 92 * D, { out: 0.14 }), legR: leg(88 * D, 92 * D, { out: 0.14 }),
    bodyY: -0.34, lean: -0.04, tilt: 0, turn: 0,
    batDir: [0.18, 0.55, 0.81], batRoll: 0, batGrip: 0.22, batHand: 'L',
  },
  // seated variant: right hand raised in front of the face, looking at it (the glitch beat)
  lookHand: {
    armR: arm(38 * D, 10 * D, 118 * D, { twist: -10 * D, wrist: [0, 85 * D, 0], grip: 0.05 }),
    armL: arm(28 * D, 18 * D, 50 * D, { twist: 0, grip: 1 }),
    legL: leg(88 * D, 92 * D, { out: 0.14 }), legR: leg(88 * D, 92 * D, { out: 0.14 }),
    bodyY: -0.34, lean: 0.04, tilt: 0.03, turn: 0,
    batDir: [0.18, 0.55, 0.81], batRoll: 0, batGrip: 0.22, batHand: 'L',
  },
  tpose: {
    armR: arm(0, 88 * D, 0, { grip: 0.5 }), armL: arm(0, 88 * D, 0, { grip: 0.5 }),
    legL: leg(), legR: leg(), bodyY: 0, lean: 0, tilt: 0, turn: 0,
    batDir: [0, -1, 0], batRoll: 0, batGrip: 0.17, batHand: 'none',
  },
};

const lerpArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => ({
  fwd: lerp(a.fwd, b.fwd, t), out: lerp(a.out, b.out, t), twist: lerp(a.twist, b.twist, t), elbow: lerp(a.elbow, b.elbow, t),
  wrist: [lerp(a.wrist[0], b.wrist[0], t), lerp(a.wrist[1], b.wrist[1], t), lerp(a.wrist[2], b.wrist[2], t)], grip: lerp(a.grip, b.grip, t),
});
const lerpLeg = (a: LegPose, b: LegPose, t: number): LegPose => ({
  fwd: lerp(a.fwd, b.fwd, t), out: lerp(a.out, b.out, t), knee: lerp(a.knee, b.knee, t), pitch: lerp(a.pitch, b.pitch, t),
});
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const d: V3 = [lerp(a.batDir[0], b.batDir[0], t), lerp(a.batDir[1], b.batDir[1], t), lerp(a.batDir[2], b.batDir[2], t)];
  const sameHand = a.batHand === b.batHand;
  return {
    armL: lerpArm(a.armL, b.armL, t), armR: lerpArm(a.armR, b.armR, t),
    legL: lerpLeg(a.legL, b.legL, t), legR: lerpLeg(a.legR, b.legR, t),
    bodyY: lerp(a.bodyY, b.bodyY, t), lean: lerp(a.lean, b.lean, t), tilt: lerp(a.tilt, b.tilt, t), turn: lerp(a.turn, b.turn, t),
    batDir: sameHand ? d : t < 0.5 ? a.batDir : b.batDir,
    batRoll: lerp(a.batRoll, b.batRoll, t), batGrip: lerp(a.batGrip, b.batGrip, t),
    batHand: t < 0.5 ? a.batHand : b.batHand,
    batTorsoDir: a.batTorsoDir && b.batTorsoDir ? [lerp(a.batTorsoDir[0], b.batTorsoDir[0], t), lerp(a.batTorsoDir[1], b.batTorsoDir[1], t), lerp(a.batTorsoDir[2], b.batTorsoDir[2], t)] : t < 0.5 ? a.batTorsoDir : b.batTorsoDir,
  };
}
export const resolvePose = (p: PoseName | Pose | undefined): Pose => (p === undefined ? POSES.idle : typeof p === 'string' ? POSES[p] : p);

// ---------- swing: an overhead knock. 0 ready -> 0.35 full wind-up -> 0.55 strike -> 1 follow-through ----------
const SW_WIND: Pose = {
  ...POSES.ready,
  armR: arm(196 * D, 22 * D, 68 * D, { twist: 0, grip: 1 }),
  armL: arm(26 * D, 24 * D, 70 * D, { grip: 1 }),
  legL: leg(0.1, 0.12, { out: 0.13 }), legR: leg(-0.12, 0.1, { out: 0.13 }),
  turn: 0.22, lean: -0.1, tilt: 0.05, bodyY: -0.02,
  batDir: [0, -0.75, 0.66],
};
const SW_STRIKE: Pose = {
  ...POSES.ready,
  armR: arm(78 * D, 14 * D, 8 * D, { twist: 0, grip: 1 }),
  armL: arm(20 * D, 24 * D, 40 * D, { grip: 1 }),
  legL: leg(0.22, 0.28, { out: 0.15 }), legR: leg(-0.2, 0.06, { out: 0.15 }),
  turn: -0.04, lean: 0.2, tilt: -0.02, bodyY: -0.07,
  batDir: [0, -0.85, -0.52],
};
const SW_FOLLOW: Pose = {
  ...POSES.ready,
  armR: arm(34 * D, 12 * D, 14 * D, { twist: 0, grip: 1 }),
  armL: arm(14 * D, 26 * D, 30 * D, { grip: 1 }),
  legL: leg(0.26, 0.36, { out: 0.15 }), legR: leg(-0.18, 0.14, { out: 0.15 }),
  turn: -0.1, lean: 0.3, tilt: -0.03, bodyY: -0.1,
  batDir: [0, -0.92, -0.38],
};
export function swingPose(s: number): Pose {
  const x = clamp(s);
  if (x < 0.35) return mixPose(POSES.ready, SW_WIND, smooth(x / 0.35));
  if (x < 0.55) return mixPose(SW_WIND, SW_STRIKE, easeIn((x - 0.35) / 0.2));
  return mixPose(SW_STRIKE, SW_FOLLOW, easeOut((x - 0.55) / 0.45));
}

// ---------- walk: a toy waddle. phase in cycles (1 = left + right step) ----------
export function walkPose(base: Pose, phase: number, amount = 1): Pose {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a), c = Math.cos(a);
  const liftL = Math.max(0, Math.sin(a)), liftR = Math.max(0, -Math.sin(a));
  const p: Pose = JSON.parse(JSON.stringify(base));
  const k = amount;
  p.legL.fwd += k * 0.42 * c; p.legR.fwd -= k * 0.42 * c;
  p.legL.knee += k * 0.75 * liftL; p.legR.knee += k * 0.75 * liftR;
  p.legL.pitch -= k * 0.22 * liftL; p.legR.pitch -= k * 0.22 * liftR;
  // arms counter-swing (only the free arm swings fully)
  p.armL.fwd -= k * (p.batHand === 'L' ? 0.12 : 0.32) * c;
  p.armR.fwd += k * (p.batHand === 'R' ? 0.12 : 0.32) * c;
  p.bodyY += k * (0.035 * Math.abs(Math.sin(a)) - 0.02);
  p.tilt += k * 0.07 * s; // side rock toward the planted foot
  p.turn += k * 0.06 * c;
  p.lean += k * 0.05;
  return p;
}

// ---------- run: a stiff-legged toy run. phase in cycles (1 = two strides) ----------
export function runPose(base: Pose, phase: number, amount = 1): Pose {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a), c = Math.cos(a);
  const liftL = Math.max(0, Math.sin(a)), liftR = Math.max(0, -Math.sin(a));
  const p: Pose = JSON.parse(JSON.stringify(base));
  const k = amount;
  p.legL.fwd += k * 0.75 * c; p.legR.fwd -= k * 0.75 * c;
  p.legL.knee += k * (0.25 + 1.15 * liftL); p.legR.knee += k * (0.25 + 1.15 * liftR);
  p.legL.pitch -= k * 0.3 * liftL; p.legR.pitch -= k * 0.3 * liftR;
  p.armL.fwd -= k * (p.batHand === 'L' ? 0.25 : 0.7) * c;
  p.armR.fwd += k * (p.batHand === 'R' ? 0.25 : 0.7) * c;
  p.armL.elbow += k * 0.5; p.armR.elbow += k * (p.batHand === 'R' ? 0.1 : 0.5);
  p.bodyY += k * (0.07 * Math.abs(Math.sin(a)) - 0.06);
  p.tilt += k * 0.05 * s;
  p.turn += k * 0.08 * c;
  p.lean += k * 0.26;
  return p;
}

// ---------- forward kinematics ----------
export type Node = { p: V3; r: V3; s?: number; o?: THREE.EulerOrder };
export type Rig = Record<string, Node>;
export type RootXf = { position?: V3; turn?: number; scale?: number };

/** local transforms of every joint for a pose (+ root). The component and sahurPoint() both use this. */
export function solveRig(pose: Pose, root: RootXf, extra: { lean?: number; tilt?: number; turn?: number } = {}): Rig {
  const rig: Rig = {};
  rig.root = { p: root.position ?? [0, 0, 0], r: [0, (root.turn ?? 0) + pose.turn + (extra.turn ?? 0), 0], s: root.scale ?? 1 };
  rig.bob = { p: [0, pose.bodyY, 0], r: [0, 0, 0] };
  rig.torso = { p: [0, DIM.hipY, 0], r: [pose.lean + (extra.lean ?? 0), 0, pose.tilt + (extra.tilt ?? 0)] };
  for (const side of ['L', 'R'] as const) {
    const sg = side === 'L' ? 1 : -1;
    const a = side === 'L' ? pose.armL : pose.armR;
    // order XZY: twist about the arm's own axis first, then abduct (Z), then swing forward (X)
    rig['shoulder' + side] = { p: [sg * shoulderX, DIM.shoulderY, 0], r: [-a.fwd, sg * a.twist, sg * a.out], o: 'XZY' };
    rig['elbow' + side] = { p: [0, -DIM.upper, 0], r: [-a.elbow, 0, 0] };
    rig['wrist' + side] = { p: [0, -DIM.fore, 0], r: [a.wrist[0], sg * a.wrist[1], sg * a.wrist[2]] };
    const l = side === 'L' ? pose.legL : pose.legR;
    rig['hip' + side] = { p: [sg * DIM.hipX, DIM.hipY, 0], r: [-l.fwd, 0, sg * l.out] };
    rig['knee' + side] = { p: [0, -DIM.thigh, 0], r: [l.knee, 0, 0] };
    // keep the foot level with the ground (cancel hip+knee pitch and the body lean is not inherited by legs)
    rig['ankle' + side] = { p: [0, -DIM.shin, 0], r: [l.fwd - l.knee - l.pitch, 0, -sg * l.out] };
  }
  return rig;
}

export const CHAINS: Record<string, string[]> = {
  torso: ['root', 'bob', 'torso'],
  handL: ['root', 'bob', 'torso', 'shoulderL', 'elbowL', 'wristL'],
  handR: ['root', 'bob', 'torso', 'shoulderR', 'elbowR', 'wristR'],
  footL: ['root', 'bob', 'hipL', 'kneeL', 'ankleL'],
  footR: ['root', 'bob', 'hipR', 'kneeR', 'ankleR'],
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function chainMatrix(rig: Rig, chain: string[], parent?: THREE.Matrix4) {
  const M = parent ? parent.clone() : new THREE.Matrix4();
  for (const n of chain) {
    const node = rig[n];
    _e.set(node.r[0], node.r[1], node.r[2], node.o ?? 'XYZ');
    _q.setFromEuler(_e);
    const sc = node.s ?? 1;
    _s.set(sc, sc, sc);
    _p.set(node.p[0], node.p[1], node.p[2]);
    _m.compose(_p, _q, _s);
    M.multiply(_m);
  }
  return M;
}
