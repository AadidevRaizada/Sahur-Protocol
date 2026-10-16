// Beats 3-4 of the storyboard (S08-S14, storyboard frames 720-1410): the knocks, the door opens on
// blue, Sahur stands IN the doorway (backlit silhouette, bat on his shoulder, the siren crossing him),
// ducks in, kneels to your eye-line, "let's go. let's go.", holds out his left hand, your mitten stops
// short and then takes it, amber blooms from the joined hands, he stands and pulls you up.
// Everything is a pure function of the storyboard frame `sb`. Works at 16:9 and 9:16 (V-match).
import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sahur, SahurProps, sahurPoint } from '../Sahur';
import { BlobHands, HandXf, HANDS_POSES, HandsPose } from '../BlobHands';
import { mixExpr, resolveExpr } from '../expressions';
import { Bedroom, MARKS, SAHUR_ROOM_SCALE, sirenEnvelope } from '../../sets/Bedroom';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera, CamState, projectToScreen, PovCamProps, Shake } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { Eyelids, Grain, Grade, LightLeak, Vignette } from '../../pov/Overlays';
import { SpeechLabel, sahurLabelAnchor, LABEL_PX } from '../../ui/SpeechLabel';
import { PAL } from '../../lib/palette';
import { clamp, lerp, invLerp, smooth, easeOut, easeInOut, keys } from '../util';

