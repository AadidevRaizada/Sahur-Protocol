// BEAT 6, THE FIRE (1890-2400), shots S22-S26, light state L4. One set, one canvas; the cuts are camera
// setups. You sit on a log holding his bat across your lap; he sits across the fire, facing you.
//  S22 1890-1980 the fire (match cut from the glow)      S23 1980-2070 the rhythm, taught (your 3 taps)
//  S24 2070-2176 his hand: knock, knock, GLITCH (2132)   S25 2176-2270 "will you disappear?" (subtitle)
//  S26 2270-2400 "sleep. tomorrow, TUNG." (label), he looks into the lens, the fire pops at 2394
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps, sahurPoint } from '../../../rig/Sahur';
import { BlobHands, HandXf } from '../../../rig/BlobHands';
import { Lantern } from '../../../rig/Lantern';
import { mixPose, Pose } from '../../../rig/pose';
import { mixExpr, resolveExpr, Expr } from '../../../rig/expressions';
import { ApplyCamera } from '../../../pov/PovCamera';
import { povCamera, projectToScreen, PovCamProps } from '../../../pov/camera';
import { Grade, Grain, Vignette, Flash } from '../../../pov/Overlays';
import { Forest, FallenLog } from '../../../sets/Forest';
import { Campfire, fireFlicker } from '../../../sets/Campfire';
import { SAHUR_ROOM_SCALE } from '../../../sets/Bedroom';
import { Bat } from '../../../rig/Bat';
import { SpeechLabel, sahurLabelAnchor, LABEL_PX } from '../../../ui/SpeechLabel';
import { Subtitle } from '../../../ui/Subtitle';
import { PAL } from '../../../lib/palette';
import { vMatchFov } from '../../context';
import { JourneyPost } from '../JourneyPost';
import { AmberRing } from '../AmberRing';
import { SIT_WARM, SIT_KNEES, LOOK_HAND_L, KNOCK_L, FIST_L } from '../poses';
import { ACT0, D, V3, seg, bump, pulseAt, inOutCubic, inOutSine, outCubic, lerp, lerpV, clamp, toCamLocal } from '../common';

export const FIRE_FOREST = { seed: 7, center: [0, -0.6] as [number, number], clearing: 3.1, extent: 22, trees: 80 };
// metres: you sit at z = 1 (eye 0.9); the fire 1.5 m ahead; he sits 0.9 m behind it, a little right
const SAHUR_POS: V3 = [0.42, -0.005, -1.62];
const CAM0: V3 = [0, 0.9, 1.0];
const FIRE_POS: V3 = [0, 0, -0.5];
const FIRE_SCALE = 0.85;
const S = SAHUR_ROOM_SCALE * 0.9;
const TURN_CAM = Math.atan2(CAM0[0] - SAHUR_POS[0], CAM0[2] - SAHUR_POS[2]);
/** he sits angled toward the fire (3/4 to you), so the seated silhouette reads */
const TURN_SEAT = TURN_CAM - 0.62;

