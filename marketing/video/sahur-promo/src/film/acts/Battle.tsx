// ACT "battle" (global frames 2400-2976, storyboard S27-S44): THE FIGHTS. Owned by the battle builder.
// One ThreeCanvas per biome (it persists across the cuts inside a biome); the shot list switches the
// camera and the action on the 150 BPM grid. Shot logic lives in src/film/battle/*.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFilmFrame, useAspect } from '../context';
import { ApplyCamera } from '../../pov/PovCamera';
import { Grain, Vignette, Eyelids, Grade, Flash } from '../../pov/Overlays';
import { TungHeat } from '../../fx/TungHeat';
import { BattlePost } from '../battle/post';
import { camAt, camBlur, track, win, invLerp } from '../battle/kit';
import { Shot, Biome } from '../battle/types';
import { LensSplat, WhiteWipe, Wash } from '../battle/overlays';
import { BiomeSet } from '../battle/sets';
import { SHOTS } from '../battle/shots';

const shotAt = (f: number): Shot | undefined => SHOTS.find((s) => f >= s.a && f < s.b);

/** per-biome look (storyboard section 2: L5a / L5b / L5c) */
const BIOME_LOOK: Record<Biome, { sat: number; contrast: number; lift: string; liftAmt: number; gain: string; gainAmt: number; bloom: number; threshold: number; grain: number }> = {
  forest: { sat: 1.2, contrast: 1.12, lift: '#06140c', liftAmt: 0.05, gain: '#fff2dc', gainAmt: 0.08, bloom: 1.0, threshold: 1.0, grain: 0.05 },
  wastes: { sat: 1.06, contrast: 1.14, lift: '#0a1418', liftAmt: 0.05, gain: '#ffe6c4', gainAmt: 0.1, bloom: 0.95, threshold: 1.0, grain: 0.055 },
  board: { sat: 0.92, contrast: 1.18, lift: '#070b14', liftAmt: 0.06, gain: '#e8f2ff', gainAmt: 0.06, bloom: 0.9, threshold: 1.0, grain: 0.045 },
};

/** lids flinch to 0.75 for 4 f on every TUNG */
const lidsAt = (f: number) => {
  for (const t of [2496, 2688, 2880]) if (f >= t && f < t + 8) return track(f, [[t, 1], [t + 1, 0.74], [t + 5, 0.76], [t + 8, 1]]);
  return 1.1; // fully open: no lids drawn
};

const WIPE = (f: number) => invLerp(2964, 2975, f);
const ActDom: React.FC<{ f: number; w: number; h: number; v: boolean }> = ({ f, w, h, v }) => (
  <>
    {/* S27: the slop on the lens, top-right, sliding down */}
    <LensSplat f={f} at={2414} end={2440} cx={v ? w * 0.7 : w * 0.73} cy={v ? h * 0.22 : h * 0.26} r={v ? w * 0.2 : h * 0.24} />
    {/* S32 / S38: the mid-boss white flashes (2 f) */}
    <Flash color="#ffffff" opacity={f >= 2574 && f < 2576 ? 1 : f === 2576 ? 0.35 : 0} blend="normal" />
    <Flash color="#ffffff" opacity={f >= 2772 && f < 2774 ? 1 : f === 2774 ? 0.35 : 0} blend="normal" />
    {/* S35: the wraith passes through you */}
    <Wash color="#c07bff" opacity={0.6 * win(f, 2674, 2678, 2680, 2684)} blend="screen" />
    {/* S44: the void floods in from the window side; full white at 2976 */}
    <WhiteWipe p={WIPE(f)} feather={0.3} />
  </>
);

export const BattleAct: React.FC = () => {
  const f = useFilmFrame();
  const v = useAspect() === 'v';
  const { width: w, height: h } = useVideoConfig();
  const shot = shotAt(f);
  if (!shot) return <AbsoluteFill style={{ background: '#000' }} />;
  const sc = shot.cam(f, v);
  const cam = camAt(f, sc, v);
  const fl = Math.max(shot.a, f - 4);
  // the mittens lag the camera's ROTATION by 4 f (storyboard 6.2); they ride its current position
  const lagRaw = camAt(fl, shot.cam(fl, v), v);
  const camLag = { position: cam.position.clone(), quaternion: lagRaw.quaternion, fov: cam.fov };
  let blur: [number, number] = [0, 0];
  if (shot.shutter && f - 1 >= shot.a) {
    const prev = camAt(f - 1, shot.cam(f - 1, v), v, false);
    const cur = camAt(f, sc, v, false);
    blur = camBlur(prev, cur, w / h, shot.shutter);
  }
  const { heat, ...post } = shot.post?.(f, v) ?? {};
  const look = shot.look?.(f) ?? {};
  const B = BIOME_LOOK[shot.biome];
  const ev = look.ev ?? 0;
  const filter = `brightness(${Math.pow(2, ev).toFixed(3)}) saturate(${(B.sat * (look.sat ?? 1)).toFixed(3)}) contrast(${(B.contrast * (look.contrast ?? 1)).toFixed(3)})`;
  const ctx = { f, v, w, h, cam, camLag };
  const Scene = shot.Scene;
  const Dom = shot.Dom;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ filter }}>
        <ThreeCanvas key={shot.biome} width={w} height={h} shadows="soft" camera={{ fov: 50, position: [0, 1, 0] }} gl={{ antialias: true }}>
          <ApplyCamera cam={cam} near={0.03} far={420} />
          <BiomeSet biome={shot.biome} f={f} v={v} props={shot.set?.(f, v) ?? {}} />
          <Scene {...ctx} />
          <BattlePost bloom={B.bloom} threshold={B.threshold} {...post} blur={blur}>
            {heat && heat.progress > 0 && heat.progress < 1 ? <TungHeat progress={heat.progress} center={heat.center} radius={heat.radius} strength={heat.strength ?? 1.2} /> : null}
          </BattlePost>
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade lift={B.lift} liftAmt={B.liftAmt} gain={B.gain} gainAmt={B.gainAmt} />
      {Dom && <Dom {...ctx} />}
      <Vignette darkness={0.32 * (1 - WIPE(f))} offset={0.42} />
      <Grain amount={B.grain * (1 - WIPE(f))} seed={7} />
      <ActDom f={f} w={w} h={h} v={v} />
      <Eyelids open={lidsAt(f)} />
    </AbsoluteFill>
  );
};

