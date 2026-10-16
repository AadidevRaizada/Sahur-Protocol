// THE CORE ACT (storyboard beats 8-9, S45-S51, global frames 2976-3720): every value is a pure function
// of the global storyboard frame `f`. One continuous POV take in the white Core.
// Cue frames (public/audio/cues.json): 3120 small TUNG, 3336 hand lands, 3416/3428 head taps, 3440 ears,
// 3500 TUNG 1, 3510 bubble groan, 3572 TUNG 2, 3576 seam rip, 3600 wood falls, 3644 POP.
import * as THREE from 'three';
import { POSES, Pose, mixPose, swingPose, walkPose, resolvePose } from '../../rig/pose';
import { clamp, lerp, invLerp } from '../../rig/util';
import type { PovCamProps, Shake } from '../../pov/camera';

export const D = Math.PI / 180;
export const CORE_START = 2976;
export const CORE_END = 3720;
export const WHITE_AT = 3650;
export const SAHUR_SCALE = 0.62; // same as the bedroom (1.88 m)

// ---------------- easing ----------------
type Ease = (t: number) => number;
export const linear: Ease = (t) => clamp(t);
export const inOutSine: Ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const inOutCubic: Ease = (t) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const outCubic: Ease = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const inQuad: Ease = (t) => clamp(t) * clamp(t);
export const outExpo: Ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const inExpo: Ease = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const outBack = (s = 1.6): Ease => (t) => { const x = clamp(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
export const seg = (f: number, a: number, b: number, e: Ease = inOutSine) => e(invLerp(a, b, f));
export const bumpF = (f: number, a: number, b: number) => (f <= a || f >= b ? 0 : Math.sin(Math.PI * (f - a) / (b - a)));

/** piecewise track: [frame, value, ease-into-this-key] */
export const track = (f: number, k: [number, number, Ease?][]) => {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [f0, v0] = k[i];
    const [f1, v1, e] = k[i + 1];
    if (f <= f1) return lerp(v0, v1, (e ?? inOutSine)((f - f0) / (f1 - f0)));
  }
  return k[k.length - 1][1];
};

// ---------------- shots (for QA labels and per-shot switches) ----------------
export const SHOTS: [string, number, number][] = [
  ['S45 The Core', 2976, 3072],
  ["S46 You can't hurt it", 3072, 3168],
  ['S47 It grows', 3168, 3336],
  ['S48 A hand on your shoulder', 3336, 3456],
  ['S49 TUNG', 3456, 3560],
  ['S50 TUNG', 3560, 3644],
  ['S51 POP', 3644, 3720],
];

// ---------------- key frames ----------------
export const K = {
  tilt0: 3010, tilt1: 3072,
  swat0: 3088, swat1: 3094,
  smallTung: 3120,
  grow0: 3168, peak: 3336,
  hand: 3336, turn0: 3340, turn1: 3380, nod0: 3392, nod1: 3404,
  tap1: 3416, tap2: 3428, ears0: 3436, ears1: 3456,
  back0: 3456, back1: 3490,
  tung1: 3500, tung2: 3572, wind3: 3590, pop: 3644,
};

// ---------------- Sahur's marks ----------------
const P1: [number, number] = [-1.2, -4.2]; // ahead-left (S45-S47): small, in the lower third, so the scale reads
// S48: 0.82 m away at 58 deg left, facing you. FK-solved (qa/core/fk-probe4) so that, with the camera at
// yaw -12 / pitch 35, his right hand lands bottom-left (~12%, 88%) 0.3 m from the lens and his face is off frame.
const P2: [number, number] = [-Math.sin(58 * D) * 0.82, -Math.cos(58 * D) * 0.82];
const P3: [number, number] = [-0.9, -3.4]; // ahead-left, three-quarter back view, waist-up-to-full in frame (S49-S51)
const TURN_TO_BUBBLE = Math.PI - 0.35; // three-quarter back, face in profile
const TURN_STRIKE = Math.PI - 0.5; // facing the Bubble, turned into the frame: we see his bat side
const TURN_TO_CAM = Math.atan2(-P2[0], -P2[1]);

const shoulderPose = (settle: number): Pose => {
  // lands where the storyboard puts it (bottom-left, ~0.3 m from the lens), then settles down onto the shoulder
  const p: Pose = JSON.parse(JSON.stringify(POSES.handOnShoulder));
  p.armR = { ...p.armR, fwd: lerp(75, 56, settle) * D, out: lerp(-30, -22, settle) * D, elbow: lerp(30, 34, settle) * D, twist: -70 * D };
  return p;
};
const tapPose = (contact: number): Pose => {
  const p: Pose = JSON.parse(JSON.stringify(POSES.idleL));
  p.armR = { fwd: 50 * D, out: 120 * D, twist: 30 * D, elbow: lerp(100, 121, contact) * D, wrist: [0, 0, 0], grip: 0.55 };
  p.lean = 0.05;
  return p;
};

const pathAt = (f: number): [number, number] => {
  // S47 end: two steps closer; S48 end: past you and out to the strike mark
  const walks: { a: number; b: number; from: [number, number]; to: [number, number]; via?: [number, number] }[] = [
    { a: 3240, b: 3330, from: P1, to: P2, via: [-1.0, -2.0] },
    { a: 3436, b: 3468, from: P2, to: P3, via: [-1.15, -1.9] },
  ];
  let p = P1;
  for (const w of walks) {
    if (f < w.a) break;
    const t = inOutSine(invLerp(w.a, w.b, f));
    if (w.via) {
      const a = [lerp(w.from[0], w.via[0], t), lerp(w.from[1], w.via[1], t)];
      const b = [lerp(w.via[0], w.to[0], t), lerp(w.via[1], w.to[1], t)];
      p = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
    } else p = [lerp(w.from[0], w.to[0], t), lerp(w.from[1], w.to[1], t)];
  }
  return p;
};

/** a strike: ready -> wind-up (0.35) over `wind` frames -> strike (0.55) in 4 f -> 8 f hold -> follow-through */
const strike = (f: number, at: number, wind: number) => {
  if (f < at - 4 - wind) return 0;
  if (f < at - 4) return 0.35 * inOutCubic(invLerp(at - 4 - wind, at - 4, f));
  if (f < at) return lerp(0.35, 0.55, inExpo(invLerp(at - 4, at, f)));
  if (f < at + 8) return 0.55;
  return lerp(0.55, 1, outCubic(invLerp(at + 8, at + 24, f)));
};

export type SahurState = {
  position: [number, number, number];
  turn: number;
  pose: Pose;
  lean: number;
  expression: string;
  look: [number, number];
  blink: number;
  cracks: number;
  innerLight: number;
  strikeAt?: number;
};

export function sahurAt(f: number): SahurState {
  const xz = pathAt(f);
  // facing
  let turn = TURN_TO_BUBBLE;
  turn = lerp(turn, TURN_TO_CAM, seg(f, 3300, 3330, inOutCubic));
  turn = lerp(turn, TURN_STRIKE, seg(f, 3436, 3462, inOutCubic));
  // pose
  let pose: Pose = POSES.idle;
  // S46: the small TUNG
  const s1 = strike(f, K.smallTung, 26);
  const s1Mix = seg(f, 3080, 3092) * (1 - seg(f, 3146, 3172));
  pose = mixPose(pose, swingPose(s1), s1Mix);
  // S47: swaps the bat to his left hand (off frame), then reaches for your shoulder
  pose = mixPose(pose, POSES.idleL, seg(f, 3226, 3236, linear));
  if (f >= 3240 && f < 3330) pose = walkPose(pose, (f - 3240) / 60, Math.min(1, 4 * bumpF(f, 3240, 3330)) * 0.9);
  pose = mixPose(pose, shoulderPose(seg(f, 3346, 3372, inOutSine)), seg(f, 3318, 3336, outCubic));
  // S48: off the shoulder, two taps on the side of his head, hand down
  const tapIn = seg(f, 3408, 3415, outCubic) * (1 - seg(f, 3432, 3442, inOutCubic));
  const contact = Math.max(bumpF(f, 3411, 3420), bumpF(f, 3423, 3432));
  pose = mixPose(pose, tapPose(contact), tapIn);
  pose = mixPose(pose, POSES.idleL, seg(f, 3432, 3442));
  // S48 -> S49: walks past you to the strike mark; swaps the bat back (off frame)
  if (f >= 3436 && f < 3468) pose = walkPose(pose, (f - 3436) / 32, Math.min(1, 3 * bumpF(f, 3436, 3468)));
  pose = mixPose(pose, POSES.idle, seg(f, 3448, 3452, linear));
  // S49-S51: three strikes (wind-ups lengthen: 30 f, 22 f re-lift, 50 f final)
  if (f >= 3462) {
    let s: Pose;
    // slow, eased wind-ups (the slow-mo feel), a 4 f snap on the cue frame, an 8 f hold, follow-through
    if (f < 3530) s = swingPose(strike(f, K.tung1, 28));
    else if (f < 3536) s = swingPose(1);
    else if (f < 3548) s = mixPose(swingPose(1), swingPose(0), inOutCubic(invLerp(3536, 3548, f)));
    else if (f < 3596) s = swingPose(strike(f, K.tung2, 20));
    else if (f < 3604) s = mixPose(swingPose(1), swingPose(0), inOutCubic(invLerp(3596, 3604, f)));
    else s = swingPose(strike(f, K.pop, 36));
    pose = mixPose(pose, s, seg(f, 3462, 3472, inOutCubic));
  }
  // nod at 3392-3404 (a slow bow of the whole log), weight sinking as he weakens
  const nod = 0.11 * bumpF(f, K.nod0, K.nod1);
  const sway = (f > 3168 ? 0.012 : 0.006) * Math.sin(f / 60 * 1.3);
  // expression and gaze
  let expression = 'determined';
  let look: [number, number] = [0.05, 0.75];
  if (f >= 3086 && f < 3150) { expression = 'fierce'; look = [0.05, 0.35]; }
  else if (f >= 3150 && f < 3300) { expression = 'strained'; look = [0.02, 0.8]; }
  else if (f >= 3300 && f < 3440) { expression = 'calm'; look = [0, -0.18]; }
  else if (f >= 3440) { expression = 'fierce'; look = [0, 0.5]; }
  const blink = Math.max(bumpF(f, 3150, 3162), bumpF(f, 3384, 3396), bumpF(f, 3404, 3414));
  // damage: three cracks at the start; widening at TUNG 1; fully cracked at 3572
  const cracks = track(f, [[2976, 2], [3499, 2], [3506, 2.45, outExpo], [3571, 2.5], [3574, 3, outExpo]]);
  const innerLight = track(f, [[2976, 0.12], [3120, 0.12], [3124, 0.25, outExpo], [3150, 0.14], [3466, 0.2], [3496, 0.35], [3503, 0.75, outExpo], [3540, 0.5], [3556, 0.6], [3574, 1, outExpo], [3600, 0.9], [3640, 1]]);
  return {
    position: [xz[0], 0, xz[1]],
    turn,
    pose,
    lean: nod + sway,
    expression,
    look,
    blink,
    cracks,
    innerLight,
  };
}

/** where the bat hits the ground for a strike (in front of him) */
export const strikePoint = (s: SahurState): [number, number, number] => {
  const fwd = 1.05 * SAHUR_SCALE;
  return [s.position[0] + Math.sin(s.turn) * fwd, 0, s.position[2] + Math.cos(s.turn) * fwd];
};

// ---------------- the Bubble ----------------
export type BubbleState = {
  center: [number, number, number];
  elevation: number;
  inflate: number;
  dent: number;
  dentAmp: number;
  leak: number;
  seam: number;
  shed: number;
  smile: number;
  smileFlat: number;
  eyeDrift: number;
  faceWarp: number;
  gaze: [number, number];
  pop: number;
  ringSpeed: number;
  reflectionAmt: number;
  frame: number;
};
export const BUBBLE_R = 34;

export function bubbleAt(f: number): BubbleState {
  // absorbs the small TUNG (1.00 -> 1.12, outBack), then inflates to 1.65 (inQuad), inhales to 1.55
  const sAbsorb = 0.12 * outBack(1.8)(invLerp(3124, 3154, f));
  const sGrow = 0.53 * inQuad(invLerp(K.grow0, K.peak, f));
  const sInhale = -0.1 * inOutSine(invLerp(3600, 3640, f));
  const scale = 1 + sAbsorb + sGrow + sInhale;
  const inflate = (scale - 1) / 0.65;
  // drifts closer and higher as it grows (surface from ~60 m to ~25 m)
  const g = inQuad(invLerp(K.grow0, K.peak, f));
  const dist = lerp(100, 103, g);
  const elevation = (lerp(33, 36, g) - 4.5 * seg(f, 3400, 3470)) * D;
  const center: [number, number, number] = [0, 1.05 + dist * Math.sin(elevation), -dist * Math.cos(elevation)];
  // dents: the small ripple (3126), TUNG 1 reaches its base (~3514), TUNG 2 (~3578)
  let dent = 0, dentAmp = 0.02;
  if (f >= 3126 && f < 3162) { dent = invLerp(3126, 3162, f); dentAmp = 0.022; }
  if (f >= 3512 && f < 3548) { dent = invLerp(3512, 3548, f); dentAmp = 0.06; }
  if (f >= 3577 && f < 3605) { dent = invLerp(3577, 3605, f); dentAmp = 0.07; }
  const leak = 0.5 * seg(f, 3530, 3570) + 0.5 * seg(f, 3572, 3612);
  const seam = seg(f, 3576, 3602, outCubic);
  const shed = 0.2 * seg(f, 3505, 3540) + 0.8 * seg(f, 3572, 3640, linear);
  const smile = 1 + 0.1 * seg(f, 3124, 3150) + 0.12 * g;
  const smileFlat = 0.6 * seg(f, 3510, 3530) + 0.3 * seg(f, 3572, 3590);
  const eyeDrift = 0.04 * seg(f, 3124, 3154) + 0.05 * g;
  const faceWarp = seg(f, 3572, 3600, outCubic);
  const gz = seg(f, 3600, 3634, inOutCubic);
  const gaze: [number, number] = [-0.25 * gz, -0.8 * gz];
  const pop = f < K.pop ? 0 : 0.3 * invLerp(K.pop, WHITE_AT, f) + 0.7 * invLerp(WHITE_AT, 3700, f);
  // rings speed up x2.5 while it grows; when everything stops they slow to a crawl
  const ringSpeed = track(f, [[2976, 1], [3168, 1], [3336, 2.5, inQuad], [3346, 0.35, outExpo], [3456, 0.35], [3500, 0.6]]);
  const reflectionAmt = 0.22 * seg(f, 3220, 3250) * (1 - seg(f, 3300, 3330));
  return { center, elevation, inflate, dent, dentAmp, leak, seam, shed, smile, smileFlat, eyeDrift, faceWarp, gaze, pop, ringSpeed, reflectionAmt, frame: f };
}

// ---------------- the POV camera ----------------
export function cameraAt(f: number, vertical: boolean, vMatch: (fov: number) => number): PovCamProps & { focus?: number } {
  const yaw = track(f, [
    [2976, 0], [3074, 0], [3084, -14, outCubic], [3098, -14], [3110, 16, inOutCubic], [3124, 16], [3136, 0, inOutCubic],
    [3250, 0], [3330, -15, inOutSine], [3340, -15], [3382, 58, inOutCubic], [3456, 58], [3490, 6, inOutCubic],
  ]);
  const pitch = track(f, [
    [2976, 8], [3010, 8], [3072, 32], [3074, 32], [3084, 6, outCubic], [3098, 6], [3110, 3, inOutCubic], [3124, 3], [3136, 32, inOutCubic],
    [3168, 32], [3300, 35], [3330, 39.5, inOutSine], [3340, 39.5], [3380, 30, inOutCubic], [3456, 30], [3490, 12, inOutCubic], [3502, 10.5, outCubic], [3534, 13.5, inOutSine],
    [3566, 12], [3574, 10.5, outCubic], [3602, 13.5, inOutSine], [3640, 14],
  ]);
  const fov169 = track(f, [[2976, 50], [3168, 50], [3336, 60, inOutSine], [3456, 60], [3490, 66, inOutCubic]]);
  const fov = vertical ? vMatch(fov169) : fov169;
  // the weight of his hand: a 1.5 deg dip
  const dip = -1.5 * D * bumpF(f, 3336, 3350);
  // weightless float, the TUNG 2 blast pushes you back 0.3 m, then a slow push in toward him
  const float = 0.015 * Math.sin((f / 300) * Math.PI * 2);
  const back = 0.3 * seg(f, 3572, 3590, outCubic) - 0.2 * seg(f, 3600, 3640, inOutSine);
  const yawR = yaw * D;
  const pitchR = pitch * D + dip;
  const pos: [number, number, number] = [0, 1.05 + float, back];
  const dir = new THREE.Vector3(-Math.sin(yawR) * Math.cos(pitchR), Math.sin(pitchR), -Math.cos(yawR) * Math.cos(pitchR));
  const target: [number, number, number] = [pos[0] + dir.x * 10, pos[1] + dir.y * 10, pos[2] + dir.z * 10];
  const shake: Shake[] = [
    { frame: 3120, strength: 0.35, decay: 0.15 },
    { frame: 3336, strength: 0.15, decay: 0.12 },
    { frame: 3500, strength: 1.2, decay: 0.3 },
    { frame: 3572, strength: 2.0, decay: 0.33 },
    { frame: 3644, strength: 2.2, decay: 0.2 },
  ];
  const fear = seg(f, 3072, 3110) * (1 - seg(f, 3336, 3346)) + 0.6 * seg(f, 3500, 3520);
  const handheld = track(f, [[2976, 0.3], [3168, 0.3], [3336, 0.8], [3337, 0.05, outExpo], [3456, 0.05], [3490, 0.3]]);
  return {
    position: pos,
    target,
    fov,
    breath: 'held',
    breathB: 'scared',
    breathMix: clamp(fear),
    handheld,
    shake,
    seed: 45,
  };
}

// ---------------- the mittens (camera space, real coordinates; hands keep size via hk) ----------------
export type HandXfLite = { p: [number, number, number]; dir: [number, number, number]; palm: [number, number, number]; curl: number; hidden?: boolean };
const lerpV = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** halfW = horizontal half-extent of the frame at 1 m depth (aspect-aware), so the mittens sit at the edges in both cuts */
export function handsAt(f: number, halfW: number): { pose: 'rest' | 'defensive'; right?: HandXfLite; left?: HandXfLite; tremble: number; mix: number } {
  // S46 swat: the right mitten swats right-to-left across the frame (70 deg arc in 6 f)
  if (f >= 3082 && f < 3106) {
    const inT = seg(f, 3082, 3088, outCubic);
    const sw = seg(f, K.swat0, K.swat1, (t) => t);
    const outT = seg(f, 3096, 3106, inOutSine);
    const a = lerp(38, -32, sw) * D; // arc around a pivot below-right (the elbow)
    const piv: [number, number, number] = [0.06, -0.42, -0.2];
    const r = 0.38;
    let p: [number, number, number] = [piv[0] + Math.sin(a) * r, piv[1] + Math.cos(a) * r * 0.95, piv[2] - 0.12 - 0.05 * Math.cos(a)];
    p = lerpV([0.26, -0.34, -0.3], p, inT);
    p = lerpV(p, [-0.24, -0.36, -0.3], outT);
    const dir: [number, number, number] = [Math.sin(a) * 0.9 - 0.15, Math.cos(a), -0.35];
    return { pose: 'rest', right: { p, dir, palm: [-0.35, 0.05, -0.94], curl: 0.1, hidden: false }, tremble: 0, mix: 0 };
  }
  // S47: the recoil, trembling, until his hand lands
  const up = seg(f, 3200, 3216, outCubic) * (1 - seg(f, 3338, 3360, inOutSine));
  // S48-S51: cover your ears; the mittens press in to 8% from each frame edge, palms in
  const ears = seg(f, K.ears0, K.ears1, outCubic);
  if (ears > 0) {
    // the 9:16 frame is narrow: push the mittens further out and down so they frame him instead of crowding him
    const narrow = halfW < 0.8;
    const z = narrow ? -0.33 : -0.27;
    const xEdge = halfW * Math.abs(z) * (narrow ? 1.08 : 0.9);
    const yDrop = narrow ? -0.06 : 0;
    const xIn = lerp(xEdge + 0.12, xEdge, ears);
    const press = 0.004 * Math.sin(f * 0.9);
    const R: HandXfLite = { p: [xIn - press, lerp(-0.26, -0.085, ears), z], dir: [-0.3, 1, 0.1], palm: [0.12, 0.05, -1], curl: 0.08, hidden: false };
    R.p[1] += yDrop;
    const L: HandXfLite = { p: [-(xIn - press), lerp(-0.26, -0.09, ears), z], dir: [0.3, 1, 0.1], palm: [-0.12, 0.05, -1], curl: 0.08, hidden: false };
    L.p[1] += yDrop;
    return { pose: 'rest', right: R, left: L, tremble: 0.25 + 0.35 * seg(f, 3500, 3510), mix: 0 };
  }
  return { pose: up > 0.01 ? 'defensive' : 'rest', tremble: 0.8 * up, mix: up };
}

// ---------------- light, exposure, lids ----------------
export function lookAt(f: number) {
  // exposure as a brightness multiplier on the 3D image (1 = normal)
  const exposure = track(f, [
    [2976, 1.8], [3010, 1.0, outCubic], [3300, 1.0], [3336, 1.14, inQuad], [3346, 1.0, outCubic],
    [3499, 1.0], [3501, 1.25, outExpo], [3508, 1.0, inOutSine], [3571, 1.0], [3573, 1.35, outExpo], [3581, 1.03, inOutSine],
  ]);
  const whiteIn = 1 - seg(f, 2976, 3006, outCubic); // Battle hands over on pure white
  const bloom = track(f, [[2976, 1.4], [3010, 0.9], [3300, 1.0], [3336, 1.7, inQuad], [3346, 0.9, outExpo], [3572, 1.4], [3640, 1.8]]);
  const lids = Math.min(
    1,
    1 - 0.2 * bumpF(f, 3500, 3508) - 0.25 * bumpF(f, 3572, 3580),
    track(f, [[3596, 1], [3634, 0.82, inOutSine], [3643, 0.82], [3645, 1.0, outExpo]]),
  );
  const amberKey = seg(f, 3574, 3640, inOutSine); // L6 -> L6A: his amber becomes the key light
  // the burst is seen for ~3 frames (tear, flash cluster) before the white takes it
  const white = f < K.pop ? 0 : track(f, [[K.pop, 0], [3646, 0.22, inQuad], [3648, 0.72, linear], [WHITE_AT, 1, outCubic]]);
  return { exposure, whiteIn, bloom, lids, amberKey, white };
}

export const nameAt = (f: number) => SHOTS.find(([, a, b]) => f >= a && f < b)?.[0] ?? '';
export { resolvePose };