// ---------------------------------------------------------------- Sahur
const LOOK_FIRE: [number, number] = [0.1, -0.32];
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function fireSahur(f: number): SahurProps {
  // pose
  // hands to the warmth; forearms on the knees when he looks at you and nods at the bat
  let pose: Pose = mixPose(SIT_WARM, SIT_KNEES, seg(f, 1950, 1984, inOutSine));
  if (f >= 2070) {
    const raise = seg(f, 2072, 2096, inOutCubic);
    pose = mixPose(SIT_KNEES, LOOK_HAND_L, raise);
    // knuckle knocks: contact at 2100, 2116 and the glitched third at 2132
    const knock = Math.max(...[2100, 2116, 2132].map((at) => (f < at - 6 || f > at + 9 ? 0 : f <= at ? inOutCubic((f - (at - 6)) / 6) : 1 - outCubic((f - at) / 9))));
    if (knock > 0) pose = mixPose(pose, KNOCK_L, knock);
    const lower = seg(f, 2160, 2200, inOutCubic);
    if (lower > 0) pose = mixPose(pose, FIST_L, lower);
    const rest = seg(f, 2206, 2262, inOutSine);
    if (rest > 0) pose = mixPose(pose, SIT_KNEES, rest);
  }
  const grip = f >= 2160 && f < 2206 ? lerp(0.05, 1, seg(f, 2160, 2172)) : undefined;
  // gaze: the fire, you, his hand, the fire, you
  // body: angled to the fire; it turns toward you when he looks at you (he is a log: his face is his body)
  const toYou = Math.max(
    seg(f, 1940, 1952, inOutCubic) * (1 - seg(f, 2070, 2090, inOutCubic)) * 0.55,
    seg(f, 2176, 2186) * (1 - seg(f, 2190, 2218, inOutSine)) * 0.5,
    seg(f, 2350, 2366, inOutCubic) * 0.85,
  );
  const turn = lerp(TURN_SEAT, TURN_CAM, toYou);
  // gaze: the fire, you, the bat in your lap, his hand, the fire, you (+x = his left)
  const camX = clamp((TURN_CAM - turn) * 0.75, -0.45, 0.45);
  const you: [number, number] = [camX, 0.02];
  let look: [number, number] = LOOK_FIRE;
  look = lerp2(look, you, seg(f, 1940, 1950, inOutCubic));
  look = lerp2(look, [camX, -0.16], seg(f, 1984, 1996));
  look = lerp2(look, you, seg(f, 2060, 2068));
  look = lerp2(look, [0.32, -0.24], seg(f, 2074, 2090, inOutCubic));
  look = lerp2(look, [0.26, -0.34], seg(f, 2160, 2176));
  look = lerp2(look, you, seg(f, 2176, 2186));
  look = lerp2(look, LOOK_FIRE, seg(f, 2190, 2218, inOutSine));
  look = lerp2(look, you, seg(f, 2350, 2366, inOutCubic));
  // expression
  let e: Expr = resolveExpr('weary');
  e = mixExpr(e, resolveExpr('calm'), seg(f, 1940, 1960));
  e = mixExpr(e, resolveExpr('smile'), seg(f, 2062, 2070) * (1 - seg(f, 2076, 2092)));
  e = mixExpr(e, resolveExpr('sad'), seg(f, 2080, 2100) * (1 - seg(f, 2200, 2240)));
  e = mixExpr(e, resolveExpr('weary'), seg(f, 2200, 2240));
  e = mixExpr(e, resolveExpr('sadSmile'), seg(f, 2366, 2380));
  // after the glitch his brows lift a hair more (he knows)
  if (f >= 2132 && f < 2200) e = { ...e, browRaise: e.browRaise + 0.008 * seg(f, 2134, 2146), browAngle: e.browAngle + 0.08 * seg(f, 2134, 2146) };
  // nods: toward the bat, then one per tap of yours
  const nod = 0.07 * bump(f, 1984, 1990, 1992, 1998) + [2004, 2034, 2064].reduce((a, at) => a + 0.05 * bump(f, at + 1, at + 4, at + 5, at + 10), 0);
  const lookUp = -0.04 * seg(f, 1940, 1950) * (1 - seg(f, 1984, 1990));
  // blinks (slow: close 4, hold 2, open 6)
  const blink = [1932, 2024, 2252, 2384].reduce((a, at) => a + bump(f, at, at + 4, at + 6, at + 12), 0);
  // the jaw on the label's syllables: sleep / to-mor-row / TUNG
  const talk = [2282, 2303, 2309, 2318, 2333].reduce((a, at) => a + Math.max(0, 1 - Math.abs(f - at - 3) / 4), 0);
  // the glitch: 2132-2135 (4 f), an echo at 2146 (1 f at 40%)
  const glitch = f >= 2132 && f <= 2135 ? 1 : f === 2146 ? 0.4 : 0;
  return {
    position: SAHUR_POS, turn, scale: S, pose, lean: nod + lookUp, expression: e, look, blink: clamp(blink), talk: clamp(talk) * 0.3,
    breathe: (f / 60) * 0.3, bat: false, glitch, glitchArm: 'L', armL: grip !== undefined ? { grip } : undefined, seed: 9,
  };
}

