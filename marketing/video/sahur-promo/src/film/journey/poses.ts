// Custom Sahur poses for the Journey act, built from the rig's POSES (src/rig/pose.ts).
import { POSES, Pose, ArmPose, mixPose } from '../../rig/pose';

const D = Math.PI / 180;
const arm = (fwd: number, out: number, elbow: number, o: Partial<ArmPose> = {}): ArmPose => ({ fwd, out, twist: 0, elbow, wrist: [0, 0, 0], grip: 1, ...o });
const clone = (p: Pose): Pose => JSON.parse(JSON.stringify(p));

/** the night-watchman carry: bat over the right shoulder pointing forward and up, the lantern hanging ahead */
export const POLE: Pose = (() => {
  const p = clone(POSES.batShoulder);
  p.armR = arm(40 * D, 12 * D, 96 * D, { twist: -16 * D, grip: 1 });
  p.batTorsoDir = [-0.62, 0.5, 0.6];
  p.batGrip = 0.3;
  return p;
})();

/** standing at the stump, the bat held low in the right hand, its barrel resting near the stump top */
export const TAP_REST: Pose = (() => {
  const p = clone(POSES.idle);
  p.armR = arm(30 * D, 10 * D, 34 * D, { twist: 10 * D, grip: 1 });
  p.armL = arm(10 * D, 16 * D, 26 * D, { grip: 0.7 });
  p.batTorsoDir = [0.05, -0.42, 0.91];
  p.batGrip = 0.2;
  p.lean = 0.07;
  return p;
})();
/** the 18 cm lift before a tap (anticipation) */
export const TAP_LIFT: Pose = (() => {
  const p = clone(TAP_REST);
  p.armR = arm(52 * D, 10 * D, 40 * D, { twist: 10 * D, grip: 1 });
  p.batTorsoDir = [0.05, -0.12, 0.99];
  p.lean = 0.04;
  return p;
})();
/** the strike: the barrel on the stump top */
export const TAP_HIT: Pose = (() => {
  const p = clone(TAP_REST);
  p.armR = arm(28 * D, 10 * D, 26 * D, { twist: 10 * D, grip: 1 });
  p.batTorsoDir = [0.05, -0.55, 0.83];
  p.lean = 0.09;
  return p;
})();

/** reaching up to a branch (hanging the lantern), bat in the left hand */
export const REACH_UP: Pose = (() => {
  const p = clone(POSES.idleL);
  p.armR = arm(150 * D, 24 * D, 30 * D, { twist: 0, grip: 0.4 });
  return p;
})();

/** seated on a LOW log: knees up above the hips, feet planted close (reads as sitting from the front) */
const lowLegs = (p: Pose) => {
  p.legL = { fwd: 108 * D, out: 0.42, knee: 122 * D, pitch: 0 };
  p.legR = { fwd: 108 * D, out: 0.42, knee: 122 * D, pitch: 0 };
  return p;
};
/** seated with both hands on the knees (no bat: you are holding it) */
export const SIT_HANDS: Pose = (() => {
  const p = lowLegs(clone(POSES.sitting));
  p.armR = arm(46 * D, 22 * D, 44 * D, { twist: 0, grip: 0.6 });
  p.armL = arm(46 * D, 22 * D, 44 * D, { twist: 0, grip: 0.6 });
  p.batHand = 'none';
  p.lean = 0.1;
  return p;
})();

/** seated, right hand raised in front of the face (rig lookHand), and the knuckle knock on his own log */
export const LOOK_HAND: Pose = (() => {
  const p = lowLegs(clone(POSES.lookHand));
  p.armL = arm(50 * D, 14 * D, 34 * D, { twist: 0, grip: 0.6 });
  p.batHand = 'none';
  return p;
})();
export const KNOCK_CHEST: Pose = (() => {
  const p = clone(LOOK_HAND);
  p.armR = arm(30 * D, -4 * D, 128 * D, { twist: -30 * D, wrist: [0, 70 * D, 0], grip: 0.85 });
  return p;
})();
/** the fist, lowering */
export const FIST_LOW: Pose = (() => {
  const p = clone(SIT_HANDS);
  p.armR = arm(32 * D, 12 * D, 70 * D, { twist: 0, grip: 1 });
  return p;
})();

