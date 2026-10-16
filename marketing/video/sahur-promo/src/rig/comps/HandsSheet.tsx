// HandsSheet: the player's POV hand poses, each in its own small POV panel.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { BlobHands, HandsPoseName, HANDS_POSES } from '../BlobHands';
import { Sahur, sahurPoint } from '../Sahur';
import { Cyclorama } from '../../sets/Studio';
import { ApplyCamera } from '../../pov/PovCamera';
import { povCamera, camLocalToWorld } from '../../pov/camera';
import { Post } from '../../pov/Post';
import { PIXEL, SANS } from '../../lib/fonts';
import { PAL } from '../../lib/palette';

const PW = 624, PH = 404;

const Panel: React.FC<{ pose: HandsPoseName; title: string; note: string; night?: boolean; withSahur?: boolean; tremble?: number }> = ({ pose, title, note, night, withSahur, tremble = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = povCamera(frame, fps, { position: [0, 1.0, 0], target: [0, 0.9, -3], fov: 52, handheld: 0.4, breath: 'calm' });
  // takeHand: put Sahur where his offered hand meets the blob hand
  let sahurPos: [number, number, number] = [0, 0, -2];
  if (withSahur) {
    const hp = HANDS_POSES.takeHand.R.p;
    const meet = camLocalToWorld([hp[0] - 0.035, hp[1] + 0.03, hp[2] - 0.085], cam);
    const sp = { pose: 'offerHand' as const, scale: 0.62, turn: 0.05 };
    const h = sahurPoint(sp, 'handR');
    sahurPos = [meet.x - h.x, meet.y - h.y, meet.z - h.z];
  }
  return (
    <div style={{ position: 'relative', width: PW, height: PH, borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.35)' }}>
      <ThreeCanvas width={PW} height={PH} shadows="soft" camera={{ fov: 52, position: [0, 1, 0] }}>
        <ApplyCamera cam={cam} near={0.02} />
        <color attach="background" args={[night ? '#0b0f1c' : '#3a4560']} />
        <fog attach="fog" args={[night ? '#0b0f1c' : '#3a4560', 3, 14]} />
        <group position={[0, 0, -3]}><Cyclorama color={night ? '#1c2233' : '#59657f'} /></group>
        <hemisphereLight args={[night ? '#3a4a80' : '#c8d4f0', '#2a2018', night ? 0.25 : 0.9]} />
        <directionalLight position={[-2, 4, 2]} intensity={night ? 0.25 : 2.4} color={night ? '#8fa8ff' : '#fff0dc'} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
        <directionalLight position={[2, 2, -3]} intensity={night ? 0.4 : 1.4} color="#bcd0ff" />
        <group position={cam.position} quaternion={cam.quaternion}>
          <BlobHands pose={pose} tremble={tremble} />
        </group>
        {withSahur && <Sahur pose="offerHand" scale={0.62} turn={0.05} position={sahurPos} expression="warm" />}
        <Post bloom={night ? 0.9 : 0.35} bloomThreshold={night ? 0.6 : 0.9} vignette={0.4} />
      </ThreeCanvas>
      <div style={{ position: 'absolute', left: 14, bottom: 10, fontFamily: PIXEL, color: PAL.real, fontSize: 22, textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>{title}</div>
      <div style={{ position: 'absolute', right: 14, bottom: 13, fontFamily: SANS, color: 'rgba(232,228,216,0.75)', fontSize: 14, fontWeight: 500 }}>{note}</div>
    </div>
  );
};

export const HandsSheet: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(180deg,#2c3446,#1b2030)', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
    <div style={{ display: 'flex', gap: 24 }}>
      <Panel pose="holdPhone" title="holdPhone" note="the reel, screen light on the mittens" night />
      <Panel pose="reach" title="reach" note="one hand into the scene" />
      <Panel pose="takeHand" title="takeHand" note="meets Sahur's wooden hand" withSahur />
    </div>
    <div style={{ display: 'flex', gap: 24 }}>
      <Panel pose="holdBat" title="holdBat" note="by the fire" />
      <Panel pose="defensive" title="defensive" note="raised, trembling" tremble={1} />
      <div style={{ width: PW, height: PH, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 24 }}>
        <div style={{ fontFamily: PIXEL, color: PAL.real, fontSize: 44 }}>YOU</div>
        <div style={{ fontFamily: PIXEL, color: PAL.text, fontSize: 24, marginTop: 6 }}>POV blob hands</div>
        <div style={{ fontFamily: SANS, color: PAL.dim, fontSize: 18, lineHeight: 1.55, marginTop: 18, maxWidth: 520 }}>
          cream mittens ({PAL.blob}), soft sheen, darker toward the wrist, thin ink outline (inverted hull). Parented to the POV camera. Poses blend with a 0..1 mix; defensive adds a seeded tremble.
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