// ---------------------------------------------------------------- cameras
type Cam = PovCamProps & { focus: number; focusRange: number; bokeh: number; hands: boolean; haze: number };
function fireCam(f: number, vertical: boolean, s: SahurProps): Cam {
  const vf = (x: number) => (vertical ? vMatchFov(x) : x);
  const eyes = sahurPoint(s, 'eyes');
  const eyesV: V3 = [eyes.x, eyes.y, eyes.z];
  // the seated wide: pitch -9 deg (the bat in your lap at the bottom, the fire low, his face high)
  const wide = (pitch: number, yaw = 5.5): V3 => [CAM0[0] + Math.sin(yaw * D) * 3, CAM0[1] + Math.tan(pitch * D) * 3, CAM0[2] - 3];
  const base: Cam = { position: CAM0, target: wide(-9), fov: vf(46), breath: 'calm', handheld: 0.35, seed: 31, focus: 2.4, focusRange: 0.6, bokeh: 3, hands: true, haze: 0 };
  const c = new THREE.Vector3(...CAM0);
  if (f < 1980) {
    // S22: the match cut settles (16 f), the fire centre-low, him right of centre
    const settle = seg(f, 1890, 1906, outCubic);
    return { ...base, position: [0, 0.9 + 0.02 * (1 - settle), 1.0 + 0.03 * (1 - settle)], target: wide(-6 + 2 * (1 - settle)), focus: c.distanceTo(eyes) };
  }
  if (f < 2070) {
    // S23: a slow push (46 -> 42), tilted a little further down to include the taps
    return { ...base, fov: vf(lerp(46, 43, (f - 1980) / 90)), target: wide(-8), focus: c.distanceTo(eyes), handheld: 0.3 };
  }
  if (f < 2176) {
    // S24: dolly in 0.25 m to a close-up of his raised hand and face across the fire
    const k = seg(f, 2070, 2110, inOutSine);
    const pos = lerpV(CAM0, [0.06, 0.88, 0.75], k);
    // frame his face and the raised hand (a fixed point: the camera does not chase the knocks)
    const raised = sahurPoint({ ...s, pose: LOOK_HAND_L, lean: 0 }, 'handL');
    const hand = sahurPoint(s, 'handL');
    const tgt = lerpV(wide(-9), lerpV(eyesV, [raised.x, raised.y, raised.z], 0.22), seg(f, 2070, 2100, inOutCubic));
    const pc = new THREE.Vector3(...pos);
    const focus = lerp(pc.distanceTo(hand), pc.distanceTo(eyes), seg(f, 2140, 2160));
    return { ...base, position: pos, target: tgt, fov: vf(lerp(38, 28, seg(f, 2070, 2120, inOutSine))), focus, focusRange: 0.3, bokeh: 3.5, handheld: 0.2, hands: false, haze: 0.0008 };
  }
  if (f < 2270) {
    // S25: back to the seated wide; the mittens on the bat
    return { ...base, fov: vf(46), target: wide(-6.5), focus: c.distanceTo(eyes), handheld: 0.3 };
  }
  // S26: a low close-up through the fire's heat haze, locked off
  const pos: V3 = [0.05, 0.62, 0.36];
  const pc = new THREE.Vector3(...pos);
  return { ...base, position: pos, target: [eyesV[0] - 0.02, eyesV[1] - 0.1, eyesV[2]], fov: vf(30), focus: pc.distanceTo(eyes), focusRange: 0.25, bokeh: 4, handheld: 0.12, hands: false, haze: 0.0045 };
}