/** seated on the bench, bat leaning on the left shoulder (rig sitting) */
export const SIT_BENCH: Pose = clone(POSES.sitting);
/** seated, left arm reaching down and across to stand the bat against the bench */
export const SIT_LEAN_BAT: Pose = (() => {
  const p = clone(POSES.sitting);
  p.armL = arm(24 * D, 46 * D, 26 * D, { twist: 0, grip: 0.9 });
  p.tilt = 0.08;
  return p;
})();
/** seated, both hands resting on the knob of the bat standing upright between his knees (rig probe fit) */
export const SIT_ON_BAT: Pose = (() => {
  const p = clone(POSES.sitting);
  p.armL = arm(15 * D, -30 * D, 95 * D, { twist: 0, grip: 0.75 });
  p.armR = arm(15 * D, -30 * D, 95 * D, { twist: 0, grip: 0.75 });
  p.batHand = 'none';
  return p;
})();
/** the left hand following the knob as the bat tips toward you, the right hand back on the knee */
export const SIT_TIP_BAT: Pose = (() => {
  const p = clone(SIT_ON_BAT);
  p.armL = arm(22 * D, 34 * D, 50 * D, { twist: 0, grip: 0.4 });
  p.armR = arm(34 * D, 16 * D, 40 * D, { twist: 0, grip: 0.6 });
  p.tilt = 0.06;
  return p;
})();
export const SIT_REST: Pose = (() => {
  const p = clone(POSES.sitting);
  p.armL = arm(34 * D, 16 * D, 40 * D, { twist: 0, grip: 0.6 });
  p.batHand = 'none';
  return p;
})();

/** mirror a pose left <-> right (the solver mirrors the arm angles by side) */
export const mirrorPose = (p: Pose): Pose => {
  const m = clone(p);
  m.armL = clone(p as any).armR; m.armR = clone(p as any).armL;
  m.legL = clone(p as any).legR; m.legR = clone(p as any).legL;
  m.tilt = -p.tilt; m.turn = -p.turn;
  m.batHand = p.batHand === 'L' ? 'R' : p.batHand === 'R' ? 'L' : 'none';
  m.batDir = [-p.batDir[0], p.batDir[1], p.batDir[2]];
  if (p.batTorsoDir) m.batTorsoDir = [-p.batTorsoDir[0], p.batTorsoDir[1], p.batTorsoDir[2]];
  return m;
};

// ---------------- the fire (S22-S26): seated on a log, rear on the seat, feet planted in front
const fireLegs = (p: Pose) => {
  p.legL = { fwd: 86 * D, out: 0.26, knee: 90 * D, pitch: 0 };
  p.legR = { fwd: 86 * D, out: 0.26, knee: 90 * D, pitch: 0 };
  p.batHand = 'none';
  return p;
};
/** hands held out toward the warmth, open mittens */
export const SIT_WARM: Pose = (() => {
  const p = fireLegs(clone(POSES.sitting));
  p.armR = arm(64 * D, 10 * D, 34 * D, { twist: 70 * D, wrist: [-40 * D, 0, 0], grip: 0.1 });
  p.armL = arm(58 * D, 12 * D, 40 * D, { twist: 70 * D, wrist: [-40 * D, 0, 0], grip: 0.1 });
  p.lean = 0.12;
  return p;
})();
/** forearms on the knees, hands loose */
export const SIT_KNEES: Pose = (() => {
  const p = fireLegs(clone(POSES.sitting));
  p.armR = arm(40 * D, 12 * D, 50 * D, { twist: 0, grip: 0.55 });
  p.armL = arm(40 * D, 12 * D, 50 * D, { twist: 0, grip: 0.55 });
  p.lean = 0.14;
  return p;
})();
/** the LEFT hand raised before his face, palm toward himself (rig lookHand, mirrored) */
export const LOOK_HAND_L: Pose = (() => {
  const p = fireLegs(mirrorPose(POSES.lookHand));
  p.armR = arm(40 * D, 12 * D, 50 * D, { twist: 0, grip: 0.55 });
  p.lean = 0.06;
  return p;
})();
/** the knuckles of the left hand knocking on his own log (chest) */
export const KNOCK_L: Pose = (() => {
  const p = clone(LOOK_HAND_L);
  p.armL = arm(26 * D, -6 * D, 118 * D, { twist: -30 * D, wrist: [0, 70 * D, 0], grip: 0.85 });
  return p;
})();
/** the left hand closed to a fist, lowering */
export const FIST_L: Pose = (() => {
  const p = clone(SIT_KNEES);
  p.armL = arm(36 * D, 12 * D, 76 * D, { twist: 0, grip: 1 });
  return p;
})();

export { mixPose };
