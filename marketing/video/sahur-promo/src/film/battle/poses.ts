// Sahur's fight poses, built from the rig's POSES (src/rig/pose.ts). The rig builder is adding `run`,
// `leap`, `land`, `stumble` and `dropKnee`; until then these custom poses stand in (same names, so a
// later swap is one line), plus a side swat and an "I'm fine" raised hand.
import { POSES, Pose, ArmPose, LegPose, mixPose, walkPose, swingPose } from '../../rig/pose';
import { clamp, lerp } from '../../rig/util';

const D = Math.PI / 180;
const arm = (fwd: number, out: number, elbow: number, o: Partial<ArmPose> = {}): ArmPose => ({ fwd, out, twist: 0, elbow, wrist: [0, 0, 0], grip: 1, ...o });
const leg = (fwd = 0, knee = 0, o: Partial<LegPose> = {}): LegPose => ({ fwd, out: 0.05, knee, pitch: 0, ...o });

const SHOULDER = POSES.batShoulder;

/** base of the run: bat on the right shoulder, leaning into it, knees soft */
const RUN_BASE: Pose = {
  ...SHOULDER,
  armL: arm(10 * D, 18 * D, 70 * D, { grip: 0.9 }),
  legL: leg(0.1, 0.35), legR: leg(0.1, 0.35),
  bodyY: -0.06, lean: 0.24, tilt: 0,
};

/** run cycle: phase in cycles (1 = two strides). A long-legged toy sprint. */
export function runPose(phase: number, amount = 1): Pose {
  const p = walkPose(RUN_BASE, phase, 1.75 * amount);
  const a = phase * Math.PI * 2;
  // extra knee drive and a bounding bob (airborne between strides)
  p.legL.knee += 0.5 * amount * Math.max(0, Math.sin(a));
  p.legR.knee += 0.5 * amount * Math.max(0, -Math.sin(a));
  p.bodyY += amount * 0.06 * Math.abs(Math.sin(a));
  p.armL.fwd -= 0.45 * amount * Math.cos(a);
  return p;
}

/** airborne: knees tucked, bat raised overhead (sprite attack) */
export const LEAP: Pose = {
  ...POSES.batOverhead,
  legL: leg(70 * D, 95 * D, { out: 0.1, pitch: 0.3 }),
  legR: leg(-10 * D, 60 * D, { out: 0.1, pitch: 0.2 }),
  bodyY: 0.05, lean: 0.12, tilt: 0.02,
};

/** airborne, bat cocked back over the head (the strike is coming) */
export const LEAP_COCK: Pose = {
  ...swingPose(0.33),
  legL: leg(60 * D, 90 * D, { out: 0.1, pitch: 0.3 }),
  legR: leg(-20 * D, 70 * D, { out: 0.1, pitch: 0.2 }),
  bodyY: 0.05, lean: -0.05,
};

/** the landing crouch: knees deep, log tipped forward, bat held low and out */
export const LAND: Pose = {
  ...POSES.ready,
  armR: arm(40 * D, 40 * D, 40 * D, { twist: 20 * D }),
  armL: arm(30 * D, 40 * D, 50 * D, { grip: 0.8 }),
  legL: leg(80 * D, 110 * D, { out: 0.16 }),
  legR: leg(50 * D, 100 * D, { out: 0.16 }),
  bodyY: -0.34, lean: 0.36, tilt: 0.04, turn: 0,
  batDir: [-0.2, -0.9, 0.3],
};

/** knees give and he catches himself on the bat, tip planted in front (S37) */
export const STUMBLE: Pose = {
  ...POSES.idle,
  armR: arm(48 * D, 6 * D, 30 * D, { twist: 0, grip: 1 }),
  armL: arm(30 * D, 26 * D, 50 * D, { grip: 0.6 }),
  legL: leg(30 * D, 55 * D, { out: 0.1 }),
  legR: leg(10 * D, 40 * D, { out: 0.1 }),
  bodyY: -0.13, lean: 0.3, tilt: -0.08, turn: 0.1,
  batDir: [0, -1, 0], batRoll: 0, batGrip: 0.22, batHand: 'R',
  batTorsoDir: [0.0, -0.94, 0.34],
};

/** down on one knee, leaning on the planted bat, head bowed (S42b) */
export const DROP_KNEE: Pose = {
  ...POSES.kneel,
  armR: arm(42 * D, 4 * D, 36 * D, { twist: 0, grip: 1 }),
  armL: arm(20 * D, 24 * D, 40 * D, { grip: 0.7 }),
  bodyY: -0.52, lean: 0.36, tilt: -0.05, turn: 0.08,
  batDir: [0, -1, 0], batRoll: 0, batGrip: 0.22, batHand: 'R',
  batTorsoDir: [0.05, -0.9, 0.42],
};

/** kneeling, LEFT hand raised palm-out toward you: "I'm fine" (S43) */
export const KNEE_HAND_UP: Pose = {
  ...POSES.dropKnee,
  armL: arm(70 * D, 30 * D, 95 * D, { twist: 70 * D, wrist: [-25 * D, 0, 0], grip: 0 }),
  lean: 0.18,
};

/** side swat (S34): wound back to his right, bat horizontal behind him */
export const SWAT_WIND: Pose = {
  ...POSES.ready,
  armR: arm(40 * D, 55 * D, 80 * D, { twist: -30 * D }),
  armL: arm(60 * D, -10 * D, 70 * D),
  legL: leg(0.15, 0.25, { out: 0.16 }), legR: leg(-0.15, 0.2, { out: 0.16 }),
  bodyY: -0.08, lean: 0.12, tilt: 0.06, turn: 0.75,
  batDir: [0, -1, 0], batRoll: 0, batGrip: 0.18, batHand: 'R',
  batTorsoDir: [-0.75, 0.25, -0.6],
};
/** side swat: through the hit, arm straight across the front, bat level */
export const SWAT_HIT: Pose = {
  ...SWAT_WIND,
  armR: arm(85 * D, -15 * D, 10 * D, { twist: 0 }),
  armL: arm(30 * D, 30 * D, 50 * D),
  legL: leg(0.3, 0.35, { out: 0.16 }), legR: leg(-0.25, 0.15, { out: 0.16 }),
  turn: -0.55, lean: 0.2, tilt: -0.04,
  batTorsoDir: [0.8, 0.05, 0.6],
};
export const SWAT_FOLLOW: Pose = {
  ...SWAT_HIT,
  armR: arm(70 * D, -40 * D, 30 * D, { twist: 0 }),
  turn: -0.95, lean: 0.24,
  batTorsoDir: [0.85, 0.2, -0.3],
};
/** the swat as a 0..1 timeline: 0 wound, 0.5 contact, 1 follow-through */
export function swatPose(s: number): Pose {
  const x = clamp(s);
  if (x < 0.5) return mixPose(SWAT_WIND, SWAT_HIT, Math.pow(x / 0.5, 2.2));
  return mixPose(SWAT_HIT, SWAT_FOLLOW, 1 - Math.pow(1 - (x - 0.5) / 0.5, 2));
}

/** helper: blend any two poses */
export const blend = (a: Pose, b: Pose, t: number) => mixPose(a, b, clamp(t));
export const lerpN = lerp;