// ---------------------------------------------------------------- your mittens and his bat
// His bat lies across your lap (camera space): the left mitten on the handle, the right on the barrel.
const BAT_K = 0.6; // his bat, at his scale
const LAP_KNOB = new THREE.Vector3(-0.34, -0.232, -0.46);
const LAP_DIR = new THREE.Vector3(1, 0.035, -0.16).normalize();
function lapBat(f: number, vertical: boolean) {
  // three taps of the barrel on your log: lift 8 cm (14 f), tap down (3 f), a small bounce
  let lift = 0;
  for (const at of [2004, 2034, 2064]) {
    if (f >= at - 17 && f < at - 3) lift = Math.max(lift, inOutCubic((f - (at - 17)) / 14));
    else if (f >= at - 3 && f <= at) lift = Math.max(lift, 1 - (f - (at - 3)) / 3);
    else if (f > at && f < at + 6) lift = Math.max(lift, 0.08 * Math.sin(((f - at) / 6) * Math.PI));
  }
  // 2172-2180: the mittens tighten (scale 0.96) and the bat rotates 2 degrees
  const tight = bump(f, 2172, 2176, 2178, 2190);
  const inset = vertical ? 0.1 : 0;
  // the barrel end lifts more than the handle (it pivots near the left mitten)
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.13 * lift + 2 * D * tight);
  const knob = LAP_KNOB.clone().add(new THREE.Vector3(inset, 0.025 * lift, 0));
  const dir = LAP_DIR.clone().applyQuaternion(rot);
  const len = 1.4 * BAT_K;
  const at = (s: number) => knob.clone().addScaledVector(dir, s * len);
  // mittens over the bat: fingertips forward and a little up, palms down onto the wood
  const fwd = new THREE.Vector3(0, 0.38, -1).normalize();
  const palm = new THREE.Vector3(0, -1, -0.38).normalize();
  const hand = (s: number, side: 1 | -1): HandXf => {
    const p = at(s).add(new THREE.Vector3(0, 0.04, 0.02));
    const d = fwd.clone().add(new THREE.Vector3(-side * 0.18, 0, 0)).normalize();
    // left hands are authored in real camera coordinates (BlobHands mirrors them)
    return { p: [p.x, p.y, p.z], dir: [d.x, d.y, d.z], palm: [palm.x, palm.y, palm.z], curl: 0.62 + 0.12 * tight };
  };
  return { R: hand(0.72, 1), L: hand(0.14, -1), knob, dir, sc: 1 - 0.04 * tight };
}
const LapBat: React.FC<{ f: number; vertical: boolean }> = ({ f, vertical }) => {
  const b = lapBat(f, vertical);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.dir);
  return (
    <group>
      <group position={b.knob} quaternion={q} scale={BAT_K}><Bat castShadow={false} /></group>
      <group scale={[b.sc, 1, 1]}>
        <BlobHands pose={{ R: b.R, L: b.L }} bat={false} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- the shot
export const ShotFire: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const L = f - ACT0;
  const sahur = fireSahur(f);
  const cp = fireCam(f, vertical, sahur);
  const cam = povCamera(f, fps, cp);
  // the mittens lag the camera by 4 f, but never across a cut (S22|S23|S24|S25|S26 are camera setups)
  const setup = (x: number) => (x < 1980 ? 0 : x < 2070 ? 1 : x < 2176 ? 2 : x < 2270 ? 3 : 4);
  const camLag = setup(f - 4) === setup(f) ? povCamera(f - 4, fps, fireCam(f - 4, vertical, fireSahur(f - 4))) : cam;
  const fl = fireFlicker(f, 3);
  const glitchOn = f >= 2132 && f <= 2135;
  // the glitch tear band: through his hand
  const hand = sahurPoint(sahur, 'handL');
  const hs = projectToScreen(hand, cam, width, height);
  const hy = 1 - hs.y / height;
  const tear = glitchOn ? 1 : f === 2146 ? 0.4 : 0;
  // the label: beside his head (16:9), above it (9:16)
  const labelPx = (vertical ? 66 : 56) * (vertical ? width / 1080 : height / 1080);
  const lbl = sahurLabelAnchor(sahur, cam, width, height, labelPx * 0.56 * 15);
  const ring = clamp((f - 2064) / 16);
  const burstDir: [number, number, number] = [0.1, 1.0, 0.75];
  return (
    <AbsoluteFill style={{ background: '#030202' }}>
      <AbsoluteFill style={{ filter: 'saturate(0.95) contrast(1.2)' }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 42, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={120} />
          <Forest mood="fire" time={f} {...FIRE_FOREST} fireflies={60} />
          {/* the seat logs: yours (under the camera) and his, half sunk in the earth */}
          <FallenLog position={[SAHUR_POS[0] - Math.sin(TURN_SEAT) * 0.04, -0.215, SAHUR_POS[2] - Math.cos(TURN_SEAT) * 0.04]} rot={-TURN_SEAT} len={2.3} r={0.24} />
          <FallenLog position={[0.1, -0.13, 1.08]} rot={-0.05} len={2.0} r={0.2} />
          <group position={FIRE_POS} scale={FIRE_SCALE}>
            <Campfire time={f} light={0} intensity={1.35} embers={140} burst={{ at: 2393, count: 30, dir: burstDir, power: 5.2 }} />
          </group>
          {/* L4 firelight: the fire key (flickering) and the warm face light; deep shadow everywhere else */}
          <pointLight position={[FIRE_POS[0], 0.32, FIRE_POS[2]]} color="#ff9a4a" intensity={10.5 * fl} distance={14} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.003} shadow-radius={6} />
          <pointLight position={[FIRE_POS[0] + 0.08, 0.72, FIRE_POS[2] - 0.3]} color={PAL.real} intensity={1.3 * (0.85 + 0.15 * fl) * (glitchOn ? 0.15 : 1)} distance={3} decay={2} />
          {/* a cool violet rim from the forest on the far side: carves his edges out of the dark */}
          <directionalLight position={[SAHUR_POS[0] + 1.5, 1.6, SAHUR_POS[2] - 4]} color="#7d62ff" intensity={1.1} />
          <Sahur {...sahur} />
          {/* the lantern hung on a branch behind him: a soft amber bokeh */}
          <mesh position={[1.35, 1.72, -3.0]} rotation={[0, 0, 1.2]}><cylinderGeometry args={[0.025, 0.04, 1.2, 6]} /><meshStandardMaterial color="#1c1612" roughness={1} /></mesh>
          <group position={[1.1, 1.62, -2.95]}>
            <Lantern height={0.12} glow={1.3} light={2.5} lightDistance={4} />
          </group>
          <AmberRing progress={ring} radius={1.7} width={0.035} opacity={0.55} intensity={2.4} flicker={Math.floor(f / 2)} position={[0.2, 0, 0.75]} />
          <group position={camLag.position} quaternion={camLag.quaternion}>
            {cp.hands && <LapBat f={f} vertical={vertical} />}
            <pointLight position={[0.0, 0.12, -0.85]} color={PAL.fire} intensity={2.6 * fl} distance={1.8} decay={2} />
          </group>
          <JourneyPost focus={cp.focus} focusRange={cp.focusRange} bokeh={cp.bokeh} bloom={glitchOn ? 0.4 : cp.hands ? 0.85 : 0.7} threshold={glitchOn ? 1.4 : cp.hands ? 0.75 : 0.95} smoothing={0.2} vignette={0.55}
            ca={glitchOn ? 0.012 : f === 2146 ? 0.005 : 0} haze={cp.haze} hazeTop={0.36} time={f / 60}
            tear={tear} tearY={[hy - 0.035, hy + 0.035]} tearPx={6 / width * 1.5} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#050302" liftAmt={0.05} gain="#ffd6a0" gainAmt={0.2} />
      {/* S26: the fire just below the frame: its glow rises into the lower third, flickering */}
      {f >= 2270 && <AbsoluteFill style={{ background: `linear-gradient(to top, rgba(255,120,40,${(0.32 + 0.5 * pulseAt(f, 2394, 1, 6)) * fl}) 0%, rgba(255,140,50,${0.12 * fl}) 18%, rgba(0,0,0,0) 40%)`, mixBlendMode: 'screen' }} />}
      <Vignette darkness={0.55} offset={0.32} />
      {glitchOn && <Flash color="#9fe8ff" opacity={0.05} />}
      <Grain amount={0.06} seed={22} />
      <Subtitle text="will you disappear?" start={2176 - ACT0} end={2256 - ACT0} />
      <SpeechLabel text="sleep. tomorrow, TUNG." start={2282 - ACT0} fpc={3} breaks={[6]} end={2388 - ACT0} fade={8}
        x={lbl.x} y={lbl.y} align={lbl.align} size={vertical ? 66 : 56} seed={26} />
    </AbsoluteFill>
  );
};

export const fireDebug = { toCamLocal };

/** where the fire sits on screen at 1890 (S21's glow is held there for the match cut) */
export function fireMatchPoint(width: number, height: number, fps: number) {
  const vertical = height > width;
  const f = 1890;
  const cam = povCamera(f, fps, fireCam(f, vertical, fireSahur(f)));
  return projectToScreen(new THREE.Vector3(FIRE_POS[0], 0.3, FIRE_POS[2]), cam, width, height);
}