type V3 = [number, number, number];
const D = Math.PI / 180;
const outCubic = (t: number) => easeOut(t);
const inOutCubic = (t: number) => easeInOut(t);
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
const outBack = (t: number, s = 0.8) => { const x = clamp(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
const seg = (f: number, a: number, b: number, e: (t: number) => number = smooth) => e(invLerp(a, b, f));
const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** V-match vertical FOV (storyboard section 9) */
export const vMatch = (fov: number) => Math.min(80, (2 * Math.atan((16 / 9) * Math.tan((fov * D) / 2))) / D);

const SH: Shake[] = [{ frame: 740, strength: 0.5, decay: 0.23 }, { frame: 780, strength: 0.6, decay: 0.27 }, { frame: 820, strength: 0.7, decay: 0.3 }];
const SIREN_PHASE = 820;

// ---------------- Sahur's blocking ----------------
// he steps into the doorway, holds there as a silhouette, ducks in and walks to the bedside
const DOORWAY: [number, number] = [0.68, -2.52];
const PATH: { t: number; p: [number, number] }[] = [
  { t: 958, p: [1.75, -2.75] }, { t: 990, p: DOORWAY }, { t: 1004, p: DOORWAY },
  { t: 1018, p: [0.52, -1.72] }, { t: 1046, p: [0.25, -0.98] }, { t: 1072, p: [-0.04, -0.32] }, { t: 1086, p: [-0.12, -0.1] },
];
const pathAt = (sb: number): [number, number] => {
  if (sb <= PATH[0].t) return PATH[0].p;
  for (let i = 0; i < PATH.length - 1; i++) {
    if (sb <= PATH[i + 1].t) { const k = smooth(invLerp(PATH[i].t, PATH[i + 1].t, sb)); return [lerp(PATH[i].p[0], PATH[i + 1].p[0], k), lerp(PATH[i].p[1], PATH[i + 1].p[1], k)]; }
  }
  return PATH[PATH.length - 1].p;
};

export function sahurAt(sb: number): SahurProps {
  const s = SAHUR_ROOM_SCALE;
  const xz = pathAt(sb);
  const cam = MARKS.E1;
  const toCam = Math.atan2(cam[0] - xz[0], cam[2] - xz[1]);
  const enterDir = Math.atan2(-1, 0.35);
  // facing: entering from the right, turns to you in the doorway and stays on you
  const turn = lerp(enterDir, toCam, seg(sb, 972, 996));
  // pose: bat on shoulder; duck under the lintel; kneel; offer the left hand; stand and pull up
  let pose: SahurProps['pose'] = 'batShoulder';
  let poseB: SahurProps['poseB'] = undefined; let poseMix = 0;
  const duck = seg(sb, 1002, 1012) * (1 - seg(sb, 1016, 1030));
  if (duck > 0) { poseB = 'duck'; poseMix = duck; }
  const kn = seg(sb, 1082, 1128, inOutCubic);
  if (sb >= 1082) { poseB = 'kneel'; poseMix = kn; }
  if (sb >= 1230) { pose = 'kneel'; poseB = 'kneelOffer'; poseMix = outBack(invLerp(1230, 1262, sb), 0.8); }
  const rise = seg(sb, 1350, 1400, inOutCubic);
  if (sb >= 1350) { pose = 'kneelOffer'; poseB = 'pullUp'; poseMix = rise; }
  // walking: one step into the doorway, then four steps to the bedside
  let walk: number | undefined, walkAmount = 0;
  // foot plants on the cue sheet: 990 (into the doorway), 1018 (over the threshold), then 1046, 1072
  if (sb >= 960 && sb <= 992) { walk = ((sb - 960) / 30) * 0.5; walkAmount = Math.min(1, (sb - 960) / 6, (992 - sb) / 4); }
  if (sb >= 1004 && sb <= 1084) {
    walk = sb < 1018 ? 0.5 + ((sb - 1004) / 14) * 0.5 : 1 + ((sb - 1018) / 27) * 0.5;
    walkAmount = Math.min(1, (sb - 1004) / 5, (1084 - sb) / 10);
  }
  // the kneel mark: solved so his eyes end up ~0.85 m from the lens, facing it
  let position: V3 = [xz[0], 0, xz[1]];
  if (sb >= 1082) {
    const probe: SahurProps = { position: [0, 0, 0], turn, scale: s, pose: 'kneel' };
    const e = sahurPoint(probe, 'eyes');
    const want = 0.85;
    const Kp: V3 = [cam[0] - Math.sin(turn) * want - e.x, 0, cam[2] - Math.cos(turn) * want - e.z];
    position = lerpV(position, Kp, kn);
  }
  // curious head tilt in the doorway, a slow blink, jaw flaps on the label syllables
  const tilt = 0.12 * seg(sb, 992, 1004) * (1 - seg(sb, 1010, 1024));
  const blink = keys(sb, [{ t: 1056, v: 0 }, { t: 1060, v: 1 }, { t: 1062, v: 1 }, { t: 1068, v: 0 }]) + keys(sb, [{ t: 1268, v: 0 }, { t: 1272, v: 1 }, { t: 1274, v: 1 }, { t: 1280, v: 0 }]);
  const flap = [1140, 1152, 1191, 1203].reduce((a, f) => a + Math.max(0, 1 - Math.abs(sb - f - 3) / 4), 0);
  let expression: SahurProps['expression'] = 'weary', expressionB: SahurProps['expressionB'] = 'earnest', exprMix = seg(sb, 1090, 1128);
  if (sb >= 1370) { expression = 'earnest'; expressionB = 'smile'; exprMix = seg(sb, 1376, 1388); }
  const browLift = 0.012 * seg(sb, 1318, 1324) * (1 - seg(sb, 1340, 1360));
  const grip = sb >= 1336 ? 0.55 * seg(sb, 1336, 1348) : 0;
  const props: SahurProps = {
    position, turn, scale: s, pose, poseB, poseMix, walk, walkAmount, tilt,
    expression, expressionB, exprMix, blink: clamp(blink), talk: clamp(flap) * 0.35, look: sb < 1128 ? [0, 0.06] : [0, 0],
    breathe: (sb / 60) * 0.35, armL: sb >= 1336 ? { grip } : undefined, seed: 3,
  };
  if (browLift > 0) {
    const e = mixExpr(resolveExpr(expression), resolveExpr(expressionB), exprMix);
    props.expression = { ...e, browRaise: e.browRaise + browLift };
    props.expressionB = undefined;
  }
  return props;
}

// ---------------- the POV camera ----------------
export function camAt(sb: number, vertical: boolean, sahur: SahurProps): PovCamProps & { focus: number; baseFov: number } {
  const E1 = MARKS.E1, E2 = MARKS.E2;
  const door: V3 = MARKS.door;
  let pos: V3 = [...E1];
  // S07's 0.10 m dolly toward the window (640-700) carries on through S08+
  const wdir = new THREE.Vector3(MARKS.window[0] - E1[0], 0, MARKS.window[2] - E1[2]).normalize();
  const dolly = 0.06 * seg(sb, 600, 640) + 0.1 * seg(sb, 640, 700);
  pos = [pos[0] + wdir.x * dolly, pos[1], pos[2] + wdir.z * dolly];
  // S09: sink y 1.02 -> 0.96; S10: shrink back z +0.10, y -> 0.92; S14: exhale -15 mm, then up to E2
  pos[1] -= 0.06 * seg(sb, 870, 950, outCubic) + 0.04 * seg(sb, 962, 1000, outCubic);
  pos[2] += 0.1 * seg(sb, 962, 1000, outCubic) - 0.05 * seg(sb, 1100, 1180);
  pos[1] -= 0.015 * seg(sb, 1342, 1382);
  pos = lerpV(pos, E2, seg(sb, 1350, 1400, inOutCubic));
  const eyes = sahurPoint(sahur, 'eyes');
  const eyesV: V3 = [eyes.x, eyes.y, eyes.z];
  const hand = sahurPoint(sahur, 'handL');
  const handV: V3 = [hand.x, hand.y, hand.z];
  // targets: pre-whip -> door; in the doorway frame his chest so his eyes sit high in the frame; follow his eyes
  const preWhip: V3 = [-0.3, 1.25, -2.0];
  let tgt: V3 = sb < 740 ? preWhip : lerpV(preWhip, door, outExpo(invLerp(740, 752, sb)));
  const chest: V3 = [eyesV[0], eyesV[1] - 0.42, eyesV[2]];
  tgt = lerpV(tgt, chest, seg(sb, 958, 984, inOutCubic));
  tgt = lerpV(tgt, [eyesV[0], eyesV[1] - 0.12, eyesV[2]], seg(sb, 1016, 1076, inOutCubic));
  tgt = lerpV(tgt, eyesV, seg(sb, 1080, 1128, inOutCubic));
  // S13: frame his offered hand (lower third) and his face (upper third)
  tgt = lerpV(tgt, lerpV(eyesV, handV, 0.58), seg(sb, 1236, 1270) * (1 - seg(sb, 1352, 1392)));
  // fov: 42 -> 50 on the whip; push in to 36 on the doorway silhouette; 58 as he looms close; 42 kneeling; 56 for the hands
  const baseFov = keys(sb, [
    { t: 738, v: 42 }, { t: 752, v: 50 }, { t: 960, v: 50 }, { t: 992, v: 36 }, { t: 1016, v: 36 }, { t: 1070, v: 58 },
    { t: 1084, v: 58 }, { t: 1128, v: 42 }, { t: 1236, v: 42 }, { t: 1270, v: 56 }, { t: 1350, v: 56 }, { t: 1400, v: 50 },
  ], inOutCubic);
  const fov = vertical ? vMatch(baseFov) : baseFov;
  const breath = sb < 824 ? 'calm' : sb < 1310 ? 'scared' : sb < 1336 ? 'held' : 'calm';
  const c = new THREE.Vector3(...pos);
  let focus = lerp(c.distanceTo(new THREE.Vector3(...door)), c.distanceTo(eyes), seg(sb, 960, 990));
  focus = lerp(focus, c.distanceTo(hand), seg(sb, 1240, 1262) * (1 - seg(sb, 1356, 1396)));
  return {
    position: pos, target: tgt, fov, breath, breathB: sb < 824 ? 'scared' : undefined, breathMix: 0.45, handheld: sb < 824 ? 0.6 : sb < 1336 ? 1.6 : 0.4,
    shake: SH, lookUp: -1.2 * D * seg(sb, 1342, 1382) * (1 - seg(sb, 1382, 1420)), seed: 21, focus, baseFov,
  };
}

// ---------------- hands ----------------
const toCamLocal = (p: THREE.Vector3, cam: CamState) => p.clone().sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());
function handsAt(sb: number, sahur: SahurProps, cam: CamState, vertical: boolean, k: number) {
  const inset = vertical ? 0.12 : 0;
  // 9:16: pull the hands toward the centre (V.handsInset) without distorting them
  const squeeze = (n: 'rest' | 'defensive' | 'takeHand'): HandsPose => {
    const P = HANDS_POSES[n];
    if (!inset) return P;
    const f = 1 - inset * 4;
    return { ...P, R: { ...P.R, p: [P.R.p[0] * f, P.R.p[1], P.R.p[2]] }, L: { ...P.L, p: [P.L.p[0] * f, P.L.p[1], P.L.p[2]] } };
  };
  const tremble = sb >= 966 && sb < 1336 ? (sb < 1150 ? 1 : 0.5) : 0;
  const up = seg(sb, 966, 982, outCubic) * (1 - seg(sb, 1124, 1160));
  let pose: HandsPose = squeeze('rest'), poseB: HandsPose = squeeze('defensive'), mix = up;
  let right: Partial<HandXf> | undefined;
  // S13: the right mitten rises toward his palm, stops 6 cm short, then closes the gap (contact at 1336)
  if (sb >= 1280) {
    const hw = sahurPoint(sahur, 'handL', [0, 0.07, 0.0]);
    const target = toCamLocal(hw, cam).multiplyScalar(1 / k);
    const reach = seg(sb, 1290, 1314, outCubic);
    const gap = 0.06 * (1 - seg(sb, 1326, 1336, outCubic));
    const dir = target.clone().normalize();
    const final = target.clone().addScaledVector(dir, -0.03 - gap);
    const startP = new THREE.Vector3(0.2, -0.3, -0.3);
    const p = startP.clone().lerp(final, reach);
    p.y += 0.03 * Math.sin(reach * Math.PI);
    if (sb >= 1314 && sb < 1336) { p.x += 0.002 * Math.sin(sb * 0.85); p.y += 0.002 * Math.cos(sb * 0.9); }
    right = { p: [p.x, p.y, p.z], dir: [dir.x * 0.9, dir.y + 0.3, dir.z], palm: [-0.1, -1, 0.15], curl: lerp(0.15, 0.4, seg(sb, 1330, 1342)) };
    pose = squeeze('rest'); poseB = squeeze('takeHand'); mix = 1;
  }
  return { pose, poseB, mix, tremble, right };
}

// ---------------- the scene ----------------
export type DoorwayProps = { sbStart?: number };

/** the comp: KeyFrameDoorway frame f = storyboard frame sbStart + f */
export const DoorwayScene: React.FC<DoorwayProps> = ({ sbStart = 860 }) => {
  const frame = useCurrentFrame();
  return <DoorwayShot sb={sbStart + frame} />;
};

/** S08-S14 at storyboard frame `sb` (720..1410). Usable inside any Sequence: text timing is converted to local frames. */
export const DoorwayShot: React.FC<{ sb: number }> = ({ sb }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const vertical = height > width;
  const sbStart = sb - frame;
  const sahur = sahurAt(sb);
  const cp = camAt(sb, vertical, sahur);
  const cam = povCamera(sb, fps, cp);
  // the mittens lag the camera by 4 f; their group scales with the lens so they keep their screen size
  const cpLag = camAt(sb - 4, vertical, sahurAt(sb - 4));
  const camLag = povCamera(sb - 4, fps, cpLag);
  const hk = Math.tan((camLag.fov * D) / 2) / Math.tan(((vertical ? vMatch(50) : 50) * D) / 2);
  const hands = handsAt(sb, sahur, camLag, vertical, hk);
  // light
  const door = seg(sb, 890, 940, outCubic);
  const amber = seg(sb, 1336, 1392, (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)));
  const flare = seg(sb, 1396, 1410);
  const sirenOn = seg(sb, 818, 822) * (1 - seg(sb, 1336, 1360));
  const sir = sirenEnvelope(sb, SIREN_PHASE);
  const eyes = sahurPoint(sahur, 'eyes');
  const joined = sahurPoint(sahur, 'handL', [0, 0.06, 0.02]);
  const hs = projectToScreen(joined, cam, width, height);
  // amber source on HIS side of the joined hands, a little above: lights the mitten, his palm and his face from below
  const amberPos = joined.clone().lerp(eyes, 0.18).add(new THREE.Vector3(0, 0.03, 0));
  const sirenBounce = eyes.clone().lerp(cam.position, 0.3).add(new THREE.Vector3(-0.25, 0.25, 0));
  const inDoor = seg(sb, 956, 970) * (1 - seg(sb, 1020, 1050));
  const labelPx = (vertical ? LABEL_PX.vertical : LABEL_PX.horizontal) * (vertical ? width / 1080 : height / 1080);
  const lbl = sahurLabelAnchor(sahur, cam, width, height, labelPx * 0.56 * 9);
  const knockEnv = [740, 780, 820].reduce((a, f) => a + (sb >= f && sb < f + 6 ? 1 - (sb - f) / 6 : 0), 0);
  const lids = keys(sb, [{ t: 739, v: 1 }, { t: 741, v: 0.8 }, { t: 745, v: 1 }, { t: 959, v: 1 }, { t: 964, v: 1.05 }, { t: 1120, v: 1.05 }, { t: 1140, v: 1 }]);
  return (
    <AbsoluteFill style={{ background: '#05060c' }}>
      <AbsoluteFill style={{ filter: `saturate(${lerp(0.75, 0.95, amber)}) contrast(1.1)` }}>
        <ThreeCanvas width={width} height={height} shadows="soft" camera={{ fov: 50, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.02} far={150} />
          <color attach="background" args={['#05060c']} />
          <Bedroom mood="blue" time={sb} doorOpen={door} doorShake={knockEnv} hall={1} siren={sirenOn} sirenPhase={SIREN_PHASE}
            floorFog={seg(sb, 900, 990)} windowBlue={1 - 0.35 * amber} refreshAt={[612, 636, 660, 684]} beam={1 + 0.8 * inDoor} />
          <Sahur {...sahur} />
          {/* hard cold rim from the hallway, grazing his edges while he stands in the doorway */}
          {inDoor > 0.01 && (
            <>
              <pointLight position={[0.28, 1.6, -2.85]} color="#7aa0ff" intensity={9 * inDoor} distance={2.2} decay={2} />
              <pointLight position={[1.08, 1.8, -2.85]} color="#7aa0ff" intensity={9 * inDoor} distance={2.2} decay={2} />
            </>
          )}
          {/* the siren's bounce off the wall behind you: his face flares red as the 1012 pass crosses the room */}
          <pointLight position={sirenBounce} color={PAL.sirenRed} intensity={2.4 * sirenOn * sir.bell * Math.max(0, 1 - Math.abs(sir.pass - 0.55) * 2)} distance={1.8} decay={2} />
          {/* camera-side fills: keep the mittens cream; a cool face fill rises as he comes close */}
          <group position={cam.position} quaternion={cam.quaternion}>
            <pointLight position={[0.05, -0.02, 0.12]} color="#e6e4f0" intensity={0.3} distance={1.2} decay={2} />
            <pointLight position={[0.15, 0.35, 0.1]} color="#8fa6ff" intensity={2.2 * seg(sb, 1050, 1128) * (1 - 0.5 * amber)} distance={4} decay={2} />
          </group>
          <group position={camLag.position} quaternion={camLag.quaternion}>
            <group scale={hk}>
              <BlobHands pose={hands.pose} poseB={hands.poseB} mix={hands.mix} tremble={hands.tremble} right={hands.right} />
            </group>
          </group>
          {amber > 0.001 && <pointLight position={amberPos} color={PAL.real} intensity={6 * amber} distance={3} decay={2} />}
          <Post focus={cp.focus} focusRange={Math.max(0.12, cp.focus * 0.22)} bokeh={lerp(3, 2, amber)} bloom={lerp(1.1, 1.3, amber) + 0.9 * flare} bloomThreshold={lerp(0.6, 0.45, flare)} vignette={0.5} chroma={1.5 + 3 * knockEnv} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift="#0a1230" liftAmt={0.1 * (1 - amber)} gain="#c8d4ff" gainAmt={0.22 * (1 - amber)} />
      {/* L2: a warm radial grade from the joined hands, then the amber flare that carries the cut */}
      <LightLeak x={hs.x} y={hs.y} radius={width * 0.45} opacity={0.35 * amber} inner={PAL.real} outer="rgba(255,138,42,0.5)" blend="soft-light" />
      <LightLeak x={hs.x} y={hs.y} radius={width * (0.25 + 0.8 * flare)} opacity={0.6 * flare} inner={PAL.real} outer={PAL.fire} blend="screen" />
      {/* the flare fills the frame by 1410 so the cut to S15 sits at its peak */}
      <LightLeak x={width / 2} y={height * 0.62} radius={Math.max(width, height) * (0.2 + 1.1 * flare)} opacity={0.88 * flare * flare} inner="#ffd08a" outer={PAL.real} blend="screen" />
      <SpeechLabel text="let's go. let's go." start={1140 - sbStart} fpc={3} pauses={[{ after: 8, frames: 24 }]} breaks={[9]} end={1300 - sbStart} fade={12} x={lbl.x} y={lbl.y} align={lbl.align} />
      <Vignette darkness={0.35} offset={0.45} />
      <Grain amount={0.05} seed={3} />
      <Eyelids open={lids} />
    </AbsoluteFill>
  );
};
