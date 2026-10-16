// EnemySheet: the 6 enemies idle in a lineup, and a row of their key states, on a dark grid floor.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { PAL } from '../../lib/palette';
import { PIXEL, PRESS } from '../../lib/fonts';
import { CameraRig, Post } from '../lib/scene';
import { GridFloor, Label, SheetCam } from './common';
import { invLerp } from '../lib/math';
import { Slopling } from '../Slopling';
import { Drone } from '../Drone';
import { Wraith } from '../Wraith';
import { ScraperHand } from '../ScraperHand';
import { YesMan } from '../YesMan';
import { PivotGolem } from '../PivotGolem';
import { HitSpark } from '../../fx/HitSpark';

const W = 1920, H = 1080;
const RH = 540; // each row is its own canvas with its own camera
export const ROW_CAM: SheetCam = { position: [0, 2.7, 12.8], target: [0, 0.78, 0], fov: 24 };
const XS = [-7.0, -4.2, -1.4, 1.4, 4.2, 7.0];
const SC = 1.3;

const Row: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: 'absolute', left: 0, top, width: W, height: RH }}>
    <ThreeCanvas width={W} height={RH} camera={{ fov: ROW_CAM.fov, position: ROW_CAM.position }}>
      <color attach="background" args={[PAL.ink]} />
      <fog attach="fog" args={[PAL.ink, 14, 30]} />
      <CameraRig position={ROW_CAM.position} target={ROW_CAM.target} fov={ROW_CAM.fov} />
      <GridFloor />
      {children}
      <Post bloom={0.9} threshold={0.92} radius={0.55} vignette={0.35} />
    </ThreeCanvas>
  </div>
);

const IDLE = [
  { name: 'SLOPLING', sub: 'generated filler given legs', color: PAL.slopling },
  { name: 'BUZZWORD DRONE', sub: 'keeps its distance, fires jargon', color: PAL.drone },
  { name: 'PROMPT WRAITH', sub: 'drifts, then lunges', color: PAL.wraith },
  { name: 'SCRAPER HAND', sub: 'winds up, then grabs', color: PAL.hand },
  { name: 'YES-MAN', sub: 'circles you agreeing', color: PAL.yesman },
  { name: 'PIVOT GOLEM', sub: 'slow, heavy, splits when it dies', color: PAL.golem },
];
const STATES = [
  { name: 'DRONE · FIRING', color: PAL.drone },
  { name: 'WRAITH · LUNGE', color: PAL.wraith },
  { name: 'HAND · WIND-UP > GRAB', color: PAL.danger },
  { name: 'GOLEM · SPLIT', color: PAL.golem },
  { name: 'SLOPLING · DEATH SPLAT', color: PAL.slopling },
  { name: 'HIT SPARK', color: '#ffffff' },
];

export const EnemySheet: React.FC = () => {
  const f = useCurrentFrame();
  const fire = ((f + 50) % 75) / 75;
  const lunge = ((f + 27) % 60) / 60;
  const hc = (f + 55) % 120;
  const windup = invLerp(0, 70, hc);
  const grab = invLerp(75, 100, hc);
  const split = Math.min(1, ((f + 50) % 120) / 100);
  const death = invLerp(0, 100, (f + 30) % 120);
  const sparkP = ((f + 6) % 30) / 30;
  return (
    <AbsoluteFill style={{ background: PAL.ink }}>
      <Row top={0}>
        <group position={[XS[0], 0, 0]} scale={SC}>
          <Slopling frame={f} scale={1.05} />
        </group>
        <group position={[XS[1], 0, 0]} scale={SC}>
          <Drone frame={f} />
        </group>
        <group position={[XS[2], 0, 0]} scale={SC}>
          <Wraith frame={f} />
        </group>
        <group position={[XS[3], 0, 0]} rotation={[0, -0.35, 0]} scale={SC}>
          <ScraperHand frame={f} />
        </group>
        <group position={[XS[4], 0, 0]} scale={SC}>
          <YesMan frame={f} />
        </group>
        <group position={[XS[5], 0, 0]} scale={SC}>
          <PivotGolem frame={f} />
        </group>
      </Row>
      <Row top={RH}>
        <group position={[XS[0] - 0.5, 0, 0]} scale={SC}>
          <Drone frame={f} fire={fire} seed={3} yaw={0.5} boltTarget={[1.9, -0.35, 1.2]} glyph="KPI" />
        </group>
        <group position={[XS[1] - 0.9, 0, 0]} scale={SC}>
          <Wraith frame={f} lunge={lunge} seed={4} lungeDist={1.3} />
        </group>
        <group position={[XS[2], 0, 0]} rotation={[0, -0.35, 0]} scale={SC}>
          <ScraperHand frame={f} windup={windup} grab={grab} seed={5} grabDist={0.7} />
        </group>
        <group position={[XS[3], 0, 0]} scale={SC}>
          <PivotGolem frame={f} split={split} seed={6} splitDist={0.42} />
        </group>
        <group position={[XS[4], 0, 0]} scale={SC}>
          <Slopling frame={f} death={death} seed={7} scale={1.05} />
        </group>
        <group position={[XS[5], 0, 0]} scale={SC}>
          <YesMan frame={f} hit={Math.max(0, 1 - sparkP * 4)} seed={8} />
          <HitSpark progress={sparkP} color={PAL.yesman} size={1.1} position={[0.18, 0.72, 0.5]} seed={2} />
        </group>
      </Row>
      {IDLE.map((e, i) => (
        <Label key={e.name} at={[XS[i], -0.1, 1.15]} cam={ROW_CAM} w={W} h={RH} title={e.name} sub={e.sub} color={e.color} font={PIXEL} size={24} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: RH, width: W, height: RH }}>
        {STATES.map((e, i) => (
          <Label key={e.name} at={[XS[i], -0.1, 1.15]} cam={ROW_CAM} w={W} h={RH} title={e.name} color={e.color} font={PIXEL} size={22} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, top: RH - 1, width: W, height: 2, background: 'linear-gradient(90deg, transparent, #232a3d 20%, #232a3d 80%, transparent)' }} />
      <div style={{ position: 'absolute', left: 48, top: 36, fontFamily: PRESS, fontSize: 18, color: PAL.text, letterSpacing: 2 }}>
        SAHUR PROTOCOL <span style={{ color: PAL.dim }}>/ ENEMIES</span>
      </div>
      <div style={{ position: 'absolute', left: 48, top: 66, fontFamily: PIXEL, fontSize: 18, color: PAL.dim }}>idle lineup (top) · key states (bottom)</div>
      <div style={{ position: 'absolute', right: 48, top: 36, fontFamily: PIXEL, fontSize: 18, color: PAL.dim }}>f {String(f).padStart(3, '0')}</div>
    </AbsoluteFill>
  );
};
